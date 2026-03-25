"use client";

import { QRCodeSVG } from "qrcode.react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useState } from "react";

interface QRCodeDisplayProps {
  programId: number;
  memberID: string;
  size?: number;
}

export function QRCodeDisplay({ programId, memberID, size = 120 }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const qrData = JSON.stringify({ p: programId, m: memberID });

  const handleCopy = () => {
    navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <QRCodeSVG value={qrData} size={size} level="M" />
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {memberID} (P{programId})
        </Typography>
        <Tooltip title={copied ? "Copied!" : "Copy QR data"}>
          <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
