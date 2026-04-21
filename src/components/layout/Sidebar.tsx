"use client";

import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { ComponentType } from "react";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import GroupWorkOutlinedIcon from "@mui/icons-material/GroupWorkOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useHighestMemberRole } from "@/hooks/useHighestMemberRole";
import { MemberRoleEnum } from "@/config/contracts";

export const DRAWER_WIDTH = 248;

type Persona = "guest" | "client" | "teamLeader" | "programAdmin" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ sx?: object; fontSize?: "small" | "medium" | "large" }>;
  activeFor?: (pathname: string) => boolean;
};

type NavSection = {
  key: "operator" | "member" | "support";
  title?: string;
  items: NavItem[];
};

function startsWith(prefix: string) {
  return (pathname: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function buildSections(persona: Persona): NavSection[] {
  const memberSections: NavSection[] = [
    {
      key: "member",
      title: "My rewards",
      items: [
        {
          label: "Home",
          href: "/me",
          icon: StarBorderOutlinedIcon,
          activeFor: (p) => p === "/me",
        },
        {
          label: "Activity",
          href: "/me/activity",
          icon: TimelineOutlinedIcon,
          activeFor: startsWith("/me/activity"),
        },
        {
          label: "Programs",
          href: "/programs",
          icon: GroupWorkOutlinedIcon,
          activeFor: startsWith("/programs"),
        },
        {
          label: "Send & receive",
          href: "/redeem",
          icon: SwapHorizOutlinedIcon,
          activeFor: startsWith("/redeem"),
        },
      ],
    },
  ];

  const operatorSections = (subset: "leader" | "admin"): NavSection[] => {
    const items: NavItem[] = [];
    if (subset === "admin") {
      items.push({
        label: "Overview",
        href: "/",
        icon: SpaceDashboardOutlinedIcon,
        activeFor: (p) => p === "/",
      });
    }
    items.push({
      label: "Redeem / Transfer",
      href: "/redeem",
      icon: SwapHorizOutlinedIcon,
      activeFor: startsWith("/redeem"),
    });
    if (subset === "admin") {
      items.push({
        label: "Programs",
        href: "/programs",
        icon: GroupWorkOutlinedIcon,
        activeFor: startsWith("/programs"),
      });
      items.push({
        label: "Members",
        href: "/members",
        icon: PeopleAltOutlinedIcon,
        activeFor: (p) => p === "/members" || p.startsWith("/members/"),
      });
      items.push({
        label: "Reports",
        href: "/reports",
        icon: AssessmentOutlinedIcon,
        activeFor: startsWith("/reports"),
      });
    } else {
      items.push({
        label: "My team",
        href: "/members?scope=mine",
        icon: GroupsOutlinedIcon,
        activeFor: (p) => p === "/members" || p.startsWith("/members/"),
      });
    }
    return [{ key: "operator", title: "Operator", items }];
  };

  const support: NavSection = {
    key: "support",
    items: [
      { label: "Help", href: "/help", icon: HelpOutlineIcon, activeFor: startsWith("/help") },
    ],
  };

  switch (persona) {
    case "guest":
      return [
        {
          key: "member",
          title: "Explore",
          items: [
            {
              label: "My rewards",
              href: "/balance",
              icon: ReceiptLongOutlinedIcon,
              activeFor: startsWith("/balance"),
            },
            {
              label: "Browse programs",
              href: "/programs",
              icon: GroupWorkOutlinedIcon,
              activeFor: startsWith("/programs"),
            },
          ],
        },
        support,
      ];
    case "client":
      return [...memberSections, support];
    case "teamLeader":
      return [...operatorSections("leader"), ...memberSections, support];
    case "programAdmin":
    case "admin":
      return [...operatorSections("admin"), ...memberSections, support];
  }
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { isAdmin, isConnected } = useUserRole();
  const { highestRole } = useHighestMemberRole();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  let persona: Persona = "guest";
  if (mounted) {
    if (isAdmin) persona = "admin";
    else if (highestRole === MemberRoleEnum.ProgramAdmin) persona = "programAdmin";
    else if (highestRole === MemberRoleEnum.TeamLeader) persona = "teamLeader";
    else if (highestRole === MemberRoleEnum.Client) persona = "client";
    else if (isConnected) persona = "client";
    else persona = "guest";
  }

  const sections = buildSections(persona);

  const content = (
    <>
      <Toolbar
        sx={{
          px: 2.25,
          py: 1.5,
          minHeight: 64,
          gap: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 9,
            background:
              "linear-gradient(135deg, var(--mui-palette-accent-main), var(--mui-palette-error-main))",
            boxShadow: "0 4px 16px -6px var(--mui-palette-accent-main)",
            color: "#fff",
          }}
        >
          <AutoAwesomeOutlinedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ lineHeight: 1.1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.005em" }}>
            FULA Rewards
          </Typography>
          <Typography
            variant="micro"
            sx={{ color: "text.tertiary", display: "block", mt: 0.25 }}
          >
            Portal
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          overflowY: "auto",
          py: 1,
        }}
      >
        {sections.map((section, sIdx) => {
          const isLast = sIdx === sections.length - 1;
          return (
            <Box key={section.key} sx={{ mt: sIdx === 0 ? 0 : 1 }}>
              {section.title && (
                <Typography
                  variant="micro"
                  sx={{
                    px: 2.5,
                    pt: 1.25,
                    pb: 0.5,
                    color: "text.tertiary",
                    display: "block",
                  }}
                >
                  {section.title}
                </Typography>
              )}
              <List disablePadding>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const selected = item.activeFor
                    ? item.activeFor(pathname)
                    : pathname === item.href;
                  return (
                    <ListItem key={item.href} disablePadding>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        selected={selected}
                        onClick={isMobile ? onClose : undefined}
                        sx={{ py: 0.75 }}
                      >
                        <ListItemIcon sx={{ minWidth: 34, color: "text.secondary" }}>
                          <Icon sx={{ fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: 14,
                            fontWeight: selected ? 600 : 500,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
              {!isLast && <Box sx={{ mt: 0.75 }} />}
            </Box>
          );
        })}
      </Box>
      <Divider />
      <Box sx={{ px: 2.25, py: 1.5 }}>
        <Typography
          variant="micro"
          sx={{ color: "text.tertiary", display: "block" }}
        >
          Verified via The Graph · public
        </Typography>
      </Box>
    </>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {content}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {content}
      </Drawer>
    </>
  );
}
