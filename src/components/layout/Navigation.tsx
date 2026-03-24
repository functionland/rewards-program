"use client";

import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Box } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import PeopleIcon from "@mui/icons-material/People";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "Dashboard", href: "/", icon: <DashboardIcon />, requiresAuth: false },
  { label: "Programs", href: "/programs", icon: <GroupWorkIcon />, requiresAuth: false },
  { label: "Members", href: "/members", icon: <PeopleIcon />, requiresAuth: false },
  { label: "Tokens", href: "/tokens", icon: <AccountBalanceWalletIcon />, requiresAuth: true },
  { label: "Balance Lookup", href: "/balance", icon: <ReceiptLongIcon />, requiresAuth: false },
];

export function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useUserRole();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          bgcolor: "background.paper",
        },
      }}
    >
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountBalanceWalletIcon color="primary" />
          <Typography variant="h6" noWrap color="primary">
            FULA Rewards
          </Typography>
        </Box>
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              disabled={item.requiresAuth && !isConnected}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
