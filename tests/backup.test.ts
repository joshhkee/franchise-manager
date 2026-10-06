import { describe, expect, it } from "vitest";
import {
  createEnvelope,
  ENVELOPE_VERSION,
  missingRevisionKeys,
  parseEnvelope,
  restoreAsNewFranchise,
  serializeEnvelope,
  type BackupFranchisePayload,
} from "../lib/backup";

function payload(overrides: Partial<BackupFranchisePayload> = {}): BackupFranchisePayload {
  return {
    name: "Atlanta Falcons",
    isDefault: true,
    pinnedRevisionKey: "1-base",
    players: [
      {
        mutableId: "player-1",
        origin: "source",
        customKey: null,
        sourceReference: { sourceId: "ea-1", revisionKey: "1-base" },
        fullName: "Bijan Robinson",
        rosterStatus: "active",
      },
      {
        mutableId: "player-2",
        origin: "custom",
        customKey: "c_abc123",
        sourceReference: null,
        fullName: "Custom Rookie",
        rosterStatus: "practice_squad",
      },
    ],
    fields: [
      {
        playerId: "player-2",
        fieldKey: "jersey_number",
        baselineValue: 0,
        planValue: null,
        fieldClass: "app_fact",
      },
      {
        playerId: "player-1",
        fieldKey: "listed_position",
        baselineValue: null,
        planValue: "HB",
        fieldClass: "game_edit_action",
      },
    ],
    depthChart: [
      { position: "HB", layer: "baseline", rank: 1, playerId: "player-1" },
      { position: "HB", layer: "plan", rank: 2, playerId: "player-1" },
    ],
    history: [],
    ...overrides,
  };
}

describe("backup envelope round trip", () => {
  it("restores into a new franchise with remapped mutable ids and preserved identity", () => {
    const parsed = parseEnvelope(serializeEnvelope(createEnvelope(payload())));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const restored = restoreAsNewFranchise(parsed.envelope, {
      newFranchiseId: "new-franchise",
      nextPlayerId: (index) => `restored-${index + 1}`,
    });

    expect(restored.franchiseId).toBe("new-franchise");
    expect(restored.payload.isDefault).toBe(false);
    expect(restored.payload.players.map((player) => player.mutableId)).toEqual([
      "restored-1",
      "restored-2",
    ]);
    expect(restored.payload.players[1].customKey).toBe("c_abc123");
    expect(restored.payload.players[0].sourceReference).toEqual({
      sourceId: "ea-1",
      revisionKey: "1-base",
    });
    expect(restored.payload.fields.map((field) => field.playerId)).toEqual([
      "restored-2",
      "restored-1",
    ]);
    expect(restored.payload.fields[0].baselineValue).toBe(0);
    expect(restored.payload.players[1].rosterStatus).toBe("practice_squad");
    expect(restored.payload.depthChart).toEqual([
      { position: "HB", layer: "baseline", rank: 1, playerId: "restored-1" },
      { position: "HB", layer: "plan", rank: 2, playerId: "restored-1" },
    ]);
    expect(restored.requiredRevisionKeys).toEqual(["1-base"]);
  });

  it("treats older C1B envelopes without chart or roster status as empty defaults", () => {
    const legacy = createEnvelope({
      ...payload(),
      players: payload().players.map((player) => {
        const withoutStatus = { ...player } as Record<string, unknown>;
        delete withoutStatus.rosterStatus;
        return withoutStatus;
      }) as unknown as BackupFranchisePayload["players"],
      depthChart: undefined as unknown as BackupFranchisePayload["depthChart"],
      history: undefined as unknown as BackupFranchisePayload["history"],
    });

    const parsed = parseEnvelope(JSON.stringify(legacy));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.envelope.franchise.depthChart).toEqual([]);
    expect(parsed.envelope.franchise.history).toEqual([]);
    expect(parsed.envelope.franchise.players.every((player) => player.rosterStatus === "active")).toBe(true);
  });

  it("round-trips retained undo history with remapped mutable ids", () => {
    const envelope = createEnvelope(
      payload({
        history: [
          {
            command: "confirm_checklist_units",
            summary: { label: "Confirmed checklist units", units: ["depth_chart_list:HB"] },
            beforeState: {
              changes: [
                {
                  kind: "depth_chart_list",
                  position: "HB",
                  baseline: ["player-2"],
                  plan: ["player-1", "player-2"],
                  verification: "provisional_published",
                },
              ],
            },
            afterState: {
              changes: [
                {
                  kind: "depth_chart_list",
                  position: "HB",
                  baseline: ["player-1", "player-2"],
                  plan: [],
                  verification: "owner_confirmed",
                },
                { kind: "roster_status", playerId: "player-2", rosterStatus: "active" },
              ],
            },
            createdAt: "2026-10-06T12:00:00.000Z",
          },
        ],
      }),
    );

    const parsed = parseEnvelope(serializeEnvelope(envelope));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const restored = restoreAsNewFranchise(parsed.envelope, {
      newFranchiseId: "new-franchise",
      nextPlayerId: (index) => `restored-${index + 1}`,
    });

    const batch = restored.payload.history[0];
    expect(batch.command).toBe("confirm_checklist_units");
    expect(batch.beforeState.changes).toEqual([
      { kind: "depth_chart_list", position: "HB", baseline: ["restored-2"], plan: ["restored-1", "restored-2"], verification: "provisional_published" },
    ]);
    expect(batch.afterState.changes).toEqual([
      { kind: "depth_chart_list", position: "HB", baseline: ["restored-1", "restored-2"], plan: [], verification: "owner_confirmed" },
      { kind: "roster_status", playerId: "restored-2", rosterStatus: "active" },
    ]);
  });

  it("reports a source revision that the target catalog is missing", () => {
    const parsed = parseEnvelope(serializeEnvelope(createEnvelope(payload())));
    if (!parsed.ok) throw new Error("fixture should parse");

    const restored = restoreAsNewFranchise(parsed.envelope, {
      newFranchiseId: "new-franchise",
      nextPlayerId: (index) => `restored-${index + 1}`,
    });

    expect(missingRevisionKeys(restored, ["1-base"])).toEqual([]);
    expect(missingRevisionKeys(restored, [])).toEqual(["1-base"]);
  });
});

describe("backup validation refuses unsafe input without partial state", () => {
  it("rejects an unsupported newer envelope instead of guessing", () => {
    const future = { ...createEnvelope(payload()), envelopeVersion: ENVELOPE_VERSION + 1 };
    expect(parseEnvelope(JSON.stringify(future))).toEqual({
      ok: false,
      reasons: ["envelope_version_unsupported"],
    });
  });

  it("rejects malformed json and wrong shapes", () => {
    expect(parseEnvelope("{")).toEqual({ ok: false, reasons: ["invalid_json"] });
    expect(parseEnvelope(JSON.stringify({ envelopeVersion: 1, franchise: { name: 5 } }))).toEqual({
      ok: false,
      reasons: ["schema_invalid"],
    });
  });

  it("rejects dangling references and duplicate mutable ids", () => {
    const dangling = createEnvelope({
      ...payload(),
      fields: [{ playerId: "missing", fieldKey: "notes", baselineValue: null, planValue: "x", fieldClass: "app_fact" }],
    });
    expect(parseEnvelope(JSON.stringify(dangling))).toEqual({
      ok: false,
      reasons: ["dangling_player_reference"],
    });

    const duplicated = createEnvelope({
      ...payload(),
      players: [payload().players[0], { ...payload().players[0] }, payload().players[1]],
    });
    expect(parseEnvelope(JSON.stringify(duplicated))).toEqual({
      ok: false,
      reasons: ["duplicate_mutable_id"],
    });
  });

  it("rejects duplicate chart slots and chart entries that point at unknown players", () => {
    const duplicated = createEnvelope({
      ...payload(),
      depthChart: [
        { position: "HB", layer: "baseline", rank: 1, playerId: "player-1" },
        { position: "HB", layer: "baseline", rank: 1, playerId: "player-2" },
      ],
    });
    expect(parseEnvelope(JSON.stringify(duplicated))).toEqual({
      ok: false,
      reasons: ["duplicate_chart_slot"],
    });

    const dangling = createEnvelope({
      ...payload(),
      depthChart: [{ position: "HB", layer: "plan", rank: 1, playerId: "missing" }],
    });
    expect(parseEnvelope(JSON.stringify(dangling))).toEqual({
      ok: false,
      reasons: ["dangling_player_reference"],
    });
  });

  it("refuses history that references a player outside the file", () => {
    const dangling = createEnvelope({
      ...payload(),
      history: [
        {
          command: "confirm_checklist_units",
          summary: {},
          beforeState: { changes: [{ kind: "roster_status", playerId: "missing", rosterStatus: "active" }] },
          afterState: { changes: [] },
          createdAt: "2026-10-06T12:00:00.000Z",
        },
      ],
    });
    expect(parseEnvelope(JSON.stringify(dangling))).toEqual({
      ok: false,
      reasons: ["dangling_player_reference"],
    });
  });

  it("refuses secret-like content so credentials can never ride along in an export", () => {
    const tainted = createEnvelope({
      ...payload(),
      players: payload().players.map((player, index) =>
        index === 1 ? { ...player, customKey: "sb_secret_abcdefghijklmnopqrstuvwxyz" } : player,
      ),
    });
    expect(parseEnvelope(JSON.stringify(tainted))).toEqual({
      ok: false,
      reasons: ["secret_like_content"],
    });
  });

  it("refuses an oversized envelope", () => {
    const huge = createEnvelope({
      ...payload(),
      players: [
        {
          ...payload().players[0],
          fullName: "x".repeat(6 * 1024 * 1024),
        },
      ],
    });
    expect(parseEnvelope(serializeEnvelope(huge))).toEqual({ ok: false, reasons: ["backup_too_large"] });
  });
});
