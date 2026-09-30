import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/* -------------------------------------------------------------------------- */
/* League and rosters                                                         */
/* -------------------------------------------------------------------------- */

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  abbr: text('abbr').notNull(),
  conference: text('conference'),
  division: text('division'),
  isUserTeam: boolean('is_user_team').notNull().default(false),
  source: text('source').notNull().default('seed'),
});

export const players = pgTable('players', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  position: text('position').notNull(),
  jersey: integer('jersey'),
  teamId: text('team_id'),
  overall: integer('overall').notNull(),
  age: integer('age'),
  heightInches: integer('height_inches'),
  college: text('college'),
  ratings: jsonb('ratings').$type<Record<string, number | string>>().notNull().default({}),
  salary: integer('salary'),
  /** Where this record came from: `ea-ratings`, `save`, `manual`, `seed`. */
  source: text('source').notNull().default('seed'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Franchise-only facts, kept apart from `players` so refreshing ratings from EA
 * never clobbers your contracts, dev traits or injury notes.
 */
export const franchisePlayers = pgTable('franchise_players', {
  playerId: text('player_id').primaryKey(),
  teamId: text('team_id'),
  contractYears: integer('contract_years'),
  capHit: integer('cap_hit'),
  devTrait: text('dev_trait'),
  injuryStatus: text('injury_status').notNull().default('healthy'),
  injuryWeeks: integer('injury_weeks'),
  rosterStatus: text('roster_status').notNull().default('active'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const leagues = pgTable('leagues', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  season: integer('season').notNull().default(2026),
  week: integer('week').notNull().default(1),
  userTeamId: text('user_team_id').notNull(),
  capTotal: integer('cap_total').notNull().default(279_000_000),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Depth chart vocabulary and the two layers of state                          */
/* -------------------------------------------------------------------------- */

export const depthSlots = pgTable('depth_slots', {
  code: text('code').primaryKey(),
  label: text('label').notNull(),
  side: text('side').notNull(),
  groupName: text('group_name').notNull(),
  eligiblePositions: jsonb('eligible_positions').$type<string[]>().notNull().default([]),
  displayOrder: integer('display_order').notNull().default(0),
  ranks: integer('ranks').notNull().default(3),
  situational: boolean('situational').notNull().default(false),
  description: text('description').notNull().default(''),
  /** Confirmed against a real depth chart screen? Seeded entries start false. */
  verified: boolean('verified').notNull().default(false),
});

/**
 * `layer` is either `game` (what Madden currently has) or `plan` (what you want).
 * Keeping both is what makes the apply checklist possible.
 */
export const depthChartEntries = pgTable(
  'depth_chart_entries',
  {
    layer: text('layer').notNull(),
    leagueId: text('league_id').notNull(),
    slotCode: text('slot_code').notNull(),
    rank: integer('rank').notNull(),
    playerId: text('player_id'),
  },
  (table) => [primaryKey({ columns: [table.layer, table.leagueId, table.slotCode, table.rank] })],
);

export const formationSubs = pgTable(
  'formation_subs',
  {
    layer: text('layer').notNull(),
    leagueId: text('league_id').notNull(),
    formationId: text('formation_id').notNull(),
    slotKey: text('slot_key').notNull(),
    mode: text('mode').notNull().default('override'),
    playerId: text('player_id'),
    inheritSlotCode: text('inherit_slot_code'),
    inheritRank: integer('inherit_rank'),
    note: text('note'),
  },
  (table) => [
    primaryKey({ columns: [table.layer, table.leagueId, table.formationId, table.slotKey] }),
  ],
);

/* -------------------------------------------------------------------------- */
/* Playbooks and formations                                                    */
/* -------------------------------------------------------------------------- */

export const playbooks = pgTable('playbooks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  team: text('team').notNull(),
  side: text('side').notNull(),
  source: text('source').notNull().default('seed'),
  season: text('season').notNull().default('27'),
  url: text('url'),
});

export const formations = pgTable('formations', {
  id: text('id').primaryKey(),
  playbookId: text('playbook_id').notNull(),
  name: text('name').notNull(),
  set: text('set').notNull(),
  personnel: text('personnel').notNull(),
  distribution: text('distribution').notNull(),
  side: text('side').notNull(),
  family: text('family').notNull(),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const formationSlots = pgTable(
  'formation_slots',
  {
    formationId: text('formation_id').notNull(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    /** Depth chart role this spot inherits from, e.g. `SLWR`. */
    roleCode: text('role_code'),
    roleRank: integer('role_rank').notNull().default(1),
    x: real('x').notNull().default(0.5),
    y: real('y').notNull().default(0.9),
    eligiblePositions: jsonb('eligible_positions').$type<string[]>().notNull().default([]),
    positionFallback: text('position_fallback'),
  },
  (table) => [primaryKey({ columns: [table.formationId, table.key] })],
);

export const formationPlays = pgTable('formation_plays', {
  id: text('id').primaryKey(),
  formationId: text('formation_id').notNull(),
  name: text('name').notNull(),
  conceptOverride: text('concept_override'),
  familyOverride: text('family_override'),
});

/* -------------------------------------------------------------------------- */
/* Plans, call sheets and drives                                               */
/* -------------------------------------------------------------------------- */

export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  leagueId: text('league_id').notNull(),
  name: text('name').notNull(),
  playbookId: text('playbook_id'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const callSheetEntries = pgTable(
  'call_sheet_entries',
  {
    planId: text('plan_id').notNull(),
    side: text('side').notNull().default('offense'),
    bucketId: text('bucket_id').notNull(),
    priority: integer('priority').notNull(),
    concept: text('concept').notNull(),
  },
  (table) => [primaryKey({ columns: [table.planId, table.side, table.bucketId, table.priority] })],
);

export const drives = pgTable('drives', {
  id: text('id').primaryKey(),
  leagueId: text('league_id').notNull(),
  planId: text('plan_id'),
  opponent: text('opponent').notNull().default('CPU'),
  side: text('side').notNull().default('offense'),
  status: text('status').notNull().default('active'),
  quarter: integer('quarter').notNull().default(1),
  clockSeconds: integer('clock_seconds').notNull().default(900),
  down: integer('down').notNull().default(1),
  distance: integer('distance').notNull().default(10),
  yardLine: integer('yard_line').notNull().default(25),
  scoreDiff: integer('score_diff').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const driveCalls = pgTable('drive_calls', {
  id: serial('id').primaryKey(),
  driveId: text('drive_id').notNull(),
  sequence: integer('sequence').notNull(),
  formationId: text('formation_id').notNull(),
  formationName: text('formation_name').notNull(),
  playId: text('play_id').notNull(),
  playName: text('play_name').notNull(),
  concept: text('concept').notNull(),
  bucketId: text('bucket_id').notNull(),
  outcome: text('outcome').notNull(),
  down: integer('down').notNull(),
  distance: integer('distance').notNull(),
  yardLine: integer('yard_line').notNull(),
  reasons: jsonb('reasons').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Roster upkeep: trades and draft                                            */
/* -------------------------------------------------------------------------- */

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  leagueId: text('league_id').notNull(),
  kind: text('kind').notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull().default(1),
  counterpartyTeamId: text('counterparty_team_id'),
  /** Players and picks in and out, plus any valuation the UI computed. */
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  valueIn: integer('value_in'),
  valueOut: integer('value_out'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const draftPicks = pgTable('draft_picks', {
  id: serial('id').primaryKey(),
  leagueId: text('league_id').notNull(),
  season: integer('season').notNull(),
  round: integer('round').notNull(),
  originalTeamId: text('original_team_id'),
  currentTeamId: text('current_team_id'),
  notes: text('notes'),
});

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});
