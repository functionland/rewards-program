"use client";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { wagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1" },
    secondary: { main: "#ec4899" },
    background: { default: "#0f172a", paper: "#1e293b" },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { overflowX: "hidden" },
        body: { overflowX: "hidden" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12, maxWidth: "100%", boxSizing: "border-box" },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { maxWidth: "100%" },
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
