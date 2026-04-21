"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { useCallback, useEffect, useRef, useState } from "react";

export type ScanResult = {
  raw: string;
  programId?: number;
  memberID?: string;
  action?: string;
  claim?: string;
  code?: string;
};

function parseDecoded(decoded: string): ScanResult {
  const raw = decoded.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
    try {
      const url = new URL(
        raw,
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost",
      );
      const programId = Number(url.searchParams.get("program"));
      const memberID = url.searchParams.get("member") ?? undefined;
      const action = url.searchParams.get("action") ?? undefined;
      const claim = url.searchParams.get("claim") ?? undefined;
      const code = url.searchParams.get("code") ?? undefined;
      return {
        raw,
        programId: programId > 0 ? programId : undefined,
        memberID: memberID || undefined,
        action,
        claim,
        code,
      };
    } catch {
      // fall through
    }
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.p && parsed?.m) {
      return { raw, programId: Number(parsed.p), memberID: String(parsed.m) };
    }
  } catch {
    // not JSON
  }
  return { raw };
}

type ScannerLifecycle = {
  stop: () => Promise<void>;
  getState: () => number;
};

export function CameraScanner({
  open,
  onClose,
  onScan,
  title = "Scan QR code",
  subtitle = "Point your camera at a member QR code",
}: {
  open: boolean;
  onClose: () => void;
  onScan: (result: ScanResult) => void;
  title?: string;
  subtitle?: string;
}) {
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<ScannerLifecycle | null>(null);
  const [error, setError] = useState("");

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (state === 2) {
        await scanner.stop();
      }
    } catch {
      // ignore cleanup errors
    }
    scannerRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    if (!readerRef.current) return;
    setError("");
    try {
      const mod = await import("html5-qrcode");
      const Html5Qrcode = mod.Html5Qrcode;
      const instance = new Html5Qrcode("camera-scanner-reader");
      scannerRef.current = instance as unknown as ScannerLifecycle;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          const result = parseDecoded(decodedText);
          await stopScanner();
          onScan(result);
          onClose();
        },
        () => {},
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Camera access denied or unavailable";
      setError(msg);
    }
  }, [onClose, onScan, stopScanner]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }
    const timer = setTimeout(startScanner, 250);
    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: "#000", backgroundImage: "none" } }}
    >
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          color: "#fff",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CameraAltIcon sx={{ fontSize: 20 }} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                {title}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12.5 }}>
                {subtitle}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="close"
            sx={{ color: "#fff" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            position: "relative",
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            id="camera-scanner-reader"
            ref={readerRef}
            sx={{
              width: "100%",
              height: "100%",
              "& video": {
                width: "100% !important",
                height: "100% !important",
                objectFit: "cover",
              },
            }}
          />

          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: { xs: 240, sm: 280 },
              height: { xs: 240, sm: 280 },
              pointerEvents: "none",
            }}
          >
            {["top-left", "top-right", "bottom-left", "bottom-right"].map(
              (corner) => {
                const [v, h] = corner.split("-");
                return (
                  <Box
                    key={corner}
                    sx={{
                      position: "absolute",
                      width: 32,
                      height: 32,
                      borderStyle: "solid",
                      borderColor: "var(--mui-palette-accent-main)",
                      borderWidth: 0,
                      [v === "top" ? "top" : "bottom"]: 0,
                      [h === "left" ? "left" : "right"]: 0,
                      [v === "top" ? "borderTopWidth" : "borderBottomWidth"]: 3,
                      [h === "left" ? "borderLeftWidth" : "borderRightWidth"]: 3,
                      borderRadius: 1,
                    }}
                  />
                );
              },
            )}
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 2,
                bgcolor: "var(--mui-palette-accent-main)",
                opacity: 0.75,
                borderRadius: 999,
                animation: "scan-move 2.2s ease-in-out infinite",
                "@keyframes scan-move": {
                  "0%": { top: "8%" },
                  "50%": { top: "92%" },
                  "100%": { top: "8%" },
                },
              }}
            />
          </Box>
        </Box>

        {error && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Alert severity="error">{error}</Alert>
            <Button
              onClick={() => startScanner()}
              sx={{ mt: 1 }}
              variant="outlined"
              color="inherit"
            >
              Try again
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
