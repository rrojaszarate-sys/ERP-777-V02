#!/usr/bin/env node

/**
 * Script para analizar la estructura y datos de la base de datos
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function analyzeDB() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    ANÁLISIS COMPLETO DE BASE DE DATOS ERP 777                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  const report = {
    fecha: new Date().toLocaleString('es-MX'),
    tablas: {},
    estadisticas: {},
    resumen: {}
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: CONTEO DE REGISTROS POR TABLA
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('SECCIÓN 1: INVENTARIO DE TABLAS Y REGISTROS');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const tablasERP = [
    // Módulo de Eventos
    { name: 'evt_eventos', module: 'Eventos' },
    { name: 'evt_gastos', module: 'Eventos' },
    { name: 'evt_ingresos', module: 'Eventos' },
    { name: 'evt_clientes', module: 'Eventos' },
    { name: 'evt_estados', module: 'Eventos' },
    { name: 'evt_estados_ingreso', module: 'Eventos' },
    { name: 'evt_tipos_evento', module: 'Eventos' },
    { name: 'evt_categorias_gastos', module: 'Eventos' },
    { name: 'evt_categorias_ingresos', module: 'Eventos' },
    { name: 'evt_cuentas_bancarias', module: 'Eventos' },
    { name: 'evt_cuentas_contables', module: 'Eventos' },
    { name: 'evt_roles', module: 'Eventos' },
    { name: 'evt_documentos', module: 'Eventos' },
    { name: 'evt_alertas_enviadas', module: 'Eventos' },
    { name: 'evt_configuracion_alertas', module: 'Eventos' },
    { name: 'evt_movimientos_bancarios', module: 'Eventos' },

    // Módulo Core
    { name: 'core_users', module: 'Core' },
    { name: 'core_roles', module: 'Core' },
    { name: 'core_companies', module: 'Core' },
    { name: 'core_audit_log', module: 'Core' },
    { name: 'core_user_roles', module: 'Core' },
    { name: 'core_system_config', module: 'Core' },
    { name: 'core_security_config', module: 'Core' },

    // Módulo de Nómina
    { name: 'nom_empleados', module: 'Nómina' },
    { name: 'nom_nominas', module: 'Nómina' },
    { name: 'nom_conceptos', module: 'Nómina' },
    { name: 'nom_periodos', module: 'Nómina' },
    { name: 'nom_departamentos', module: 'Nómina' },
    { name: 'nom_puestos', module: 'Nómina' },

    // Módulo de Proyectos
    { name: 'prj_proyectos', module: 'Proyectos' },
    { name: 'prj_fases', module: 'Proyectos' },
    { name: 'prj_hitos', module: 'Proyectos' },
    { name: 'prj_tipos_proyecto', module: 'Proyectos' },
    { name: 'prj_estados_proyecto', module: 'Proyectos' },
    { name: 'prj_prioridades', module: 'Proyectos' },
    { name: 'prj_roles', module: 'Proyectos' },

    // Módulo Contable
    { name: 'con_cuentas', module: 'Contabilidad' },
    { name: 'con_polizas', module: 'Contabilidad' },
    { name: 'con_movimientos', module: 'Contabilidad' },
    { name: 'con_balanza', module: 'Contabilidad' },

    // Módulo Almacén
    { name: 'alm_almacenes', module: 'Almacén' },
    { name: 'alm_productos', module: 'Almacén' },
    { name: 'alm_categorias', module: 'Almacén' },
    { name: 'alm_movimientos', module: 'Almacén' },
    { name: 'alm_tipos_movimiento', module: 'Almacén' },
    { name: 'alm_unidades_medida', module: 'Almacén' },
  ];

  const moduleStats = {};

  for (const tabla of tablasERP) {
    try {
      const { count, error } = await supabase
        .from(tabla.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        report.tablas[tabla.name] = { error: error.message, module: tabla.module };
      } else {
        report.tablas[tabla.name] = { count: count || 0, module: tabla.module };

        if (!moduleStats[tabla.module]) {
          moduleStats[tabla.module] = { tablas: 0, registros: 0 };
        }
        moduleStats[tabla.module].tablas++;
        moduleStats[tabla.module].registros += count || 0;
      }
    } catch (e) {
      report.tablas[tabla.name] = { error: e.message, module: tabla.module };
    }
  }

  // Mostrar por módulo
  for (const [module, stats] of Object.entries(moduleStats)) {
    console.log(`\n📦 MÓDULO: ${module}`);
    console.log('─'.repeat(60));

    const tablasModulo = tablasERP.filter(t => t.module === module);
    for (const tabla of tablasModulo) {
      const info = report.tablas[tabla.name];
      if (info) {
        if (info.error) {
          console.log(`   ❌ ${tabla.name}: ERROR - ${info.error}`);
        } else {
          const bar = info.count > 0 ? '█'.repeat(Math.min(Math.ceil(Math.log10(info.count + 1) * 3), 20)) : '';
          console.log(`   ${info.count.toString().padStart(6)} │ ${tabla.name.padEnd(30)} ${bar}`);
        }
      }
    }
    console.log(`   ────────────────────────────────────────────────────────────`);
    console.log(`   Total: ${stats.registros} registros en ${stats.tablas} tablas`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: DATOS DE CATÁLOGOS
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('SECCIÓN 2: CATÁLOGOS DEL SISTEMA');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Estados de evento
  const { data: estados } = await supabase.from('evt_estados').select('*').order('id');
  console.log('📋 ESTADOS DE EVENTO:');
  if (estados) {
    estados.forEach(e => console.log(`   [${e.id}] ${e.nombre} (${e.color})`));
    report.estadisticas.estados = estados;
  }

  // Estados de ingreso
  const { data: estadosIngreso } = await supabase.from('evt_estados_ingreso').select('*').order('orden');
  console.log('\n📋 ESTADOS DE INGRESO:');
  if (estadosIngreso) {
    estadosIngreso.forEach(e => console.log(`   [${e.id}] ${e.nombre} - ${e.descripcion}`));
    report.estadisticas.estadosIngreso = estadosIngreso;
  }

  // Tipos de evento
  const { data: tipos } = await supabase.from('evt_tipos_evento').select('*').order('id');
  console.log('\n📋 TIPOS DE EVENTO:');
  if (tipos) {
    tipos.forEach(t => console.log(`   [${t.id}] ${t.nombre}`));
    report.estadisticas.tiposEvento = tipos;
  }

  // Categorías de gastos
  const { data: catGastos } = await supabase.from('evt_categorias_gastos').select('*').order('id');
  console.log('\n📋 CATEGORÍAS DE GASTOS:');
  if (catGastos) {
    catGastos.forEach(c => console.log(`   [${c.id}] ${c.nombre}`));
    report.estadisticas.categoriasGastos = catGastos;
  }

  // Categorías de ingresos
  const { data: catIngresos } = await supabase.from('evt_categorias_ingresos').select('*').order('id');
  console.log('\n📋 CATEGORÍAS DE INGRESOS:');
  if (catIngresos) {
    catIngresos.forEach(c => console.log(`   [${c.id}] ${c.nombre}`));
    report.estadisticas.categoriasIngresos = catIngresos;
  }

  // Roles
  const { data: roles } = await supabase.from('evt_roles').select('*').order('id');
  console.log('\n📋 ROLES DEL SISTEMA:');
  if (roles) {
    roles.forEach(r => console.log(`   [${r.id}] ${r.nombre}: ${r.descripcion}`));
    report.estadisticas.roles = roles;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: CLIENTES Y ENTIDADES PRINCIPALES
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('SECCIÓN 3: ENTIDADES PRINCIPALES');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Empresa
  const { data: company } = await supabase.from('core_companies').select('*').single();
  console.log('🏢 EMPRESA:');
  if (company) {
    console.log(`   Nombre: ${company.nombre}`);
    console.log(`   RFC: ${company.rfc}`);
    console.log(`   Email: ${company.email}`);
    console.log(`   Teléfono: ${company.telefono}`);
    report.estadisticas.empresa = company;
  }

  // Usuarios
  const { data: users } = await supabase.from('core_users').select('*');
  console.log('\n👥 USUARIOS:');
  if (users) {
    users.forEach(u => console.log(`   • ${u.nombre} ${u.apellidos || ''} | ${u.email} | ${u.puesto || 'Sin puesto'}`));
    report.estadisticas.usuarios = users.length;
  }

  // Clientes
  const { data: clientes } = await supabase.from('evt_clientes').select('*').order('razon_social');
  console.log('\n🤝 CLIENTES:');
  if (clientes) {
    clientes.forEach(c => {
      console.log(`   • ${c.razon_social}`);
      console.log(`     RFC: ${c.rfc} | Email: ${c.email || 'N/A'} | Crédito: ${c.dias_credito || 0} días`);
    });
    report.estadisticas.clientes = clientes;
  }

  // Cuentas bancarias
  const { data: cuentas } = await supabase.from('evt_cuentas_bancarias').select('*');
  console.log('\n🏦 CUENTAS BANCARIAS:');
  if (cuentas) {
    cuentas.forEach(c => console.log(`   • ${c.nombre} | ${c.banco} | ${c.numero_cuenta || 'N/A'} | ${c.tipo}`));
    report.estadisticas.cuentasBancarias = cuentas;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: ANÁLISIS FINANCIERO
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('SECCIÓN 4: ANÁLISIS FINANCIERO');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Eventos
  const { data: eventos } = await supabase.from('evt_eventos').select('*');

  let totalIngresosEventos = 0;
  let totalGastosEventos = 0;
  const eventosPorEstado = {};
  const eventosPorTipo = {};

  if (eventos) {
    eventos.forEach(e => {
      totalIngresosEventos += parseFloat(e.total) || 0;
      totalGastosEventos += parseFloat(e.total_gastos) || 0;

      // Por estado
      const estado = e.estado_id || 'Sin estado';
      eventosPorEstado[estado] = (eventosPorEstado[estado] || 0) + 1;

      // Por tipo
      const tipo = e.tipo_evento_id || 'Sin tipo';
      eventosPorTipo[tipo] = (eventosPorTipo[tipo] || 0) + 1;
    });
  }

  console.log('📊 RESUMEN DE EVENTOS:');
  console.log(`   Total de eventos: ${eventos?.length || 0}`);
  console.log(`   Ingresos totales: $${totalIngresosEventos.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`   Gastos totales: $${totalGastosEventos.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`   Utilidad bruta: $${(totalIngresosEventos - totalGastosEventos).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`   Margen promedio: ${((totalIngresosEventos - totalGastosEventos) / totalIngresosEventos * 100).toFixed(2)}%`);

  console.log('\n   Eventos por estado:');
  for (const [estado, count] of Object.entries(eventosPorEstado)) {
    const estadoNombre = estados?.find(e => e.id == estado)?.nombre || `Estado ${estado}`;
    console.log(`     • ${estadoNombre}: ${count}`);
  }

  console.log('\n   Eventos por tipo:');
  for (const [tipo, count] of Object.entries(eventosPorTipo)) {
    const tipoNombre = tipos?.find(t => t.id == tipo)?.nombre || `Tipo ${tipo}`;
    console.log(`     • ${tipoNombre}: ${count}`);
  }

  // Gastos
  const { data: gastos } = await supabase.from('evt_gastos').select('*');

  let totalGastos = 0;
  const gastosPorCategoria = {};
  let gastosPagados = 0;
  let gastosComprobados = 0;

  if (gastos) {
    gastos.forEach(g => {
      totalGastos += parseFloat(g.total) || 0;

      const cat = g.categoria_id || 'Sin categoría';
      if (!gastosPorCategoria[cat]) gastosPorCategoria[cat] = { count: 0, total: 0 };
      gastosPorCategoria[cat].count++;
      gastosPorCategoria[cat].total += parseFloat(g.total) || 0;

      if (g.pagado) gastosPagados++;
      if (g.comprobado) gastosComprobados++;
    });
  }

  console.log('\n💸 RESUMEN DE GASTOS:');
  console.log(`   Total de gastos: ${gastos?.length || 0}`);
  console.log(`   Monto total: $${totalGastos.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`   Gastos pagados: ${gastosPagados} (${((gastosPagados / (gastos?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`   Gastos comprobados: ${gastosComprobados} (${((gastosComprobados / (gastos?.length || 1)) * 100).toFixed(1)}%)`);

  console.log('\n   Gastos por categoría:');
  for (const [cat, data] of Object.entries(gastosPorCategoria)) {
    const catNombre = catGastos?.find(c => c.id == cat)?.nombre || `Categoría ${cat}`;
    console.log(`     • ${catNombre}: ${data.count} gastos, $${data.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  }

  // Ingresos
  const { data: ingresos } = await supabase.from('evt_ingresos').select('*');

  let totalIngresos = 0;
  let ingresosFacturados = 0;
  let ingresosCobrados = 0;

  if (ingresos) {
    ingresos.forEach(i => {
      totalIngresos += parseFloat(i.total) || 0;
      if (i.facturado) ingresosFacturados++;
      if (i.cobrado) ingresosCobrados++;
    });
  }

  console.log('\n💰 RESUMEN DE INGRESOS:');
  console.log(`   Total de ingresos: ${ingresos?.length || 0}`);
  console.log(`   Monto total: $${totalIngresos.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  console.log(`   Ingresos facturados: ${ingresosFacturados} (${((ingresosFacturados / (ingresos?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`   Ingresos cobrados: ${ingresosCobrados} (${((ingresosCobrados / (ingresos?.length || 1)) * 100).toFixed(1)}%)`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: RESUMEN EJECUTIVO
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('SECCIÓN 5: RESUMEN EJECUTIVO');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  report.resumen = {
    empresa: company?.nombre,
    totalEventos: eventos?.length || 0,
    totalGastos: gastos?.length || 0,
    totalIngresos: ingresos?.length || 0,
    totalClientes: clientes?.length || 0,
    totalUsuarios: users?.length || 0,
    montoIngresos: totalIngresos,
    montoGastos: totalGastos,
    utilidadBruta: totalIngresos - totalGastos,
    margenPromedio: totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos * 100).toFixed(2) : 0
  };

  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│                           DASHBOARD EJECUTIVO                              │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Empresa: ${report.resumen.empresa?.padEnd(63) || 'N/A'.padEnd(63)} │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│  📅 Eventos:        ${report.resumen.totalEventos.toString().padStart(8)}                                           │`);
  console.log(`│  💸 Gastos:         ${report.resumen.totalGastos.toString().padStart(8)}                                           │`);
  console.log(`│  💰 Ingresos:       ${report.resumen.totalIngresos.toString().padStart(8)}                                           │`);
  console.log(`│  🤝 Clientes:       ${report.resumen.totalClientes.toString().padStart(8)}                                           │`);
  console.log(`│  👥 Usuarios:       ${report.resumen.totalUsuarios.toString().padStart(8)}                                           │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│  💵 Ingresos:  $${report.resumen.montoIngresos.toLocaleString('es-MX', {minimumFractionDigits: 2}).padStart(18)}                                   │`);
  console.log(`│  💸 Gastos:    $${report.resumen.montoGastos.toLocaleString('es-MX', {minimumFractionDigits: 2}).padStart(18)}                                   │`);
  console.log(`│  📈 Utilidad:  $${report.resumen.utilidadBruta.toLocaleString('es-MX', {minimumFractionDigits: 2}).padStart(18)}                                   │`);
  console.log(`│  📊 Margen:    ${report.resumen.margenPromedio.toString().padStart(18)}%                                   │`);
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  // Guardar reporte JSON
  const reportPath = resolve(__dirname, '../docs/analisis_bd_' + new Date().toISOString().slice(0, 10) + '.json');

  // Crear directorio docs si no existe
  const docsDir = resolve(__dirname, '../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✅ Reporte guardado en: ${reportPath}`);
}

analyzeDB().catch(console.error);
