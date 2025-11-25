#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCRIPT DE GENERACIÓN DE POOL DE PRUEBAS - ERP 777
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Especificaciones:
 * - 120 eventos distribuidos en los últimos 3 años (2022-2025)
 * - 20 gastos por evento (5 de cada tipo: Combustible, Materiales, RH, SPs)
 * - 7 ingresos por evento (algunos pagados, otros pendientes)
 * - Datos coherentes con reglas de negocio
 * - Distribución realista por mes y cliente
 * - Integridad referencial completa
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// IDs de cuentas contables disponibles en evt_cuentas_contables
// Gastos: id <= 23  |  Ingresos: id >= 24
const CUENTAS_GASTOS = [1, 20, 21, 22, 23];  // Cuentas válidas para gastos
const CUENTAS_INGRESOS = [24, 25, 26, 27, 28]; // Cuentas válidas para ingresos

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function calcularIVA(subtotal) {
  return subtotal * 0.16;
}

function formatCurrency(amount) {
  return amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Obtener el ID del usuario actual o uno por defecto
async function getUserId() {
  try {
    // Intentar obtener el primer usuario disponible
    const { data: users, error } = await supabase
      .from('core_users')
      .select('id')
      .limit(1)
      .single();
    
    if (error || !users) {
      console.log('⚠️  No se encontró usuario, usando ID temporal');
      // Si no hay usuarios, usar un UUID por defecto
      return '00000000-0000-0000-0000-000000000000';
    }
    
    return users.id;
  } catch (error) {
    console.log('⚠️  Error al obtener usuario:', error.message);
    return '00000000-0000-0000-0000-000000000000';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE DATOS
// ═══════════════════════════════════════════════════════════════════════════

const CLIENTES_DATA = [
  {
    razon_social: 'Corporativo Empresarial Phoenix SA de CV',
    nombre_comercial: 'Phoenix Corp',
    rfc: 'CEP920315AB7',
    email: 'contacto@phoenixcorp.mx',
    telefono: '5551234567',
    direccion_fiscal: 'Av. Paseo de la Reforma 1234, Col. Juárez, CDMX 06600',
    contacto_principal: 'Roberto Martínez García',
    telefono_contacto: '5551234567',
    email_contacto: 'roberto.martinez@phoenixcorp.mx',
    activo: true
  },
  {
    razon_social: 'Constructora del Valle México SA de CV',
    nombre_comercial: 'CDV Construcciones',
    rfc: 'CDV850622CD9',
    email: 'info@cdvmx.com',
    telefono: '5559876543',
    direccion_fiscal: 'Blvd. Manuel Ávila Camacho 456, Col. Polanco, CDMX 11560',
    contacto_principal: 'María Elena González López',
    telefono_contacto: '5559876543',
    email_contacto: 'maria.gonzalez@cdvmx.com',
    activo: true
  },
  {
    razon_social: 'Eventos Premier de México SA de CV',
    nombre_comercial: 'Eventos Premier',
    rfc: 'EPM910408EF2',
    email: 'contacto@eventospremier.mx',
    telefono: '5552468135',
    direccion_fiscal: 'Av. Santa Fe 789, Col. Santa Fe, CDMX 01219',
    contacto_principal: 'Carlos Alberto Ramírez Sánchez',
    telefono_contacto: '5552468135',
    email_contacto: 'carlos@eventospremier.mx',
    activo: true
  },
  {
    razon_social: 'Corporativo Horizonte Internacional SA de CV',
    nombre_comercial: 'Horizonte Corp',
    rfc: 'CHI880915GH4',
    email: 'info@horizonteintl.mx',
    telefono: '5553698521',
    direccion_fiscal: 'Torre Corporativa Santa Fe, Piso 12, CDMX 01210',
    contacto_principal: 'Ana Patricia Flores Medina',
    telefono_contacto: '5553698521',
    email_contacto: 'ana.flores@horizonteintl.mx',
    activo: true
  },
  {
    razon_social: 'Desarrollos Inmobiliarios Luna SA de CV',
    nombre_comercial: 'DIL México',
    rfc: 'DIL900725IJ6',
    email: 'contacto@dilmx.com',
    telefono: '5557412589',
    direccion_fiscal: 'Av. Constituyentes 1111, Col. Lomas Altas, CDMX 11950',
    contacto_principal: 'Jorge Luis Torres Ramírez',
    telefono_contacto: '5557412589',
    email_contacto: 'jtorres@dilmx.com',
    activo: true
  },
  {
    razon_social: 'Grupo Industrial Vanguardia SA de CV',
    nombre_comercial: 'Vanguardia Group',
    rfc: 'GIV870530KL8',
    email: 'info@vanguardiagroup.mx',
    telefono: '5558523697',
    direccion_fiscal: 'Periférico Sur 2345, Col. Jardines del Pedregal, CDMX 04500',
    contacto_principal: 'Mónica Alejandra Ruiz Hernández',
    telefono_contacto: '5558523697',
    email_contacto: 'mruiz@vanguardiagroup.mx',
    activo: true
  }
];

const TIPOS_EVENTO = [21, 22, 23, 24, 25]; // IDs: Boda, XV Años, Corporativo, Social, Graduación
const ESTADOS_EVENTO = [1, 2, 3, 4, 5]; // IDs: Borrador, Acuerdo, Orden de Compra, En Ejecución, Completado

// CORRECCIÓN: IDs reales de categorías en la base de datos
const CATEGORIAS_GASTOS = {
  SPS: 6,            // 'SPs (Solicitudes de Pago)' - ID 6
  RH: 7,             // 'RH (Recursos Humanos)' - ID 7
  MATERIALES: 8,     // 'Materiales' - ID 8
  COMBUSTIBLE: 9     // 'Combustible/Peaje' - ID 9
};

const NOMBRES_PROYECTOS = [
  'Convención Anual', 'Lanzamiento de Producto', 'Evento Corporativo',
  'Celebración XV Años', 'Boda Jardín', 'Graduación Empresarial',
  'Conferencia Internacional', 'Cena de Gala', 'Festival Cultural',
  'Exposición Comercial', 'Congreso Médico', 'Summit Tecnológico',
  'Banquete Empresarial', 'Fiesta Temática', 'Presentación Ejecutiva',
  'Reunión Anual Accionistas', 'Inauguración', 'Aniversario Corporativo'
];

const LUGARES = [
  'Salón Las Rosas', 'Centro de Convenciones Imperial', 'Jardín Versalles',
  'Hacienda Crystal', 'Terraza Sunset', 'Salón Ejecutivo Plaza',
  'Auditorio Nacional', 'Hotel Grand Fiesta', 'Country Club Premium',
  'Casa de Eventos Royale', 'Salón Diamante', 'Centro Cultural Metropolitan'
];

const PROVEEDORES = [
  'Suministros Alpha SA', 'Distribuidora Beta', 'Servicios Gamma Corp',
  'Proveeduría Delta', 'Comercializadora Epsilon', 'Abastecedora Zeta',
  'Suministros Omega SA', 'Grupo Provedor Sigma', 'Comercial Theta',
  'Servicios Kappa SA', 'Distribuidora Lambda', 'Suministros Mu Corp'
];

const CONCEPTOS_GASTOS = {
  COMBUSTIBLE: [
    'Gasolina unidades transporte', 'Diesel vehículos pesados', 'Peajes autopista',
    'Combustible generadores', 'Gasolina vehículos ligeros'
  ],
  MATERIALES: [
    'Material decorativo', 'Mobiliario evento', 'Equipo audiovisual',
    'Insumos catering', 'Material impreso'
  ],
  RH: [
    'Nómina personal eventual', 'Honorarios coordinadores', 'Pago meseros',
    'Honorarios técnicos audio', 'Servicios seguridad'
  ],
  SPS: [
    'Renta de equipo especial', 'Servicios de limpieza', 'Alquiler mobiliario',
    'Servicios fotográficos', 'Contratación entretenimiento'
  ]
};

const CONCEPTOS_INGRESOS = [
  'Anticipo inicial del evento',
  'Segundo pago programado',
  'Tercer pago parcial',
  'Cuarto pago parcial',
  'Quinto pago parcial',
  'Pago complementario',
  'Liquidación final del evento'
];

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE LIMPIEZA
// ═══════════════════════════════════════════════════════════════════════════

async function limpiarDatosExistentes() {
  console.log('\n🧹 LIMPIANDO DATOS EXISTENTES...\n');
  
  try {
    // Limpiar en orden inverso por dependencias
    console.log('   ↳ Eliminando ingresos...');
    const { error: e1 } = await supabase.from('evt_ingresos').delete().neq('id', 0);
    if (e1) throw e1;
    
    console.log('   ↳ Eliminando gastos...');
    const { error: e2 } = await supabase.from('evt_gastos').delete().neq('id', 0);
    if (e2) throw e2;
    
    console.log('   ↳ Eliminando eventos...');
    const { error: e3 } = await supabase.from('evt_eventos').delete().neq('id', 0);
    if (e3) throw e3;
    
    console.log('   ↳ Eliminando clientes...');
    const { error: e4 } = await supabase.from('evt_clientes').delete().neq('id', 0);
    if (e4) throw e4;
    
    console.log('\n✅ Limpieza completada exitosamente\n');
  } catch (error) {
    console.error('❌ Error durante limpieza:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE CLIENTES
// ═══════════════════════════════════════════════════════════════════════════

async function crearClientes() {
  console.log('👥 CREANDO CLIENTES...\n');
  
  const { data, error } = await supabase
    .from('evt_clientes')
    .insert(CLIENTES_DATA)
    .select();

  if (error) {
    console.error('❌ Error al crear clientes:', error.message);
    throw error;
  }

  console.log(`✅ ${data.length} clientes creados\n`);
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE EVENTOS (120 eventos en 3 años)
// ═══════════════════════════════════════════════════════════════════════════

async function crearEventos(clientes) {
  console.log('📅 CREANDO 120 EVENTOS (3 AÑOS)...\n');
  
  const eventos = [];
  const añoActual = 2025;
  const años = [2022, 2023, 2024, 2025]; // Últimos 3 años + actual
  
  // Distribuir 120 eventos: 30 por año, distribuidos equitativamente entre clientes
  const eventosPorAño = 30;
  const eventosPorClientePorAño = Math.ceil(eventosPorAño / clientes.length); // 5 eventos por cliente por año
  
  let contadorGlobal = 1;
  
  for (const año of años) {
    for (let mesIdx = 0; mesIdx < 12; mesIdx++) {
      const mes = mesIdx + 1;
      
      // 2-3 eventos por mes, rotando entre clientes
      const eventosMes = año === añoActual && mes > 10 ? 2 : randomInt(2, 3);
      
      for (let i = 0; i < eventosMes; i++) {
        if (eventos.length >= 120) break;
        
        const cliente = clientes[eventos.length % clientes.length];
        const diasEnMes = new Date(año, mes, 0).getDate();
        const dia = randomInt(1, diasEnMes);
        const fechaEvento = new Date(año, mesIdx, dia);
        
        // No crear eventos en el futuro
        if (fechaEvento > new Date()) continue;
        
        // Generar ingreso estimado realista (rango más amplio)
        const ingresoEstimado = randomInt(100000, 500000);
        
        // Provisiones: Para utilidad del 33-45%, los gastos deben ser 55-67% del ingreso
        // Usamos 55-67% para provisiones (inverso de 33-45% de margen)
        const porcentajeProvision = randomInt(55, 67) / 100;
        const provisionTotal = ingresoEstimado * porcentajeProvision;
        
        // Distribuir provisiones entre categorías con mayor variación
        const provision_combustible_peaje = provisionTotal * randomInt(8, 15) / 100;
        const provision_materiales = provisionTotal * randomInt(35, 45) / 100;
        const provision_recursos_humanos = provisionTotal * randomInt(30, 40) / 100;
        const provision_solicitudes_pago = provisionTotal - provision_combustible_peaje - provision_materiales - provision_recursos_humanos;
        
        const gananciaEstimada = ingresoEstimado - provisionTotal;
        
        eventos.push({
          clave_evento: `EVT-${año}-${String(contadorGlobal).padStart(4, '0')}`,
          nombre_proyecto: `${randomElement(NOMBRES_PROYECTOS)} ${año}`,
          descripcion: `Evento programado para ${cliente.nombre_comercial} - ${mes}/${año}`,
          cliente_id: cliente.id,
          tipo_evento_id: randomElement(TIPOS_EVENTO),
          estado_id: fechaEvento < new Date() ? randomElement([3, 4, 5]) : randomElement([1, 2, 3]), // Completados si ya pasaron
          fecha_evento: `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
          lugar: randomElement(LUGARES),
          numero_invitados: randomInt(50, 300),
          ingreso_estimado: parseFloat(ingresoEstimado.toFixed(2)),
          ganancia_estimada: parseFloat(gananciaEstimada.toFixed(2)),
          provision_combustible_peaje: parseFloat(provision_combustible_peaje.toFixed(2)),
          provision_materiales: parseFloat(provision_materiales.toFixed(2)),
          provision_recursos_humanos: parseFloat(provision_recursos_humanos.toFixed(2)),
          provision_solicitudes_pago: parseFloat(provision_solicitudes_pago.toFixed(2)),
          fase_proyecto: fechaEvento < new Date() ? 'completado' : randomElement(['cotizacion', 'planeacion', 'ejecucion']),
          status_pago: 'pendiente',
          activo: true
        });
        
        contadorGlobal++;
      }
      
      if (eventos.length >= 120) break;
    }
    
    if (eventos.length >= 120) break;
  }
  
  console.log(`   Generando ${eventos.length} eventos distribuidos en ${años.length} años...`);
  
  // Insertar en lotes de 20 para evitar timeouts
  const BATCH_SIZE = 20;
  const eventosCreados = [];
  
  for (let i = 0; i < eventos.length; i += BATCH_SIZE) {
    const batch = eventos.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('evt_eventos')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      throw error;
    }
    
    eventosCreados.push(...data);
    console.log(`   ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eventos.length / BATCH_SIZE)} completado (${data.length} eventos)`);
  }
  
  console.log(`\n✅ ${eventosCreados.length} eventos creados\n`);
  return eventosCreados;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE GASTOS (20 por evento = 2,400 gastos totales)
// ═══════════════════════════════════════════════════════════════════════════

async function crearGastos(eventos, userId) {
  console.log('💸 CREANDO GASTOS (20 POR EVENTO)...\n');
  
  const gastos = [];
  
  for (const evento of eventos) {
    const fechaEvento = new Date(evento.fecha_evento);
    const fechaCreacion = new Date(evento.created_at);
    
    // 20 gastos: 5 de cada categoría
    const categorias = [
      { id: CATEGORIAS_GASTOS.COMBUSTIBLE, conceptos: CONCEPTOS_GASTOS.COMBUSTIBLE },
      { id: CATEGORIAS_GASTOS.MATERIALES, conceptos: CONCEPTOS_GASTOS.MATERIALES },
      { id: CATEGORIAS_GASTOS.RH, conceptos: CONCEPTOS_GASTOS.RH },
      { id: CATEGORIAS_GASTOS.SPS, conceptos: CONCEPTOS_GASTOS.SPS }
    ];
    
    for (const categoria of categorias) {
      // Calcular monto basado en la provisión de la categoría
      let provision;
      switch (categoria.id) {
        case CATEGORIAS_GASTOS.COMBUSTIBLE:
          provision = evento.provision_combustible_peaje;
          break;
        case CATEGORIAS_GASTOS.MATERIALES:
          provision = evento.provision_materiales;
          break;
        case CATEGORIAS_GASTOS.RH:
          provision = evento.provision_recursos_humanos;
          break;
        case CATEGORIAS_GASTOS.SPS:
          provision = evento.provision_solicitudes_pago;
          break;
      }
      
      // CRÍTICO: Gastos NUNCA deben exceder las provisiones
      // Usamos 75-95% de la provisión para garantizar que siempre haya margen
      const porcentajeUso = randomInt(75, 95) / 100; // 75% a 95% de la provisión
      const totalDisponibleCategoria = provision * porcentajeUso;
      
      for (let i = 0; i < 5; i++) {
        // Distribuir el total disponible entre los 5 gastos con pequeñas variaciones
        const montoBaseReal = (totalDisponibleCategoria / 5) * (randomInt(90, 110) / 100);
        
        const cantidad = randomInt(1, 3);
        const precioUnitario = montoBaseReal / cantidad;
        const subtotal = cantidad * precioUnitario;
        const iva = calcularIVA(subtotal);
        const total = subtotal + iva;
        
        // 70% de gastos pagados, 30% pendientes
        const pagado = Math.random() < 0.7;
        
        gastos.push({
          evento_id: evento.id,
          categoria_id: categoria.id,
          concepto: randomElement(categoria.conceptos),
          descripcion: `${randomElement(categoria.conceptos)} para ${evento.nombre_proyecto}`,
          cantidad: cantidad,
          precio_unitario: parseFloat(precioUnitario.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          iva: parseFloat(iva.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          proveedor: randomElement(PROVEEDORES),
          fecha_gasto: randomDate(fechaCreacion, fechaEvento).toISOString().split('T')[0],
          forma_pago: randomElement(['03', '01', '04']), // Transferencia, Efectivo, Tarjeta
          tipo_comprobante: 'E', // Egreso
          status_aprobacion: 'aprobado',
          pagado: pagado,
          responsable_id: userId, // Usuario responsable
          cuenta_contable_id: CUENTAS_GASTOS[Math.floor(Math.random() * CUENTAS_GASTOS.length)], // Cuenta aleatoria para gastos (id <= 23)
          activo: true
        });
      }
    }
  }
  
  console.log(`   Generando ${gastos.length} gastos (${gastos.length / eventos.length} por evento)...`);
  
  // Insertar en lotes de 100
  const BATCH_SIZE = 100;
  const gastosCreados = [];
  
  for (let i = 0; i < gastos.length; i += BATCH_SIZE) {
    const batch = gastos.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('evt_gastos')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      throw error;
    }
    
    gastosCreados.push(...data);
    console.log(`   ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(gastos.length / BATCH_SIZE)} completado (${data.length} gastos)`);
  }
  
  console.log(`\n✅ ${gastosCreados.length} gastos creados\n`);
  return gastosCreados;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE INGRESOS (7 por evento = 840 ingresos totales)
// ═══════════════════════════════════════════════════════════════════════════

async function crearIngresos(eventos, userId) {
  console.log('💰 CREANDO INGRESOS (7 POR EVENTO)...\n');
  
  const ingresos = [];
  
  for (const evento of eventos) {
    const fechaEvento = new Date(evento.fecha_evento);
    const fechaCreacion = new Date(evento.created_at);
    
    // Ingreso real varía ±10% respecto al estimado
    const variacionIngreso = randomInt(90, 110) / 100;
    const ingresoTotalReal = evento.ingreso_estimado * variacionIngreso;
    
    // Dividir ingreso total en 7 pagos con distribución realista
    // Anticipo: 30%, Pagos 2-6: 10% c/u, Liquidación: 20%
    const distribucion = [0.30, 0.10, 0.10, 0.10, 0.10, 0.10, 0.20];
    
    for (let i = 0; i < 7; i++) {
      const porcentaje = distribucion[i];
      const monto = ingresoTotalReal * porcentaje;
      const cantidad = 1;
      const precioUnitario = monto;
      const subtotal = precioUnitario / 1.16;
      const iva = calcularIVA(subtotal);
      
      // Primeros 3-5 pagos cobrados (50-70% cobrado), resto pendiente
      const numPagosCobrados = randomInt(3, 5);
      const cobrado = i < numPagosCobrados;
      const facturado = cobrado; // Si está cobrado, está facturado
      
      // Fecha de ingreso progresiva desde creación hasta evento
      const diasDisponibles = Math.floor((fechaEvento - fechaCreacion) / (1000 * 60 * 60 * 24));
      const diaIngreso = Math.floor((diasDisponibles / 7) * i);
      const fechaIngreso = new Date(fechaCreacion);
      fechaIngreso.setDate(fechaIngreso.getDate() + diaIngreso);
      
      ingresos.push({
        evento_id: evento.id,
        concepto: CONCEPTOS_INGRESOS[i],
        descripcion: `${CONCEPTOS_INGRESOS[i]} - ${evento.nombre_proyecto}`,
        cantidad: cantidad,
        precio_unitario: parseFloat(precioUnitario.toFixed(2)),
        subtotal: parseFloat(subtotal.toFixed(2)),
        iva: parseFloat(iva.toFixed(2)),
        total: parseFloat(monto.toFixed(2)),
        fecha_ingreso: fechaIngreso.toISOString().split('T')[0],
        referencia: `REF-${evento.clave_evento}-${String(i + 1).padStart(2, '0')}`,
        metodo_cobro: randomElement(['transferencia', 'efectivo', 'tarjeta', 'cheque']),
        facturado: facturado,
        cobrado: cobrado,
        responsable_id: userId, // Usuario responsable
        cuenta_contable_id: CUENTAS_INGRESOS[Math.floor(Math.random() * CUENTAS_INGRESOS.length)], // Cuenta aleatoria para ingresos (id >= 24)
        activo: true
      });
    }
  }
  
  console.log(`   Generando ${ingresos.length} ingresos (${ingresos.length / eventos.length} por evento)...`);
  
  // Insertar en lotes de 100
  const BATCH_SIZE = 100;
  const ingresosCreados = [];
  
  for (let i = 0; i < ingresos.length; i += BATCH_SIZE) {
    const batch = ingresos.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('evt_ingresos')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      throw error;
    }
    
    ingresosCreados.push(...data);
    console.log(`   ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ingresos.length / BATCH_SIZE)} completado (${data.length} ingresos)`);
  }
  
  console.log(`\n✅ ${ingresosCreados.length} ingresos creados\n`);
  return ingresosCreados;
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORTE FINAL
// ═══════════════════════════════════════════════════════════════════════════

function generarReporte(clientes, eventos, gastos, ingresos) {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('                    📊 REPORTE FINAL DEL POOL DE PRUEBAS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  // Totales generales
  console.log('📋 TOTALES GENERALES:');
  console.log('─────────────────────────────────────────────────────────────────────────\n');
  console.log(`   👥 Clientes:        ${clientes.length}`);
  console.log(`   📅 Eventos:         ${eventos.length} (${(eventos.length / clientes.length).toFixed(1)} por cliente)`);
  console.log(`   💸 Gastos:          ${gastos.length} (${(gastos.length / eventos.length).toFixed(0)} por evento)`);
  console.log(`   💰 Ingresos:        ${ingresos.length} (${(ingresos.length / eventos.length).toFixed(0)} por evento)\n`);
  
  // Distribución temporal
  console.log('📅 DISTRIBUCIÓN TEMPORAL:');
  console.log('─────────────────────────────────────────────────────────────────────────\n');
  
  const eventosPorAño = {};
  eventos.forEach(e => {
    const año = e.fecha_evento.split('-')[0];
    eventosPorAño[año] = (eventosPorAño[año] || 0) + 1;
  });
  
  Object.keys(eventosPorAño).sort().forEach(año => {
    console.log(`   ${año}: ${eventosPorAño[año]} eventos`);
  });
  console.log('');
  
  // Financieros
  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.total), 0);
  const totalIngresos = ingresos.reduce((sum, i) => sum + parseFloat(i.total), 0);
  const gastosPagados = gastos.filter(g => g.pagado).reduce((sum, g) => sum + parseFloat(g.total), 0);
  const gastosPendientes = totalGastos - gastosPagados;
  const ingresosCobrados = ingresos.filter(i => i.cobrado).reduce((sum, i) => sum + parseFloat(i.total), 0);
  const ingresosPendientes = totalIngresos - ingresosCobrados;
  const balance = ingresosCobrados - gastosPagados;
  
  console.log('💵 TOTALES FINANCIEROS:');
  console.log('─────────────────────────────────────────────────────────────────────────\n');
  console.log(`   💸 Gastos Totales:          $${formatCurrency(totalGastos)}`);
  console.log(`      ✓ Pagados:               $${formatCurrency(gastosPagados)} (${((gastosPagados / totalGastos) * 100).toFixed(1)}%)`);
  console.log(`      ⏳ Pendientes:            $${formatCurrency(gastosPendientes)} (${((gastosPendientes / totalGastos) * 100).toFixed(1)}%)\n`);
  
  console.log(`   💰 Ingresos Totales:        $${formatCurrency(totalIngresos)}`);
  console.log(`      ✓ Cobrados:              $${formatCurrency(ingresosCobrados)} (${((ingresosCobrados / totalIngresos) * 100).toFixed(1)}%)`);
  console.log(`      ⏳ Pendientes:            $${formatCurrency(ingresosPendientes)} (${((ingresosPendientes / totalIngresos) * 100).toFixed(1)}%)\n`);
  
  console.log(`   📊 Balance (Cobrado-Pagado): $${formatCurrency(balance)} ${balance >= 0 ? '✅' : '⚠️'}`);
  console.log(`   📈 Margen Real:              ${((balance / ingresosCobrados) * 100).toFixed(1)}%\n`);
  
  // Gastos por categoría
  console.log('📊 GASTOS POR CATEGORÍA:');
  console.log('─────────────────────────────────────────────────────────────────────────\n');
  
  const gastosPorCategoria = {};
  gastos.forEach(g => {
    gastosPorCategoria[g.categoria_id] = (gastosPorCategoria[g.categoria_id] || 0) + parseFloat(g.total);
  });
  
  const nombresCategorias = {
    [CATEGORIAS_GASTOS.COMBUSTIBLE]: '⛽ Combustible/Peaje',
    [CATEGORIAS_GASTOS.MATERIALES]: '🛠️  Materiales',
    [CATEGORIAS_GASTOS.RH]: '👥 Recursos Humanos',
    [CATEGORIAS_GASTOS.SPS]: '💳 Solicitudes de Pago'
  };
  
  Object.entries(gastosPorCategoria).forEach(([catId, total]) => {
    const porcentaje = (total / totalGastos) * 100;
    console.log(`   ${nombresCategorias[catId]}: $${formatCurrency(total)} (${porcentaje.toFixed(1)}%)`);
  });
  console.log('');
  
  // Detalle por cliente
  console.log('👥 DETALLE POR CLIENTE:');
  console.log('─────────────────────────────────────────────────────────────────────────\n');
  
  clientes.forEach(cliente => {
    const eventosCliente = eventos.filter(e => e.cliente_id === cliente.id);
    const gastosCliente = gastos.filter(g => eventosCliente.some(e => e.id === g.evento_id));
    const ingresosCliente = ingresos.filter(i => eventosCliente.some(e => e.id === i.evento_id));
    
    const totalGastosCliente = gastosCliente.reduce((sum, g) => sum + parseFloat(g.total), 0);
    const totalIngresosCliente = ingresosCliente.reduce((sum, i) => sum + parseFloat(i.total), 0);
    
    console.log(`   ${cliente.nombre_comercial}`);
    console.log(`      📅 Eventos:   ${eventosCliente.length}`);
    console.log(`      💸 Gastos:    ${gastosCliente.length} ($${formatCurrency(totalGastosCliente)})`);
    console.log(`      💰 Ingresos:  ${ingresosCliente.length} ($${formatCurrency(totalIngresosCliente)})`);
    console.log('');
  });
  
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('                    ✨ POOL DE PRUEBAS GENERADO EXITOSAMENTE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('             🚀 GENERADOR DE POOL DE PRUEBAS - ERP 777');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('\n   Especificaciones:');
  console.log('   • 120 eventos (últimos 3 años: 2022-2025)');
  console.log('   • 20 gastos por evento (5 por categoría)');
  console.log('   • 7 ingresos por evento');
  console.log('   • Datos coherentes con reglas de negocio');
  console.log('   • Integridad referencial completa\n');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  try {
    // 0. Obtener usuario del sistema
    const userId = await getUserId();
    console.log(`👤 Usuario responsable: ${userId}\n`);
    
    // 1. Limpiar datos existentes
    await limpiarDatosExistentes();
    
    // 2. Crear clientes
    const clientes = await crearClientes();
    
    // 3. Crear eventos
    const eventos = await crearEventos(clientes);
    
    // 4. Crear gastos
    const gastos = await crearGastos(eventos, userId);
    
    // 5. Crear ingresos
    const ingresos = await crearIngresos(eventos, userId);
    
    // 6. Generar reporte final
    generarReporte(clientes, eventos, gastos, ingresos);
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error);
    process.exit(1);
  }
}

// Ejecutar
main();
