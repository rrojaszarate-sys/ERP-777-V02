import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('💸 SCRIPT FINAL - GASTOS SIMPLIFICADOS');

async function crearGastosSimplificados() {
  try {
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
      console.log(`\n📋 ${evento.clave_evento}`);

      // Verificar gastos existentes
      const { count: gastosExistentes } = await supabase
        .from('evt_gastos')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', evento.id);

      if (gastosExistentes > 0) {
        console.log(`   ⚠️  Ya tiene gastos`);
        continue;
      }

      const ingresoSubtotal = evento.evt_ingresos?.[0]?.subtotal || 50000;
      const totalGastosObjetivo = Math.floor(ingresoSubtotal * 0.68);

      // Solo los campos básicos que sabemos que existen
      const gastosData = [
        { categoria_id: 6, concepto: 'Servicios profesionales', costo: Math.floor(totalGastosObjetivo * 0.35) },
        { categoria_id: 7, concepto: 'Recursos humanos', costo: Math.floor(totalGastosObjetivo * 0.25) },
        { categoria_id: 8, concepto: 'Materiales', costo: Math.floor(totalGastosObjetivo * 0.25) },
        { categoria_id: 9, concepto: 'Combustible', costo: Math.floor(totalGastosObjetivo * 0.08) },
        { categoria_id: 10, concepto: 'Provisiones', costo: Math.floor(totalGastosObjetivo * 0.07) }
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
          proveedor: 'Proveedor SA',
          fecha_gasto: new Date().toISOString().split('T')[0],
          pagado: true
        };

        const { error } = await supabase
          .from('evt_gastos')
          .insert(gasto);

        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
        } else {
          gastosCreados++;
        }
      }

      const totalGastos = gastosData.reduce((sum, g) => sum + g.costo, 0);
      const utilidad = ingresoSubtotal - totalGastos;
      const porcentajeUtilidad = (utilidad / ingresoSubtotal) * 100;
      
      console.log(`   ✅ Gastos: $${totalGastos.toLocaleString()}`);
      console.log(`   🎯 Utilidad: ${porcentajeUtilidad.toFixed(2)}%`);
    }

    console.log(`\n🎉 Gastos creados: ${gastosCreados}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

crearGastosSimplificados();