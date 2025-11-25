import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🎯 SCRIPT FINAL DE POBLACIÓN ERP-777 CON ESTRUCTURA CORRECTA');
console.log('📅 Fecha:', new Date().toLocaleDateString());
console.log('🎯 Objetivo: UTILIDAD SIEMPRE > 30%\n');

// Función para generar clave única de evento
function generarClaveEvento(indice, sufijo = 'EVT') {
  const año = new Date().getFullYear();
  const numero = String(indice).padStart(3, '0');
  return `${sufijo}-${año}-${numero}`;
}

// Función para calcular precios con utilidad > 30%
function calcularPreciosConUtilidad(costosBase) {
  const costoTotal = costosBase.reduce((sum, costo) => sum + costo, 0);
  
  // Para garantizar > 30%: precio_venta > costo_total / 0.70
  const precioMinimoSinIVA = Math.ceil(costoTotal / 0.70);
  const margenExtra = 1.05 + (Math.random() * 0.10); // 5-15% extra
  const precioVentaSinIVA = Math.ceil(precioMinimoSinIVA * margenExtra);
  
  const iva = Math.ceil(precioVentaSinIVA * 0.16);
  const precioVentaConIVA = precioVentaSinIVA + iva;
  
  const utilidad = precioVentaSinIVA - costoTotal;
  const porcentajeUtilidad = (utilidad / precioVentaSinIVA) * 100;
  
  return {
    costoTotal,
    precioVentaSinIVA,
    iva,
    precioVentaConIVA,
    utilidad,
    porcentajeUtilidad
  };
}

async function poblarDatosFinales() {
  try {
    console.log('🔍 PASO 1: Obteniendo clientes y configuración...');
    
    const { data: clientes, error: errorClientes } = await supabase
      .from('evt_clientes')
      .select('id, nombre_comercial, razon_social, sufijo, email')
      .eq('activo', true)
      .limit(15); // Limitamos a 15 para prueba

    if (errorClientes) {
      console.error('❌ Error obteniendo clientes:', errorClientes.message);
      return;
    }

    console.log(`✅ Encontrados ${clientes?.length || 0} clientes\n`);

    let contadorEventos = 1;
    let eventosCreados = 0;
    let ingresosCreados = 0;
    let gastosCreados = 0;

    for (const cliente of clientes) {
      try {
        console.log(`\n📋 Cliente: ${cliente.nombre_comercial}`);

        // Generar costos base realistas
        const costosBase = [
          Math.floor(8000 + Math.random() * 12000),  // Servicios profesionales
          Math.floor(5000 + Math.random() * 10000),  // Recursos humanos
          Math.floor(3000 + Math.random() * 15000),  // Materiales
          Math.floor(800 + Math.random() * 2200),    // Combustible
          Math.floor(2000 + Math.random() * 8000)    // Provisiones
        ];

        const precios = calcularPreciosConUtilidad(costosBase);
        const claveEvento = generarClaveEvento(contadorEventos, cliente.sufijo || 'EVT');

        // Crear evento con estructura real
        const evento = {
          company_id: '00000000-0000-0000-0000-000000000001', // Company ID fijo
          clave_evento: claveEvento,
          nombre_proyecto: `Proyecto ${cliente.nombre_comercial} 2024`,
          descripcion: `Evento corporativo para ${cliente.nombre_comercial} con utilidad garantizada > 30%`,
          cliente_id: cliente.id,
          tipo_evento_id: 23, // Corporativo
          estado_id: 5, // Finalizado (para que calcule utilidad)
          fecha_evento: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          lugar: `Sede ${cliente.nombre_comercial}`,
          numero_invitados: Math.floor(50 + Math.random() * 200),
          presupuesto_estimado: precios.precioVentaConIVA,
          status_facturacion: 'facturado',
          status_pago: 'pagado',
          fase_proyecto: 'completado',
          notas: `Utilidad calculada: ${precios.porcentajeUtilidad.toFixed(2)}%`,
          activo: true
        };

        const { data: eventoCreado, error: errorEvento } = await supabase
          .from('evt_eventos')
          .insert(evento)
          .select()
          .single();

        if (errorEvento) {
          console.log(`   ❌ Error creando evento: ${errorEvento.message}`);
          continue;
        }

        console.log(`   ✅ Evento: ${eventoCreado.clave_evento}`);
        eventosCreados++;

        // Crear ingreso principal
        const ingreso = {
          evento_id: eventoCreado.id,
          concepto: `Servicio integral evento ${cliente.nombre_comercial}`,
          descripcion: `Servicio completo de organización de evento corporativo`,
          cantidad: 1,
          precio_unitario: precios.precioVentaSinIVA,
          subtotal: precios.precioVentaSinIVA,
          iva_porcentaje: 16.00,
          iva: precios.iva,
          total: precios.precioVentaConIVA,
          fecha_ingreso: new Date().toISOString().split('T')[0],
          facturado: true,
          cobrado: true,
          fecha_facturacion: new Date().toISOString().split('T')[0],
          fecha_cobro: new Date().toISOString().split('T')[0],
          metodo_cobro: 'Transferencia bancaria',
          archivo_adjunto: 'placeholder.pdf', // Campo obligatorio
          archivo_nombre: 'factura.pdf',
          archivo_tamaño: 102400,
          archivo_tipo: 'application/pdf',
          notas: 'Ingreso generado automáticamente'
        };

        const { error: errorIngreso } = await supabase
          .from('evt_ingresos')
          .insert(ingreso);

        if (!errorIngreso) {
          console.log(`   💰 Ingreso: $${precios.precioVentaConIVA.toLocaleString()}`);
          ingresosCreados++;
        } else {
          console.log(`   ❌ Error ingreso: ${errorIngreso.message}`);
        }

        // Crear gastos por categoría
        const gastosData = [
          { categoria_id: 6, concepto: 'Servicios profesionales', costo: costosBase[0], proveedor: 'Proveedor SPs SA' },
          { categoria_id: 7, concepto: 'Personal evento', costo: costosBase[1], proveedor: 'Recursos Humanos Corp' },
          { categoria_id: 8, concepto: 'Materiales decoración', costo: costosBase[2], proveedor: 'Materiales Plus SA' },
          { categoria_id: 9, concepto: 'Combustible transporte', costo: costosBase[3], proveedor: 'Gasolinera México' },
          { categoria_id: 10, concepto: 'Provisiones catering', costo: costosBase[4], proveedor: 'Catering Gourmet' }
        ];

        for (const gastoData of gastosData) {
          if (gastoData.costo > 1000) { // Solo gastos significativos
            const ivaGasto = Math.ceil(gastoData.costo * 0.16);
            
            const gasto = {
              evento_id: eventoCreado.id,
              categoria_id: gastoData.categoria_id,
              concepto: gastoData.concepto,
              descripcion: `${gastoData.concepto} para evento ${eventoCreado.clave_evento}`,
              cantidad: 1,
              precio_unitario: gastoData.costo,
              subtotal: gastoData.costo,
              iva_porcentaje: 16.00,
              iva: ivaGasto,
              total: gastoData.costo + ivaGasto,
              proveedor: gastoData.proveedor,
              fecha_gasto: new Date().toISOString().split('T')[0],
              status: 'aprobado',
              pagado: true,
              fecha_pago: new Date().toISOString().split('T')[0],
              notas: 'Gasto generado automáticamente'
            };

            const { error: errorGasto } = await supabase
              .from('evt_gastos')
              .insert(gasto);

            if (!errorGasto) {
              gastosCreados++;
            }
          }
        }

        console.log(`   🎯 Utilidad: ${precios.porcentajeUtilidad.toFixed(2)}% ($${precios.utilidad.toLocaleString()})`);
        contadorEventos++;

      } catch (errorCliente) {
        console.log(`   ❌ Error con ${cliente.nombre_comercial}:`, errorCliente.message);
      }
    }

    console.log('\n🎉 RESUMEN FINAL:');
    console.log(`✅ Eventos creados: ${eventosCreados}`);
    console.log(`💰 Ingresos creados: ${ingresosCreados}`);
    console.log(`💸 Gastos creados: ${gastosCreados}`);
    console.log(`🎯 UTILIDAD GARANTIZADA: > 30% en todos los eventos`);
    console.log(`\n💡 Los triggers automáticos calcularán los totales finales del evento`);

  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

// Ejecutar
poblarDatosFinales();