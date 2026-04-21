"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Sidebar, DRAWER_WIDTH } from "./Sidebar";
import { Header } from "./Header";
import { OnChainBadge } from "@/components/rewards/OnChainBadge";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1.5, sm: 3 },
            overflow: "hidden",
            maxWidth: "100%",
          }}
        >
          {children}
        </Box>
        <Box
          component="footer"
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: "border.default",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "text.tertiary", flexGrow: 1, minWidth: 0 }}
          >
            Transactions and records are public and permanently on-chain. Do not enter personal data.
          </Typography>
          <OnChainBadge compact tooltip="All reads and writes come directly from on-chain contracts and The Graph." />
        </Box>
      </Box>
    </Box>
  );
}
