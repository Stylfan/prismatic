-- A report belongs to a quarter: its texts are kept per quarter.
ALTER TABLE "report_drafts" DROP CONSTRAINT "report_drafts_pkey";--> statement-breakpoint
ALTER TABLE "report_drafts" ADD COLUMN "quarter_index" integer;--> statement-breakpoint
-- A draft that named the quarter whose goals it showed belongs to that quarter;
-- one that did not keeps no quarter until the first quarter saved takes it.
UPDATE "report_drafts" SET "quarter_index" = "goals_quarter" WHERE "goals_quarter" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "report_drafts_quarter_uq" ON "report_drafts" USING btree ("program_id","quarter_index");
