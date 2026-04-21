"use client";

import { Box, ButtonBase } from "@mui/material";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";

export function Numpad({
  value,
  onChange,
  maxLength = 12,
  decimals = 6,
}: {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  decimals?: number;
}) {
  const append = (ch: string) => {
    if (ch === "." && (value.includes(".") || decimals === 0)) return;
    if (value.length >= maxLength) return;
    if (value === "0" && ch !== ".") {
      onChange(ch);
      return;
    }
    if (ch === ".") {
      onChange(value === "" ? "0." : value + ".");
      return;
    }
    const next = value + ch;
    const [intPart, fracPart] = next.split(".");
    if (fracPart && fracPart.length > decimals) return;
    if (intPart.length > maxLength - (fracPart ? fracPart.length + 1 : 0)) return;
    onChange(next);
  };

  const backspace = () => onChange(value.slice(0, -1));

  const keys: Array<{ label: string; onClick: () => void; mono?: boolean; key: string }> = [
    ...["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => ({
      key: d,
      label: d,
      mono: true,
      onClick: () => append(d),
    })),
    { key: ".", label: ".", mono: true, onClick: () => append(".") },
    { key: "0", label: "0", mono: true, onClick: () => append("0") },
    { key: "bs", label: "⌫", onClick: backspace },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1,
        userSelect: "none",
      }}
    >
      {keys.map((k) => (
        <ButtonBase
          key={k.key}
          onClick={k.onClick}
          sx={{
            minHeight: 56,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "border.default",
            bgcolor: "surface.one",
            color: "text.primary",
            fontSize: 22,
            fontWeight: 600,
            fontFamily: k.mono
              ? "var(--font-mono, 'JetBrains Mono'), ui-monospace, monospace"
              : undefined,
            transition: "background-color 120ms ease, border-color 120ms ease, transform 90ms ease",
            "&:hover": { bgcolor: "surface.two", borderColor: "border.strong" },
            "&:active": { transform: "scale(0.98)" },
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "accent.main",
              outlineOffset: 2,
            },
          }}
        >
          {k.key === "bs" ? <BackspaceOutlinedIcon /> : k.label}
        </ButtonBase>
      ))}
    </Box>
  );
}
