import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 VERIFICANDO MIGRACIÓN: Análisis de Ingresos Pendientes\n');
console.log('='.repeat(70));

async function verificarMigracion() {
  let todoBien = true;

  try {
    // 1. Verificar vista vw_eventos_analisis_financiero mejorada
    console.log('\n1️⃣  Verificando vista mejorada "vw_eventos_analisis_financiero"...');
    const { data: vistaAnalisis, error: errorVista } = await supabase
      .from('vw_eventos_analisis_financiero')
      .select(`
        id,
        clave_evento,
        cliente_nombre,
        ingresos_cobrados,
        ingresos_pendientes,
        ingresos_totales,
        status_cobro,
        porcentaje_cobro,
        status_financiero_integral,
        dias_desde_evento
      `)
      .limit(1);

    if (errorVista) {
      console.log('   ❌ Error:', errorVista.message);
      console.log('   ⚠️  La vista aún no ha sido actualizada');
      todoBien = false;
    } else if (vistaAnalisis && vistaAnalisis.length > 0) {
      console.log('   ✅ Vista mejorada correctamente');
      console.log('   📊 Nuevos campos verificados:');
      console.log('      • cliente_nombre:', vistaAnalisis[0].cliente_nombre || 'N/A');
      console.log('      • ingresos_cobrados: $' + (vistaAnalisis[0].ingresos_cobrados || 0).toLocaleString());
      console.log('      • ingresos_pendientes: $' + (vistaAnalisis[0].ingresos_pendientes || 0).toLocaleString());
      console.log('      • status_cobro:', vistaAnalisis[0].status_cobro);
      console.log('      • porcentaje_cobro:', vistaAnalisis[0].porcentaje_cobro?.toFixed(1) + '%');
      console.log('      • status_financiero_integral:', vistaAnalisis[0].status_financiero_integral);
      console.log('      • dias_desde_evento:', vistaAnalisis[0].dias_desde_evento);
    } else {
      console.log('   ⚠️  No hay eventos para verificar');
    }

    // 2. Verificar vista vw_eventos_problemas_cobro
    console.log('\n2️⃣  Verificando vista nueva "vw_eventos_problemas_cobro"...');
    const { data: vistaProblemas, error: errorProblemas } = await supabase
      .from('vw_eventos_problemas_cobro')
      .select(`
        id,
        clave_evento,
        cliente_nombre,
        ingresos_pendientes,
        porcentaje_cobrado,
        categoria_urgencia,
        facturas_pendientes
      `)
      .limit(5);

    if (errorProblemas) {
      console.log('   ❌ Error:', errorProblemas.message);
      console.log('   ⚠️  La vista aún no ha sido creada');
      todoBien = false;
    } else {
      console.log('   ✅ Vista creada correctamente');
      if (vistaProblemas && vistaProblemas.length > 0) {
        console.log('   📊 Eventos con problemas de cobro encontrados: ' + vistaProblemas.length);
        console.log('\n   📋 Primeros eventos con cobro pendiente:');
        vistaProblemas.forEach((e, i) => {
          console.log(`\n   ${i + 1}. ${e.clave_evento} - ${e.cliente_nombre || 'Sin cliente'}`);
          console.log(`      Pendiente: $${(e.ingresos_pendientes || 0).toLocaleString()}`);
          console.log(`      Cobrado: ${e.porcentaje_cobrado?.toFixed(1)}%`);
          console.log(`      Urgencia: ${e.categoria_urgencia}`);
          console.log(`      Facturas pendientes: ${e.facturas_pendientes}`);
        });
      } else {
        console.log('   ✅ No hay eventos con problemas de cobro (¡Excelente!)');
      }
    }

    // 3. Estadísticas generales
    console.log('\n3️⃣  Calculando estadísticas generales...');
    const { data: stats } = await supabase
      .from('vw_eventos_analisis_financiero')
      .select('ingresos_cobrados, ingresos_pendientes, status_cobro, status_financiero_integral');

    if (stats && stats.length > 0) {
      const totalEventos = stats.length;
      const totalCobrado = stats.reduce((sum, e) => sum + (e.ingresos_cobrados || 0), 0);
      const totalPendiente = stats.reduce((sum, e) => sum + (e.ingresos_pendientes || 0), 0);
      const totalIngresos = totalCobrado + totalPendiente;

      const porStatus = stats.reduce((acc, e) => {
        acc[e.status_cobro] = (acc[e.status_cobro] || 0) + 1;
        return acc;
      }, {});

      const porStatusFinanciero = stats.reduce((acc, e) => {
        acc[e.status_financiero_integral] = (acc[e.status_financiero_integral] || 0) + 1;
        return acc;
      }, {});

      console.log('\n   📊 ESTADÍSTICAS FINANCIERAS:');
      console.log('   ' + '─'.repeat(66));
      console.log(`   Total de eventos: ${totalEventos}`);
      console.log(`   Total cobrado: $${totalCobrado.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      console.log(`   Total pendiente: $${totalPendiente.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      console.log(`   Total ingresos: $${totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      console.log(`   Porcentaje cobrado global: ${totalIngresos > 0 ? ((totalCobrado / totalIngresos) * 100).toFixed(1) : 0}%`);

      console.log('\n   📈 DISTRIBUCIÓN POR STATUS DE COBRO:');
      console.log('   ' + '─'.repeat(66));
      Object.entries(porStatus).forEach(([status, count]) => {
        const porcentaje = ((count / totalEventos) * 100).toFixed(1);
        const icono = {
          'sin_ingresos': '⚪',
          'cobrado_completo': '🟢',
          'cobro_bueno': '🟡',
          'cobro_parcial': '🟠',
          'cobro_critico': '🔴'
        }[status] || '⚫';
        console.log(`   ${icono} ${status.padEnd(20)}: ${count.toString().padStart(3)} eventos (${porcentaje}%)`);
      });

      console.log('\n   🎯 DISTRIBUCIÓN POR STATUS FINANCIERO INTEGRAL:');
      console.log('   ' + '─'.repeat(66));
      Object.entries(porStatusFinanciero).forEach(([status, count]) => {
        const porcentaje = ((count / totalEventos) * 100).toFixed(1);
        const icono = {
          'saludable': '🟢',
          'atencion': '🟡',
          'critico': '🔴'
        }[status] || '⚫';
        console.log(`   ${icono} ${status.padEnd(20)}: ${count.toString().padStart(3)} eventos (${porcentaje}%)`);
      });
    }

    // 4. Probar función get_evento_financial_summary
    console.log('\n4️⃣  Verificando función "get_evento_financial_summary"...');
    const { data: primerEvento } = await supabase
      .from('evt_eventos')
      .select('id')
      .eq('activo', true)
      .limit(1)
      .single();

    if (primerEvento) {
      const { data: summary, error: errorFunc } = await supabase
        .rpc('get_evento_financial_summary', { p_evento_id: primerEvento.id });

      if (errorFunc) {
        console.log('   ❌ Error:', errorFunc.message);
        console.log('   ⚠️  La función aún no ha sido creada');
        todoBien = false;
      } else if (summary && summary.length > 0) {
        console.log('   ✅ Función creada correctamente');
        console.log('   📊 Ejemplo de resumen financiero (Evento ID: ' + primerEvento.id + '):');
        console.log('\n   ' + '─'.repeat(66));
        console.log('   Concepto'.padEnd(15) + 'Estimado'.padStart(15) + 'Real'.padStart(15) + 'Pendiente'.padStart(15));
        console.log('   ' + '─'.repeat(66));
        summary.forEach(row => {
          console.log(
            '   ' + row.concepto.padEnd(15) +
            ('$' + (row.estimado || 0).toFixed(0)).padStart(15) +
            ('$' + (row.real || 0).toFixed(0)).padStart(15) +
            ('$' + (row.pendiente || 0).toFixed(0)).padStart(15)
          );
        });
        console.log('   ' + '─'.repeat(66));
      }
    }

    // 5. Top 5 eventos con mayor cobro pendiente
    console.log('\n5️⃣  Top 5 eventos con mayor monto pendiente de cobro...');
    const { data: topPendientes } = await supabase
      .from('vw_eventos_problemas_cobro')
      .select('clave_evento, cliente_nombre, ingresos_pendientes, categoria_urgencia, dias_desde_evento')
      .order('ingresos_pendientes', { ascending: false })
      .limit(5);

    if (topPendientes && topPendientes.length > 0) {
      console.log('\n   🔝 EVENTOS CON MAYOR MONTO PENDIENTE:');
      console.log('   ' + '─'.repeat(66));
      topPendientes.forEach((e, i) => {
        const urgenciaIcono = {
          'reciente': '🟢',
          'urgente': '🟡',
          'muy_urgente': '🟠',
          'critico': '🔴'
        }[e.categoria_urgencia] || '⚫';
        console.log(`\n   ${i + 1}. ${e.clave_evento}`);
        console.log(`      Cliente: ${e.cliente_nombre || 'N/A'}`);
        console.log(`      Pendiente: $${(e.ingresos_pendientes || 0).toLocaleString()}`);
        console.log(`      ${urgenciaIcono} ${e.categoria_urgencia} (${e.dias_desde_evento} días)`);
      });
    } else {
      console.log('   ✅ No hay eventos con cobro pendiente');
    }

    // Resumen final
    console.log('\n' + '='.repeat(70));
    if (todoBien) {
      console.log('✅ MIGRACIÓN COMPLETADA Y VERIFICADA EXITOSAMENTE');
      console.log('='.repeat(70));
      console.log('\n✨ MEJORAS IMPLEMENTADAS:');
      console.log('   ✓ Vista vw_eventos_analisis_financiero mejorada');
      console.log('   ✓ Vista vw_eventos_problemas_cobro creada');
      console.log('   ✓ Función get_evento_financial_summary creada');
      console.log('   ✓ Nuevos campos: ingresos_cobrados, ingresos_pendientes');
      console.log('   ✓ Nuevos status: status_cobro, status_financiero_integral');
      console.log('   ✓ Indicador de días desde evento');
      console.log('   ✓ Análisis integral de ingresos y gastos');

      console.log('\n🎯 PRÓXIMOS PASOS:');
      console.log('   1. Revisar la documentación de visualizaciones');
      console.log('   2. Actualizar componentes React para mostrar nuevos campos');
      console.log('   3. Crear dashboards de seguimiento de cobro');
      console.log('   4. Configurar alertas para eventos críticos');

      console.log('\n📚 CONSULTAS ÚTILES:');
      console.log('   Ver archivo: migrations/009_enhance_financial_view_with_income_analysis.sql');
      console.log('   Al final encontrarás 7 ejemplos de queries SQL');

    } else {
      console.log('⚠️  MIGRACIÓN PENDIENTE O CON ERRORES');
      console.log('='.repeat(70));
      console.log('\nRevisa los errores anteriores.');
      console.log('Ejecuta la migración en Supabase Dashboard:');
      const projectRef = process.env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
      console.log(`https://supabase.com/dashboard/project/${projectRef}/sql`);
    }
    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error.message);
    console.error(error);
  }
}

verificarMigracion();
