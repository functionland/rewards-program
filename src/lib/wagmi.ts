import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { supportedChains } from "@/config/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Rewards Program Portal",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: supportedChains,
  ssr: false,
});
