import { base, baseSepolia, hardhat } from "wagmi/chains";

export const supportedChains = [base, baseSepolia, hardhat] as const;

export const defaultChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN === "baseSepolia"
  ? baseSepolia
  : process.env.NEXT_PUBLIC_DEFAULT_CHAIN === "hardhat"
    ? hardhat
    : base;
