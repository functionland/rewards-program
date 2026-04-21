"use client";

import { Chip } from "@mui/material";
import { MemberRoleEnum, MemberRoleLabels } from "@/config/contracts";

type Role = number;

const COLOR: Record<Role, { fg: string; bg: string; border: string }> = {
  [MemberRoleEnum.None]: {
    fg: "var(--mui-palette-text-tertiary)",
    bg: "color-mix(in oklch, var(--mui-palette-text-tertiary) 12%, transparent)",
    border: "color-mix(in oklch, var(--mui-palette-text-tertiary) 30%, transparent)",
  },
  [MemberRoleEnum.Client]: {
    fg: "var(--mui-palette-success-main)",
    bg: "color-mix(in oklch, var(--mui-palette-success-main) 12%, transparent)",
    border: "color-mix(in oklch, var(--mui-palette-success-main) 30%, transparent)",
  },
  [MemberRoleEnum.TeamLeader]: {
    fg: "var(--mui-palette-warning-main)",
    bg: "color-mix(in oklch, var(--mui-palette-warning-main) 14%, transparent)",
    border: "color-mix(in oklch, var(--mui-palette-warning-main) 32%, transparent)",
  },
  [MemberRoleEnum.ProgramAdmin]: {
    fg: "var(--mui-palette-accent-main)",
    bg: "color-mix(in oklch, var(--mui-palette-accent-main) 14%, transparent)",
    border: "color-mix(in oklch, var(--mui-palette-accent-main) 32%, transparent)",
  },
};

export function RoleChip({
  role,
  size = "small",
  label,
}: {
  role: number;
  size?: "small" | "medium";
  label?: string;
}) {
  const c = COLOR[role] ?? COLOR[0];
  return (
    <Chip
      size={size}
      label={label ?? MemberRoleLabels[role] ?? "Unknown"}
      sx={{
        color: c.fg,
        bgcolor: c.bg,
        borderColor: c.border,
        border: "1px solid",
        fontWeight: 600,
      }}
      variant="outlined"
    />
  );
}
