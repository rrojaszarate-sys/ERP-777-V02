/**
 * Script de Prueba: Ingreso y Retorno de Materiales
 *
 * Genera:
 * 1. Un INGRESO de materiales (5 productos aleatorios)
 * 2. Un RETORNO del 10% de esos materiales
 *
 * Usa conexión directa a PostgreSQL para bypasear RLS
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Configuración
const EVENTO_ID = 4; // EVENTO PRUEBA CÁLCULOS FINANCIEROS
const ALMACEN_ID = 1; // Materia Prima - Oficinas Centrales MADE
const CATEGORIA_MATERIALES_ID = 8;
const IVA_RATE = 0.16;
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🚀 PRUEBA: Ingreso y Retorno de Materiales\n');
  console.log('='.repeat(60));

  const client = new Client({
    connectionString: process.env.DATABASE_POOLER_TX_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // ================================================================
    // 1. OBTENER PRODUCTOS ALEATORIOS
    // ================================================================
    console.log('📦 Obteniendo productos del catálogo...');

    const { rows: productos } = await client.query(`
      SELECT id, clave, nombre, costo, unidad
      FROM productos_erp
      WHERE activo = true AND costo > 0
      ORDER BY RANDOM()
      LIMIT 5
    `);

    console.log(`\n✅ Productos seleccionados para INGRESO:`);

    // Generar cantidades aleatorias entre 5 y 20
    const lineasIngreso = productos.map(p => {
      const cantidad = Math.floor(Math.random() * 16) + 5; // 5-20
      return {
        producto_id: p.id,
        producto_nombre: p.nombre,
        producto_clave: p.clave,
        cantidad,
        costo_unitario: parseFloat(p.costo),
        unidad: p.unidad,
        subtotal: cantidad * parseFloat(p.costo)
      };
    });

    lineasIngreso.forEach((l, i) => {
      console.log(`   ${i + 1}. ${l.producto_clave} - ${l.producto_nombre}`);
      console.log(`      Cantidad: ${l.cantidad} ${l.unidad} @ $${l.costo_unitario.toFixed(2)} = $${l.subtotal.toFixed(2)}`);
    });

    // Calcular totales de ingreso
    const subtotalIngreso = lineasIngreso.reduce((sum, l) => sum + l.subtotal, 0);
    const ivaIngreso = Math.round(subtotalIngreso * IVA_RATE * 100) / 100;
    const totalIngreso = subtotalIngreso + ivaIngreso;

    console.log(`\n   📊 TOTALES INGRESO:`);
    console.log(`      Subtotal: $${subtotalIngreso.toFixed(2)}`);
    console.log(`      IVA 16%:  $${ivaIngreso.toFixed(2)}`);
    console.log(`      TOTAL:    $${totalIngreso.toFixed(2)}`);

    // ================================================================
    // 2. CREAR DOCUMENTO DE INVENTARIO - SALIDA
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📝 Creando documento de SALIDA de inventario...');

    const firmaDummy = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const { rows: [docSalida] } = await client.query(`
      INSERT INTO documentos_inventario_erp (
        tipo, fecha, almacen_id, evento_id,
        nombre_entrega, firma_entrega, nombre_recibe, firma_recibe,
        observaciones, estado, company_id
      ) VALUES (
        'salida', CURRENT_DATE, $1, $2,
        'Almacenista de Prueba', $3, 'Operador de Evento', $3,
        $4, 'borrador', $5
      ) RETURNING id, numero_documento
    `, [ALMACEN_ID, EVENTO_ID, firmaDummy, `PRUEBA - Ingreso de material - Evento #${EVENTO_ID}`, COMPANY_ID]);

    console.log(`   ✅ Documento creado: ID ${docSalida.id}`);

    // Agregar detalles
    for (const linea of lineasIngreso) {
      await client.query(`
        INSERT INTO detalles_documento_inventario_erp (
          documento_id, producto_id, cantidad, observaciones
        ) VALUES ($1, $2, $3, $4)
      `, [docSalida.id, linea.producto_id, linea.cantidad, `Evento #${EVENTO_ID} - ${linea.producto_nombre}`]);
    }

    console.log(`   ✅ ${lineasIngreso.length} productos agregados al documento`);

    // Confirmar documento
    await client.query(`
      UPDATE documentos_inventario_erp SET estado = 'confirmado' WHERE id = $1
    `, [docSalida.id]);

    console.log(`   ✅ Documento CONFIRMADO`);

    // ================================================================
    // 3. CREAR GASTO DE TIPO INGRESO
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('💰 Creando GASTO de ingreso de material...');

    const conceptoIngreso = `Material: ${lineasIngreso.map(l => l.producto_nombre).join(', ')}`.substring(0, 200);

    const { rows: [gastoIngreso] } = await client.query(`
      INSERT INTO evt_gastos_erp (
        evento_id, company_id, concepto, descripcion, fecha_gasto,
        categoria_id, subtotal, iva, total, tipo_movimiento,
        notas, detalle_retorno, metodo_pago, status, fecha_creacion
      ) VALUES (
        $1, $2, $3, $4, CURRENT_DATE,
        $5, $6, $7, $8, 'gasto',
        $9, $10, 'transferencia', 'aprobado', NOW()
      ) RETURNING id
    `, [
      EVENTO_ID, COMPANY_ID, conceptoIngreso,
      `Ingreso de ${lineasIngreso.length} material(es)`,
      CATEGORIA_MATERIALES_ID, subtotalIngreso, ivaIngreso, totalIngreso,
      `PRUEBA AUTOMÁTICA\n[Doc. Inventario #${docSalida.id}]`,
      JSON.stringify(lineasIngreso)
    ]);

    console.log(`   ✅ Gasto creado: ID ${gastoIngreso.id}`);
    console.log(`   💵 Total: $${totalIngreso.toFixed(2)}`);

    // ================================================================
    // 4. CREAR RETORNO DEL 10% DE MATERIALES
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Creando RETORNO del 10% de materiales...\n');

    const lineasRetorno = lineasIngreso.map(l => {
      const cantidadRetorno = Math.max(1, Math.floor(l.cantidad * 0.1));
      return {
        ...l,
        cantidad: cantidadRetorno,
        subtotal: cantidadRetorno * l.costo_unitario
      };
    });

    console.log(`✅ Productos para RETORNO (10%):`);
    lineasRetorno.forEach((l, i) => {
      console.log(`   ${i + 1}. ${l.producto_clave} - ${l.producto_nombre}`);
      console.log(`      Cantidad: ${l.cantidad} ${l.unidad} @ $${l.costo_unitario.toFixed(2)} = $${l.subtotal.toFixed(2)}`);
    });

    const subtotalRetorno = lineasRetorno.reduce((sum, l) => sum + l.subtotal, 0);
    const ivaRetorno = Math.round(subtotalRetorno * IVA_RATE * 100) / 100;
    const totalRetorno = subtotalRetorno + ivaRetorno;

    console.log(`\n   📊 TOTALES RETORNO:`);
    console.log(`      Subtotal: $${subtotalRetorno.toFixed(2)}`);
    console.log(`      IVA 16%:  $${ivaRetorno.toFixed(2)}`);
    console.log(`      TOTAL:    $${totalRetorno.toFixed(2)}`);

    // ================================================================
    // 5. CREAR DOCUMENTO DE ENTRADA (Retorno al almacén)
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📝 Creando documento de ENTRADA de inventario (retorno)...');

    const { rows: [docEntrada] } = await client.query(`
      INSERT INTO documentos_inventario_erp (
        tipo, fecha, almacen_id, evento_id,
        nombre_entrega, firma_entrega, nombre_recibe, firma_recibe,
        observaciones, estado, company_id
      ) VALUES (
        'entrada', CURRENT_DATE, $1, $2,
        'Operador de Evento', $3, 'Almacenista de Prueba', $3,
        $4, 'borrador', $5
      ) RETURNING id, numero_documento
    `, [ALMACEN_ID, EVENTO_ID, firmaDummy, `PRUEBA - Retorno de material - Evento #${EVENTO_ID}`, COMPANY_ID]);

    console.log(`   ✅ Documento creado: ID ${docEntrada.id}`);

    for (const linea of lineasRetorno) {
      await client.query(`
        INSERT INTO detalles_documento_inventario_erp (
          documento_id, producto_id, cantidad, observaciones
        ) VALUES ($1, $2, $3, $4)
      `, [docEntrada.id, linea.producto_id, linea.cantidad, `Retorno - Evento #${EVENTO_ID}`]);
    }

    console.log(`   ✅ ${lineasRetorno.length} productos agregados al documento`);

    await client.query(`
      UPDATE documentos_inventario_erp SET estado = 'confirmado' WHERE id = $1
    `, [docEntrada.id]);

    console.log(`   ✅ Documento CONFIRMADO`);

    // ================================================================
    // 6. CREAR GASTO DE TIPO RETORNO
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('💚 Creando RETORNO de material...');

    const conceptoRetorno = `Retorno: ${lineasRetorno.map(l => l.producto_nombre).join(', ')}`.substring(0, 200);

    const { rows: [gastoRetorno] } = await client.query(`
      INSERT INTO evt_gastos_erp (
        evento_id, company_id, concepto, descripcion, fecha_gasto,
        categoria_id, subtotal, iva, total, tipo_movimiento,
        notas, detalle_retorno, metodo_pago, status, fecha_creacion
      ) VALUES (
        $1, $2, $3, $4, CURRENT_DATE,
        $5, $6, $7, $8, 'retorno',
        $9, $10, 'transferencia', 'aprobado', NOW()
      ) RETURNING id
    `, [
      EVENTO_ID, COMPANY_ID, conceptoRetorno,
      `Retorno de ${lineasRetorno.length} material(es)`,
      CATEGORIA_MATERIALES_ID, subtotalRetorno, ivaRetorno, totalRetorno,
      `PRUEBA AUTOMÁTICA - Retorno del 10%\n[Doc. Inventario #${docEntrada.id}]`,
      JSON.stringify(lineasRetorno)
    ]);

    console.log(`   ✅ Retorno creado: ID ${gastoRetorno.id}`);
    console.log(`   💚 Total retornado: -$${totalRetorno.toFixed(2)}`);

    // ================================================================
    // 7. VERIFICAR DESDE LA VISTA vw_gastos_netos_evento
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 Verificando vista vw_gastos_netos_evento...');

    const { rows: netos } = await client.query(`
      SELECT
        gastos_total,
        retornos_total,
        neto_total,
        num_gastos,
        num_retornos
      FROM vw_gastos_netos_evento
      WHERE evento_id = $1 AND categoria_id = $2
    `, [EVENTO_ID, CATEGORIA_MATERIALES_ID]);

    if (netos.length > 0) {
      const n = netos[0];
      console.log(`\n   Datos de la vista:`);
      console.log(`      Gastos:   $${parseFloat(n.gastos_total).toFixed(2)} (${n.num_gastos} registros)`);
      console.log(`      Retornos: $${parseFloat(n.retornos_total).toFixed(2)} (${n.num_retornos} registros)`);
      console.log(`      NETO:     $${parseFloat(n.neto_total).toFixed(2)}`);
    }

    // ================================================================
    // 8. RESUMEN FINAL
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE LA PRUEBA\n');

    console.log('INGRESO DE MATERIALES:');
    console.log(`   • Gasto ID: ${gastoIngreso.id}`);
    console.log(`   • Doc. Inventario: ${docSalida.id} (Salida)`);
    console.log(`   • Total: +$${totalIngreso.toFixed(2)}`);

    console.log('\nRETORNO DE MATERIALES (10%):');
    console.log(`   • Retorno ID: ${gastoRetorno.id}`);
    console.log(`   • Doc. Inventario: ${docEntrada.id} (Entrada)`);
    console.log(`   • Total: -$${totalRetorno.toFixed(2)}`);

    const netoFinal = totalIngreso - totalRetorno;
    console.log('\nGASTO NETO DE MATERIALES:');
    console.log(`   • Ingreso:  $${totalIngreso.toFixed(2)}`);
    console.log(`   • Retorno: -$${totalRetorno.toFixed(2)}`);
    console.log(`   • NETO:     $${netoFinal.toFixed(2)}`);
    console.log(`   • Ahorro:   ${((totalRetorno / totalIngreso) * 100).toFixed(1)}%`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
