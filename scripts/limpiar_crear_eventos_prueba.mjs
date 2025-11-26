#!/usr/bin/env node
/**
 * Script para limpiar datos de eventos y crear 3 eventos de prueba específicos:
 * 1. Evento completado y pagado
 * 2. Evento con ingresos pendientes
 * 3. Evento con ingresos y gastos pendientes
 *
 * Ejecutar: npm run limpiar:eventos
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Faltan credenciales de Supabase en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('='.repeat(60));
console.log('SCRIPT DE LIMPIEZA Y CREACION DE EVENTOS DE PRUEBA');
console.log('='.repeat(60));
console.log('');

// ============================================================================
// PASO 1: LIMPIAR DATOS EXISTENTES
// ============================================================================
async function limpiarDatos() {
  console.log('PASO 1: Limpiando datos existentes...');
  console.log('-'.repeat(40));

  try {
    // Orden importante: primero hijos, luego padres
    const tablas = ['evt_gastos', 'evt_ingresos', 'evt_eventos'];

    for (const tabla of tablas) {
      const { error } = await supabase
        .from(tabla)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

      if (error) {
        console.error(`  Error limpiando ${tabla}:`, error.message);
        return false;
      }
      console.log(`  OK: ${tabla} limpiada`);
    }

    console.log('');
    console.log('Datos limpiados exitosamente');
    console.log('');
    return true;

  } catch (error) {
    console.error('Error en limpieza:', error.message);
    return false;
  }
}

// ============================================================================
// PASO 2: OBTENER REFERENCIAS NECESARIAS
// ============================================================================
async function obtenerReferencias() {
  console.log('PASO 2: Obteniendo referencias de catalogos...');
  console.log('-'.repeat(40));

  try {
    // Obtener o crear cliente de prueba
    let { data: clientes } = await supabase
      .from('evt_clientes')
      .select('id, razon_social')
      .limit(3);

    if (!clientes || clientes.length === 0) {
      // Crear cliente de prueba
      const { data: nuevoCliente, error } = await supabase
        .from('evt_clientes')
        .insert({
          razon_social: 'Cliente de Prueba SA de CV',
          nombre_comercial: 'Cliente Prueba',
          rfc: 'CPR230101AAA',
          email: 'prueba@clienteprueba.com',
          telefono: '5551234567',
          direccion: 'Av. Prueba 123, Col. Centro',
          codigo_postal: '06000',
          sufijo_evento: 'CPR',
          activo: true
        })
        .select()
        .single();

      if (error) {
        console.error('  Error creando cliente:', error.message);
        return null;
      }
      clientes = [nuevoCliente];
      console.log('  OK: Cliente de prueba creado');
    } else {
      console.log(`  OK: ${clientes.length} cliente(s) encontrado(s)`);
    }

    // Obtener tipos de evento
    let { data: tipos } = await supabase
      .from('evt_tipos_evento')
      .select('id, nombre')
      .limit(3);

    if (!tipos || tipos.length === 0) {
      // Crear tipos de evento
      const { data: nuevosTipos, error } = await supabase
        .from('evt_tipos_evento')
        .insert([
          { nombre: 'Congreso', descripcion: 'Evento tipo congreso' },
          { nombre: 'Corporativo', descripcion: 'Evento corporativo' },
          { nombre: 'Social', descripcion: 'Evento social' }
        ])
        .select();

      if (error) {
        console.error('  Error creando tipos:', error.message);
        return null;
      }
      tipos = nuevosTipos;
      console.log('  OK: Tipos de evento creados');
    } else {
      console.log(`  OK: ${tipos.length} tipo(s) de evento encontrado(s)`);
    }

    // Obtener estados
    let { data: estados } = await supabase
      .from('evt_estados')
      .select('id, nombre')
      .order('orden', { ascending: true });

    if (!estados || estados.length === 0) {
      // Crear estados basicos
      const { data: nuevosEstados, error } = await supabase
        .from('evt_estados')
        .insert([
          { nombre: 'Cotizacion', color: '#3B82F6', orden: 1 },
          { nombre: 'En Proceso', color: '#F59E0B', orden: 2 },
          { nombre: 'Completado', color: '#10B981', orden: 3 },
          { nombre: 'Cancelado', color: '#EF4444', orden: 4 }
        ])
        .select();

      if (error) {
        console.error('  Error creando estados:', error.message);
        return null;
      }
      estados = nuevosEstados;
      console.log('  OK: Estados creados');
    } else {
      console.log(`  OK: ${estados.length} estado(s) encontrado(s)`);
    }

    // Obtener categorias de ingreso
    let { data: categoriasIngreso } = await supabase
      .from('evt_categorias_ingreso')
      .select('id, nombre')
      .limit(3);

    if (!categoriasIngreso || categoriasIngreso.length === 0) {
      const { data: nuevasCat, error } = await supabase
        .from('evt_categorias_ingreso')
        .insert([
          { nombre: 'Patrocinio', descripcion: 'Ingresos por patrocinios' },
          { nombre: 'Inscripciones', descripcion: 'Ingresos por inscripciones' },
          { nombre: 'Servicios', descripcion: 'Ingresos por servicios' }
        ])
        .select();

      if (error) {
        console.error('  Error creando categorias ingreso:', error.message);
        return null;
      }
      categoriasIngreso = nuevasCat;
      console.log('  OK: Categorias de ingreso creadas');
    } else {
      console.log(`  OK: ${categoriasIngreso.length} categoria(s) de ingreso encontrada(s)`);
    }

    // Obtener categorias de gasto
    let { data: categoriasGasto } = await supabase
      .from('evt_categorias_gasto')
      .select('id, nombre')
      .limit(3);

    if (!categoriasGasto || categoriasGasto.length === 0) {
      const { data: nuevasCat, error } = await supabase
        .from('evt_categorias_gasto')
        .insert([
          { nombre: 'Venue', descripcion: 'Gastos de venue/local' },
          { nombre: 'Catering', descripcion: 'Gastos de alimentacion' },
          { nombre: 'Produccion', descripcion: 'Gastos de produccion' }
        ])
        .select();

      if (error) {
        console.error('  Error creando categorias gasto:', error.message);
        return null;
      }
      categoriasGasto = nuevasCat;
      console.log('  OK: Categorias de gasto creadas');
    } else {
      console.log(`  OK: ${categoriasGasto.length} categoria(s) de gasto encontrada(s)`);
    }

    console.log('');
    return {
      cliente: clientes[0],
      tipos,
      estados,
      categoriasIngreso,
      categoriasGasto
    };

  } catch (error) {
    console.error('Error obteniendo referencias:', error.message);
    return null;
  }
}

// ============================================================================
// PASO 3: CREAR LOS 3 EVENTOS DE PRUEBA
// ============================================================================
async function crearEventosDePrueba(refs) {
  console.log('PASO 3: Creando 3 eventos de prueba...');
  console.log('-'.repeat(40));

  const hoy = new Date();
  const estadoCompletado = refs.estados.find(e => e.nombre.toLowerCase().includes('complet'));
  const estadoEnProceso = refs.estados.find(e => e.nombre.toLowerCase().includes('proceso'));

  try {
    // ========================================================================
    // EVENTO 1: Completado y Pagado
    // ========================================================================
    console.log('');
    console.log('  [EVENTO 1] Completado y Pagado');

    const fechaEvento1 = new Date(hoy);
    fechaEvento1.setMonth(fechaEvento1.getMonth() - 1); // Hace 1 mes

    const { data: evento1, error: errEvento1 } = await supabase
      .from('evt_eventos')
      .insert({
        clave_evento: `${refs.cliente.razon_social?.substring(0,3).toUpperCase() || 'CPR'}-2025-001`,
        nombre_proyecto: 'Congreso Nacional 2025 - COMPLETADO',
        cliente_id: refs.cliente.id,
        tipo_evento_id: refs.tipos[0]?.id,
        estado_id: estadoCompletado?.id || refs.estados[2]?.id,
        fecha_evento: fechaEvento1.toISOString().split('T')[0],
        lugar: 'Centro de Convenciones CDMX',
        presupuesto_estimado: 500000,
        descripcion: 'Evento de prueba - Completado y totalmente pagado',
        activo: true
      })
      .select()
      .single();

    if (errEvento1) {
      console.error('    Error creando evento 1:', errEvento1.message);
      return false;
    }
    console.log(`    OK: Evento creado con ID ${evento1.id}`);

    // Crear ingresos PAGADOS para evento 1
    const ingresos1 = [
      {
        evento_id: evento1.id,
        categoria_id: refs.categoriasIngreso[0]?.id,
        concepto: 'Patrocinio Oro - Empresa ABC',
        monto: 150000,
        fecha_programada: fechaEvento1.toISOString().split('T')[0],
        fecha_pago: fechaEvento1.toISOString().split('T')[0],
        pagado: true,
        comprobante: 'FAC-2025-001'
      },
      {
        evento_id: evento1.id,
        categoria_id: refs.categoriasIngreso[1]?.id,
        concepto: 'Inscripciones (200 participantes)',
        monto: 200000,
        fecha_programada: fechaEvento1.toISOString().split('T')[0],
        fecha_pago: fechaEvento1.toISOString().split('T')[0],
        pagado: true,
        comprobante: 'FAC-2025-002'
      }
    ];

    const { error: errIng1 } = await supabase
      .from('evt_ingresos')
      .insert(ingresos1);

    if (errIng1) {
      console.error('    Error creando ingresos:', errIng1.message);
    } else {
      console.log('    OK: 2 ingresos PAGADOS creados ($350,000)');
    }

    // Crear gastos PAGADOS para evento 1
    const gastos1 = [
      {
        evento_id: evento1.id,
        categoria_id: refs.categoriasGasto[0]?.id,
        concepto: 'Renta de venue - Centro de Convenciones',
        monto: 120000,
        fecha_programada: fechaEvento1.toISOString().split('T')[0],
        fecha_pago: fechaEvento1.toISOString().split('T')[0],
        pagado: true,
        comprobante: 'FAC-PROV-001'
      },
      {
        evento_id: evento1.id,
        categoria_id: refs.categoriasGasto[1]?.id,
        concepto: 'Servicio de catering completo',
        monto: 80000,
        fecha_programada: fechaEvento1.toISOString().split('T')[0],
        fecha_pago: fechaEvento1.toISOString().split('T')[0],
        pagado: true,
        comprobante: 'FAC-PROV-002'
      }
    ];

    const { error: errGas1 } = await supabase
      .from('evt_gastos')
      .insert(gastos1);

    if (errGas1) {
      console.error('    Error creando gastos:', errGas1.message);
    } else {
      console.log('    OK: 2 gastos PAGADOS creados ($200,000)');
    }

    console.log('    RESUMEN: Ingresos $350,000 | Gastos $200,000 | Utilidad $150,000');

    // ========================================================================
    // EVENTO 2: Con Ingresos Pendientes
    // ========================================================================
    console.log('');
    console.log('  [EVENTO 2] Con Ingresos Pendientes');

    const fechaEvento2 = new Date(hoy);
    fechaEvento2.setDate(fechaEvento2.getDate() + 15); // En 15 dias

    const { data: evento2, error: errEvento2 } = await supabase
      .from('evt_eventos')
      .insert({
        clave_evento: `${refs.cliente.razon_social?.substring(0,3).toUpperCase() || 'CPR'}-2025-002`,
        nombre_proyecto: 'Feria Empresarial 2025 - INGRESOS PENDIENTES',
        cliente_id: refs.cliente.id,
        tipo_evento_id: refs.tipos[1]?.id || refs.tipos[0]?.id,
        estado_id: estadoEnProceso?.id || refs.estados[1]?.id,
        fecha_evento: fechaEvento2.toISOString().split('T')[0],
        lugar: 'Hotel Grand Fiesta',
        presupuesto_estimado: 300000,
        descripcion: 'Evento de prueba - Con ingresos por cobrar',
        activo: true
      })
      .select()
      .single();

    if (errEvento2) {
      console.error('    Error creando evento 2:', errEvento2.message);
      return false;
    }
    console.log(`    OK: Evento creado con ID ${evento2.id}`);

    // Crear ingresos PENDIENTES para evento 2
    const ingresos2 = [
      {
        evento_id: evento2.id,
        categoria_id: refs.categoriasIngreso[0]?.id,
        concepto: 'Patrocinio Platino - Corporativo XYZ (PENDIENTE)',
        monto: 100000,
        fecha_programada: fechaEvento2.toISOString().split('T')[0],
        pagado: false
      },
      {
        evento_id: evento2.id,
        categoria_id: refs.categoriasIngreso[2]?.id,
        concepto: 'Servicios adicionales de produccion (PENDIENTE)',
        monto: 50000,
        fecha_programada: fechaEvento2.toISOString().split('T')[0],
        pagado: false
      }
    ];

    const { error: errIng2 } = await supabase
      .from('evt_ingresos')
      .insert(ingresos2);

    if (errIng2) {
      console.error('    Error creando ingresos:', errIng2.message);
    } else {
      console.log('    OK: 2 ingresos PENDIENTES creados ($150,000)');
    }

    // Crear gastos YA PAGADOS para evento 2
    const gastos2 = [
      {
        evento_id: evento2.id,
        categoria_id: refs.categoriasGasto[0]?.id,
        concepto: 'Anticipo venue - Hotel Grand Fiesta',
        monto: 50000,
        fecha_programada: new Date().toISOString().split('T')[0],
        fecha_pago: new Date().toISOString().split('T')[0],
        pagado: true,
        comprobante: 'FAC-PROV-003'
      }
    ];

    const { error: errGas2 } = await supabase
      .from('evt_gastos')
      .insert(gastos2);

    if (errGas2) {
      console.error('    Error creando gastos:', errGas2.message);
    } else {
      console.log('    OK: 1 gasto PAGADO creado ($50,000)');
    }

    console.log('    RESUMEN: Ingresos pendientes $150,000 | Gastos pagados $50,000');

    // ========================================================================
    // EVENTO 3: Con Ingresos Y Gastos Pendientes
    // ========================================================================
    console.log('');
    console.log('  [EVENTO 3] Con Ingresos y Gastos Pendientes');

    const fechaEvento3 = new Date(hoy);
    fechaEvento3.setMonth(fechaEvento3.getMonth() + 2); // En 2 meses

    const { data: evento3, error: errEvento3 } = await supabase
      .from('evt_eventos')
      .insert({
        clave_evento: `${refs.cliente.razon_social?.substring(0,3).toUpperCase() || 'CPR'}-2025-003`,
        nombre_proyecto: 'Seminario Tecnologico 2025 - TODO PENDIENTE',
        cliente_id: refs.cliente.id,
        tipo_evento_id: refs.tipos[2]?.id || refs.tipos[0]?.id,
        estado_id: estadoEnProceso?.id || refs.estados[1]?.id,
        fecha_evento: fechaEvento3.toISOString().split('T')[0],
        lugar: 'Auditorio Nacional',
        presupuesto_estimado: 400000,
        descripcion: 'Evento de prueba - Con ingresos y gastos por procesar',
        activo: true
      })
      .select()
      .single();

    if (errEvento3) {
      console.error('    Error creando evento 3:', errEvento3.message);
      return false;
    }
    console.log(`    OK: Evento creado con ID ${evento3.id}`);

    // Crear ingresos PENDIENTES para evento 3
    const ingresos3 = [
      {
        evento_id: evento3.id,
        categoria_id: refs.categoriasIngreso[0]?.id,
        concepto: 'Patrocinio Diamond - Tech Corp (PENDIENTE)',
        monto: 200000,
        fecha_programada: fechaEvento3.toISOString().split('T')[0],
        pagado: false
      },
      {
        evento_id: evento3.id,
        categoria_id: refs.categoriasIngreso[1]?.id,
        concepto: 'Inscripciones early bird (PENDIENTE)',
        monto: 75000,
        fecha_programada: fechaEvento3.toISOString().split('T')[0],
        pagado: false
      }
    ];

    const { error: errIng3 } = await supabase
      .from('evt_ingresos')
      .insert(ingresos3);

    if (errIng3) {
      console.error('    Error creando ingresos:', errIng3.message);
    } else {
      console.log('    OK: 2 ingresos PENDIENTES creados ($275,000)');
    }

    // Crear gastos PENDIENTES para evento 3
    const gastos3 = [
      {
        evento_id: evento3.id,
        categoria_id: refs.categoriasGasto[0]?.id,
        concepto: 'Renta Auditorio Nacional (PENDIENTE)',
        monto: 180000,
        fecha_programada: fechaEvento3.toISOString().split('T')[0],
        pagado: false
      },
      {
        evento_id: evento3.id,
        categoria_id: refs.categoriasGasto[1]?.id,
        concepto: 'Catering premium (PENDIENTE)',
        monto: 60000,
        fecha_programada: fechaEvento3.toISOString().split('T')[0],
        pagado: false
      },
      {
        evento_id: evento3.id,
        categoria_id: refs.categoriasGasto[2]?.id,
        concepto: 'Produccion audiovisual (PENDIENTE)',
        monto: 45000,
        fecha_programada: fechaEvento3.toISOString().split('T')[0],
        pagado: false
      }
    ];

    const { error: errGas3 } = await supabase
      .from('evt_gastos')
      .insert(gastos3);

    if (errGas3) {
      console.error('    Error creando gastos:', errGas3.message);
    } else {
      console.log('    OK: 3 gastos PENDIENTES creados ($285,000)');
    }

    console.log('    RESUMEN: Ingresos pendientes $275,000 | Gastos pendientes $285,000');

    return true;

  } catch (error) {
    console.error('Error creando eventos:', error.message);
    return false;
  }
}

// ============================================================================
// PASO 4: VERIFICAR DATOS CREADOS
// ============================================================================
async function verificarDatos() {
  console.log('');
  console.log('PASO 4: Verificando datos creados...');
  console.log('-'.repeat(40));

  try {
    const { data: eventos } = await supabase
      .from('evt_eventos')
      .select(`
        id,
        clave_evento,
        nombre_proyecto,
        evt_ingresos (id, monto, pagado),
        evt_gastos (id, monto, pagado)
      `)
      .order('clave_evento');

    if (!eventos || eventos.length === 0) {
      console.log('  No se encontraron eventos');
      return;
    }

    console.log('');
    console.log('  EVENTOS CREADOS:');
    console.log('  ' + '='.repeat(56));

    for (const evento of eventos) {
      const ingresosTotal = evento.evt_ingresos?.reduce((sum, i) => sum + (i.monto || 0), 0) || 0;
      const ingresosPagados = evento.evt_ingresos?.filter(i => i.pagado).reduce((sum, i) => sum + (i.monto || 0), 0) || 0;
      const gastosTotal = evento.evt_gastos?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0;
      const gastosPagados = evento.evt_gastos?.filter(g => g.pagado).reduce((sum, g) => sum + (g.monto || 0), 0) || 0;

      console.log(`  ${evento.clave_evento}`);
      console.log(`    ${evento.nombre_proyecto}`);
      console.log(`    Ingresos: $${ingresosTotal.toLocaleString()} (Pagados: $${ingresosPagados.toLocaleString()})`);
      console.log(`    Gastos:   $${gastosTotal.toLocaleString()} (Pagados: $${gastosPagados.toLocaleString()})`);
      console.log('  ' + '-'.repeat(56));
    }

  } catch (error) {
    console.error('Error verificando datos:', error.message);
  }
}

// ============================================================================
// EJECUTAR SCRIPT
// ============================================================================
async function main() {
  console.log('');

  // Paso 1: Limpiar
  const limpiezaOK = await limpiarDatos();
  if (!limpiezaOK) {
    console.error('Abortando: Error en limpieza');
    process.exit(1);
  }

  // Paso 2: Obtener referencias
  const refs = await obtenerReferencias();
  if (!refs) {
    console.error('Abortando: No se pudieron obtener referencias');
    process.exit(1);
  }

  // Paso 3: Crear eventos
  const eventosOK = await crearEventosDePrueba(refs);
  if (!eventosOK) {
    console.error('Abortando: Error creando eventos');
    process.exit(1);
  }

  // Paso 4: Verificar
  await verificarDatos();

  console.log('');
  console.log('='.repeat(60));
  console.log('SCRIPT COMPLETADO EXITOSAMENTE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Se crearon 3 eventos de prueba:');
  console.log('  1. Completado y pagado (ingresos y gastos al 100%)');
  console.log('  2. Con ingresos pendientes (gastos pagados)');
  console.log('  3. Con ingresos y gastos pendientes');
  console.log('');
}

main().catch(console.error);
