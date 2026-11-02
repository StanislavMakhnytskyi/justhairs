// Boots a throwaway in-memory Postgres (PGlite) and applies the project's
// migrations and seed to it, so the database layer can be tested without the
// live Supabase project.
//
// Supabase provides a few things PGlite doesn't; they are stood in for here:
//   - the anon / authenticated / service_role roles, with the default
//     privileges Supabase gives every new object in `public`
//   - auth.users and auth.uid()
//   - the `extensions` schema
//   - pg_cron (a no-op `cron` schema that just records job names)
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dir = path.join(root, "supabase");

const SUPABASE_SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema extensions;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text, phone text, raw_user_meta_data jsonb
);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create schema cron;
create table cron.job (jobid serial primary key, jobname text unique, schedule text, command text);
create function cron.schedule(job_name text, schedule text, command text) returns bigint
  language sql as $$ insert into cron.job (jobname, schedule, command) values (job_name, schedule, command) returning jobid::bigint $$;
create function cron.unschedule(job_name text) returns boolean
  language sql as $$ delete from cron.job where jobname = job_name returning true $$;

grant usage on schema public, extensions to anon, authenticated, service_role;
-- What Supabase does for every object created in public:
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
`;

/** SQL files that can't run on PGlite as written, minimally adjusted. */
function adapt(sql) {
  return sql
    .replace(/create extension if not exists pg_cron;/gi, "-- (pg_cron: stubbed by the harness)")
    .replace(/create extension if not exists "?pgcrypto"?;/gi, "-- (pgcrypto: gen_random_uuid() is built in)");
}

export function migrationFiles() {
  return readdirSync(path.join(dir, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** @param {{ upTo?: string, seed?: boolean }} opts upTo = last migration file name to apply */
export async function boot({ upTo, seed = true } = {}) {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SUPABASE_SHIM);
  for (const file of migrationFiles()) {
    await db.exec(adapt(readFileSync(path.join(dir, "migrations", file), "utf8")));
    if (upTo && file === upTo) break;
  }
  if (seed) await db.exec(adapt(readFileSync(path.join(dir, "seed.sql"), "utf8")));
  return db;
}

export async function apply(db, file) {
  await db.exec(adapt(readFileSync(path.join(dir, "migrations", file), "utf8")));
}

/** Run a query as one of the API roles, then go back to the superuser. */
export async function as(db, role, sql, params) {
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
