import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Box, Typography } from "@mui/material";

export const metadata: Metadata = {
  title: "Rewards Program Portal",
  description: "Manage reward programs, members, and token distributions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Navigation />
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
              <Header />
              <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                {children}
              </Box>
              <Box component="footer" sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
                  All data on this portal is stored on-chain and is publicly visible and verifiable. Do not enter personal or protected information. By using this portal, you acknowledge that all transactions and records are permanently recorded on the blockchain.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Providers>
      </body>
    </html>
  );
}
