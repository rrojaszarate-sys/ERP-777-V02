import { supabase } from './src/core/config/supabase.js';

async function verificarCuentasContables() {
  console.log('🔍 Verificando cuentas contables en la base de datos...\n');

  try {
    // Consultar todas las cuentas
    const { data: cuentas, error } = await supabase
      .from('evt_cuentas_contables')
      .select('*')
      .order('codigo');

    if (error) {
      console.error('❌ Error al consultar cuentas:', error);
      return;
    }

    if (!cuentas || cuentas.length === 0) {
      console.log('⚠️ No hay cuentas contables en la base de datos');
      return;
    }

    console.log(`✅ Encontradas ${cuentas.length} cuentas contables:\n`);
    
    cuentas.forEach((cuenta, index) => {
      console.log(`${index + 1}. ${cuenta.codigo} - ${cuenta.nombre}`);
      console.log(`   Tipo: ${cuenta.tipo.toUpperCase()}`);
      console.log(`   Estado: ${cuenta.activa ? '🟢 Activa' : '🔴 Inactiva'}`);
      console.log(`   Creada: ${new Date(cuenta.created_at).toLocaleDateString()}`);
      if (cuenta.descripcion) {
        console.log(`   Descripción: ${cuenta.descripcion}`);
      }
      console.log('');
    });

    // Verificar gastos con cuenta_id
    const { data: gastosConCuenta, error: gastosError } = await supabase
      .from('evt_gastos')
      .select('id, concepto, total, cuenta_id')
      .not('cuenta_id', 'is', null)
      .limit(5);

    if (gastosError) {
      console.error('❌ Error al consultar gastos:', gastosError);
      return;
    }

    console.log(`📊 Muestra de gastos con cuenta asignada (${gastosConCuenta?.length || 0} gastos):`);
    gastosConCuenta?.forEach((gasto, index) => {
      const cuenta = cuentas.find(c => c.id === gasto.cuenta_id);
      console.log(`${index + 1}. ${gasto.concepto} - $${gasto.total.toLocaleString()}`);
      console.log(`   Cuenta: ${cuenta?.codigo} - ${cuenta?.nombre}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarCuentasContables();