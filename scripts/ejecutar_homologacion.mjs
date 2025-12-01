#!/usr/bin/env node
/**
 * EJECUTAR HOMOLOGACIÓN COMPLETA
 * 1. Ejecutar migración 017
 * 2. Limpiar eventos, gastos, ingresos
 * 3. Poblar con datos de ejemplo (2 meses)
 * 4. Migrar datos GNI existentes
 *
 * Fecha: 2025-11-28
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// ═══════════════════════════════════════════════════════════════════════════
// PASO 1: EJECUTAR MIGRACIÓN 017
// ═══════════════════════════════════════════════════════════════════════════

async function ejecutarMigracion(client) {
  console.log('\n📦 PASO 1: Ejecutando migración 017...');

  const migrationPath = path.join(__dirname, '..', 'migrations', '017_homologacion_gastos_provisiones.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    await client.query(sql);
    console.log('   ✅ Migración 017 ejecutada correctamente');
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('   ⚠️  Algunas estructuras ya existían, continuando...');
      return true;
    }
    console.error('   ❌ Error en migración:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 2: LIMPIAR EVENTOS, GASTOS, INGRESOS
// ═══════════════════════════════════════════════════════════════════════════

async function limpiarDatos(client) {
  console.log('\n🧹 PASO 2: Limpiando eventos, gastos e ingresos...');

  // Orden correcto para evitar violaciones de FK
  const tablas = [
    'evt_provisiones',
    'evt_gastos',
    'evt_ingresos',
    'evt_documentos',
    'evt_eventos'
  ];

  for (const tabla of tablas) {
    try {
      const result = await client.query(`DELETE FROM ${tabla}`);
      console.log(`   ✅ ${tabla}: ${result.rowCount} registros eliminados`);
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        console.log(`   ⚠️  ${tabla}: ${error.message}`);
      }
    }
  }

  console.log('   ✅ Limpieza completada');
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 3: POBLAR CON DATOS DE EJEMPLO
// ═══════════════════════════════════════════════════════════════════════════

async function poblarDatos(client) {
  console.log('\n📝 PASO 3: Poblando con datos de ejemplo (2 meses)...');

  // Obtener company_id
  const companyResult = await client.query('SELECT id FROM core_companies LIMIT 1');
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) {
    throw new Error('No se encontró company_id');
  }

  // Obtener cliente DOTERRA (o crear uno)
  let clienteResult = await client.query(
    "SELECT id FROM evt_clientes WHERE razon_social ILIKE '%DOTERRA%' OR nombre_comercial ILIKE '%DOTERRA%' LIMIT 1"
  );
  let clienteId = clienteResult.rows[0]?.id;

  if (!clienteId) {
    const insertCliente = await client.query(`
      INSERT INTO evt_clientes (razon_social, nombre_comercial, rfc, sufijo, activo, company_id)
      VALUES ('DOTERRA MEXICO SA DE CV', 'DOTERRA', 'DOT850101XXX', 'DOT', true, $1)
      RETURNING id
    `, [companyId]);
    clienteId = insertCliente.rows[0].id;
    console.log('   ✅ Cliente DOTERRA creado');
  }

  // Obtener estado "Aprobado"
  const estadoResult = await client.query("SELECT id FROM evt_estados WHERE nombre ILIKE '%aprobado%' LIMIT 1");
  const estadoId = estadoResult.rows[0]?.id || 3;

  // Obtener tipo de evento
  const tipoResult = await client.query("SELECT id FROM evt_tipos_evento LIMIT 1");
  const tipoEventoId = tipoResult.rows[0]?.id;

  // Obtener categorías
  const categoriasResult = await client.query('SELECT id, clave FROM cat_categorias_gasto');
  const categorias = {};
  categoriasResult.rows.forEach(c => categorias[c.clave] = c.id);

  // Obtener forma de pago transferencia
  const formaPagoResult = await client.query("SELECT id FROM cat_formas_pago WHERE codigo_sat = '03' LIMIT 1");
  const formaPagoId = formaPagoResult.rows[0]?.id;

  // Obtener un usuario para responsable_id
  const userResult = await client.query('SELECT id FROM core_users LIMIT 1');
  const responsableId = userResult.rows[0]?.id;
  if (!responsableId) {
    throw new Error('No se encontró usuario para responsable_id');
  }

  // Obtener o crear cuenta contable
  let cuentaContableResult = await client.query('SELECT id FROM evt_cuentas_contables LIMIT 1');
  let cuentaContableId = cuentaContableResult.rows[0]?.id;

  if (!cuentaContableId) {
    // Crear cuenta contable por defecto
    const insertCuenta = await client.query(`
      INSERT INTO evt_cuentas_contables (codigo, nombre, tipo, activa, company_id)
      VALUES ('4000', 'INGRESOS POR SERVICIOS', 'ingreso', true, $1)
      RETURNING id
    `, [companyId]);
    cuentaContableId = insertCuenta.rows[0].id;
    console.log('   ✅ Cuenta contable creada');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEER EXCEL Y CREAR PROVEEDORES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('   📊 Leyendo Excel DOT2025-003...');
  const excelPath = path.join(__dirname, '..', 'DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx');
  const wb = XLSX.readFile(excelPath);

  // Leer proveedores de la hoja PROVISIONES
  const provisionesSheet = wb.Sheets['PROVISIONES'];
  const provisionesData = XLSX.utils.sheet_to_json(provisionesSheet, { header: 1 });

  // Crear proveedores únicos
  const proveedoresUnicos = new Set();
  const proveedoresMap = {};

  for (let i = 2; i < provisionesData.length; i++) {
    const row = provisionesData[i];
    if (row && row[0] && typeof row[0] === 'string' && row[0].trim()) {
      proveedoresUnicos.add(row[0].trim());
    }
  }

  console.log(`   📋 Creando ${proveedoresUnicos.size} proveedores...`);

  for (const nombre of proveedoresUnicos) {
    try {
      const result = await client.query(`
        INSERT INTO cat_proveedores (razon_social, nombre_comercial, datos_fiscales_completos, requiere_actualizacion, activo, company_id)
        VALUES ($1, $1, false, true, true, $2)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [nombre, companyId]);

      if (result.rows[0]) {
        proveedoresMap[nombre] = result.rows[0].id;
      } else {
        // Ya existe, obtener ID
        const existing = await client.query(
          'SELECT id FROM cat_proveedores WHERE razon_social = $1 LIMIT 1',
          [nombre]
        );
        if (existing.rows[0]) {
          proveedoresMap[nombre] = existing.rows[0].id;
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Error creando proveedor ${nombre}: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR EVENTOS DE EJEMPLO (2 MESES: Octubre y Noviembre 2025)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('   🎪 Creando eventos de ejemplo...');

  // Verificar si evt_eventos.id es UUID o INTEGER
  const idTypeResult = await client.query(`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'evt_eventos' AND column_name = 'id'
  `);
  const isUUID = idTypeResult.rows[0]?.data_type === 'uuid';
  console.log(`   📌 evt_eventos.id es tipo: ${idTypeResult.rows[0]?.data_type}`);

  const eventos = [
    // Evento del Excel
    {
      clave: 'DOT2025-003',
      nombre: 'CONVENCIÓN DOTERRA 2025',
      descripcion: 'Evento principal de convención anual',
      fecha: '2025-11-15',
      ingreso_estimado: 2500000,
      provisiones: 1800000
    },
    // Eventos adicionales para completar 2 meses
    {
      clave: 'DOT2025-004',
      nombre: 'CAPACITACIÓN DOTERRA OCTUBRE',
      descripcion: 'Capacitación mensual de líderes',
      fecha: '2025-10-20',
      ingreso_estimado: 450000,
      provisiones: 280000
    },
    {
      clave: 'DOT2025-005',
      nombre: 'LANZAMIENTO PRODUCTO NUEVO',
      descripcion: 'Evento de lanzamiento de nueva línea de productos',
      fecha: '2025-10-28',
      ingreso_estimado: 680000,
      provisiones: 420000
    },
    {
      clave: 'DOT2025-006',
      nombre: 'CONFERENCIA REGIONAL NORTE',
      descripcion: 'Conferencia para distribuidores zona norte',
      fecha: '2025-11-08',
      ingreso_estimado: 320000,
      provisiones: 195000
    },
    {
      clave: 'DOT2025-007',
      nombre: 'CIERRE DE AÑO DOTERRA',
      descripcion: 'Evento de cierre de año y reconocimientos',
      fecha: '2025-11-25',
      ingreso_estimado: 850000,
      provisiones: 520000
    }
  ];

  const eventosCreados = [];

  for (const evt of eventos) {
    try {
      const result = await client.query(`
        INSERT INTO evt_eventos (
          clave_evento, nombre_proyecto, descripcion, cliente_id, tipo_evento_id, estado_id,
          fecha_evento, ingreso_estimado, provisiones, utilidad_estimada, activo, company_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
        RETURNING id
      `, [
        evt.clave,
        evt.nombre,
        evt.descripcion,
        clienteId,
        tipoEventoId,
        estadoId,
        evt.fecha,
        evt.ingreso_estimado,
        evt.provisiones,
        evt.ingreso_estimado - evt.provisiones,
        companyId
      ]);

      eventosCreados.push({ ...evt, id: result.rows[0].id });
      console.log(`   ✅ Evento ${evt.clave} creado`);
    } catch (error) {
      console.log(`   ❌ Error creando evento ${evt.clave}: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR PROVISIONES DESDE EL EXCEL (Para DOT2025-003)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('   📋 Creando provisiones desde Excel...');

  const eventoExcel = eventosCreados.find(e => e.clave === 'DOT2025-003');
  if (eventoExcel) {
    // Mapeo de categorías por hoja (SP´S usa char 180, no apóstrofe)
    const hojasCategorias = {
      'SP\u00B4S': 'SP',     // char 180 = ´
      'COMBUSTIBLE  PEAJE': 'COMB',
      'RH': 'RH',
      'MATERIALES': 'MAT'
    };

    for (const [hojaNombre, categoriaClave] of Object.entries(hojasCategorias)) {
      const sheet = wb.Sheets[hojaNombre];
      if (!sheet) {
        console.log(`   ⚠️  Hoja ${hojaNombre} no encontrada`);
        continue;
      }

      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const categoriaId = categorias[categoriaClave];

      if (!categoriaId) {
        console.log(`   ⚠️  Categoría ${categoriaClave} no encontrada`);
        continue;
      }

      let provisionesCreadas = 0;

      // La estructura del Excel: Fila 5=headers, datos desde fila 6
      // Columnas: 0=Status, 1=Método de Pago, 2=No. Factura, 3=Proveedor, 4=Concepto, 5=Subtotal, 6=IVA
      // Para MATERIALES: 4=Concepto, 5=Costo Unitario, 6=Piezas (sin proveedor explícito)
      const startRow = 6;
      const maxRows = Math.min(data.length, 50); // Limitar a primeras 50 filas de datos

      for (let i = startRow; i < maxRows; i++) {
        const row = data[i];
        if (!row || row.length < 6) continue;

        let proveedor, concepto, subtotal, iva, total;

        if (categoriaClave === 'MAT') {
          // MATERIALES: no tiene proveedor explícito, usar concepto como referencia
          proveedor = 'VARIOS MATERIALES';
          concepto = String(row[4] || '').trim();
          const costoUnitario = parseFloat(row[5]) || 0;
          const piezas = parseFloat(row[6]) || 1;
          subtotal = costoUnitario * piezas;
          iva = 0;  // Materiales sin IVA desglosado
          total = subtotal;
        } else {
          // SP'S, COMBUSTIBLE, RH
          proveedor = String(row[3] || '').trim();
          concepto = String(row[4] || '').trim();
          subtotal = parseFloat(row[5]) || 0;
          iva = parseFloat(row[6]) || 0;
          total = subtotal + iva;
        }

        if (!proveedor || subtotal <= 0) continue;

        // Buscar o crear proveedor
        let proveedorId = proveedoresMap[proveedor];
        if (!proveedorId) {
          try {
            const provResult = await client.query(`
              INSERT INTO cat_proveedores (razon_social, datos_fiscales_completos, requiere_actualizacion, activo, company_id)
              VALUES ($1, false, true, true, $2)
              ON CONFLICT DO NOTHING
              RETURNING id
            `, [proveedor, companyId]);
            proveedorId = provResult.rows[0]?.id;

            if (!proveedorId) {
              const existing = await client.query('SELECT id FROM cat_proveedores WHERE razon_social = $1', [proveedor]);
              proveedorId = existing.rows[0]?.id;
            }
            proveedoresMap[proveedor] = proveedorId;
          } catch (provErr) {
            console.log(`      ⚠️ Error proveedor ${proveedor}: ${provErr.message.substring(0, 50)}`);
            continue;
          }
        }

        if (!proveedorId) continue;

        // Asegurar que el total cuadre: total = subtotal + iva - retenciones
        const totalCuadrado = Math.round((subtotal + iva) * 100) / 100;

        try {
          await client.query(`
            INSERT INTO evt_provisiones (
              evento_id, proveedor_id, concepto, categoria_id,
              subtotal, iva, retenciones, total,
              forma_pago_id, estado, fecha_estimada, activo, company_id
            ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, 'pendiente', $9, true, $10)
          `, [
            eventoExcel.id,
            proveedorId,
            concepto || `${categoriaClave} - ${proveedor}`,
            categoriaId,
            Math.round(subtotal * 100) / 100,
            Math.round(iva * 100) / 100,
            totalCuadrado,
            formaPagoId,
            eventoExcel.fecha,
            companyId
          ]);
          provisionesCreadas++;
        } catch (error) {
          console.log(`      ⚠️ Error provisión ${proveedor}: ${error.message.substring(0, 80)}`);
        }
      }

      console.log(`   ✅ ${hojaNombre}: ${provisionesCreadas} provisiones creadas`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR INGRESOS PARA LOS EVENTOS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('   💰 Creando ingresos de ejemplo...');

  for (const evento of eventosCreados) {
    const subtotal = evento.ingreso_estimado / 1.16;
    const iva = evento.ingreso_estimado - subtotal;

    try {
      await client.query(`
        INSERT INTO evt_ingresos (
          evento_id, cliente_id, cliente, rfc_cliente, concepto,
          subtotal, iva_porcentaje, iva, total,
          fecha_ingreso, facturado, cobrado, activo,
          responsable_id, cuenta_contable_id
        ) VALUES ($1, $2, 'DOTERRA MEXICO', 'DOT850101XXX', $3, $4, 16, $5, $6, $7, false, false, true, $8, $9)
      `, [
        evento.id,
        clienteId,
        `Servicios para ${evento.nombre}`,
        Math.round(subtotal * 100) / 100,
        Math.round(iva * 100) / 100,
        Math.round(evento.ingreso_estimado * 100) / 100,
        evento.fecha,
        responsableId,
        cuentaContableId
      ]);
      console.log(`   ✅ Ingreso para ${evento.clave} creado`);
    } catch (error) {
      console.log(`   ⚠️  Error creando ingreso para ${evento.clave}: ${error.message}`);
    }
  }

  console.log('   ✅ Datos de ejemplo poblados');
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 4: MIGRAR DATOS GNI EXISTENTES
// ═══════════════════════════════════════════════════════════════════════════

async function migrarGNI(client) {
  console.log('\n🔄 PASO 4: Migrando datos GNI existentes...');

  // Obtener categorías
  const categoriasResult = await client.query('SELECT id, clave FROM cat_categorias_gasto');
  const categorias = {};
  categoriasResult.rows.forEach(c => categorias[c.clave] = c.id);

  // Actualizar GNI con categoria_unificada_id basado en concepto
  const updates = [
    { clave: 'SP', patterns: ['SERVICIO', 'SP', 'HONORARIO', 'PAGO'] },
    { clave: 'COMB', patterns: ['GASOLINA', 'COMBUSTIBLE', 'CASETA', 'PEAJE', 'DIESEL'] },
    { clave: 'RH', patterns: ['NOMINA', 'SUELDO', 'SALARIO', 'PERSONAL', 'RH'] },
    { clave: 'MAT', patterns: ['MATERIAL', 'INSUMO', 'CONSUMIBLE', 'PAPELERIA'] }
  ];

  for (const { clave, patterns } of updates) {
    const categoriaId = categorias[clave];
    if (!categoriaId) continue;

    for (const pattern of patterns) {
      await client.query(`
        UPDATE cont_gastos_externos
        SET categoria_unificada_id = $1
        WHERE categoria_unificada_id IS NULL
        AND UPPER(concepto) LIKE $2
      `, [categoriaId, `%${pattern}%`]);
    }
  }

  // Asignar categoría SP por defecto a los que no tienen
  const defaultCategoria = categorias['SP'];
  if (defaultCategoria) {
    const result = await client.query(`
      UPDATE cont_gastos_externos
      SET categoria_unificada_id = $1
      WHERE categoria_unificada_id IS NULL
    `, [defaultCategoria]);
    console.log(`   ✅ ${result.rowCount} registros GNI actualizados con categoría por defecto`);
  }

  console.log('   ✅ Migración GNI completada');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   HOMOLOGACIÓN COMPLETA - ERP 777');
  console.log('   Fecha:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    // Ejecutar migración sin transacción (CREATE TABLE no es transaccional en algunos casos)
    await ejecutarMigracion(client);

    await client.query('BEGIN');

    await limpiarDatos(client);
    await poblarDatos(client);
    await migrarGNI(client);

    await client.query('COMMIT');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   ✅ HOMOLOGACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════');

    // Mostrar resumen
    const resumen = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM evt_eventos) AS eventos,
        (SELECT COUNT(*) FROM evt_provisiones) AS provisiones,
        (SELECT COUNT(*) FROM evt_ingresos) AS ingresos,
        (SELECT COUNT(*) FROM cat_proveedores) AS proveedores,
        (SELECT COUNT(*) FROM cat_categorias_gasto) AS categorias,
        (SELECT COUNT(*) FROM cont_gastos_externos) AS gni
    `);

    console.log('\n📊 RESUMEN:');
    console.log(`   Eventos: ${resumen.rows[0].eventos}`);
    console.log(`   Provisiones: ${resumen.rows[0].provisiones}`);
    console.log(`   Ingresos: ${resumen.rows[0].ingresos}`);
    console.log(`   Proveedores: ${resumen.rows[0].proveedores}`);
    console.log(`   Categorías: ${resumen.rows[0].categorias}`);
    console.log(`   GNI: ${resumen.rows[0].gni}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR:', error.message);
    console.error('   Rollback ejecutado');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
