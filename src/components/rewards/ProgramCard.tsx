"use client";

import { Box, Paper, Skeleton, Typography } from "@mui/material";
import Link from "next/link";
import { useProgram, useProgramLogo } from "@/hooks/useRewardsProgram";
import { fromBytes8, ipfsLogoUrl } from "@/lib/utils";
import { ProgramBadgeChip } from "./ProgramBadgeChip";
import type { ReactNode } from "react";

export function ProgramCard({
  programId,
  compact = false,
  href,
  rightSlot,
  footer,
}: {
  programId: number;
  compact?: boolean;
  href?: string;
  rightSlot?: ReactNode;
  footer?: ReactNode;
}) {
  const { data: program } = useProgram(programId);
  const { data: logoCID } = useProgramLogo(programId);

  const name = program?.name ?? "";
  const code = program ? fromBytes8(program.code) : "";
  const active = program?.active ?? true;
  const logoUrl = logoCID ? ipfsLogoUrl(logoCID) : null;

  const body = (
    <Paper
      sx={{
        p: compact ? 1.5 : 2,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        transition: "border-color 120ms ease, transform 120ms ease",
        "&:hover": href ? { borderColor: "border.strong" } : undefined,
        opacity: active ? 1 : 0.7,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={name}
            width={compact ? 32 : 40}
            height={compact ? 32 : 40}
            style={{
              borderRadius: 10,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <ProgramBadgeChip code={code || "??"} size={compact ? 32 : 40} />
        )}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          {program ? (
            <>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: compact ? 14 : 15,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </Typography>
              <Typography
                variant="micro"
                sx={{
                  color: active ? "text.tertiary" : "error.main",
                  display: "block",
                  mt: 0.25,
                }}
              >
                {code}
                {!active && " · Paused"}
              </Typography>
            </>
          ) : (
            <>
              <Skeleton variant="text" width="70%" height={20} />
              <Skeleton variant="text" width="40%" height={14} />
            </>
          )}
        </Box>
        {rightSlot && <Box sx={{ flexShrink: 0 }}>{rightSlot}</Box>}
      </Box>
      {footer}
    </Paper>
  );

  if (href) {
    return (
      <Box
        component={Link}
        href={href}
        sx={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        {body}
      </Box>
    );
  }
  return body;
}
