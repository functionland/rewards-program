"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Navigation, DRAWER_WIDTH } from "./Navigation";
import { Header } from "./Header";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Navigation mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, minWidth: 0, overflow: "hidden" }}>
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, sm: 3 }, overflow: "hidden", maxWidth: "100%" }}>
          {children}
        </Box>
        <Box component="footer" sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
            All data on this portal is stored on-chain and is publicly visible and verifiable. Do not enter personal or protected information. By using this portal, you acknowledge that all transactions and records are permanently recorded on the blockchain.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
