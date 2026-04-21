import type { EventRow } from "@/hooks/useChunkedEventLogs";

export interface CachedEvent {
  id?: number;
  type: string;
  programId: number;
  wallet: string;
  toWallet?: string;
  parent?: string;
  amount: string;
  detail?: string;
  rewardType?: number;
  subTypeId?: number;
  memberCode?: string;
  note?: string;
  depositId?: string;
  blockNumber: number;
  txHash: string;
  contractAddress: string;
  timestamp: number; // Unix seconds (0 for legacy v1 records)
}

interface SyncMeta {
  scopeKey: string;
  lastScannedBlock: number;
  eventCount: number;
  updatedAt: number;
}

const DB_NAME = "rewards-event-cache";
const DB_VERSION = 2;
const WRITE_BATCH = 500;

export function openEventDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        // Fresh install — create both stores
        const store = db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
        store.createIndex("blockNumber", "blockNumber", { unique: false });
        store.createIndex("programId", "programId", { unique: false });
        store.createIndex("contractAddress", "contractAddress", { unique: false });
        store.createIndex("contract_block", ["contractAddress", "blockNumber"], { unique: false });
        store.createIndex("txHash_type", ["txHash", "type"], { unique: true });
        store.createIndex("timestamp", "timestamp", { unique: false });
        db.createObjectStore("syncMeta", { keyPath: "scopeKey" });
      }

      if (oldVersion >= 1 && oldVersion < 2) {
        // v1 → v2: add timestamp index (existing records will have timestamp=0 via deserialize)
        const eventsStore = req.transaction!.objectStore("events");
        if (!eventsStore.indexNames.contains("timestamp")) {
          eventsStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getLastScannedBlock(db: IDBDatabase, contractAddress: string): Promise<bigint> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("syncMeta", "readonly");
    const req = tx.objectStore("syncMeta").get(contractAddress.toLowerCase());
    req.onsuccess = () => {
      const meta = req.result as SyncMeta | undefined;
      resolve(meta ? BigInt(meta.lastScannedBlock) : BigInt(0));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setLastScannedBlock(
  db: IDBDatabase, contractAddress: string, blockNumber: bigint, eventCount: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("syncMeta", "readwrite");
    tx.objectStore("syncMeta").put({
      scopeKey: contractAddress.toLowerCase(),
      lastScannedBlock: Number(blockNumber),
      eventCount,
      updatedAt: Date.now(),
    } satisfies SyncMeta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCachedEvents(
  db: IDBDatabase, contractAddress: string, fromBlock?: bigint,
): Promise<CachedEvent[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("events", "readonly");
    const index = tx.objectStore("events").index("contract_block");
    const lower = [contractAddress.toLowerCase(), fromBlock ? Number(fromBlock) : 0];
    const upper = [contractAddress.toLowerCase(), Number.MAX_SAFE_INTEGER];
    const range = IDBKeyRange.bound(lower, upper);
    const req = index.getAll(range);
    req.onsuccess = () => resolve(req.result as CachedEvent[]);
    req.onerror = () => reject(req.error);
  });
}

export async function storeEvents(db: IDBDatabase, events: CachedEvent[]): Promise<void> {
  for (let i = 0; i < events.length; i += WRITE_BATCH) {
    const batch = events.slice(i, i + WRITE_BATCH);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("events", "readwrite");
      const store = tx.objectStore("events");
      for (const ev of batch) {
        try { store.add(ev); } catch { /* skip if clone error */ }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        // ConstraintError from duplicate txHash+type is expected — suppress
        if (tx.error?.name === "ConstraintError") { resolve(); return; }
        reject(tx.error);
      };
    });
  }
}

export async function clearCache(db: IDBDatabase, contractAddress: string): Promise<void> {
  // Delete matching events
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    const index = tx.objectStore("events").index("contractAddress");
    const req = index.openCursor(IDBKeyRange.only(contractAddress.toLowerCase()));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  // Delete sync meta
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("syncMeta", "readwrite");
    tx.objectStore("syncMeta").delete(contractAddress.toLowerCase());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function serializeEvent(row: EventRow, contractAddress: string): CachedEvent {
  return {
    type: row.type,
    programId: row.programId,
    wallet: row.wallet,
    toWallet: row.toWallet,
    parent: row.parent,
    amount: row.amount.toString(),
    detail: row.detail,
    rewardType: row.rewardType,
    subTypeId: row.subTypeId,
    memberCode: row.memberCode,
    note: row.note,
    depositId: row.depositId,
    blockNumber: Number(row.blockNumber),
    txHash: row.txHash,
    contractAddress: contractAddress.toLowerCase(),
    timestamp: row.timestamp ?? 0,
  };
}

// Back-fill memberCode for events cached before the field existed.
// MemberAdded: "Role / Type — ID: CODE"; PAAssigned: "ID: CODE"; MemberIDUpdated: "OLD → NEW"
function backfillMemberCode(type: string, detail: string | undefined): string | undefined {
  if (!detail) return undefined;
  if (type === "MemberIDUpdated") {
    const m = detail.match(/→\s*(\S+)/);
    return m ? m[1] : undefined;
  }
  if (type === "MemberAdded" || type === "PAAssigned") {
    const m = detail.match(/ID:\s*(\S+)/);
    return m ? m[1] : undefined;
  }
  return undefined;
}

export function deserializeEvent(cached: CachedEvent): EventRow {
  return {
    type: cached.type,
    programId: cached.programId,
    wallet: cached.wallet,
    toWallet: cached.toWallet,
    parent: cached.parent,
    amount: BigInt(cached.amount),
    detail: cached.detail,
    rewardType: cached.rewardType,
    subTypeId: cached.subTypeId,
    memberCode: cached.memberCode ?? backfillMemberCode(cached.type, cached.detail),
    note: cached.note,
    depositId: cached.depositId,
    blockNumber: BigInt(cached.blockNumber),
    txHash: cached.txHash,
    timestamp: cached.timestamp ?? 0,
  };
}
