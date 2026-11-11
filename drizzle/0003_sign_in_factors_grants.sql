-- The application signs people in, so it may read and write the sign-in
-- tables. Like users and sessions they sit outside row-level security:
-- nobody is known to be signed in while these rows are looked up. Deleting
-- the user (delete_account) takes them with it through the foreign keys.
GRANT SELECT, INSERT, UPDATE, DELETE ON "passkeys", "recovery_codes", "auth_challenges" TO prismatic_app;
