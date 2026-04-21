"use client";

import { useMemo } from "react";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { useAccount, useBlockNumber } from "wagmi";
import { CONTRACTS } from "@/config/contracts";
import {
  useChunkedEventLogs,
  type EventRow,
  type TimeRange,
} from "@/hooks/useChunkedEventLogs";
import { formatFula } from "@/lib/utils";
import { KPIRow } from "./KPIRow";
import { KPI } from "./KPI";

const BLOCKS_PER_DAY = BigInt(43200);

type Stats = {
  usersAdded: number;
  tokensTransferred: bigint;
  tokensRedeemed: bigint;
  prevUsersAdded: number;
  prevTokensTransferred: bigint;
  prevTokensRedeemed: bigint;
  compareEnabled: boolean;
};

function deltaFromNumbers(
  current: number,
  previous: number,
): { label: string; positive: boolean } | undefined {
  if (previous === 0 && current === 0) return undefined;
  if (previous === 0) return { label: "new", positive: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { label: `${pct > 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
}

function deltaFromBigints(
  current: bigint,
  previous: bigint,
): { label: string; positive: boolean } | undefined {
  return deltaFromNumbers(Number(current), Number(previous));
}

function computeStats(
  events: EventRow[],
  address: string | undefined,
  currentStart: bigint | null,
  previousStart: bigint | null,
): Stats {
  const empty: Stats = {
    usersAdded: 0,
    tokensTransferred: BigInt(0),
    tokensRedeemed: BigInt(0),
    prevUsersAdded: 0,
    prevTokensTransferred: BigInt(0),
    prevTokensRedeemed: BigInt(0),
    compareEnabled: previousStart !== null && currentStart !== null,
  };
  if (!address) return empty;
  const lp = address.toLowerCase();

  let usersAdded = 0;
  let prevUsersAdded = 0;
  let tokensTransferred = BigInt(0);
  let prevTokensTransferred = BigInt(0);
  let tokensRedeemed = BigInt(0);
  let prevTokensRedeemed = BigInt(0);

  for (const ev of events) {
    const inCurrent = currentStart === null || ev.blockNumber >= currentStart;
    const inPrevious =
      previousStart !== null &&
      currentStart !== null &&
      ev.blockNumber >= previousStart &&
      ev.blockNumber < currentStart;

    if (!inCurrent && !inPrevious) continue;

    if (ev.type === "MemberAdded" && ev.parent?.toLowerCase() === lp) {
      if (inCurrent) usersAdded++;
      else if (inPrevious) prevUsersAdded++;
    } else if (ev.type === "Transfer" && ev.wallet.toLowerCase() === lp) {
      if (inCurrent) tokensTransferred += ev.amount;
      else if (inPrevious) prevTokensTransferred += ev.amount;
    } else if (
      ev.type === "TransferToParent" &&
      ev.toWallet?.toLowerCase() === lp
    ) {
      if (inCurrent) tokensRedeemed += ev.amount;
      else if (inPrevious) prevTokensRedeemed += ev.amount;
    }
  }

  return {
    ...empty,
    usersAdded,
    tokensTransferred,
    tokensRedeemed,
    prevUsersAdded,
    prevTokensTransferred,
    prevTokensRedeemed,
  };
}

export function ActivitySummary({ range = "30d" }: { range?: TimeRange }) {
  const { address } = useAccount();
  const { data: currentBlock } = useBlockNumber();
  const { events, loading } = useChunkedEventLogs({
    address: CONTRACTS.rewardsProgram,
    timeRange: "all",
    trigger: 1,
  });

  const stats = useMemo(() => {
    if (!address) return null;
    if (range === "all" || !currentBlock) {
      return computeStats(events, address, null, null);
    }
    const days = range === "7d" ? BigInt(7) : BigInt(30);
    const currentStart = currentBlock - days * BLOCKS_PER_DAY;
    const previousStart = currentBlock - BigInt(2) * days * BLOCKS_PER_DAY;
    return computeStats(events, address, currentStart, previousStart);
  }, [events, address, currentBlock, range]);

  if (!address || !stats) return null;

  const isLoading = loading && events.length === 0;
  const usersDelta = stats.compareEnabled
    ? deltaFromNumbers(stats.usersAdded, stats.prevUsersAdded)
    : undefined;
  const sentDelta = stats.compareEnabled
    ? deltaFromBigints(stats.tokensTransferred, stats.prevTokensTransferred)
    : undefined;
  const redeemedDelta = stats.compareEnabled
    ? deltaFromBigints(stats.tokensRedeemed, stats.prevTokensRedeemed)
    : undefined;

  return (
    <KPIRow columns={{ xs: 1, sm: 3, md: 3 }}>
      <KPI
        label="Users added"
        value={stats.usersAdded.toString()}
        delta={usersDelta?.label}
        deltaPositive={usersDelta?.positive}
        icon={<PersonAddAltOutlinedIcon sx={{ fontSize: 16 }} />}
        loading={isLoading}
      />
      <KPI
        label="Tokens transferred"
        value={formatFula(stats.tokensTransferred)}
        unit="FULA"
        delta={sentDelta?.label}
        deltaPositive={sentDelta?.positive}
        icon={<SendOutlinedIcon sx={{ fontSize: 16 }} />}
        loading={isLoading}
      />
      <KPI
        label="Tokens redeemed"
        value={formatFula(stats.tokensRedeemed)}
        unit="FULA"
        delta={redeemedDelta?.label}
        deltaPositive={redeemedDelta?.positive}
        icon={<PaymentsOutlinedIcon sx={{ fontSize: 16 }} />}
        loading={isLoading}
      />
    </KPIRow>
  );
}
