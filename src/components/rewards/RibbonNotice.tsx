"use client";

import { Box, Button } from "@mui/material";
import type { ReactNode } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

type Tone = "info" | "warn" | "success" | "error";

const TONE_CONFIG: Record<
  Tone,
  { color: string; icon: typeof InfoOutlinedIcon }
> = {
  info: { color: "var(--mui-palette-accent-main)", icon: InfoOutlinedIcon },
  warn: { color: "var(--mui-palette-warning-main)", icon: WarningAmberIcon },
  success: { color: "var(--mui-palette-success-main)", icon: CheckCircleOutlineIcon },
  error: { color: "var(--mui-palette-error-main)", icon: ErrorOutlineIcon },
};

export function RibbonNotice({
  tone = "info",
  children,
  action,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  action?: { label: string; onClick?: () => void; href?: string };
  icon?: ReactNode;
}) {
  const cfg = TONE_CONFIG[tone];
  const Icon = cfg.icon;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.75,
        py: 1,
        borderRadius: 2,
        border: "1px solid",
        borderColor: `color-mix(in oklch, ${cfg.color} 34%, transparent)`,
        bgcolor: `color-mix(in oklch, ${cfg.color} 10%, transparent)`,
        color: "text.primary",
        fontSize: 13.5,
        lineHeight: 1.45,
      }}
    >
      <Box sx={{ color: cfg.color, display: "inline-flex", flexShrink: 0 }}>
        {icon ?? <Icon sx={{ fontSize: 18 }} />}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
      {action && (
        <Button
          size="small"
          variant="text"
          href={action.href}
          onClick={action.onClick}
          sx={{ color: cfg.color, fontWeight: 600, flexShrink: 0 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
