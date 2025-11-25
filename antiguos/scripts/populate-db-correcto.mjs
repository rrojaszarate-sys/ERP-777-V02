import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gomnouwackzvthpwyric.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU'
);

console.log('🚀 Iniciando población de base de datos...\n');

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
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

    // 1. CREAR CLIENTES
    console.log('👥 Creando 5 clientes...');
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

    // 2. CREAR EVENTOS
    console.log('📅 Creando eventos...');
    const eventosData = [];
    
    // Cada cliente tendrá 2-3 eventos
    clientes.forEach((cliente, idx) => {
      const numEventos = 2 + (idx % 2);
      
      for (let i = 0; i < numEventos; i++) {
        const fechaEvento = randomDate(new Date(2025, 2, 1), new Date(2025, 11, 31));
        const presupuesto = 150000 + (i * 50000) + (idx * 20000);
        const subtotal = presupuesto / 1.16;
        const iva = subtotal * 0.16;
        
        eventosData.push({
          clave_evento: `EVT-2025-${String(idx * 10 + i).padStart(4, '0')}`,
          nombre_proyecto: `Evento ${['Primavera', 'Verano', 'Otoño', 'Invierno'][i % 4]} ${2025}`,
          descripcion: `Evento corporativo para ${cliente.nombre_comercial}`,
          cliente_id: cliente.id,
          tipo_evento_id: [21, 22, 23, 24, 25][(idx + i) % 5], // Boda, XV, Corporativo, Social, Graduación
          estado_id: [1, 2, 3, 4][i % 4], // Borrador, Acuerdo, Orden de Compra, En Ejecución
          fecha_evento: fechaEvento.toISOString().split('T')[0],
          lugar: `Salón ${['Las Rosas', 'Imperial', 'Versalles', 'Crystal'][i % 4]}`,
          numero_invitados: 100 + (i * 50),
          presupuesto_estimado: presupuesto,
          subtotal: parseFloat(subtotal.toFixed(2)),
          iva: parseFloat(iva.toFixed(2)),
          total: presupuesto,
          fase_proyecto: ['cotizacion', 'planeacion', 'ejecucion'][i % 3],
          status_pago: 'pendiente',
          activo: true
        });
      }
    });

    const { data: eventos, error: errorEventos } = await supabase
      .from('evt_eventos')
      .insert(eventosData)
      .select();

    if (errorEventos) {
      console.error('❌ Error al crear eventos:', errorEventos);
      return;
    }

    console.log(`✅ ${eventos.length} eventos creados\n`);

    // 3. CREAR GASTOS
    console.log('💸 Creando gastos...');
    const gastosData = [];
    
    eventos.forEach((evento, idx) => {
      const numGastos = 3 + (idx % 3);
      
      for (let i = 0; i < numGastos; i++) {
        const cantidad = 1 + i;
        const precioUnitario = (2000 + (i * 1000)) * (1 + idx * 0.05);
        const subtotal = cantidad * precioUnitario;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        gastosData.push({
          evento_id: evento.id,
          categoria_id: [6, 7, 8, 9, 10][(idx + i) % 5], // SPs, RH, Materiales, Combustible, Provisiones
          concepto: `Gasto ${['inicial', 'intermedio', 'final', 'adicional', 'extra'][i % 5]}`,
          descripcion: `Compra para ${evento.nombre_proyecto}`,
          cantidad: cantidad,
          precio_unitario: parseFloat(precioUnitario.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          iva: parseFloat(iva.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          proveedor: `Proveedor ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'][i % 5]}`,
          fecha_gasto: randomDate(
            new Date(evento.created_at),
            new Date(evento.fecha_evento)
          ).toISOString().split('T')[0],
          forma_pago: ['03', '01', '04'][i % 3], // Transferencia, Efectivo, Tarjeta (códigos SAT)
          tipo_comprobante: ['I', 'E', 'T'][i % 3], // Ingreso, Egreso, Traslado (códigos SAT)
          status_aprobacion: i % 2 === 0 ? 'aprobado' : 'pendiente',
          activo: true
        });
      }
    });

    const { data: gastos, error: errorGastos } = await supabase
      .from('evt_gastos')
      .insert(gastosData)
      .select();

    if (errorGastos) {
      console.error('❌ Error al crear gastos:', errorGastos);
      return;
    }

    console.log(`✅ ${gastos.length} gastos creados\n`);

    // 4. CREAR INGRESOS
    console.log('💰 Creando ingresos...');
    const ingresosData = [];
    
    eventos.forEach((evento, idx) => {
      const numIngresos = 1 + (idx % 2);
      
      for (let i = 0; i < numIngresos; i++) {
        const cantidad = 1;
        const precioUnitario = evento.presupuesto_estimado * (i === 0 ? 0.5 : 0.5);
        const subtotal = cantidad * precioUnitario;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        ingresosData.push({
          evento_id: evento.id,
          concepto: i === 0 ? 'Anticipo del evento' : 'Liquidación final',
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
          referencia: `REF-${2025}${String(idx).padStart(3, '0')}${String(i).padStart(2, '0')}`,
          metodo_cobro: ['transferencia', 'efectivo', 'tarjeta'][i % 3],
          facturado: i === 0,
          cobrado: i === 0
        });
      }
    });

    const { data: ingresos, error: errorIngresos } = await supabase
      .from('evt_ingresos')
      .insert(ingresosData)
      .select();

    if (errorIngresos) {
      console.error('❌ Error al crear ingresos:', errorIngresos);
      return;
    }

    console.log(`✅ ${ingresos.length} ingresos creados\n`);

    // RESUMEN FINAL
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE DATOS CREADOS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Clientes:  ${clientes.length}`);
    console.log(`📅 Eventos:   ${eventos.length} (${(eventos.length / clientes.length).toFixed(1)} por cliente)`);
    console.log(`💸 Gastos:    ${gastos.length} (${(gastos.length / eventos.length).toFixed(1)} por evento)`);
    console.log(`💰 Ingresos:  ${ingresos.length} (${(ingresos.length / eventos.length).toFixed(1)} por evento)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Calcular totales
    const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.total), 0);
    const totalIngresos = ingresos.reduce((sum, i) => sum + parseFloat(i.total), 0);
    const balance = totalIngresos - totalGastos;

    console.log('💵 TOTALES FINANCIEROS:');
    console.log(`   Gastos totales:   $${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Ingresos totales: $${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Balance:          $${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balance >= 0 ? '✅' : '⚠️'}\n`);

    // Detalles por cliente
    console.log('📋 DETALLE POR CLIENTE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const cliente of clientes) {
      const eventosCliente = eventos.filter(e => e.cliente_id === cliente.id);
      const numGastosCliente = eventosCliente.reduce((sum, e) => {
        return sum + gastos.filter(g => g.evento_id === e.id).length;
      }, 0);
      const numIngresosCliente = eventosCliente.reduce((sum, e) => {
        return sum + ingresos.filter(i => i.evento_id === e.id).length;
      }, 0);
      
      console.log(`\n${cliente.nombre_comercial}`);
      console.log(`  📅 Eventos: ${eventosCliente.length}`);
      console.log(`  💸 Gastos: ${numGastosCliente}`);
      console.log(`  💰 Ingresos: ${numIngresosCliente}`);
    }

    console.log('\n✨ Población completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la población:', error);
    throw error;
  }
}

populate().catch(console.error);
