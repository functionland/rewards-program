"use client";

import { useMemo, useState, useEffect } from "react";
import { useAccount, useReadContracts, usePublicClient } from "wagmi";
import { type Address, parseAbiItem, zeroAddress } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI, DEPLOYMENT_BLOCK } from "@/config/contracts";
import { useProgramCount } from "./useRewardsProgram";
import { virtualAddr } from "@/lib/memberKey";

export type Membership = {
  programId: number;
  memberID: string;
  role: number;
  memberType: number;
  wallet: Address;
  parent: Address;
  active: boolean;
  balanceKey: Address;
};

const CHUNK_SIZE = BigInt(9999);
const MEMBER_CLAIMED_EVENT = parseAbiItem(
  "event MemberClaimed(uint32 indexed programId, address indexed memberKey, address indexed wallet)"
);

function bytes12ToText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (byte === 0) break;
    out += String.fromCharCode(byte);
  }
  return out;
}

export function useHighestMemberRole() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: programCount } = useProgramCount();

  const count = programCount ? Number(programCount) : 0;
  const programIds = useMemo(
    () => Array.from({ length: count }, (_, i) => i + 1),
    [count],
  );

  const contracts = useMemo(() => {
    if (!address || count === 0) return [];
    return programIds.map((programId) => ({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "getMember" as const,
      args: [programId, address] as const,
    }));
  }, [address, programIds, count]);

  const { data: results, isLoading: directLoading } = useReadContracts({
    contracts,
    query: { enabled: !!address && count > 0 },
  });

  const directMemberships = useMemo<Membership[]>(() => {
    if (!results || !address) return [];
    const out: Membership[] = [];
    results.forEach((res, idx) => {
      if (res.status !== "success" || !res.result) return;
      const member = res.result as {
        wallet: Address;
        memberID: string;
        role: number;
        memberType: number;
        programId: number;
        parent: Address;
        active: boolean;
      };
      const role = Number(member.role);
      if (role === 0) return;
      const programId = programIds[idx];
      const memberID = bytes12ToText(member.memberID);
      const balanceKey =
        member.wallet !== zeroAddress
          ? member.wallet
          : virtualAddr(memberID, programId);
      out.push({
        programId,
        memberID,
        role,
        memberType: Number(member.memberType),
        wallet: member.wallet,
        parent: member.parent,
        active: member.active,
        balanceKey,
      });
    });
    return out;
  }, [results, address, programIds]);

  // Fallback: scan MemberClaimed events for walletless members who claimed later.
  // Only fires if direct lookup found zero memberships and we have a public client.
  const [claimedMemberships, setClaimedMemberships] = useState<Membership[]>([]);
  const [claimedLoading, setClaimedLoading] = useState(false);

  useEffect(() => {
    if (!address || !publicClient || count === 0) return;
    if (directLoading) return;
    if (directMemberships.length > 0) {
      setClaimedMemberships([]);
      return;
    }

    let cancelled = false;
    setClaimedLoading(true);

    (async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const minBlock = DEPLOYMENT_BLOCK;
        const memberKeysByProgram = new Map<number, Address>();
        let toBlock = currentBlock;

        while (toBlock >= minBlock && !cancelled) {
          const fromBlock =
            toBlock - CHUNK_SIZE > minBlock ? toBlock - CHUNK_SIZE : minBlock;

          const logs = await publicClient.getLogs({
            address: CONTRACTS.rewardsProgram,
            event: MEMBER_CLAIMED_EVENT,
            args: { wallet: address },
            fromBlock,
            toBlock,
          });

          if (cancelled) return;

          for (const log of logs) {
            const pid = Number(log.args.programId);
            const memberKey = log.args.memberKey as Address;
            if (!memberKeysByProgram.has(pid)) {
              memberKeysByProgram.set(pid, memberKey);
            }
          }

          if (fromBlock <= minBlock) break;
          toBlock = fromBlock - BigInt(1);
        }

        if (cancelled || memberKeysByProgram.size === 0) {
          setClaimedMemberships([]);
          setClaimedLoading(false);
          return;
        }

        const found: Membership[] = [];
        for (const [programId, memberKey] of memberKeysByProgram.entries()) {
          try {
            const member = await publicClient.readContract({
              address: CONTRACTS.rewardsProgram,
              abi: REWARDS_PROGRAM_ABI,
              functionName: "getMember",
              args: [programId, memberKey],
            });
            if (cancelled) return;
            const role = Number(member.role);
            if (role === 0) continue;
            const memberID = bytes12ToText(member.memberID);
            const balanceKey =
              member.wallet !== zeroAddress
                ? (member.wallet as Address)
                : virtualAddr(memberID, programId);
            found.push({
              programId,
              memberID,
              role,
              memberType: Number(member.memberType),
              wallet: member.wallet as Address,
              parent: member.parent as Address,
              active: member.active,
              balanceKey,
            });
          } catch {
            // ignore a single program failure
          }
        }

        if (!cancelled) {
          setClaimedMemberships(found);
          setClaimedLoading(false);
        }
      } catch {
        if (!cancelled) {
          setClaimedMemberships([]);
          setClaimedLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, publicClient, count, directLoading, directMemberships.length]);

  const memberships =
    directMemberships.length > 0 ? directMemberships : claimedMemberships;

  const highestRole = memberships.reduce(
    (max, m) => (m.role > max ? m.role : max),
    0,
  );

  const primary = memberships
    .slice()
    .sort((a, b) => (b.role - a.role) || (a.programId - b.programId))[0];

  return {
    highestRole,
    memberships,
    primaryProgramId: primary?.programId ?? null,
    primaryMembership: primary ?? null,
    isLoading: directLoading || claimedLoading,
  };
}
