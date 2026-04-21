"use client";

import { Box, Tooltip, Typography } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";

export function OnChainBadge({
  compact = false,
  tooltip,
}: {
  compact?: boolean;
  tooltip?: string;
}) {
  const badge = (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: compact ? 1 : 1.25,
        py: compact ? 0.25 : 0.5,
        borderRadius: 999,
        border: "1px solid",
        borderColor: "border.default",
        bgcolor: "color-mix(in oklch, var(--mui-palette-success-main) 8%, transparent)",
        color: "success.main",
        fontWeight: 600,
        fontSize: compact ? 11 : 12,
        lineHeight: 1,
      }}
    >
      <VerifiedIcon sx={{ fontSize: compact ? 13 : 14 }} />
      <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
        Verified on-chain
      </Typography>
    </Box>
  );

  if (!tooltip) return badge;
  return (
    <Tooltip title={tooltip} arrow>
      {badge}
    </Tooltip>
  );
}
