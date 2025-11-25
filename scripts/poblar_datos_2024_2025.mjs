#!/usr/bin/env node

/**
 * =========================================================================
 * SCRIPT: Poblar Base de Datos ERP-777 V01 - 2024 y 2025
 * =========================================================================
 *
 * PROPÓSITO:
 * Genera datos de prueba coherentes para análisis financiero del ERP.
 *
 * CARACTERÍSTICAS:
 * - 1 evento por mes por cliente (24 eventos × clientes)
 * - 8 ingresos por evento (distribución realista)
 * - 8 gastos por evento (4 categorías, 2 gastos c/u)
 * - Utilidad real entre 30-40% (aleatorio controlado)
 * - Fechas coherentes según antigüedad
 * - Estados de pago lógicos
 *
 * EJECUCIÓN:
 * node scripts/poblar_datos_2024_2025.mjs
 *
 * AUTOR: Claude Code
 * FECHA: 11 Nov 2025
 * =========================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

// ========================================
// CONFIGURACIÓN
// ========================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const AÑOS = [2024, 2025];
const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// IDs de categorías según migración 010
const CATEGORIA_IDS = {
  SOLICITUDES_PAGO: 6,
  RECURSOS_HUMANOS: 7,
  MATERIALES: 8,
  COMBUSTIBLE_PEAJE: 9
};

// Estados según orden del workflow
const ESTADO_IDS = {
  BORRADOR: 1,
  COTIZADO: 2,
  APROBADO: 3,
  EN_PROCESO: 4,
  COMPLETADO: 5,
  FACTURADO: 6,
  COBRADO: 7
};

// ========================================
// UTILIDADES
// ========================================

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

function randomDate(baseDate, minDays, maxDays) {
  const date = new Date(baseDate);
  const days = randomInt(minDays, maxDays);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function calcularIVA(subtotal, porcentaje = 16) {
  return parseFloat((subtotal * (porcentaje / 100)).toFixed(2));
}

function calcularTotal(subtotal, iva) {
  return parseFloat((subtotal + iva).toFixed(2));
}

function getDiasDesdeHoy(fecha) {
  const hoy = new Date();
  const fechaEvento = new Date(fecha);
  return Math.floor((hoy - fechaEvento) / (1000 * 60 * 60 * 24));
}

function getEstadoPorAntiguedad(diasDesdeHoy) {
  if (diasDesdeHoy < -60) return ESTADO_IDS.BORRADOR;
  if (diasDesdeHoy < -30) return ESTADO_IDS.COTIZADO;
  if (diasDesdeHoy < -7) return ESTADO_IDS.APROBADO;
  if (diasDesdeHoy < 0) return ESTADO_IDS.EN_PROCESO;
  if (diasDesdeHoy < 30) return ESTADO_IDS.COMPLETADO;
  if (diasDesdeHoy < 60) return ESTADO_IDS.FACTURADO;
  return ESTADO_IDS.COBRADO;
}

// ========================================
// INICIALIZACIÓN
// ========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n========================================');
console.log('📊 POBLAR BASE DE DATOS ERP-777 V01');
console.log('========================================\n');

// ========================================
// LIMPIEZA DE DATOS
// ========================================

async function limpiarDatos() {
  console.log('🧹 Limpiando datos existentes...\n');

  try {
    // Eliminar en orden por dependencias
    const { error: errorGastos } = await supabase
      .from('evt_gastos')
      .delete()
      .neq('id', 0);

    if (errorGastos) throw errorGastos;
    console.log('  ✓ Gastos eliminados');

    const { error: errorIngresos } = await supabase
      .from('evt_ingresos')
      .delete()
      .neq('id', 0);

    if (errorIngresos) throw errorIngresos;
    console.log('  ✓ Ingresos eliminados');

    const { error: errorEventos } = await supabase
      .from('evt_eventos')
      .delete()
      .neq('id', 0);

    if (errorEventos) throw errorEventos;
    console.log('  ✓ Eventos eliminados\n');

    return true;
  } catch (error) {
    console.error('❌ Error al limpiar datos:', error.message);
    return false;
  }
}

// ========================================
// OBTENER DATOS DE REFERENCIA
// ========================================

async function obtenerReferencias() {
  console.log('📋 Obteniendo datos de referencia...\n');

  try {
    // Clientes
    const { data: clientes, error: errorClientes } = await supabase
      .from('evt_clientes')
      .select('id, razon_social, sufijo')
      .eq('activo', true)
      .limit(10);

    if (errorClientes) throw errorClientes;
    if (!clientes || clientes.length < 3) {
      throw new Error('Se requieren al menos 3 clientes activos');
    }
    console.log(`  ✓ ${clientes.length} clientes encontrados`);

    // Tipos de evento
    const { data: tiposEvento, error: errorTipos } = await supabase
      .from('evt_tipos_evento')
      .select('id, nombre')
      .eq('activo', true);

    if (errorTipos) throw errorTipos;
    if (!tiposEvento || tiposEvento.length === 0) {
      throw new Error('Se requiere al menos 1 tipo de evento');
    }
    console.log(`  ✓ ${tiposEvento.length} tipos de evento encontrados`);

    // Usuarios
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('core_users')
      .select('id, nombre')
      .eq('activo', true)
      .limit(5);

    if (errorUsuarios) throw errorUsuarios;
    if (!usuarios || usuarios.length === 0) {
      throw new Error('Se requiere al menos 1 usuario activo');
    }
    console.log(`  ✓ ${usuarios.length} usuarios encontrados`);

    // Cuentas contables para gastos (ID <= 23)
    const { data: cuentasGastos, error: errorCuentasG } = await supabase
      .from('evt_cuentas_contables')
      .select('id, nombre')
      .lte('id', 23)
      .eq('activa', true)
      .limit(10);

    if (errorCuentasG) throw errorCuentasG;
    if (!cuentasGastos || cuentasGastos.length === 0) {
      throw new Error('No hay cuentas contables para gastos (ID <= 23)');
    }
    console.log(`  ✓ ${cuentasGastos.length} cuentas para gastos`);

    // Cuentas contables para ingresos (ID >= 24)
    const { data: cuentasIngresos, error: errorCuentasI } = await supabase
      .from('evt_cuentas_contables')
      .select('id, nombre')
      .gte('id', 24)
      .eq('activa', true)
      .limit(5);

    if (errorCuentasI) throw errorCuentasI;
    if (!cuentasIngresos || cuentasIngresos.length === 0) {
      throw new Error('No hay cuentas contables para ingresos (ID >= 24)');
    }
    console.log(`  ✓ ${cuentasIngresos.length} cuentas para ingresos\n`);

    return {
      clientes,
      tiposEvento,
      usuarios,
      cuentasGastos,
      cuentasIngresos
    };
  } catch (error) {
    console.error('❌ Error al obtener referencias:', error.message);
    throw error;
  }
}

// ========================================
// GENERADORES
// ========================================

function generarProvisiones() {
  // Base aleatoria entre 50,000 y 150,000
  const base = random(50000, 150000);

  // Distribución por categoría
  const pctCombustible = random(0.10, 0.15);
  const pctMateriales = random(0.25, 0.30);
  const pctRH = random(0.35, 0.45);
  // SPs es el resto

  const combustible = parseFloat((base * pctCombustible).toFixed(2));
  const materiales = parseFloat((base * pctMateriales).toFixed(2));
  const rh = parseFloat((base * pctRH).toFixed(2));
  const sps = parseFloat((base - combustible - materiales - rh).toFixed(2));

  return {
    provision_combustible_peaje: combustible,
    provision_materiales: materiales,
    provision_recursos_humanos: rh,
    provision_solicitudes_pago: sps,
    total: combustible + materiales + rh + sps
  };
}

function generarIngresoEstimado(provisionesTotal) {
  // Margen estimado entre 30-40%
  const factor = random(1.30, 1.40);
  return parseFloat((provisionesTotal * factor).toFixed(2));
}

function generarIngresos(eventoId, ingresoEstimado, fechaEvento, diasDesdeHoy, cuentas, responsableId) {
  const ingresos = [];

  // 8 ingresos con distribución específica
  const distribuciones = [
    { porcentaje: 0.20, nombre: 'Anticipo', probabilidadCobro: 1.00 },
    { porcentaje: 0.15, nombre: 'Pago 1', probabilidadCobro: 0.90 },
    { porcentaje: 0.15, nombre: 'Pago 2', probabilidadCobro: 0.80 },
    { porcentaje: 0.15, nombre: 'Pago 3', probabilidadCobro: 0.70 },
    { porcentaje: 0.10, nombre: 'Pago 4', probabilidadCobro: 0.60 },
    { porcentaje: 0.10, nombre: 'Pago 5', probabilidadCobro: 0.50 },
    { porcentaje: 0.10, nombre: 'Pago 6', probabilidadCobro: 0.40 },
    { porcentaje: 0.05, nombre: 'Pago Final', probabilidadCobro: diasDesdeHoy > 60 ? 0.80 : 0.00 }
  ];

  let totalAcumulado = 0;

  distribuciones.forEach((dist, index) => {
    const subtotal = index === distribuciones.length - 1
      ? parseFloat((ingresoEstimado - totalAcumulado).toFixed(2)) // Último ajusta total
      : parseFloat((ingresoEstimado * dist.porcentaje).toFixed(2));

    totalAcumulado += subtotal;

    const iva = calcularIVA(subtotal, 16);
    const total = calcularTotal(subtotal, iva);

    // Determinar si está cobrado
    const cobrado = Math.random() < dist.probabilidadCobro;
    const fechaCobro = cobrado ? randomDate(fechaEvento, 5, 45) : null;

    ingresos.push({
      evento_id: eventoId,
      concepto: `${dist.nombre} - Servicio de Evento`,
      descripcion: `Pago ${index + 1} de 8 correspondiente al servicio de evento`,
      cantidad: 1,
      precio_unitario: subtotal,
      subtotal: subtotal,
      iva_porcentaje: 16,
      iva: iva,
      total: total,
      fecha_ingreso: fechaEvento,
      fecha_facturacion: cobrado ? randomDate(fechaEvento, 1, 30) : null,
      fecha_cobro: fechaCobro,
      facturado: cobrado,
      cobrado: cobrado,
      metodo_cobro: cobrado ? (Math.random() > 0.2 ? 'transferencia' : 'efectivo') : null,
      cuenta_contable_id: cuentas[randomInt(0, cuentas.length - 1)].id,
      responsable_id: responsableId,
      referencia: cobrado ? `REF-ING-${Date.now()}-${randomInt(1000, 9999)}` : null
    });
  });

  return ingresos;
}

function generarGastos(
  eventoId,
  provisiones,
  ingresosCobrados,
  fechaEvento,
  diasDesdeHoy,
  cuentas,
  responsableId
) {
  // Calcular target de gastos para lograr utilidad 30-40%
  const margenDeseado = random(0.30, 0.40);
  const gastosTotalesTarget = ingresosCobrados / (1 + margenDeseado);

  // Distribución por categoría
  const pctCombustible = random(0.12, 0.15);
  const pctMateriales = random(0.28, 0.32);
  const pctRH = random(0.38, 0.42);
  // SPs es el resto

  // NUEVA LÓGICA: 20% de probabilidad de exceder presupuesto (sobre-gasto)
  const excederPresupuesto = Math.random() < 0.20; // 20% de eventos
  const factorExceso = excederPresupuesto ? random(1.05, 1.25) : random(0.85, 1.00);

  const gastos = [];

  // Configuración de categorías
  const categorias = [
    {
      id: CATEGORIA_IDS.COMBUSTIBLE_PEAJE,
      nombre: 'Combustible/Peaje',
      cantidad: 2,
      provision: provisiones.provision_combustible_peaje,
      porcentaje: pctCombustible,
      tipoComprobante: 'E',
      proveedores: ['Gasolinera Shell', 'Pemex', 'BP Gas Station']
    },
    {
      id: CATEGORIA_IDS.MATERIALES,
      nombre: 'Materiales',
      cantidad: 2,
      provision: provisiones.provision_materiales,
      porcentaje: pctMateriales,
      tipoComprobante: 'E',
      proveedores: ['Proveedor Materiales SA', 'Suministros Industriales', 'Comercializadora XYZ']
    },
    {
      id: CATEGORIA_IDS.RECURSOS_HUMANOS,
      nombre: 'Recursos Humanos',
      cantidad: 2,
      provision: provisiones.provision_recursos_humanos,
      porcentaje: pctRH,
      tipoComprobante: 'N', // Nómina
      proveedores: ['Staff Temporal', 'Personal Contratado', 'Técnicos Especializados']
    },
    {
      id: CATEGORIA_IDS.SOLICITUDES_PAGO,
      nombre: 'Solicitudes de Pago',
      cantidad: 2,
      provision: provisiones.provision_solicitudes_pago,
      porcentaje: null, // Resto
      tipoComprobante: 'P', // Pago
      proveedores: ['Proveedor Servicios', 'Contratista Externo', 'Servicios Profesionales']
    }
  ];

  let totalAcumuladoPorcentaje = pctCombustible + pctMateriales + pctRH;

  categorias.forEach((cat, catIndex) => {
    // Calcular total para esta categoría
    let totalCategoria;
    if (cat.porcentaje === null) {
      // SPs usa el resto
      totalCategoria = gastosTotalesTarget * (1 - totalAcumuladoPorcentaje);
    } else {
      totalCategoria = gastosTotalesTarget * cat.porcentaje;
    }

    // Aplicar factor de exceso a esta categoría específica
    // Para algunos eventos, permite que gastos excedan la provisión
    totalCategoria = totalCategoria * factorExceso;

    // Dividir entre los gastos de la categoría
    const subtotalPorGasto = totalCategoria / cat.cantidad;

    for (let i = 0; i < cat.cantidad; i++) {
      // Variar ligeramente cada gasto (±15%)
      const variacion = random(0.85, 1.15);
      let subtotal = parseFloat((subtotalPorGasto * variacion).toFixed(2));

      const iva = calcularIVA(subtotal, 16);
      const total = calcularTotal(subtotal, iva);

      // Determinar si está pagado según antigüedad
      const probabilidadPago = diasDesdeHoy > 30
        ? random(0.85, 0.95)
        : random(0.40, 0.60);
      const pagado = Math.random() < probabilidadPago;
      const fechaPago = pagado ? randomDate(fechaEvento, 7, 60) : null;

      gastos.push({
        evento_id: eventoId,
        categoria_id: cat.id,
        concepto: `${cat.nombre} - ${cat.proveedores[i % cat.proveedores.length]}`,
        descripcion: `Gasto ${i + 1} de ${cat.cantidad} en categoría ${cat.nombre}`,
        proveedor: cat.proveedores[i % cat.proveedores.length],
        rfc_proveedor: `RFC${String(randomInt(10000000, 99999999))}0`,
        cantidad: 1,
        precio_unitario: subtotal,
        subtotal: subtotal,
        iva_porcentaje: 16,
        iva: iva,
        total: total,
        fecha_gasto: randomDate(fechaEvento, -15, 15),
        fecha_pago: fechaPago,
        pagado: pagado,
        comprobado: pagado,
        status_aprobacion: 'aprobado',
        cuenta_contable_id: cuentas[randomInt(0, cuentas.length - 1)].id,
        responsable_id: responsableId,
        forma_pago: pagado ? 'transferencia' : null,
        tipo_comprobante: cat.tipoComprobante,
        referencia: pagado ? `REF-GASTO-${Date.now()}-${randomInt(1000, 9999)}` : null
      });
    }
  });

  return gastos;
}

// ========================================
// GENERAR EVENTOS
// ========================================

async function generarEventos(referencias) {
  console.log('📅 Generando eventos...\n');

  const { clientes, tiposEvento, usuarios, cuentasGastos, cuentasIngresos } = referencias;

  let totalEventos = 0;
  let totalIngresos = 0;
  let totalGastos = 0;
  const errores = [];

  for (const año of AÑOS) {
    console.log(`\n  📆 Año ${año}:`);

    for (const mes of MESES) {
      for (const cliente of clientes) {
        try {
          // Fecha del evento (día 15 del mes)
          const fechaEvento = `${año}-${String(mes).padStart(2, '0')}-15`;
          const diasDesdeHoy = getDiasDesdeHoy(fechaEvento);

          // Generar clave única
          const numeroEvento = String(totalEventos + 1).padStart(3, '0');
          const claveEvento = `EVT-${año}-${String(mes).padStart(2, '0')}-${numeroEvento}`;

          // Provisiones
          const provisiones = generarProvisiones();

          // Ingreso estimado
          const ingresoEstimado = generarIngresoEstimado(provisiones.total);

          // Estado según antigüedad
          const estadoId = getEstadoPorAntiguedad(diasDesdeHoy);

          // Crear evento
          const eventoData = {
            clave_evento: claveEvento,
            nombre_proyecto: `Evento ${cliente.razon_social} - ${mes}/${año}`,
            descripcion: `Evento mensual para ${cliente.razon_social} del mes ${mes} del año ${año}`,
            cliente_id: cliente.id,
            tipo_evento_id: tiposEvento[randomInt(0, tiposEvento.length - 1)].id,
            estado_id: estadoId,
            responsable_id: usuarios[randomInt(0, usuarios.length - 1)].id,
            solicitante_id: usuarios[randomInt(0, usuarios.length - 1)].id,
            fecha_evento: fechaEvento,
            fecha_fin: randomDate(fechaEvento, 0, 2),
            hora_inicio: '09:00:00',
            hora_fin: '18:00:00',
            lugar: `Venue ${randomInt(1, 10)} - Ciudad de México`,
            numero_invitados: randomInt(50, 300),
            prioridad: diasDesdeHoy < 0 ? 'alta' : 'media',
            fase_proyecto: diasDesdeHoy > 30 ? 'completado' : (diasDesdeHoy > 0 ? 'ejecucion' : 'planificacion'),
            provision_combustible_peaje: provisiones.provision_combustible_peaje,
            provision_materiales: provisiones.provision_materiales,
            provision_recursos_humanos: provisiones.provision_recursos_humanos,
            provision_solicitudes_pago: provisiones.provision_solicitudes_pago,
            ganancia_estimada: ingresoEstimado,
            status_facturacion: estadoId >= ESTADO_IDS.FACTURADO ? 'facturado' : 'pendiente_facturar',
            status_pago: estadoId === ESTADO_IDS.COBRADO ? 'pagado' : 'pendiente',
            activo: true
          };

          const { data: evento, error: errorEvento } = await supabase
            .from('evt_eventos')
            .insert(eventoData)
            .select()
            .single();

          if (errorEvento) throw errorEvento;

          totalEventos++;

          // Generar ingresos
          const ingresos = generarIngresos(
            evento.id,
            ingresoEstimado,
            fechaEvento,
            diasDesdeHoy,
            cuentasIngresos,
            evento.responsable_id
          );

          const { error: errorIngresos } = await supabase
            .from('evt_ingresos')
            .insert(ingresos);

          if (errorIngresos) throw errorIngresos;
          totalIngresos += ingresos.length;

          // Calcular ingresos cobrados
          const ingresosCobrados = ingresos
            .filter(i => i.cobrado)
            .reduce((sum, i) => sum + i.total, 0);

          // Generar gastos
          const gastos = generarGastos(
            evento.id,
            provisiones,
            ingresosCobrados,
            fechaEvento,
            diasDesdeHoy,
            cuentasGastos,
            evento.responsable_id
          );

          const { error: errorGastos } = await supabase
            .from('evt_gastos')
            .insert(gastos);

          if (errorGastos) throw errorGastos;
          totalGastos += gastos.length;

          // Mostrar progreso cada 10 eventos
          if (totalEventos % 10 === 0) {
            console.log(`    ✓ ${totalEventos} eventos generados...`);
          }

        } catch (error) {
          errores.push({
            cliente: cliente.razon_social,
            mes,
            año,
            error: error.message
          });
        }
      }
    }
  }

  console.log(`\n  ✓ Total: ${totalEventos} eventos generados`);
  console.log(`  ✓ Total: ${totalIngresos} ingresos generados`);
  console.log(`  ✓ Total: ${totalGastos} gastos generados\n`);

  if (errores.length > 0) {
    console.log(`  ⚠️  ${errores.length} errores encontrados:\n`);
    errores.forEach(e => {
      console.log(`    - ${e.cliente} (${e.mes}/${e.año}): ${e.error}`);
    });
  }

  return { totalEventos, totalIngresos, totalGastos, errores };
}

// ========================================
// SCRIPT PRINCIPAL
// ========================================

async function main() {
  try {
    // 1. Limpiar datos existentes
    const limpiezaOk = await limpiarDatos();
    if (!limpiezaOk) {
      throw new Error('No se pudo limpiar los datos existentes');
    }

    // 2. Obtener referencias
    const referencias = await obtenerReferencias();

    // 3. Generar eventos con ingresos y gastos
    const resultado = await generarEventos(referencias);

    // 4. Reporte final
    console.log('\n========================================');
    console.log('✅ PROCESO COMPLETADO');
    console.log('========================================\n');
    console.log(`📊 Estadísticas:`);
    console.log(`  - Eventos creados: ${resultado.totalEventos}`);
    console.log(`  - Ingresos creados: ${resultado.totalIngresos}`);
    console.log(`  - Gastos creados: ${resultado.totalGastos}`);
    console.log(`  - Errores: ${resultado.errores.length}\n`);

    if (resultado.errores.length === 0) {
      console.log('✨ Todos los datos se generaron correctamente\n');
      console.log('📝 Siguiente paso:');
      console.log('   Ejecuta las queries de validación para verificar coherencia\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
main();
