"use client";

import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { useHighestMemberRole } from "@/hooks/useHighestMemberRole";
import { MemberRoleEnum, MemberRoleLabels } from "@/config/contracts";

const SEGMENT_LABELS: Record<string, string> = {
  "": "Overview",
  me: "My rewards",
  activity: "Activity",
  balance: "Balance",
  redeem: "Move tokens",
  tokens: "Move tokens",
  programs: "Programs",
  members: "Members",
  reports: "Reports",
  help: "Help",
};

function buildCrumbs(pathname: string): Array<{ href: string; label: string }> {
  if (pathname === "/") return [{ href: "/", label: "Overview" }];
  const segs = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ href: string; label: string }> = [];
  let acc = "";
  for (const s of segs) {
    acc += `/${s}`;
    const label = SEGMENT_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
    crumbs.push({ href: acc, label });
  }
  return crumbs;
}

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const { isAdmin, isConnected } = useUserRole();
  const { highestRole } = useHighestMemberRole();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  const crumbs = buildCrumbs(pathname);

  let roleLabel: string | null = null;
  let roleColor: "error" | "primary" | "default" = "default";
  if (isConnected) {
    if (isAdmin) {
      roleLabel = "Admin";
      roleColor = "error";
    } else if (highestRole > MemberRoleEnum.None) {
      roleLabel = MemberRoleLabels[highestRole] ?? null;
      roleColor = "primary";
    }
  }

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: "border.default",
        backgroundColor: "transparent",
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        <IconButton
          edge="start"
          aria-label="open menu"
          onClick={onMenuToggle}
          sx={{ mr: 0.5, display: { md: "none" }, color: "text.secondary" }}
        >
          <MenuIcon />
        </IconButton>
        <Box
          component="nav"
          aria-label="breadcrumb"
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            overflow: "hidden",
          }}
        >
          {crumbs.map((c, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <Box
                key={c.href}
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, minWidth: 0 }}
              >
                {idx > 0 && (
                  <ChevronRightIcon
                    sx={{ fontSize: 16, color: "text.tertiary", flexShrink: 0 }}
                  />
                )}
                {isLast ? (
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: 14, sm: 15 },
                      color: "text.primary",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.label}
                  </Typography>
                ) : (
                  <Typography
                    component={Link}
                    href={c.href}
                    sx={{
                      fontSize: { xs: 13.5, sm: 14 },
                      color: "text.tertiary",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      "&:hover": { color: "text.secondary" },
                    }}
                  >
                    {c.label}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
        {roleLabel && (
          <Chip
            label={roleLabel}
            color={roleColor === "default" ? undefined : roleColor}
            size="small"
            variant="outlined"
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          />
        )}
        <ConnectButton
          accountStatus={isMobile ? "avatar" : "address"}
          chainStatus={isMobile ? "icon" : "name"}
          showBalance={false}
        />
      </Toolbar>
    </AppBar>
  );
}
