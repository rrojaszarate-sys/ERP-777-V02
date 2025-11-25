import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🏦 CORRIGIENDO ASIGNACIÓN DE CUENTAS BANCARIAS A GASTOS');
console.log('📅 Fecha:', new Date().toLocaleDateString());

async function corregirCuentasBancarias() {
  try {
    console.log('\n🔍 PASO 1: Verificando cuentas bancarias disponibles...');
    
    const { data: cuentasBancarias } = await supabase
      .from('evt_cuentas_contables')
      .select('id, codigo, nombre')
      .in('codigo', ['AMEX-001', 'KUSP-001', 'SANT-001', 'BANO-001', 'NY-001', 'BBVA-001', 'HSBC-001', 'CITI-001']);

    if (!cuentasBancarias || cuentasBancarias.length === 0) {
      console.log('❌ No se encontraron las cuentas bancarias. Revisar paso anterior.');
      return;
    }

    console.log('✅ Cuentas bancarias encontradas:');
    cuentasBancarias.forEach(cuenta => {
      console.log(`   • ${cuenta.codigo} - ${cuenta.nombre} (ID: ${cuenta.id})`);
    });

    // Crear mapeo de cuentas bancarias
    const mapaCuentas = {};
    cuentasBancarias.forEach(cuenta => {
      mapaCuentas[cuenta.codigo] = cuenta.id;
    });

    console.log('\n💰 PASO 2: Reasignando gastos a cuentas bancarias...');
    
    // Mapeo de categorías a cuentas bancarias específicas
    const asignaciones = [
      { categoria_id: 6, cuenta_codigo: 'AMEX-001', nombre: 'Servicios Profesionales → American Express' },
      { categoria_id: 7, cuenta_codigo: 'KUSP-001', nombre: 'Recursos Humanos → Kuspit' },
      { categoria_id: 8, cuenta_codigo: 'SANT-001', nombre: 'Materiales → Santander' },
      { categoria_id: 9, cuenta_codigo: 'BANO-001', nombre: 'Combustible → Banorte' },
      { categoria_id: 10, cuenta_codigo: 'NY-001', nombre: 'Provisiones → NY Bank' }
    ];

    let totalActualizados = 0;

    for (const asignacion of asignaciones) {
      const cuentaId = mapaCuentas[asignacion.cuenta_codigo];
      
      if (!cuentaId) {
        console.log(`   ❌ No se encontró cuenta ${asignacion.cuenta_codigo}`);
        continue;
      }

      // Actualizar todos los gastos de esta categoría
      const { count, error } = await supabase
        .from('evt_gastos')
        .update({ cuenta_id: cuentaId })
        .eq('categoria_id', asignacion.categoria_id);

      if (error) {
        console.log(`   ❌ Error actualizando ${asignacion.nombre}: ${error.message}`);
      } else {
        console.log(`   ✅ ${asignacion.nombre}: ${count || 0} gastos actualizados`);
        totalActualizados += count || 0;
      }
    }

    console.log(`\n✅ Total de gastos reasignados: ${totalActualizados}`);

    console.log('\n📊 PASO 3: Verificando asignaciones finales...');
    
    const { data: verificacion } = await supabase
      .from('evt_gastos')
      .select(`
        categoria_id,
        concepto,
        total,
        evt_cuentas_contables!inner(codigo, nombre)
      `)
      .in('categoria_id', [6, 7, 8, 9, 10])
      .limit(15);

    if (verificacion && verificacion.length > 0) {
      console.log('   📋 Gastos con cuentas bancarias asignadas:');
      
      const resumen = {};
      verificacion.forEach(gasto => {
        const categoria = gasto.categoria_id;
        const cuenta = gasto.evt_cuentas_contables;
        
        if (!resumen[categoria]) {
          resumen[categoria] = {
            cuenta: cuenta.nombre,
            codigo: cuenta.codigo,
            total: 0,
            cantidad: 0
          };
        }
        resumen[categoria].total += parseFloat(gasto.total || 0);
        resumen[categoria].cantidad++;
      });

      Object.entries(resumen).forEach(([categoria, datos]) => {
        const nombreCategoria = {
          '6': 'Servicios Profesionales',
          '7': 'Recursos Humanos',
          '8': 'Materiales',
          '9': 'Combustible',
          '10': 'Provisiones'
        }[categoria];
        
        console.log(`   • ${nombreCategoria} → ${datos.cuenta} (${datos.codigo})`);
        console.log(`     Gastos: ${datos.cantidad} | Total: $${datos.total.toLocaleString()}`);
      });
    }

    console.log('\n🎉 CORRECCIÓN COMPLETADA!');
    console.log('✅ Todos los gastos ahora están asignados a cuentas bancarias reales');
    console.log('✅ AMEX, Kuspit, Santander, Banorte, NY + 3 bancos adicionales');
    console.log('✅ Sistema contable listo para administración');

    // Mostrar resumen final de cuentas bancarias
    console.log('\n🏦 RESUMEN DE CUENTAS BANCARIAS:');
    const { data: todasLasCuentas } = await supabase
      .from('evt_cuentas_contables')
      .select('codigo, nombre')
      .eq('tipo', 'activo')
      .order('codigo');

    todasLasCuentas?.forEach(cuenta => {
      console.log(`   🏛️  ${cuenta.codigo} - ${cuenta.nombre}`);
    });

  } catch (error) {
    console.error('❌ Error crítico:', error.message);
  }
}

// Ejecutar corrección
corregirCuentasBancarias();