"use client";

import { Box, Paper, Typography } from "@mui/material";

export type StatBarColumn = {
  label: string;
  available: number;
  unlocking: number;
  locked: number;
};

export function StatBar({
  columns,
  title = "Distribution pulse",
  subtitle,
  height = 88,
}: {
  columns: StatBarColumn[];
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  const max = columns.reduce(
    (m, c) => Math.max(m, c.available + c.unlocking + c.locked),
    1,
  );

  return (
    <Paper sx={{ p: { xs: 1.75, sm: 2 }, display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="micro" sx={{ color: "text.tertiary" }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "inline-flex", gap: 1.25, alignItems: "center", fontSize: 11.5 }}>
          <Legend swatch="var(--mui-palette-success-main)" label="Available" />
          <Legend swatch="var(--mui-palette-warning-main)" label="Unlocking" />
          <Legend swatch="var(--mui-palette-text-tertiary)" label="Locked" />
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          alignItems: "end",
          gap: { xs: 0.5, sm: 0.75 },
          height,
        }}
      >
        {columns.map((c, idx) => {
          const total = c.available + c.unlocking + c.locked;
          const scale = total / max;
          const aPct = total ? c.available / total : 0;
          const uPct = total ? c.unlocking / total : 0;
          const lPct = total ? c.locked / total : 0;
          return (
            <Box
              key={idx}
              title={`${c.label}: ${total.toLocaleString()}`}
              sx={{
                height: `${Math.max(scale * 100, 4)}%`,
                display: "flex",
                flexDirection: "column",
                borderRadius: 1,
                overflow: "hidden",
                bgcolor: "surface.two",
                minHeight: 4,
              }}
            >
              <Box sx={{ flex: aPct, bgcolor: "success.main", minHeight: aPct > 0 ? 2 : 0 }} />
              <Box sx={{ flex: uPct, bgcolor: "warning.main", minHeight: uPct > 0 ? 2 : 0 }} />
              <Box sx={{ flex: lPct, bgcolor: "text.tertiary", opacity: 0.65, minHeight: lPct > 0 ? 2 : 0 }} />
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          gap: { xs: 0.5, sm: 0.75 },
        }}
      >
        {columns.map((c, idx) => (
          <Typography
            key={idx}
            sx={{
              fontSize: 10.5,
              color: "text.tertiary",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: swatch, opacity: 0.85 }} />
      <Typography sx={{ fontSize: 11.5, color: "text.tertiary" }}>{label}</Typography>
    </Box>
  );
}
