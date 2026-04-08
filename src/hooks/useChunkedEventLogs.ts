"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type Address, type Hex, parseAbiItem, decodeEventLog } from "viem";
import { usePublicClient } from "wagmi";
import { DEPLOYMENT_BLOCK } from "@/config/contracts";

const CHUNK_SIZE = BigInt(9999);
const MAX_CONCURRENT = 6;
const DELAY_BETWEEN_BATCHES = 50;
const FLUSH_INTERVAL = 3; // flush UI every N batches
const BLOCKS_PER_DAY = BigInt(43200); // ~2s block time on Base
const BACKOFF_DELAYS = [3000, 6000, 12000, 20000]; // escalating delays on consecutive errors

export type EventRow = {
  type: string;
  depositId?: string;
  programId: number;
  wallet: string;
  amount: bigint;
  rewardType?: number;
  note?: string;
  blockNumber: bigint;
  txHash: string;
};

export type TimeRange = "7d" | "30d" | "90d" | "all";

const TIME_RANGE_DAYS: Record<TimeRange, bigint | null> = {
  "7d": BigInt(7),
  "30d": BigInt(30),
  "90d": BigInt(90),
  "all": null,
};

const EVENT_DEPOSITS = parseAbiItem(
  "event TokensDeposited(uint256 indexed depositId, uint32 indexed programId, address indexed wallet, uint256 amount, uint8 rewardType, string note)"
);
const EVENT_TRANSFERS = parseAbiItem(
  "event TokensTransferredToMember(uint32 indexed programId, address indexed from, address indexed to, uint256 amount, bool locked, uint32 lockTimeDays, uint8 rewardType, uint8 subTypeId, string note)"
);
const EVENT_PARENT_TRANSFERS = parseAbiItem(
  "event TokensTransferredToParent(uint32 indexed programId, address indexed from, address indexed to, uint256 amount, string note)"
);
const EVENT_WITHDRAWALS = parseAbiItem(
  "event TokensWithdrawn(uint32 indexed programId, address indexed wallet, uint256 amount)"
);

const ALL_EVENTS = [EVENT_DEPOSITS, EVENT_TRANSFERS, EVENT_PARENT_TRANSFERS, EVENT_WITHDRAWALS] as const;

// Pre-compute topic0 for each event to match returned logs
const TOPIC_DEPOSIT = EVENT_DEPOSITS.name;
const TOPIC_TRANSFER = EVENT_TRANSFERS.name;
const TOPIC_PARENT_TRANSFER = EVENT_PARENT_TRANSFERS.name;
const TOPIC_WITHDRAWAL = EVENT_WITHDRAWALS.name;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  signal: AbortSignal,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal.aborted) throw new Error("Cancelled");
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const status = (err as { status?: number })?.status;
      const isRateLimit =
        status === 429 || msg.includes("429") || msg.includes("rate");
      if (!isRateLimit || attempt === maxRetries) throw err;
      await delay(1000 * Math.pow(2, attempt));
    }
  }
  throw new Error("Max retries exceeded");
}

function parseLog(log: { topics: Hex[]; data: Hex; blockNumber: bigint; transactionHash: Hex }): EventRow | null {
  if (!log.topics.length) return null;
  try {
    const decoded = decodeEventLog({
      abi: ALL_EVENTS,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    });

    const base = { blockNumber: log.blockNumber, txHash: log.transactionHash };
    const args = decoded.args as Record<string, unknown>;

    switch (decoded.eventName) {
      case TOPIC_DEPOSIT:
        return {
          ...base,
          type: "Deposit",
          depositId: String(args.depositId ?? ""),
          programId: Number(args.programId),
          wallet: String(args.wallet ?? ""),
          amount: BigInt(args.amount as bigint ?? 0),
          rewardType: Number(args.rewardType ?? 0),
          note: String(args.note ?? ""),
        };
      case TOPIC_TRANSFER:
        return {
          ...base,
          type: "Transfer",
          programId: Number(args.programId),
          wallet: String(args.from ?? ""),
          amount: BigInt(args.amount as bigint ?? 0),
          rewardType: Number(args.rewardType ?? 0),
          note: String(args.note ?? ""),
        };
      case TOPIC_PARENT_TRANSFER:
        return {
          ...base,
          type: "TransferToParent",
          programId: Number(args.programId),
          wallet: String(args.from ?? ""),
          amount: BigInt(args.amount as bigint ?? 0),
          note: String(args.note ?? ""),
        };
      case TOPIC_WITHDRAWAL:
        return {
          ...base,
          type: "Withdrawal",
          programId: Number(args.programId),
          wallet: String(args.wallet ?? ""),
          amount: BigInt(args.amount as bigint ?? 0),
        };
      default:
        return null;
    }
  } catch {
    return null; // unknown event from contract, skip
  }
}

export function useChunkedEventLogs(options: {
  address: Address;
  programId?: number;
  timeRange: TimeRange;
  trigger: number;
}) {
  const { address, programId, timeRange, trigger } = options;
  const publicClient = usePublicClient();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [completedChunks, setCompletedChunks] = useState(0);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (trigger === 0 || !publicClient) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    (async () => {
      setLoading(true);
      setError("");
      setEvents([]);
      setProgress(0);
      setCompletedChunks(0);
      setTotalChunks(0);

      try {
        const currentBlock = await publicClient.getBlockNumber();

        const days = TIME_RANGE_DAYS[timeRange];
        let fromBlock: bigint;
        if (days === null) {
          fromBlock = DEPLOYMENT_BLOCK;
        } else {
          const computed = currentBlock - days * BLOCKS_PER_DAY;
          fromBlock = computed > DEPLOYMENT_BLOCK ? computed : DEPLOYMENT_BLOCK;
        }

        // Build chunks
        const chunks: Array<[bigint, bigint]> = [];
        let start = fromBlock;
        while (start <= currentBlock) {
          const end =
            start + CHUNK_SIZE > currentBlock
              ? currentBlock
              : start + CHUNK_SIZE;
          chunks.push([start, end]);
          start = end + BigInt(1);
        }

        setTotalChunks(chunks.length);

        if (chunks.length === 0) {
          setLoading(false);
          return;
        }

        const allRows: EventRow[] = [];
        let completed = 0;
        let consecutiveErrors = 0;
        const pid = programId !== undefined ? Number(programId) : undefined;

        for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
          if (signal.aborted) break;

          // Apply backoff delay if we had consecutive errors
          if (consecutiveErrors > 0) {
            const backoffIdx = Math.min(consecutiveErrors - 1, BACKOFF_DELAYS.length - 1);
            await delay(BACKOFF_DELAYS[backoffIdx]);
          }

          const batch = chunks.slice(i, i + MAX_CONCURRENT);

          try {
            // Single getLogs per chunk — fetch ALL contract events at once
            const batchResults = await Promise.all(
              batch.map(([from, to]) =>
                fetchWithRetry(async () => {
                  const logs = await publicClient.request({
                    method: "eth_getLogs",
                    params: [{
                      address,
                      fromBlock: `0x${from.toString(16)}` as Hex,
                      toBlock: `0x${to.toString(16)}` as Hex,
                    }],
                  });

                  const rows: EventRow[] = [];
                  for (const log of logs as Array<{ topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex }>) {
                    const parsed = parseLog({
                      topics: log.topics,
                      data: log.data,
                      blockNumber: BigInt(log.blockNumber),
                      transactionHash: log.transactionHash,
                    });
                    if (!parsed) continue;
                    // Client-side programId filter
                    if (pid !== undefined && parsed.programId !== pid) continue;
                    rows.push(parsed);
                  }
                  return rows;
                }, signal)
              )
            );

            // Success — reset backoff
            consecutiveErrors = 0;

            for (const rows of batchResults) {
              allRows.push(...rows);
            }
          } catch (err: unknown) {
            if (signal.aborted) break;
            consecutiveErrors++;
            // If we've exhausted backoff delays, give up
            if (consecutiveErrors > BACKOFF_DELAYS.length) throw err;
            // Retry this batch by rewinding the loop index
            i -= MAX_CONCURRENT;
            continue;
          }

          completed += batch.length;
          setCompletedChunks(completed);
          setProgress(completed / chunks.length);

          // Flush to UI periodically, not every batch
          if (completed % FLUSH_INTERVAL === 0 || completed === chunks.length) {
            setEvents([...allRows]);
          }

          if (i + MAX_CONCURRENT < chunks.length) {
            await delay(DELAY_BETWEEN_BATCHES);
          }
        }

        // Final sort and flush
        allRows.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        setEvents([...allRows]);
        setProgress(1);
      } catch (err: unknown) {
        if (!signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch events"
          );
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [trigger, publicClient, address, programId, timeRange]);

  return { events, loading, progress, totalChunks, completedChunks, error, cancel };
}
