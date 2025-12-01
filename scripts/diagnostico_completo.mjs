import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
dotenv.config();

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const ERRORES = [];
const ADVERTENCIAS = [];
const OK = [];

function error(msg) { ERRORES.push(msg); console.log('❌', msg); }
function warn(msg) { ADVERTENCIAS.push(msg); console.log('⚠️ ', msg); }
function ok(msg) { OK.push(msg); console.log('✅', msg); }

async function verificarTabla(nombre, requiereDatos = false) {
  const { data, error: e, count } = await supabase
    .from(nombre)
    .select('*', { count: 'exact', head: true });

  if (e) {
    error(`Tabla ${nombre}: ${e.message}`);
    return false;
  }

  if (requiereDatos && count === 0) {
    warn(`Tabla ${nombre} está vacía`);
    return true;
  }

  ok(`Tabla ${nombre}: ${count} registros`);
  return true;
}

async function verificarVista(nombre) {
  const { data, error: e } = await supabase.from(nombre).select('*').limit(1);

  if (e) {
    error(`Vista ${nombre}: ${e.message}`);
    return null;
  }

  if (data && data[0]) {
    ok(`Vista ${nombre}: ${Object.keys(data[0]).length} columnas`);
    return Object.keys(data[0]);
  }

  warn(`Vista ${nombre} sin datos`);
  return [];
}

async function verificarReferenciasEnCodigo() {
  console.log('\n--- REFERENCIAS EN CÓDIGO ---\n');

  const patronesProblematicos = [
    { patron: "from\\('evt_eventos'\\)", descripcion: 'evt_eventos sin _erp' },
    { patron: "from\\('evt_gastos'\\)", descripcion: 'evt_gastos sin _erp' },
    { patron: "from\\('evt_ingresos'\\)", descripcion: 'evt_ingresos sin _erp' },
    { patron: "from\\('evt_clientes'\\)", descripcion: 'evt_clientes sin _erp' },
    { patron: "from\\('evt_provisiones'\\)", descripcion: 'evt_provisiones sin _erp' },
    { patron: "from\\('evt_estados'\\)", descripcion: 'evt_estados sin _erp' },
    { patron: "from\\('users_erp'\\)", descripcion: 'users_erp (debería ser core_users)' },
  ];

  for (const p of patronesProblematicos) {
    try {
      const { stdout } = await execAsync(
        `grep -r "${p.patron}" src/modules/eventos-erp --include="*.ts" --include="*.tsx" -l 2>/dev/null || true`
      );
      const archivos = stdout.trim().split('\n').filter(f => f);
      if (archivos.length > 0) {
        error(`${p.descripcion} en: ${archivos.join(', ')}`);
      } else {
        ok(`No hay referencias a ${p.descripcion}`);
      }
    } catch (e) {
      // Ignorar errores de grep
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('     DIAGNÓSTICO COMPLETO DEL SISTEMA');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. VERIFICAR TABLAS PRINCIPALES
  console.log('--- TABLAS PRINCIPALES ---\n');

  await verificarTabla('evt_eventos_erp', true);
  await verificarTabla('evt_gastos_erp', true);
  await verificarTabla('evt_ingresos_erp', true);
  await verificarTabla('evt_provisiones_erp', true);
  await verificarTabla('evt_clientes_erp', true);
  await verificarTabla('evt_estados_erp', true);
  await verificarTabla('core_users', true);

  // 2. VERIFICAR CATÁLOGOS
  console.log('\n--- CATÁLOGOS ---\n');

  await verificarTabla('cat_categorias_gasto', true);
  await verificarTabla('evt_categorias_gastos_erp');
  await verificarTabla('cat_proveedores');
  await verificarTabla('cat_formas_pago');

  // 3. VERIFICAR VISTAS
  console.log('\n--- VISTAS ---\n');

  const columnasVista = await verificarVista('vw_eventos_analisis_financiero_erp');

  if (columnasVista) {
    const columnasRequeridas = [
      'ingresos_totales', 'gastos_totales', 'provisiones_total', 'utilidad_real', 'margen_real_pct'
    ];

    for (const col of columnasRequeridas) {
      if (columnasVista.includes(col)) {
        ok(`Vista tiene columna: ${col}`);
      } else {
        error(`Vista NO tiene columna: ${col}`);
      }
    }
  }

  // 4. VERIFICAR DATOS ESPECÍFICOS
  console.log('\n--- DATOS EVENTO 1 ---\n');

  const { data: evento1 } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('*')
    .eq('id', 1)
    .single();

  if (evento1) {
    console.log('  Ingresos:', evento1.ingresos_totales?.toLocaleString() || 'NULL');
    console.log('  Gastos:', evento1.gastos_totales?.toLocaleString() || 'NULL');
    console.log('  Provisiones:', evento1.provisiones_total?.toLocaleString() || 'NULL');
    console.log('  Utilidad:', evento1.utilidad_real?.toLocaleString() || 'NULL');
  }

  // 5. VERIFICAR RELACIONES
  console.log('\n--- RELACIONES FK ---\n');

  // Gastos con categoría
  const { data: gastosConCat, count: countGastosCat } = await supabase
    .from('evt_gastos_erp')
    .select('*', { count: 'exact', head: true })
    .not('categoria_id', 'is', null);

  const { count: countGastosTot } = await supabase
    .from('evt_gastos_erp')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (countGastosCat === 0 && countGastosTot > 0) {
    warn(`Gastos SIN categoría: ${countGastosTot}/${countGastosTot} (100%)`);
  } else {
    ok(`Gastos con categoría: ${countGastosCat}/${countGastosTot}`);
  }

  // Provisiones con categoría
  const { count: countProvCat } = await supabase
    .from('evt_provisiones_erp')
    .select('*', { count: 'exact', head: true })
    .not('categoria_id', 'is', null)
    .eq('activo', true);

  const { count: countProvTot } = await supabase
    .from('evt_provisiones_erp')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);

  ok(`Provisiones con categoría: ${countProvCat}/${countProvTot}`);

  // 6. VERIFICAR REFERENCIAS EN CÓDIGO
  await verificarReferenciasEnCodigo();

  // RESUMEN FINAL
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    RESUMEN');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`✅ OK: ${OK.length}`);
  console.log(`⚠️  Advertencias: ${ADVERTENCIAS.length}`);
  console.log(`❌ Errores: ${ERRORES.length}`);

  if (ERRORES.length > 0) {
    console.log('\n--- ERRORES A CORREGIR ---\n');
    ERRORES.forEach((e, i) => console.log(`${i + 1}. ${e}`));
  }

  if (ADVERTENCIAS.length > 0) {
    console.log('\n--- ADVERTENCIAS ---\n');
    ADVERTENCIAS.forEach((w, i) => console.log(`${i + 1}. ${w}`));
  }
}

main().catch(console.error);
