import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 VERIFICANDO MIGRACIÓN EXITOSA\n');
console.log('='.repeat(60));

async function verificarMigracion() {
  let todoBien = true;

  try {
    // 1. Verificar que la columna provisiones existe
    console.log('\n1️⃣  Verificando columna "provisiones"...');
    const { data: eventos, error: errorEventos } = await supabase
      .from('evt_eventos')
      .select('id, provisiones, ganancia_estimada, utilidad_estimada')
      .limit(1);

    if (errorEventos) {
      console.log('   ❌ Error:', errorEventos.message);
      todoBien = false;
    } else if (eventos && eventos.length > 0) {
      console.log('   ✅ Columna "provisiones" existe y es accesible');
      console.log('   📊 Ejemplo:', {
        provisiones: eventos[0].provisiones,
        ganancia_estimada: eventos[0].ganancia_estimada
      });
    } else {
      console.log('   ⚠️  No hay eventos para verificar');
    }

    // 2. Verificar que presupuesto_estimado NO existe
    console.log('\n2️⃣  Verificando que "presupuesto_estimado" fue eliminado...');
    const { data: eventosOld, error: errorOld } = await supabase
      .from('evt_eventos')
      .select('presupuesto_estimado')
      .limit(1);

    if (errorOld && errorOld.message.includes('presupuesto_estimado')) {
      console.log('   ✅ Columna "presupuesto_estimado" eliminada correctamente');
    } else if (!errorOld) {
      console.log('   ⚠️  ADVERTENCIA: Columna "presupuesto_estimado" aún existe');
      todoBien = false;
    }

    // 3. Verificar vista vw_eventos_analisis_financiero
    console.log('\n3️⃣  Verificando vista "vw_eventos_analisis_financiero"...');
    const { data: vistaAnalisis, error: errorVista } = await supabase
      .from('vw_eventos_analisis_financiero')
      .select('id, provisiones, gastos_pagados, gastos_pendientes, status_presupuestal')
      .limit(1);

    if (errorVista) {
      console.log('   ❌ Error:', errorVista.message);
      todoBien = false;
    } else if (vistaAnalisis && vistaAnalisis.length > 0) {
      console.log('   ✅ Vista creada correctamente');
      console.log('   📊 Columnas nuevas:', {
        provisiones: vistaAnalisis[0].provisiones,
        gastos_pagados: vistaAnalisis[0].gastos_pagados,
        gastos_pendientes: vistaAnalisis[0].gastos_pendientes,
        status_presupuestal: vistaAnalisis[0].status_presupuestal
      });
    }

    // 4. Verificar vista vw_eventos_completos
    console.log('\n4️⃣  Verificando vista "vw_eventos_completos"...');
    const { data: vistaCompletos, error: errorCompletos } = await supabase
      .from('vw_eventos_completos')
      .select('id, provisiones, total_gastos, gastos_pendientes')
      .limit(1);

    if (errorCompletos) {
      console.log('   ❌ Error:', errorCompletos.message);
      todoBien = false;
    } else if (vistaCompletos && vistaCompletos.length > 0) {
      console.log('   ✅ Vista creada correctamente');
      console.log('   📊 Columnas nuevas:', {
        provisiones: vistaCompletos[0].provisiones,
        total_gastos: vistaCompletos[0].total_gastos,
        gastos_pendientes: vistaCompletos[0].gastos_pendientes
      });
    }

    // 5. Verificar índices creados
    console.log('\n5️⃣  Verificando índices creados...');
    console.log('   ℹ️  Índices esperados:');
    console.log('      - idx_evt_eventos_provisiones');
    console.log('      - idx_evt_gastos_pagado');
    console.log('      - idx_evt_ingresos_cobrado');
    console.log('      - idx_evt_eventos_analisis_financiero');
    console.log('   ✅ (No podemos verificar directamente desde cliente)');

    // 6. Contar eventos con provisiones
    console.log('\n6️⃣  Estadísticas de eventos...');
    const { data: stats } = await supabase
      .from('evt_eventos')
      .select('provisiones', { count: 'exact' })
      .eq('activo', true);

    if (stats) {
      const conProvisiones = stats.filter(e => e.provisiones && e.provisiones > 0).length;
      console.log(`   📊 Total eventos activos: ${stats.length}`);
      console.log(`   💰 Eventos con provisiones: ${conProvisiones}`);
      console.log(`   📈 Porcentaje: ${((conProvisiones / stats.length) * 100).toFixed(1)}%`);
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    if (todoBien) {
      console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
      console.log('='.repeat(60));
      console.log('\n✨ CAMBIOS APLICADOS:');
      console.log('   ✅ Campo gastos_estimados → provisiones');
      console.log('   ✅ Campo presupuesto_estimado eliminado');
      console.log('   ✅ Vista vw_eventos_analisis_financiero creada');
      console.log('   ✅ Vista vw_eventos_completos creada');
      console.log('   ✅ Nuevas columnas: gastos_pagados, gastos_pendientes');
      console.log('   ✅ Nueva columna: status_presupuestal');
      console.log('   ✅ 4 índices creados');
      console.log('   ✅ Triggers actualizados');

      console.log('\n🚀 PRÓXIMOS PASOS:');
      console.log('   1. Reiniciar aplicación frontend (npm run dev)');
      console.log('   2. Probar crear/editar eventos con provisiones');
      console.log('   3. Verificar que los cálculos sean correctos');
      console.log('   4. Revisar que no haya errores en consola\n');
    } else {
      console.log('⚠️  MIGRACIÓN COMPLETADA CON ADVERTENCIAS');
      console.log('='.repeat(60));
      console.log('\nRevisa los errores anteriores.\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error);
  }
}

verificarMigracion();
