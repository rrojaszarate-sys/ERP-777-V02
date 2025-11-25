#!/usr/bin/env node

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
  console.error('❌ Error: Faltan credenciales de Supabase en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Iniciando carga de datos de prueba v2...\n');

// ============================================================================
// PASO 1: LIMPIAR DATOS EXISTENTES
// ============================================================================
async function limpiarDatos() {
  console.log('🧹 Limpiando datos existentes...\n');

  try {
    // Orden importante: primero hijos, luego padres
    const tablas = ['evt_gastos', 'evt_ingresos', 'evt_eventos'];

    for (const tabla of tablas) {
      const { error } = await supabase
        .from(tabla)
        .delete()
        .neq('id', 0); // Eliminar todos (truthy condition)

      if (error) {
        console.error(`❌ Error limpiando ${tabla}:`, error.message);
        return false;
      }
      console.log(`  ✅ ${tabla} limpiada`);
    }

    console.log('\n✨ Datos limpiados exitosamente\n');
    return true;

  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    return false;
  }
}

// ============================================================================
// PASO 2: OBTENER IDs DE REFERENCIA
// ============================================================================
async function obtenerReferencias() {
  console.log('🔍 Obteniendo referencias de la BD...\n');

  try {
    // Obtener clientes
    const { data: clientes } = await supabase
      .from('evt_clientes')
      .select('id, razon_social')
      .limit(5);

    if (!clientes || clientes.length === 0) {
      console.error('❌ No hay clientes en la BD. Debes crear al menos 3 clientes primero.');
      return null;
    }
    console.log(`  ✅ Clientes: ${clientes.length} encontrados`);

    // Obtener tipos de evento
    const { data: tipos } = await supabase
      .from('evt_tipos_evento')
      .select('id, nombre')
      .limit(5);

    if (!tipos || tipos.length === 0) {
      console.error('❌ No hay tipos de evento en la BD.');
      return null;
    }
    console.log(`  ✅ Tipos de evento: ${tipos.length} encontrados`);

    // Obtener estados
    const { data: estados } = await supabase
      .from('evt_estados')
      .select('id, nombre')
      .order('orden', { ascending: true });

    if (!estados || estados.length === 0) {
      console.error('❌ No hay estados en la BD.');
      return null;
    }
    console.log(`  ✅ Estados: ${estados.length} encontrados`);

    // Obtener categorías de gastos
    const { data: categorias } = await supabase
      .from('evt_categorias_gastos')
      .select('id, nombre');

    const categoriasMap = {};
    if (categorias) {
      categorias.forEach(cat => {
        const nombre = cat.nombre.toLowerCase();
        if (nombre.includes('combustible') || nombre.includes('peaje')) {
          categoriasMap.combustible = cat.id;
        }
        if (nombre.includes('materiales')) {
          categoriasMap.materiales = cat.id;
        }
        if (nombre.includes('recursos humanos') || nombre.includes('rh')) {
          categoriasMap.rh = cat.id;
        }
        if (nombre.includes('solicitudes') || nombre.includes('sps')) {
          categoriasMap.sps = cat.id;
        }
      });
    }

    if (!categoriasMap.combustible || !categoriasMap.materiales || !categoriasMap.rh || !categoriasMap.sps) {
      console.error('❌ Faltan categorías necesarias de gastos');
      console.error('   Encontradas:', categoriasMap);
      return null;
    }
    console.log(`  ✅ Categorías mapeadas correctamente`);

    // Obtener o crear cuentas contables (REQUERIDO para cuenta_contable_id)
    // IMPORTANTE: Los gastos requieren cuenta_contable_id <= 23
    let { data: cuentas } = await supabase
      .from('evt_cuentas_contables')
      .select('id, codigo, nombre, tipo')
      .eq('tipo', 'gasto')
      .lte('id', 23) // Solo cuentas con ID <= 23 para gastos
      .limit(1);

    let cuentaId;

    if (!cuentas || cuentas.length === 0) {
      console.error('❌ No hay cuentas de gasto con ID <= 23');
      console.error('   Debes crear al menos una cuenta contable de tipo gasto en la BD');
      console.error('   O ejecuta el script de migración para crear cuentas predeterminadas');
      return null;
    } else {
      cuentaId = cuentas[0].id;
      console.log(`  ✅ Cuenta contable: ID=${cuentaId}, ${cuentas[0].codigo} - ${cuentas[0].nombre}`);
    }

    // Obtener cuenta de ingresos (ID >= 24) para evt_ingresos
    let { data: cuentasIngreso } = await supabase
      .from('evt_cuentas_contables')
      .select('id, codigo, nombre, tipo')
      .eq('tipo', 'ingreso')
      .gte('id', 24) // Solo cuentas con ID >= 24 para ingresos
      .limit(1);

    let cuentaIngresoId;

    if (!cuentasIngreso || cuentasIngreso.length === 0) {
      console.error('❌ No hay cuentas de ingreso con ID >= 24');
      console.error('   Los ingresos no se cargarán');
      cuentaIngresoId = null;
    } else {
      cuentaIngresoId = cuentasIngreso[0].id;
      console.log(`  ✅ Cuenta ingreso: ID=${cuentaIngresoId}, ${cuentasIngreso[0].codigo} - ${cuentasIngreso[0].nombre}`);
    }

    // Obtener o crear usuario (REQUERIDO para responsable_id)
    let { data: users } = await supabase
      .from('core_users')
      .select('id, nombre, apellidos, email')
      .eq('activo', true);

    let userId;

    if (!users || users.length === 0) {
      console.error('❌ No hay usuarios en core_users');
      console.error('   Los usuarios ya deben existir en la base de datos.');
      console.error('   Verifica con: node scripts/check_users.mjs');
      return null;
    } else {
      userId = users[0].id;
      const userList = users.map(u => u.id);
      console.log(`  ✅ Usuarios encontrados: ${users.length}`);
      users.forEach(u => {
        console.log(`     - ${u.email} (${u.nombre} ${u.apellidos || ''})`);
      });
    }

    console.log('');

    return {
      clientes,
      tipos,
      estados,
      categorias: categoriasMap,
      cuentaId,
      cuentaIngresoId,
      userId
    };

  } catch (error) {
    console.error('❌ Error obteniendo referencias:', error.message);
    return null;
  }
}

// ============================================================================
// PASO 3: GENERAR DATOS DE PRUEBA
// ============================================================================
async function generarDatos(refs) {
  console.log('📝 Generando datos de prueba (3 años: 2023-2025)...\n');

  const { clientes, tipos, estados, categorias, cuentaId, cuentaIngresoId, userId } = refs;

  let stats = {
    eventos: 0,
    ingresos: 0,
    gastos: 0,
    errores: []
  };

  const hoy = new Date();

  // Generar 2 eventos por mes durante 3 años
  for (let anio = 2023; anio <= 2025; anio++) {
    for (let mes = 1; mes <= 12; mes++) {
      // Generar 2 eventos por mes
      for (let eventoNum = 1; eventoNum <= 2; eventoNum++) {

        // Fecha del evento: día 15 del mes
        const fechaEvento = new Date(anio, mes - 1, 15);
        const esAntiguo = (hoy - fechaEvento) / (1000 * 60 * 60 * 24) > 30;

        // Seleccionar referencias aleatorias
        const cliente = clientes[Math.floor(Math.random() * clientes.length)];
        const tipo = tipos[Math.floor(Math.random() * tipos.length)];
        const estado = esAntiguo ? estados[estados.length - 1] : estados[Math.floor(Math.random() * estados.length)];

        // Calcular provisiones (distribuidas uniformemente)
        const provTotal = 50000 + Math.floor(Math.random() * 150000);
        const provCombustible = Math.round(provTotal * (0.10 + Math.random() * 0.05));
        const provMateriales = Math.round(provTotal * (0.25 + Math.random() * 0.05));
        const provRH = Math.round(provTotal * (0.35 + Math.random() * 0.10));
        const provSPS = provTotal - provCombustible - provMateriales - provRH;

        // Ingreso estimado (15-35% más que provisión)
        const ingresoEstimado = Math.round(provTotal * (1.15 + Math.random() * 0.20));

        // ========================================================================
        // INSERTAR EVENTO
        // ========================================================================
        const { data: evento, error: errorEvento } = await supabase
          .from('evt_eventos')
          .insert({
            company_id: null,
            clave_evento: `EVT-${anio}-${String(mes).padStart(2, '0')}-${String(eventoNum).padStart(2, '0')}`,
            nombre_proyecto: `Evento ${anio}-${mes}-${eventoNum}`,
            descripcion: `Evento de prueba generado automáticamente para ${cliente.razon_social}`,
            cliente_id: cliente.id,
            tipo_evento_id: tipo.id,
            estado_id: estado.id,
            fecha_evento: fechaEvento.toISOString().split('T')[0],
            fecha_fin: fechaEvento.toISOString().split('T')[0],
            lugar: `Ubicación ${eventoNum}, ${cliente.razon_social}`,
            numero_invitados: 50 + Math.floor(Math.random() * 450),
            prioridad: Math.random() > 0.5 ? 'alta' : 'media',
            fase_proyecto: esAntiguo ? 'completado' : (Math.random() > 0.5 ? 'ejecucion' : 'planificacion'),
            responsable_id: userId,
            solicitante_id: userId,
            provision_combustible_peaje: provCombustible,
            provision_materiales: provMateriales,
            provision_recursos_humanos: provRH,
            provision_solicitudes_pago: provSPS,
            ingreso_estimado: ingresoEstimado,
            activo: true
          })
          .select()
          .single();

        if (errorEvento) {
          stats.errores.push(`Evento ${anio}-${mes}-${eventoNum}: ${errorEvento.message}`);
          console.error(`  ❌ Error en evento ${anio}-${mes}-${eventoNum}:`, errorEvento.message);
          continue;
        }

        stats.eventos++;

        // ========================================================================
        // INSERTAR INGRESOS (3 por evento: 40%, 35%, 25%)
        // ========================================================================
        const ingresos = [
          {
            evento_id: evento.id,
            concepto: 'Anticipo 40%',
            total: Math.round(ingresoEstimado * 0.40),
            cobrado: true, // Anticipo siempre cobrado
            fecha_cobro: esAntiguo ? new Date(fechaEvento.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
            cuenta_contable_id: cuentaIngresoId,
            responsable_id: userId
          },
          {
            evento_id: evento.id,
            concepto: 'Segundo pago 35%',
            total: Math.round(ingresoEstimado * 0.35),
            cobrado: esAntiguo ? (Math.random() < 0.80) : (Math.random() < 0.50),
            fecha_cobro: esAntiguo && Math.random() < 0.80 ? new Date(fechaEvento.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
            cuenta_contable_id: cuentaIngresoId,
            responsable_id: userId
          },
          {
            evento_id: evento.id,
            concepto: 'Pago final 25%',
            total: Math.round(ingresoEstimado * 0.25),
            cobrado: esAntiguo ? (Math.random() < 0.80) : false,
            fecha_cobro: esAntiguo && Math.random() < 0.80 ? new Date(fechaEvento.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
            cuenta_contable_id: cuentaIngresoId,
            responsable_id: userId
          }
        ];

        // Solo insertar ingresos si tenemos cuenta válida
        if (cuentaIngresoId) {
          const { error: errorIngresos } = await supabase
            .from('evt_ingresos')
            .insert(ingresos);

          if (errorIngresos) {
            stats.errores.push(`Ingresos ${anio}-${mes}-${eventoNum}: ${errorIngresos.message}`);
            console.error(`  ❌ Error en ingresos:`, errorIngresos.message);
          } else {
            stats.ingresos += 3;
          }
        }

        // ========================================================================
        // INSERTAR GASTOS (9 por evento: 2 comb, 3 mat, 2 rh, 2 sps)
        // ========================================================================
        // Calcular gastos que NO excedan provisión + 10%
        const maxCombustible = provCombustible * 1.10;
        const maxMateriales = provMateriales * 1.10;
        const maxRH = provRH * 1.10;
        const maxSPS = provSPS * 1.10;

        const gastosComb1 = Math.round(provCombustible * (0.40 + Math.random() * 0.20));
        const gastosComb2 = Math.min(
          Math.round(provCombustible * (0.30 + Math.random() * 0.15)),
          maxCombustible - gastosComb1
        );

        const gastosMat1 = Math.round(provMateriales * (0.35 + Math.random() * 0.10));
        const gastosMat2 = Math.round(provMateriales * (0.30 + Math.random() * 0.10));
        const gastosMat3 = Math.min(
          Math.round(provMateriales * (0.25 + Math.random() * 0.08)),
          maxMateriales - gastosMat1 - gastosMat2
        );

        const gastosRH1 = Math.round(provRH * (0.50 + Math.random() * 0.15));
        const gastosRH2 = Math.min(
          Math.round(provRH * (0.35 + Math.random() * 0.11)),
          maxRH - gastosRH1
        );

        const gastosSPS1 = Math.round(provSPS * (0.50 + Math.random() * 0.12));
        const gastosSPS2 = Math.min(
          Math.round(provSPS * (0.35 + Math.random() * 0.12)),
          maxSPS - gastosSPS1
        );

        const gastos = [
          // Combustible/Peaje
          {
            evento_id: evento.id,
            concepto: 'Transporte y logística',
            total: gastosComb1,
            categoria_id: categorias.combustible,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'E',
            pagado: Math.random() < 0.80,
            fecha_gasto: new Date(fechaEvento.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          },
          {
            evento_id: evento.id,
            concepto: 'Combustible vehículos',
            total: gastosComb2,
            categoria_id: categorias.combustible,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'E',
            pagado: Math.random() < 0.70,
            fecha_gasto: new Date(fechaEvento.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          },
          // Materiales
          {
            evento_id: evento.id,
            concepto: 'Material promocional',
            total: gastosMat1,
            categoria_id: categorias.materiales,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'E',
            pagado: Math.random() < 0.85,
            fecha_gasto: new Date(fechaEvento.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          },
          {
            evento_id: evento.id,
            concepto: 'Decoración y ambientación',
            total: gastosMat2,
            categoria_id: categorias.materiales,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'E',
            pagado: Math.random() < 0.75,
            fecha_gasto: new Date(fechaEvento.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          },
          {
            evento_id: evento.id,
            concepto: 'Material técnico y equipo',
            total: gastosMat3,
            categoria_id: categorias.materiales,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'E',
            pagado: Math.random() < 0.65,
            fecha_gasto: new Date(fechaEvento.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          },
          // Recursos Humanos
          {
            evento_id: evento.id,
            concepto: 'Personal operativo',
            total: gastosRH1,
            categoria_id: categorias.rh,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'N', // Nómina para RH
            pagado: Math.random() < 0.90,
            fecha_gasto: new Date(fechaEvento.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          },
          {
            evento_id: evento.id,
            concepto: 'Coordinación y supervisión',
            total: gastosRH2,
            categoria_id: categorias.rh,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'N', // Nómina para RH
            pagado: Math.random() < 0.75,
            fecha_gasto: new Date(fechaEvento.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          },
          // Solicitudes de Pago / SPS
          {
            evento_id: evento.id,
            concepto: 'Proveedor principal',
            total: gastosSPS1,
            categoria_id: categorias.sps,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'P', // Pago para SPS
            pagado: Math.random() < 0.80,
            fecha_gasto: new Date(fechaEvento.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          },
          {
            evento_id: evento.id,
            concepto: 'Servicios adicionales',
            total: gastosSPS2,
            categoria_id: categorias.sps,
            cuenta_contable_id: cuentaId,
            tipo_comprobante: 'P', // Pago para SPS
            pagado: Math.random() < 0.70,
            fecha_gasto: new Date(fechaEvento.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsable_id: userId
          }
        ];

        const { error: errorGastos } = await supabase
          .from('evt_gastos')
          .insert(gastos);

        if (errorGastos) {
          stats.errores.push(`Gastos ${anio}-${mes}-${eventoNum}: ${errorGastos.message}`);
          console.error(`  ❌ Error en gastos:`, errorGastos.message);
        } else {
          stats.gastos += 9;
        }

        // Mostrar progreso cada 10 eventos
        if (stats.eventos % 10 === 0) {
          console.log(`  📊 Progreso: ${stats.eventos} eventos, ${stats.ingresos} ingresos, ${stats.gastos} gastos`);
        }
      }
    }
  }

  return stats;
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================
async function main() {
  // Paso 1: Limpiar datos
  const limpiezaOk = await limpiarDatos();
  if (!limpiezaOk) {
    console.error('\n❌ Error en la limpieza de datos. Abortando.\n');
    process.exit(1);
  }

  // Paso 2: Obtener referencias
  const refs = await obtenerReferencias();
  if (!refs) {
    console.error('\n❌ Error obteniendo referencias. Verifica que existan clientes, tipos, estados y categorías.\n');
    process.exit(1);
  }

  // Paso 3: Generar datos
  const stats = await generarDatos(refs);

  // Reporte final
  console.log('\n' + '='.repeat(60));
  console.log('✨ CARGA DE DATOS COMPLETADA');
  console.log('='.repeat(60));
  console.log(`📊 Eventos creados:  ${stats.eventos}`);
  console.log(`💰 Ingresos creados: ${stats.ingresos}`);
  console.log(`💸 Gastos creados:   ${stats.gastos}`);

  if (stats.errores.length > 0) {
    console.log(`\n⚠️  Errores encontrados: ${stats.errores.length}`);
    stats.errores.slice(0, 5).forEach(err => console.log(`   - ${err}`));
    if (stats.errores.length > 5) {
      console.log(`   ... y ${stats.errores.length - 5} más`);
    }
  } else {
    console.log('\n✅ Sin errores');
  }

  console.log('\n🎯 Siguiente paso: Ejecuta las pruebas automáticas');
  console.log('   npm run test:datos\n');
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error.message);
  process.exit(1);
});
