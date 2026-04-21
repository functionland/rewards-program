"use client";

import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Link from "next/link";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export type QRMode = "receive" | "redeem";

function buildUrl(params: {
  origin: string;
  mode: QRMode;
  memberID: string;
  programId: number;
  claimCode?: string;
}): string {
  const { origin, mode, memberID, programId, claimCode } = params;
  const search = new URLSearchParams();
  search.set("program", String(programId));
  search.set("member", memberID);
  if (mode === "receive") {
    search.set("action", "send-sub");
    return `${origin}/redeem?${search.toString()}`;
  }
  // redeem: includes programId as claim (matches legacy balance/redeem URL shape)
  search.set("claim", String(programId));
  if (claimCode) search.set("code", claimCode);
  search.set("action", "redeem");
  return `${origin}/redeem?${search.toString()}`;
}

export function QRFullscreenCard({
  open,
  onClose,
  memberID,
  programId,
  mode,
  claimCode,
}: {
  open: boolean;
  onClose: () => void;
  memberID: string;
  programId: number;
  mode: QRMode;
  claimCode?: string;
}) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = useMemo(
    () =>
      buildUrl({ origin, mode, memberID, programId, claimCode }),
    [origin, mode, memberID, programId, claimCode],
  );

  const isRedeem = mode === "redeem";
  const missingClaim = isRedeem && !claimCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: "background.default", backgroundImage: "none" } }}
    >
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "border.default",
          }}
        >
          <Box>
            <Typography variant="micro" sx={{ color: "text.tertiary" }}>
              {isRedeem ? "Redeem" : "Receive"}
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 16 }}>
              {isRedeem ? "Redeem points" : "Receive points"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="close" sx={{ color: "text.secondary" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2.5,
            p: 3,
            textAlign: "center",
          }}
        >
          {missingClaim ? (
            <Box sx={{ maxWidth: 360 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 18, mb: 1 }}>
                Save your claim code first
              </Typography>
              <Typography sx={{ color: "text.tertiary", fontSize: 14, mb: 2 }}>
                Redeeming requires the member&apos;s claim code. Open your Balance lookup page with the code URL to enable this QR.
              </Typography>
              <Button
                component={Link}
                href={`/balance?member=${memberID}`}
                variant="contained"
                color="primary"
              >
                Open balance lookup
              </Button>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 4,
                  boxShadow: "0 20px 60px -20px rgba(0,0,0,0.55)",
                }}
              >
                <QRCodeSVG
                  value={url}
                  size={260}
                  level="M"
                  marginSize={1}
                  bgColor="#ffffff"
                  fgColor="#0d0d12"
                />
              </Box>

              <Box sx={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Typography
                  sx={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  {memberID}
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                  {isRedeem
                    ? "Show this to a clerk to cash out. The balance is moved to your parent on scan."
                    : "Show this to someone with points to send. Anyone can credit you — no secret needed."}
                </Typography>
              </Box>

              {isRedeem && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: "warning.main",
                    color: "warning.main",
                    bgcolor:
                      "color-mix(in oklch, var(--mui-palette-warning-main) 10%, transparent)",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  <WarningAmberIcon sx={{ fontSize: 14 }} />
                  Contains your claim code — share only with trusted parties
                </Box>
              )}

              <Button
                size="small"
                startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                onClick={handleCopy}
                variant="outlined"
              >
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
