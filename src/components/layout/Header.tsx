"use client";

import { AppBar, Toolbar, Typography, Box, Chip, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useUserRole } from "@/hooks/useUserRole";

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { isAdmin, isConnected } = useUserRole();

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar>
        <IconButton
          edge="start"
          aria-label="open menu"
          onClick={onMenuToggle}
          sx={{ mr: 2, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Rewards Program
        </Typography>
        {isConnected && (
          <Chip
            label={isAdmin ? "Admin" : "Member"}
            color={isAdmin ? "error" : "primary"}
            size="small"
            sx={{ mr: 2 }}
          />
        )}
        <ConnectButton />
      </Toolbar>
    </AppBar>
  );
}
