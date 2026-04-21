"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import type { Membership } from "./useHighestMemberRole";

export type PerProgramBalance = {
  programId: number;
  available: bigint;
  permanentlyLocked: bigint;
  totalTimeLocked: bigint;
};

export function useAggregatedMemberBalance(memberships: Membership[]) {
  const contracts = useMemo(
    () =>
      memberships.map((m) => ({
        address: CONTRACTS.rewardsProgram,
        abi: REWARDS_PROGRAM_ABI,
        functionName: "getBalance" as const,
        args: [m.programId, m.balanceKey] as const,
      })),
    [memberships],
  );

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: memberships.length > 0 },
  });

  const perProgram = useMemo<PerProgramBalance[]>(() => {
    if (!data) return [];
    return data.map((res, idx) => {
      const programId = memberships[idx]?.programId ?? 0;
      if (res.status !== "success" || !res.result) {
        return {
          programId,
          available: BigInt(0),
          permanentlyLocked: BigInt(0),
          totalTimeLocked: BigInt(0),
        };
      }
      const [available, permanentlyLocked, totalTimeLocked] = res.result as [
        bigint,
        bigint,
        bigint,
      ];
      return { programId, available, permanentlyLocked, totalTimeLocked };
    });
  }, [data, memberships]);

  const totals = useMemo(() => {
    let available = BigInt(0);
    let locked = BigInt(0);
    let unlocking = BigInt(0);
    for (const p of perProgram) {
      available += p.available;
      locked += p.permanentlyLocked;
      unlocking += p.totalTimeLocked;
    }
    return {
      available,
      locked,
      unlocking,
      total: available + locked + unlocking,
    };
  }, [perProgram]);

  return {
    ...totals,
    perProgram,
    isLoading,
    refetch,
  };
}
