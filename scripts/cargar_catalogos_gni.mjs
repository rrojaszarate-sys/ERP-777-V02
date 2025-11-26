#!/usr/bin/env node
/**
 * SCRIPT: CARGAR CATÁLOGOS GNI DESDE EXCEL
 * Extrae y carga claves de gasto, formas de pago, ejecutivos y proveedores
 * desde el archivo Excel GNI 2025 A PROYECTOS.xlsx
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta al archivo Excel
const EXCEL_PATH = join(__dirname, '..', 'GNI 2025 A PROYECTOS.xlsx');

// Company ID por defecto (cambiar si es necesario)
let COMPANY_ID = null;

// ============================================================================
// FUNCIONES DE EXTRACCIÓN
// ============================================================================

function extraerClavesGasto(workbook) {
  const sheet = workbook.Sheets['CUENTAS'];
  if (!sheet) {
    console.warn('⚠️  Hoja CUENTAS no encontrada');
    return [];
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const claves = [];

  // Saltar header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue; // row[2] es CLAVE

    const subcuenta = row[0]?.toString().trim();
    const cuenta = row[1]?.toString().trim();
    const clave = row[2]?.toString().trim();

    if (subcuenta && cuenta && clave) {
      claves.push({
        clave,
        cuenta,
        subcuenta,
        presupuesto_anual: 0,
        descripcion: null,
        orden_display: i,
        activo: true
      });
    }
  }

  console.log(`📋 Extraídas ${claves.length} claves de gasto`);
  return claves;
}

function extraerFormasPago(workbook) {
  const sheet = workbook.Sheets['CUENTAS'];
  if (!sheet) return [];

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const formasSet = new Set();

  // Columna G (índice 6) contiene FORMA DE PAGO
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const formaPago = row[6]?.toString().trim();
    if (formaPago && formaPago !== '****') {
      formasSet.add(formaPago);
    }
  }

  // También extraer de hojas mensuales
  const meses = ['ENE25', 'FEB25', 'MAR25', 'ABR25', 'MAY25', 'JUN25',
    'JUL25', 'AGO25', 'SEP25', 'OCT25', 'NOV25', 'DIC25'];

  meses.forEach(mes => {
    const sheet = workbook.Sheets[mes];
    if (!sheet) return;

    const data = XLSX.utils.sheet_to_json(sheet);
    data.forEach(row => {
      const fp = row['FORMA DE PAGO']?.toString().trim();
      if (fp) formasSet.add(fp);
    });
  });

  const formas = Array.from(formasSet).map(nombre => ({
    nombre,
    tipo: detectarTipoFormaPago(nombre),
    banco: detectarBanco(nombre),
    descripcion: null,
    activo: true
  }));

  console.log(`💳 Extraídas ${formas.length} formas de pago`);
  return formas;
}

function detectarTipoFormaPago(nombre) {
  const n = nombre.toUpperCase();
  if (n.includes('TRANSFERENCIA')) return 'transferencia';
  if (n.includes('TARJETA') || n.includes('AMEX')) return 'tarjeta';
  if (n.includes('EFECTIVO') || n.includes('CAJA CHICA')) return 'efectivo';
  if (n.includes('CHEQUE')) return 'cheque';
  if (n.includes('TOKA')) return 'tarjeta_servicios';
  if (n.includes('KUSPIT')) return 'transferencia';
  return 'otro';
}

function detectarBanco(nombre) {
  const n = nombre.toUpperCase();
  if (n.includes('SANTANDER')) return 'SANTANDER';
  if (n.includes('BBVA')) return 'BBVA';
  if (n.includes('AMEX')) return 'AMEX';
  if (n.includes('KUSPIT')) return 'KUSPIT';
  if (n.includes('TOKA')) return 'TOKA';
  return null;
}

function extraerEjecutivosYProveedores(workbook) {
  const ejecutivosSet = new Set();
  const proveedoresMap = new Map();

  const meses = ['ENE25', 'FEB25', 'MAR25', 'ABR25', 'MAY25', 'JUN25',
    'JUL25', 'AGO25', 'SEP25', 'OCT25', 'NOV25', 'DIC25'];

  meses.forEach(mes => {
    const sheet = workbook.Sheets[mes];
    if (!sheet) return;

    const data = XLSX.utils.sheet_to_json(sheet);
    data.forEach(row => {
      // Ejecutivos
      const ejecutivo = row['EJECUTIVO']?.toString().trim();
      if (ejecutivo) {
        ejecutivosSet.add(ejecutivo);
      }

      // Proveedores
      const proveedor = row['PROVEEDOR']?.toString().trim();
      if (proveedor && !proveedoresMap.has(proveedor.toUpperCase())) {
        proveedoresMap.set(proveedor.toUpperCase(), {
          razon_social: proveedor,
          rfc: null,
          nombre_comercial: null,
          direccion: null,
          telefono: null,
          email: null,
          contacto_nombre: null,
          modulo_origen: 'contabilidad',
          activo: true
        });
      }
    });
  });

  const ejecutivos = Array.from(ejecutivosSet).map(nombre => ({
    nombre,
    user_id: null,
    departamento: null,
    activo: true
  }));

  const proveedores = Array.from(proveedoresMap.values());

  console.log(`👤 Extraídos ${ejecutivos.length} ejecutivos`);
  console.log(`🏢 Extraídos ${proveedores.length} proveedores`);

  return { ejecutivos, proveedores };
}

// ============================================================================
// FUNCIONES DE CARGA
// ============================================================================

async function obtenerCompanyId() {
  const { data, error } = await supabase
    .from('core_companies')
    .select('id')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error obteniendo company_id:', error.message);
    return null;
  }

  return data?.id;
}

async function cargarClavesGasto(claves, companyId) {
  console.log('\n📋 Cargando claves de gasto...');

  let insertados = 0;
  let existentes = 0;

  for (const clave of claves) {
    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('cont_claves_gasto')
      .select('id')
      .eq('clave', clave.clave)
      .eq('company_id', companyId)
      .single();

    if (existing) {
      existentes++;
      continue;
    }

    const { error } = await supabase
      .from('cont_claves_gasto')
      .insert([{ ...clave, company_id: companyId }]);

    if (error) {
      console.error(`   ❌ Error insertando ${clave.clave}:`, error.message);
    } else {
      insertados++;
    }
  }

  console.log(`   ✅ Insertadas: ${insertados}, Ya existentes: ${existentes}`);
}

async function cargarFormasPago(formas, companyId) {
  console.log('\n💳 Cargando formas de pago...');

  let insertados = 0;
  let existentes = 0;

  for (const forma of formas) {
    const { data: existing } = await supabase
      .from('cont_formas_pago')
      .select('id')
      .eq('nombre', forma.nombre)
      .eq('company_id', companyId)
      .single();

    if (existing) {
      existentes++;
      continue;
    }

    const { error } = await supabase
      .from('cont_formas_pago')
      .insert([{ ...forma, company_id: companyId }]);

    if (error) {
      console.error(`   ❌ Error insertando ${forma.nombre}:`, error.message);
    } else {
      insertados++;
    }
  }

  console.log(`   ✅ Insertadas: ${insertados}, Ya existentes: ${existentes}`);
}

async function cargarEjecutivos(ejecutivos, companyId) {
  console.log('\n👤 Cargando ejecutivos...');

  let insertados = 0;
  let existentes = 0;

  for (const ej of ejecutivos) {
    const { data: existing } = await supabase
      .from('cont_ejecutivos')
      .select('id')
      .ilike('nombre', ej.nombre)
      .eq('company_id', companyId)
      .single();

    if (existing) {
      existentes++;
      continue;
    }

    const { error } = await supabase
      .from('cont_ejecutivos')
      .insert([{ ...ej, company_id: companyId }]);

    if (error) {
      console.error(`   ❌ Error insertando ${ej.nombre}:`, error.message);
    } else {
      insertados++;
    }
  }

  console.log(`   ✅ Insertados: ${insertados}, Ya existentes: ${existentes}`);
}

async function cargarProveedores(proveedores, companyId) {
  console.log('\n🏢 Cargando proveedores...');

  let insertados = 0;
  let existentes = 0;

  for (const prov of proveedores) {
    const { data: existing } = await supabase
      .from('cont_proveedores')
      .select('id')
      .ilike('razon_social', prov.razon_social)
      .eq('company_id', companyId)
      .single();

    if (existing) {
      existentes++;
      continue;
    }

    const { error } = await supabase
      .from('cont_proveedores')
      .insert([{ ...prov, company_id: companyId }]);

    if (error) {
      console.error(`   ❌ Error insertando ${prov.razon_social}:`, error.message);
    } else {
      insertados++;
    }
  }

  console.log(`   ✅ Insertados: ${insertados}, Ya existentes: ${existentes}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('      CARGA DE CATÁLOGOS GNI DESDE EXCEL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Obtener company_id
  COMPANY_ID = await obtenerCompanyId();
  if (!COMPANY_ID) {
    console.error('❌ No se encontró ninguna empresa en la base de datos');
    process.exit(1);
  }
  console.log(`🏢 Company ID: ${COMPANY_ID}\n`);

  // Leer Excel
  console.log(`📁 Leyendo archivo: ${EXCEL_PATH}`);
  let workbook;
  try {
    workbook = XLSX.readFile(EXCEL_PATH);
    console.log(`   Hojas encontradas: ${workbook.SheetNames.join(', ')}\n`);
  } catch (error) {
    console.error('❌ Error leyendo archivo Excel:', error.message);
    process.exit(1);
  }

  // Extraer datos
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    EXTRACCIÓN DE DATOS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const claves = extraerClavesGasto(workbook);
  const formas = extraerFormasPago(workbook);
  const { ejecutivos, proveedores } = extraerEjecutivosYProveedores(workbook);

  // Cargar datos
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    CARGA A BASE DE DATOS');
  console.log('═══════════════════════════════════════════════════════════════');

  await cargarClavesGasto(claves, COMPANY_ID);
  await cargarFormasPago(formas, COMPANY_ID);

  // NO cargar ejecutivos del Excel - ya tenemos la lista oficial de 26 empleados
  // await cargarEjecutivos(ejecutivos, COMPANY_ID);
  console.log('\n👤 Ejecutivos: Usando lista oficial de empleados (26)');

  await cargarProveedores(proveedores, COMPANY_ID);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    RESUMEN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`   📋 Claves de gasto: ${claves.length}`);
  console.log(`   💳 Formas de pago: ${formas.length}`);
  console.log(`   👤 Ejecutivos: ${ejecutivos.length}`);
  console.log(`   🏢 Proveedores: ${proveedores.length}`);

  console.log('\n✅ Proceso completado exitosamente');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
