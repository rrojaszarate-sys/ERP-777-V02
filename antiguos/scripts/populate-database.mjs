import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gomnouwackzvthpwyric.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU'
);

console.log('🚀 Iniciando población de base de datos...\n');

// Función auxiliar para fechas aleatorias
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function populate() {
  try {
    // 1. CREAR CLIENTES
    console.log('👥 Creando 5 clientes...');
    const clientesData = [
      {
        razon_social: 'Grupo Empresarial Phoenix SA de CV',
        nombre_comercial: 'Grupo Phoenix',
        rfc: 'GEP920315AB7',
        email: 'contacto@phoenix.com',
        telefono: '5551234567',
        direccion_fiscal: 'Av. Reforma 1234, CDMX',
        contacto_principal: 'Roberto Martínez',
        telefono_contacto: '5551234567',
        email_contacto: 'roberto.martinez@phoenix.com',
        regimen_fiscal: '601 - General de Ley Personas Morales',
        uso_cfdi: 'G03 - Gastos en general',
        metodo_pago: 'PUE',
        forma_pago: '01',
        dias_credito: 30,
        activo: true
      },
      {
        razon_social: 'Constructora del Valle SA de CV',
        nombre_comercial: 'CDV Construcciones',
        rfc: 'CDV850622CD9',
        email: 'info@cdvalle.com',
        telefono: '5559876543',
        direccion_fiscal: 'Blvd. Insurgentes 456, CDMX',
        contacto_principal: 'María González',
        telefono_contacto: '5559876543',
        email_contacto: 'maria.gonzalez@cdvalle.com',
        regimen_fiscal: '601 - General de Ley Personas Morales',
        uso_cfdi: 'G03 - Gastos en general',
        metodo_pago: 'PPD',
        forma_pago: '03',
        dias_credito: 45,
        activo: true
      },
      {
        razon_social: 'Eventos Premier México SA de CV',
        nombre_comercial: 'Eventos Premier',
        rfc: 'EPM910408EF2',
        email: 'contacto@eventospremier.mx',
        telefono: '5552468135',
        direccion_fiscal: 'Polanco Business Center, CDMX',
        contacto_principal: 'Carlos Ramírez',
        telefono_contacto: '5552468135',
        email_contacto: 'carlos@eventospremier.mx',
        regimen_fiscal: '601 - General de Ley Personas Morales',
        uso_cfdi: 'G03 - Gastos en general',
        metodo_pago: 'PUE',
        forma_pago: '01',
        dias_credito: 0,
        activo: true
      },
      {
        razon_social: 'Corporativo Horizonte SA de CV',
        nombre_comercial: 'Horizonte Corp',
        rfc: 'CHR880915GH4',
        email: 'contacto@horizonte.com.mx',
        telefono: '5553698521',
        direccion_fiscal: 'Santa Fe Corporate, Torre B, CDMX',
        contacto_principal: 'Ana Patricia Flores',
        telefono_contacto: '5553698521',
        email_contacto: 'ana.flores@horizonte.com.mx',
        regimen_fiscal: '601 - General de Ley Personas Morales',
        uso_cfdi: 'G03 - Gastos en general',
        metodo_pago: 'PPD',
        forma_pago: '02',
        dias_credito: 60,
        activo: true
      },
      {
        razon_social: 'Desarrollos Inmobiliarios Luna SA de CV',
        nombre_comercial: 'DIL México',
        rfc: 'DIL900725IJ6',
        email: 'info@dilunamx.com',
        telefono: '5557412589',
        direccion_fiscal: 'Av. Constituyentes 789, CDMX',
        contacto_principal: 'Jorge Luis Torres',
        telefono_contacto: '5557412589',
        email_contacto: 'jtorres@dilunamx.com',
        regimen_fiscal: '601 - General de Ley Personas Morales',
        uso_cfdi: 'G03 - Gastos en general',
        metodo_pago: 'PUE',
        forma_pago: '01',
        dias_credito: 30,
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
    const tiposEvento = [1, 2, 3, 4]; // Boda, XV, Corporativo, Social
    const estadosEvento = [1, 2, 3]; // Cotización, Confirmado, En proceso
    
    clientes.forEach((cliente, idx) => {
      // Cada cliente tendrá 2-3 eventos
      const numEventos = 2 + (idx % 2);
      
      for (let i = 0; i < numEventos; i++) {
        const fechaEvento = randomDate(new Date(2025, 2, 1), new Date(2025, 11, 31));
        const fechaCreacion = randomDate(new Date(2025, 0, 1), fechaEvento);
        
        eventosData.push({
          cliente_id: cliente.id,
          nombre_evento: `Evento ${['Primavera', 'Verano', 'Otoño', 'Invierno'][i % 4]} ${2025}`,
          tipo_evento_id: tiposEvento[i % tiposEvento.length],
          fecha_evento: fechaEvento.toISOString().split('T')[0],
          estado_evento_id: estadosEvento[i % estadosEvento.length],
          ubicacion: `Salón ${['Las Rosas', 'Imperial', 'Versalles', 'Crystal'][i % 4]}`,
          numero_invitados: 100 + (i * 50),
          presupuesto_estimado: 150000 + (i * 50000),
          notas: `Evento generado automáticamente para ${cliente.nombre_empresa}`,
          created_at: fechaCreacion.toISOString()
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
    const categoriasGastos = [1, 2, 3, 4, 5, 6]; // Alimentos, Decoración, etc.
    
    eventos.forEach((evento, idx) => {
      // Cada evento tendrá 3-5 gastos
      const numGastos = 3 + (idx % 3);
      
      for (let i = 0; i < numGastos; i++) {
        const subtotal = (5000 + (i * 2000)) * (1 + idx * 0.1);
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        gastosData.push({
          evento_id: evento.id,
          categoria_gasto_id: categoriasGastos[i % categoriasGastos.length],
          concepto: `Gasto ${['inicial', 'intermedio', 'final', 'adicional', 'extra'][i % 5]} para ${evento.nombre_evento}`,
          subtotal: parseFloat(subtotal.toFixed(2)),
          iva: parseFloat(iva.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          fecha_gasto: randomDate(new Date(evento.created_at), new Date(evento.fecha_evento)).toISOString().split('T')[0],
          proveedor: `Proveedor ${['A', 'B', 'C', 'D', 'E'][i % 5]}`,
          numero_factura: `FAC-${2025}${String(idx).padStart(3, '0')}${String(i).padStart(2, '0')}`,
          estado_pago_id: i % 2 === 0 ? 1 : 2, // Pendiente o Pagado
          detalle_compra: JSON.stringify([
            {
              descripcion: `Item ${i + 1}`,
              cantidad: 1 + i,
              precio_unitario: subtotal / (1 + i),
              total: subtotal
            }
          ])
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
      // Cada evento tendrá 1-2 ingresos (anticipo y liquidación)
      const numIngresos = 1 + (idx % 2);
      
      for (let i = 0; i < numIngresos; i++) {
        const monto = evento.presupuesto_estimado * (i === 0 ? 0.5 : 0.5);
        
        ingresosData.push({
          evento_id: evento.id,
          tipo_ingreso_id: i === 0 ? 1 : 2, // Anticipo o Liquidación
          monto: parseFloat(monto.toFixed(2)),
          fecha_ingreso: randomDate(new Date(evento.created_at), new Date(evento.fecha_evento)).toISOString().split('T')[0],
          metodo_pago_id: (idx % 3) + 1, // Efectivo, Transferencia, Tarjeta
          concepto: i === 0 ? 'Anticipo del evento' : 'Liquidación final',
          numero_referencia: `REF-${2025}${String(idx).padStart(3, '0')}${String(i).padStart(2, '0')}`
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

    // Verificar totales
    const totalGastos = gastos.reduce((sum, g) => sum + g.total, 0);
    const totalIngresos = ingresos.reduce((sum, i) => sum + i.monto, 0);
    const balance = totalIngresos - totalGastos;

    console.log('💵 TOTALES FINANCIEROS:');
    console.log(`   Gastos totales:   $${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    console.log(`   Ingresos totales: $${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    console.log(`   Balance:          $${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${balance >= 0 ? '✅' : '⚠️'}\n`);

    console.log('✨ Población completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la población:', error);
    throw error;
  }
}

// Ejecutar
populate().catch(console.error);
