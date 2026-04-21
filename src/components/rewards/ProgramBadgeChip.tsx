"use client";

import { Box, Typography } from "@mui/material";

const PALETTE = [
  "oklch(0.72 0.16 275)",
  "oklch(0.72 0.16 200)",
  "oklch(0.78 0.14 150)",
  "oklch(0.82 0.14 70)",
  "oklch(0.7 0.18 20)",
  "oklch(0.72 0.16 330)",
  "oklch(0.72 0.16 95)",
  "oklch(0.72 0.16 245)",
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ProgramBadgeChip({
  code,
  colorKey,
  size = 32,
}: {
  code: string;
  colorKey?: string;
  size?: number;
}) {
  const key = colorKey ?? code;
  const color = PALETTE[hashCode(key || "x") % PALETTE.length];
  const label = (code || "?").slice(0, 2).toUpperCase();

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        bgcolor: `color-mix(in oklch, ${color} 14%, transparent)`,
        border: "1px solid",
        borderColor: `color-mix(in oklch, ${color} 32%, transparent)`,
        flexShrink: 0,
      }}
    >
      <Typography
        variant="mono"
        sx={{ fontWeight: 700, fontSize: size * 0.4, letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        {label}
      </Typography>
    </Box>
  );
}
