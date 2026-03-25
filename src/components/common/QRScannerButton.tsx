"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Box, Tooltip } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";

interface QRScanResult {
  programId: number;
  memberID: string;
}

interface QRScannerButtonProps {
  onScan: (result: QRScanResult) => void;
  tooltip?: string;
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
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.p && parsed.m) {
              onScan({ programId: parsed.p, memberID: parsed.m });
              stopScanner();
              setOpen(false);
            } else {
              setError("Invalid QR code format");
            }
          } catch {
            setError("Could not parse QR code data");
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
