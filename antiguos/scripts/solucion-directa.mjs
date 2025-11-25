import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 SOLUCIÓN DIRECTA - Insertando gastos con SQL directo');

async function insertarGastosSQL() {
  try {
    // Obtener un evento para probar
    const { data: eventos } = await supabase
      .from('evt_eventos')
      .select('id, clave_evento')
      .limit(1);

    if (!eventos || eventos.length === 0) {
      console.log('❌ No hay eventos disponibles');
      return;
    }

    const eventoId = eventos[0].id;
    console.log(`📋 Usando evento ID: ${eventoId} (${eventos[0].clave_evento})`);

    // Primero vamos a intentar con NULL en tipo_comprobante
    console.log('\n🧪 Probando con tipo_comprobante = NULL...');
    
    const { error: errorNull } = await supabase
      .from('evt_gastos')
      .insert({
        evento_id: eventoId,
        categoria_id: 6,
        concepto: 'TEST NULL',
        cantidad: 1,
        precio_unitario: 1000,
        subtotal: 1000,
        total: 1160,
        proveedor: 'Test',
        fecha_gasto: new Date().toISOString().split('T')[0],
        tipo_comprobante: null // Probar con NULL
      });

    if (errorNull) {
      console.log('❌ Error con NULL:', errorNull.message);
      
      // Probar con cada valor permitido
      const valoresPermitidos = ['ticket', 'factura', 'nota', 'otro'];
      
      for (const valor of valoresPermitidos) {
        console.log(`\n🧪 Probando con tipo_comprobante = '${valor}'...`);
        
        const { error } = await supabase
          .from('evt_gastos')
          .insert({
            evento_id: eventoId,
            categoria_id: 6,
            concepto: `TEST ${valor.upper}`,
            cantidad: 1,
            precio_unitario: 1000,
            subtotal: 1000,
            total: 1160,
            proveedor: 'Test',
            fecha_gasto: new Date().toISOString().split('T')[0],
            tipo_comprobante: valor
          });

        if (error) {
          console.log(`❌ Error con '${valor}':`, error.message);
        } else {
          console.log(`✅ ÉXITO con '${valor}'!`);
          
          // Limpiar registro de prueba
          await supabase.from('evt_gastos').delete().eq('concepto', `TEST ${valor.upper}`);
          
          // Ahora crear gastos reales para todos los eventos
          await crearGastosReales(valor);
          break;
        }
      }
      
    } else {
      console.log('✅ ÉXITO con NULL!');
      // Limpiar registro de prueba
      await supabase.from('evt_gastos').delete().eq('concepto', 'TEST NULL');
      
      // Crear gastos reales con NULL
      await crearGastosReales(null);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function crearGastosReales(tipoComprobanteValido) {
  console.log(`\n🎯 Creando gastos reales con tipo_comprobante = ${tipoComprobanteValido}`);
  
  const { data: eventos } = await supabase
    .from('evt_eventos')
    .select(`
      id, 
      clave_evento, 
      evt_ingresos(subtotal)
    `)
    .eq('activo', true);

  let gastosCreados = 0;

  for (const evento of eventos) {
    const { count: gastosExistentes } = await supabase
      .from('evt_gastos')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', evento.id);

    if (gastosExistentes > 0) continue;

    const ingresoSubtotal = evento.evt_ingresos?.[0]?.subtotal || 50000;
    const totalGastosObjetivo = Math.floor(ingresoSubtotal * 0.68);

    const gastosData = [
      { categoria_id: 6, concepto: 'SPs', costo: Math.floor(totalGastosObjetivo * 0.35) },
      { categoria_id: 7, concepto: 'RH', costo: Math.floor(totalGastosObjetivo * 0.25) },
      { categoria_id: 8, concepto: 'Mat', costo: Math.floor(totalGastosObjetivo * 0.25) },
      { categoria_id: 9, concepto: 'Comb', costo: Math.floor(totalGastosObjetivo * 0.08) },
      { categoria_id: 10, concepto: 'Prov', costo: Math.floor(totalGastosObjetivo * 0.07) }
    ];

    for (const gastoData of gastosData) {
      const gasto = {
        evento_id: evento.id,
        categoria_id: gastoData.categoria_id,
        concepto: gastoData.concepto,
        cantidad: 1,
        precio_unitario: gastoData.costo,
        subtotal: gastoData.costo,
        total: gastoData.costo + Math.ceil(gastoData.costo * 0.16),
        proveedor: 'Proveedor',
        fecha_gasto: new Date().toISOString().split('T')[0],
        tipo_comprobante: tipoComprobanteValido
      };

      const { error } = await supabase.from('evt_gastos').insert(gasto);
      
      if (!error) {
        gastosCreados++;
      } else {
        console.log(`❌ Error en ${evento.clave_evento}:`, error.message);
        break;
      }
    }

    if (gastosCreados > 0) {
      const totalGastos = gastosData.reduce((sum, g) => sum + g.costo, 0);
      const utilidad = ingresoSubtotal - totalGastos;
      const porcentajeUtilidad = (utilidad / ingresoSubtotal) * 100;
      
      console.log(`✅ ${evento.clave_evento}: ${porcentajeUtilidad.toFixed(2)}% utilidad`);
    }
  }

  console.log(`\n🎉 Gastos creados: ${gastosCreados}`);
}

insertarGastosSQL();