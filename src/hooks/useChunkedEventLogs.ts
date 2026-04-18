"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type Address, type Hex, parseAbiItem, decodeEventLog } from "viem";
import { usePublicClient } from "wagmi";
import { DEPLOYMENT_BLOCK } from "@/config/contracts";
import {
  openEventDB, getLastScannedBlock, setLastScannedBlock,
  loadCachedEvents, storeEvents as storeEventsDB, clearCache as clearCacheDB,
  serializeEvent, deserializeEvent,
} from "@/lib/eventCache";
import {
  fetchSubgraphEvents, fetchFilteredSubgraphEvents, isSubgraphConfigured,
} from "@/lib/subgraphApi";

const BLOCKS_PER_DAY = BigInt(43200);
const BLOCK_GAP_THRESHOLD = BigInt(
  process.env.NEXT_PUBLIC_BLOCK_GAP_THRESHOLD || "39996"
);

// --- eth_getLogs constants (Route A: small delta) ---
const CHUNK_SIZE = BigInt(9999);
const MAX_CONCURRENT = 6;
const DELAY_BETWEEN_BATCHES = 50;
const BACKOFF_DELAYS = [3000, 6000, 12000, 20000];

export type EventRow = {
  type: string;
  programId: number;
  wallet: string;        // Sender / subject of the event
  toWallet?: string;     // Recipient for Transfer / TransferToParent — enables filtering/display from recipient side
  amount: bigint;
  detail?: string;
  rewardType?: number;
  subTypeId?: number;    // For Transfer events; decoded from event log, no extra call
  memberCode?: string;   // For member events; UTF-8 memberID extracted at decode time
  note?: string;
  depositId?: string;
  blockNumber: bigint;
  txHash: string;
  timestamp: number;     // Unix seconds (0 if unknown)
};

export type TimeRange = "7d" | "30d" | "90d" | "all";

const TIME_RANGE_DAYS: Record<TimeRange, bigint | null> = {
  "7d": BigInt(7),
  "30d": BigInt(30),
  "90d": BigInt(90),
  "all": null,
};

// --- Token events ---
const EV_DEPOSIT = parseAbiItem(
  "event TokensDeposited(uint256 indexed depositId, uint32 indexed programId, address indexed wallet, uint256 amount, uint8 rewardType, string note)"
);
const EV_TRANSFER = parseAbiItem(
  "event TokensTransferredToMember(uint32 indexed programId, address indexed from, address indexed to, uint256 amount, bool locked, uint32 lockTimeDays, uint8 rewardType, uint8 subTypeId, string note)"
);
const EV_PARENT_TRANSFER = parseAbiItem(
  "event TokensTransferredToParent(uint32 indexed programId, address indexed from, address indexed to, uint256 amount, string note)"
);
const EV_WITHDRAWAL = parseAbiItem(
  "event TokensWithdrawn(uint32 indexed programId, address indexed wallet, uint256 amount)"
);
const EV_TIMELOCK_RESOLVED = parseAbiItem(
  "event TimeLockResolved(uint32 indexed programId, address indexed wallet, uint256 amount)"
);

// --- Member events ---
const EV_MEMBER_ADDED = parseAbiItem(
  "event MemberAdded(uint32 indexed programId, address indexed wallet, address indexed parent, uint8 role, uint8 memberType, bytes12 memberID)"
);
const EV_PA_ASSIGNED = parseAbiItem(
  "event ProgramAdminAssigned(uint32 indexed programId, address indexed wallet, bytes12 memberID)"
);
const EV_MEMBER_REMOVED = parseAbiItem(
  "event MemberRemoved(uint32 indexed programId, address indexed wallet)"
);
const EV_MEMBER_CLAIMED = parseAbiItem(
  "event MemberClaimed(uint32 indexed programId, address indexed memberKey, address indexed wallet)"
);
const EV_WALLET_CHANGED = parseAbiItem(
  "event MemberWalletChanged(uint32 indexed programId, address indexed memberKey, address oldWallet, address newWallet)"
);
const EV_MEMBERID_UPDATED = parseAbiItem(
  "event MemberIDUpdated(uint32 indexed programId, address indexed wallet, bytes12 oldMemberID, bytes12 newMemberID)"
);
const EV_MEMBER_TYPE_CHANGED = parseAbiItem(
  "event MemberTypeChanged(uint32 indexed programId, address indexed memberKey, uint8 oldType, uint8 newType)"
);

// --- Program events ---
const EV_PROGRAM_CREATED = parseAbiItem(
  "event ProgramCreated(uint32 indexed programId, bytes8 code, string name)"
);
const EV_PROGRAM_UPDATED = parseAbiItem(
  "event ProgramUpdated(uint32 indexed programId, string name)"
);
const EV_PROGRAM_DEACTIVATED = parseAbiItem(
  "event ProgramDeactivated(uint32 indexed programId)"
);
const EV_TRANSFER_LIMIT = parseAbiItem(
  "event TransferLimitUpdated(uint32 indexed programId, uint8 oldLimit, uint8 newLimit)"
);

// --- Reward type events ---
const EV_REWARD_TYPE_ADDED = parseAbiItem(
  "event RewardTypeAdded(uint32 indexed programId, uint8 indexed typeId, bytes16 name)"
);
const EV_REWARD_TYPE_REMOVED = parseAbiItem(
  "event RewardTypeRemoved(uint32 indexed programId, uint8 indexed typeId)"
);
const EV_SUBTYPE_ADDED = parseAbiItem(
  "event SubTypeAdded(uint32 indexed programId, uint8 indexed rewardType, uint8 subTypeId, bytes16 name)"
);
const EV_SUBTYPE_REMOVED = parseAbiItem(
  "event SubTypeRemoved(uint32 indexed programId, uint8 indexed rewardType, uint8 subTypeId)"
);

const ALL_EVENTS = [
  EV_DEPOSIT, EV_TRANSFER, EV_PARENT_TRANSFER, EV_WITHDRAWAL, EV_TIMELOCK_RESOLVED,
  EV_MEMBER_ADDED, EV_PA_ASSIGNED, EV_MEMBER_REMOVED, EV_MEMBER_CLAIMED,
  EV_WALLET_CHANGED, EV_MEMBERID_UPDATED, EV_MEMBER_TYPE_CHANGED,
  EV_PROGRAM_CREATED, EV_PROGRAM_UPDATED, EV_PROGRAM_DEACTIVATED, EV_TRANSFER_LIMIT,
  EV_REWARD_TYPE_ADDED, EV_REWARD_TYPE_REMOVED, EV_SUBTYPE_ADDED, EV_SUBTYPE_REMOVED,
] as const;

const ROLE_LABELS: Record<number, string> = { 1: "Client", 2: "Team Leader", 3: "Program Admin" };
const TYPE_LABELS: Record<number, string> = { 0: "Free", 1: "Basic", 2: "Pro" };

function hexToUtf8(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) {
    const b = parseInt(clean.substring(i, i + 2), 16);
    if (b === 0) break;
    bytes.push(b);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseLog(log: { topics: Hex[]; data: Hex; blockNumber: bigint; transactionHash: Hex }, timestamp: number): EventRow | null {
  if (!log.topics.length) return null;
  try {
    const decoded = decodeEventLog({
      abi: ALL_EVENTS,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    });

    const base = { blockNumber: log.blockNumber, txHash: log.transactionHash, timestamp };
    const a = decoded.args as Record<string, unknown>;

    switch (decoded.eventName) {
      case "TokensDeposited":
        return { ...base, type: "Deposit", depositId: String(a.depositId ?? ""),
          programId: Number(a.programId), wallet: String(a.wallet ?? ""),
          amount: BigInt(a.amount as bigint ?? 0), rewardType: Number(a.rewardType ?? 0),
          note: String(a.note ?? "") };
      case "TokensTransferredToMember":
        return { ...base, type: "Transfer", programId: Number(a.programId),
          wallet: String(a.from ?? ""), toWallet: String(a.to ?? ""),
          amount: BigInt(a.amount as bigint ?? 0),
          rewardType: Number(a.rewardType ?? 0), subTypeId: Number(a.subTypeId ?? 0),
          detail: a.locked ? `Locked ${a.lockTimeDays}d → ${String(a.to ?? "").slice(0, 10)}…` : `→ ${String(a.to ?? "").slice(0, 10)}…`,
          note: String(a.note ?? "") };
      case "TokensTransferredToParent":
        return { ...base, type: "TransferToParent", programId: Number(a.programId),
          wallet: String(a.from ?? ""), toWallet: String(a.to ?? ""),
          amount: BigInt(a.amount as bigint ?? 0),
          detail: `→ ${String(a.to ?? "").slice(0, 10)}…`, note: String(a.note ?? "") };
      case "TokensWithdrawn":
        return { ...base, type: "Withdrawal", programId: Number(a.programId),
          wallet: String(a.wallet ?? ""), amount: BigInt(a.amount as bigint ?? 0) };
      case "TimeLockResolved":
        return { ...base, type: "TimeLockResolved", programId: Number(a.programId),
          wallet: String(a.wallet ?? ""), amount: BigInt(a.amount as bigint ?? 0) };
      case "MemberAdded":
        return { ...base, type: "MemberAdded", programId: Number(a.programId),
          wallet: String(a.wallet ?? ""), amount: BigInt(0),
          memberCode: hexToUtf8(String(a.memberID)),
          detail: `${ROLE_LABELS[Number(a.role)] || "Role" + a.role} / ${TYPE_LABELS[Number(a.memberType)] || "Type" + a.memberType} — ID: ${hexToUtf8(String(a.memberID))}` };
      case "ProgramAdminAssigned":
        return { ...base, type: "PAAssigned", programId: Number(a.programId),
          wallet: String(a.wallet ?? ""), amount: BigInt(0),
          memberCode: hexToUtf8(String(a.memberID)),
          detail: `ID: ${hexToUtf8(String(a.memberID))}` };
      case "MemberRemoved":
        return { ...base, type: "MemberRemoved", programId: Number(a.programId),
          wallet: String(a.wallet ?? ""), amount: BigInt(0) };
      case "MemberClaimed":
        return { ...base, type: "MemberClaimed", programId: Number(a.programId),
          wallet: String(a.wallet ?? ""), amount: BigInt(0),
          detail: `Key: ${String(a.memberKey ?? "").slice(0, 10)}…` };
      case "MemberWalletChanged":
        return { ...base, type: "WalletChanged", programId: Number(a.programId),
          wallet: String(a.memberKey ?? ""), amount: BigInt(0),
          detail: `${String(a.oldWallet ?? "").slice(0, 10)}… → ${String(a.newWallet ?? "").slice(0, 10)}…` };
      case "MemberIDUpdated":
        return { ...base, type: "MemberIDUpdated", programId: Number(a.programId),
          wallet: String(a.wallet ?? ""), amount: BigInt(0),
          memberCode: hexToUtf8(String(a.newMemberID)),
          detail: `${hexToUtf8(String(a.oldMemberID))} → ${hexToUtf8(String(a.newMemberID))}` };
      case "MemberTypeChanged":
        return { ...base, type: "TypeChanged", programId: Number(a.programId),
          wallet: String(a.memberKey ?? ""), amount: BigInt(0),
          detail: `${TYPE_LABELS[Number(a.oldType)] || String(a.oldType)} → ${TYPE_LABELS[Number(a.newType)] || String(a.newType)}` };
      case "ProgramCreated":
        return { ...base, type: "ProgramCreated", programId: Number(a.programId),
          wallet: "", amount: BigInt(0), detail: `${hexToUtf8(String(a.code))} — ${a.name}` };
      case "ProgramUpdated":
        return { ...base, type: "ProgramUpdated", programId: Number(a.programId),
          wallet: "", amount: BigInt(0), detail: String(a.name ?? "") };
      case "ProgramDeactivated":
        return { ...base, type: "ProgramDeactivated", programId: Number(a.programId),
          wallet: "", amount: BigInt(0) };
      case "TransferLimitUpdated":
        return { ...base, type: "LimitUpdated", programId: Number(a.programId),
          wallet: "", amount: BigInt(0), detail: `${a.oldLimit}% → ${a.newLimit}%` };
      case "RewardTypeAdded":
        return { ...base, type: "RewardTypeAdded", programId: Number(a.programId),
          wallet: "", amount: BigInt(0), detail: `#${a.typeId}: ${hexToUtf8(String(a.name))}` };
      case "RewardTypeRemoved":
        return { ...base, type: "RewardTypeRemoved", programId: Number(a.programId),
          wallet: "", amount: BigInt(0), detail: `#${a.typeId}` };
      case "SubTypeAdded":
        return { ...base, type: "SubTypeAdded", programId: Number(a.programId),
          wallet: "", amount: BigInt(0),
          detail: `RT#${a.rewardType} → Sub#${a.subTypeId}: ${hexToUtf8(String(a.name))}` };
      case "SubTypeRemoved":
        return { ...base, type: "SubTypeRemoved", programId: Number(a.programId),
          wallet: "", amount: BigInt(0), detail: `RT#${a.rewardType} → Sub#${a.subTypeId}` };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// --- Route A: eth_getLogs for small deltas ---

async function fetchWithRetry<T>(fn: () => Promise<T>, signal: AbortSignal, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal.aborted) throw new Error("Cancelled");
    try { return await fn(); } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const status = (err as { status?: number })?.status;
      if ((status === 429 || msg.includes("429") || msg.includes("rate")) && attempt < maxRetries) {
        await delay(1000 * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

async function fetchViaRpc(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  address: Address,
  fromBlock: bigint,
  toBlock: bigint,
  signal: AbortSignal,
  onProgress?: (completed: number, total: number) => void,
): Promise<EventRow[]> {
  const chunks: Array<[bigint, bigint]> = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
    chunks.push([start, end]);
    start = end + BigInt(1);
  }

  const allRows: EventRow[] = [];
  let completed = 0;
  let consecutiveErrors = 0;

  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
    if (signal.aborted) break;
    if (consecutiveErrors > 0) {
      await delay(BACKOFF_DELAYS[Math.min(consecutiveErrors - 1, BACKOFF_DELAYS.length - 1)]);
    }

    const batch = chunks.slice(i, i + MAX_CONCURRENT);
    try {
      const batchResults = await Promise.all(
        batch.map(([from, to]) =>
          fetchWithRetry(async () => {
            const logs = await publicClient.request({
              method: "eth_getLogs",
              params: [{ address, fromBlock: `0x${from.toString(16)}` as Hex, toBlock: `0x${to.toString(16)}` as Hex }],
            });
            const rows: EventRow[] = [];
            for (const log of logs as Array<{ topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex }>) {
              const parsed = parseLog({ topics: log.topics, data: log.data, blockNumber: BigInt(log.blockNumber), transactionHash: log.transactionHash }, 0);
              if (parsed) rows.push(parsed);
            }
            return rows;
          }, signal)
        )
      );
      consecutiveErrors = 0;
      for (const rows of batchResults) allRows.push(...rows);
    } catch (err: unknown) {
      if (signal.aborted) break;
      consecutiveErrors++;
      if (consecutiveErrors > BACKOFF_DELAYS.length) throw err;
      i -= MAX_CONCURRENT;
      continue;
    }

    completed += batch.length;
    onProgress?.(completed, chunks.length);
    if (i + MAX_CONCURRENT < chunks.length) await delay(DELAY_BETWEEN_BATCHES);
  }

  return allRows;
}

// --- Main hook ---

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
  const [cacheStatus, setCacheStatus] = useState<"idle" | "loading-cache" | "syncing" | "done">("idle");

  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => { abortRef.current?.abort(); }, []);

  const clearEventCache = useCallback(async () => {
    try {
      const db = await openEventDB();
      await clearCacheDB(db, address);
      db.close();
    } catch { /* IndexedDB unavailable */ }
  }, [address]);

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
      setCacheStatus("idle");

      try {
        const currentBlock = await publicClient.getBlockNumber();

        // Compute time-range filter
        const days = TIME_RANGE_DAYS[timeRange];
        let timeRangeFromBlock: bigint;
        if (days === null) {
          timeRangeFromBlock = DEPLOYMENT_BLOCK;
        } else {
          const computed = currentBlock - days * BLOCKS_PER_DAY;
          timeRangeFromBlock = computed > DEPLOYMENT_BLOCK ? computed : DEPLOYMENT_BLOCK;
        }

        // Approximate timestamp for time range (used in Route C)
        const timeRangeTimestamp = days !== null
          ? Math.floor(Date.now() / 1000) - Number(days) * 86400
          : 0;

        const pid = programId !== undefined ? Number(programId) : undefined;

        // --- Try IndexedDB ---
        let db: IDBDatabase | null = null;
        let cachedRows: EventRow[] = [];
        let lastScanned = BigInt(0);
        try {
          db = await openEventDB();
          setCacheStatus("loading-cache");
          lastScanned = await getLastScannedBlock(db, address);
          if (lastScanned > BigInt(0)) {
            const cached = await loadCachedEvents(db, address, timeRangeFromBlock);
            cachedRows = cached.map(deserializeEvent);
          }
        } catch {
          console.warn("IndexedDB unavailable");
          db = null;
        }

        // Show cached data immediately
        if (cachedRows.length > 0 && !signal.aborted) {
          let filtered = cachedRows;
          if (pid !== undefined) filtered = filtered.filter(e => e.programId === pid);
          filtered.sort((a, b) => Number(b.blockNumber - a.blockNumber));
          setEvents(filtered);
        }

        // Determine delta range
        const fetchFrom = lastScanned > BigInt(0) ? lastScanned + BigInt(1) : DEPLOYMENT_BLOCK;
        const gap = currentBlock - fetchFrom;

        if (fetchFrom > currentBlock) {
          // Already up to date
          setProgress(1);
          setLoading(false);
          setCacheStatus("done");
          return;
        }

        setCacheStatus("syncing");
        let newRows: EventRow[] = [];

        if (!db) {
          // --- Route C: No IndexedDB — query subgraph per-search ---
          if (isSubgraphConfigured()) {
            try {
              newRows = await fetchFilteredSubgraphEvents(timeRangeTimestamp, pid, signal);
            } catch (graphErr) {
              if (signal.aborted) throw graphErr;
              console.warn("Subgraph query failed, falling back to eth_getLogs:", graphErr);
              newRows = await fetchViaRpc(publicClient, address, fetchFrom, currentBlock, signal,
                (c, t) => { setCompletedChunks(c); setTotalChunks(t); setProgress(c / t); });
            }
          } else {
            // No subgraph configured — pure eth_getLogs
            newRows = await fetchViaRpc(publicClient, address, fetchFrom, currentBlock, signal,
              (c, t) => { setCompletedChunks(c); setTotalChunks(t); setProgress(c / t); });
          }
        } else if (gap > BLOCK_GAP_THRESHOLD && isSubgraphConfigured()) {
          // --- Route B: Large gap — use subgraph for delta ---
          try {
            const graphRows = await fetchSubgraphEvents(fetchFrom, signal,
              (page) => { setCompletedChunks(page); });
            newRows.push(...graphRows);

            // Fill indexing lag gap: subgraph may be a few blocks behind
            const highestGraphBlock = graphRows.reduce(
              (max, r) => r.blockNumber > max ? r.blockNumber : max, fetchFrom - BigInt(1));
            const lagFrom = highestGraphBlock + BigInt(1);
            if (lagFrom <= currentBlock) {
              const lagRows = await fetchViaRpc(publicClient, address, lagFrom, currentBlock, signal);
              newRows.push(...lagRows);
            }
          } catch (graphErr) {
            if (signal.aborted) throw graphErr;
            console.warn("Subgraph fetch failed, falling back to eth_getLogs:", graphErr);
            newRows = await fetchViaRpc(publicClient, address, fetchFrom, currentBlock, signal,
              (c, t) => { setCompletedChunks(c); setTotalChunks(t); setProgress(c / t); });
          }
        } else {
          // --- Route A: Small gap — eth_getLogs delta ---
          newRows = await fetchViaRpc(publicClient, address, fetchFrom, currentBlock, signal,
            (c, t) => { setCompletedChunks(c); setTotalChunks(t); setProgress(c / t); });
        }

        // Store new events in IndexedDB
        if (db && newRows.length > 0 && !signal.aborted) {
          try { await storeEventsDB(db, newRows.map(r => serializeEvent(r, address))); }
          catch { /* not critical */ }
        }
        if (db && !signal.aborted) {
          try { await setLastScannedBlock(db, address, currentBlock, cachedRows.length + newRows.length); }
          catch { /* not critical */ }
          db.close();
        }

        // Final sorted result
        if (!signal.aborted) {
          let all = [...cachedRows, ...newRows.filter(e => e.blockNumber >= timeRangeFromBlock)];
          if (pid !== undefined) all = all.filter(e => e.programId === pid);
          all.sort((a, b) => Number(b.blockNumber - a.blockNumber));
          setEvents(all);
          setProgress(1);
          setCacheStatus("done");
        }
      } catch (err: unknown) {
        if (!signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to fetch events");
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => { controller.abort(); };
  }, [trigger, publicClient, address, programId, timeRange]);

  return { events, loading, progress, totalChunks, completedChunks, error, cancel, cacheStatus, clearEventCache };
}
