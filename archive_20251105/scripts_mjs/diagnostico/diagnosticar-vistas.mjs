#!/usr/bin/env node

/**
 * DIAGNÓSTICO: Verificar definiciones actuales de vistas en Supabase
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function diagnosticar() {
  console.log('\n🔍 DIAGNÓSTICO DE VISTAS FINANCIERAS\n');
  
  // 1. Verificar que las vistas existen
  console.log('📋 Paso 1: Verificar existencia de vistas...\n');
  
  try {
    const { data: eventos, error: e1 } = await supabase
      .from('vw_eventos_completos')
      .select('*')
      .limit(1);
    
    console.log(e1 ? `❌ vw_eventos_completos: ${e1.message}` : '✅ vw_eventos_completos existe');
    
    const { data: master, error: e2 } = await supabase
      .from('vw_master_facturacion')
      .select('*')
      .limit(1);
    
    console.log(e2 ? `❌ vw_master_facturacion: ${e2.message}` : '✅ vw_master_facturacion existe');
    
    const { data: pendientes, error: e3 } = await supabase
      .from('vw_eventos_pendientes')
      .select('*')
      .limit(1);
    
    console.log(e3 ? `❌ vw_eventos_pendientes: ${e3.message}` : '✅ vw_eventos_pendientes existe');
    
  } catch (error) {
    console.error('❌ Error verificando vistas:', error.message);
  }
  
  // 2. Comparar totales
  console.log('\n📊 Paso 2: Comparar totales reales vs vistas...\n');
  
  const { data: ingresos } = await supabase
    .from('evt_ingresos')
    .select('total, cobrado');
  
  const { data: gastos } = await supabase
    .from('evt_gastos')
    .select('total, pagado');
  
  const { data: vista_eventos } = await supabase
    .from('vw_eventos_completos')
    .select('total, total_gastos, ingresos_pendientes, gastos_pendientes');
  
  const { data: vista_master } = await supabase
    .from('vw_master_facturacion')
    .select('total, total_gastos, ingresos_pendientes, gastos_pendientes');
  
  const totalCobrados = ingresos?.filter(i => i.cobrado === true).reduce((s, i) => s + (i.total || 0), 0) || 0;
  const totalPendientesIngr = ingresos?.filter(i => i.cobrado === false).reduce((s, i) => s + (i.total || 0), 0) || 0;
  const totalPagados = gastos?.filter(g => g.pagado === true).reduce((s, g) => s + (g.total || 0), 0) || 0;
  const totalPendientesGast = gastos?.filter(g => g.pagado === false).reduce((s, g) => s + (g.total || 0), 0) || 0;
  
  const vistaIngresos = vista_eventos?.reduce((s, v) => s + (v.total || 0), 0) || 0;
  const vistaGastos = vista_eventos?.reduce((s, v) => s + (v.total_gastos || 0), 0) || 0;
  const vistaIngPend = vista_eventos?.reduce((s, v) => s + (v.ingresos_pendientes || 0), 0) || 0;
  const vistaGastPend = vista_eventos?.reduce((s, v) => s + (v.gastos_pendientes || 0), 0) || 0;
  
  const masterIngresos = vista_master?.reduce((s, m) => s + (m.total || 0), 0) || 0;
  const masterGastos = vista_master?.reduce((s, m) => s + (m.total_gastos || 0), 0) || 0;
  
  console.log('📈 TOTALES REALES (desde tablas):');
  console.log(`   Ingresos cobrados:    $${totalCobrados.toFixed(2)}`);
  console.log(`   Ingresos pendientes:  $${totalPendientesIngr.toFixed(2)}`);
  console.log(`   Gastos pagados:       $${totalPagados.toFixed(2)}`);
  console.log(`   Gastos pendientes:    $${totalPendientesGast.toFixed(2)}`);
  
  console.log('\n📊 vw_eventos_completos:');
  console.log(`   columna "total":              $${vistaIngresos.toFixed(2)}`);
  console.log(`   columna "total_gastos":       $${vistaGastos.toFixed(2)}`);
  console.log(`   columna "ingresos_pendientes": $${vistaIngPend.toFixed(2)}`);
  console.log(`   columna "gastos_pendientes":   $${vistaGastPend.toFixed(2)}`);
  
  console.log('\n📊 vw_master_facturacion:');
  console.log(`   columna "total":         $${masterIngresos.toFixed(2)}`);
  console.log(`   columna "total_gastos":  $${masterGastos.toFixed(2)}`);
  
  console.log('\n🔍 ANÁLISIS:');
  
  const diffIngEventos = Math.abs(vistaIngresos - totalCobrados);
  const diffGastEventos = Math.abs(vistaGastos - totalPagados);
  const diffIngMaster = Math.abs(masterIngresos - totalCobrados);
  const diffGastMaster = Math.abs(masterGastos - totalPagados);
  
  if (diffIngEventos < 0.01 && diffGastEventos < 0.01) {
    console.log('✅ vw_eventos_completos CORRECTA - Solo incluye cobrados/pagados');
  } else {
    console.log('❌ vw_eventos_completos INCORRECTA');
    console.log(`   Diferencia ingresos: $${diffIngEventos.toFixed(2)}`);
    console.log(`   Diferencia gastos:   $${diffGastEventos.toFixed(2)}`);
  }
  
  if (diffIngMaster < 0.01 && diffGastMaster < 0.01) {
    console.log('✅ vw_master_facturacion CORRECTA - Solo incluye cobrados/pagados');
  } else {
    console.log('❌ vw_master_facturacion INCORRECTA');
    console.log(`   Diferencia ingresos: $${diffIngMaster.toFixed(2)}`);
    console.log(`   Diferencia gastos:   $${diffGastMaster.toFixed(2)}`);
  }
  
  // 3. Verificar si existen las columnas nuevas (ingresos_pendientes, gastos_pendientes)
  console.log('\n🔎 Paso 3: Verificar columnas de pendientes...\n');
  
  if (vista_eventos && vista_eventos.length > 0) {
    const primeraFila = vista_eventos[0];
    const tienePendientes = 'ingresos_pendientes' in primeraFila && 'gastos_pendientes' in primeraFila;
    
    if (tienePendientes) {
      console.log('✅ Vista tiene columnas de pendientes (script V2 se aplicó)');
    } else {
      console.log('❌ Vista NO tiene columnas de pendientes (script antiguo)');
      console.log('   Columnas encontradas:', Object.keys(primeraFila).join(', '));
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('CONCLUSIÓN:');
  console.log('='.repeat(70));
  
  if (diffIngEventos < 0.01 && diffGastEventos < 0.01 && diffIngMaster < 0.01 && diffGastMaster < 0.01) {
    console.log('✅ VISTAS CORREGIDAS CORRECTAMENTE');
    console.log('   El sistema está funcionando como se esperaba.\n');
    process.exit(0);
  } else {
    console.log('❌ VISTAS AÚN TIENEN PROBLEMAS');
    console.log('\n📝 ACCIONES RECOMENDADAS:');
    console.log('   1. Verificar que ejecutaste FIX_VISTAS_FINANCIERAS_V2.sql en Supabase');
    console.log('   2. Refrescar el schema cache en Supabase:');
    console.log('      Ejecuta: NOTIFY pgrst, \'reload schema\';');
    console.log('   3. Si el problema persiste, revisa los errores en SQL Editor');
    console.log('   4. Verifica que tienes permisos para DROP/CREATE VIEW\n');
    process.exit(1);
  }
}

diagnosticar();
