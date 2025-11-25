import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 SCRIPT DE POBLACIÓN DE DATOS ERP-777 V01');
console.log('📅 Fecha:', new Date().toLocaleDateString());
console.log('🎯 Objetivo: Crear datos con utilidad > 30%\n');

// Función para generar fechas aleatorias
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Función para generar RFC válido (formato básico)
function generateValidRFC(prefix) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const date = new Date(1980 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${prefix}${year}${month}${day}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${numbers[Math.floor(Math.random() * numbers.length)]}`;
}

// Función para calcular precios que garanticen utilidad > 30%
function calcularPreciosConUtilidad(eventoIndex, utilidadObjetivo = 0.35) {
  // Base de gastos realista (sin IVA)
  const gastosBase = [
    3500 + (eventoIndex * 200),   // Coordinador
    2800 + (eventoIndex * 150),   // Técnico AV
    1200 + (eventoIndex * 50),    // Personal apoyo
    1800 + (eventoIndex * 100),   // Seguridad
    18000 + (eventoIndex * 800),  // Equipo sonido
    12000 + (eventoIndex * 600),  // Mobiliario
    8500 + (eventoIndex * 400),   // Decoración
    25000 + (eventoIndex * 1200), // Catering
    3500 + (eventoIndex * 200),   // Combustible
    1800 + (eventoIndex * 100),   // Casetas
    2500 + (eventoIndex * 150),   // Seguros
    1500 + (eventoIndex * 80)     // Permisos
  ];
  
  // Calcular total de gastos con IVA
  const subtotalGastos = gastosBase.reduce((sum, gasto) => sum + gasto, 0);
  const ivaGastos = subtotalGastos * 0.16;
  const totalGastos = subtotalGastos + ivaGastos;
  
  // Calcular ingresos necesarios para obtener la utilidad objetivo
  // Fórmula: utilidad = (ingresos - gastos) / ingresos
  // Despejando: ingresos = gastos / (1 - utilidad)
  const ingresosNecesarios = totalGastos / (1 - utilidadObjetivo);
  
  // Distribuir ingresos en 4 conceptos (sin IVA)
  const subtotalIngresos = ingresosNecesarios / 1.16; // Descontar IVA
  
  const distribucionIngresos = [
    subtotalIngresos * 0.45, // 45% - Servicios principales
    subtotalIngresos * 0.25, // 25% - Servicios técnicos
    subtotalIngresos * 0.15, // 15% - Protocolo
    subtotalIngresos * 0.15  // 15% - Catering/Otros
  ];
  
  return {
    ingresos: distribucionIngresos,
    gastos: gastosBase,
    utilidadEsperada: ((ingresosNecesarios - totalGastos) / ingresosNecesarios) * 100
  };
}

// Función principal
async function populateDatabase() {
  try {
    console.log('🧹 PASO 1: Limpiando datos existentes...');
    
    // Eliminar en orden correcto respetando FK
    await supabase.from('evt_gastos').delete().neq('id', 0);
    console.log('   ✅ Gastos eliminados');
    
    await supabase.from('evt_ingresos').delete().neq('id', 0);
    console.log('   ✅ Ingresos eliminados');
    
    await supabase.from('evt_eventos').delete().neq('id', 0);
    console.log('   ✅ Eventos eliminados');
    
    // Opcional: limpiar clientes (comentado para preservar histórico)
    // await supabase.from('evt_clientes').delete().neq('id', 0);
    
    console.log('✅ Limpieza completada\n');

    console.log('👥 PASO 2: Obteniendo TODOS los clientes existentes en BD...');
    
    // Obtener todos los clientes activos existentes en la base de datos
    const { data: clientes, error: errorClientes } = await supabase
      .from('evt_clientes')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: true });

    if (errorClientes) {
      console.error('❌ Error al obtener clientes existentes:', errorClientes);
      return;
    }

    if (!clientes || clientes.length === 0) {
      console.log('⚠️  No se encontraron clientes activos en la base de datos');
      console.log('🔄 Creando clientes de ejemplo...');
      
      // Si no hay clientes, crear algunos de ejemplo
      const clientesData = [
        {
          razon_social: 'Grupo Tecnológico Phoenix SA de CV',
          nombre_comercial: 'Phoenix Tech',
          rfc: generateValidRFC('GTP'),
          sufijo: 'PHX',
          email: 'contacto@phoenixtech.mx',
          telefono: '5551234567',
          direccion_fiscal: 'Av. Reforma 1234, Col. Juárez, 06600, CDMX',
          contacto_principal: 'Roberto Martínez García',
          telefono_contacto: '5551234567',
          email_contacto: 'roberto.martinez@phoenixtech.mx',
          regimen_fiscal: '601',
          uso_cfdi: 'G03',
          metodo_pago: 'PPD',
          forma_pago: '03',
          dias_credito: 30,
          limite_credito: 500000.00,
          activo: true,
          notas: 'Cliente tecnológico especializado en eventos corporativos'
        },
        {
          razon_social: 'Constructora del Valle SA de CV',
          nombre_comercial: 'CDV Construcciones',
          rfc: generateValidRFC('CDV'),
          sufijo: 'CDV',
          email: 'info@cdvalle.com.mx',
          telefono: '5559876543',
          direccion_fiscal: 'Blvd. Insurgentes Sur 456, Col. Roma Norte, 06700, CDMX',
          contacto_principal: 'María Fernanda González López',
          telefono_contacto: '5559876543',
          email_contacto: 'maria.gonzalez@cdvalle.com.mx',
          regimen_fiscal: '601',
          uso_cfdi: 'G03',
          metodo_pago: 'PUE',
          forma_pago: '03',
          dias_credito: 45,
          limite_credito: 750000.00,
          activo: true,
          notas: 'Constructora con eventos de inauguración y ceremonias'
        },
        {
          razon_social: 'Eventos Premier México SA de CV',
          nombre_comercial: 'Premier Events',
          rfc: generateValidRFC('EPM'),
          sufijo: 'EPM',
          email: 'contacto@premiereventsmx.com',
          telefono: '5552468135',
          direccion_fiscal: 'Polanco Business Center, Torre A, 11560, CDMX',
          contacto_principal: 'Carlos Eduardo Ramírez Sánchez',
          telefono_contacto: '5552468135',
          email_contacto: 'carlos.ramirez@premiereventsmx.com',
          regimen_fiscal: '601',
          uso_cfdi: 'G01',
          metodo_pago: 'PPD',
          forma_pago: '04',
          dias_credito: 15,
          limite_credito: 300000.00,
          activo: true,
          notas: 'Empresa especializada en eventos sociales y corporativos de lujo'
        }
      ];

      const { data: clientesCreados, error: errorCreacion } = await supabase
        .from('evt_clientes')
        .insert(clientesData)
        .select();

      if (errorCreacion) {
        console.error('❌ Error al crear clientes de ejemplo:', errorCreacion);
        return;
      }

      clientes.push(...clientesCreados);
    }

    console.log(`   ✅ ${clientes.length} clientes encontrados/creados:`);
    clientes.forEach((cliente, index) => {
      console.log(`      ${index + 1}. ${cliente.nombre_comercial || cliente.razon_social} (${cliente.sufijo || 'SIN_SUFIJO'})`);
    });

    console.log('📅 PASO 3: Creando eventos por cliente...');

    const tiposEvento = [1, 2, 3, 4, 5]; // Conferencia, Corporativo, Social, Comercial, Educativo
    const estadosEvento = [5, 6, 7]; // Completado, Facturado, Cobrado
    const categoriaGastos = [1, 2, 3, 4, 5]; // SPS, RH, Materiales, Combustible, Otros
    const cuentasContables = [5, 6, 7, 8]; // Cuentas de gastos

    // Función para generar eventos dinámicamente basado en el cliente
    function generarEventosParaCliente(cliente) {
      const nombreEmpresa = cliente.nombre_comercial || cliente.razon_social;
      const sufijo = cliente.sufijo || 'CLI';
      
      // Detectar tipo de industria basado en el nombre
      const tiposIndustria = {
        tecnologia: ['tech', 'tecnolog', 'digital', 'software', 'innovation', 'phoenix'],
        construccion: ['construct', 'inmobil', 'desarroll', 'edificacion', 'obra', 'cdv', 'valle'],
        eventos: ['event', 'premier', 'celebracion', 'bodas', 'gala'],
        financiero: ['financ', 'banco', 'inversion', 'capital', 'horizonte', 'corp'],
        inmobiliario: ['inmobil', 'residencial', 'torres', 'luna', 'desarrollo'],
        consultoria: ['consult', 'asesoria', 'servicios', 'profesional'],
        comercial: ['comercial', 'ventas', 'mercado', 'retail'],
        industrial: ['industrial', 'manufactura', 'produccion', 'fabrica']
      };
      
      const nombreLower = nombreEmpresa.toLowerCase();
      let industria = 'general';
      
      for (const [tipo, keywords] of Object.entries(tiposIndustria)) {
        if (keywords.some(keyword => nombreLower.includes(keyword))) {
          industria = tipo;
          break;
        }
      }
      
      // Plantillas de eventos por industria
      const plantillasPorIndustria = {
        tecnologia: [
          `Conferencia Anual de Tecnología ${nombreEmpresa}`,
          `Summit de Innovación Digital ${sufijo}`,
          `Lanzamiento de Productos ${nombreEmpresa}`,
          `Convención de Desarrolladores ${sufijo}`,
          `Seminario de Inteligencia Artificial ${nombreEmpresa}`,
          `Foro de Startups Tecnológicas ${sufijo}`,
          `Capacitación Ejecutiva ${nombreEmpresa}`,
          `Congreso de Transformación Digital ${sufijo}`,
          `Hackathon ${nombreEmpresa} 2024`,
          `Expo Tecnología ${sufijo}`
        ],
        construccion: [
          `Inauguración Proyecto ${nombreEmpresa}`,
          `Ceremonia Primera Piedra ${sufijo}`,
          `Lanzamiento Complejo Residencial ${nombreEmpresa}`,
          `Evento Anual ${sufijo} Partners`,
          `Conferencia de Innovación en Construcción`,
          `Celebración Aniversario ${nombreEmpresa}`,
          `Forum de Arquitectura Sustentable ${sufijo}`,
          `Expo Construcción ${nombreEmpresa}`,
          `Convención Desarrolladores Inmobiliarios`,
          `Presentación Nuevo Proyecto ${sufijo}`
        ],
        eventos: [
          `Gala Anual ${nombreEmpresa}`,
          `Expo ${sufijo} México`,
          `Festival ${nombreEmpresa}`,
          `Convención ${sufijo}`,
          `Summit ${nombreEmpresa}`,
          `Conferencia ${sufijo} Luxury`,
          `Presentación Servicios ${nombreEmpresa}`,
          `Workshop ${sufijo}`,
          `Networking ${nombreEmpresa}`,
          `Celebración ${sufijo} Awards`
        ],
        financiero: [
          `Asamblea Anual ${nombreEmpresa}`,
          `Convención Financiera ${sufijo}`,
          `Seminario Inversiones ${nombreEmpresa}`,
          `Lanzamiento Productos Financieros ${sufijo}`,
          `Conferencia Económica ${nombreEmpresa}`,
          `Forum Banca Digital ${sufijo}`,
          `Congreso Fintech ${nombreEmpresa}`,
          `Presentación Resultados ${sufijo}`,
          `Workshop Inversiones ${nombreEmpresa}`,
          `Summit Financiero ${sufijo}`
        ],
        inmobiliario: [
          `Lanzamiento ${nombreEmpresa} Towers`,
          `Expo Inmobiliaria ${sufijo}`,
          `Ceremonia Inauguración ${nombreEmpresa}`,
          `Convención Brokers ${sufijo}`,
          `Forum Inversión Inmobiliaria ${nombreEmpresa}`,
          `Presentación Proyecto ${sufijo}`,
          `Congreso Desarrolladores ${nombreEmpresa}`,
          `Open House ${sufijo}`,
          `Expo Propiedades ${nombreEmpresa}`,
          `Workshop Inversión ${sufijo}`
        ],
        general: [
          `Conferencia Anual ${nombreEmpresa}`,
          `Convención ${sufijo}`,
          `Lanzamiento Productos ${nombreEmpresa}`,
          `Evento Corporativo ${sufijo}`,
          `Seminario ${nombreEmpresa}`,
          `Workshop ${sufijo}`,
          `Presentación ${nombreEmpresa}`,
          `Reunión Anual ${sufijo}`,
          `Congreso ${nombreEmpresa}`,
          `Forum ${sufijo}`
        ]
      };
      
      return plantillasPorIndustria[industria] || plantillasPorIndustria.general;
    }

    let totalEventos = 0;
    let totalIngresos = 0;
    let totalGastos = 0;

    // Crear eventos para cada cliente existente
    for (const cliente of clientes) {
      const eventosCliente = generarEventosParaCliente(cliente);
      const numEventos = Math.min(eventosCliente.length, Math.floor(Math.random() * 6) + 5); // 5-10 eventos por cliente
      
      console.log(`   🎯 Creando ${numEventos} eventos para ${cliente.nombre_comercial || cliente.razon_social}...`);

      for (let i = 0; i < numEventos; i++) {
        // Generar fecha aleatoria en los últimos 12 meses
        const fechaBase = randomDate(
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Hace 12 meses
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)   // Hace 1 mes
        );

        const fechaEvento = fechaBase.toISOString().split('T')[0];
        
        // Generar sufijo si no existe
        let sufijoCliente = cliente.sufijo;
        if (!sufijoCliente) {
          const nombreLimpio = (cliente.nombre_comercial || cliente.razon_social)
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
            .substring(0, 3);
          sufijoCliente = nombreLimpio.padEnd(3, 'X');
        }
        
        const claveEvento = `${sufijoCliente}-${fechaBase.getFullYear()}${(fechaBase.getMonth() + 1).toString().padStart(2, '0')}-${(i + 1).toString().padStart(3, '0')}`;

        // Crear evento
        const { data: evento, error: errorEvento } = await supabase
          .from('evt_eventos')
          .insert([{
            clave_evento: claveEvento,
            nombre_proyecto: eventosCliente[i],
            descripcion: `${eventosCliente[i]} - Evento corporativo de alto nivel con servicios integrales`,
            cliente_id: cliente.id,
            tipo_evento_id: tiposEvento[i % tiposEvento.length],
            estado_id: estadosEvento[i % estadosEvento.length],
            fecha_evento: fechaEvento,
            fecha_fin: new Date(fechaBase.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora_inicio: '09:00:00',
            hora_fin: '18:00:00',
            lugar: 'Centro de Convenciones WTC, CDMX',
            numero_invitados: 150 + (i * 25),
            presupuesto_estimado: 75000 + (i * 12000),
            iva_porcentaje: 16.00,
            status_facturacion: 'facturado',
            status_pago: 'pagado',
            prioridad: ['alta', 'media', 'urgente'][i % 3],
            fase_proyecto: 'completado',
            notas: `Evento ${i + 1} para ${cliente.nombre_comercial}`,
            activo: true
          }])
          .select()
          .single();

        if (errorEvento) {
          console.error(`❌ Error al crear evento ${claveEvento}:`, errorEvento);
          continue;
        }

        totalEventos++;

        // ========================================
        // CREAR INGRESOS PARA EL EVENTO (4 CONCEPTOS)  
        // ========================================
        
        // Calcular precios que garanticen utilidad > 30%
        const preciosCalculados = calcularPreciosConUtilidad(i, 0.35); // 35% de utilidad
        
        const ingresosEvento = [
          {
            concepto: 'Servicios de organización y coordinación integral',
            descripcion: 'Coordinación logística completa, gestión de proveedores y supervisión ejecutiva',
            precio_unitario: Math.round(preciosCalculados.ingresos[0])
          },
          {
            concepto: 'Servicios técnicos y producción audiovisual',
            descripcion: 'Equipos de sonido, iluminación, proyección y soporte técnico especializado',
            precio_unitario: Math.round(preciosCalculados.ingresos[1])
          },
          {
            concepto: 'Gestión de protocolo y atención ejecutiva',
            descripcion: 'Protocolo para invitados VIP, recepción y atención personalizada',
            precio_unitario: Math.round(preciosCalculados.ingresos[2])
          },
          {
            concepto: 'Servicios de catering y hospitalidad',
            descripcion: 'Servicio completo de alimentos, bebidas y atención gastronómica',
            precio_unitario: Math.round(preciosCalculados.ingresos[3])
          }
        ];

        for (let j = 0; j < ingresosEvento.length; j++) {
          const { error: errorIngreso } = await supabase
            .from('evt_ingresos')
            .insert([{
              evento_id: evento.id,
              cliente_id: cliente.id,
              concepto: ingresosEvento[j].concepto,
              descripcion: ingresosEvento[j].descripcion,
              cantidad: 1,
              precio_unitario: ingresosEvento[j].precio_unitario,
              iva_porcentaje: 16.00,
              fecha_ingreso: new Date(fechaBase.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              referencia: `FACT-${sufijoCliente}-${i + 1}-${j + 1}`,
              facturado: true,
              cobrado: true,
              fecha_facturacion: new Date(fechaBase.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              fecha_cobro: new Date(fechaBase.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              metodo_cobro: 'transferencia',
              estado_id: 4, // PAGADO
              dias_facturacion: 5,
              fecha_limite_facturacion: new Date(fechaBase.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              fecha_compromiso_pago: new Date(fechaBase.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }]);

          if (errorIngreso) {
            console.error(`❌ Error al crear ingreso ${j + 1} para evento ${claveEvento}:`, errorIngreso);
          } else {
            totalIngresos++;
          }
        }

        // ========================================
        // CREAR GASTOS PARA EL EVENTO (10-12)
        // ========================================

        const gastosEvento = [
          { concepto: 'Coordinador senior de eventos', categoria_id: 1, cuenta_id: 6, precio: preciosCalculados.gastos[0], proveedor: 'Coordinación Profesional SC' },
          { concepto: 'Técnico especialista en audiovisuales', categoria_id: 1, cuenta_id: 6, precio: preciosCalculados.gastos[1], proveedor: 'AV Tech Solutions SA' },
          { concepto: 'Personal de apoyo logístico', categoria_id: 2, cuenta_id: 7, precio: preciosCalculados.gastos[2], proveedor: 'Staff Pro México SA' },
          { concepto: 'Servicios de seguridad privada', categoria_id: 2, cuenta_id: 7, precio: preciosCalculados.gastos[3], proveedor: 'Seguridad Integral México' },
          { concepto: 'Renta de equipo de sonido profesional', categoria_id: 3, cuenta_id: 5, precio: preciosCalculados.gastos[4], proveedor: 'Audio Pro Rental SA' },
          { concepto: 'Renta de mobiliario ejecutivo', categoria_id: 3, cuenta_id: 5, precio: preciosCalculados.gastos[5], proveedor: 'Mobiliario Eventos SA' },
          { concepto: 'Decoración y ambientación temática', categoria_id: 3, cuenta_id: 5, precio: preciosCalculados.gastos[6], proveedor: 'Decoración Creativa SA' },
          { concepto: 'Catering y servicios gastronómicos', categoria_id: 3, cuenta_id: 5, precio: preciosCalculados.gastos[7], proveedor: 'Catering Premium México' },
          { concepto: 'Combustible para vehículos de traslado', categoria_id: 4, cuenta_id: 6, precio: preciosCalculados.gastos[8], proveedor: 'Estación Premium' },
          { concepto: 'Casetas de autopista y estacionamientos', categoria_id: 4, cuenta_id: 6, precio: preciosCalculados.gastos[9], proveedor: 'CAPUFE' },
          { concepto: 'Póliza de seguro para evento', categoria_id: 5, cuenta_id: 8, precio: preciosCalculados.gastos[10], proveedor: 'Seguros Empresariales SA' },
          { concepto: 'Permisos y licencias gubernamentales', categoria_id: 5, cuenta_id: 8, precio: preciosCalculados.gastos[11], proveedor: 'Gobierno CDMX' }
        ];

        for (let k = 0; k < gastosEvento.length; k++) {
          const gasto = gastosEvento[k];
          const { error: errorGasto } = await supabase
            .from('evt_gastos')
            .insert([{
              evento_id: evento.id,
              categoria_id: gasto.categoria_id,
              cuenta_id: gasto.cuenta_id,
              concepto: gasto.concepto,
              descripcion: `${gasto.concepto} para ${eventosCliente[i]}`,
              cantidad: 1,
              precio_unitario: gasto.precio,
              iva_porcentaje: 16.00,
              proveedor: gasto.proveedor,
              rfc_proveedor: generateValidRFC(gasto.proveedor.substring(0, 3).toUpperCase()),
              fecha_gasto: new Date(fechaBase.getTime() - (k + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              forma_pago: ['transferencia', 'tarjeta', 'efectivo'][k % 3],
              referencia: `PAG-${sufijoCliente}-${i + 1}-${k + 1}`,
              status_aprobacion: 'aprobado',
              pagado: true,
              comprobado: true,
              fecha_pago: new Date(fechaBase.getTime() - k * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              responsable_pago_id: null,
              notas: `Gasto ${k + 1} para evento ${claveEvento}`,
              activo: true
            }]);

          if (errorGasto) {
            console.error(`❌ Error al crear gasto ${k + 1} para evento ${claveEvento}:`, errorGasto);
          } else {
            totalGastos++;
          }
        }

        console.log(`      ✅ Evento ${claveEvento} completado (4 ingresos, 12 gastos) - Utilidad esperada: ${preciosCalculados.utilidadEsperada.toFixed(1)}%`);
      }
    }

    console.log('\n🎉 POBLACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('⏳ Esperando que los triggers automáticos calculen los totales...\n');

    // Esperar un momento para que los triggers procesen los datos
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ========================================
    // VERIFICACIÓN FINAL
    // ========================================

    console.log('🔍 VERIFICACIÓN FINAL (después de triggers automáticos)...');

    const { data: eventosVerificacion } = await supabase
      .from('evt_eventos')
      .select('id, clave_evento, total, total_gastos, utilidad, margen_utilidad')
      .eq('activo', true);

    let utilidadMinima = 100;
    let utilidadPromedio = 0;
    let eventosConUtilidad = 0;

    if (eventosVerificacion && eventosVerificacion.length > 0) {
      const utilidades = eventosVerificacion
        .filter(e => e.total > 0)
        .map(e => e.margen_utilidad || 0);

      if (utilidades.length > 0) {
        utilidadMinima = Math.min(...utilidades);
        utilidadPromedio = utilidades.reduce((a, b) => a + b, 0) / utilidades.length;
        eventosConUtilidad = utilidades.filter(u => u >= 30).length;
      }
    }

    console.log('📊 RESUMEN FINAL:');
    console.log(`   • Total clientes: ${clientes.length}`);
    console.log(`   • Total eventos: ${totalEventos}`);
    console.log(`   • Total ingresos: ${totalIngresos}`);
    console.log(`   • Total gastos: ${totalGastos}`);
    console.log(`   • Utilidad mínima: ${utilidadMinima.toFixed(2)}%`);
    console.log(`   • Utilidad promedio: ${utilidadPromedio.toFixed(2)}%`);
    console.log(`   • Eventos con utilidad ≥30%: ${eventosConUtilidad}/${totalEventos}`);

    if (utilidadMinima >= 30) {
      console.log('\n✅ ÉXITO: Todas las utilidades superan el objetivo del 30%');
    } else {
      console.log('\n⚠️  ADVERTENCIA: Algunas utilidades están por debajo del 30%');
    }

    console.log('\n🏆 Script ejecutado exitosamente!');
    console.log('🔗 Los triggers automáticos han calculado todos los totales');
    console.log('📈 Datos listos para usar en el sistema ERP-777');

  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

// Ejecutar el script
populateDatabase();