import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Marca algunos ingresos con diferentes estados de cobro
 */
async function marcarEstadosIngresos() {
  console.log('\n💰 Marcando estados de INGRESOS...\n');
  
  // Obtener algunos ingresos para marcar
  const { data: ingresos, error } = await supabase
    .from('evt_ingresos')
    .select('id, evento_id, concepto, total, cobrado, facturado')
    .eq('activo', true)
    .limit(50);
  
  if (error) {
    console.error('❌ Error al obtener ingresos:', error.message);
    return;
  }

  console.log(`📋 Encontrados ${ingresos.length} ingresos para procesar\n`);

  let pendientes = 0;
  let cobrados = 0;
  let facturados = 0;

  // Marcar los primeros 15 como NO COBRADOS y NO FACTURADOS
  for (let i = 0; i < 15 && i < ingresos.length; i++) {
    const { error: updateError } = await supabase
      .from('evt_ingresos')
      .update({
        cobrado: false,
        facturado: false,
        fecha_cobro: null,
        fecha_facturacion: null
      })
      .eq('id', ingresos[i].id);
    
    if (!updateError) {
      pendientes++;
      console.log(`✅ Ingreso ${ingresos[i].id}: PENDIENTE (sin cobrar, sin facturar) - $${ingresos[i].total}`);
    }
  }

  // Marcar los siguientes 15 como FACTURADOS pero NO COBRADOS
  for (let i = 15; i < 30 && i < ingresos.length; i++) {
    const { error: updateError } = await supabase
      .from('evt_ingresos')
      .update({
        cobrado: false,
        facturado: true,
        fecha_cobro: null,
        fecha_facturacion: new Date().toISOString()
      })
      .eq('id', ingresos[i].id);
    
    if (!updateError) {
      facturados++;
      console.log(`✅ Ingreso ${ingresos[i].id}: FACTURADO pero NO COBRADO - $${ingresos[i].total}`);
    }
  }

  // Marcar los siguientes 15 como COBRADOS y FACTURADOS
  for (let i = 30; i < 45 && i < ingresos.length; i++) {
    const { error: updateError } = await supabase
      .from('evt_ingresos')
      .update({
        cobrado: true,
        facturado: true,
        fecha_cobro: new Date().toISOString(),
        fecha_facturacion: new Date().toISOString()
      })
      .eq('id', ingresos[i].id);
    
    if (!updateError) {
      cobrados++;
      console.log(`✅ Ingreso ${ingresos[i].id}: COBRADO y FACTURADO - $${ingresos[i].total}`);
    }
  }

  console.log(`\n📊 Resumen Ingresos:`);
  console.log(`   🔴 Pendientes (sin cobrar/facturar): ${pendientes}`);
  console.log(`   🟡 Facturados (sin cobrar): ${facturados}`);
  console.log(`   🟢 Cobrados y facturados: ${cobrados}`);
}

/**
 * Marca algunos gastos con diferentes estados de pago
 */
async function marcarEstadosGastos() {
  console.log('\n💸 Marcando estados de GASTOS...\n');
  
  // Obtener algunos gastos para marcar
  const { data: gastos, error } = await supabase
    .from('evt_gastos')
    .select('id, evento_id, concepto, total, pagado, comprobado')
    .eq('activo', true)
    .limit(50);
  
  if (error) {
    console.error('❌ Error al obtener gastos:', error.message);
    return;
  }

  console.log(`📋 Encontrados ${gastos.length} gastos para procesar\n`);

  let pendientes = 0;
  let comprobados = 0;
  let pagados = 0;

  // Marcar los primeros 15 como NO PAGADOS y NO COMPROBADOS
  for (let i = 0; i < 15 && i < gastos.length; i++) {
    const { error: updateError } = await supabase
      .from('evt_gastos')
      .update({
        pagado: false,
        comprobado: false,
        fecha_pago: null,
        status_aprobacion: 'pendiente'
      })
      .eq('id', gastos[i].id);
    
    if (!updateError) {
      pendientes++;
      console.log(`✅ Gasto ${gastos[i].id}: PENDIENTE (sin pagar, sin comprobar) - $${gastos[i].total}`);
    }
  }

  // Marcar los siguientes 15 como COMPROBADOS pero NO PAGADOS
  for (let i = 15; i < 30 && i < gastos.length; i++) {
    const { error: updateError } = await supabase
      .from('evt_gastos')
      .update({
        pagado: false,
        comprobado: true,
        fecha_pago: null,
        status_aprobacion: 'aprobado'
      })
      .eq('id', gastos[i].id);
    
    if (!updateError) {
      comprobados++;
      console.log(`✅ Gasto ${gastos[i].id}: COMPROBADO pero NO PAGADO - $${gastos[i].total}`);
    }
  }

  // Marcar los siguientes 15 como PAGADOS y COMPROBADOS
  for (let i = 30; i < 45 && i < gastos.length; i++) {
    const { error: updateError } = await supabase
      .from('evt_gastos')
      .update({
        pagado: true,
        comprobado: true,
        fecha_pago: new Date().toISOString(),
        status_aprobacion: 'aprobado'
      })
      .eq('id', gastos[i].id);
    
    if (!updateError) {
      pagados++;
      console.log(`✅ Gasto ${gastos[i].id}: PAGADO y COMPROBADO - $${gastos[i].total}`);
    }
  }

  console.log(`\n📊 Resumen Gastos:`);
  console.log(`   🔴 Pendientes (sin pagar/comprobar): ${pendientes}`);
  console.log(`   🟡 Comprobados (sin pagar): ${comprobados}`);
  console.log(`   🟢 Pagados y comprobados: ${pagados}`);
}

/**
 * Ejecutar todo el proceso
 */
async function ejecutar() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  MARCANDO ESTADOS DE PAGO - INGRESOS Y GASTOS         ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  await marcarEstadosIngresos();
  await marcarEstadosGastos();

  console.log('\n✅ Proceso completado - Estados de pago marcados para pruebas\n');
}

ejecutar().catch(console.error);
