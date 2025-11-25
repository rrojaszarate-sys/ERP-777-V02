import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('💸 CREANDO GASTOS PARA GARANTIZAR UTILIDAD > 30%');

async function crearGastos() {
  try {
    // Obtener eventos con ingresos
    const { data: eventos, error } = await supabase
      .from('evt_eventos')
      .select(`
        id, 
        clave_evento, 
        evt_ingresos(subtotal)
      `)
      .eq('activo', true);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    let gastosCreados = 0;

    for (const evento of eventos) {
      try {
        console.log(`\n📋 ${evento.clave_evento}`);

        // Verificar si ya tiene gastos
        const { count: gastosExistentes } = await supabase
          .from('evt_gastos')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id);

        if (gastosExistentes > 0) {
          console.log(`   ⚠️  Ya tiene gastos, saltando...`);
          continue;
        }

        // Obtener el subtotal del ingreso
        const ingresoSubtotal = evento.evt_ingresos?.[0]?.subtotal || 50000;
        
        // Calcular gastos para tener exactamente 30% utilidad
        // Si utilidad = 30%, entonces gastos = 70% del ingreso
        const totalGastosObjetivo = Math.floor(ingresoSubtotal * 0.68); // 68% para margen

        // Distribuir gastos
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
            iva_porcentaje: 16.00,
            iva: Math.ceil(gastoData.costo * 0.16),
            total: gastoData.costo + Math.ceil(gastoData.costo * 0.16),
            proveedor: 'Proveedor',
            fecha_gasto: new Date().toISOString().split('T')[0],
            status: 'aprobado',
            pagado: true
          };

          const { error: errorGasto } = await supabase
            .from('evt_gastos')
            .insert(gasto);

          if (errorGasto) {
            console.log(`   ❌ Error gasto ${gastoData.concepto}: ${errorGasto.message}`);
          } else {
            gastosCreados++;
          }
        }

        const totalGastos = gastosData.reduce((sum, g) => sum + g.costo, 0);
        const utilidad = ingresoSubtotal - totalGastos;
        const porcentajeUtilidad = (utilidad / ingresoSubtotal) * 100;
        
        console.log(`   ✅ Gastos: $${totalGastos.toLocaleString()}`);
        console.log(`   🎯 Utilidad: ${porcentajeUtilidad.toFixed(2)}%`);

      } catch (e) {
        console.log(`   ❌ Error evento:`, e.message);
      }
    }

    console.log(`\n🎉 Total gastos creados: ${gastosCreados}`);

  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

crearGastos();