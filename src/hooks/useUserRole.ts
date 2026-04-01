"use client";

import { useState, useEffect } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { useAccount } from "wagmi";
import { type Address, parseAbiItem } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI, ADMIN_ROLE, MemberRoleLabels, DEPLOYMENT_BLOCK } from "@/config/contracts";

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

const CHUNK_SIZE = BigInt(9999);
const MEMBER_CLAIMED_EVENT = parseAbiItem(
  "event MemberClaimed(uint32 indexed programId, address indexed memberKey, address indexed wallet)"
);

export function useMemberRole(programId: number) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Direct wallet lookup — works for members created with a wallet
  const { data: directMember, isLoading: isDirectLoading } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: address ? [programId, address] : undefined,
    query: { enabled: !!address && programId > 0 },
  });

  // Fallback: for walletless members who later claimed, data is stored at a virtual key.
  // Search MemberClaimed events (chunked, backwards from latest) to find the virtual key.
  const [claimedMember, setClaimedMember] = useState<typeof directMember | null>(null);

  useEffect(() => {
    if (!address || !publicClient || programId <= 0) return;
    // Wait for direct lookup to complete
    if (isDirectLoading) return;
    // Only do fallback if direct lookup returned no role
    if (directMember && Number(directMember.role) > 0) {
      setClaimedMember(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const minBlock = DEPLOYMENT_BLOCK;
        let toBlock = currentBlock;

        // Search backwards in chunks of 9999 blocks (Base RPC 10K limit)
        while (toBlock >= minBlock && !cancelled) {
          const fromBlock = toBlock - CHUNK_SIZE > minBlock ? toBlock - CHUNK_SIZE : minBlock;

          const logs = await publicClient.getLogs({
            address: CONTRACTS.rewardsProgram,
            event: MEMBER_CLAIMED_EVENT,
            args: {
              programId,
              wallet: address,
            },
            fromBlock,
            toBlock,
          });

          if (cancelled) return;

          if (logs.length > 0) {
            // Found claim event — use memberKey to look up actual member data
            const memberKey = logs[logs.length - 1].args.memberKey as Address;
            const member = await publicClient.readContract({
              address: CONTRACTS.rewardsProgram,
              abi: REWARDS_PROGRAM_ABI,
              functionName: "getMember",
              args: [programId, memberKey],
            });

            if (!cancelled && member && Number(member.role) > 0) {
              setClaimedMember(member);
            }
            return;
          }

          // Move to previous chunk
          if (fromBlock <= minBlock) break;
          toBlock = fromBlock - BigInt(1);
        }
      } catch {
        // Silently fail — direct lookup result will be used
      }
    })();

    return () => { cancelled = true; };
  }, [address, publicClient, programId, directMember, isDirectLoading]);

  const member = (directMember && Number(directMember.role) > 0) ? directMember : claimedMember ?? directMember;

  return {
    role: member ? Number(member.role) : 0,
    roleLabel: member ? MemberRoleLabels[Number(member.role)] || "Unknown" : "None",
    isActive: member?.active || false,
    member,
  };
}
