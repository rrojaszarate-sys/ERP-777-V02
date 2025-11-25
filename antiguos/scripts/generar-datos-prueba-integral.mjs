#!/usr/bin/env node

/**
 * GENERADOR DE DATOS DE PRUEBA INTEGRAL
 * Fecha: 2025-10-27
 * Objetivo: Crear datos completos para pruebas exhaustivas del sistema
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de Supabase
const envPath = join(__dirname, '.env');
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim().replace(/["']/g, '');
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      SUPABASE_SERVICE_KEY = line.split('=')[1].trim().replace(/["']/g, '');
    }
  }
} catch (error) {
  console.error('❌ Error al leer archivo .env:', error.message);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${colors.reset}\n`),
};

// Funciones auxiliares
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatMoney(amount) {
  return `$${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
}

// Datos de muestra
  const empresas = [
    { 
      razon_social: 'ACME Corporation, S.A. de C.V.', 
      nombre_comercial: 'ACME Corporation',
      rfc: 'ACM950101ABC', 
      giro: 'Tecnología',
      email: 'contacto@acme.mx',
      telefono: '5512345678'
    },
    { 
      razon_social: 'Global Ventures, S.A. de C.V.', 
      nombre_comercial: 'Global Ventures SA',
      rfc: 'GLV980215DEF', 
      giro: 'Consultoría',
      email: 'info@globalventures.mx',
      telefono: '5523456789'
    },
    { 
      razon_social: 'Innovatech Solutions, S.A. de C.V.', 
      nombre_comercial: 'Innovatech Solutions',
      rfc: 'INN020430GHI', 
      giro: 'Software',
      email: 'hola@innovatech.mx',
      telefono: '5534567890'
    },
    { 
      razon_social: 'MegaCorp Industries, S.A. de C.V.', 
      nombre_comercial: 'MegaCorp Industries',
      rfc: 'MEG910820JKL', 
      giro: 'Manufactura',
      email: 'atencion@megacorp.mx',
      telefono: '5545678901'
    },
    { 
      razon_social: 'Prime Services Group, S.A. de C.V.', 
      nombre_comercial: 'Prime Services Group',
      rfc: 'PRI070615MNO', 
      giro: 'Servicios',
      email: 'servicios@primegroup.mx',
      telefono: '5556789012'
    }
  ];

const tiposEvento = [
  'Conferencia Anual',
  'Lanzamiento de Producto',
  'Team Building',
  'Capacitación Corporativa',
  'Evento de Networking',
];

const conceptosGastos = [
  { concepto: 'Renta de Salón', min: 15000, max: 45000 },
  { concepto: 'Catering', min: 8000, max: 25000 },
  { concepto: 'Audio y Video', min: 5000, max: 15000 },
  { concepto: 'Decoración', min: 3000, max: 12000 },
  { concepto: 'Personal de Apoyo', min: 4000, max: 10000 },
  { concepto: 'Materiales Promocionales', min: 2000, max: 8000 },
  { concepto: 'Transporte', min: 1500, max: 6000 },
  { concepto: 'Seguridad', min: 2500, max: 7000 },
];

const conceptosIngresos = [
  'Pago del Cliente',
  'Anticipo',
  'Pago Final',
  'Pago Complementario',
];

// Contadores para reportes
const stats = {
  clientesCreados: 0,
  eventosCreados: 0,
  gastosCreados: 0,
  gastosPagados: 0,
  gastosPendientes: 0,
  ingresosCreados: 0,
  ingresosPagados: 0,
  ingresosPendientes: 0,
  totalGastos: 0,
  totalIngresos: 0,
  totalUtilidad: 0,
};

async function generarDatosPrueba() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║         GENERADOR DE DATOS DE PRUEBA INTEGRAL                    ║
║         Sistema ERP - Módulo de Eventos                          ║
║         Fecha: ${new Date().toLocaleDateString('es-MX')}                                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  try {
    // =====================================================
    // 1. OBTENER DATOS NECESARIOS
    // =====================================================
    log.section('1️⃣  OBTENIENDO DATOS NECESARIOS DEL SISTEMA');

  // Obtener cuentas bancarias
  const { data: cuentas } = await supabase
    .from('evt_cuentas_contables')
    .select('id, codigo, nombre');

  if (!cuentas || cuentas.length === 0) {
    log.error('No se encontraron cuentas bancarias');
    return;
  }

  log.success(`Se encontraron ${cuentas.length} cuentas bancarias`);
  cuentas.forEach(c => log.info(`  - ${c.nombre} (${c.codigo})`));    // Obtener tipos de evento
    const { data: tiposEventoDB, error: errorTipos } = await supabase
      .from('evt_tipos_evento')
      .select('id, nombre')
      .limit(5);

    if (errorTipos || !tiposEventoDB || tiposEventoDB.length === 0) {
      log.error('No se encontraron tipos de evento');
      return;
    }
    log.success(`Tipos de evento encontrados: ${tiposEventoDB.length}`);

    // Obtener estados
    const { data: estadosDB, error: errorEstados } = await supabase
      .from('evt_estados')
      .select('id, nombre')
      .limit(5);

    if (errorEstados || !estadosDB || estadosDB.length === 0) {
      log.error('No se encontraron estados');
      return;
    }
    log.success(`Estados encontrados: ${estadosDB.length}`);

    // Obtener usuario
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('core_users')
      .select('id')
      .limit(1);

    const usuarioId = usuarios && usuarios.length > 0 ? usuarios[0].id : null;

    // =====================================================
    // 2. CREAR CLIENTES
    // =====================================================
    log.section('2️⃣  CREANDO CLIENTES DE PRUEBA');

    const clientes = [];

  for (const empresa of empresas) {
    const { data: cliente, error } = await supabase
      .from('evt_clientes')
      .insert({
        razon_social: empresa.razon_social,
        nombre_comercial: empresa.nombre_comercial,
        rfc: empresa.rfc,
        email: empresa.email,
        telefono: empresa.telefono
      })
      .select()
      .single();

    if (error) {
      log.error(`Error al crear cliente ${empresa.nombre_comercial}: ${error.message}`);
      continue;
    }

    clientes.push(cliente);
    stats.clientesCreados++;
    log.success(`Cliente creado: ${empresa.nombre_comercial} (${empresa.giro})`);
  }    // =====================================================
    // 3. CREAR EVENTOS
    // =====================================================
    log.section('3️⃣  CREANDO EVENTOS DE PRUEBA');

    const eventosCreados = [];

    for (let i = 0; i < clientes.length; i++) {
      const cliente = clientes[i];
      const numEventos = randomBetween(2, 4); // 2-4 eventos por cliente

      for (let j = 0; j < numEventos; j++) {
        const fechaEvento = randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31));
        const tipoEvento = tiposEventoDB[randomBetween(0, tiposEventoDB.length - 1)];
        const estado = estadosDB[randomBetween(0, estadosDB.length - 1)];

        // Calcular totales estimados con margen 30-40%
        const gastosEstimados = randomFloat(50000, 150000);
        const margenObjetivo = randomFloat(0.30, 0.40); // 30-40%
        const ingresosEstimados = gastosEstimados / (1 - margenObjetivo);
        const utilidadEstimada = ingresosEstimados - gastosEstimados;

        const evento = {
          clave_evento: `EVT-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nombre_proyecto: `Proyecto ${cliente.razon_social.split(' ')[0]} ${new Date().getFullYear()}`,
          descripcion: `${tiposEvento[j % tiposEvento.length]} para ${cliente.razon_social}`,
          cliente_id: cliente.id,
          tipo_evento_id: tipoEvento.id,
          estado_id: estado.id,
          responsable_id: usuarioId,
          fecha_evento: fechaEvento.toISOString().split('T')[0],
          fecha_fin: new Date(fechaEvento.getTime() + 86400000).toISOString().split('T')[0],
          hora_inicio: '09:00',
          hora_fin: '18:00',
          lugar: `Centro de Convenciones #${randomBetween(1, 5)}`,
          numero_invitados: randomBetween(50, 300),
          presupuesto_estimado: ingresosEstimados,
          status_facturacion: 'pendiente_facturar',
          status_pago: 'pendiente',
          prioridad: ['alta', 'media', 'baja'][randomBetween(0, 2)],
          fase_proyecto: ['cotizacion', 'aprobado', 'en_proceso'][randomBetween(0, 2)],
        };

        const { data, error } = await supabase
          .from('evt_eventos')
          .insert([evento])
          .select();

        if (error) {
          log.error(`Error al crear evento: ${error.message}`);
        } else {
          eventosCreados.push({
            ...data[0],
            gastosEstimados,
            ingresosEstimados,
            utilidadEstimada,
            margenObjetivo
          });
          stats.eventosCreados++;
          log.success(`Evento creado: ${evento.clave_evento} - ${evento.nombre_proyecto}`);
        }
      }
    }

    // =====================================================
    // 4. CREAR GASTOS (PAGADOS Y PENDIENTES)
    // =====================================================
    log.section('4️⃣  CREANDO GASTOS (MIXTO: PAGADOS Y PENDIENTES)');

    for (const evento of eventosCreados) {
      const numGastos = randomBetween(4, 8);
      const gastosEvento = [];
      let totalGastosEvento = 0;

      // Distribuir gastos estimados entre los conceptos
      const montoDisponible = evento.gastosEstimados;

      for (let i = 0; i < numGastos; i++) {
        const conceptoGasto = conceptosGastos[randomBetween(0, conceptosGastos.length - 1)];
        const porcentaje = randomFloat(0.10, 0.25); // 10-25% del total
        const subtotal = montoDisponible * porcentaje;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        // 70% pagados, 30% pendientes
        const esPagado = Math.random() < 0.7;
        const cuentaBancaria = cuentas[randomBetween(0, cuentas.length - 1)];

        const gasto = {
          evento_id: evento.id,
          concepto: conceptoGasto.concepto,
          descripcion: `${conceptoGasto.concepto} para ${evento.nombre_proyecto}`,
          proveedor: `Proveedor ${conceptoGasto.concepto}`,
          categoria: 'Servicios',
          subtotal: subtotal,
          iva: iva,
          total: total,
          status_pago: esPagado ? 'pagado' : 'pendiente',
          fecha_gasto: evento.fecha_evento,
          fecha_pago: esPagado ? evento.fecha_evento : null,
          cuenta_bancaria_id: esPagado ? cuentaBancaria.id : null,
          metodo_pago: esPagado ? 'transferencia' : null,
        };

        gastosEvento.push(gasto);
        totalGastosEvento += total;

        if (esPagado) {
          stats.gastosPagados++;
        } else {
          stats.gastosPendientes++;
        }
      }

      // Insertar gastos
      const { data, error } = await supabase
        .from('evt_gastos')
        .insert(gastosEvento)
        .select();

      if (error) {
        log.error(`Error al crear gastos para ${evento.clave_evento}: ${error.message}`);
      } else {
        stats.gastosCreados += data.length;
        stats.totalGastos += totalGastosEvento;
        log.success(`${data.length} gastos creados para ${evento.clave_evento} (Total: ${formatMoney(totalGastosEvento)})`);
        log.info(`  └─ Pagados: ${gastosEvento.filter(g => g.status_pago === 'pagado').length}, Pendientes: ${gastosEvento.filter(g => g.status_pago === 'pendiente').length}`);
      }

      // Guardar total de gastos reales para calcular ingresos
      evento.totalGastosReales = totalGastosEvento;
    }

    // =====================================================
    // 5. CREAR INGRESOS (PAGADOS Y PENDIENTES, UTILIDAD 30-40%)
    // =====================================================
    log.section('5️⃣  CREANDO INGRESOS (UTILIDAD 30-40%, MIXTO: PAGADOS Y PENDIENTES)');

    for (const evento of eventosCreados) {
      // Calcular ingresos para mantener margen 30-40%
      const margen = evento.margenObjetivo;
      const totalIngresosObjetivo = evento.totalGastosReales / (1 - margen);
      
      // Dividir ingresos en 2-4 pagos
      const numIngresos = randomBetween(2, 4);
      const ingresosEvento = [];
      let totalIngresosEvento = 0;

      for (let i = 0; i < numIngresos; i++) {
        const esUltimo = i === numIngresos - 1;
        const porcentaje = esUltimo 
          ? 1 // El último ingreso completa el 100%
          : randomFloat(0.20, 0.40); // 20-40% del total

        const montoIngreso = esUltimo 
          ? (totalIngresosObjetivo - totalIngresosEvento)
          : (totalIngresosObjetivo * porcentaje);

        const subtotal = montoIngreso / 1.16;
        const iva = subtotal * 0.16;
        
        // 60% pagados, 40% pendientes
        const esPagado = Math.random() < 0.6;
        const cuentaBancaria = cuentas[randomBetween(0, cuentas.length - 1)];

        const ingreso = {
          evento_id: evento.id,
          concepto: conceptosIngresos[i % conceptosIngresos.length],
          descripcion: `${conceptosIngresos[i % conceptosIngresos.length]} - ${evento.nombre_proyecto}`,
          subtotal: subtotal,
          iva: iva,
          total: montoIngreso,
          status_pago: esPagado ? 'pagado' : 'pendiente',
          fecha_ingreso: evento.fecha_evento,
          fecha_pago: esPagado ? evento.fecha_evento : null,
          cuenta_bancaria_id: esPagado ? cuentaBancaria.id : null,
          metodo_pago: esPagado ? 'transferencia' : null,
        };

        ingresosEvento.push(ingreso);
        totalIngresosEvento += montoIngreso;

        if (esPagado) {
          stats.ingresosPagados++;
        } else {
          stats.ingresosPendientes++;
        }
      }

      // Insertar ingresos
      const { data, error } = await supabase
        .from('evt_ingresos')
        .insert(ingresosEvento)
        .select();

      if (error) {
        log.error(`Error al crear ingresos para ${evento.clave_evento}: ${error.message}`);
      } else {
        stats.ingresosCreados += data.length;
        stats.totalIngresos += totalIngresosEvento;
        const utilidad = totalIngresosEvento - evento.totalGastosReales;
        const margenReal = (utilidad / totalIngresosEvento) * 100;
        stats.totalUtilidad += utilidad;

        log.success(`${data.length} ingresos creados para ${evento.clave_evento}`);
        log.info(`  ├─ Ingresos: ${formatMoney(totalIngresosEvento)}`);
        log.info(`  ├─ Gastos: ${formatMoney(evento.totalGastosReales)}`);
        log.info(`  ├─ Utilidad: ${formatMoney(utilidad)}`);
        log.info(`  └─ Margen: ${margenReal.toFixed(2)}% (Objetivo: ${(margen * 100).toFixed(2)}%)`);
      }
    }

    // =====================================================
    // 6. RESUMEN FINAL
    // =====================================================
    log.section('📊 RESUMEN DE DATOS GENERADOS');

    console.log(`
${colors.bright}CLIENTES:${colors.reset}
  Total creados: ${colors.green}${stats.clientesCreados}${colors.reset}

${colors.bright}EVENTOS:${colors.reset}
  Total creados: ${colors.green}${stats.eventosCreados}${colors.reset}

${colors.bright}GASTOS:${colors.reset}
  Total creados: ${colors.green}${stats.gastosCreados}${colors.reset}
  ${colors.green}✅ Pagados: ${stats.gastosPagados}${colors.reset}
  ${colors.yellow}⏳ Pendientes: ${stats.gastosPendientes}${colors.reset}
  Monto total: ${colors.cyan}${formatMoney(stats.totalGastos)}${colors.reset}

${colors.bright}INGRESOS:${colors.reset}
  Total creados: ${colors.green}${stats.ingresosCreados}${colors.reset}
  ${colors.green}✅ Pagados: ${stats.ingresosPagados}${colors.reset}
  ${colors.yellow}⏳ Pendientes: ${stats.ingresosPendientes}${colors.reset}
  Monto total: ${colors.cyan}${formatMoney(stats.totalIngresos)}${colors.reset}

${colors.bright}UTILIDAD:${colors.reset}
  Utilidad total: ${colors.green}${formatMoney(stats.totalUtilidad)}${colors.reset}
  Margen promedio: ${colors.cyan}${((stats.totalUtilidad / stats.totalIngresos) * 100).toFixed(2)}%${colors.reset}
    `);

    log.section('✅ GENERACIÓN DE DATOS COMPLETADA');

    console.log(`
${colors.yellow}${colors.bright}⚠️  IMPORTANTE:${colors.reset}
${colors.yellow}Los datos generados incluyen registros PAGADOS y PENDIENTES${colors.reset}
${colors.yellow}El sistema NO debe considerar los pendientes en los cálculos${colors.reset}

${colors.cyan}Siguiente paso: Ejecutar validaciones integrales${colors.reset}
${colors.cyan}Comando: node pruebas-integrales.mjs${colors.reset}
    `);

  } catch (error) {
    log.error(`Error inesperado: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar generación
generarDatosPrueba();
