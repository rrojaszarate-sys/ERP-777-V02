import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const supabaseUrl = 'https://upwhgiqhtxpyxkixmfhy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwd2hnaXFodHhweXhraXhtZmh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjczODE4MDUsImV4cCI6MjA0Mjk1NzgwNX0.SkXQ1n6jwdTqMqnk0iGr2zE8vS-nFqEY1xo2yWcBXco';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ANÁLISIS Y CORRECCIÓN DE GASTOS E INGRESOS');
console.log('='.repeat(60));

async function ejecutarCorreccion() {
  try {
    // =====================================================
    // PASO 1: ANÁLISIS PRELIMINAR
    // =====================================================
    console.log('\n📊 PASO 1: Análisis preliminar de datos...\n');

    // Contar registros actuales
    const { count: countGastos } = await supabase
      .from('evt_gastos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    const { count: countIngresos } = await supabase
      .from('evt_ingresos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    const { count: countEventos } = await supabase
      .from('evt_eventos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    console.log(`✅ Gastos activos: ${countGastos}`);
    console.log(`✅ Ingresos activos: ${countIngresos}`);
    console.log(`✅ Eventos activos: ${countEventos}`);

    // =====================================================
    // PASO 2: IDENTIFICAR INCONSISTENCIAS
    // =====================================================
    console.log('\n🔍 PASO 2: Identificando inconsistencias...\n');

    // Obtener eventos con sus totales calculados
    const { data: eventos, error: eventosError } = await supabase
      .from('evt_eventos')
      .select(`
        id,
        nombre_proyecto,
        total,
        total_gastos,
        utilidad,
        margen_utilidad
      `)
      .eq('activo', true)
      .limit(10);

    if (eventosError) {
      console.error('❌ Error al obtener eventos:', eventosError);
      return;
    }

    console.log('📋 Muestra de eventos actuales:');
    console.table(eventos?.map(e => ({
      Proyecto: e.nombre_proyecto?.substring(0, 30),
      Total: e.total,
      Gastos: e.total_gastos,
      Utilidad: e.utilidad,
      Margen: e.margen_utilidad
    })));

    // Calcular totales reales desde gastos e ingresos
    console.log('\n🔢 Calculando totales REALES desde evt_gastos y evt_ingresos...\n');
    
    for (const evento of eventos || []) {
      // Calcular ingresos reales
      const { data: ingresos } = await supabase
        .from('evt_ingresos')
        .select('total')
        .eq('evento_id', evento.id)
        .eq('activo', true);

      const totalIngresosReal = ingresos?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;

      // Calcular gastos reales
      const { data: gastos } = await supabase
        .from('evt_gastos')
        .select('total')
        .eq('evento_id', evento.id)
        .eq('activo', true);

      const totalGastosReal = gastos?.reduce((sum, g) => sum + (g.total || 0), 0) || 0;

      const utilidadReal = totalIngresosReal - totalGastosReal;
      const margenReal = totalIngresosReal > 0 ? (utilidadReal / totalIngresosReal) * 100 : 0;

      // Comparar
      const difIngresos = Math.abs((evento.total || 0) - totalIngresosReal);
      const difGastos = Math.abs((evento.total_gastos || 0) - totalGastosReal);
      const difUtilidad = Math.abs((evento.utilidad || 0) - utilidadReal);

      if (difIngresos > 0.01 || difGastos > 0.01 || difUtilidad > 0.01) {
        console.log(`⚠️  INCONSISTENCIA en "${evento.nombre_proyecto?.substring(0, 40)}"`);
        console.log(`   Ingresos - DB: $${evento.total?.toFixed(2)} vs Real: $${totalIngresosReal.toFixed(2)} (Dif: $${difIngresos.toFixed(2)})`);
        console.log(`   Gastos   - DB: $${evento.total_gastos?.toFixed(2)} vs Real: $${totalGastosReal.toFixed(2)} (Dif: $${difGastos.toFixed(2)})`);
        console.log(`   Utilidad - DB: $${evento.utilidad?.toFixed(2)} vs Real: $${utilidadReal.toFixed(2)} (Dif: $${difUtilidad.toFixed(2)})`);
        console.log('');
      }
    }

    // =====================================================
    // PASO 3: VERIFICAR VISTAS ACTUALES
    // =====================================================
    console.log('\n📊 PASO 3: Verificando vistas actuales...\n');

    // Verificar vw_eventos_completos
    const { data: vwEventos, error: vwEventosError } = await supabase
      .from('vw_eventos_completos')
      .select('id, nombre_proyecto, total, total_gastos, utilidad, margen_utilidad')
      .limit(5);

    if (vwEventosError) {
      console.log('⚠️  vw_eventos_completos no existe o tiene error:', vwEventosError.message);
    } else {
      console.log('✅ vw_eventos_completos funcional');
      console.table(vwEventos?.map(e => ({
        Proyecto: e.nombre_proyecto?.substring(0, 30),
        Ingresos: e.total,
        Gastos: e.total_gastos,
        Utilidad: e.utilidad,
        Margen: e.margen_utilidad
      })));
    }

    // Verificar vw_master_facturacion
    const { data: vwMaster, error: vwMasterError } = await supabase
      .from('vw_master_facturacion')
      .select('evento_id, evento_nombre, total, total_gastos, utilidad')
      .limit(5);

    if (vwMasterError) {
      console.log('⚠️  vw_master_facturacion no existe o tiene error:', vwMasterError.message);
    } else {
      console.log('\n✅ vw_master_facturacion funcional');
      console.table(vwMaster?.map(e => ({
        Evento: e.evento_nombre?.substring(0, 30),
        Ingresos: e.total,
        Gastos: e.total_gastos,
        Utilidad: e.utilidad
      })));
    }

    // =====================================================
    // PASO 4: RESUMEN Y RECOMENDACIONES
    // =====================================================
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DEL ANÁLISIS');
    console.log('='.repeat(60));
    console.log('\n✅ Datos encontrados:');
    console.log(`   - ${countEventos} eventos activos`);
    console.log(`   - ${countIngresos} ingresos registrados`);
    console.log(`   - ${countGastos} gastos registrados`);

    console.log('\n⚠️  ACCIONES REQUERIDAS:');
    console.log('\n1. EJECUTAR el script SQL de corrección:');
    console.log('   - Archivo: CORRECCION_GASTOS_INGRESOS.sql');
    console.log('   - Este script recreará las vistas para usar SOLO evt_gastos y evt_ingresos');
    
    console.log('\n2. ELIMINAR campos redundantes de evt_eventos (opcional pero recomendado):');
    console.log('   - total (calculado desde evt_ingresos)');
    console.log('   - total_gastos (calculado desde evt_gastos)');
    console.log('   - utilidad (calculado como ingresos - gastos)');
    console.log('   - margen_utilidad (calculado como (utilidad / ingresos) * 100)');

    console.log('\n3. MANTENER campos de proyección en evt_eventos:');
    console.log('   - ganancia_estimada');
    console.log('   - gastos_estimados');
    console.log('   - utilidad_estimada');
    console.log('   - margen_estimado');

    console.log('\n4. VERIFICAR componentes React que usan:');
    console.log('   - MasterFacturacionPage.tsx');
    console.log('   - AccountingStateDashboard.tsx');
    console.log('   - FinancialAnalysisPage.tsx');

    console.log('\n✅ Las vistas recreadas calcularán automáticamente desde evt_gastos/evt_ingresos');
    console.log('✅ No se necesitarán triggers de actualización');
    console.log('✅ Los datos siempre estarán sincronizados');

    console.log('\n' + '='.repeat(60));
    console.log('¿Desea continuar con la corrección? (Requiere acceso a Supabase Dashboard)');
    console.log('Para ejecutar: Copie el contenido de CORRECCION_GASTOS_INGRESOS.sql');
    console.log('al SQL Editor de Supabase Dashboard');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  }
}

// Ejecutar
ejecutarCorreccion().then(() => {
  console.log('\n✅ Análisis completado');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
