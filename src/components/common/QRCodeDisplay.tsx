"use client";

import { QRCodeSVG } from "qrcode.react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useState } from "react";

interface QRCodeDisplayProps {
  programId: number;
  memberID: string;
  /** Display label shown under the QR. Falls back to "Program {id}" if omitted. */
  programName?: string;
  size?: number;
}

/**
 * Build the transfer deep-link URL for a (programId, memberID) pair.
 * Scanning with a phone camera opens /tokens with the Transfer tab preselected
 * and the member code prefilled. Uses the current origin so staging and prod
 * each generate their own links.
 */
function buildTransferUrl(programId: number, memberID: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    program: String(programId),
    member: memberID,
    action: "transfer",
  });
  return `${origin}/tokens?${params.toString()}`;
}

export function QRCodeDisplay({ programId, memberID, programName, size = 120 }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const qrData = buildTransferUrl(programId, memberID);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const label = programName || `Program ${programId}`;

  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <QRCodeSVG value={qrData} size={size} level="M" />
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, maxWidth: size + 40 }}>
        <Typography variant="caption" color="text.secondary" noWrap title={label}>
          {label}
        </Typography>
        <Tooltip title={copied ? "Copied!" : "Copy transfer link"}>
          <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
