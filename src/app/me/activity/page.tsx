"use client";

import { Suspense } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { ActivityFeed, type ActivityFilter } from "@/components/rewards/ActivityFeed";
import { ActivitySummary } from "@/components/rewards/ActivitySummary";
import { FilterPills } from "@/components/rewards/FilterPills";
import { useHighestMemberRole } from "@/hooks/useHighestMemberRole";
import type { TimeRange } from "@/hooks/useChunkedEventLogs";

const FILTER_OPTIONS: Array<{ value: ActivityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "received", label: "Received" },
  { value: "sent", label: "Sent" },
  { value: "locked", label: "Locked" },
];

type SummaryRange = "7d" | "30d" | "all";

const RANGE_OPTIONS: Array<{ value: SummaryRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

const SERIF_PREFIX: Record<SummaryRange, string | null> = {
  "7d": "This week,",
  "30d": "This month,",
  "all": null,
};

function normalizeRange(raw: string | null): SummaryRange {
  if (raw === "7d" || raw === "30d" || raw === "all") return raw;
  return "30d";
}

function ActivityContent() {
  const router = useRouter();
  const params = useSearchParams();
  const filter = (params.get("filter") as ActivityFilter) || "all";
  const range = normalizeRange(params.get("range"));

  const { primaryMembership, memberships } = useHighestMemberRole();

  const update = (next: Record<string, string>) => {
    const current = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => current.set(k, v));
    router.replace(`/me/activity?${current.toString()}`);
  };

  const serifPrefix = SERIF_PREFIX[range];

  return (
    <Stack spacing={{ xs: 1.5, sm: 2 }}>
      <Box>
        {serifPrefix && (
          <Typography
            variant="serif"
            sx={{ fontSize: { xs: 22, sm: 28 }, display: "block", lineHeight: 1.15 }}
          >
            {serifPrefix}
          </Typography>
        )}
        <Typography sx={{ fontWeight: 700, fontSize: { xs: 22, sm: 28 }, letterSpacing: "-0.01em" }}>
          {serifPrefix ? "here's what moved." : "Here's what moved."}
        </Typography>
      </Box>

      <ActivitySummary range={range} />

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
        timeRange={range as TimeRange}
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
