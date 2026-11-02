// src/lib/supabase/database.types.ts is maintained by hand until the real
// `supabase gen types` output replaces it. This keeps it honest: every table,
// view, column (and its nullability), function and enum in the file must match
// what Postgres actually has after all migrations.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { boot } from "./harness.mjs";

const file = path.resolve(import.meta.dirname, "../../src/lib/supabase/database.types.ts");

// ── read the type literal tree ───────────────────────────────────────────────
const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
const alias = sf.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === "Database");
assert.ok(alias, "Database type not found");

const props = (node) =>
  Object.fromEntries(
    (node?.members ?? []).filter(ts.isPropertySignature).map((m) => [m.name.getText(sf).replace(/["']/g, ""), m.type]),
  );
const isNullable = (t) => !!t && ts.isUnionTypeNode(t) && t.types.some((x) => x.kind === ts.SyntaxKind.NullKeyword || (ts.isLiteralTypeNode(x) && x.literal.kind === ts.SyntaxKind.NullKeyword));

const pub = props(props(alias.type).public);
const tables = Object.fromEntries(Object.entries(props(pub.Tables)).map(([n, t]) => [n, props(props(t).Row)]));
const views = Object.fromEntries(Object.entries(props(pub.Views)).map(([n, t]) => [n, props(props(t).Row)]));
const functions = Object.keys(props(pub.Functions));
const enums = Object.fromEntries(
  Object.entries(props(pub.Enums)).map(([n, t]) => [n, t.types.map((x) => x.literal.text).sort()]),
);

// ── read the real schema ─────────────────────────────────────────────────────
let db;
before(async () => {
  db = await boot({ seed: false });
});

async function columns(kind) {
  const { rows } = await db.query(
    `select c.relname as rel, a.attname as col, not a.attnotnull as nullable
       from pg_attribute a
       join pg_class c on c.oid = a.attrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = any($1) and a.attnum > 0 and not a.attisdropped
      order by 1, 2`,
    [kind],
  );
  const out = {};
  for (const r of rows) (out[r.rel] ??= {})[r.col] = r.nullable;
  return out;
}

function compare(label, actual, declared, { viewsAreNullable = false } = {}) {
  assert.deepEqual(Object.keys(declared).sort(), Object.keys(actual).sort(), `${label}: set of relations`);
  for (const rel of Object.keys(actual)) {
    assert.deepEqual(Object.keys(declared[rel]).sort(), Object.keys(actual[rel]).sort(), `${label} ${rel}: columns`);
    for (const col of Object.keys(actual[rel])) {
      const expected = viewsAreNullable ? true : actual[rel][col];
      assert.equal(isNullable(declared[rel][col]), expected, `${label} ${rel}.${col}: nullability`);
    }
  }
}

test("tables match the schema (names, columns, nullability)", async () => {
  compare("table", await columns(["r", "p"]), tables);
});

test("views match the schema (names, columns; view columns are all nullable)", async () => {
  compare("view", await columns(["v"]), views, { viewsAreNullable: true });
});

test("functions match the schema", async () => {
  const { rows } = await db.query(
    `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by 1`,
  );
  assert.deepEqual([...functions].sort(), rows.map((r) => r.name));
});

test("enums match the schema", async () => {
  const { rows } = await db.query(
    `select t.typname as name, e.enumlabel as label from pg_type t
       join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' order by 1, e.enumsortorder`,
  );
  const actual = {};
  for (const r of rows) (actual[r.name] ??= []).push(r.label);
  for (const k of Object.keys(actual)) actual[k].sort();
  assert.deepEqual(enums, actual);
});
