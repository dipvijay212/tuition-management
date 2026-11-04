-- =====================================================================
-- 0008 EXPLICIT API GRANTS
-- Newer Supabase projects don't auto-grant table privileges to API roles.
-- Table privileges here are only the outer gate; RLS policies decide rows.
-- anon (signed-out) deliberately receives nothing.
-- =====================================================================
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;

revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
