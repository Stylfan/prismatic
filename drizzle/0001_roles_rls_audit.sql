-- Security for Prismatic's data (ADR 0003): the application's own role,
-- row-level security that hides one account's programmes from another,
-- an audit log written by triggers that nobody can rewrite, and the one
-- privileged operation the application may call: deleting an account
-- completely.

-- The role the application connects as. It owns nothing, so row-level
-- security applies to it in full. scripts/migrate.mjs gives it LOGIN and
-- its password from PRISMATIC_APP_PASSWORD.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'prismatic_app') THEN
    CREATE ROLE prismatic_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO prismatic_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "users", "sessions", "programs", "program_sizes", "milestones", "items",
  "program_events", "quarter_records", "risks", "quarter_goals",
  "decision_cases", "decisions", "report_drafts", "report_editions"
TO prismatic_app;
--> statement-breakpoint
-- The audit log can be read for one's own programmes and nothing else.
GRANT SELECT ON "audit_log" TO prismatic_app;
--> statement-breakpoint

-- The acting user, set per transaction by withUser() in src/db/client.ts.
CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')
$$;
--> statement-breakpoint

-- Programmes: an account sees and writes only its own.
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "programs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_programs ON "programs" FOR ALL TO prismatic_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint

-- Everything that hangs off a programme: reachable only through a
-- programme the acting user owns. The subquery is itself filtered by the
-- policy on programs.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'program_sizes', 'milestones', 'items', 'program_events', 'quarter_records',
    'risks', 'quarter_goals', 'decision_cases', 'decisions', 'report_drafts',
    'report_editions'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_own_rows ON %I FOR ALL TO prismatic_app
         USING (program_id IN (SELECT id FROM programs))
         WITH CHECK (program_id IN (SELECT id FROM programs))',
      t
    );
  END LOOP;
END
$$;
--> statement-breakpoint

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_own_audit ON "audit_log" FOR SELECT TO prismatic_app
  USING (program_id IN (SELECT id FROM programs));
--> statement-breakpoint

-- Row-change capture. SECURITY DEFINER, so the insert works although the
-- application role has no right to write the log itself. Passwords never
-- reach it: the users and sessions tables are not audited.
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_program text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_before := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_after := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'programs' THEN
    v_program := coalesce(v_after ->> 'id', v_before ->> 'id');
  ELSE
    v_program := coalesce(v_after ->> 'program_id', v_before ->> 'program_id');
  END IF;
  INSERT INTO audit_log (at, actor_user_id, table_name, operation, row_id, program_id, before, after)
  VALUES (
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    app_user_id(),
    TG_TABLE_NAME,
    lower(TG_OP),
    coalesce(v_after ->> 'id', v_before ->> 'id'),
    v_program,
    v_before,
    v_after
  );
  RETURN coalesce(NEW, OLD);
END
$$;
--> statement-breakpoint

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'programs', 'program_sizes', 'milestones', 'items', 'program_events',
    'quarter_records', 'risks', 'quarter_goals', 'decision_cases', 'decisions',
    'report_drafts', 'report_editions'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION audit_row_change()',
      t, t
    );
  END LOOP;
END
$$;
--> statement-breakpoint

-- Append-only: no role may update, delete or truncate the log. The single
-- exception is delete_account(), which sets prismatic.purge inside its
-- own transaction to erase an account completely (Haij's third rule).
CREATE OR REPLACE FUNCTION audit_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('prismatic.purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only';
END
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_block_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_block_mutation();
--> statement-breakpoint

-- Deleting an account and everything it owns, its audit trail included.
-- Only the account itself may call it.
CREATE OR REPLACE FUNCTION delete_account(p_user text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_programs text[];
BEGIN
  IF p_user IS DISTINCT FROM app_user_id() THEN
    RAISE EXCEPTION 'delete_account: not the signed-in account';
  END IF;
  SELECT coalesce(array_agg(id), '{}') INTO v_programs FROM programs WHERE owner_id = p_user;
  DELETE FROM programs WHERE owner_id = p_user;
  PERFORM set_config('prismatic.purge', 'on', true);
  DELETE FROM audit_log WHERE program_id = ANY (v_programs);
  PERFORM set_config('prismatic.purge', 'off', true);
  DELETE FROM sessions WHERE user_id = p_user;
  DELETE FROM users WHERE id = p_user;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION delete_account(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION delete_account(text) TO prismatic_app;
