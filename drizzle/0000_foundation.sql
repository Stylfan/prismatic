CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"at" bigint NOT NULL,
	"actor_user_id" text,
	"table_name" text NOT NULL,
	"operation" text NOT NULL,
	"row_id" text,
	"program_id" text,
	"before" jsonb,
	"after" jsonb
);
--> statement-breakpoint
CREATE TABLE "decision_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"title" text NOT NULL,
	"problem" text DEFAULT '' NOT NULL,
	"background" text DEFAULT '' NOT NULL,
	"key_points" text DEFAULT '' NOT NULL,
	"next_steps" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"title" text NOT NULL,
	"decided_on" text DEFAULT '' NOT NULL,
	"forum" text DEFAULT '' NOT NULL,
	"decision" text DEFAULT '' NOT NULL,
	"effect" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"kind" text NOT NULL,
	"parent_id" text,
	"milestone_id" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"track" text DEFAULT 'business' NOT NULL,
	"size" text,
	"points_override" integer,
	"integration" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"done_quarter" integer,
	"done_note" text DEFAULT '' NOT NULL,
	"period_index" integer,
	"period_span" integer DEFAULT 1 NOT NULL,
	"split_from_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"seq" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"scope_override" integer,
	"done_at" bigint,
	"period_index" integer,
	"period_span" integer DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_events" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"quarter_index" integer NOT NULL,
	"title" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_sizes" (
	"program_id" text NOT NULL,
	"level" text NOT NULL,
	"size" text NOT NULL,
	"points" integer NOT NULL,
	CONSTRAINT "program_sizes_program_id_level_size_pk" PRIMARY KEY("program_id","level","size")
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"goal" text DEFAULT '' NOT NULL,
	"period_model" text DEFAULT 'seasons' NOT NULL,
	"start_date" text NOT NULL,
	"quarter_horizon" integer DEFAULT 2 NOT NULL,
	"cost_per_quarter" integer,
	"deviation_pct" integer DEFAULT 10 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quarter_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"quarter_index" integer NOT NULL,
	"parent_id" text,
	"title" text NOT NULL,
	"stretch" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quarter_records" (
	"program_id" text NOT NULL,
	"quarter_index" integer NOT NULL,
	"capacity_pct" integer DEFAULT 100 NOT NULL,
	"delivered_override" integer,
	"planned_override" integer,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "quarter_records_program_id_quarter_index_pk" PRIMARY KEY("program_id","quarter_index")
);
--> statement-breakpoint
CREATE TABLE "report_drafts" (
	"program_id" text PRIMARY KEY NOT NULL,
	"status_text" text DEFAULT '' NOT NULL,
	"change_text" text DEFAULT '' NOT NULL,
	"goals_quarter" integer,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_editions" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"title" text NOT NULL,
	"published_at" bigint NOT NULL,
	"data" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"consequence" text DEFAULT '' NOT NULL,
	"mitigation" text DEFAULT '' NOT NULL,
	"change_note" text DEFAULT '' NOT NULL,
	"probability" integer DEFAULT 5 NOT NULL,
	"impact" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_cases" ADD CONSTRAINT "decision_cases_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_parent_id_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_split_from_id_items_id_fk" FOREIGN KEY ("split_from_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_events" ADD CONSTRAINT "program_events_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sizes" ADD CONSTRAINT "program_sizes_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarter_goals" ADD CONSTRAINT "quarter_goals_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarter_goals" ADD CONSTRAINT "quarter_goals_parent_id_quarter_goals_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quarter_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarter_records" ADD CONSTRAINT "quarter_records_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_drafts" ADD CONSTRAINT "report_drafts_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_editions" ADD CONSTRAINT "report_editions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_program_idx" ON "audit_log" USING btree ("program_id","at");--> statement-breakpoint
CREATE INDEX "decision_cases_program_idx" ON "decision_cases" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "decisions_program_idx" ON "decisions" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "items_program_idx" ON "items" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "items_parent_idx" ON "items" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_seq_uq" ON "milestones" USING btree ("program_id","seq");--> statement-breakpoint
CREATE INDEX "milestones_program_idx" ON "milestones" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "program_events_program_idx" ON "program_events" USING btree ("program_id","quarter_index");--> statement-breakpoint
CREATE INDEX "quarter_goals_program_idx" ON "quarter_goals" USING btree ("program_id","quarter_index");--> statement-breakpoint
CREATE INDEX "report_editions_program_idx" ON "report_editions" USING btree ("program_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "risks_number_uq" ON "risks" USING btree ("program_id","number");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");