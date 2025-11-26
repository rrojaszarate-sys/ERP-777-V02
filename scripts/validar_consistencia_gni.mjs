#!/usr/bin/env node
/**
 * SCRIPT: VALIDAR CONSISTENCIA DE DATOS GNI
 * Compara datos importados en BD vs datos originales del Excel
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Variables de entorno requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const EXCEL_PATH = join(__dirname, '..', 'GNI 2025 A PROYECTOS.xlsx');

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

async function obtenerCompanyId() {
  const { data } = await supabase
    .from('core_companies')
    .select('id')
    .limit(1)
    .single();
  return data?.id;
}

async function obtenerDatosBD(companyId) {
  const { data, error } = await supabase
    .from('v_gastos_no_impactados')
    .select('*')
    .eq('company_id', companyId);

  if (error) throw error;
  return data || [];
}

async function obtenerCatalogosBD(companyId) {
  const [claves, formas, ejecutivos, proveedores] = await Promise.all([
    supabase.from('cat_claves_gasto').select('*').eq('company_id', companyId),
    supabase.from('cat_formas_pago').select('*').eq('company_id', companyId),
    supabase.from('cat_ejecutivos').select('*').eq('company_id', companyId),
    supabase.from('cat_proveedores').select('*').eq('company_id', companyId)
  ]);

  return {
    claves: claves.data || [],
    formas: formas.data || [],
    ejecutivos: ejecutivos.data || [],
    proveedores: proveedores.data || []
  };
}

function extraerDatosExcel() {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const meses = ['ENE25', 'FEB25', 'MAR25', 'ABR25', 'MAY25', 'JUN25',
    'JUL25', 'AGO25', 'SEP25', 'OCT25', 'NOV25', 'DIC25'];

  const datosExcel = {
    porMes: {},
    totales: {
      registros: 0,
      subtotal: 0,
      iva: 0,
      total: 0
    },
    proveedoresUnicos: new Set(),
    ejecutivosUnicos: new Set(),
    clavesUsadas: new Set()
  };

  meses.forEach(mes => {
    const sheet = workbook.Sheets[mes];
    if (!sheet) return;

    const data = XLSX.utils.sheet_to_json(sheet);
    const validData = data.filter(row =>
      row.PROVEEDOR && row.CONCEPTO && (row.TOTAL || row.TOTAL === 0)
    );

    let totalMes = { subtotal: 0, iva: 0, total: 0, registros: 0 };

    validData.forEach(row => {
      totalMes.subtotal += row.SUBTOTAL || 0;
      totalMes.iva += row.IVA || 0;
      totalMes.total += row.TOTAL || 0;
      totalMes.registros++;

      if (row.PROVEEDOR) datosExcel.proveedoresUnicos.add(row.PROVEEDOR);
      if (row.EJECUTIVO) datosExcel.ejecutivosUnicos.add(row.EJECUTIVO);
      if (row.CLAVE) datosExcel.clavesUsadas.add(row.CLAVE);
    });

    datosExcel.porMes[mes] = totalMes;
    datosExcel.totales.registros += totalMes.registros;
    datosExcel.totales.subtotal += totalMes.subtotal;
    datosExcel.totales.iva += totalMes.iva;
    datosExcel.totales.total += totalMes.total;
  });

  return datosExcel;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(value);
}

// ============================================================================
// REPORTES
// ============================================================================

function generarReporte(datosExcel, datosBD, catalogosBD) {
  const reporte = {
    fecha: new Date().toISOString(),
    resumen: {
      estado: 'OK',
      errores: []
    },
    catalogos: {
      claves: {
        excel: datosExcel.clavesUsadas.size,
        bd: catalogosBD.claves.length,
        estado: 'OK'
      },
      proveedores: {
        excel: datosExcel.proveedoresUnicos.size,
        bd: catalogosBD.proveedores.length,
        estado: 'OK'
      },
      ejecutivos: {
        excel: datosExcel.ejecutivosUnicos.size,
        bd: catalogosBD.ejecutivos.length,
        estado: 'OK'
      },
      formasPago: {
        bd: catalogosBD.formas.length
      }
    },
    totales: {
      excel: datosExcel.totales,
      bd: {
        registros: datosBD.length,
        subtotal: datosBD.reduce((s, g) => s + (g.subtotal || 0), 0),
        iva: datosBD.reduce((s, g) => s + (g.iva || 0), 0),
        total: datosBD.reduce((s, g) => s + (g.total || 0), 0)
      }
    },
    validaciones: []
  };

  // Validar catálogos
  if (catalogosBD.claves.length < datosExcel.clavesUsadas.size) {
    reporte.catalogos.claves.estado = 'ADVERTENCIA';
    reporte.resumen.errores.push('Faltan claves de gasto en BD');
  }

  if (catalogosBD.proveedores.length < datosExcel.proveedoresUnicos.size) {
    reporte.catalogos.proveedores.estado = 'ADVERTENCIA';
    reporte.resumen.errores.push('Faltan proveedores en BD');
  }

  if (catalogosBD.ejecutivos.length < datosExcel.ejecutivosUnicos.size) {
    reporte.catalogos.ejecutivos.estado = 'ADVERTENCIA';
    reporte.resumen.errores.push('Faltan ejecutivos en BD');
  }

  // Validar claves específicas
  const clavesExcel = Array.from(datosExcel.clavesUsadas);
  const clavesBD = catalogosBD.claves.map(c => c.clave);
  const clavesFaltantes = clavesExcel.filter(c => !clavesBD.includes(c));

  if (clavesFaltantes.length > 0) {
    reporte.validaciones.push({
      tipo: 'CLAVES_FALTANTES',
      mensaje: `Claves del Excel no encontradas en BD: ${clavesFaltantes.join(', ')}`,
      cantidad: clavesFaltantes.length
    });
  }

  // Validar proveedores
  const proveedoresExcel = Array.from(datosExcel.proveedoresUnicos);
  const proveedoresBD = catalogosBD.proveedores.map(p => p.razon_social.toUpperCase());
  const proveedoresFaltantes = proveedoresExcel.filter(p =>
    !proveedoresBD.includes(p.toUpperCase())
  );

  if (proveedoresFaltantes.length > 0) {
    reporte.validaciones.push({
      tipo: 'PROVEEDORES_FALTANTES',
      mensaje: `Proveedores del Excel no encontrados en BD`,
      cantidad: proveedoresFaltantes.length,
      detalle: proveedoresFaltantes.slice(0, 10) // Solo primeros 10
    });
  }

  // Estado general
  if (reporte.resumen.errores.length > 0) {
    reporte.resumen.estado = 'ADVERTENCIAS';
  }

  return reporte;
}

function imprimirReporte(reporte) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('           REPORTE DE VALIDACIÓN DE CONSISTENCIA GNI');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Fecha: ${new Date(reporte.fecha).toLocaleString('es-MX')}`);
  console.log(`Estado General: ${reporte.resumen.estado === 'OK' ? '✅ OK' : '⚠️  ' + reporte.resumen.estado}`);

  if (reporte.resumen.errores.length > 0) {
    console.log('\nAdvertencias:');
    reporte.resumen.errores.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('                      CATÁLOGOS');
  console.log('─────────────────────────────────────────────────────────────────\n');

  console.log(`  Claves de Gasto:`);
  console.log(`    Excel: ${reporte.catalogos.claves.excel}`);
  console.log(`    BD:    ${reporte.catalogos.claves.bd}`);
  console.log(`    Estado: ${reporte.catalogos.claves.estado}`);

  console.log(`\n  Proveedores:`);
  console.log(`    Excel: ${reporte.catalogos.proveedores.excel}`);
  console.log(`    BD:    ${reporte.catalogos.proveedores.bd}`);
  console.log(`    Estado: ${reporte.catalogos.proveedores.estado}`);

  console.log(`\n  Ejecutivos:`);
  console.log(`    Excel: ${reporte.catalogos.ejecutivos.excel}`);
  console.log(`    BD:    ${reporte.catalogos.ejecutivos.bd}`);
  console.log(`    Estado: ${reporte.catalogos.ejecutivos.estado}`);

  console.log(`\n  Formas de Pago en BD: ${reporte.catalogos.formasPago.bd}`);

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('                      TOTALES');
  console.log('─────────────────────────────────────────────────────────────────\n');

  console.log('  EXCEL:');
  console.log(`    Registros: ${reporte.totales.excel.registros}`);
  console.log(`    Subtotal:  ${formatCurrency(reporte.totales.excel.subtotal)}`);
  console.log(`    IVA:       ${formatCurrency(reporte.totales.excel.iva)}`);
  console.log(`    Total:     ${formatCurrency(reporte.totales.excel.total)}`);

  console.log('\n  BASE DE DATOS:');
  console.log(`    Registros: ${reporte.totales.bd.registros}`);
  console.log(`    Subtotal:  ${formatCurrency(reporte.totales.bd.subtotal)}`);
  console.log(`    IVA:       ${formatCurrency(reporte.totales.bd.iva)}`);
  console.log(`    Total:     ${formatCurrency(reporte.totales.bd.total)}`);

  if (reporte.totales.bd.registros > 0) {
    const diffTotal = reporte.totales.excel.total - reporte.totales.bd.total;
    console.log(`\n  Diferencia Total: ${formatCurrency(Math.abs(diffTotal))} ${diffTotal > 0 ? '(Excel mayor)' : diffTotal < 0 ? '(BD mayor)' : '(Igual)'}`);
  }

  if (reporte.validaciones.length > 0) {
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('                   VALIDACIONES DETALLADAS');
    console.log('─────────────────────────────────────────────────────────────────\n');

    reporte.validaciones.forEach(v => {
      console.log(`  ${v.tipo}:`);
      console.log(`    ${v.mensaje}`);
      if (v.detalle) {
        console.log(`    Ejemplos: ${v.detalle.join(', ')}`);
      }
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('Iniciando validación de consistencia...\n');

  try {
    // Obtener company_id
    const companyId = await obtenerCompanyId();
    if (!companyId) {
      console.error('❌ No se encontró company_id');
      process.exit(1);
    }
    console.log(`Company ID: ${companyId}`);

    // Obtener datos
    console.log('Leyendo datos del Excel...');
    const datosExcel = extraerDatosExcel();

    console.log('Consultando base de datos...');
    const datosBD = await obtenerDatosBD(companyId);
    const catalogosBD = await obtenerCatalogosBD(companyId);

    // Generar e imprimir reporte
    const reporte = generarReporte(datosExcel, datosBD, catalogosBD);
    imprimirReporte(reporte);

    // Retornar código de salida según estado
    process.exit(reporte.resumen.estado === 'OK' ? 0 : 1);

  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
    process.exit(1);
  }
}

main();
