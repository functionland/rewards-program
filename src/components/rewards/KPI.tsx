"use client";

import { Box, Paper, Skeleton, Typography } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import type { ReactNode } from "react";
import { Sparkline } from "./Sparkline";

export function KPI({
  label,
  value,
  delta,
  deltaPositive,
  sparkData,
  loading = false,
  unit,
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  sparkData?: number[];
  loading?: boolean;
  unit?: string;
  icon?: ReactNode;
}) {
  return (
    <Paper sx={{ p: { xs: 1.5, sm: 1.75 }, display: "flex", flexDirection: "column", gap: 1 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography variant="micro" sx={{ color: "text.tertiary" }}>
          {label}
        </Typography>
        {icon && (
          <Box sx={{ color: "text.tertiary", display: "inline-flex" }}>{icon}</Box>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
        {loading ? (
          <Skeleton variant="text" width={80} height={32} />
        ) : (
          <Typography
            sx={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 700,
              fontSize: { xs: 22, sm: 26 },
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
            }}
          >
            {value}
          </Typography>
        )}
        {unit && (
          <Typography sx={{ color: "text.tertiary", fontSize: 13 }}>{unit}</Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        {delta ? (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.25,
              color: deltaPositive ? "success.main" : "error.main",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {deltaPositive ? (
              <ArrowUpwardIcon sx={{ fontSize: 13 }} />
            ) : (
              <ArrowDownwardIcon sx={{ fontSize: 13 }} />
            )}
            {delta}
          </Box>
        ) : (
          <span />
        )}
        {sparkData && sparkData.length > 1 && (
          <Box sx={{ flexShrink: 0 }}>
            <Sparkline data={sparkData} width={72} height={22} />
          </Box>
        )}
      </Box>
    </Paper>
  );
}
