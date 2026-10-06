/**
 * Versioned backup envelope (C0B-v2 §8).
 *
 * Guarantees implemented here, all before anything is written:
 * - an exported envelope contains only app state — never credentials or session data;
 * - a newer/unsupported envelope fails safely with an explanation instead of being half-read;
 * - validation covers size, schema, duplicate ids, dangling references, and secret-like content,
 *   so a malicious or corrupt file can never leave a partial franchise;
 * - restore defaults to a NEW franchise: mutable ids are remapped, custom-player identity is
 *   preserved, and source references are kept by revision key rather than by database id.
 */

export const ENVELOPE_VERSION = 1;
export const APP_CONTRACT_VERSION = "c2b/1";
export const MAX_ENVELOPE_BYTES = 5 * 1024 * 1024;

export type FieldClass = "game_edit_action" | "app_fact";

export type BackupRosterStatus = "active" | "practice_squad";

export interface BackupPlayer {
  mutableId: string;
  origin: "source" | "custom";
  /** App-generated identity for custom players; must survive a restore. */
  customKey: string | null;
  /** Source identity preserved by revision key, never by database id. */
  sourceReference: { sourceId: string; revisionKey: string } | null;
  fullName: string;
  /** C2A: recorded roster availability; missing in older envelopes means active. */
  rosterStatus: BackupRosterStatus;
}

export interface BackupChartEntry {
  position: string;
  layer: "baseline" | "plan";
  rank: number;
  playerId: string;
}

export interface BackupField {
  playerId: string;
  fieldKey: string;
  baselineValue: unknown;
  planValue: unknown;
  fieldClass: FieldClass;
}

/** Minimal before/after delta stored in a retained undo batch (C0B-v2 §4). */
export type BackupChange =
  | { kind: "roster_status"; playerId: string; rosterStatus: BackupRosterStatus }
  | {
      kind: "depth_chart_list";
      position: string;
      baseline: string[];
      plan: string[];
      verification?: "provisional_published" | "owner_confirmed";
    };

export interface BackupActionBatch {
  command: string;
  summary: Record<string, unknown>;
  beforeState: { changes: BackupChange[] };
  afterState: { changes: BackupChange[] };
  createdAt: string;
}

export interface BackupFranchisePayload {
  name: string;
  isDefault: boolean;
  pinnedRevisionKey: string | null;
  players: BackupPlayer[];
  fields: BackupField[];
  /** C2A depth-chart entries; both layers, so plans survive the round trip too. */
  depthChart: BackupChartEntry[];
  /** C2B retained undo history; mutable player ids are remapped on restore (C0B-v2 §8). */
  history: BackupActionBatch[];
}

export interface BackupEnvelope {
  envelopeVersion: number;
  appContractVersion: string;
  exportedAt: string;
  franchise: BackupFranchisePayload;
}

export type ValidationResult =
  | { ok: true; envelope: BackupEnvelope }
  | { ok: false; reasons: ValidationReason[] };

export type ValidationReason =
  | "invalid_json"
  | "envelope_version_unsupported"
  | "backup_too_large"
  | "schema_invalid"
  | "duplicate_mutable_id"
  | "dangling_player_reference"
  | "duplicate_chart_slot"
  | "secret_like_content";

export function createEnvelope(
  franchise: BackupFranchisePayload,
  exportedAt: string = new Date().toISOString(),
): BackupEnvelope {
  return {
    envelopeVersion: ENVELOPE_VERSION,
    appContractVersion: APP_CONTRACT_VERSION,
    exportedAt,
    franchise,
  };
}

export function serializeEnvelope(envelope: BackupEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

const SECRET_LIKE = /(sb_secret_|sb_publishable_|service_role|anon_key|eyJ[A-Za-z0-9_-]{20,}|password|client_secret)/i;

function collectSecretLike(value: unknown, path: string, hits: string[]): void {
  if (typeof value === "string") {
    if (SECRET_LIKE.test(value)) hits.push(path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSecretLike(item, `${path}[${index}]`, hits));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_LIKE.test(key)) hits.push(`${path}.${key}`);
      collectSecretLike(item, `${path}.${key}`, hits);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFieldClass(value: unknown): value is FieldClass {
  return value === "game_edit_action" || value === "app_fact";
}

/**
 * Validate an envelope without touching any stored state. Callers must treat a
 * failure as "restore nothing".
 */
export function parseEnvelope(text: string): ValidationResult {
  const reasons: ValidationReason[] = [];

  if (new TextEncoder().encode(text).length > MAX_ENVELOPE_BYTES) {
    return { ok: false, reasons: ["backup_too_large"] };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reasons: ["invalid_json"] };
  }

  if (!isRecord(raw)) return { ok: false, reasons: ["schema_invalid"] };

  const version = raw.envelopeVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, reasons: ["schema_invalid"] };
  }
  if (version > ENVELOPE_VERSION) {
    return { ok: false, reasons: ["envelope_version_unsupported"] };
  }

  const secretHits: string[] = [];
  collectSecretLike(raw, "envelope", secretHits);
  if (secretHits.length > 0) reasons.push("secret_like_content");

  const franchise = raw.franchise;
  if (!isRecord(franchise) || typeof franchise.name !== "string" || !Array.isArray(franchise.players) || !Array.isArray(franchise.fields)) {
    return { ok: false, reasons: [...new Set([...reasons, "schema_invalid" as const])] };
  }

  const seen = new Set<string>();
  for (const player of franchise.players) {
    if (
      !isRecord(player) ||
      typeof player.mutableId !== "string" ||
      (player.origin !== "source" && player.origin !== "custom") ||
      typeof player.fullName !== "string" ||
      !(player.customKey === null || typeof player.customKey === "string") ||
      !(player.sourceReference === null || isRecord(player.sourceReference)) ||
      (player.rosterStatus !== undefined &&
        player.rosterStatus !== "active" &&
        player.rosterStatus !== "practice_squad")
    ) {
      reasons.push("schema_invalid");
      continue;
    }
    if (seen.has(player.mutableId)) reasons.push("duplicate_mutable_id");
    seen.add(player.mutableId);
  }

  for (const field of franchise.fields) {
    if (
      !isRecord(field) ||
      typeof field.playerId !== "string" ||
      typeof field.fieldKey !== "string" ||
      !isFieldClass(field.fieldClass)
    ) {
      reasons.push("schema_invalid");
      continue;
    }
    if (!seen.has(field.playerId)) reasons.push("dangling_player_reference");
  }

  if (typeof franchise.pinnedRevisionKey !== "string" && franchise.pinnedRevisionKey !== null) {
    reasons.push("schema_invalid");
  }

  // C2A chart entries: absent in older C1B envelopes (treated as empty), and the
  // same structural bounds the database enforces when they are present.
  const depthChart = franchise.depthChart === undefined ? [] : franchise.depthChart;
  if (!Array.isArray(depthChart)) {
    reasons.push("schema_invalid");
  } else {
    const slots = new Set<string>();
    for (const entry of depthChart) {
      if (
        !isRecord(entry) ||
        typeof entry.position !== "string" ||
        entry.position.trim().length === 0 ||
        entry.position.trim().length > 12 ||
        (entry.layer !== "baseline" && entry.layer !== "plan") ||
        !Number.isInteger(entry.rank) ||
        (entry.rank as number) < 1 ||
        (entry.rank as number) > 12 ||
        typeof entry.playerId !== "string"
      ) {
        reasons.push("schema_invalid");
        continue;
      }
      if (!seen.has(entry.playerId)) reasons.push("dangling_player_reference");
      const position = entry.position.trim();
      if (
        slots.has(`${position}:${entry.layer}:${entry.rank}`) ||
        slots.has(`${position}:${entry.layer}:${entry.playerId}`)
      ) {
        reasons.push("duplicate_chart_slot");
      }
      slots.add(`${position}:${entry.layer}:${entry.rank}`);
      slots.add(`${position}:${entry.layer}:${entry.playerId}`);
    }
  }

  // C2B retained undo history: absent in older envelopes (treated as empty), and every
  // referenced player must still resolve to a player in the same file.
  const history = franchise.history === undefined ? [] : franchise.history;
  if (!Array.isArray(history)) {
    reasons.push("schema_invalid");
  } else {
    for (const batch of history) {
      if (
        !isRecord(batch) ||
        typeof batch.command !== "string" ||
        !isRecord(batch.beforeState) ||
        !isRecord(batch.afterState) ||
        typeof batch.createdAt !== "string"
      ) {
        reasons.push("schema_invalid");
        continue;
      }
      const changes = [
        ...(Array.isArray(batch.beforeState.changes) ? batch.beforeState.changes : []),
        ...(Array.isArray(batch.afterState.changes) ? batch.afterState.changes : []),
      ];
      for (const change of changes) {
        if (!isRecord(change)) {
          reasons.push("schema_invalid");
          continue;
        }
        if (change.kind === "roster_status") {
          if (typeof change.playerId !== "string") reasons.push("schema_invalid");
          else if (!seen.has(change.playerId)) reasons.push("dangling_player_reference");
        } else if (change.kind === "depth_chart_list") {
          if (typeof change.position !== "string") {
            reasons.push("schema_invalid");
            continue;
          }
          const ids = [
            ...(Array.isArray(change.baseline) ? change.baseline : []),
            ...(Array.isArray(change.plan) ? change.plan : []),
          ];
          for (const id of ids) {
            if (typeof id !== "string" || !seen.has(id)) reasons.push("dangling_player_reference");
          }
        } else {
          reasons.push("schema_invalid");
        }
      }
    }
  }

  const unique = [...new Set(reasons)];
  if (unique.length > 0) return { ok: false, reasons: unique };

  const normalized: BackupFranchisePayload = {
    ...(franchise as unknown as BackupFranchisePayload),
    players: (franchise.players as Record<string, unknown>[]).map((player) => ({
      ...(player as unknown as BackupPlayer),
      rosterStatus: (player.rosterStatus as BackupRosterStatus | undefined) ?? "active",
    })),
    depthChart: depthChart as BackupChartEntry[],
    history: history as BackupActionBatch[],
  };

  return {
    ok: true,
    envelope: { ...(raw as Record<string, unknown>), franchise: normalized } as unknown as BackupEnvelope,
  };
}

export interface RestoreResult {
  franchiseId: string;
  payload: BackupFranchisePayload;
  /** Source revisions the restored franchise needs before it can pin anything. */
  requiredRevisionKeys: string[];
}

/**
 * Build the new-franchise payload. Ids are remapped; custom keys and source
 * references are preserved so identity survives the round trip.
 */
export function restoreAsNewFranchise(
  envelope: BackupEnvelope,
  options: { newFranchiseId: string; nextPlayerId: (index: number) => string },
): RestoreResult {
  const idMap = new Map<string, string>();
  const players = envelope.franchise.players.map((player, index) => {
    const newId = options.nextPlayerId(index);
    idMap.set(player.mutableId, newId);
    return { ...player, mutableId: newId };
  });

  const fields = envelope.franchise.fields.map((field) => ({
    ...field,
    playerId: idMap.get(field.playerId) as string,
  }));

  const depthChart = (envelope.franchise.depthChart ?? []).map((entry) => ({
    ...entry,
    playerId: idMap.get(entry.playerId) as string,
  }));

  const remapChange = (change: BackupChange): BackupChange => {
    if (change.kind === "roster_status") {
      return { ...change, playerId: idMap.get(change.playerId) ?? change.playerId };
    }
    return {
      ...change,
      baseline: change.baseline.map((id) => idMap.get(id) ?? id),
      plan: change.plan.map((id) => idMap.get(id) ?? id),
    };
  };

  const history = (envelope.franchise.history ?? []).map((batch) => ({
    ...batch,
    beforeState: { changes: batch.beforeState.changes.map(remapChange) },
    afterState: { changes: batch.afterState.changes.map(remapChange) },
  }));

  const requiredRevisionKeys = [
    ...new Set(
      [
        envelope.franchise.pinnedRevisionKey,
        ...envelope.franchise.players.map((player) => player.sourceReference?.revisionKey ?? null),
      ].filter((key): key is string => typeof key === "string" && key.length > 0),
    ),
  ];

  return {
    franchiseId: options.newFranchiseId,
    payload: {
      name: envelope.franchise.name,
      isDefault: false,
      pinnedRevisionKey: envelope.franchise.pinnedRevisionKey,
      players,
      fields,
      depthChart,
      history,
    },
    requiredRevisionKeys,
  };
}

/** True when every revision this envelope needs is present in the target catalog. */
export function missingRevisionKeys(
  result: RestoreResult,
  availableRevisionKeys: readonly string[],
): string[] {
  const available = new Set(availableRevisionKeys);
  return result.requiredRevisionKeys.filter((key) => !available.has(key));
}
