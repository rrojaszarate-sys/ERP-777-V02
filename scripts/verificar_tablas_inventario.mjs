import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function verificarTablas() {
  console.log('🔍 Verificando tablas de Inventario y Proveedores en la BD...\n');
  
  const tablesToCheck = [
    // Proveedores
    'proveedores_erp',
    'prov_proveedores', 
    'proveedor_producto',
    // Productos e Inventario
    'productos_erp',
    'almacenes_erp',
    'movimientos_inventario_erp',
    'documentos_inventario_erp',
    'detalles_documento_inventario_erp',
    // Catálogos de inventario
    'inv_categorias_producto',
    'inv_unidades_medida',
    'prov_categorias',
    // Compras
    'ordenes_compra_erp',
    'comp_ordenes_compra',
    'comp_partidas_oc',
    'partidas_oc_erp',
    // GNI (Gastos No Impactados)
    'gni_gastos',
    'gni_proveedores',
    'gni_categorias'
  ];
  
  const existentes = [];
  const noExistentes = [];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        existentes.push({ table, count: count || 0 });
        console.log(`✅ ${table} - EXISTE (${count || 0} registros)`);
      } else if (error.code === '42P01' || error.message.includes('does not exist')) {
        noExistentes.push(table);
        console.log(`❌ ${table} - NO EXISTE`);
      } else {
        console.log(`⚠️  ${table} - Error: ${error.message}`);
      }
    } catch (err) {
      console.log(`⚠️  ${table} - Error: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log('='.repeat(60));
  console.log(`\n✅ Tablas existentes: ${existentes.length}`);
  existentes.forEach(t => console.log(`   - ${t.table} (${t.count} registros)`));
  
  console.log(`\n❌ Tablas faltantes: ${noExistentes.length}`);
  noExistentes.forEach(t => console.log(`   - ${t}`));
  
  // Verificar estructura de tablas existentes
  if (existentes.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 ESTRUCTURA DE TABLAS EXISTENTES:');
    console.log('='.repeat(60));
    
    for (const { table } of existentes.slice(0, 5)) {
      const { data } = await supabase.from(table).select('*').limit(1);
      if (data && data[0]) {
        console.log(`\n📁 ${table}:`);
        console.log('   Columnas:', Object.keys(data[0]).join(', '));
      }
    }
  }
}

verificarTablas().catch(console.error);
