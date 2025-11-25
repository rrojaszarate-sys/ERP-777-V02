import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 EJECUTANDO MIGRACIÓN: Análisis de Ingresos Pendientes\n');
console.log('='.repeat(70));

async function ejecutarMigracion() {
  try {
    console.log('\n📖 Leyendo archivo de migración...');
    const sql = readFileSync('./migrations/009_enhance_financial_view_with_income_analysis.sql', 'utf8');

    console.log('✅ Archivo leído exitosamente');
    console.log(`📊 Tamaño: ${(sql.length / 1024).toFixed(2)} KB`);

    console.log('\n⚠️  NOTA IMPORTANTE:');
    console.log('   La API de Supabase no permite ejecutar SQL directamente por seguridad.');
    console.log('   Debes ejecutar manualmente en Supabase Dashboard.\n');

    const projectRef = process.env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

    console.log('='.repeat(70));
    console.log('📋 INSTRUCCIONES PARA EJECUTAR MANUALMENTE:');
    console.log('='.repeat(70));
    console.log('\n1️⃣  Abre el SQL Editor de Supabase:');
    console.log(`   🔗 https://supabase.com/dashboard/project/${projectRef}/sql\n`);

    console.log('2️⃣  Crea una nueva query (botón "New Query")\n');

    console.log('3️⃣  Copia el contenido del archivo:');
    console.log('   📄 migrations/009_enhance_financial_view_with_income_analysis.sql\n');

    console.log('4️⃣  Pega el contenido en el editor SQL\n');

    console.log('5️⃣  Click en "Run" (▶️) para ejecutar\n');

    console.log('6️⃣  Verifica que diga "Success" en la parte superior\n');

    console.log('7️⃣  Ejecuta el script de verificación:');
    console.log('   💻 node verificar-analisis-ingresos.mjs\n');

    console.log('='.repeat(70));
    console.log('\n💡 ALTERNATIVAMENTE:');
    console.log('   Puedes copiar y pegar el SQL directamente desde la terminal.\n');

    console.log('='.repeat(70));
    console.log('📦 CONTENIDO DE LA MIGRACIÓN:');
    console.log('='.repeat(70));
    console.log('');
    console.log('✅ Vista vw_eventos_analisis_financiero (mejorada)');
    console.log('   • Añade análisis completo de ingresos cobrados vs pendientes');
    console.log('   • Status de cobro: sin_ingresos | cobrado_completo | cobro_bueno |');
    console.log('     cobro_parcial | cobro_critico');
    console.log('   • Variación de ingresos (estimado vs real)');
    console.log('   • Status financiero integral del evento');
    console.log('   • Indicador de días desde evento para riesgo de cobro');
    console.log('');
    console.log('✅ Vista vw_eventos_problemas_cobro (nueva)');
    console.log('   • Vista especializada para seguimiento de cuentas por cobrar');
    console.log('   • Categorización por urgencia: reciente | urgente | muy_urgente | critico');
    console.log('   • Filtrada solo a eventos con ingresos pendientes');
    console.log('');
    console.log('✅ Función get_evento_financial_summary (nueva)');
    console.log('   • Resumen financiero rápido de cualquier evento');
    console.log('   • Retorna tabla comparativa: estimado vs real vs pendiente');
    console.log('   • Para ingresos, gastos y utilidad');
    console.log('');
    console.log('✅ 2 índices adicionales para optimización');
    console.log('   • idx_evt_eventos_cliente_fecha');
    console.log('   • idx_evt_ingresos_cobrado_fecha');
    console.log('');
    console.log('='.repeat(70));
    console.log('\n✨ NUEVOS CAMPOS DISPONIBLES:');
    console.log('='.repeat(70));
    console.log('');
    console.log('📊 Ingresos:');
    console.log('   • ingresos_cobrados - Ingresos ya en caja/banco');
    console.log('   • ingresos_pendientes - Por cobrar');
    console.log('   • ingresos_totales - Suma de ambos');
    console.log('   • diferencia_ingresos_absoluta - Cobrados vs estimado');
    console.log('   • variacion_ingresos_porcentaje - % de variación');
    console.log('   • porcentaje_cobro - % cobrado del total registrado');
    console.log('   • status_cobro - Estado del cobro del evento');
    console.log('');
    console.log('💰 Utilidad:');
    console.log('   • utilidad_real - Cobrados - Pagados');
    console.log('   • utilidad_proyectada - Totales - Totales');
    console.log('   • margen_utilidad_real - % de margen sobre cobrados');
    console.log('   • diferencia_utilidad_absoluta - Real vs estimada');
    console.log('');
    console.log('🎯 Status y Alertas:');
    console.log('   • status_financiero_integral - saludable | atencion | critico');
    console.log('   • dias_desde_evento - Para alertas de cobro');
    console.log('   • cliente_nombre - Identificación del cliente');
    console.log('   • estado_nombre - Estado del evento');
    console.log('');
    console.log('='.repeat(70));
    console.log('\n🎓 EJEMPLOS DE USO INCLUIDOS:');
    console.log('='.repeat(70));
    console.log('');
    console.log('Al final del archivo SQL encontrarás 7 ejemplos de queries:');
    console.log('');
    console.log('1. Ver análisis completo de todos los eventos');
    console.log('2. Ver solo eventos con problemas de cobro');
    console.log('3. Eventos críticos (cobro < 50% y > 60 días)');
    console.log('4. Top 10 eventos con mayor monto pendiente');
    console.log('5. Resumen financiero de un evento específico');
    console.log('6. Eventos saludables vs críticos (resumen)');
    console.log('7. Análisis de cobro por cliente');
    console.log('');
    console.log('='.repeat(70));
    console.log('\n🚀 ¡Listo! Sigue las instrucciones arriba para ejecutar.');
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

ejecutarMigracion();
