import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Genera una fecha aleatoria después de la fecha del evento
 * @param {string} fechaEvento - Fecha del evento
 * @param {number} diasMin - Días mínimos después del evento
 * @param {number} diasMax - Días máximos después del evento
 */
function generarFechaAleatoria(fechaEvento, diasMin, diasMax) {
  const fecha = new Date(fechaEvento);
  const diasAleatorios = Math.floor(Math.random() * (diasMax - diasMin + 1)) + diasMin;
  fecha.setDate(fecha.getDate() + diasAleatorios);
  return fecha.toISOString().split('T')[0];
}

/**
 * Asigna fechas a ingresos cobrados
 */
async function asignarFechasIngresos() {
  console.log('\n💰 Asignando fechas a INGRESOS...\n');

  // Obtener ingresos con sus eventos
  const { data: ingresos, error } = await supabase
    .from('evt_ingresos')
    .select(`
      id,
      concepto,
      total,
      cobrado,
      facturado,
      fecha_cobro,
      fecha_facturacion,
      evento_id,
      evt_eventos!inner(fecha_evento, fecha_fin)
    `)
    .eq('activo', true)
    .not('evt_eventos.fecha_evento', 'is', null);

  if (error) {
    console.error('❌ Error al obtener ingresos:', error.message);
    return;
  }

  console.log(`📋 Procesando ${ingresos.length} ingresos\n`);

  let actualizados = 0;

  for (const ingreso of ingresos) {
    const fechaEvento = ingreso.evt_eventos.fecha_evento;
    const fechaFin = ingreso.evt_eventos.fecha_fin || fechaEvento;
    
    let updates = {};
    let descripcion = [];

    // Si está facturado, asignar fecha de facturación
    if (ingreso.facturado && !ingreso.fecha_facturacion) {
      // Facturación: 3-10 días después del evento
      updates.fecha_facturacion = generarFechaAleatoria(fechaFin, 3, 10);
      descripcion.push(`Facturado: ${updates.fecha_facturacion}`);
    }

    // Si está cobrado, asignar fecha de cobro
    if (ingreso.cobrado && !ingreso.fecha_cobro) {
      // Cobro: 15-45 días después del evento (o 5-20 después de facturar)
      const fechaBase = ingreso.fecha_facturacion || updates.fecha_facturacion || fechaFin;
      const diasMin = ingreso.fecha_facturacion || updates.fecha_facturacion ? 5 : 15;
      const diasMax = ingreso.fecha_facturacion || updates.fecha_facturacion ? 20 : 45;
      updates.fecha_cobro = generarFechaAleatoria(fechaBase, diasMin, diasMax);
      descripcion.push(`Cobrado: ${updates.fecha_cobro}`);
    }

    // Actualizar si hay cambios
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('evt_ingresos')
        .update(updates)
        .eq('id', ingreso.id);

      if (!updateError) {
        actualizados++;
        console.log(`✅ Ingreso ${ingreso.id} (${ingreso.concepto}): ${descripcion.join(' | ')}`);
      }
    }
  }

  console.log(`\n📊 Total ingresos actualizados: ${actualizados}`);
}

/**
 * Asigna fechas a gastos pagados
 */
async function asignarFechasGastos() {
  console.log('\n\n💸 Asignando fechas a GASTOS...\n');

  // Obtener gastos con sus eventos
  const { data: gastos, error } = await supabase
    .from('evt_gastos')
    .select(`
      id,
      concepto,
      total,
      pagado,
      comprobado,
      fecha_pago,
      fecha_aprobacion,
      evento_id,
      evt_eventos!inner(fecha_evento, fecha_fin)
    `)
    .eq('activo', true)
    .not('evt_eventos.fecha_evento', 'is', null);

  if (error) {
    console.error('❌ Error al obtener gastos:', error.message);
    return;
  }

  console.log(`📋 Procesando ${gastos.length} gastos\n`);

  let actualizados = 0;

  for (const gasto of gastos) {
    const fechaEvento = gasto.evt_eventos.fecha_evento;
    const fechaFin = gasto.evt_eventos.fecha_fin || fechaEvento;
    
    let updates = {};
    let descripcion = [];

    // Si está comprobado, asignar fecha de aprobación
    if (gasto.comprobado && !gasto.fecha_aprobacion) {
      // Aprobación: puede ser antes o después del evento (-10 a +15 días)
      // Los gastos se pueden aprobar antes del evento (anticipos)
      const diasMin = -10;
      const diasMax = 15;
      updates.fecha_aprobacion = generarFechaAleatoria(fechaEvento, diasMin, diasMax);
      descripcion.push(`Aprobado: ${updates.fecha_aprobacion}`);
    }

    // Si está pagado, asignar fecha de pago
    if (gasto.pagado && !gasto.fecha_pago) {
      // Pago: puede ser antes (anticipo), durante o después del evento
      // Anticipos: -15 a -1 días
      // Pagos normales: 0 a 30 días después
      const esAnticipo = Math.random() < 0.3; // 30% son anticipos
      
      if (esAnticipo) {
        updates.fecha_pago = generarFechaAleatoria(fechaEvento, -15, -1);
        descripcion.push(`Pagado (Anticipo): ${updates.fecha_pago}`);
      } else {
        const fechaBase = gasto.fecha_aprobacion || updates.fecha_aprobacion || fechaFin;
        updates.fecha_pago = generarFechaAleatoria(fechaBase, 0, 30);
        descripcion.push(`Pagado: ${updates.fecha_pago}`);
      }
    }

    // Actualizar si hay cambios
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('evt_gastos')
        .update(updates)
        .eq('id', gasto.id);

      if (!updateError) {
        actualizados++;
        console.log(`✅ Gasto ${gasto.id} (${gasto.concepto}): ${descripcion.join(' | ')}`);
      }
    }
  }

  console.log(`\n📊 Total gastos actualizados: ${actualizados}`);
}

/**
 * Asigna fechas de compromiso a ingresos pendientes
 */
async function asignarFechasCompromiso() {
  console.log('\n\n📅 Asignando fechas de compromiso a INGRESOS PENDIENTES...\n');

  // Obtener ingresos pendientes de cobro con eventos
  const { data: ingresos, error } = await supabase
    .from('evt_ingresos')
    .select(`
      id,
      concepto,
      total,
      cobrado,
      fecha_compromiso,
      evento_id,
      evt_eventos!inner(fecha_evento, fecha_fin)
    `)
    .eq('activo', true)
    .eq('cobrado', false)
    .not('evt_eventos.fecha_evento', 'is', null);

  if (error) {
    console.error('❌ Error al obtener ingresos pendientes:', error.message);
    return;
  }

  console.log(`📋 Procesando ${ingresos.length} ingresos pendientes\n`);

  let actualizados = 0;

  for (const ingreso of ingresos) {
    const fechaFin = ingreso.evt_eventos.fecha_fin || ingreso.evt_eventos.fecha_evento;
    
    // Fecha de compromiso: 7-30 días después del evento
    const fechaCompromiso = generarFechaAleatoria(fechaFin, 7, 30);

    const { error: updateError } = await supabase
      .from('evt_ingresos')
      .update({ fecha_compromiso: fechaCompromiso })
      .eq('id', ingreso.id);

    if (!updateError) {
      actualizados++;
      if (actualizados <= 20) { // Mostrar solo los primeros 20
        console.log(`✅ Ingreso ${ingreso.id}: Compromiso de pago → ${fechaCompromiso}`);
      }
    }
  }

  console.log(`\n📊 Total compromisos asignados: ${actualizados}`);
}

/**
 * Ejecutar todo el proceso
 */
async function ejecutar() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ASIGNACIÓN DE FECHAS CONGRUENTES CON EVENTOS              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await asignarFechasIngresos();
  await asignarFechasGastos();
  await asignarFechasCompromiso();

  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ PROCESO COMPLETADO EXITOSAMENTE                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 RESUMEN:');
  console.log('   • Fechas de facturación: 3-10 días después del evento');
  console.log('   • Fechas de cobro: 5-20 días después de facturar');
  console.log('   • Fechas de pago (anticipos): 15 días antes del evento');
  console.log('   • Fechas de pago (normales): 0-30 días después del evento');
  console.log('   • Fechas de compromiso: 7-30 días después del evento\n');
}

ejecutar().catch(console.error);
