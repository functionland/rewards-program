"use client";

import { Suspense } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { ActivityFeed, type ActivityFilter } from "@/components/rewards/ActivityFeed";
import { FilterPills } from "@/components/rewards/FilterPills";
import { useHighestMemberRole } from "@/hooks/useHighestMemberRole";
import type { TimeRange } from "@/hooks/useChunkedEventLogs";

const FILTER_OPTIONS: Array<{ value: ActivityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "received", label: "Received" },
  { value: "sent", label: "Sent" },
  { value: "locked", label: "Locked" },
];

const RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

function ActivityContent() {
  const router = useRouter();
  const params = useSearchParams();
  const filter = (params.get("filter") as ActivityFilter) || "all";
  const range = (params.get("range") as TimeRange) || "30d";

  const { primaryMembership, memberships } = useHighestMemberRole();

  const update = (next: Record<string, string>) => {
    const current = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => current.set(k, v));
    router.replace(`/me/activity?${current.toString()}`);
  };

  return (
    <Stack spacing={{ xs: 1.5, sm: 2 }}>
      <Box>
        <Typography
          variant="serif"
          sx={{ fontSize: { xs: 22, sm: 28 }, display: "block", lineHeight: 1.15 }}
        >
          This week,
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: 22, sm: 28 }, letterSpacing: "-0.01em" }}>
          here&apos;s what moved.
        </Typography>
      </Box>

      <Paper sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
        <FilterPills
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(v) => update({ filter: v })}
        />
        <FilterPills
          options={RANGE_OPTIONS}
          value={range}
          onChange={(v) => update({ range: v })}
        />
      </Paper>

      <ActivityFeed
        perspective={primaryMembership?.balanceKey}
        filter={filter}
        timeRange={range}
        showProgram={memberships.length > 1}
        emptyTitle="No matching activity"
        emptyMessage="Try a different filter or broaden the time range."
      />
    </Stack>
  );
}

export default function ActivityPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ p: 2 }}>
          <Typography variant="micro" sx={{ color: "text.tertiary" }}>
            Loading…
          </Typography>
        </Box>
      }
    >
      <ActivityContent />
    </Suspense>
  );
}
