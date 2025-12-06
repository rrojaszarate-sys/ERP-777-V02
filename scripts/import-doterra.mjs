/**
 * ============================================================================
 * SCRIPT DE IMPORTACIÓN - DOTERRA CONVENCIÓN 2025
 * ============================================================================
 * 
 * Este script:
 * 1. Elimina TODOS los eventos, ingresos, gastos y provisiones existentes
 * 2. Importa el evento DOT2025-003 desde el Excel
 * 3. Importa todos los gastos organizados por categoría
 * 4. Importa todos los ingresos
 * 5. Importa las provisiones
 * 
 * Archivo fuente: DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx
 * 
 * IMPORTANTE: Este script ELIMINARÁ TODOS LOS DATOS EXISTENTES
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COMPANY_ID = '00000000-0000-0000-0000-000000000001'; // UUID de la empresa
const filePath = '/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

// Mapeo de categorías (IDs reales en la BD)
const CATEGORIAS = {
    'SPs (Solicitudes de Pago)': 6,
    'Combustible/Peaje': 9,
    'RH (Recursos Humanos)': 7,
    'Materiales': 8
};

// Convertir fecha Excel a ISO
function excelDateToISO(excelDate) {
    const today = new Date().toISOString().split('T')[0];

    if (!excelDate) return today;

    // Si es un número (serial de Excel)
    if (typeof excelDate === 'number') {
        // Excel usa días desde 1900-01-01 (con bug de 1900 leap year)
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        return today;
    }

    // Si es string pero contiene texto no-fecha (como "PROCESO", "8 Y 24SEP"), usar fecha actual
    const str = String(excelDate).trim();
    if (str.match(/[A-Za-z]{3,}/) || str.includes(',') || str.match(/\d+\s*(Y|y)\s*\d+/)) {
        return today;
    }

    // Intentar parsear como fecha ISO o similar
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return today;
}

// Parsear número
function parseNumber(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const num = parseFloat(String(val).replace(/[,$]/g, ''));
    return isNaN(num) ? 0 : num;
}

async function main() {
    console.log('🚀 INICIANDO IMPORTACIÓN DOTERRA\n');
    console.log('='.repeat(60));

    // ============================================================
    // PASO 1: ELIMINAR TODOS LOS DATOS EXISTENTES
    // ============================================================
    console.log('\n🗑️  PASO 1: Eliminando datos existentes...\n');

    // Eliminar gastos
    const { error: errorGastos } = await supabase
        .from('evt_gastos_erp')
        .delete()
        .gte('id', 0);

    if (errorGastos) {
        console.error('Error eliminando gastos:', errorGastos);
    } else {
        console.log('  ✓ Gastos eliminados');
    }

    // Eliminar ingresos
    const { error: errorIngresos } = await supabase
        .from('evt_ingresos_erp')
        .delete()
        .gte('id', 0);

    if (errorIngresos) {
        console.error('Error eliminando ingresos:', errorIngresos);
    } else {
        console.log('  ✓ Ingresos eliminados');
    }

    // Eliminar provisiones
    const { error: errorProvisiones } = await supabase
        .from('evt_provisiones_erp')
        .delete()
        .gte('id', 0);

    if (errorProvisiones) {
        console.error('Error eliminando provisiones:', errorProvisiones);
    } else {
        console.log('  ✓ Provisiones eliminadas');
    }

    // Eliminar eventos
    const { error: errorEventos } = await supabase
        .from('evt_eventos_erp')
        .delete()
        .gte('id', 0);

    if (errorEventos) {
        console.error('Error eliminando eventos:', errorEventos);
    } else {
        console.log('  ✓ Eventos eliminados');
    }

    // ============================================================
    // PASO 2: LEER EXCEL
    // ============================================================
    console.log('\n📖 PASO 2: Leyendo archivo Excel...\n');

    const workbook = XLSX.readFile(filePath);
    console.log('  ✓ Archivo leído correctamente');
    console.log('  Hojas:', workbook.SheetNames.join(', '));

    // ============================================================
    // PASO 3: CREAR EVENTO
    // ============================================================
    console.log('\n🎯 PASO 3: Creando evento...\n');

    const eventoData = {
        company_id: COMPANY_ID,
        clave_evento: 'DOT2025-003',
        nombre_proyecto: 'CONVENCIÓN DOTERRA 2025',
        descripcion: 'Convención DOTERRA 2025 - Julio a Diciembre',
        fecha_evento: '2025-07-01',
        fecha_fin: '2025-12-31',
        activo: true,
        fecha_creacion: new Date().toISOString()
    };

    const { data: evento, error: errorEvento } = await supabase
        .from('evt_eventos_erp')
        .insert(eventoData)
        .select()
        .single();

    if (errorEvento) {
        console.error('Error creando evento:', errorEvento);
        return;
    }

    console.log(`  ✓ Evento creado: ${evento.clave_evento} - ${evento.nombre_proyecto} (ID: ${evento.id})`);

    const eventoId = evento.id;

    // ============================================================
    // PASO 4: IMPORTAR INGRESOS
    // ============================================================
    console.log('\n💰 PASO 4: Importando ingresos...\n');

    const resumenSheet = workbook.Sheets['RESUMEN CIERRE INTERNO'];
    const resumenData = XLSX.utils.sheet_to_json(resumenSheet, { header: 1, defval: '' });

    let ingresosImportados = 0;

    // Buscar fila de headers de ingresos
    let ingresosHeaderRow = -1;
    for (let i = 0; i < resumenData.length; i++) {
        if (resumenData[i][0] === 'Status' && resumenData[i][3] === 'Concepto') {
            ingresosHeaderRow = i;
            break;
        }
    }

    if (ingresosHeaderRow >= 0) {
        for (let i = ingresosHeaderRow + 1; i < resumenData.length; i++) {
            const row = resumenData[i];

            // Parar si llegamos a TOTAL INGRESOS
            if (String(row[0]).includes('TOTAL')) break;

            // Si tiene concepto y monto, es válida
            if (row[3] && parseNumber(row[7]) > 0) {
                const ingresoData = {
                    evento_id: eventoId,
                    company_id: COMPANY_ID,
                    concepto: row[3],
                    cliente: row[2] || 'DOTERRA',
                    folio: String(row[1] || ''),
                    subtotal: parseNumber(row[5]),
                    iva: parseNumber(row[6]),
                    total: parseNumber(row[7]),
                    cobrado: row[0] === 'PAGADO',
                    facturado: true,
                    fecha_ingreso: new Date().toISOString().split('T')[0],
                    fecha_creacion: new Date().toISOString()
                };

                const { error } = await supabase.from('evt_ingresos_erp').insert(ingresoData);

                if (error) {
                    console.error(`  ✗ Error ingreso "${row[3]}":`, error.message);
                } else {
                    ingresosImportados++;
                    console.log(`  ✓ Ingreso: ${row[3]} - $${parseNumber(row[7]).toLocaleString()}`);
                }
            }
        }
    }

    console.log(`\n  Total ingresos importados: ${ingresosImportados}`);

    // ============================================================
    // PASO 5: IMPORTAR GASTOS - SP's
    // ============================================================
    console.log('\n💳 PASO 5: Importando SP\'s (Solicitudes de Pago)...\n');

    const spsSheet = workbook.Sheets['SP´S'];
    const spsData = XLSX.utils.sheet_to_json(spsSheet, { header: 1, defval: '' });

    let spsImportados = 0;
    let spsHeaderRow = -1;

    for (let i = 0; i < spsData.length; i++) {
        if (spsData[i][0] === 'Status' && spsData[i][4] === 'Concepto') {
            spsHeaderRow = i;
            break;
        }
    }

    if (spsHeaderRow >= 0) {
        for (let i = spsHeaderRow + 1; i < spsData.length; i++) {
            const row = spsData[i];

            if (row[4] && parseNumber(row[7]) > 0) {
                const gastoData = {
                    evento_id: eventoId,
                    company_id: COMPANY_ID,
                    categoria_id: CATEGORIAS['SPs (Solicitudes de Pago)'],
                    concepto: row[4],
                    notas: `Proveedor: ${row[3] || 'N/A'}`,
                    factura_numero: String(row[2] || ''),
                    subtotal: parseNumber(row[5]),
                    iva: parseNumber(row[6]),
                    total: parseNumber(row[7]),
                    pagado: row[0] === 'PAGADO',
                    metodo_pago: row[1] || 'transferencia',
                    fecha_gasto: excelDateToISO(row[8]),
                    fecha_creacion: new Date().toISOString()
                };

                const { error } = await supabase.from('evt_gastos_erp').insert(gastoData);

                if (error) {
                    console.error(`  ✗ Error SP "${row[4]}":`, error.message);
                } else {
                    spsImportados++;
                }
            }
        }
    }

    console.log(`  ✓ SP's importados: ${spsImportados}`);

    // ============================================================
    // PASO 6: IMPORTAR GASTOS - COMBUSTIBLE
    // ============================================================
    console.log('\n⛽ PASO 6: Importando Combustible/Peaje...\n');

    const combSheet = workbook.Sheets['COMBUSTIBLE  PEAJE'];
    const combData = XLSX.utils.sheet_to_json(combSheet, { header: 1, defval: '' });

    let combImportados = 0;
    let combHeaderRow = -1;

    for (let i = 0; i < combData.length; i++) {
        if (combData[i][0] === 'Status' && combData[i][4] === 'Concepto') {
            combHeaderRow = i;
            break;
        }
    }

    if (combHeaderRow >= 0) {
        for (let i = combHeaderRow + 1; i < combData.length; i++) {
            const row = combData[i];

            if (row[4] && parseNumber(row[7]) > 0) {
                const gastoData = {
                    evento_id: eventoId,
                    company_id: COMPANY_ID,
                    categoria_id: CATEGORIAS['Combustible/Peaje'],
                    concepto: row[4],
                    notas: `Proveedor: ${row[3] || 'N/A'}`,
                    factura_numero: String(row[2] || ''),
                    subtotal: parseNumber(row[5]),
                    iva: parseNumber(row[6]),
                    total: parseNumber(row[7]),
                    pagado: row[0] === 'PAGADO',
                    metodo_pago: row[1] || 'efectivo',
                    fecha_gasto: excelDateToISO(row[8]),
                    fecha_creacion: new Date().toISOString()
                };

                const { error } = await supabase.from('evt_gastos_erp').insert(gastoData);

                if (error) {
                    console.error(`  ✗ Error Combustible "${row[4]}":`, error.message);
                } else {
                    combImportados++;
                }
            }
        }
    }

    console.log(`  ✓ Combustible importados: ${combImportados}`);

    // ============================================================
    // PASO 7: IMPORTAR GASTOS - RH
    // ============================================================
    console.log('\n👥 PASO 7: Importando RH (Recursos Humanos)...\n');

    const rhSheet = workbook.Sheets['RH'];
    const rhData = XLSX.utils.sheet_to_json(rhSheet, { header: 1, defval: '' });

    let rhImportados = 0;
    let rhHeaderRow = -1;

    for (let i = 0; i < rhData.length; i++) {
        if (rhData[i][0] === 'Status' && rhData[i][4] === 'Concepto') {
            rhHeaderRow = i;
            break;
        }
    }

    if (rhHeaderRow >= 0) {
        for (let i = rhHeaderRow + 1; i < rhData.length; i++) {
            const row = rhData[i];

            if (row[4] && parseNumber(row[7]) > 0) {
                const gastoData = {
                    evento_id: eventoId,
                    company_id: COMPANY_ID,
                    categoria_id: CATEGORIAS['RH (Recursos Humanos)'],
                    concepto: row[4],
                    notas: `Proveedor: ${row[3] || 'N/A'}`,
                    factura_numero: String(row[2] || ''),
                    subtotal: parseNumber(row[5]),
                    iva: parseNumber(row[6]),
                    total: parseNumber(row[7]),
                    pagado: row[0] === 'PAGADO',
                    metodo_pago: row[1] || 'transferencia',
                    fecha_gasto: excelDateToISO(row[8]),
                    fecha_creacion: new Date().toISOString()
                };

                const { error } = await supabase.from('evt_gastos_erp').insert(gastoData);

                if (error) {
                    console.error(`  ✗ Error RH "${row[4]}":`, error.message);
                } else {
                    rhImportados++;
                }
            }
        }
    }

    console.log(`  ✓ RH importados: ${rhImportados}`);

    // ============================================================
    // PASO 8: IMPORTAR GASTOS - MATERIALES
    // ============================================================
    console.log('\n🛠️  PASO 8: Importando Materiales...\n');

    const matSheet = workbook.Sheets['MATERIALES'];
    const matData = XLSX.utils.sheet_to_json(matSheet, { header: 1, defval: '' });

    let matImportados = 0;
    let matHeaderRow = -1;

    for (let i = 0; i < matData.length; i++) {
        if (matData[i][0] === 'Status' && matData[i][4] === 'Concepto') {
            matHeaderRow = i;
            break;
        }
    }

    if (matHeaderRow >= 0) {
        for (let i = matHeaderRow + 1; i < matData.length; i++) {
            const row = matData[i];

            // Materiales tiene columnas diferentes: [0-Status, 1-MetodoPago, 2-Factura, 3-Proveedor, 4-Concepto, 5-CostoUnit, 6-Piezas, 7-Subtotal, 8-IVA, 9-Monto, 10-Fecha]
            if (row[4] && parseNumber(row[9]) > 0) {
                const gastoData = {
                    evento_id: eventoId,
                    company_id: COMPANY_ID,
                    categoria_id: CATEGORIAS['Materiales'],
                    concepto: row[4],
                    notas: `Proveedor: ${row[3] || 'N/A'} | Costo unitario: $${parseNumber(row[5])} x ${parseNumber(row[6])} piezas`,
                    factura_numero: String(row[2] || ''),
                    subtotal: parseNumber(row[7]),
                    iva: parseNumber(row[8]),
                    total: parseNumber(row[9]),
                    pagado: row[0] === 'PAGADO',
                    metodo_pago: row[1] || 'transferencia',
                    fecha_gasto: excelDateToISO(row[10]),
                    fecha_creacion: new Date().toISOString()
                };

                const { error } = await supabase.from('evt_gastos_erp').insert(gastoData);

                if (error) {
                    console.error(`  ✗ Error Material "${row[4]}":`, error.message);
                } else {
                    matImportados++;
                }
            }
        }
    }

    console.log(`  ✓ Materiales importados: ${matImportados}`);

    // ============================================================
    // PASO 9: IMPORTAR PROVISIONES
    // ============================================================
    console.log('\n📋 PASO 9: Importando Provisiones...\n');

    const provSheet = workbook.Sheets['PROVISIONES'];
    const provData = XLSX.utils.sheet_to_json(provSheet, { header: 1, defval: '' });

    let provImportadas = 0;
    let provHeaderRow = -1;

    // Buscar header de provisiones (diferente estructura)
    for (let i = 0; i < provData.length; i++) {
        if (provData[i][0] === 'Proveedor / Razón Social' && provData[i][1] === 'Concepto') {
            provHeaderRow = i;
            break;
        }
    }

    if (provHeaderRow >= 0) {
        for (let i = provHeaderRow + 1; i < provData.length; i++) {
            const row = provData[i];

            // Provisiones: [0-Proveedor, 1-Concepto, 2-Subtotal, 3-IVA, 4-Monto, 5-Notas]
            if (row[1] && parseNumber(row[4]) > 0) {
                const provisionData = {
                    evento_id: eventoId,
                    company_id: COMPANY_ID,
                    proveedor_id: 46, // Proveedor genérico
                    categoria_id: 6, // Categoría: SPs (Solicitudes de Pago) por defecto
                    concepto: row[1],
                    notas: `Proveedor: ${row[0] || 'N/A'}${row[5] ? ' | ' + row[5] : ''}`,
                    subtotal: parseNumber(row[2]),
                    iva: parseNumber(row[3]),
                    total: parseNumber(row[4]),
                    estado: 'pendiente',
                    activo: true,
                    created_at: new Date().toISOString()
                };

                const { error } = await supabase.from('evt_provisiones_erp').insert(provisionData);

                if (error) {
                    console.error(`  ✗ Error Provisión "${row[1]}":`, error.message);
                } else {
                    provImportadas++;
                }
            }
        }
    }

    console.log(`  ✓ Provisiones importadas: ${provImportadas}`);

    // ============================================================
    // RESUMEN FINAL
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORTACIÓN COMPLETADA');
    console.log('='.repeat(60));
    console.log(`
📊 RESUMEN:
   
   🎯 Evento: ${evento.clave_evento} - ${evento.nombre_proyecto}
   
   💰 Ingresos:     ${ingresosImportados}
   💳 SP's:         ${spsImportados}
   ⛽ Combustible:  ${combImportados}
   👥 RH:           ${rhImportados}
   🛠️  Materiales:  ${matImportados}
   📋 Provisiones:  ${provImportadas}
   
   📁 Total gastos: ${spsImportados + combImportados + rhImportados + matImportados}
`);
}

main().catch(console.error);
