// Script para ejecutar stock inicial de 10 piezas por producto
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ejecutarStockInicial() {
  console.log('🚀 Iniciando creación de stock inicial...\n');

  try {
    // 1. Obtener almacén activo
    console.log('1️⃣ Buscando almacén activo...');
    let { data: almacenes, error: errAlmacen } = await supabase
      .from('almacenes_erp')
      .select('id, nombre, ubicacion')
      .eq('activo', true)
      .limit(1);

    if (errAlmacen) throw errAlmacen;

    let almacenId;
    let companyId;

    if (!almacenes || almacenes.length === 0) {
      // Obtener company_id de productos
      const { data: prod } = await supabase
        .from('productos_erp')
        .select('company_id')
        .limit(1)
        .single();
      
      companyId = prod?.company_id;

      // Crear almacén si no existe
      console.log('   ⚠️ No hay almacén, creando uno...');
      const { data: nuevoAlmacen, error: errNuevo } = await supabase
        .from('almacenes_erp')
        .insert({
          nombre: 'Almacén Principal',
          ubicacion: 'Principal',
          activo: true,
          company_id: companyId
        })
        .select()
        .single();

      if (errNuevo) throw errNuevo;
      almacenId = nuevoAlmacen.id;
      console.log(`   ✅ Almacén creado: ${nuevoAlmacen.nombre} (ID: ${almacenId})`);
    } else {
      almacenId = almacenes[0].id;
      console.log(`   ✅ Almacén encontrado: ${almacenes[0].nombre} (ID: ${almacenId})`);
    }

    // 2. Obtener todos los productos
    console.log('\n2️⃣ Obteniendo productos...');
    const { data: productos, error: errProd } = await supabase
      .from('productos_erp')
      .select('id, clave, nombre, costo, company_id')
      .order('clave');

    if (errProd) throw errProd;
    console.log(`   ✅ ${productos.length} productos encontrados`);

    if (!companyId && productos.length > 0) {
      companyId = productos[0].company_id;
    }

    // 3. Crear documento de entrada
    console.log('\n3️⃣ Creando documento de entrada...');
    
    const { data: documento, error: errDoc } = await supabase
      .from('documentos_inventario_erp')
      .insert({
        tipo: 'entrada',
        estado: 'confirmado',
        fecha: new Date().toISOString(),
        almacen_id: almacenId,
        observaciones: 'INVENTARIO INICIAL - Stock inicial de 10 piezas por producto - Consolidación de inventario',
        nombre_entrega: 'Sistema',
        nombre_recibe: 'Almacén Principal',
        company_id: companyId
      })
      .select()
      .single();

    if (errDoc) throw errDoc;
    console.log(`   ✅ Documento creado: ID ${documento.id}`);

    // 4. Insertar detalles del documento
    console.log('\n4️⃣ Insertando detalles del documento...');
    const detalles = productos.map(p => ({
      documento_id: documento.id,
      producto_id: p.id,
      cantidad: 10,
      observaciones: 'Stock inicial'
    }));

    // Insertar en lotes de 100
    const batchSize = 100;
    for (let i = 0; i < detalles.length; i += batchSize) {
      const batch = detalles.slice(i, i + batchSize);
      const { error: errDetalle } = await supabase
        .from('detalles_documento_inventario_erp')
        .insert(batch);
      
      if (errDetalle) throw errDetalle;
      console.log(`   📦 Insertados ${Math.min(i + batchSize, detalles.length)}/${detalles.length} detalles`);
    }

    // 5. Crear movimientos de inventario (esto es lo que genera el stock)
    console.log('\n5️⃣ Creando movimientos de inventario...');
    
    const movimientos = productos.map(p => ({
      producto_id: p.id,
      almacen_id: almacenId,
      tipo: 'entrada',
      cantidad: 10,
      referencia: `DOC-${documento.id}`,
      concepto: 'Stock inicial - Consolidación de inventario',
      costo_unitario: p.costo || 0
    }));

    for (let i = 0; i < movimientos.length; i += batchSize) {
      const batch = movimientos.slice(i, i + batchSize);
      const { error: errMov } = await supabase
        .from('movimientos_inventario_erp')
        .insert(batch);
      
      if (errMov) throw errMov;
      console.log(`   📊 Movimientos insertados ${Math.min(i + batchSize, movimientos.length)}/${movimientos.length}`);
    }

    // 6. Verificar resultados
    console.log('\n6️⃣ Verificando resultados...');
    
    const { data: resumen } = await supabase
      .from('movimientos_inventario_erp')
      .select('cantidad')
      .eq('documento_id', documento.id);

    const totalPiezas = resumen?.reduce((sum, s) => sum + s.cantidad, 0) || 0;
    
    console.log('\n✅ ¡STOCK INICIAL CREADO EXITOSAMENTE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📄 Documento ID: ${documento.id}`);
    console.log(`📦 Productos: ${productos.length}`);
    console.log(`🔢 Total piezas: ${totalPiezas}`);
    console.log(`🏪 Almacén ID: ${almacenId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 El stock se calcula de los movimientos de inventario.');
    console.log('   Cada producto ahora tiene 10 piezas de stock.');

  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  }
}

ejecutarStockInicial();
