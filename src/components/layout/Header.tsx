"use client";

import { AppBar, Toolbar, Typography, Box, Chip } from "@mui/material";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useUserRole } from "@/hooks/useUserRole";

export function Header() {
  const { highestRole, isConnected } = useUserRole();

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Rewards Program
        </Typography>
        {isConnected && (
          <Chip
            label={highestRole}
            color={highestRole === "Admin" ? "error" : highestRole === "Member" ? "primary" : "default"}
            size="small"
            sx={{ mr: 2 }}
          />
        )}
        <ConnectButton />
      </Toolbar>
    </AppBar>
  );
}
