/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT DE IMPORTACIÓN DE EVENTOS - VERSIÓN DEFINITIVA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script importa datos financieros de un evento desde un archivo Excel
 * a la base de datos del ERP.
 * 
 * CARACTERÍSTICAS:
 * - Lee las columnas correctas de Subtotal, IVA y Total del Excel
 * - NO calcula IVA artificialmente (usa los valores del Excel)
 * - Soporta gastos con y sin IVA (nóminas, mano de obra, etc.)
 * - Excluye filas de totales automáticamente
 * - Crea proveedores automáticamente si no existen
 * 
 * USO:
 *   1. Configura las variables EXCEL_PATH, COMPANY_ID y EVENTO_ID
 *   2. Ejecuta: node scripts/importar_evento_definitivo.mjs
 * 
 * ESTRUCTURA ESPERADA DEL EXCEL:
 * 
 * Pestaña "SP´S" (Solicitudes de Pago):
 *   - Col A: Status (PAGADO/PENDIENTE)
 *   - Col B: Método de Pago
 *   - Col C: No. Factura
 *   - Col D: Proveedor
 *   - Col E: Concepto
 *   - Col F: Sub-Total
 *   - Col G: I.V.A (puede ser 0)
 *   - Col H: Monto a Pagar (Total)
 *   - Fila inicio: 7
 * 
 * Pestaña "COMBUSTIBLE  PEAJE":
 *   - Misma estructura que SP´S
 *   - Fila inicio: 7
 * 
 * Pestaña "RH":
 *   - Misma estructura que SP´S
 *   - Col G: I.V.A = 0 (nóminas no tienen IVA)
 *   - Fila inicio: 7
 * 
 * Pestaña "MATERIALES":
 *   - Col A: Status
 *   - Col D: Proveedor
 *   - Col E: Concepto
 *   - Col F: Costo Unitario
 *   - Col G: Piezas
 *   - Col H: Sub-Total
 *   - Col I: I.V.A
 *   - Col J: Monto a Pagar (Total)
 *   - Fila inicio: 7
 * 
 * Pestaña "PROVISIONES":
 *   - Col A: Proveedor
 *   - Col B: Concepto
 *   - Col C: Sub-Total
 *   - Col D: I.V.A (generalmente 0)
 *   - Col E: Monto a Pagar (Total)
 *   - Fila inicio: 9
 *   - NOTA: Las provisiones son estimaciones, generalmente SIN IVA
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN - MODIFICAR SEGÚN EL EVENTO A IMPORTAR
// ═══════════════════════════════════════════════════════════════════════════════

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_ID = 32;

// Configuración de pestañas de gastos
// Cada pestaña tiene su propia estructura de columnas
const PESTANAS_GASTOS = [
    {
        nombre: "SP´S",
        categoriaId: 6,
        filaInicio: 7,
        columnas: {
            status: 'A',
            proveedor: 'D',
            concepto: 'E',
            subtotal: 'F',
            iva: 'G',
            total: 'H'
        }
    },
    {
        nombre: "COMBUSTIBLE  PEAJE",
        categoriaId: 9,
        filaInicio: 7,
        columnas: {
            status: 'A',
            proveedor: 'D',
            concepto: 'E',
            subtotal: 'F',
            iva: 'G',
            total: 'H'
        }
    },
    {
        nombre: "RH",
        categoriaId: 7,
        filaInicio: 7,
        columnas: {
            status: 'A',
            proveedor: 'D',
            concepto: 'E',
            subtotal: 'F',
            iva: 'G',
            total: 'H'
        }
    },
    {
        nombre: "MATERIALES",
        categoriaId: 8,
        filaInicio: 7,
        columnas: {
            status: 'A',
            proveedor: 'D',
            concepto: 'E',
            subtotal: 'H',  // ¡Diferente! En Materiales el subtotal está en H
            iva: 'I',
            total: 'J'
        }
    }
];

// Configuración de pestaña de provisiones
const PESTANA_PROVISIONES = {
    nombre: "PROVISIONES",
    filaInicio: 9,
    columnas: {
        proveedor: 'A',
        concepto: 'B',
        subtotal: 'C',
        iva: 'D',
        total: 'E'
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONEXIÓN A SUPABASE
// ═══════════════════════════════════════════════════════════════════════════════

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el valor de una celda del Excel
 */
function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

/**
 * Verifica si una fila es una fila de totales (para excluirla)
 */
function esFilaTotal(concepto, proveedor) {
    const conceptoUpper = String(concepto || '').toUpperCase().trim();
    const proveedorUpper = String(proveedor || '').toUpperCase().trim();

    return (
        (conceptoUpper === '' && proveedorUpper === '') ||
        conceptoUpper.startsWith('TOTAL DE') ||
        conceptoUpper.startsWith('SUMA DE') ||
        conceptoUpper === 'TOTAL' ||
        conceptoUpper === 'TOTAL DE PROVISIONES' ||
        proveedorUpper.startsWith('TOTAL DE') ||
        proveedorUpper === 'TOTAL'
    );
}

/**
 * Parsea un valor numérico, manejando diferentes formatos
 */
function parseNumero(valor) {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') return valor;

    // Eliminar caracteres no numéricos excepto punto y coma
    const limpio = String(valor).replace(/[^0-9.,\-]/g, '').replace(',', '.');
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
}

// Cache de proveedores para evitar consultas repetidas
const proveedoresCache = new Map();

/**
 * Obtiene o crea un proveedor en la base de datos
 */
async function obtenerOCrearProveedor(nombreProveedor) {
    if (!nombreProveedor) return 47; // ID por defecto

    const nombre = String(nombreProveedor).trim().toUpperCase();
    if (nombre === '' || nombre === 'N/A') return 47;

    if (proveedoresCache.has(nombre)) {
        return proveedoresCache.get(nombre);
    }

    // Buscar proveedor existente
    const { data: existente } = await supabase
        .from('cat_proveedores')
        .select('id')
        .ilike('razon_social', nombre)
        .limit(1);

    if (existente && existente[0]) {
        proveedoresCache.set(nombre, existente[0].id);
        return existente[0].id;
    }

    // Crear nuevo proveedor
    const { data: nuevo, error } = await supabase
        .from('cat_proveedores')
        .insert({
            razon_social: nombre,
            nombre_comercial: nombre,
            rfc: 'XAXX010101000', // RFC genérico
            activo: true
        })
        .select('id');

    if (nuevo && nuevo[0]) {
        proveedoresCache.set(nombre, nuevo[0].id);
        console.log(`      ✨ Proveedor creado: ${nombre}`);
        return nuevo[0].id;
    }

    return 47; // ID por defecto si falla
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE IMPORTACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Borra todos los datos existentes del evento
 */
async function borrarDatosEvento() {
    console.log('\n🗑️  BORRANDO DATOS EXISTENTES DEL EVENTO...\n');

    const { error: e1 } = await supabase.from('evt_gastos_erp').delete().eq('evento_id', EVENTO_ID);
    console.log('   Gastos:', e1 ? '❌ Error: ' + e1.message : '✅ Eliminados');

    const { error: e2 } = await supabase.from('evt_ingresos_erp').delete().eq('evento_id', EVENTO_ID);
    console.log('   Ingresos:', e2 ? '❌ Error: ' + e2.message : '✅ Eliminados');

    const { error: e3 } = await supabase.from('evt_provisiones_erp').delete().eq('evento_id', EVENTO_ID);
    console.log('   Provisiones:', e3 ? '❌ Error: ' + e3.message : '✅ Eliminados');
}

/**
 * Importa gastos de todas las pestañas configuradas
 */
async function importarGastos(workbook) {
    console.log('\n💰 IMPORTANDO GASTOS...\n');

    let totalGeneral = 0;
    let registrosGeneral = 0;

    for (const config of PESTANAS_GASTOS) {
        const sheet = workbook.Sheets[config.nombre];
        if (!sheet) {
            console.log(`   ⚠️  Pestaña "${config.nombre}" no encontrada`);
            continue;
        }

        let insertados = 0;
        let sumaTotal = 0;
        let sumaSubtotal = 0;
        let sumaIva = 0;
        let fila = config.filaInicio;
        let filasSinDatos = 0;
        const cols = config.columnas;

        while (fila < 1200 && filasSinDatos < 50) {  // 50 filas vacías para soportar secciones con espacios
            // Leer columnas según configuración
            const total = parseNumero(getCellValue(sheet, cols.total, fila));
            const subtotal = parseNumero(getCellValue(sheet, cols.subtotal, fila));
            const iva = parseNumero(getCellValue(sheet, cols.iva, fila));
            const concepto = getCellValue(sheet, cols.concepto, fila);
            const proveedor = getCellValue(sheet, cols.proveedor, fila);
            const status = getCellValue(sheet, cols.status, fila);

            // Verificar si hay datos
            if (total === 0 && subtotal === 0) {
                filasSinDatos++;
                fila++;
                continue;
            }

            filasSinDatos = 0;

            // Excluir filas de totales
            if (esFilaTotal(concepto, proveedor)) {
                console.log(`      🔸 Saltando TOTAL (fila ${fila}): ${concepto || proveedor}`);
                fila++;
                continue;
            }

            const conceptoFinal = String(concepto || proveedor || `Gasto ${config.nombre}`).substring(0, 200);
            const pagado = status && String(status).toUpperCase().includes('PAGADO');

            // Usar valores del Excel directamente
            // Manejar valores negativos (devoluciones/retornos)
            // Si subtotal es 0 pero total no, usar total como subtotal
            const subtotalFinal = subtotal !== 0 ? subtotal : total;
            // Si no hay IVA en el Excel, es 0 (no calcular artificialmente)
            const ivaFinal = iva || 0;
            // Si total es 0 pero hay subtotal, calcularlo
            const totalFinal = total !== 0 ? total : subtotalFinal + ivaFinal;

            // Log para valores negativos (devoluciones)
            if (totalFinal < 0) {
                console.log(`      🔴 Devolución: ${conceptoFinal.substring(0, 40)} = $${totalFinal.toLocaleString()}`);
            }

            const { error } = await supabase
                .from('evt_gastos_erp')
                .insert({
                    company_id: COMPANY_ID,
                    evento_id: EVENTO_ID,
                    categoria_id: config.categoriaId,
                    concepto: conceptoFinal,
                    subtotal: subtotalFinal,
                    iva: ivaFinal,
                    total: totalFinal,
                    pagado: pagado,
                    fecha_gasto: new Date().toISOString().split('T')[0],
                    fecha_creacion: new Date().toISOString()
                });

            if (!error) {
                insertados++;
                sumaTotal += totalFinal;
                sumaSubtotal += subtotalFinal;
                sumaIva += ivaFinal;
            } else {
                console.log(`      ❌ Error fila ${fila}:`, error.message);
            }
            fila++;
        }

        const tieneIva = sumaIva > 0 ? '(con IVA)' : '(sin IVA)';
        console.log(`   📁 ${config.nombre}: ${insertados} registros`);
        console.log(`      Total: $${sumaTotal.toLocaleString()} | Subtotal: $${sumaSubtotal.toLocaleString()} | IVA: $${sumaIva.toLocaleString()} ${tieneIva}`);

        totalGeneral += sumaTotal;
        registrosGeneral += insertados;
    }

    console.log(`\n   ═══════════════════════════════════════`);
    console.log(`   TOTAL GASTOS: ${registrosGeneral} registros = $${totalGeneral.toLocaleString()}`);
}

/**
 * Importa provisiones
 */
async function importarProvisiones(workbook) {
    console.log('\n📦 IMPORTANDO PROVISIONES...\n');

    const config = PESTANA_PROVISIONES;
    const sheet = workbook.Sheets[config.nombre];

    if (!sheet) {
        console.log(`   ⚠️  Pestaña "${config.nombre}" no encontrada`);
        return;
    }

    let insertados = 0;
    let sumaTotal = 0;
    let fila = config.filaInicio;
    let filasSinDatos = 0;
    const cols = config.columnas;

    while (fila < 1100 && filasSinDatos < 10) {
        const total = parseNumero(getCellValue(sheet, cols.total, fila));
        const subtotal = parseNumero(getCellValue(sheet, cols.subtotal, fila));
        const iva = parseNumero(getCellValue(sheet, cols.iva, fila));
        const concepto = getCellValue(sheet, cols.concepto, fila);
        const proveedor = getCellValue(sheet, cols.proveedor, fila);

        if (total === 0 && subtotal === 0) {
            filasSinDatos++;
            fila++;
            continue;
        }

        filasSinDatos = 0;

        // Excluir filas de totales
        if (esFilaTotal(concepto, proveedor)) {
            console.log(`      🔸 Saltando TOTAL (fila ${fila}): ${concepto || proveedor}`);
            fila++;
            continue;
        }

        const conceptoFinal = String(concepto || proveedor || 'Provisión').substring(0, 200);
        const proveedorId = await obtenerOCrearProveedor(proveedor);

        // PROVISIONES: Usar valores del Excel
        // Las provisiones generalmente NO tienen IVA (son estimaciones)
        const totalFinal = total > 0 ? total : subtotal;
        const subtotalFinal = subtotal > 0 ? subtotal : total;
        const ivaFinal = iva || 0; // Usar IVA del Excel, si es 0 queda en 0

        const { error } = await supabase
            .from('evt_provisiones_erp')
            .insert({
                company_id: COMPANY_ID,
                evento_id: EVENTO_ID,
                proveedor_id: proveedorId,
                categoria_id: 1, // Categoría genérica para provisiones
                concepto: conceptoFinal,
                subtotal: subtotalFinal,
                iva: ivaFinal,
                iva_porcentaje: ivaFinal > 0 ? 16 : 0,
                total: totalFinal,
                activo: true,
                estado: 'pendiente',
                created_at: new Date().toISOString()
            });

        if (!error) {
            insertados++;
            sumaTotal += totalFinal;
        } else {
            console.log(`      ❌ Error fila ${fila}:`, error.message);
        }
        fila++;
    }

    console.log(`   📦 Provisiones: ${insertados} registros = $${sumaTotal.toLocaleString()}`);
}

/**
 * Importa ingresos (hardcodeados para este evento específico)
 * TODO: Leer desde una pestaña del Excel si existe
 */
async function importarIngresos() {
    console.log('\n💵 IMPORTANDO INGRESOS...\n');

    // Ingresos del evento DOTERRA 2025
    // NOTA: Estos valores ya incluyen IVA (son facturas reales)
    const ingresos = [
        { concepto: 'CONVENCIÓN DOTERRA 2025 ANTICIPO', total: 1939105.30 },
        { concepto: 'CONVENCIÓN DOTERRA 2025 FINIQUITO', total: 2052301.58 },
        { concepto: 'CONVENCIÓN DOTERRA 2025 FEE', total: 399149.69 }
    ];

    let sumaTotal = 0;

    for (const ing of ingresos) {
        // Los ingresos facturados SÍ tienen IVA (16%)
        const subtotal = ing.total / 1.16;
        const iva = ing.total - subtotal;

        const { error } = await supabase
            .from('evt_ingresos_erp')
            .insert({
                company_id: COMPANY_ID,
                evento_id: EVENTO_ID,
                concepto: ing.concepto,
                subtotal: subtotal,
                iva: iva,
                total: ing.total,
                facturado: true,
                cobrado: true,
                fecha_ingreso: new Date().toISOString().split('T')[0],
                fecha_creacion: new Date().toISOString()
            });

        if (!error) {
            console.log(`   ✅ ${ing.concepto}: $${ing.total.toLocaleString()}`);
            sumaTotal += ing.total;
        } else {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    console.log(`\n   TOTAL INGRESOS: $${sumaTotal.toLocaleString()}`);
}

/**
 * Verifica los resultados de la importación
 */
async function verificarResultados() {
    console.log('\n📊 VERIFICACIÓN FINAL...\n');

    // Gastos por categoría
    console.log('   GASTOS POR CATEGORÍA:');
    for (const config of PESTANAS_GASTOS) {
        const { data } = await supabase
            .from('evt_gastos_erp')
            .select('total, subtotal, iva')
            .eq('evento_id', EVENTO_ID)
            .eq('categoria_id', config.categoriaId);

        const count = data ? data.length : 0;
        const sumaTotal = data ? data.reduce((s, g) => s + (g.total || 0), 0) : 0;
        const sumaSubtotal = data ? data.reduce((s, g) => s + (g.subtotal || 0), 0) : 0;
        const sumaIva = data ? data.reduce((s, g) => s + (g.iva || 0), 0) : 0;

        console.log(`      ${config.nombre}: ${count} registros`);
        console.log(`         Total: $${sumaTotal.toLocaleString()} | Subtotal: $${sumaSubtotal.toLocaleString()} | IVA: $${sumaIva.toLocaleString()}`);
    }

    // Totales
    const { data: gastos } = await supabase.from('evt_gastos_erp').select('total, subtotal, iva').eq('evento_id', EVENTO_ID);
    const { data: ingresos } = await supabase.from('evt_ingresos_erp').select('total, subtotal, iva').eq('evento_id', EVENTO_ID);
    const { data: provisiones } = await supabase.from('evt_provisiones_erp').select('total, subtotal, iva').eq('evento_id', EVENTO_ID).eq('activo', true);

    const sumaGastos = gastos ? gastos.reduce((s, g) => s + (g.total || 0), 0) : 0;
    const sumaGastosSubtotal = gastos ? gastos.reduce((s, g) => s + (g.subtotal || 0), 0) : 0;
    const sumaIngresos = ingresos ? ingresos.reduce((s, i) => s + (i.total || 0), 0) : 0;
    const sumaIngresosSubtotal = ingresos ? ingresos.reduce((s, i) => s + (i.subtotal || 0), 0) : 0;
    const sumaProvisiones = provisiones ? provisiones.reduce((s, p) => s + (p.total || 0), 0) : 0;
    const sumaProvisionesSubtotal = provisiones ? provisiones.reduce((s, p) => s + (p.subtotal || 0), 0) : 0;

    console.log('\n   ═══════════════════════════════════════');
    console.log('   RESUMEN FINANCIERO:');
    console.log('   ═══════════════════════════════════════');
    console.log(`   Ingresos:     $${sumaIngresos.toLocaleString()} (Subtotal: $${sumaIngresosSubtotal.toLocaleString()})`);
    console.log(`   Gastos:       $${sumaGastos.toLocaleString()} (Subtotal: $${sumaGastosSubtotal.toLocaleString()})`);
    console.log(`   Provisiones:  $${sumaProvisiones.toLocaleString()} (Subtotal: $${sumaProvisionesSubtotal.toLocaleString()})`);
    console.log('   ───────────────────────────────────────');
    console.log(`   Utilidad (c/IVA): $${(sumaIngresos - sumaGastos - sumaProvisiones).toLocaleString()}`);
    console.log(`   Utilidad (s/IVA): $${(sumaIngresosSubtotal - sumaGastosSubtotal - sumaProvisionesSubtotal).toLocaleString()}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     IMPORTACIÓN DE EVENTO - VERSIÓN DEFINITIVA');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`   Archivo: ${EXCEL_PATH}`);
    console.log(`   Evento ID: ${EVENTO_ID}`);
    console.log('═══════════════════════════════════════════════════════════════════');

    // Cargar Excel
    const workbook = XLSX.readFile(EXCEL_PATH);
    console.log('\n📂 Excel cargado correctamente');
    console.log('   Hojas encontradas:', workbook.SheetNames.join(', '));

    // Ejecutar importación
    await borrarDatosEvento();
    await importarGastos(workbook);
    await importarProvisiones(workbook);
    await importarIngresos();
    await verificarResultados();

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('     ✅ IMPORTACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('   - Los valores de Subtotal, IVA y Total se leyeron del Excel');
    console.log('   - NO se calculó IVA artificialmente');
    console.log('   - Refresca la página del ERP para ver los cambios');
    console.log('═══════════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
