// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  allowOwner,
  asOwnerSession,
  asRole,
  createTestDb,
  OTHER_GITHUB_ID,
  OTHER_UID,
  OWNER_GITHUB_ID,
  OWNER_UID,
  registerOwner,
} from "./harness";

const REQUEST = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

let db: PGlite;
let franchiseId: string;
let otherFranchiseId: string;
let playerOne: string;
let playerTwo: string;
let playerThree: string;
let otherPlayer: string;

interface ChartRow {
  position: string;
  layer: string;
  depth_rank: number;
  franchise_player_id: string;
}

interface GeneratedPlan {
  position: string;
  playerIds: string[];
  baselineSeeded: boolean;
  noop: boolean;
}

interface GenerateResult {
  plans: GeneratedPlan[];
  wrote: boolean;
  revision: number | null;
}

async function revisionOf(id: string): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ revision: number }>(
    "select revision from app.franchises where id = $1",
    [id],
  );
  return result.rows[0].revision;
}

async function addPlayer(
  franchise: string,
  name: string,
  expectedRevision: number,
  requestNumber: number,
) {
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<{ id: string }>(
    "select * from public.add_custom_player($1, $2, $3, $4)",
    [franchise, name, expectedRevision, REQUEST(requestNumber)],
  );
  return result.rows[0].id;
}

async function generate(
  plans: unknown,
  expectedRevision: number,
  requestNumber: number,
  uid: string = OWNER_UID,
): Promise<GenerateResult> {
  await asRole(db, "authenticated", uid);
  const result = await db.query<{ generate_depth_chart: GenerateResult }>(
    "select public.generate_depth_chart($1, $2::jsonb, $3, $4)",
    [franchiseId, JSON.stringify(plans), expectedRevision, REQUEST(requestNumber)],
  );
  return result.rows[0].generate_depth_chart;
}

async function rowsFor(franchise: string, position: string, layer: string): Promise<ChartRow[]> {
  await asOwnerSession(db);
  const result = await db.query<ChartRow>(
    `select position, layer, depth_rank, franchise_player_id
       from app.depth_chart_entries
      where franchise_id = $1 and position = $2 and layer = $3
      order by depth_rank`,
    [franchise, position, layer],
  );
  return result.rows;
}

async function verificationOf(franchise: string, position: string): Promise<string | null> {
  await asOwnerSession(db);
  const result = await db.query<{ verification: string }>(
    "select verification from app.depth_chart_state where franchise_id = $1 and position = $2",
    [franchise, position],
  );
  return result.rows[0]?.verification ?? null;
}

async function setPlan(
  position: string,
  players: string[],
  expectedRevision: number,
  requestNumber: number,
) {
  await asRole(db, "authenticated", OWNER_UID);
  await db.query("select public.set_depth_chart_plan($1, $2, $3, $4, $5)", [
    franchiseId,
    position,
    players,
    expectedRevision,
    REQUEST(requestNumber),
  ]);
}

async function recordBaseline(
  position: string,
  players: string[],
  intent: string,
  expectedRevision: number,
  requestNumber: number,
) {
  await asRole(db, "authenticated", OWNER_UID);
  await db.query("select public.record_depth_chart_baseline($1, $2, $3, $4, $5, $6)", [
    franchiseId,
    position,
    players,
    intent,
    expectedRevision,
    REQUEST(requestNumber),
  ]);
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");

  await asRole(db, "authenticated", OWNER_UID);
  const first = await db.query<{ id: string }>("select * from public.create_franchise($1, $2)", [
    "Atlanta Falcons",
    REQUEST(1),
  ]);
  franchiseId = first.rows[0].id;

  const second = await db.query<{ id: string }>("select * from public.create_franchise($1, $2)", [
    "Second team",
    REQUEST(2),
  ]);
  otherFranchiseId = second.rows[0].id;

  let revision = await revisionOf(franchiseId);
  playerOne = await addPlayer(franchiseId, "Alpha Back", revision, 3);
  revision = await revisionOf(franchiseId);
  playerTwo = await addPlayer(franchiseId, "Bravo Back", revision, 4);
  revision = await revisionOf(franchiseId);
  playerThree = await addPlayer(franchiseId, "Charlie Back", revision, 5);

  otherPlayer = await addPlayer(otherFranchiseId, "Other Team Back", 0, 6);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("generate_depth_chart", () => {
  it("seeds provisional baselines for many positions in one revision bump", async () => {
    const revision = await revisionOf(franchiseId);
    const result = await generate(
      [
        { position: "QB", playerIds: [playerOne, playerTwo] },
        { position: "HB", playerIds: [playerTwo, playerThree] },
      ],
      revision,
      10,
    );

    expect(result.wrote).toBe(true);
    expect(result.revision).toBe(revision + 1);
    expect(result.plans.map((plan) => [plan.position, plan.baselineSeeded, plan.noop])).toEqual([
      ["QB", true, false],
      ["HB", true, false],
    ]);
    expect((await rowsFor(franchiseId, "QB", "baseline")).map((row) => row.franchise_player_id)).toEqual(
      [playerOne, playerTwo],
    );
    expect((await rowsFor(franchiseId, "HB", "baseline")).map((row) => row.franchise_player_id)).toEqual(
      [playerTwo, playerThree],
    );
    // A seeded baseline is unverified until the owner records reality.
    expect(await verificationOf(franchiseId, "QB")).toBe("provisional_published");
    // The requested list equals the fresh baseline, so no pending plan is stored.
    expect(await rowsFor(franchiseId, "QB", "plan")).toEqual([]);
  });

  it("treats a second identical run as a no-op and does not bump the revision", async () => {
    const revision = await revisionOf(franchiseId);
    const result = await generate(
      [
        { position: "QB", playerIds: [playerOne, playerTwo] },
        { position: "HB", playerIds: [playerTwo, playerThree] },
      ],
      revision,
      11,
    );

    expect(result.wrote).toBe(false);
    expect(result.revision).toBeNull();
    expect(result.plans.every((plan) => plan.noop && !plan.baselineSeeded)).toBe(true);
    expect(await revisionOf(franchiseId)).toBe(revision);
  });

  it("writes only changed positions and still bumps the revision exactly once", async () => {
    const revision = await revisionOf(franchiseId);
    const result = await generate(
      [
        { position: "QB", playerIds: [playerOne, playerTwo] },
        { position: "TE", playerIds: [playerThree] },
      ],
      revision,
      12,
    );

    expect(result.wrote).toBe(true);
    expect(result.revision).toBe(revision + 1);
    expect(result.plans.map((plan) => [plan.position, plan.noop, plan.baselineSeeded])).toEqual([
      ["QB", true, false],
      ["TE", false, true],
    ]);
    expect((await rowsFor(franchiseId, "TE", "baseline")).map((row) => row.franchise_player_id)).toEqual(
      [playerThree],
    );
  });

  it("never downgrades an owner-confirmed baseline: it stores a differing plan only", async () => {
    let revision = await revisionOf(franchiseId);
    await recordBaseline("WR", [playerOne], "recorded", revision, 13);
    expect(await verificationOf(franchiseId, "WR")).toBe("owner_confirmed");

    revision = await revisionOf(franchiseId);
    const result = await generate([{ position: "WR", playerIds: [playerTwo] }], revision, 14);

    expect(result.plans[0].baselineSeeded).toBe(false);
    expect(result.plans[0].noop).toBe(false);
    // The stored reality stays untouched and keeps its owner_confirmed label.
    expect((await rowsFor(franchiseId, "WR", "baseline")).map((row) => row.franchise_player_id)).toEqual([
      playerOne,
    ]);
    expect(await verificationOf(franchiseId, "WR")).toBe("owner_confirmed");
    // The difference is a plan, not a rewritten baseline.
    expect((await rowsFor(franchiseId, "WR", "plan")).map((row) => row.franchise_player_id)).toEqual([
      playerTwo,
    ]);
  });

  it("consolidates away a plan that ends up equal to the recorded baseline", async () => {
    let revision = await revisionOf(franchiseId);
    await recordBaseline("CB", [playerOne, playerTwo], "provisional", revision, 15);
    revision = await revisionOf(franchiseId);
    await setPlan("CB", [playerThree], revision, 16);
    expect(await rowsFor(franchiseId, "CB", "plan")).toHaveLength(1);

    revision = await revisionOf(franchiseId);
    const result = await generate([{ position: "CB", playerIds: [playerOne, playerTwo] }], revision, 17);

    expect(result.wrote).toBe(true);
    expect(result.plans[0].noop).toBe(false);
    expect(result.plans[0].baselineSeeded).toBe(false);
    expect(await rowsFor(franchiseId, "CB", "plan")).toEqual([]);
    expect((await rowsFor(franchiseId, "CB", "baseline")).map((row) => row.franchise_player_id)).toEqual([
      playerOne,
      playerTwo,
    ]);
  });

  it("refuses a stale revision and leaves every requested position untouched", async () => {
    const current = await revisionOf(franchiseId);
    await expect(
      generate([{ position: "FS", playerIds: [playerOne] }], current - 1, 18),
    ).rejects.toThrow(/stale_revision/);

    expect(await revisionOf(franchiseId)).toBe(current);
    expect(await rowsFor(franchiseId, "FS", "baseline")).toEqual([]);
    expect(await rowsFor(franchiseId, "FS", "plan")).toEqual([]);
    expect(await verificationOf(franchiseId, "FS")).toBeNull();
  });

  it("validates the whole batch before writing: one bad position writes nothing", async () => {
    const revision = await revisionOf(franchiseId);
    await expect(
      generate(
        [
          { position: "K", playerIds: [playerOne] },
          { position: "P", playerIds: [otherPlayer] },
        ],
        revision,
        19,
      ),
    ).rejects.toThrow(/cross_franchise_reference/);

    expect(await revisionOf(franchiseId)).toBe(revision);
    expect(await rowsFor(franchiseId, "K", "baseline")).toEqual([]);
    expect(await rowsFor(franchiseId, "P", "baseline")).toEqual([]);
  });

  it("replays a retried request id instead of applying it twice", async () => {
    const revision = await revisionOf(franchiseId);
    const first = await generate([{ position: "SS", playerIds: [playerOne] }], revision, 20);
    const afterFirst = await revisionOf(franchiseId);

    const replay = await generate([{ position: "SS", playerIds: [playerTwo] }], revision, 20);
    expect(replay.plans).toEqual(first.plans);
    expect(replay.revision).toBe(first.revision);
    expect(await revisionOf(franchiseId)).toBe(afterFirst);
    expect((await rowsFor(franchiseId, "SS", "baseline")).map((row) => row.franchise_player_id)).toEqual([
      playerOne,
    ]);
  });

  it("rejects invalid batches without writing anything", async () => {
    const revision = await revisionOf(franchiseId);
    const tooMany = Array.from({ length: 41 }, (_, index) => ({
      position: `X${index}`,
      playerIds: [playerOne],
    }));

    const invalid: [string, unknown][] = [
      ["no positions", []],
      ["more than 40 positions", tooMany],
      ["an object instead of an array", { position: "QB", playerIds: [playerOne] }],
      ["a non-object entry", [1]],
      ["a duplicate position", [{ position: "LG", playerIds: [playerOne] }, { position: "LG", playerIds: [playerTwo] }]],
      ["a missing position", [{ position: "  ", playerIds: [playerOne] }]],
      ["an overlong position", [{ position: "ABCDEFGHIJKLM", playerIds: [playerOne] }]],
      ["a non-array player list", [{ position: "RG", playerIds: playerOne }]],
      ["a non-string player id", [{ position: "RT", playerIds: [1] }]],
      ["an empty player list", [{ position: "C", playerIds: [] }]],
      ["a duplicated player", [{ position: "LT", playerIds: [playerOne, playerOne] }]],
    ];

    for (const [, plans] of invalid) {
      await expect(generate(plans, revision, 21)).rejects.toThrow(/validation_failed/);
    }

    expect(await revisionOf(franchiseId)).toBe(revision);
    for (const position of ["LG", "RG", "RT", "C", "LT"]) {
      expect(await rowsFor(franchiseId, position, "baseline")).toEqual([]);
    }
  });

  it("refuses anonymous callers and other owners", async () => {
    const revision = await revisionOf(franchiseId);

    await asRole(db, "anon");
    await expect(
      db.query("select public.generate_depth_chart($1, $2::jsonb, $3, $4)", [
        franchiseId,
        JSON.stringify([{ position: "MIKE", playerIds: [playerOne] }]),
        revision,
        REQUEST(22),
      ]),
    ).rejects.toThrow(/permission denied|42501/);

    await expect(
      generate([{ position: "MIKE", playerIds: [playerOne] }], revision, 23, OTHER_UID),
    ).rejects.toThrow(/cross_franchise_reference/);

    expect(await rowsFor(franchiseId, "MIKE", "baseline")).toEqual([]);
    expect(await revisionOf(franchiseId)).toBe(revision);
  });
});
