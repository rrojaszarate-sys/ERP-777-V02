import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gomnouwackzvthpwyric.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU'
);

console.log('🚀 Iniciando población masiva de base de datos (12 meses)...\n');

// Fecha actual: Octubre 12, 2025
const HOY = new Date(2025, 9, 12); // Mes 9 = Octubre

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMonthRange(monthsAgo) {
  const fecha = new Date(HOY);
  fecha.setMonth(fecha.getMonth() - monthsAgo);
  const year = fecha.getFullYear();
  const month = fecha.getMonth();
  
  const inicio = new Date(year, month, 1);
  const fin = new Date(year, month + 1, 0, 23, 59, 59);
  
  return { inicio, fin, year, month: month + 1 };
}

async function populate() {
  try {
    // LIMPIAR DATOS EXISTENTES
    console.log('🧹 Limpiando datos existentes...');
    await supabase.from('evt_ingresos').delete().neq('id', 0);
    await supabase.from('evt_gastos').delete().neq('id', 0);
    await supabase.from('evt_eventos').delete().neq('id', 0);
    await supabase.from('evt_clientes').delete().neq('id', 0);
    console.log('✅ Datos limpiados\n');

    // 1. CREAR CLIENTES (10 clientes para tener variedad)
    console.log('👥 Creando 10 clientes...');
    const clientesData = [
      {
        razon_social: 'Grupo Empresarial Phoenix SA de CV',
        nombre_comercial: 'Grupo Phoenix',
        rfc: 'GEP920315AB7',
        email: 'contacto@phoenix.com',
        telefono: '5551234567',
        direccion_fiscal: 'Av. Reforma 1234, Col. Juárez, CDMX',
        contacto_principal: 'Roberto Martínez García',
        telefono_contacto: '5551234567',
        email_contacto: 'roberto.martinez@phoenix.com',
        activo: true
      },
      {
        razon_social: 'Constructora del Valle SA de CV',
        nombre_comercial: 'CDV Construcciones',
        rfc: 'CDV850622CD9',
        email: 'info@cdvalle.com',
        telefono: '5559876543',
        direccion_fiscal: 'Blvd. Insurgentes 456, Col. Roma, CDMX',
        contacto_principal: 'María González López',
        telefono_contacto: '5559876543',
        email_contacto: 'maria.gonzalez@cdvalle.com',
        activo: true
      },
      {
        razon_social: 'Eventos Premier México SA de CV',
        nombre_comercial: 'Eventos Premier',
        rfc: 'EPM910408EF2',
        email: 'contacto@eventospremier.mx',
        telefono: '5552468135',
        direccion_fiscal: 'Polanco Business Center, CDMX',
        contacto_principal: 'Carlos Ramírez Sánchez',
        telefono_contacto: '5552468135',
        email_contacto: 'carlos@eventospremier.mx',
        activo: true
      },
      {
        razon_social: 'Corporativo Horizonte SA de CV',
        nombre_comercial: 'Horizonte Corp',
        rfc: 'CHR880915GH4',
        email: 'contacto@horizonte.com.mx',
        telefono: '5553698521',
        direccion_fiscal: 'Santa Fe Corporate, Torre B, CDMX',
        contacto_principal: 'Ana Patricia Flores Medina',
        telefono_contacto: '5553698521',
        email_contacto: 'ana.flores@horizonte.com.mx',
        activo: true
      },
      {
        razon_social: 'Desarrollos Inmobiliarios Luna SA de CV',
        nombre_comercial: 'DIL México',
        rfc: 'DIL900725IJ6',
        email: 'info@dilunamx.com',
        telefono: '5557412589',
        direccion_fiscal: 'Av. Constituyentes 789, CDMX',
        contacto_principal: 'Jorge Luis Torres Ramírez',
        telefono_contacto: '5557412589',
        email_contacto: 'jtorres@dilunamx.com',
        activo: true
      },
      {
        razon_social: 'Tecnología Avanzada México SA de CV',
        nombre_comercial: 'TechMx',
        rfc: 'TAM950320KL8',
        email: 'contacto@techmx.com',
        telefono: '5558523697',
        direccion_fiscal: 'Av. Tecnológico 200, Monterrey, NL',
        contacto_principal: 'Luis Fernando Hernández',
        telefono_contacto: '5558523697',
        email_contacto: 'lhernandez@techmx.com',
        activo: true
      },
      {
        razon_social: 'Grupo Restaurantero del Sur SA de CV',
        nombre_comercial: 'GRS Eventos',
        rfc: 'GRS870514MN1',
        email: 'eventos@grsur.com.mx',
        telefono: '5559637412',
        direccion_fiscal: 'Calle Principal 456, Coyoacán, CDMX',
        contacto_principal: 'Patricia Moreno Silva',
        telefono_contacto: '5559637412',
        email_contacto: 'pmoreno@grsur.com.mx',
        activo: true
      },
      {
        razon_social: 'Industrias Manufactureras del Norte SA de CV',
        nombre_comercial: 'IMN Corporativo',
        rfc: 'IMN930607OP3',
        email: 'corporativo@imn.mx',
        telefono: '5552589631',
        direccion_fiscal: 'Parque Industrial Norte, Querétaro, QRO',
        contacto_principal: 'Ricardo Mendoza Pérez',
        telefono_contacto: '5552589631',
        email_contacto: 'rmendoza@imn.mx',
        activo: true
      },
      {
        razon_social: 'Servicios Hoteleros Premium SA de CV',
        nombre_comercial: 'Hotel Premium',
        rfc: 'SHP880225QR5',
        email: 'eventos@hotelpremium.mx',
        telefono: '5553214789',
        direccion_fiscal: 'Zona Hotelera, Cancún, QROO',
        contacto_principal: 'Sofía Jiménez Ruiz',
        telefono_contacto: '5553214789',
        email_contacto: 'sjimenez@hotelpremium.mx',
        activo: true
      },
      {
        razon_social: 'Comercializadora Integral del Pacífico SA de CV',
        nombre_comercial: 'CIP Comercial',
        rfc: 'CIP920118ST7',
        email: 'contacto@cipcomercial.com',
        telefono: '5557894561',
        direccion_fiscal: 'Av. del Mar 789, Mazatlán, SIN',
        contacto_principal: 'Alberto Castro Vega',
        telefono_contacto: '5557894561',
        email_contacto: 'acastro@cipcomercial.com',
        activo: true
      }
    ];

    const { data: clientes, error: errorClientes } = await supabase
      .from('evt_clientes')
      .insert(clientesData)
      .select();

    if (errorClientes) {
      console.error('❌ Error al crear clientes:', errorClientes);
      return;
    }

    console.log(`✅ ${clientes.length} clientes creados\n`);

    // 2. CREAR EVENTOS POR MES (últimos 12 meses)
    console.log('📅 Creando eventos para los últimos 12 meses...\n');
    
    const tiposEvento = [21, 22, 23, 24, 25]; // Boda, XV, Corporativo, Social, Graduación
    const estadosEvento = [1, 2, 3, 4, 5, 6, 7]; // Todos los estados
    const lugares = [
      'Salón Las Rosas', 'Salón Imperial', 'Salón Versalles', 'Salón Crystal',
      'Jardín Botanical', 'Terraza Skyline', 'Hacienda San Miguel', 'Club Campestre',
      'Hotel Fiesta Palace', 'Quinta Los Arcos', 'Salón Real', 'Casa de Campo'
    ];

    const eventosData = [];
    let eventoCounter = 0;
    const estadisticasPorMes = [];

    // Generar eventos para cada uno de los últimos 12 meses
    for (let mesAtras = 11; mesAtras >= 0; mesAtras--) {
      const { inicio, fin, year, month } = getMonthRange(mesAtras);
      const numEventos = randomInt(5, 12); // Entre 5 y 12 eventos por mes
      
      const nombreMes = inicio.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      console.log(`  📆 ${nombreMes}: generando ${numEventos} eventos...`);

      for (let i = 0; i < numEventos; i++) {
        const cliente = clientes[randomInt(0, clientes.length - 1)];
        const fechaEvento = randomDate(inicio, fin);
        const presupuesto = randomInt(80, 500) * 1000; // Entre $80k y $500k
        const subtotal = presupuesto / 1.16;
        const iva = subtotal * 0.16;
        
        eventoCounter++;
        
        eventosData.push({
          clave_evento: `EVT-${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
          nombre_proyecto: `Evento ${tiposEvento[i % tiposEvento.length] === 21 ? 'Boda' : 
                                       tiposEvento[i % tiposEvento.length] === 22 ? 'XV Años' :
                                       tiposEvento[i % tiposEvento.length] === 23 ? 'Corporativo' :
                                       tiposEvento[i % tiposEvento.length] === 24 ? 'Social' : 'Graduación'} ${nombreMes}`,
          descripcion: `Evento ${i + 1} de ${nombreMes} para ${cliente.nombre_comercial}`,
          cliente_id: cliente.id,
          tipo_evento_id: tiposEvento[i % tiposEvento.length],
          estado_id: estadosEvento[i % estadosEvento.length],
          fecha_evento: fechaEvento.toISOString().split('T')[0],
          lugar: lugares[randomInt(0, lugares.length - 1)],
          numero_invitados: randomInt(50, 500),
          presupuesto_estimado: presupuesto,
          subtotal: parseFloat(subtotal.toFixed(2)),
          iva: parseFloat(iva.toFixed(2)),
          total: presupuesto,
          fase_proyecto: ['cotizacion', 'planeacion', 'ejecucion', 'finalizado'][randomInt(0, 3)],
          status_pago: ['pendiente', 'parcial', 'pagado'][randomInt(0, 2)],
          activo: true,
          created_at: new Date(fechaEvento.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString() // Creado 30 días antes
        });
      }

      estadisticasPorMes.push({ mes: nombreMes, cantidad: numEventos });
    }

    console.log(`\n✅ Preparados ${eventosData.length} eventos en total\n`);
    console.log('💾 Insertando eventos en la base de datos...');

    const { data: eventos, error: errorEventos } = await supabase
      .from('evt_eventos')
      .insert(eventosData)
      .select();

    if (errorEventos) {
      console.error('❌ Error al crear eventos:', errorEventos);
      return;
    }

    console.log(`✅ ${eventos.length} eventos creados\n`);

    // 3. CREAR GASTOS (3-8 gastos por evento)
    console.log('💸 Creando gastos...');
    const gastosData = [];
    const categorias = [6, 7, 8, 9, 10]; // SPs, RH, Materiales, Combustible, Provisiones
    const proveedores = [
      'Proveedor Alpha', 'Proveedor Beta', 'Proveedor Gamma', 'Proveedor Delta',
      'Proveedora Epsilon', 'Comercial Zeta', 'Servicios Theta', 'Distribuidora Omega'
    ];

    let totalGastosCounter = 0;
    for (const evento of eventos) {
      const numGastos = randomInt(3, 8);
      
      for (let i = 0; i < numGastos; i++) {
        const cantidad = randomInt(1, 10);
        const precioUnitario = randomInt(500, 15000);
        const subtotal = cantidad * precioUnitario;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        gastosData.push({
          evento_id: evento.id,
          categoria_id: categorias[randomInt(0, categorias.length - 1)],
          concepto: `Gasto ${['servicios', 'materiales', 'logística', 'catering', 'decoración', 'mobiliario', 'equipo', 'transporte'][i % 8]}`,
          descripcion: `Compra/servicio para ${evento.nombre_proyecto}`,
          cantidad: cantidad,
          precio_unitario: parseFloat(precioUnitario.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          iva: parseFloat(iva.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          proveedor: proveedores[randomInt(0, proveedores.length - 1)],
          fecha_gasto: randomDate(
            new Date(evento.created_at),
            new Date(evento.fecha_evento)
          ).toISOString().split('T')[0],
          forma_pago: ['03', '01', '04'][randomInt(0, 2)],
          tipo_comprobante: ['I', 'E', 'T'][randomInt(0, 2)],
          status_aprobacion: randomInt(0, 10) > 2 ? 'aprobado' : 'pendiente', // 80% aprobados
          activo: true
        });
        totalGastosCounter++;
      }
    }

    console.log(`💾 Insertando ${gastosData.length} gastos...`);

    // Insertar en lotes de 500 para evitar timeouts
    const BATCH_SIZE = 500;
    let gastosCreados = 0;
    
    for (let i = 0; i < gastosData.length; i += BATCH_SIZE) {
      const batch = gastosData.slice(i, i + BATCH_SIZE);
      const { error: errorGastos } = await supabase
        .from('evt_gastos')
        .insert(batch);

      if (errorGastos) {
        console.error(`❌ Error al crear gastos (lote ${i / BATCH_SIZE + 1}):`, errorGastos);
        return;
      }
      gastosCreados += batch.length;
      console.log(`  ✓ ${gastosCreados}/${gastosData.length} gastos insertados`);
    }

    console.log(`✅ ${gastosCreados} gastos creados\n`);

    // 4. CREAR INGRESOS (1-3 ingresos por evento)
    console.log('💰 Creando ingresos...');
    const ingresosData = [];
    
    for (const evento of eventos) {
      const numIngresos = randomInt(1, 3); // Anticipo, pago intermedio, liquidación
      const montoBase = evento.presupuesto_estimado;
      
      if (numIngresos === 1) {
        // Pago único
        const cantidad = 1;
        const precioUnitario = montoBase;
        const subtotal = cantidad * precioUnitario;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        ingresosData.push({
          evento_id: evento.id,
          concepto: 'Pago único del evento',
          descripcion: `Pago completo para ${evento.nombre_proyecto}`,
          cantidad: cantidad,
          precio_unitario: parseFloat(precioUnitario.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          iva: parseFloat(iva.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          fecha_ingreso: randomDate(
            new Date(evento.created_at),
            new Date(evento.fecha_evento)
          ).toISOString().split('T')[0],
          referencia: `ING-${evento.clave_evento}-001`,
          metodo_cobro: ['transferencia', 'efectivo', 'tarjeta'][randomInt(0, 2)],
          facturado: true,
          cobrado: true
        });
      } else {
        // Pagos múltiples
        const porcentajes = numIngresos === 2 ? [0.5, 0.5] : [0.3, 0.3, 0.4];
        
        for (let i = 0; i < numIngresos; i++) {
          const cantidad = 1;
          const precioUnitario = montoBase * porcentajes[i];
          const subtotal = cantidad * precioUnitario;
          const iva = subtotal * 0.16;
          const total = subtotal + iva;
          
          ingresosData.push({
            evento_id: evento.id,
            concepto: i === 0 ? 'Anticipo del evento' : 
                     i === numIngresos - 1 ? 'Liquidación final' : 
                     `Pago intermedio ${i}`,
            descripcion: `Pago ${i + 1} de ${numIngresos} para ${evento.nombre_proyecto}`,
            cantidad: cantidad,
            precio_unitario: parseFloat(precioUnitario.toFixed(2)),
            subtotal: parseFloat(subtotal.toFixed(2)),
            iva: parseFloat(iva.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            fecha_ingreso: randomDate(
              new Date(evento.created_at),
              new Date(evento.fecha_evento)
            ).toISOString().split('T')[0],
            referencia: `ING-${evento.clave_evento}-${String(i + 1).padStart(3, '0')}`,
            metodo_cobro: ['transferencia', 'efectivo', 'tarjeta'][randomInt(0, 2)],
            facturado: i < numIngresos - 1 || randomInt(0, 10) > 3, // 70% facturado
            cobrado: i < numIngresos - 1 || randomInt(0, 10) > 2 // 80% cobrado
          });
        }
      }
    }

    console.log(`💾 Insertando ${ingresosData.length} ingresos...`);

    // Insertar en lotes
    let ingresosCreados = 0;
    
    for (let i = 0; i < ingresosData.length; i += BATCH_SIZE) {
      const batch = ingresosData.slice(i, i + BATCH_SIZE);
      const { error: errorIngresos } = await supabase
        .from('evt_ingresos')
        .insert(batch);

      if (errorIngresos) {
        console.error(`❌ Error al crear ingresos (lote ${i / BATCH_SIZE + 1}):`, errorIngresos);
        return;
      }
      ingresosCreados += batch.length;
      console.log(`  ✓ ${ingresosCreados}/${ingresosData.length} ingresos insertados`);
    }

    console.log(`✅ ${ingresosCreados} ingresos creados\n`);

    // CONSULTAR TOTALES FINALES
    const { data: gastosFinales } = await supabase.from('evt_gastos').select('total');
    const { data: ingresosFinales } = await supabase.from('evt_ingresos').select('total');

    const totalGastos = gastosFinales?.reduce((sum, g) => sum + parseFloat(g.total), 0) || 0;
    const totalIngresos = ingresosFinales?.reduce((sum, i) => sum + parseFloat(i.total), 0) || 0;
    const balance = totalIngresos - totalGastos;

    // RESUMEN FINAL
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE DATOS CREADOS (12 MESES):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Clientes:  ${clientes.length}`);
    console.log(`📅 Eventos:   ${eventos.length}`);
    console.log(`💸 Gastos:    ${gastosCreados}`);
    console.log(`💰 Ingresos:  ${ingresosCreados}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💵 TOTALES FINANCIEROS:');
    console.log(`   Gastos totales:   $${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Ingresos totales: $${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Balance:          $${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balance >= 0 ? '✅' : '⚠️'}\n`);

    console.log('📈 DISTRIBUCIÓN POR MES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    estadisticasPorMes.forEach(stat => {
      const barra = '█'.repeat(stat.cantidad);
      console.log(`${stat.mes.padEnd(25)} ${String(stat.cantidad).padStart(2)} eventos ${barra}`);
    });

    console.log('\n✨ Población masiva completada exitosamente!');
    console.log('🎉 Base de datos lista para análisis de 12 meses\n');

  } catch (error) {
    console.error('❌ Error durante la población:', error);
    throw error;
  }
}

populate().catch(console.error);
