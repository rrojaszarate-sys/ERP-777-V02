import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Genera un estimado con varianza del 5-10%
 * @param {number} valorReal - Valor real
 * @param {boolean} esIngreso - true para ingresos (estimar MÁS), false para gastos (estimar MENOS)
 */
function generarEstimado(valorReal, esIngreso) {
  if (esIngreso) {
    // Ingresos: estimar 5-10% MÁS (optimismo)
    const factor = 1.05 + Math.random() * 0.05; // Entre 1.05 y 1.10
    return Math.round(valorReal * factor * 100) / 100;
  } else {
    // Gastos: estimar 5-10% MENOS (subestimación)
    const factor = 0.90 + Math.random() * 0.05; // Entre 0.90 y 0.95
    return Math.round(valorReal * factor * 100) / 100;
  }
}

/**
 * Calcula el total real de ingresos de un evento
 */
async function calcularIngresoReal(eventoId) {
  const { data, error } = await supabase
    .from('evt_ingresos')
    .select('total')
    .eq('evento_id', eventoId)
    .eq('activo', true);
  
  if (error) {
    console.error(`Error al obtener ingresos del evento ${eventoId}:`, error.message);
    return 0;
  }
  
  return data?.reduce((sum, ing) => sum + (parseFloat(ing.total) || 0), 0) || 0;
}

/**
 * Calcula el total real de gastos de un evento
 */
async function calcularGastoReal(eventoId) {
  const { data, error } = await supabase
    .from('evt_gastos')
    .select('total')
    .eq('evento_id', eventoId)
    .eq('activo', true);
  
  if (error) {
    console.error(`Error al obtener gastos del evento ${eventoId}:`, error.message);
    return 0;
  }
  
  return data?.reduce((sum, gasto) => sum + (parseFloat(gasto.total) || 0), 0) || 0;
}

/**
 * Actualiza un evento con valores estimados
 */
async function actualizarEventoConEstimados(evento) {
  const ingresoReal = await calcularIngresoReal(evento.id);
  const gastoReal = await calcularGastoReal(evento.id);
  
  // Si no hay valores reales, usar el presupuesto estimado o generar uno
  let ingresoEstimado, gastoEstimado;
  
  if (ingresoReal > 0) {
    // Ingreso estimado: 5-10% MAYOR que el real (siempre estimamos de más)
    ingresoEstimado = generarEstimado(ingresoReal, true);
  } else {
    // Si no hay ingreso real, usar presupuesto o generar uno aleatorio
    const presupuesto = parseFloat(evento.presupuesto_estimado) || 100000;
    ingresoEstimado = presupuesto * (1.1 + Math.random() * 0.2); // 110-130% del presupuesto
  }
  
  if (gastoReal > 0) {
    // Gasto estimado: 5-10% MENOR que el real (siempre subestimamos gastos)
    gastoEstimado = generarEstimado(gastoReal, false);
  } else {
    // Si no hay gasto real, estimar 60-70% del ingreso estimado
    gastoEstimado = ingresoEstimado * (0.6 + Math.random() * 0.1);
  }
  
  // Calcular utilidad estimada
  const utilidadEstimada = ingresoEstimado - gastoEstimado;
  const porcentajeUtilidadEstimada = ingresoEstimado > 0 
    ? ((utilidadEstimada / ingresoEstimado) * 100)
    : 0;
  
  // Actualizar el evento
  const { error } = await supabase
    .from('evt_eventos')
    .update({
      ingreso_estimado: ingresoEstimado,
      gastos_estimados: gastoEstimado,
      utilidad_estimada: utilidadEstimada,
      porcentaje_utilidad_estimada: porcentajeUtilidadEstimada,
      updated_at: new Date().toISOString()
    })
    .eq('id', evento.id);
  
  if (error) {
    console.error(`❌ Error actualizando evento ${evento.clave_evento}:`, error.message);
    return false;
  }
  
  console.log(`✅ ${evento.clave_evento}: Ingreso Est: $${ingresoEstimado.toFixed(2)} (Real: $${ingresoReal.toFixed(2)}) | Gasto Est: $${gastoEstimado.toFixed(2)} (Real: $${gastoReal.toFixed(2)})`);
  return true;
}

/**
 * Procesa todos los eventos
 */
async function procesarEventos() {
  console.log('📊 Asignando estimados a eventos...\n');
  
  // Obtener todos los eventos activos
  const { data: eventos, error } = await supabase
    .from('evt_eventos')
    .select('id, clave_evento, presupuesto_estimado')
    .eq('activo', true)
    .order('id', { ascending: true });
  
  if (error) {
    console.error('❌ Error al obtener eventos:', error.message);
    return;
  }
  
  console.log(`📋 Encontrados ${eventos.length} eventos activos\n`);
  
  let exitosos = 0;
  let fallidos = 0;
  
  for (const evento of eventos) {
    const resultado = await actualizarEventoConEstimados(evento);
    if (resultado) {
      exitosos++;
    } else {
      fallidos++;
    }
  }
  
  console.log(`\n🎉 Proceso completado:`);
  console.log(`   ✅ ${exitosos} eventos actualizados exitosamente`);
  console.log(`   ❌ ${fallidos} eventos con errores`);
}

// Ejecutar
procesarEventos().catch(console.error);
