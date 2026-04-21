"use client";

import { Box, Button } from "@mui/material";

export type FilterOption<V extends string = string> = {
  value: V;
  label: string;
  badge?: string | number;
};

export function FilterPills<V extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
}: {
  options: FilterOption<V>[];
  value: V;
  onChange: (v: V) => void;
  fullWidth?: boolean;
}) {
  return (
    <Box
      role="tablist"
      sx={{
        display: "flex",
        gap: 0.75,
        overflowX: "auto",
        pb: 0.5,
        "&::-webkit-scrollbar": { display: "none" },
        scrollbarWidth: "none",
      }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Button
            key={opt.value}
            role="tab"
            variant="pill"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            sx={{
              flex: fullWidth ? 1 : "0 0 auto",
              whiteSpace: "nowrap",
              minWidth: fullWidth ? 0 : undefined,
            }}
          >
            {opt.label}
            {opt.badge !== undefined && (
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  fontSize: 11,
                  opacity: 0.7,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {opt.badge}
              </Box>
            )}
          </Button>
        );
      })}
    </Box>
  );
}
