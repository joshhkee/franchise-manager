CREATE TABLE "trade_targets" (
	"player_id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
