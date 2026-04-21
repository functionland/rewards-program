"use client";

import { createTheme, alpha } from "@mui/material/styles";
import type { CSSProperties } from "react";
import { parseOklchToHex } from "@/lib/color";

export const tokens = {
  bg: "oklch(0.18 0.008 260)",
  bg2: "oklch(0.21 0.01 260)",
  surface: "oklch(0.24 0.012 260)",
  surface2: "oklch(0.28 0.014 260)",
  border: "oklch(0.34 0.014 260)",
  border2: "oklch(0.42 0.016 260)",
  text: "oklch(0.96 0.005 260)",
  text2: "oklch(0.76 0.01 260)",
  text3: "oklch(0.58 0.012 260)",
  accent: "oklch(0.72 0.16 275)",
  accent2: "oklch(0.62 0.16 275)",
  accentSoft: "oklch(0.72 0.16 275 / 0.12)",
  good: "oklch(0.78 0.14 150)",
  warn: "oklch(0.82 0.14 70)",
  bad: "oklch(0.7 0.18 20)",
} as const;

export const hex = {
  bg: parseOklchToHex(tokens.bg),
  bg2: parseOklchToHex(tokens.bg2),
  surface: parseOklchToHex(tokens.surface),
  surface2: parseOklchToHex(tokens.surface2),
  border: parseOklchToHex(tokens.border),
  border2: parseOklchToHex(tokens.border2),
  text: parseOklchToHex(tokens.text),
  text2: parseOklchToHex(tokens.text2),
  text3: parseOklchToHex(tokens.text3),
  accent: parseOklchToHex(tokens.accent),
  accent2: parseOklchToHex(tokens.accent2),
  good: parseOklchToHex(tokens.good),
  warn: parseOklchToHex(tokens.warn),
  bad: parseOklchToHex(tokens.bad),
} as const;

declare module "@mui/material/styles" {
  interface Palette {
    accent: Palette["primary"];
    surface: { default: string; one: string; two: string };
    border: { default: string; strong: string };
  }
  interface PaletteOptions {
    accent?: PaletteOptions["primary"];
    surface?: { default?: string; one?: string; two?: string };
    border?: { default?: string; strong?: string };
  }
  interface TypeText {
    tertiary: string;
  }
  interface TypographyVariants {
    micro: CSSProperties;
    mono: CSSProperties;
    serif: CSSProperties;
  }
  interface TypographyVariantsOptions {
    micro?: CSSProperties;
    mono?: CSSProperties;
    serif?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    micro: true;
    mono: true;
    serif: true;
  }
}

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    hero: true;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    pill: true;
  }
}

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    primary: { main: hex.accent, dark: hex.accent2, contrastText: "#ffffff" },
    secondary: { main: hex.accent2, contrastText: "#ffffff" },
    accent: {
      main: hex.accent,
      dark: hex.accent2,
      light: hex.accent,
      contrastText: "#ffffff",
    },
    success: { main: hex.good, contrastText: "#0b0b0b" },
    warning: { main: hex.warn, contrastText: "#0b0b0b" },
    error: { main: hex.bad, contrastText: "#ffffff" },
    background: { default: hex.bg, paper: hex.surface },
    surface: { default: hex.surface, one: hex.surface2, two: hex.bg2 },
    border: { default: hex.border, strong: hex.border2 },
    text: { primary: hex.text, secondary: hex.text2, tertiary: hex.text3 },
    divider: hex.border,
  },
  typography: {
    fontFamily:
      "var(--font-sans, 'Inter'), 'Inter', system-ui, -apple-system, sans-serif",
    h1: { fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h2: { fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.005em" },
    h3: { fontSize: "1.125rem", fontWeight: 600 },
    h4: { fontSize: "1rem", fontWeight: 600 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.55 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
    caption: { fontSize: "0.8125rem" },
    button: { fontWeight: 600, letterSpacing: 0 },
    micro: {
      fontSize: "0.6875rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      lineHeight: 1.1,
      display: "inline-block",
    },
    mono: {
      fontFamily:
        "var(--font-mono, 'JetBrains Mono'), 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
      fontSize: "0.9375rem",
    },
    serif: {
      fontFamily:
        "var(--font-serif, 'Instrument Serif'), 'Instrument Serif', Georgia, serif",
      fontStyle: "italic",
      fontWeight: 400,
    },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          "--bg": tokens.bg,
          "--bg-2": tokens.bg2,
          "--surface": tokens.surface,
          "--surface-2": tokens.surface2,
          "--border": tokens.border,
          "--border-2": tokens.border2,
          "--text": tokens.text,
          "--text-2": tokens.text2,
          "--text-3": tokens.text3,
          "--accent": tokens.accent,
          "--accent-2": tokens.accent2,
          "--accent-soft": tokens.accentSoft,
          "--good": tokens.good,
          "--warn": tokens.warn,
          "--bad": tokens.bad,
        },
        html: { overflowX: "hidden" },
        body: {
          overflowX: "hidden",
          backgroundColor: hex.bg,
          color: hex.text,
        },
        "*:focus-visible": {
          outline: `2px solid ${alpha(hex.accent, 0.55)}`,
          outlineOffset: 2,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 9,
          fontWeight: 600,
        },
        containedPrimary: {
          "&:hover": { backgroundColor: hex.accent2 },
        },
      },
      variants: [
        {
          props: { variant: "pill" },
          style: {
            borderRadius: 999,
            paddingInline: 14,
            paddingBlock: 6,
            minHeight: 32,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: hex.text2,
            backgroundColor: "transparent",
            border: `1px solid ${hex.border}`,
            "&:hover": {
              backgroundColor: alpha(hex.accent, 0.08),
              borderColor: hex.border2,
              color: hex.text,
            },
            "&[aria-pressed='true'], &[data-selected='true']": {
              color: hex.text,
              backgroundColor: alpha(hex.accent, 0.14),
              borderColor: hex.accent,
            },
          },
        },
      ],
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: hex.surface,
          border: `1px solid ${hex.border}`,
          maxWidth: "100%",
          boxSizing: "border-box",
          backgroundImage: "none",
        },
      },
      variants: [
        {
          props: { variant: "hero" },
          style: {
            borderRadius: 20,
            padding: 24,
            border: `1px solid ${hex.border2}`,
            background: `radial-gradient(120% 140% at 80% -10%, ${alpha(hex.accent, 0.22)} 0%, transparent 55%), ${hex.surface}`,
          },
        },
      ],
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          maxWidth: "100%",
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            backgroundColor: hex.bg2,
            "& fieldset": { borderColor: hex.border },
            "&:hover fieldset": { borderColor: hex.border2 },
            "&.Mui-focused fieldset": {
              borderColor: hex.accent,
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 24,
          fontSize: "0.75rem",
          fontWeight: 600,
        },
        outlined: { borderColor: hex.border },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: hex.border } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: hex.surface2,
          color: hex.text,
          border: `1px solid ${hex.border2}`,
          fontSize: "0.75rem",
          borderRadius: 8,
        },
        arrow: { color: hex.surface2 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: hex.bg,
          borderRight: `1px solid ${hex.border}`,
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: hex.bg,
          borderBottom: `1px solid ${hex.border}`,
          backgroundImage: "none",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minHeight: 40,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginInline: 8,
          "&.Mui-selected": {
            backgroundColor: alpha(hex.accent, 0.14),
            color: hex.text,
            "&:hover": { backgroundColor: alpha(hex.accent, 0.2) },
            "& .MuiListItemIcon-root": { color: hex.accent },
          },
        },
      },
    },
  },
});

export type AppTheme = typeof theme;
