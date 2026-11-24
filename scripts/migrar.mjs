// Aplica las migraciones de supabase/migrations/ a la base de Supabase, en orden y una sola vez cada una.
// Uso: pnpm db:migrar (lee POSTGRES_URL_NON_POOLING de .env.local; ese archivo lo baja `vercel env pull`).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error("Falta POSTGRES_URL_NON_POOLING. Corré `vercel env pull .env.local` y usá `pnpm db:migrar`.");
  process.exit(1);
}

const carpeta = join(import.meta.dirname, "..", "supabase", "migrations");
const sql = postgres(url.replace(/[?&]sslmode=[^&]*/, ""), { ssl: "require", max: 1, onnotice: () => {} });

try {
  await sql`create table if not exists public._migraciones (nombre text primary key, aplicada timestamptz not null default now())`;
  await sql`alter table public._migraciones enable row level security`;
  const hechas = new Set((await sql`select nombre from public._migraciones`).map((r) => r.nombre));
  const archivos = readdirSync(carpeta).filter((f) => f.endsWith(".sql")).sort();
  for (const f of archivos) {
    if (hechas.has(f)) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(carpeta, f), "utf8"));
      await tx`insert into public._migraciones (nombre) values (${f})`;
    });
    console.log(`Aplicada: ${f}`);
  }
  console.log("Base al día.");
} finally {
  await sql.end();
}
