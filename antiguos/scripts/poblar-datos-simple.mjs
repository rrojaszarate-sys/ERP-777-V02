import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🎯 SCRIPT DE POBLACIÓN DE DATOS ERP-777 (VERSIÓN SIMPLIFICADA)');
console.log('📅 Fecha:', new Date().toLocaleDateString());
console.log('🎯 Objetivo: Crear eventos con UTILIDAD SIEMPRE > 30%\n');

// Datos de catálogos obtenidos de la verificación
const ESTADOS = {
  BORRADOR: 1,
  ACUERDO: 2,
  ORDEN_COMPRA: 3,
  EN_EJECUCION: 4,
  FINALIZADO: 5,
  FACTURADO: 6,
  PAGADO: 7,
  CANCELADO: 8
};

const TIPOS_EVENTO = {
  BODA: 21,
  XV_ANOS: 22,
  CORPORATIVO: 23,
  SOCIAL: 24,
  GRADUACION: 25
};

const CATEGORIAS_GASTOS = {
  SPS: 6,
  RH: 7, 
  MATERIALES: 8,
  COMBUSTIBLE: 9,
  PROVISIONES: 10
};

// Función para calcular precios con utilidad garantizada > 30%
function calcularPreciosConUtilidad(costosBase) {
  const costoTotal = costosBase.reduce((sum, costo) => sum + costo, 0);
  
  // Para garantizar > 30% utilidad, necesitamos que:
  // (precio_venta - costo_total) / precio_venta > 0.30
  // precio_venta > costo_total / 0.70
  const precioMinimoSinIVA = Math.ceil(costoTotal / 0.70);
  
  // Agregar margen adicional para asegurar > 30% (35-40%)
  const margenExtra = 1.05 + (Math.random() * 0.10); // 5% a 15% extra
  const precioVentaSinIVA = Math.ceil(precioMinimoSinIVA * margenExtra);
  
  const iva = Math.ceil(precioVentaSinIVA * 0.16);
  const precioVentaConIVA = precioVentaSinIVA + iva;
  
  // Verificar utilidad real
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

async function poblarDatos() {
  try {
    console.log('🔍 PASO 1: Obteniendo clientes existentes...');
    
    const { data: clientes, error: errorClientes } = await supabase
      .from('evt_clientes')
      .select('id, nombre_comercial, razon_social, sufijo, email')
      .eq('activo', true);
    
    if (errorClientes) {
      console.error('❌ Error al obtener clientes:', errorClientes.message);
      return;
    }

    console.log(`✅ Encontrados ${clientes?.length || 0} clientes activos\n`);

    if (!clientes || clientes.length === 0) {
      console.log('⚠️  No hay clientes activos. Terminando proceso.');
      return;
    }

    console.log('🎯 PASO 2: Creando eventos para cada cliente...\n');

    let eventosCreados = 0;
    let ingresosCreados = 0; 
    let gastosCreados = 0;

    for (const cliente of clientes.slice(0, 10)) { // Limitar a 10 clientes para prueba
      try {
        console.log(`\n📋 Procesando: ${cliente.nombre_comercial}`);

        // Determinar tipo de evento basado en el nombre del cliente
        let tipoEvento = TIPOS_EVENTO.CORPORATIVO; // Default
        const nombreLower = cliente.nombre_comercial.toLowerCase();
        
        if (nombreLower.includes('hotel') || nombreLower.includes('resort')) {
          tipoEvento = TIPOS_EVENTO.BODA;
        } else if (nombreLower.includes('escuela') || nombreLower.includes('universidad')) {
          tipoEvento = TIPOS_EVENTO.GRADUACION;
        } else if (nombreLower.includes('social') || nombreLower.includes('club')) {
          tipoEvento = TIPOS_EVENTO.SOCIAL;
        }

        // Generar costos base para el evento
        const costosBase = [
          Math.floor(5000 + Math.random() * 15000), // SPs
          Math.floor(3000 + Math.random() * 8000),  // RH  
          Math.floor(2000 + Math.random() * 12000), // Materiales
          Math.floor(500 + Math.random() * 2000),   // Combustible
          Math.floor(1000 + Math.random() * 5000)   // Provisiones
        ];

        const precios = calcularPreciosConUtilidad(costosBase);

        // Crear evento
        const evento = {
          cliente_id: cliente.id,
          nombre: `Evento ${cliente.sufijo || cliente.nombre_comercial.substring(0, 3)}-${String(eventosCreados + 1).padStart(3, '0')}`,
          descripcion: `Evento corporativo para ${cliente.nombre_comercial}`,
          tipo_evento_id: tipoEvento,
          estado_id: ESTADOS.FINALIZADO, // Para que se calcule la utilidad
          fecha_inicio: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
          fecha_fin: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
          presupuesto_inicial: precios.precioVentaConIVA,
          notas: `Evento generado automáticamente - Utilidad garantizada: ${precios.porcentajeUtilidad.toFixed(2)}%`
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

        console.log(`   ✅ Evento creado: ${eventoCreado.nombre}`);
        eventosCreados++;

        // Crear ingreso
        const ingreso = {
          evento_id: eventoCreado.id,
          concepto: `Pago evento ${cliente.nombre_comercial}`,
          subtotal: precios.precioVentaSinIVA,
          iva: precios.iva,
          total: precios.precioVentaConIVA,
          fecha_ingreso: new Date().toISOString(),
          pagado: true
        };

        const { error: errorIngreso } = await supabase
          .from('evt_ingresos')
          .insert(ingreso);

        if (!errorIngreso) {
          console.log(`   💰 Ingreso creado: $${precios.precioVentaConIVA.toLocaleString()}`);
          ingresosCreados++;
        }

        // Crear gastos por categoría
        const categoriasGastos = [
          { id: CATEGORIAS_GASTOS.SPS, nombre: 'SPs', costo: costosBase[0] },
          { id: CATEGORIAS_GASTOS.RH, nombre: 'RH', costo: costosBase[1] },
          { id: CATEGORIAS_GASTOS.MATERIALES, nombre: 'Materiales', costo: costosBase[2] },
          { id: CATEGORIAS_GASTOS.COMBUSTIBLE, nombre: 'Combustible', costo: costosBase[3] },
          { id: CATEGORIAS_GASTOS.PROVISIONES, nombre: 'Provisiones', costo: costosBase[4] }
        ];

        for (const catGasto of categoriasGastos) {
          if (catGasto.costo > 0) {
            const gasto = {
              evento_id: eventoCreado.id,
              categoria_id: catGasto.id,
              concepto: `${catGasto.nombre} para evento ${eventoCreado.nombre}`,
              subtotal: catGasto.costo,
              iva: Math.ceil(catGasto.costo * 0.16),
              total: catGasto.costo + Math.ceil(catGasto.costo * 0.16),
              fecha_gasto: new Date().toISOString(),
              pagado: true
            };

            const { error: errorGasto } = await supabase
              .from('evt_gastos')
              .insert(gasto);

            if (!errorGasto) {
              gastosCreados++;
            }
          }
        }

        console.log(`   🎯 Utilidad calculada: ${precios.porcentajeUtilidad.toFixed(2)}% (>${precios.utilidad.toLocaleString()})`);

      } catch (errorCliente) {
        console.log(`   ❌ Error procesando cliente ${cliente.nombre_comercial}:`, errorCliente.message);
      }
    }

    console.log('\n🎉 RESUMEN FINAL:');
    console.log(`✅ Eventos creados: ${eventosCreados}`);
    console.log(`💰 Ingresos creados: ${ingresosCreados}`);
    console.log(`💸 Gastos creados: ${gastosCreados}`);
    console.log(`🎯 Utilidad garantizada: > 30% en todos los eventos`);

  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

// Ejecutar población
poblarDatos();