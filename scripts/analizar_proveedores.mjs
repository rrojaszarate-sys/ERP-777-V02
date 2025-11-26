#!/usr/bin/env node
import pg from 'pg';
import { config } from 'dotenv';

config();
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function analizar() {
  await client.connect();

  const { rows } = await client.query("SELECT id, razon_social, rfc FROM cont_proveedores ORDER BY razon_social");

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PROVEEDORES EN BD: " + rows.length);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Buscar posibles duplicados
  const normalizados = new Map();
  rows.forEach(p => {
    let key = p.razon_social.toUpperCase()
      .replace(/,?\s*(S\.?A\.?\s*DE\s*C\.?V\.?|S\.?\s*DE\s*R\.?L\.?|S\.?C\.?)/gi, "")
      .replace(/[.,\-_]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalizados.has(key)) {
      normalizados.set(key, []);
    }
    normalizados.get(key).push(p);
  });

  // Mostrar grupos con duplicados
  const duplicados = [...normalizados.entries()].filter(([k, v]) => v.length > 1);

  console.log("📋 DUPLICADOS DETECTADOS: " + duplicados.length + " grupos\n");

  duplicados.forEach(([key, provs]) => {
    console.log("  " + key + ":");
    provs.forEach(p => console.log("    - " + p.razon_social + (p.rfc ? " [" + p.rfc + "]" : "")));
  });

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DESPUÉS DE NORMALIZAR: ~" + normalizados.size + " proveedores únicos");
  console.log("═══════════════════════════════════════════════════════════════\n");

  await client.end();
}

analizar().catch(e => { console.error(e.message); process.exit(1); });
