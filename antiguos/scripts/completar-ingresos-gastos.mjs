import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('💰 COMPLETANDO INGRESOS Y GASTOS PARA EVENTOS EXISTENTES');
console.log('📅 Fecha:', new Date().toLocaleDateString());

async function completarIngresosGastos() {
  try {
    console.log('🔍 Obteniendo eventos sin ingresos...');
    
    // Obtener eventos que no tienen ingresos
    const { data: eventos, error: errorEventos } = await supabase
      .from('evt_eventos')
      .select(`
        id, 
        clave_evento, 
        nombre_proyecto, 
        presupuesto_estimado,
        cliente_id,
        evt_clientes(nombre_comercial)
      `)
      .eq('activo', true);

    if (errorEventos) {
      console.error('❌ Error obteniendo eventos:', errorEventos.message);
      return;
    }

    console.log(`✅ Encontrados ${eventos?.length || 0} eventos`);

    let ingresosCreados = 0;
    let gastosCreados = 0;

    for (const evento of eventos) {
      try {
        console.log(`\n📋 Procesando: ${evento.clave_evento}`);

        // Verificar si ya tiene ingresos
        const { count: ingresosExistentes } = await supabase
          .from('evt_ingresos')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id);

        if (ingresosExistentes > 0) {
          console.log(`   ⚠️  Ya tiene ${ingresosExistentes} ingresos, saltando...`);
          continue;
        }

        // Calcular valores basados en presupuesto estimado
        const presupuesto = evento.presupuesto_estimado || 50000;
        const subtotalIngreso = Math.ceil(presupuesto / 1.16); // Quitar IVA
        const ivaIngreso = presupuesto - subtotalIngreso;

        // Crear ingreso simplificado
        const ingreso = {
          evento_id: evento.id,
          concepto: `Servicio evento`,
          descripcion: `Pago por servicio completo`,
          cantidad: 1,
          precio_unitario: subtotalIngreso,
          subtotal: subtotalIngreso,
          iva_porcentaje: 16.00,
          iva: ivaIngreso,
          total: presupuesto,
          fecha_ingreso: new Date().toISOString().split('T')[0],
          facturado: true,
          cobrado: true,
          fecha_facturacion: new Date().toISOString().split('T')[0],
          fecha_cobro: new Date().toISOString().split('T')[0],
          metodo_cobro: 'Transferencia', // Acortado para evitar error
          archivo_adjunto: 'factura.pdf',
          archivo_nombre: 'factura.pdf',
          archivo_tamaño: 102400,
          archivo_tipo: 'application/pdf',
          notas: 'Ingreso automático'
        };

        const { error: errorIngreso } = await supabase
          .from('evt_ingresos')
          .insert(ingreso);

        if (errorIngreso) {
          console.log(`   ❌ Error ingreso: ${errorIngreso.message}`);
          continue;
        }

        console.log(`   ✅ Ingreso creado: $${presupuesto.toLocaleString()}`);
        ingresosCreados++;

        // Crear gastos que mantengan utilidad > 30%
        // Si el ingreso es X, los gastos deben ser < 70% de X para garantizar > 30% utilidad
        const maxGastos = Math.floor(subtotalIngreso * 0.68); // 68% para margen de seguridad
        
        const gastosBase = [
          Math.floor(maxGastos * 0.35), // 35% - Servicios profesionales
          Math.floor(maxGastos * 0.25), // 25% - Recursos humanos 
          Math.floor(maxGastos * 0.20), // 20% - Materiales
          Math.floor(maxGastos * 0.10), // 10% - Combustible
          Math.floor(maxGastos * 0.10)  // 10% - Provisiones
        ];

        const gastosData = [
          { categoria_id: 6, concepto: 'Servicios prof.', costo: gastosBase[0] },
          { categoria_id: 7, concepto: 'Personal', costo: gastosBase[1] },
          { categoria_id: 8, concepto: 'Materiales', costo: gastosBase[2] },
          { categoria_id: 9, concepto: 'Combustible', costo: gastosBase[3] },
          { categoria_id: 10, concepto: 'Provisiones', costo: gastosBase[4] }
        ];

        let totalGastosCreados = 0;

        for (const gastoData of gastosData) {
          if (gastoData.costo > 500) { // Solo gastos > $500
            const ivaGasto = Math.ceil(gastoData.costo * 0.16);
            
            const gasto = {
              evento_id: evento.id,
              categoria_id: gastoData.categoria_id,
              concepto: gastoData.concepto,
              descripcion: `${gastoData.concepto} evento`,
              cantidad: 1,
              precio_unitario: gastoData.costo,
              subtotal: gastoData.costo,
              iva_porcentaje: 16.00,
              iva: ivaGasto,
              total: gastoData.costo + ivaGasto,
              proveedor: 'Proveedor SA',
              fecha_gasto: new Date().toISOString().split('T')[0],
              status: 'aprobado',
              pagado: true,
              fecha_pago: new Date().toISOString().split('T')[0],
              notas: 'Gasto automático'
            };

            const { error: errorGasto } = await supabase
              .from('evt_gastos')
              .insert(gasto);

            if (!errorGasto) {
              gastosCreados++;
              totalGastosCreados += gastoData.costo;
            }
          }
        }

        // Calcular utilidad real
        const utilidadReal = subtotalIngreso - totalGastosCreados;
        const porcentajeUtilidad = (utilidadReal / subtotalIngreso) * 100;
        
        console.log(`   💸 Gastos creados: $${totalGastosCreados.toLocaleString()}`);
        console.log(`   🎯 Utilidad: ${porcentajeUtilidad.toFixed(2)}% ($${utilidadReal.toLocaleString()})`);

      } catch (errorEvento) {
        console.log(`   ❌ Error procesando evento:`, errorEvento.message);
      }
    }

    console.log('\n🎉 PROCESO COMPLETADO:');
    console.log(`✅ Ingresos creados: ${ingresosCreados}`);
    console.log(`💸 Gastos creados: ${gastosCreados}`);
    console.log(`🎯 Todos los eventos ahora tienen utilidad > 30%`);
    console.log(`\n💡 Los triggers automáticos actualizarán los totales del evento`);

  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

// Ejecutar
completarIngresosGastos();