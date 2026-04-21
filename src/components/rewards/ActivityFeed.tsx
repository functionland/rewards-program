"use client";

import { useMemo, useState } from "react";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { CONTRACTS } from "@/config/contracts";
import {
  useChunkedEventLogs,
  type EventRow,
  type TimeRange,
} from "@/hooks/useChunkedEventLogs";
import { ActivityRow } from "./ActivityRow";

export type ActivityFilter = "all" | "received" | "sent" | "locked" | "admin";

const FILTER_TESTS: Record<
  ActivityFilter,
  (row: EventRow, perspective: string) => boolean
> = {
  all: () => true,
  received: (row, p) => {
    const lp = p.toLowerCase();
    if (row.type === "Deposit" || row.type === "TimeLockResolved") {
      return row.wallet?.toLowerCase() === lp;
    }
    return row.toWallet?.toLowerCase() === lp;
  },
  sent: (row, p) => {
    const lp = p.toLowerCase();
    if (row.type === "Transfer" || row.type === "TransferToParent" || row.type === "Withdrawal") {
      return row.wallet?.toLowerCase() === lp;
    }
    return false;
  },
  locked: (row) =>
    row.type === "TimeLockResolved" ||
    (row.type === "Transfer" && /Locked/i.test(row.detail ?? "")),
  admin: (row) =>
    [
      "MemberAdded",
      "MemberRemoved",
      "MemberClaimed",
      "PAAssigned",
      "WalletChanged",
      "MemberIDUpdated",
      "TypeChanged",
      "ProgramCreated",
      "ProgramUpdated",
      "ProgramDeactivated",
      "LimitUpdated",
      "RewardTypeAdded",
      "RewardTypeRemoved",
      "SubTypeAdded",
      "SubTypeRemoved",
    ].includes(row.type),
};

export function ActivityFeed({
  perspective,
  programId,
  filter = "all",
  timeRange = "30d",
  max,
  showProgram = false,
  emptyTitle = "Nothing yet",
  emptyMessage = "Activity will appear here once you send or receive points.",
}: {
  perspective?: string;
  programId?: number;
  filter?: ActivityFilter;
  timeRange?: TimeRange;
  max?: number;
  showProgram?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const [trigger, setTrigger] = useState(1);
  const { events, loading, error, cacheStatus } = useChunkedEventLogs({
    address: CONTRACTS.rewardsProgram,
    programId,
    timeRange,
    trigger,
  });

  const filtered = useMemo(() => {
    const fn = FILTER_TESTS[filter];
    let rows = events;
    if (perspective) {
      const lp = perspective.toLowerCase();
      rows = rows.filter((r) => {
        const a = r.wallet?.toLowerCase() ?? "";
        const b = r.toWallet?.toLowerCase() ?? "";
        return a === lp || b === lp;
      });
    }
    rows = rows.filter((r) => fn(r, perspective ?? ""));
    if (max) rows = rows.slice(0, max);
    return rows;
  }, [events, filter, perspective, max]);

  const isFirstLoad = loading && events.length === 0;

  return (
    <Paper sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          px: { xs: 1.25, sm: 1.75 },
          py: 1.25,
          borderBottom: "1px solid",
          borderColor: "border.default",
        }}
      >
        <Typography variant="micro" sx={{ color: "text.tertiary" }}>
          Recent activity
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {loading && cacheStatus === "syncing" && (
            <Typography variant="caption" sx={{ color: "text.tertiary" }}>
              Syncing…
            </Typography>
          )}
          <Button
            size="small"
            variant="text"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={() => setTrigger((t) => t + 1)}
            disabled={loading}
            sx={{ color: "text.secondary", minWidth: 0 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {isFirstLoad ? (
        <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={22} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
            {error ? "Couldn't load activity" : emptyTitle}
          </Typography>
          <Typography sx={{ color: "text.tertiary", fontSize: 13, mt: 0.5 }}>
            {error || emptyMessage}
          </Typography>
        </Box>
      ) : (
        <Box>
          {filtered.map((event) => (
            <ActivityRow
              key={`${event.txHash}-${event.blockNumber}-${event.type}-${event.wallet}`}
              event={event}
              perspective={perspective}
              showProgram={showProgram}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}
