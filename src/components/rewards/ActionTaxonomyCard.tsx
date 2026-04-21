"use client";

import { Box, ButtonBase, Typography } from "@mui/material";
import type { ReactNode } from "react";

export type TaxonomyAction = {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
  /** If present, the card disabled when user role is not in this list. */
  allowedRoles?: number[];
};

export function ActionTaxonomyCard({
  icon,
  title,
  description,
  selected = false,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <ButtonBase
      onClick={disabled ? undefined : onClick}
      aria-pressed={selected}
      disabled={disabled}
      sx={{
        display: "block",
        textAlign: "left",
        width: "100%",
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          p: { xs: 1.5, sm: 1.75 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: selected ? "accent.main" : "border.default",
          bgcolor: selected
            ? "color-mix(in oklch, var(--mui-palette-accent-main) 10%, transparent)"
            : "surface.default",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          opacity: disabled ? 0.5 : 1,
          transition:
            "background-color 120ms ease, border-color 120ms ease, transform 90ms ease",
          "&:hover": disabled
            ? undefined
            : {
                borderColor: "border.strong",
                bgcolor: "surface.one",
              },
          "&:active": disabled ? undefined : { transform: "scale(0.995)" },
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: selected
              ? "color-mix(in oklch, var(--mui-palette-accent-main) 18%, transparent)"
              : "surface.two",
            color: selected ? "accent.main" : "text.secondary",
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        <Typography
          sx={{ color: "text.tertiary", fontSize: 12.5, lineHeight: 1.4 }}
        >
          {description}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
