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

export type BackupRosterStatus = "active" | "practice_squad" | "pending_incoming" | "traded" | "released";

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
    }
  | {
      kind: "formation_slot";
      bookId: string;
      formationId: string;
      slotId: string;
      baselinePlayerId: string | null;
      planPlayerId: string | null;
    };

export interface BackupActionBatch {
  command: string;
  summary: Record<string, unknown>;
  beforeState: { changes: BackupChange[] };
  afterState: { changes: BackupChange[] };
  createdAt: string;
}

/** C3A book-scoped formation override rows (both layers); ids remapped on restore. */
export interface BackupFormationOverride {
  bookId: string;
  formationId: string;
  slotId: string;
  layer: "baseline" | "plan";
  playerId: string;
}

/** C3A favorite formations; app preference only, stable (book, formation) identity. */
export interface BackupFormationFavorite {
  bookId: string;
  formationId: string;
}

export interface BackupPickAsset {
  mutableId: string;
  year: number;
  round: number;
  originalTeam: string;
  currentOwner: string;
  note: string | null;
}

export interface BackupPlayerMove {
  direction: "incoming" | "outgoing" | "promotion";
  mutablePlayerId: string | null;
  /** Source player identity for an incoming catalog record, preserving immutability. */
  sourceReference?: { sourceId: string; revisionKey: string } | null;
}

export interface BackupPickMove {
  direction: "incoming" | "outgoing";
  mutablePickId: string;
}

export interface BackupTransactionProposal {
  mutableId: string;
  kind: "trade" | "sign" | "cut" | "promotion";
  counterparty: string;
  note: string | null;
  status: "proposed" | "completed" | "cancelled";
  createdAt: string;
  completedAt: string | null;
  playerMoves: BackupPlayerMove[];
  pickMoves: BackupPickMove[];
}

export interface BackupGmState {
  settings: { teamCap: number | null; availableCap: number | null; expiryThresholdYears: number | null } | null;
  picks: BackupPickAsset[];
  proposals: BackupTransactionProposal[];
}

export interface BackupScoutingState {
  preferences: { offensiveScheme: string | null; defensiveScheme: string | null; offensiveBookId: string; defensiveBookId: string };
  shortlist: { kind: "trade_block" | "trade_target"; identity: "franchise" | "source"; mutablePlayerId: string | null; sourceReference: { sourceId: string; revisionKey: string } | null; status: "pinned" | "dismissed"; note: string | null }[];
}

/** C5B app-owned Gameday plans and ordered favorites; displayed-menu history is intentionally ephemeral. */
export interface BackupGamedayState {
  plans: { themeId: string; customName: string | null; customNotes: string | null; pinnedPlayIds: string[]; pinnedFormationIds: string[] }[];
}

export interface BackupFranchisePayload {
  name: string;
  isDefault: boolean;
  pinnedRevisionKey: string | null;
  players: BackupPlayer[];
  fields: BackupField[];
  /** C2A depth-chart entries; both layers, so plans survive the round trip too. */
  depthChart: BackupChartEntry[];
  /** C3A formation overrides and favorites; absent in older envelopes = empty. */
  formationOverrides?: BackupFormationOverride[];
  formationFavorites?: BackupFormationFavorite[];
  /** C2B retained undo history; mutable player ids are remapped on restore (C0B-v2 §8). */
  history: BackupActionBatch[];
  /** C4A manual cap/pick ledger and proposal/completion records; absent means empty. */
  gmState?: BackupGmState;
  /** C4B preferences and shortlist; absent in older envelopes means defaults/empty. */
  scoutingState?: BackupScoutingState;
  /** C5B editable drive plans and favorites; displayed-menu session history is never backed up. */
  gamedayState?: BackupGamedayState;
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
        !["active", "practice_squad", "pending_incoming", "traded", "released"].includes(String(player.rosterStatus)))
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
        } else if (change.kind === "formation_slot") {
          if (
            typeof change.bookId !== "string" ||
            change.bookId.trim().length === 0 ||
            typeof change.formationId !== "string" ||
            change.formationId.trim().length === 0 ||
            typeof change.slotId !== "string" ||
            change.slotId.trim().length === 0 ||
            !(change.baselinePlayerId === null || typeof change.baselinePlayerId === "string") ||
            !(change.planPlayerId === null || typeof change.planPlayerId === "string")
          ) {
            reasons.push("schema_invalid");
            continue;
          }
          for (const id of [change.baselinePlayerId, change.planPlayerId]) {
            if (typeof id === "string" && !seen.has(id)) reasons.push("dangling_player_reference");
          }
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

  // C3A formation overrides and favorites: absent in older envelopes (treated as empty);
  // every referenced player must resolve to a player in the same file.
  const formationOverrides = franchise.formationOverrides === undefined ? [] : franchise.formationOverrides;
  if (!Array.isArray(formationOverrides)) {
    reasons.push("schema_invalid");
  } else {
    const slots = new Set<string>();
    for (const override of formationOverrides) {
      if (
        !isRecord(override) ||
        typeof override.bookId !== "string" ||
        override.bookId.trim().length === 0 ||
        typeof override.formationId !== "string" ||
        override.formationId.trim().length === 0 ||
        typeof override.slotId !== "string" ||
        override.slotId.trim().length === 0 ||
        (override.layer !== "baseline" && override.layer !== "plan") ||
        typeof override.playerId !== "string"
      ) {
        reasons.push("schema_invalid");
        continue;
      }
      if (!seen.has(override.playerId)) reasons.push("dangling_player_reference");
      const key = `${override.bookId}:${override.formationId}:${override.slotId}:${override.layer}`;
      if (slots.has(key)) reasons.push("schema_invalid");
      slots.add(key);
    }
  }
  const formationFavorites = franchise.formationFavorites === undefined ? [] : franchise.formationFavorites;
  if (!Array.isArray(formationFavorites)) {
    reasons.push("schema_invalid");
  } else {
    for (const favorite of formationFavorites) {
      if (
        !isRecord(favorite) ||
        typeof favorite.bookId !== "string" ||
        favorite.bookId.trim().length === 0 ||
        typeof favorite.formationId !== "string" ||
        favorite.formationId.trim().length === 0
      ) {
        reasons.push("schema_invalid");
      }
    }
  }

  const scoutingState = franchise.scoutingState === undefined ? null : franchise.scoutingState;
  if (scoutingState !== null) {
    if (!isRecord(scoutingState) || !isRecord(scoutingState.preferences) || !Array.isArray(scoutingState.shortlist)) {
      reasons.push("schema_invalid");
    } else {
      const prefs = scoutingState.preferences;
      if (!(prefs.offensiveScheme === null || typeof prefs.offensiveScheme === "string") ||
          !(prefs.defensiveScheme === null || typeof prefs.defensiveScheme === "string") ||
          typeof prefs.offensiveBookId !== "string" || typeof prefs.defensiveBookId !== "string") reasons.push("schema_invalid");
      const shortlistIds = new Set<string>();
      for (const item of scoutingState.shortlist) {
        if (!isRecord(item) || !["trade_block", "trade_target"].includes(String(item.kind)) ||
            !["franchise", "source"].includes(String(item.identity)) || !["pinned", "dismissed"].includes(String(item.status)) ||
            !(item.mutablePlayerId === null || typeof item.mutablePlayerId === "string") ||
            !(item.sourceReference === null || (isRecord(item.sourceReference) && typeof item.sourceReference.sourceId === "string" && typeof item.sourceReference.revisionKey === "string")) ||
            !(item.note === null || typeof item.note === "string") || (item.note !== null && typeof item.note === "string" && item.note.length > 1000)) {
          reasons.push("schema_invalid"); continue;
        }
        if (item.identity === "franchise" && (typeof item.mutablePlayerId !== "string" || !seen.has(item.mutablePlayerId))) reasons.push("dangling_player_reference");
        if (item.identity === "source" && (item.mutablePlayerId !== null || item.sourceReference === null)) reasons.push("schema_invalid");
        if (item.identity === "franchise" && item.sourceReference !== null) reasons.push("schema_invalid");
        const ref = isRecord(item.sourceReference) ? `${item.sourceReference.sourceId}:${item.sourceReference.revisionKey}` : "";
        const key = `${item.kind}:${item.identity}:${item.mutablePlayerId ?? ref}`;
        if (shortlistIds.has(key)) reasons.push("schema_invalid");
        shortlistIds.add(key);
      }
    }
  }

  const gamedayState = franchise.gamedayState === undefined ? null : franchise.gamedayState;
  if (gamedayState !== null) {
    if (!isRecord(gamedayState) || !Array.isArray(gamedayState.plans)) reasons.push("schema_invalid");
    else {
      const themes = new Set<string>();
      for (const plan of gamedayState.plans) {
        if (!isRecord(plan) || typeof plan.themeId !== "string" || !plan.themeId.trim() ||
            !(plan.customName === null || typeof plan.customName === "string") ||
            !(plan.customNotes === null || typeof plan.customNotes === "string") ||
            (typeof plan.customName === "string" && plan.customName.length > 80) ||
            (typeof plan.customNotes === "string" && plan.customNotes.length > 1000) ||
            !Array.isArray(plan.pinnedPlayIds) || !Array.isArray(plan.pinnedFormationIds)) {
          reasons.push("schema_invalid"); continue;
        }
        if (themes.has(plan.themeId)) reasons.push("schema_invalid");
        themes.add(plan.themeId);
        const ids = [...plan.pinnedPlayIds, ...plan.pinnedFormationIds];
        if (ids.some((id) => typeof id !== "string" || !id.trim() || id.length > 200) || new Set(ids).size !== ids.length) reasons.push("schema_invalid");
      }
    }
  }

  const gmState = franchise.gmState === undefined ? null : franchise.gmState;
  if (gmState !== null) {
    if (!isRecord(gmState) || !Array.isArray(gmState.picks) || !Array.isArray(gmState.proposals) ||
        !(gmState.settings === null || isRecord(gmState.settings))) {
      reasons.push("schema_invalid");
    } else {
      const pickIds = new Set<string>();
      const mutableAssetIds = new Set<string>();
      for (const pick of gmState.picks) {
        if (!isRecord(pick) || typeof pick.mutableId !== "string" || !Number.isInteger(pick.year) ||
            (pick.year as number) < 2000 || (pick.year as number) > 2200 || !Number.isInteger(pick.round) ||
            (pick.round as number) < 1 || (pick.round as number) > 7 || typeof pick.originalTeam !== "string" ||
            typeof pick.currentOwner !== "string" || !(pick.note === null || typeof pick.note === "string")) {
          reasons.push("schema_invalid"); continue;
        }
        if (mutableAssetIds.has(pick.mutableId)) reasons.push("duplicate_mutable_id");
        mutableAssetIds.add(pick.mutableId);
        pickIds.add(pick.mutableId);
      }
      for (const proposal of gmState.proposals) {
        if (!isRecord(proposal) || typeof proposal.mutableId !== "string" ||
            !["trade", "sign", "cut", "promotion"].includes(String(proposal.kind)) ||
            !["proposed", "completed", "cancelled"].includes(String(proposal.status)) ||
            typeof proposal.counterparty !== "string" || !Array.isArray(proposal.playerMoves) ||
            !Array.isArray(proposal.pickMoves) || typeof proposal.createdAt !== "string" ||
            !(proposal.completedAt === null || typeof proposal.completedAt === "string")) {
          reasons.push("schema_invalid"); continue;
        }
        if (mutableAssetIds.has(proposal.mutableId)) reasons.push("duplicate_mutable_id");
        mutableAssetIds.add(proposal.mutableId);
        for (const move of proposal.playerMoves) {
          if (!isRecord(move) || !["incoming", "outgoing", "promotion"].includes(String(move.direction)) ||
              !(move.mutablePlayerId === null || typeof move.mutablePlayerId === "string") ||
              (typeof move.mutablePlayerId === "string" && !seen.has(move.mutablePlayerId)) ||
              (move.sourceReference !== undefined && !(move.sourceReference === null ||
                (isRecord(move.sourceReference) && typeof move.sourceReference.sourceId === "string" &&
                 typeof move.sourceReference.revisionKey === "string")))) {
            reasons.push(typeof move === "object" && move !== null && "mutablePlayerId" in move &&
              typeof (move as Record<string, unknown>).mutablePlayerId === "string" ? "dangling_player_reference" : "schema_invalid");
          }
        }
        for (const move of proposal.pickMoves) {
          if (!isRecord(move) || !["incoming", "outgoing"].includes(String(move.direction)) ||
              typeof move.mutablePickId !== "string" || !pickIds.has(move.mutablePickId)) {
            reasons.push("schema_invalid");
          }
        }
      }
      if (gmState.settings !== null && isRecord(gmState.settings) &&
          [gmState.settings.teamCap, gmState.settings.availableCap].some((value) => value !== null &&
            (typeof value !== "number" || !Number.isFinite(value) || value < 0)) ||
          gmState.settings !== null && isRecord(gmState.settings) &&
          gmState.settings.expiryThresholdYears !== null &&
          (!Number.isInteger(gmState.settings.expiryThresholdYears) || Number(gmState.settings.expiryThresholdYears) < 0 || Number(gmState.settings.expiryThresholdYears) > 20)) {
        reasons.push("schema_invalid");
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
    formationOverrides: formationOverrides as BackupFormationOverride[],
    formationFavorites: formationFavorites as BackupFormationFavorite[],
    history: history as BackupActionBatch[],
    ...(gmState === null ? {} : { gmState: gmState as unknown as BackupGmState }),
    ...(scoutingState === null ? {} : { scoutingState: scoutingState as unknown as BackupScoutingState }),
    ...(gamedayState === null ? {} : { gamedayState: gamedayState as unknown as BackupGamedayState }),
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
    if (change.kind === "formation_slot") {
      return {
        ...change,
        baselinePlayerId: change.baselinePlayerId ? idMap.get(change.baselinePlayerId) ?? change.baselinePlayerId : null,
        planPlayerId: change.planPlayerId ? idMap.get(change.planPlayerId) ?? change.planPlayerId : null,
      };
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

  const formationOverrides = (envelope.franchise.formationOverrides ?? []).map((override) => ({
    ...override,
    playerId: idMap.get(override.playerId) as string,
  }));
  const formationFavorites = envelope.franchise.formationFavorites ?? [];
  const scoutingState = envelope.franchise.scoutingState ? {
    ...envelope.franchise.scoutingState,
    shortlist: envelope.franchise.scoutingState.shortlist.map((entry) => ({
      ...entry,
      mutablePlayerId: entry.mutablePlayerId ? idMap.get(entry.mutablePlayerId) ?? entry.mutablePlayerId : null,
    })),
  } : undefined;
  const gamedayState = envelope.franchise.gamedayState ? {
    plans: envelope.franchise.gamedayState.plans.map((plan) => ({ ...plan, pinnedPlayIds: [...plan.pinnedPlayIds], pinnedFormationIds: [...plan.pinnedFormationIds] })),
  } : undefined;
  const gmState = envelope.franchise.gmState ? {
    ...envelope.franchise.gmState,
    picks: envelope.franchise.gmState.picks.map((pick) => ({ ...pick, mutableId: `restored-pick-${pick.mutableId}` })),
    proposals: envelope.franchise.gmState.proposals.map((proposal) => ({
      ...proposal,
      mutableId: `restored-proposal-${proposal.mutableId}`,
      playerMoves: proposal.playerMoves.map((move) => ({
        ...move,
        mutablePlayerId: move.mutablePlayerId ? idMap.get(move.mutablePlayerId) ?? move.mutablePlayerId : null,
      })),
      pickMoves: proposal.pickMoves.map((move) => ({
        ...move,
        mutablePickId: `restored-pick-${move.mutablePickId}`,
      })),
    })),
  } : undefined;

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
      formationOverrides,
      formationFavorites,
      history,
      ...(gmState ? { gmState } : {}),
      ...(scoutingState ? { scoutingState } : {}),
      ...(gamedayState ? { gamedayState } : {}),
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
