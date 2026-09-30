CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_sheet_entries" (
	"plan_id" text NOT NULL,
	"side" text DEFAULT 'offense' NOT NULL,
	"bucket_id" text NOT NULL,
	"priority" integer NOT NULL,
	"concept" text NOT NULL,
	CONSTRAINT "call_sheet_entries_plan_id_side_bucket_id_priority_pk" PRIMARY KEY("plan_id","side","bucket_id","priority")
);
--> statement-breakpoint
CREATE TABLE "depth_chart_entries" (
	"layer" text NOT NULL,
	"league_id" text NOT NULL,
	"slot_code" text NOT NULL,
	"rank" integer NOT NULL,
	"player_id" text,
	CONSTRAINT "depth_chart_entries_layer_league_id_slot_code_rank_pk" PRIMARY KEY("layer","league_id","slot_code","rank")
);
--> statement-breakpoint
CREATE TABLE "depth_slots" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"side" text NOT NULL,
	"group_name" text NOT NULL,
	"eligible_positions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"ranks" integer DEFAULT 3 NOT NULL,
	"situational" boolean DEFAULT false NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_picks" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"season" integer NOT NULL,
	"round" integer NOT NULL,
	"original_team_id" text,
	"current_team_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "drive_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"formation_id" text NOT NULL,
	"formation_name" text NOT NULL,
	"play_id" text NOT NULL,
	"play_name" text NOT NULL,
	"concept" text NOT NULL,
	"bucket_id" text NOT NULL,
	"outcome" text NOT NULL,
	"down" integer NOT NULL,
	"distance" integer NOT NULL,
	"yard_line" integer NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drives" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"plan_id" text,
	"opponent" text DEFAULT 'CPU' NOT NULL,
	"side" text DEFAULT 'offense' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"quarter" integer DEFAULT 1 NOT NULL,
	"clock_seconds" integer DEFAULT 900 NOT NULL,
	"down" integer DEFAULT 1 NOT NULL,
	"distance" integer DEFAULT 10 NOT NULL,
	"yard_line" integer DEFAULT 25 NOT NULL,
	"score_diff" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formation_plays" (
	"id" text PRIMARY KEY NOT NULL,
	"formation_id" text NOT NULL,
	"name" text NOT NULL,
	"concept_override" text,
	"family_override" text
);
--> statement-breakpoint
CREATE TABLE "formation_slots" (
	"formation_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"role_code" text,
	"role_rank" integer DEFAULT 1 NOT NULL,
	"x" real DEFAULT 0.5 NOT NULL,
	"y" real DEFAULT 0.9 NOT NULL,
	"eligible_positions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position_fallback" text,
	CONSTRAINT "formation_slots_formation_id_key_pk" PRIMARY KEY("formation_id","key")
);
--> statement-breakpoint
CREATE TABLE "formation_subs" (
	"layer" text NOT NULL,
	"league_id" text NOT NULL,
	"formation_id" text NOT NULL,
	"slot_key" text NOT NULL,
	"mode" text DEFAULT 'override' NOT NULL,
	"player_id" text,
	"inherit_slot_code" text,
	"inherit_rank" integer,
	"note" text,
	CONSTRAINT "formation_subs_layer_league_id_formation_id_slot_key_pk" PRIMARY KEY("layer","league_id","formation_id","slot_key")
);
--> statement-breakpoint
CREATE TABLE "formations" (
	"id" text PRIMARY KEY NOT NULL,
	"playbook_id" text NOT NULL,
	"name" text NOT NULL,
	"set" text NOT NULL,
	"personnel" text NOT NULL,
	"distribution" text NOT NULL,
	"side" text NOT NULL,
	"family" text NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "franchise_players" (
	"player_id" text PRIMARY KEY NOT NULL,
	"team_id" text,
	"contract_years" integer,
	"cap_hit" integer,
	"dev_trait" text,
	"injury_status" text DEFAULT 'healthy' NOT NULL,
	"injury_weeks" integer,
	"roster_status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"season" integer DEFAULT 2026 NOT NULL,
	"week" integer DEFAULT 1 NOT NULL,
	"user_team_id" text NOT NULL,
	"cap_total" integer DEFAULT 279000000 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"name" text NOT NULL,
	"playbook_id" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"team" text NOT NULL,
	"side" text NOT NULL,
	"source" text DEFAULT 'seed' NOT NULL,
	"season" text DEFAULT '27' NOT NULL,
	"url" text
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"position" text NOT NULL,
	"jersey" integer,
	"team_id" text,
	"overall" integer NOT NULL,
	"age" integer,
	"height_inches" integer,
	"college" text,
	"ratings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"salary" integer,
	"source" text DEFAULT 'seed' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbr" text NOT NULL,
	"conference" text,
	"division" text,
	"is_user_team" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'seed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"kind" text NOT NULL,
	"season" integer NOT NULL,
	"week" integer DEFAULT 1 NOT NULL,
	"counterparty_team_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"value_in" integer,
	"value_out" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
