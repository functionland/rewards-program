"use client";

import { Chip } from "@mui/material";
import { MemberTypeEnum, MemberTypeLabels } from "@/config/contracts";

const COLOR: Record<number, { fg: string; bg: string; border: string }> = {
  [MemberTypeEnum.Free]: {
    fg: "var(--mui-palette-text-tertiary)",
    bg: "color-mix(in oklch, var(--mui-palette-text-tertiary) 10%, transparent)",
    border: "color-mix(in oklch, var(--mui-palette-text-tertiary) 24%, transparent)",
  },
  [MemberTypeEnum.Vip]: {
    fg: "var(--mui-palette-warning-main)",
    bg: "color-mix(in oklch, var(--mui-palette-warning-main) 14%, transparent)",
    border: "color-mix(in oklch, var(--mui-palette-warning-main) 32%, transparent)",
  },
  [MemberTypeEnum.Elite]: {
    fg: "var(--mui-palette-accent-main)",
    bg: "color-mix(in oklch, var(--mui-palette-accent-main) 14%, transparent)",
    border: "color-mix(in oklch, var(--mui-palette-accent-main) 32%, transparent)",
  },
  [MemberTypeEnum.PSPartner]: {
    fg: "var(--mui-palette-error-main)",
    bg: "color-mix(in oklch, var(--mui-palette-error-main) 12%, transparent)",
    border: "color-mix(in oklch, var(--mui-palette-error-main) 28%, transparent)",
  },
};

export function MemberTypeChip({
  type,
  size = "small",
}: {
  type: number;
  size?: "small" | "medium";
}) {
  const c = COLOR[type] ?? COLOR[0];
  return (
    <Chip
      size={size}
      label={MemberTypeLabels[type] ?? "—"}
      variant="outlined"
      sx={{
        color: c.fg,
        bgcolor: c.bg,
        borderColor: c.border,
        border: "1px solid",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    />
  );
}
