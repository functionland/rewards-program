"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type Address, parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { DEPLOYMENT_BLOCK } from "@/config/contracts";

const CHUNK_SIZE = BigInt(9999);
const MAX_CONCURRENT = 3;
const DELAY_BETWEEN_BATCHES = 200;
const BLOCKS_PER_DAY = BigInt(43200); // ~2s block time on Base

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
  "event TokensTransferredToMember(uint32 indexed programId, address indexed from, address indexed to, uint256 amount, bool locked, uint32 lockTimeDays)"
);
const EVENT_PARENT_TRANSFERS = parseAbiItem(
  "event TokensTransferredToParent(uint32 indexed programId, address indexed from, address indexed to, uint256 amount)"
);
const EVENT_WITHDRAWALS = parseAbiItem(
  "event TokensWithdrawn(uint32 indexed programId, address indexed wallet, uint256 amount)"
);

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

export function useChunkedEventLogs(options: {
  address: Address;
  programId?: number;
  timeRange: TimeRange;
  trigger: number; // increment to start a new fetch
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
        const pid = programId !== undefined ? Number(programId) : undefined;

        for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
          if (signal.aborted) break;

          const batch = chunks.slice(i, i + MAX_CONCURRENT);

          const batchResults = await Promise.all(
            batch.map(([from, to]) =>
              fetchWithRetry(async () => {
                const [deposits, transfers, parentTransfers, withdrawals] =
                  await Promise.all([
                    publicClient.getLogs({
                      address,
                      event: EVENT_DEPOSITS,
                      args: pid !== undefined ? { programId: pid } : undefined,
                      fromBlock: from,
                      toBlock: to,
                    }),
                    publicClient.getLogs({
                      address,
                      event: EVENT_TRANSFERS,
                      args: pid !== undefined ? { programId: pid } : undefined,
                      fromBlock: from,
                      toBlock: to,
                    }),
                    publicClient.getLogs({
                      address,
                      event: EVENT_PARENT_TRANSFERS,
                      args: pid !== undefined ? { programId: pid } : undefined,
                      fromBlock: from,
                      toBlock: to,
                    }),
                    publicClient.getLogs({
                      address,
                      event: EVENT_WITHDRAWALS,
                      args: pid !== undefined ? { programId: pid } : undefined,
                      fromBlock: from,
                      toBlock: to,
                    }),
                  ]);

                const rows: EventRow[] = [];

                for (const log of deposits) {
                  if (!log.args) continue;
                  rows.push({
                    type: "Deposit",
                    depositId: log.args.depositId?.toString(),
                    programId: Number(log.args.programId),
                    wallet: log.args.wallet || "",
                    amount: log.args.amount || BigInt(0),
                    rewardType: log.args.rewardType,
                    note: log.args.note,
                    blockNumber: log.blockNumber,
                    txHash: log.transactionHash,
                  });
                }

                for (const log of transfers) {
                  if (!log.args) continue;
                  rows.push({
                    type: "Transfer",
                    programId: Number(log.args.programId),
                    wallet: log.args.from || "",
                    amount: log.args.amount || BigInt(0),
                    blockNumber: log.blockNumber,
                    txHash: log.transactionHash,
                  });
                }

                for (const log of parentTransfers) {
                  if (!log.args) continue;
                  rows.push({
                    type: "TransferToParent",
                    programId: Number(log.args.programId),
                    wallet: log.args.from || "",
                    amount: log.args.amount || BigInt(0),
                    blockNumber: log.blockNumber,
                    txHash: log.transactionHash,
                  });
                }

                for (const log of withdrawals) {
                  if (!log.args) continue;
                  rows.push({
                    type: "Withdrawal",
                    programId: Number(log.args.programId),
                    wallet: log.args.wallet || "",
                    amount: log.args.amount || BigInt(0),
                    blockNumber: log.blockNumber,
                    txHash: log.transactionHash,
                  });
                }

                return rows;
              }, signal)
            )
          );

          for (const rows of batchResults) {
            allRows.push(...rows);
          }

          completed += batch.length;
          setCompletedChunks(completed);
          setProgress(completed / chunks.length);

          // Flush progressively to state every batch
          setEvents([...allRows]);

          // Polite delay between batches
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
