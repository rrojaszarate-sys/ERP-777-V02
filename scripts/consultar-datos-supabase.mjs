#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  📊 CONSULTA DE DATOS DEL ERP - SUPABASE                  ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function consultarDatos() {
  try {
    // 1. Eventos
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1️⃣  EVENTOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { data: eventos, error: errorEventos } = await supabase
      .from('evt_eventos')
      .select('id, clave_evento, nombre_proyecto, total, total_gastos, utilidad, activo, estado_id', { count: 'exact' });

    if (errorEventos) throw errorEventos;

    const activos = eventos.filter(e => e.activo).length;
    const totalIngresos = eventos.reduce((sum, e) => sum + (parseFloat(e.total) || 0), 0);
    const totalGastos = eventos.reduce((sum, e) => sum + (parseFloat(e.total_gastos) || 0), 0);
    const utilidadTotal = eventos.reduce((sum, e) => sum + (parseFloat(e.utilidad) || 0), 0);

    console.log(`   Total de eventos: ${eventos.length}`);
    console.log(`   Activos: ${activos} | Inactivos: ${eventos.length - activos}`);
    console.log(`   Total ingresos: $${totalIngresos.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Total gastos: $${totalGastos.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Utilidad total: $${utilidadTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);

    // Últimos 5 eventos
    console.log('   Últimos 5 eventos:');
    eventos.slice(0, 5).forEach((e, idx) => {
      console.log(`   ${idx + 1}. ${e.clave_evento} - ${e.nombre_proyecto} ($${parseFloat(e.total || 0).toLocaleString('es-MX')})`);
    });

    // 2. Gastos
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('2️⃣  GASTOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { data: gastos, error: errorGastos } = await supabase
      .from('evt_gastos')
      .select('id, concepto, subtotal, iva, total', { count: 'exact' });

    if (errorGastos) throw errorGastos;

    const pagados = 0;  // No podemos consultar status por ahora
    const pendientes = 0;
    const subtotalTotal = gastos.reduce((sum, g) => sum + (parseFloat(g.subtotal) || 0), 0);
    const ivaTotal = gastos.reduce((sum, g) => sum + (parseFloat(g.iva) || 0), 0);
    const totalGastosSum = gastos.reduce((sum, g) => sum + (parseFloat(g.total) || 0), 0);

    console.log(`   Total de gastos: ${gastos.length}`);
    console.log(`   Pagados: ${pagados} | Pendientes: ${pendientes}`);
    console.log(`   Subtotal: $${subtotalTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   IVA: $${ivaTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Total: $${totalGastosSum.toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);

    // 3. Ingresos
    console.log('═══════════════════════════════════════════════════════════');
    console.log('3️⃣  INGRESOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { data: ingresos, error: errorIngresos } = await supabase
      .from('evt_ingresos')
      .select('id, concepto, subtotal, iva, total', { count: 'exact' });

    if (errorIngresos) throw errorIngresos;

    const cobrados = 0;  // No podemos consultar status por ahora
    const pendientesIngreso = 0;
    const subtotalIngreso = ingresos.reduce((sum, i) => sum + (parseFloat(i.subtotal) || 0), 0);
    const ivaIngreso = ingresos.reduce((sum, i) => sum + (parseFloat(i.iva) || 0), 0);
    const totalIngresoSum = ingresos.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

    console.log(`   Total de ingresos: ${ingresos.length}`);
    console.log(`   Cobrados: ${cobrados} | Pendientes: ${pendientesIngreso}`);
    console.log(`   Subtotal: $${subtotalIngreso.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   IVA: $${ivaIngreso.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Total: $${totalIngresoSum.toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);

    // 4. Clientes
    console.log('═══════════════════════════════════════════════════════════');
    console.log('4️⃣  CLIENTES');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { data: clientes, error: errorClientes } = await supabase
      .from('evt_clientes')
      .select('id, razon_social, activo', { count: 'exact' });

    if (errorClientes) throw errorClientes;

    const clientesActivos = clientes.filter(c => c.activo).length;

    console.log(`   Total de clientes: ${clientes.length}`);
    console.log(`   Activos: ${clientesActivos}\n`);

    console.log('   Clientes registrados:');
    clientes.slice(0, 10).forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.razon_social}`);
    });

    // 5. Cuentas
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('5️⃣  CUENTAS CONTABLES');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { data: cuentasContables, error: errorCuentas } = await supabase
      .from('evt_cuentas_contables')
      .select('id, codigo, nombre, tipo, activa');

    if (errorCuentas) throw errorCuentas;

    const cuentasActivas = cuentasContables.filter(c => c.activa).length;
    const porTipo = {};
    cuentasContables.forEach(c => {
      porTipo[c.tipo] = (porTipo[c.tipo] || 0) + 1;
    });

    console.log(`   Total de cuentas: ${cuentasContables.length} (${cuentasActivas} activas)`);
    console.log(`   Por tipo:`);
    Object.entries(porTipo).forEach(([tipo, count]) => {
      console.log(`   - ${tipo}: ${count}`);
    });

    // 6. Cuentas Bancarias
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('6️⃣  CUENTAS BANCARIAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { data: cuentasBancarias, error: errorBancarias } = await supabase
      .from('evt_cuentas_bancarias')
      .select('*');

    if (errorBancarias) throw errorBancarias;

    const bancariaActivas = cuentasBancarias.filter(cb => cb.activa).length;
    const saldoTotal = cuentasBancarias.reduce((sum, cb) => sum + (parseFloat(cb.saldo_actual) || 0), 0);

    console.log(`   Cuentas bancarias: ${cuentasBancarias.length} (${bancariaActivas} activas)`);
    console.log(`   Saldo total: $${saldoTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);

    if (cuentasBancarias.length > 0) {
      const firstAccount = cuentasBancarias[0];
      const hasNombre = 'nombre' in firstAccount;

      cuentasBancarias.forEach((cb, idx) => {
        const saldo = parseFloat(cb.saldo_actual) || 0;
        const nombre = cb.nombre || cb.banco || 'Cuenta bancaria';
        console.log(`   ${idx + 1}. ${nombre}: $${saldo.toLocaleString('es-MX')}`);
      });
    }

    // 7. Resumen Financiero
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('7️⃣  RESUMEN FINANCIERO CONSOLIDADO');
    console.log('═══════════════════════════════════════════════════════════\n');

    const utilidadNeta = totalIngresoSum - totalGastosSum;
    const margen = totalIngresoSum > 0 ? (utilidadNeta / totalIngresoSum * 100) : 0;

    console.log(`   Total Ingresos: $${totalIngresoSum.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Total Gastos:   $${totalGastosSum.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Utilidad Neta:  $${utilidadNeta.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Margen:         ${margen.toFixed(2)}%\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ CONSULTA COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

consultarDatos();
