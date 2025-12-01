#!/usr/bin/env node
/**
 * SCRIPT: Encontrar proveedores con nombres similares
 * Usa algoritmo de similitud de texto para detectar posibles duplicados
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// Función de similitud (Levenshtein simplificado)
function similitud(str1, str2) {
  if (!str1 || !str2) return 0;
  str1 = str1.toUpperCase();
  str2 = str2.toUpperCase();

  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;

  // Matriz de distancia
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distancia = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distancia / maxLen);
}

// Extraer palabras clave del nombre
function extraerPalabras(nombre) {
  if (!nombre) return [];
  return nombre
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 2)
    .filter(p => !['DE', 'LA', 'EL', 'LOS', 'LAS', 'DEL', 'SA', 'CV', 'SAPI', 'SAS'].includes(p));
}

// Similitud por palabras compartidas
function similitudPalabras(nombre1, nombre2) {
  const palabras1 = new Set(extraerPalabras(nombre1));
  const palabras2 = new Set(extraerPalabras(nombre2));

  if (palabras1.size === 0 || palabras2.size === 0) return 0;

  const intersection = [...palabras1].filter(p => palabras2.has(p)).length;
  const union = new Set([...palabras1, ...palabras2]).size;

  return intersection / union;
}

async function main() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   PROVEEDORES CON NOMBRES SIMILARES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const proveedores = await client.query(`
      SELECT id, nombre, razon_social, rfc
      FROM cont_proveedores
      WHERE activo = true
      ORDER BY nombre
    `);

    console.log(`📋 Total proveedores activos: ${proveedores.rows.length}\n`);

    const similares = [];

    // Comparar cada par de proveedores
    for (let i = 0; i < proveedores.rows.length; i++) {
      for (let j = i + 1; j < proveedores.rows.length; j++) {
        const p1 = proveedores.rows[i];
        const p2 = proveedores.rows[j];

        // Saltar si ya son exactamente iguales
        if (p1.nombre === p2.nombre) continue;

        const simNombre = similitud(p1.nombre, p2.nombre);
        const simPalabras = similitudPalabras(p1.nombre, p2.nombre);
        const simRazon = similitud(p1.razon_social, p2.razon_social);

        // Si tienen alto grado de similitud
        if (simNombre > 0.75 || simPalabras > 0.5 || (simRazon > 0.8 && simRazon < 1)) {
          similares.push({
            p1: { id: p1.id, nombre: p1.nombre, rfc: p1.rfc },
            p2: { id: p2.id, nombre: p2.nombre, rfc: p2.rfc },
            simNombre: Math.round(simNombre * 100),
            simPalabras: Math.round(simPalabras * 100),
            simRazon: Math.round(simRazon * 100)
          });
        }
      }
    }

    // Ordenar por similitud
    similares.sort((a, b) => b.simNombre - a.simNombre);

    console.log(`🔍 Encontrados ${similares.length} pares de proveedores similares:\n`);
    console.log('─'.repeat(80));

    for (const par of similares.slice(0, 50)) { // Mostrar top 50
      console.log(`
📌 Similitud: ${par.simNombre}% (nombre) | ${par.simPalabras}% (palabras)
   ID ${par.p1.id}: "${par.p1.nombre}" ${par.p1.rfc ? `(${par.p1.rfc})` : ''}
   ID ${par.p2.id}: "${par.p2.nombre}" ${par.p2.rfc ? `(${par.p2.rfc})` : ''}`);
    }

    // Generar reporte JSON para consolidación
    const reporte = similares.map(s => ({
      mantener_id: s.p1.id,
      mantener_nombre: s.p1.nombre,
      eliminar_id: s.p2.id,
      eliminar_nombre: s.p2.nombre,
      similitud: s.simNombre
    }));

    const reportePath = path.join(__dirname, '..', 'reporte_proveedores.json');
    const fs = await import('fs');
    fs.writeFileSync(reportePath, JSON.stringify(reporte, null, 2));
    console.log(`\n📄 Reporte guardado en: reporte_proveedores.json`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   ANÁLISIS COMPLETADO');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
