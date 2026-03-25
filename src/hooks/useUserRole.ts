"use client";

import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { CONTRACTS, REWARDS_PROGRAM_ABI, ADMIN_ROLE, MemberRoleLabels } from "@/config/contracts";

export function useUserRole() {
  const { address } = useAccount();

  const { data: isAdmin } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "hasRole",
    args: address ? [ADMIN_ROLE as `0x${string}`, address] : undefined,
    query: { enabled: !!address },
  });

  return {
    isAdmin: !!isAdmin,
    isConnected: !!address,
  };
}

export function useMemberRole(programId: number) {
  const { address } = useAccount();

  const { data: member } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: address ? [programId, address] : undefined,
    query: { enabled: !!address && programId > 0 },
  });

  return {
    role: member ? Number(member.role) : 0,
    roleLabel: member ? MemberRoleLabels[Number(member.role)] || "Unknown" : "None",
    isActive: member?.active || false,
    member,
  };
}
