#!/usr/bin/env node
/**
 * Limpia proveedores duplicados, dejando solo únicos normalizados
 */
import pg from 'pg';
import { config } from 'dotenv';

config();
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function normalizar(nombre) {
  return nombre.toUpperCase()
    .replace(/,?\s*(S\.?A\.?\s*DE\s*C\.?V\.?|S\.?\s*DE\s*R\.?L\.?|S\.?C\.?)/gi, "")
    .replace(/[.,\-_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function limpiar() {
  await client.connect();
  console.log("Conectado\n");

  // Obtener todos los proveedores
  const { rows } = await client.query("SELECT id, razon_social, rfc FROM cont_proveedores ORDER BY razon_social");
  console.log("Proveedores actuales:", rows.length);

  // Agrupar por nombre normalizado
  const grupos = new Map();
  rows.forEach(p => {
    const key = normalizar(p.razon_social);
    if (!grupos.has(key)) {
      grupos.set(key, []);
    }
    grupos.get(key).push(p);
  });

  console.log("Proveedores únicos:", grupos.size);

  // Para cada grupo, mantener el que tenga nombre más completo (con SA DE CV) o RFC
  const mantener = [];
  const eliminar = [];

  grupos.forEach((provs, key) => {
    if (provs.length === 1) {
      mantener.push(provs[0]);
    } else {
      // Ordenar: preferir los que tengan RFC, luego los más largos
      provs.sort((a, b) => {
        if (a.rfc && !b.rfc) return -1;
        if (!a.rfc && b.rfc) return 1;
        return b.razon_social.length - a.razon_social.length;
      });
      mantener.push(provs[0]);
      eliminar.push(...provs.slice(1));
    }
  });

  console.log("Mantener:", mantener.length);
  console.log("Eliminar:", eliminar.length);

  // Eliminar duplicados
  if (eliminar.length > 0) {
    const ids = eliminar.map(p => p.id);
    await client.query(`DELETE FROM cont_proveedores WHERE id = ANY($1)`, [ids]);
    console.log("\n✓ Eliminados", eliminar.length, "duplicados");
  }

  // Verificar
  const { rows: final } = await client.query("SELECT COUNT(*) as total FROM cont_proveedores");
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PROVEEDORES FINALES:", final[0].total);
  console.log("═══════════════════════════════════════════════════════════════\n");

  await client.end();
}

limpiar().catch(console.error);
