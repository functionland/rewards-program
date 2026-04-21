"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Box, Tooltip } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";

interface QRScanResult {
  programId: number;
  memberID: string;
  claim?: string;
  code?: string;
}

interface QRScannerButtonProps {
  onScan: (result: QRScanResult) => void;
  tooltip?: string;
}

// Accept (a) /redeem?member=X&claim=Y&code=Z (redeem QR with auth secret),
// (b) /tokens?program=X&member=CODE (receive/transfer QR),
// (c) /redeem?program=X&member=CODE&action=... (send-sub QR),
// (d) legacy JSON {p,m}. Older printed QRs keep working.
function parseQRCode(decoded: string): QRScanResult | null {
  const trimmed = decoded.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    try {
      const url = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      const member = url.searchParams.get("member");
      const claim = url.searchParams.get("claim");
      const code = url.searchParams.get("code");
      const program = Number(url.searchParams.get("program") || claim);
      if (program > 0 && member) {
        return {
          programId: program,
          memberID: member,
          ...(claim ? { claim } : {}),
          ...(code ? { code } : {}),
        };
      }
    } catch { /* fall through to JSON */ }
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.p && parsed?.m) return { programId: Number(parsed.p), memberID: String(parsed.m) };
  } catch { /* not JSON either */ }
  return null;
}

export function QRScannerButton({ onScan, tooltip = "Scan member QR code" }: QRScannerButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<any>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!readerRef.current) return;

    setError("");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const result = parseQRCode(decodedText);
          if (result) {
            onScan(result);
            stopScanner();
            setOpen(false);
          } else {
            setError("Invalid QR code format");
          }
        },
        () => {} // ignore scan failures (frames without QR)
      );
    } catch (err: any) {
      setError(err?.message || "Camera access denied or not available");
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    if (open) {
      // Small delay to let the dialog render the container
      const timer = setTimeout(startScanner, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton onClick={() => setOpen(true)} size="small" color="primary">
          <CameraAltIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Scan Member QR Code</DialogTitle>
        <DialogContent>
          <Box
            id="qr-reader"
            ref={readerRef}
            sx={{ width: "100%", minHeight: 300 }}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
