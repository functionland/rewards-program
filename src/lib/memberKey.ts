import { encodePacked, getAddress, keccak256 } from "viem";
import { toBytes12 } from "@/lib/utils";

export function virtualAddr(memberID: string, programId: number): `0x${string}` {
  const memberIDBytes = toBytes12(memberID);
  const hash = keccak256(
    encodePacked(["bytes12", "uint32"], [memberIDBytes, programId]),
  );
  return getAddress(`0x${hash.slice(-40)}`) as `0x${string}`;
}
