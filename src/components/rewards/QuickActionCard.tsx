"use client";

import { ButtonBase, Box, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import Link from "next/link";

export type QuickAction = {
  key: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  disabledReason?: string;
  accent?: boolean;
};

export function QuickActionCard({ action }: { action: QuickAction }) {
  const inner = (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        p: { xs: 1.5, sm: 1.75 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: action.accent ? "accent.main" : "border.default",
        bgcolor: action.accent
          ? "color-mix(in oklch, var(--mui-palette-accent-main) 12%, transparent)"
          : "surface.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.75,
        minHeight: 96,
        transition:
          "background-color 140ms ease, border-color 140ms ease, transform 90ms ease",
        "&:hover": {
          borderColor: "border.strong",
          bgcolor: "surface.one",
        },
        "&:active": { transform: "scale(0.99)" },
        opacity: action.disabled ? 0.45 : 1,
        pointerEvents: action.disabled ? "none" : undefined,
        cursor: action.disabled ? "not-allowed" : "pointer",
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          color: action.accent ? "accent.main" : "text.secondary",
          bgcolor: action.accent
            ? "color-mix(in oklch, var(--mui-palette-accent-main) 14%, transparent)"
            : "surface.two",
        }}
      >
        {action.icon}
      </Box>
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: 14,
          color: "text.primary",
          lineHeight: 1.25,
        }}
      >
        {action.title}
      </Typography>
      {action.subtitle && (
        <Typography
          sx={{
            color: "text.tertiary",
            fontSize: 12.5,
            lineHeight: 1.35,
          }}
        >
          {action.subtitle}
        </Typography>
      )}
    </Box>
  );

  const shell = action.href && !action.disabled ? (
    <ButtonBase
      component={Link}
      href={action.href}
      sx={{ display: "block", width: "100%", textAlign: "left", borderRadius: 3 }}
    >
      {inner}
    </ButtonBase>
  ) : (
    <ButtonBase
      onClick={action.disabled ? undefined : action.onClick}
      disabled={action.disabled}
      sx={{ display: "block", width: "100%", textAlign: "left", borderRadius: 3 }}
    >
      {inner}
    </ButtonBase>
  );

  if (action.disabled && action.disabledReason) {
    return (
      <Tooltip title={action.disabledReason} arrow>
        <span style={{ display: "block" }}>{shell}</span>
      </Tooltip>
    );
  }
  return shell;
}
