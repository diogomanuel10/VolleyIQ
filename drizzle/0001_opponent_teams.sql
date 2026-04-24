CREATE TABLE IF NOT EXISTS "opponent_coaches" (
	"id" text PRIMARY KEY NOT NULL,
	"opponent_team_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opponent_players" (
	"id" text PRIMARY KEY NOT NULL,
	"opponent_team_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"number" integer,
	"position" text,
	"height_cm" integer,
	"dominant_hand" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opponent_teams" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"club" text,
	"category" text,
	"division" text,
	"primary_color" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "opponent_team_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opponent_coaches" ADD CONSTRAINT "opponent_coaches_opponent_team_id_opponent_teams_id_fk" FOREIGN KEY ("opponent_team_id") REFERENCES "public"."opponent_teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opponent_players" ADD CONSTRAINT "opponent_players_opponent_team_id_opponent_teams_id_fk" FOREIGN KEY ("opponent_team_id") REFERENCES "public"."opponent_teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opponent_teams" ADD CONSTRAINT "opponent_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opponent_coaches_team_idx" ON "opponent_coaches" USING btree ("opponent_team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opponent_players_team_idx" ON "opponent_players" USING btree ("opponent_team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opponent_teams_team_idx" ON "opponent_teams" USING btree ("team_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_opponent_team_id_opponent_teams_id_fk" FOREIGN KEY ("opponent_team_id") REFERENCES "public"."opponent_teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_opponent_team_idx" ON "matches" USING btree ("opponent_team_id");