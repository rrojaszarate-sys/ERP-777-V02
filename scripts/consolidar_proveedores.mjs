#!/usr/bin/env node
/**
 * SCRIPT: CONSOLIDAR Y NORMALIZAR PROVEEDORES
 *
 * 1. Extrae todos los proveedores de la BD
 * 2. Normaliza nombres (mayúsculas, sin acentos)
 * 3. Detecta duplicados y similares
 * 4. Genera tabla de conversión
 * 5. Consolida proveedores duplicados
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

/**
 * Quita acentos de una cadena
 */
function quitarAcentos(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'N')
    .replace(/Ñ/g, 'N');
}

/**
 * Normaliza un nombre de proveedor
 */
function normalizarNombre(nombre) {
  if (!nombre) return '';

  let normalizado = nombre
    .toUpperCase()
    .trim();

  // Quitar acentos
  normalizado = quitarAcentos(normalizado);

  // Quitar caracteres especiales excepto espacios y guiones
  normalizado = normalizado.replace(/[^\w\s\-\.]/g, '');

  // Normalizar espacios múltiples
  normalizado = normalizado.replace(/\s+/g, ' ').trim();

  // Abreviaturas comunes
  const abreviaturas = {
    'S.A. DE C.V.': 'SA DE CV',
    'S.A DE C.V.': 'SA DE CV',
    'S.A.DE C.V.': 'SA DE CV',
    'SA DE CV': 'SA DE CV',
    'S DE RL DE CV': 'S DE RL DE CV',
    'S. DE R.L. DE C.V.': 'S DE RL DE CV',
    'S.C.': 'SC',
    'S. C.': 'SC',
  };

  for (const [patron, reemplazo] of Object.entries(abreviaturas)) {
    normalizado = normalizado.replace(patron, reemplazo);
  }

  return normalizado;
}

/**
 * Calcula similitud entre dos cadenas (Levenshtein simplificado)
 */
function similitud(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  // Si uno contiene al otro
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return shorter.length / longer.length;
  }

  // Calcular distancia de Levenshtein
  const costs = [];
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }

  return (longer.length - costs[str2.length]) / longer.length;
}

/**
 * Agrupa proveedores similares
 */
function agruparSimilares(proveedores, umbralSimilitud = 0.85) {
  const grupos = [];
  const procesados = new Set();

  for (const prov of proveedores) {
    if (procesados.has(prov.id)) continue;

    const grupo = {
      principal: prov,
      similares: [],
      nombreNormalizado: prov.nombre_normalizado
    };

    for (const otro of proveedores) {
      if (otro.id === prov.id || procesados.has(otro.id)) continue;

      const sim = similitud(prov.nombre_normalizado, otro.nombre_normalizado);

      if (sim >= umbralSimilitud) {
        grupo.similares.push({
          ...otro,
          similitud: sim
        });
        procesados.add(otro.id);
      }
    }

    procesados.add(prov.id);

    // Solo agregar grupos que tienen duplicados o el nombre original difiere del normalizado
    if (grupo.similares.length > 0 || prov.razon_social !== prov.nombre_normalizado) {
      grupos.push(grupo);
    }
  }

  return grupos;
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS
// ============================================================================

async function obtenerProveedores() {
  console.log('📋 Obteniendo proveedores de cont_proveedores...');

  const { data: contProv, error: error1 } = await supabase
    .from('cont_proveedores')
    .select('id, razon_social, nombre_comercial, rfc, activo, company_id')
    .order('razon_social');

  if (error1) {
    console.error('Error obteniendo cont_proveedores:', error1.message);
    return [];
  }

  console.log(`   Encontrados: ${contProv?.length || 0} en cont_proveedores`);

  // También obtener de proveedores_erp si existe
  const { data: erpProv, error: error2 } = await supabase
    .from('proveedores_erp')
    .select('id, razon_social, nombre_comercial, rfc, activo, company_id')
    .order('razon_social');

  if (!error2 && erpProv?.length > 0) {
    console.log(`   Encontrados: ${erpProv.length} en proveedores_erp`);
  }

  // Combinar y marcar origen
  const todos = [
    ...(contProv || []).map(p => ({ ...p, tabla_origen: 'cont_proveedores' })),
    ...(erpProv || []).map(p => ({ ...p, tabla_origen: 'proveedores_erp' }))
  ];

  // Agregar nombre normalizado
  return todos.map(p => ({
    ...p,
    nombre_normalizado: normalizarNombre(p.razon_social)
  }));
}

async function contarGastosPorProveedor(proveedorId) {
  const { count, error } = await supabase
    .from('cont_gastos_externos')
    .select('id', { count: 'exact', head: true })
    .eq('proveedor_id', proveedorId);

  return error ? 0 : (count || 0);
}

// ============================================================================
// ANÁLISIS Y REPORTE
// ============================================================================

async function analizarProveedores() {
  const proveedores = await obtenerProveedores();

  if (proveedores.length === 0) {
    console.log('⚠️  No se encontraron proveedores');
    return;
  }

  console.log(`\n📊 Total proveedores: ${proveedores.length}`);

  // Agrupar por nombre normalizado
  const porNombreNormalizado = {};
  for (const prov of proveedores) {
    const key = prov.nombre_normalizado;
    if (!porNombreNormalizado[key]) {
      porNombreNormalizado[key] = [];
    }
    porNombreNormalizado[key].push(prov);
  }

  // Encontrar duplicados exactos (mismo nombre normalizado)
  const duplicadosExactos = Object.entries(porNombreNormalizado)
    .filter(([, provs]) => provs.length > 1);

  console.log(`\n🔴 DUPLICADOS EXACTOS (mismo nombre normalizado): ${duplicadosExactos.length} grupos`);

  // Encontrar similares
  const gruposSimilares = agruparSimilares(proveedores, 0.80);
  const conSimilares = gruposSimilares.filter(g => g.similares.length > 0);

  console.log(`🟡 GRUPOS CON SIMILARES (>80% similitud): ${conSimilares.length} grupos`);

  // Generar reporte detallado
  const reporte = {
    fecha: new Date().toISOString(),
    total_proveedores: proveedores.length,
    duplicados_exactos: duplicadosExactos.length,
    grupos_similares: conSimilares.length,
    detalle_duplicados: [],
    detalle_similares: [],
    tabla_conversion: []
  };

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    DUPLICADOS EXACTOS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const [nombreNorm, provs] of duplicadosExactos.slice(0, 20)) {
    console.log(`📍 "${nombreNorm}" (${provs.length} registros)`);

    const grupo = {
      nombre_normalizado: nombreNorm,
      proveedores: []
    };

    for (const p of provs) {
      const gastos = await contarGastosPorProveedor(p.id);
      console.log(`   - [${p.tabla_origen}] ID:${p.id} "${p.razon_social}" (${gastos} gastos)`);

      grupo.proveedores.push({
        id: p.id,
        tabla: p.tabla_origen,
        nombre_original: p.razon_social,
        gastos_asociados: gastos
      });
    }

    reporte.detalle_duplicados.push(grupo);
    console.log('');
  }

  if (duplicadosExactos.length > 20) {
    console.log(`   ... y ${duplicadosExactos.length - 20} grupos más\n`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    PROVEEDORES SIMILARES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const grupo of conSimilares.slice(0, 15)) {
    console.log(`📍 Principal: "${grupo.principal.razon_social}"`);
    console.log(`   Normalizado: "${grupo.nombreNormalizado}"`);

    const detalle = {
      principal: {
        id: grupo.principal.id,
        tabla: grupo.principal.tabla_origen,
        nombre: grupo.principal.razon_social,
        normalizado: grupo.nombreNormalizado
      },
      similares: []
    };

    for (const sim of grupo.similares) {
      console.log(`   ≈ ${(sim.similitud * 100).toFixed(0)}% "${sim.razon_social}"`);
      detalle.similares.push({
        id: sim.id,
        tabla: sim.tabla_origen,
        nombre: sim.razon_social,
        similitud: sim.similitud
      });
    }

    reporte.detalle_similares.push(detalle);
    console.log('');
  }

  // Crear tabla de conversión
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    TABLA DE CONVERSIÓN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Agregar todos los proveedores con su nombre normalizado
  for (const prov of proveedores) {
    if (prov.razon_social !== prov.nombre_normalizado) {
      reporte.tabla_conversion.push({
        id: prov.id,
        tabla_origen: prov.tabla_origen,
        nombre_original: prov.razon_social,
        nombre_normalizado: prov.nombre_normalizado,
        accion: 'NORMALIZAR'
      });
    }
  }

  // Agregar duplicados para consolidar
  for (const [nombreNorm, provs] of duplicadosExactos) {
    // El principal es el que tiene más gastos o el primero
    const conGastos = await Promise.all(
      provs.map(async p => ({
        ...p,
        gastos: await contarGastosPorProveedor(p.id)
      }))
    );

    conGastos.sort((a, b) => b.gastos - a.gastos);
    const principal = conGastos[0];

    for (const p of conGastos.slice(1)) {
      reporte.tabla_conversion.push({
        id: p.id,
        tabla_origen: p.tabla_origen,
        nombre_original: p.razon_social,
        nombre_normalizado: nombreNorm,
        consolidar_con_id: principal.id,
        consolidar_con_nombre: principal.razon_social,
        accion: 'CONSOLIDAR'
      });
    }
  }

  console.log(`   Total conversiones: ${reporte.tabla_conversion.length}`);
  console.log(`   - Normalizar: ${reporte.tabla_conversion.filter(c => c.accion === 'NORMALIZAR').length}`);
  console.log(`   - Consolidar: ${reporte.tabla_conversion.filter(c => c.accion === 'CONSOLIDAR').length}`);

  // Guardar reporte
  const reportePath = join(__dirname, '..', 'reporte_proveedores.json');
  fs.writeFileSync(reportePath, JSON.stringify(reporte, null, 2));
  console.log(`\n📄 Reporte guardado en: ${reportePath}`);

  return reporte;
}

// ============================================================================
// CONSOLIDACIÓN
// ============================================================================

async function consolidarProveedores(ejecutar = false) {
  const reportePath = join(__dirname, '..', 'reporte_proveedores.json');

  if (!fs.existsSync(reportePath)) {
    console.log('⚠️  Primero ejecuta el análisis: node scripts/consolidar_proveedores.mjs analizar');
    return;
  }

  const reporte = JSON.parse(fs.readFileSync(reportePath, 'utf-8'));
  const conversiones = reporte.tabla_conversion.filter(c => c.accion === 'CONSOLIDAR');

  console.log(`\n📋 Consolidaciones pendientes: ${conversiones.length}`);

  if (!ejecutar) {
    console.log('\n⚠️  Modo simulación. Usa "ejecutar" para aplicar cambios.');
    console.log('   node scripts/consolidar_proveedores.mjs consolidar ejecutar\n');

    for (const conv of conversiones.slice(0, 10)) {
      console.log(`   "${conv.nombre_original}" → "${conv.consolidar_con_nombre}" (ID ${conv.consolidar_con_id})`);
    }
    if (conversiones.length > 10) {
      console.log(`   ... y ${conversiones.length - 10} más`);
    }
    return;
  }

  console.log('\n🔄 Ejecutando consolidación...\n');

  let exitosos = 0;
  let errores = 0;

  for (const conv of conversiones) {
    try {
      // Actualizar gastos para que apunten al proveedor principal
      const { error: updateError } = await supabase
        .from('cont_gastos_externos')
        .update({ proveedor_id: conv.consolidar_con_id })
        .eq('proveedor_id', conv.id);

      if (updateError) throw updateError;

      // Desactivar el proveedor duplicado
      const tabla = conv.tabla_origen || 'cont_proveedores';
      const { error: deactivateError } = await supabase
        .from(tabla)
        .update({ activo: false })
        .eq('id', conv.id);

      if (deactivateError) throw deactivateError;

      console.log(`   ✅ "${conv.nombre_original}" → consolidado con ID ${conv.consolidar_con_id}`);
      exitosos++;
    } catch (error) {
      console.log(`   ❌ Error con "${conv.nombre_original}": ${error.message}`);
      errores++;
    }
  }

  console.log(`\n📊 Resultado: ${exitosos} exitosos, ${errores} errores`);
}

async function normalizarNombres(ejecutar = false) {
  console.log('\n🔄 Normalizando nombres de proveedores...\n');

  const proveedores = await obtenerProveedores();
  const cambios = proveedores.filter(p => p.razon_social !== p.nombre_normalizado);

  console.log(`   Proveedores a normalizar: ${cambios.length}`);

  if (!ejecutar) {
    console.log('\n⚠️  Modo simulación. Usa "ejecutar" para aplicar cambios.');
    console.log('   node scripts/consolidar_proveedores.mjs normalizar ejecutar\n');

    for (const p of cambios.slice(0, 15)) {
      console.log(`   "${p.razon_social}" → "${p.nombre_normalizado}"`);
    }
    if (cambios.length > 15) {
      console.log(`   ... y ${cambios.length - 15} más`);
    }
    return;
  }

  let exitosos = 0;
  let errores = 0;

  for (const p of cambios) {
    try {
      const { error } = await supabase
        .from(p.tabla_origen)
        .update({ razon_social: p.nombre_normalizado })
        .eq('id', p.id);

      if (error) throw error;

      console.log(`   ✅ ID ${p.id}: "${p.razon_social}" → "${p.nombre_normalizado}"`);
      exitosos++;
    } catch (error) {
      console.log(`   ❌ Error ID ${p.id}: ${error.message}`);
      errores++;
    }
  }

  console.log(`\n📊 Resultado: ${exitosos} exitosos, ${errores} errores`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const comando = args[0] || 'analizar';
  const ejecutar = args[1] === 'ejecutar';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('      CONSOLIDACIÓN Y NORMALIZACIÓN DE PROVEEDORES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  switch (comando) {
    case 'analizar':
      await analizarProveedores();
      break;

    case 'normalizar':
      await normalizarNombres(ejecutar);
      break;

    case 'consolidar':
      await consolidarProveedores(ejecutar);
      break;

    default:
      console.log('Uso:');
      console.log('  node scripts/consolidar_proveedores.mjs analizar       - Analiza y genera reporte');
      console.log('  node scripts/consolidar_proveedores.mjs normalizar     - Simula normalización');
      console.log('  node scripts/consolidar_proveedores.mjs normalizar ejecutar  - Ejecuta normalización');
      console.log('  node scripts/consolidar_proveedores.mjs consolidar     - Simula consolidación');
      console.log('  node scripts/consolidar_proveedores.mjs consolidar ejecutar  - Ejecuta consolidación');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
