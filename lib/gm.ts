import type { FranchisePlayer, PlayerField } from "./data/franchises";

export type ProposalKind = "trade" | "sign" | "cut" | "promotion";
export type ProposalStatus = "proposed" | "completed" | "cancelled";
export type PlayerMoveDirection = "incoming" | "outgoing" | "promotion";
export type PickMoveDirection = "incoming" | "outgoing";

export interface PlayerMove {
  direction: PlayerMoveDirection;
  playerId?: string;
  sourceRecordId?: string;
}

export interface PickMove {
  direction: PickMoveDirection;
  pickId: string;
}

export interface DraftPickAsset {
  id: string;
  franchiseId: string;
  year: number;
  round: number;
  originalTeam: string;
  currentOwner: string;
  note: string | null;
  reserved: boolean;
}

export interface TransactionProposal {
  id: string;
  franchiseId: string;
  kind: ProposalKind;
  counterparty: string;
  note: string | null;
  status: ProposalStatus;
  createdAt: string;
  completedAt: string | null;
  playerMoves: { direction: PlayerMoveDirection; playerId: string | null; sourceRecordId: string | null; playerName: string }[];
  pickMoves: { direction: PickMoveDirection; pickId: string; year: number; round: number; originalTeam: string }[];
}

export interface ContractSettings {
  teamCap: number | null;
  availableCap: number | null;
  expiryThresholdYears: number | null;
}

export interface ContractCoverage {
  totalPlayers: number;
  reportedCount: number;
  unknownCount: number;
  recordedTotal: number;
  plannedCount: number;
  plannedTotal: number;
  complete: boolean;
}

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Summarize known contract facts without treating missing money as zero. */
export function contractCoverage(
  players: readonly FranchisePlayer[],
  fields: readonly PlayerField[],
): ContractCoverage {
  const values = new Map<string, { baseline: number | null; plan: number | null }>();
  for (const player of players) values.set(player.id, { baseline: null, plan: null });
  for (const field of fields) {
    if (field.fieldKey !== "contract_value") continue;
    const entry = values.get(field.franchisePlayerId);
    if (!entry) continue;
    entry.baseline = numeric(field.baselineValue);
    entry.plan = numeric(field.planValue);
  }
  let reportedCount = 0;
  let unknownCount = 0;
  let recordedTotal = 0;
  let plannedCount = 0;
  let plannedTotal = 0;
  for (const entry of values.values()) {
    if (entry.baseline === null) unknownCount += 1;
    else {
      reportedCount += 1;
      recordedTotal += entry.baseline;
    }
    const effectivePlan = entry.plan ?? entry.baseline;
    if (effectivePlan !== null) {
      plannedCount += 1;
      plannedTotal += effectivePlan;
    }
  }
  return {
    totalPlayers: players.length,
    reportedCount,
    unknownCount,
    recordedTotal,
    plannedCount,
    plannedTotal,
    complete: unknownCount === 0,
  };
}

export function contractYearsFor(playerId: string, fields: readonly PlayerField[]): number | null {
  const field = fields.find((row) => row.franchisePlayerId === playerId && row.fieldKey === "contract_years");
  return numeric(field?.planValue ?? field?.baselineValue);
}

export function contractValueFor(playerId: string, fields: readonly PlayerField[]): number | null {
  const field = fields.find((row) => row.franchisePlayerId === playerId && row.fieldKey === "contract_value");
  return numeric(field?.planValue ?? field?.baselineValue);
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
