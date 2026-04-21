"use client";

import { Box } from "@mui/material";
import type { ReactNode } from "react";

export function KPIRow({
  children,
  columns,
}: {
  children: ReactNode;
  columns?: { xs?: number; sm?: number; md?: number };
}) {
  const cols = {
    xs: columns?.xs ?? 2,
    sm: columns?.sm ?? 2,
    md: columns?.md ?? 4,
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
      {children}
    </Box>
  );
}
