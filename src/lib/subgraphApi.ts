import type { EventRow } from "@/hooks/useChunkedEventLogs";

const GRAPH_GATEWAY = "https://gateway.thegraph.com/api";
const PAGE_SIZE = 1000;

interface SubgraphEvent {
  id: string;
  eventType: string;
  programId: number;
  wallet: string;
  amount: string;
  detail: string | null;
  rewardType: number | null;
  note: string | null;
  depositId: string | null;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface GraphQLResponse {
  data?: { contractEvents: SubgraphEvent[] };
  errors?: Array<{ message: string }>;
}

const EVENT_FIELDS = `
  id eventType programId wallet amount detail
  rewardType note depositId blockNumber blockTimestamp transactionHash
`;

function getEndpoint(): string {
  // Direct endpoint (Studio dev or self-hosted)
  const direct = process.env.NEXT_PUBLIC_SUBGRAPH_ENDPOINT || "";
  if (direct) return direct;

  // Gateway endpoint (production, domain-restricted API key)
  const apiKey = process.env.NEXT_PUBLIC_GRAPH_API_KEY || "";
  const subgraphId = process.env.NEXT_PUBLIC_SUBGRAPH_ID || "";
  if (!apiKey || !subgraphId) return "";
  return `${GRAPH_GATEWAY}/${apiKey}/subgraphs/id/${subgraphId}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function queryGraph(
  endpoint: string,
  query: string,
  variables: Record<string, unknown>,
  signal: AbortSignal,
): Promise<SubgraphEvent[]> {
  let retries = 0;
  const maxRetries = 3;

  while (true) {
    if (signal.aborted) throw new Error("Cancelled");

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal,
    });

    if (resp.ok) {
      const json: GraphQLResponse = await resp.json();
      if (json.errors?.length) {
        throw new Error(`Subgraph error: ${json.errors[0].message}`);
      }
      return json.data?.contractEvents ?? [];
    }

    if ((resp.status === 429 || resp.status >= 500) && retries < maxRetries) {
      retries++;
      await delay(1000 * Math.pow(2, retries));
      continue;
    }

    throw new Error(`Graph API error: ${resp.status} ${resp.statusText}`);
  }
}

// Extract memberID from detail strings produced by the subgraph/RPC parser.
// MemberAdded: "Role / Type — ID: CODE"; PAAssigned: "ID: CODE"; MemberIDUpdated: "OLD → NEW"
function extractMemberCode(type: string, detail: string | null | undefined): string | undefined {
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

/** Convert a subgraph event to an EventRow (direct mapping, no parseLog needed) */
export function toEventRow(e: SubgraphEvent): EventRow {
  return {
    type: e.eventType,
    programId: e.programId,
    wallet: e.wallet,
    amount: BigInt(e.amount),
    detail: e.detail ?? undefined,
    rewardType: e.rewardType ?? undefined,
    memberCode: extractMemberCode(e.eventType, e.detail),
    note: e.note ?? undefined,
    depositId: e.depositId ?? undefined,
    blockNumber: BigInt(e.blockNumber),
    txHash: e.transactionHash,
    timestamp: Number(e.blockTimestamp),
  };
}

/**
 * Route B: Fetch events from the subgraph starting from a block number.
 * Used for cold bootstrap (fromBlock = DEPLOYMENT_BLOCK) or large-gap delta.
 * Paginates via id_gt cursor, 1000 per page.
 */
export async function fetchSubgraphEvents(
  fromBlock: bigint,
  signal: AbortSignal,
  onPage?: (page: number) => void,
): Promise<EventRow[]> {
  const endpoint = getEndpoint();
  if (!endpoint) throw new Error("Graph API key or subgraph ID not configured");

  const query = `
    query($lastId: String!, $fromBlock: BigInt!) {
      contractEvents(
        first: ${PAGE_SIZE}
        where: { id_gt: $lastId, blockNumber_gte: $fromBlock }
        orderBy: id
        orderDirection: asc
      ) { ${EVENT_FIELDS} }
    }
  `;

  const allRows: EventRow[] = [];
  let lastId = "";
  let page = 0;

  while (true) {
    if (signal.aborted) throw new Error("Cancelled");

    const events = await queryGraph(endpoint, query, {
      lastId,
      fromBlock: fromBlock.toString(),
    }, signal);

    for (const e of events) {
      allRows.push(toEventRow(e));
    }

    page++;
    onPage?.(page);

    if (events.length < PAGE_SIZE) break;
    lastId = events[events.length - 1].id;
  }

  return allRows;
}

/**
 * Route C: Fetch filtered events when IndexedDB is unavailable.
 * Filters by timestamp and optional programId. No caching.
 */
export async function fetchFilteredSubgraphEvents(
  fromTimestamp: number,
  programId: number | undefined,
  signal: AbortSignal,
): Promise<EventRow[]> {
  const endpoint = getEndpoint();
  if (!endpoint) throw new Error("Graph API key or subgraph ID not configured");

  // Build where clause dynamically based on filters
  const whereParts = [`blockTimestamp_gte: $fromTs`];
  const varDefs = [`$fromTs: BigInt!`];
  const variables: Record<string, unknown> = { fromTs: fromTimestamp.toString() };

  if (programId !== undefined) {
    whereParts.push(`programId: $programId`);
    varDefs.push(`$programId: Int!`);
    variables.programId = programId;
  }

  const query = `
    query(${varDefs.join(", ")}, $lastId: String!) {
      contractEvents(
        first: ${PAGE_SIZE}
        where: { ${whereParts.join(", ")}, id_gt: $lastId }
        orderBy: id
        orderDirection: asc
      ) { ${EVENT_FIELDS} }
    }
  `;

  const allRows: EventRow[] = [];
  let lastId = "";

  while (true) {
    if (signal.aborted) throw new Error("Cancelled");

    const events = await queryGraph(endpoint, query, { ...variables, lastId }, signal);

    for (const e of events) {
      allRows.push(toEventRow(e));
    }

    if (events.length < PAGE_SIZE) break;
    lastId = events[events.length - 1].id;
  }

  return allRows;
}

/** Check if The Graph is configured (direct endpoint or API key + subgraph ID) */
export function isSubgraphConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUBGRAPH_ENDPOINT ||
    (process.env.NEXT_PUBLIC_GRAPH_API_KEY && process.env.NEXT_PUBLIC_SUBGRAPH_ID));
}
