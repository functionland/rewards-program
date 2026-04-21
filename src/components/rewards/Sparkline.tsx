"use client";

import { Box } from "@mui/material";

export function Sparkline({
  data,
  width = 120,
  height = 28,
  color,
  strokeWidth = 1.5,
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
}) {
  if (!data || data.length < 2) {
    return <Box sx={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - strokeWidth * 2) - strokeWidth;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  const stroke = color ?? "var(--mui-palette-accent-main, var(--accent))";
  const gradientId = `sparkline-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ width, height, display: "block" }}>
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}
