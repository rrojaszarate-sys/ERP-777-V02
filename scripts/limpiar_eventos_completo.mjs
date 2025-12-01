/**
 * Script para limpiar TODOS los eventos con sus gastos, ingresos y provisiones
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function limpiarEventos() {
  console.log('🗑️  Iniciando limpieza de eventos...\n');

  try {
    // 1. Contar registros antes de borrar
    const { count: eventosCount } = await supabase
      .from('eventos_erp')
      .select('*', { count: 'exact', head: true });

    const { count: gastosCount } = await supabase
      .from('gastos_erp')
      .select('*', { count: 'exact', head: true });

    const { count: ingresosCount } = await supabase
      .from('ingresos_erp')
      .select('*', { count: 'exact', head: true });

    const { count: provisionesCount } = await supabase
      .from('evt_provisiones')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Registros actuales:');
    console.log('   - Eventos: ' + (eventosCount || 0));
    console.log('   - Gastos: ' + (gastosCount || 0));
    console.log('   - Ingresos: ' + (ingresosCount || 0));
    console.log('   - Provisiones: ' + (provisionesCount || 0));
    console.log('');

    // 2. Borrar provisiones primero (dependen de eventos)
    console.log('🗑️  Borrando provisiones...');
    const { error: errProv } = await supabase
      .from('evt_provisiones')
      .delete()
      .neq('id', 0); // Trick para borrar todos

    if (errProv) console.log('   ⚠️  Error en provisiones:', errProv.message);
    else console.log('   ✅ Provisiones eliminadas');

    // 3. Borrar gastos (dependen de eventos)
    console.log('🗑️  Borrando gastos...');
    const { error: errGastos } = await supabase
      .from('gastos_erp')
      .delete()
      .neq('id', 0);

    if (errGastos) console.log('   ⚠️  Error en gastos:', errGastos.message);
    else console.log('   ✅ Gastos eliminados');

    // 4. Borrar ingresos (dependen de eventos)
    console.log('🗑️  Borrando ingresos...');
    const { error: errIngresos } = await supabase
      .from('ingresos_erp')
      .delete()
      .neq('id', 0);

    if (errIngresos) console.log('   ⚠️  Error en ingresos:', errIngresos.message);
    else console.log('   ✅ Ingresos eliminados');

    // 5. Borrar documentos OCR relacionados
    console.log('🗑️  Borrando documentos OCR...');
    const { error: errOCR } = await supabase
      .from('evt_documentos_ocr')
      .delete()
      .neq('id', 0);

    if (errOCR) console.log('   ⚠️  Error en OCR:', errOCR.message);
    else console.log('   ✅ Documentos OCR eliminados');

    // 6. Borrar eventos
    console.log('🗑️  Borrando eventos...');
    const { error: errEventos } = await supabase
      .from('eventos_erp')
      .delete()
      .neq('id', 0);

    if (errEventos) console.log('   ⚠️  Error en eventos:', errEventos.message);
    else console.log('   ✅ Eventos eliminados');

    // 7. Verificar limpieza
    console.log('\n📊 Verificando limpieza...');

    const { count: eventosAfter } = await supabase
      .from('eventos_erp')
      .select('*', { count: 'exact', head: true });

    const { count: gastosAfter } = await supabase
      .from('gastos_erp')
      .select('*', { count: 'exact', head: true });

    const { count: ingresosAfter } = await supabase
      .from('ingresos_erp')
      .select('*', { count: 'exact', head: true });

    console.log('   - Eventos restantes: ' + (eventosAfter || 0));
    console.log('   - Gastos restantes: ' + (gastosAfter || 0));
    console.log('   - Ingresos restantes: ' + (ingresosAfter || 0));

    console.log('\n✅ Limpieza completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

limpiarEventos();
