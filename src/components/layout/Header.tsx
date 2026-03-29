"use client";

import { AppBar, Toolbar, Typography, Box, Chip, IconButton, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useUserRole } from "@/hooks/useUserRole";

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { isAdmin, isConnected } = useUserRole();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start"
          aria-label="open menu"
          onClick={onMenuToggle}
          sx={{ mr: 1, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: "1rem", sm: "1.25rem" } }} noWrap>
          Rewards Program
        </Typography>
        {isConnected && isAdmin && (
          <Chip label="Admin" color="error" size="small" />
        )}
        <ConnectButton
          accountStatus={isMobile ? "avatar" : "address"}
          chainStatus={isMobile ? "icon" : "name"}
          showBalance={!isMobile}
        />
      </Toolbar>
    </AppBar>
  );
}
