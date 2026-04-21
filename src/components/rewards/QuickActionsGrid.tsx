"use client";

import { Box } from "@mui/material";
import type { QuickAction } from "./QuickActionCard";
import { QuickActionCard } from "./QuickActionCard";

export function QuickActionsGrid({
  actions,
  columns,
}: {
  actions: QuickAction[];
  columns?: { xs?: number; sm?: number; md?: number };
}) {
  const cols = {
    xs: columns?.xs ?? 2,
    sm: columns?.sm ?? 3,
    md: columns?.md ?? Math.min(actions.length, 5),
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: `repeat(${cols.xs}, minmax(0, 1fr))`,
          sm: `repeat(${cols.sm}, minmax(0, 1fr))`,
          md: `repeat(${cols.md}, minmax(0, 1fr))`,
        },
        gap: { xs: 1, sm: 1.25 },
      }}
    >
      {actions.map((action) => (
        <QuickActionCard key={action.key} action={action} />
      ))}
    </Box>
  );
}
