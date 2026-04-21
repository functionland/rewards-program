"use client";

import { Box, Paper, Skeleton, Typography } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TimelapseOutlinedIcon from "@mui/icons-material/TimelapseOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import type { ReactNode } from "react";
import { formatFula } from "@/lib/utils";

type Variant = "hero" | "inline";

export function BalanceHero({
  available,
  unlocking,
  locked,
  title = "My rewards",
  subtitle,
  usdEstimate,
  momPercent,
  loading = false,
  variant = "hero",
  action,
}: {
  available: bigint;
  unlocking: bigint;
  locked: bigint;
  title?: string;
  subtitle?: ReactNode;
  usdEstimate?: number | null;
  momPercent?: number | null;
  loading?: boolean;
  variant?: Variant;
  action?: ReactNode;
}) {
  const total = available + unlocking + locked;
  const isHero = variant === "hero";

  return (
    <Paper
      variant={isHero ? "hero" : undefined}
      sx={{
        p: isHero ? { xs: 2.5, sm: 3 } : { xs: 2, sm: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="micro"
            sx={{ color: "text.tertiary", display: "block" }}
          >
            {title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
            {loading ? (
              <Skeleton variant="text" width={180} height={48} />
            ) : (
              <Typography
                sx={{
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                  fontSize: { xs: 30, sm: 38 },
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                }}
              >
                {formatFula(total)}
              </Typography>
            )}
            <Typography
              sx={{
                color: "text.tertiary",
                fontSize: { xs: 14, sm: 16 },
                fontWeight: 600,
              }}
            >
              FULA
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, mt: 0.5, alignItems: "center", flexWrap: "wrap" }}>
            {usdEstimate != null && (
              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                ≈ ${usdEstimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Typography>
            )}
            {momPercent != null && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.25,
                  color: momPercent >= 0 ? "success.main" : "error.main",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {momPercent >= 0 ? (
                  <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                ) : (
                  <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                )}
                {Math.abs(momPercent).toFixed(1)}% vs last month
              </Box>
            )}
            {subtitle && (
              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: { xs: 1, sm: 1.5 },
          borderTop: "1px solid",
          borderColor: "border.default",
          pt: 1.5,
        }}
      >
        <BreakdownCell
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 15 }} />}
          label="Available"
          value={available}
          tone="success.main"
          loading={loading}
        />
        <BreakdownCell
          icon={<TimelapseOutlinedIcon sx={{ fontSize: 15 }} />}
          label="Unlocking"
          value={unlocking}
          tone="warning.main"
          loading={loading}
        />
        <BreakdownCell
          icon={<LockOutlinedIcon sx={{ fontSize: 15 }} />}
          label="Locked"
          value={locked}
          tone="text.tertiary"
          loading={loading}
        />
      </Box>
    </Paper>
  );
}

function BreakdownCell({
  icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: bigint;
  tone: string;
  loading?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          color: tone,
        }}
      >
        {icon}
        <Typography
          variant="micro"
          sx={{ color: "text.tertiary", display: "block", letterSpacing: "0.06em" }}
        >
          {label}
        </Typography>
      </Box>
      {loading ? (
        <Skeleton variant="text" width={70} height={22} />
      ) : (
        <Typography
          sx={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          {formatFula(value)}
        </Typography>
      )}
    </Box>
  );
}
