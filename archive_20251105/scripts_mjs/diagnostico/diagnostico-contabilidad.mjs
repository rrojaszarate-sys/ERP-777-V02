#!/usr/bin/env node
/**
 * DIAGNÓSTICO: Submódulos de Contabilidad y Finanzas
 * 
 * Verifica que los datos existan y las queries funcionen correctamente
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                              ║');
console.log('║       🔍 DIAGNÓSTICO: Submódulos Contabilidad y Finanzas                    ║');
console.log('║                                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

async function diagnosticar() {
  try {
    // 1. Verificar estados de eventos
    console.log('📊 1. VERIFICANDO ESTADOS DE EVENTOS');
    console.log('━'.repeat(80));
    
    const { data: estados, error: e1 } = await supabase
      .from('evt_estados')
      .select('id, nombre')
      .order('nombre');
    
    if (e1) {
      console.error('❌ Error al obtener estados:', e1.message);
    } else {
      console.log(`✅ Estados encontrados: ${estados?.length || 0}`);
      estados?.forEach(e => console.log(`   - ${e.nombre}`));
    }
    
    // 2. Verificar distribución de eventos por estado
    console.log('\n📊 2. DISTRIBUCIÓN DE EVENTOS POR ESTADO');
    console.log('━'.repeat(80));
    
    const { data: eventosEstados, error: e2 } = await supabase
      .from('evt_eventos')
      .select(`
        id,
        estado_id,
        estado:estado_id ( nombre )
      `)
      .eq('activo', true);
    
    if (e2) {
      console.error('❌ Error:', e2.message);
    } else {
      const distribucion = (eventosEstados || []).reduce((acc, evento) => {
        const nombreEstado = evento.estado?.nombre || 'Sin estado';
        acc[nombreEstado] = (acc[nombreEstado] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Distribución de eventos activos:');
      Object.entries(distribucion).forEach(([estado, count]) => {
        console.log(`   ${estado}: ${count} evento(s)`);
      });
    }
    
    // 3. Verificar ingresos facturados y pagados
    console.log('\n📊 3. ESTADO DE INGRESOS');
    console.log('━'.repeat(80));
    
    const { data: ingresos, error: e3 } = await supabase
      .from('evt_ingresos')
      .select('id, facturado, pagado, total');
    
    if (e3) {
      console.error('❌ Error:', e3.message);
    } else {
      const total = ingresos?.length || 0;
      const facturados = ingresos?.filter(i => i.facturado).length || 0;
      const pagados = ingresos?.filter(i => i.pagado).length || 0;
      const totalMonto = ingresos?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;
      const pagosMonto = ingresos?.filter(i => i.pagado).reduce((sum, i) => sum + (i.total || 0), 0) || 0;
      
      console.log(`Total ingresos:          ${total}`);
      console.log(`Facturados:              ${facturados} (${((facturados/total)*100).toFixed(1)}%)`);
      console.log(`Pagados:                 ${pagados} (${((pagados/total)*100).toFixed(1)}%)`);
      console.log(`Monto total:             $${totalMonto.toLocaleString()}`);
      console.log(`Monto pagado:            $${pagosMonto.toLocaleString()}`);
      console.log(`Tasa cobranza:           ${((pagosMonto/totalMonto)*100).toFixed(1)}%`);
    }
    
    // 4. Verificar gastos pagados
    console.log('\n📊 4. ESTADO DE GASTOS');
    console.log('━'.repeat(80));
    
    const { data: gastos, error: e4 } = await supabase
      .from('evt_gastos')
      .select('id, pagado, total');
    
    if (e4) {
      console.error('❌ Error:', e4.message);
    } else {
      const total = gastos?.length || 0;
      const pagados = gastos?.filter(g => g.pagado).length || 0;
      const totalMonto = gastos?.reduce((sum, g) => sum + (g.total || 0), 0) || 0;
      const pagosMonto = gastos?.filter(g => g.pagado).reduce((sum, g) => sum + (g.total || 0), 0) || 0;
      
      console.log(`Total gastos:            ${total}`);
      console.log(`Pagados:                 ${pagados} (${((pagados/total)*100).toFixed(1)}%)`);
      console.log(`Monto total:             $${totalMonto.toLocaleString()}`);
      console.log(`Monto pagado:            $${pagosMonto.toLocaleString()}`);
    }
    
    // 5. Simular query del dashboard
    console.log('\n📊 5. SIMULACIÓN QUERY DASHBOARD');
    console.log('━'.repeat(80));
    
    // Obtener eventos por estado específico
    const estadosContables = ['Cerrado', 'Pagos Pendiente', 'Pagados', 'Pagos Vencidos'];
    
    for (const nombreEstado of estadosContables) {
      const { data: eventosEstado, error } = await supabase
        .from('evt_eventos')
        .select(`*,
          estado_id,
          estado:estado_id ( nombre )
        `)
        .eq('activo', true)
        .eq('estado.nombre', nombreEstado);
      
      if (!error) {
        console.log(`${nombreEstado.padEnd(20)}: ${eventosEstado?.length || 0} evento(s)`);
      }
    }
    
    // 6. Verificar pagos vencidos
    console.log('\n📊 6. PAGOS VENCIDOS');
    console.log('━'.repeat(80));
    
    const { data: vencidos, error: e6 } = await supabase
      .from('evt_ingresos')
      .select('total')
      .eq('facturado', true)
      .eq('pagado', false)
      .not('fecha_compromiso_pago', 'is', null)
      .lt('fecha_compromiso_pago', new Date().toISOString().split('T')[0]);
    
    if (e6) {
      console.error('❌ Error:', e6.message);
    } else {
      const count = vencidos?.length || 0;
      const monto = vencidos?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;
      console.log(`Pagos vencidos:          ${count}`);
      console.log(`Monto vencido:           $${monto.toLocaleString()}`);
    }
    
    // 7. Verificar cuentas bancarias
    console.log('\n📊 7. CUENTAS BANCARIAS');
    console.log('━'.repeat(80));
    
    const { data: cuentas, error: e7 } = await supabase
      .from('evt_cuentas_bancarias')
      .select('id, nombre, tipo, activo');
    
    if (e7) {
      console.error('❌ Error:', e7.message);
    } else {
      console.log(`Total cuentas:           ${cuentas?.length || 0}`);
      console.log(`Activas:                 ${cuentas?.filter(c => c.activo).length || 0}`);
      cuentas?.forEach(c => console.log(`   - ${c.nombre} (${c.tipo})`));
    }
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                              ║');
    console.log('║       ✅ DIAGNÓSTICO COMPLETADO                                              ║');
    console.log('║                                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error.message);
    console.error(error);
  }
}

diagnosticar();
