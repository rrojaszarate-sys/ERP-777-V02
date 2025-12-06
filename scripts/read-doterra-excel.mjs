/**
 * Script para analizar en detalle el Excel de DOTERRA
 */
import XLSX from 'xlsx';

const filePath = './DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

console.log('📊 Analizando Excel de DOTERRA en detalle...\n');

const workbook = XLSX.readFile(filePath);

// Analizar hoja de RESUMEN para extraer info del evento
console.log('=== RESUMEN CIERRE INTERNO ===\n');
const resumenSheet = workbook.Sheets['RESUMEN CIERRE INTERNO'];
const resumenData = XLSX.utils.sheet_to_json(resumenSheet, { header: 1, defval: '' });

// Buscar datos del evento
for (let i = 0; i < Math.min(20, resumenData.length); i++) {
    const row = resumenData[i];
    const rowStr = row.join(' | ');
    if (rowStr.trim()) {
        console.log(`Fila ${i}: ${rowStr}`);
    }
}

// Analizar SP's
console.log('\n\n=== SP´S (Solicitudes de Pago) ===\n');
const spsSheet = workbook.Sheets['SP´S'];
const spsData = XLSX.utils.sheet_to_json(spsSheet, { header: 1, defval: '' });

// Encontrar fila de headers
let spsHeaderRow = -1;
for (let i = 0; i < spsData.length; i++) {
    if (spsData[i][0] === 'Status' && spsData[i][4] === 'Concepto') {
        spsHeaderRow = i;
        console.log(`Headers en fila ${i}:`, spsData[i].slice(0, 12));
        break;
    }
}

// Contar filas con datos
let spsCount = 0;
if (spsHeaderRow >= 0) {
    for (let i = spsHeaderRow + 1; i < spsData.length; i++) {
        const row = spsData[i];
        // Si tiene concepto y monto, es válida
        if (row[4] && (row[7] > 0 || parseFloat(row[7]) > 0)) {
            spsCount++;
            if (spsCount <= 5) {
                console.log(`  SP ${spsCount}:`, {
                    status: row[0],
                    metodoPago: row[1],
                    factura: row[2],
                    proveedor: row[3],
                    concepto: row[4],
                    subtotal: row[5],
                    iva: row[6],
                    monto: row[7],
                    fechaPago: row[8]
                });
            }
        }
    }
}
console.log(`\nTotal SP's con datos: ${spsCount}`);

// Analizar COMBUSTIBLE
console.log('\n\n=== COMBUSTIBLE PEAJE ===\n');
const combSheet = workbook.Sheets['COMBUSTIBLE  PEAJE'];
const combData = XLSX.utils.sheet_to_json(combSheet, { header: 1, defval: '' });

let combHeaderRow = -1;
for (let i = 0; i < combData.length; i++) {
    if (combData[i][0] === 'Status' && combData[i][4] === 'Concepto') {
        combHeaderRow = i;
        console.log(`Headers en fila ${i}:`, combData[i].slice(0, 10));
        break;
    }
}

let combCount = 0;
if (combHeaderRow >= 0) {
    for (let i = combHeaderRow + 1; i < combData.length; i++) {
        const row = combData[i];
        if (row[4] && (row[7] > 0 || parseFloat(row[7]) > 0)) {
            combCount++;
            if (combCount <= 3) {
                console.log(`  Comb ${combCount}:`, {
                    status: row[0],
                    concepto: row[4],
                    monto: row[7],
                });
            }
        }
    }
}
console.log(`\nTotal Combustible con datos: ${combCount}`);

// Analizar RH
console.log('\n\n=== RH ===\n');
const rhSheet = workbook.Sheets['RH'];
const rhData = XLSX.utils.sheet_to_json(rhSheet, { header: 1, defval: '' });

let rhHeaderRow = -1;
for (let i = 0; i < rhData.length; i++) {
    if (rhData[i][0] === 'Status' && rhData[i][4] === 'Concepto') {
        rhHeaderRow = i;
        console.log(`Headers en fila ${i}:`, rhData[i].slice(0, 10));
        break;
    }
}

let rhCount = 0;
if (rhHeaderRow >= 0) {
    for (let i = rhHeaderRow + 1; i < rhData.length; i++) {
        const row = rhData[i];
        if (row[4] && (row[7] > 0 || parseFloat(row[7]) > 0)) {
            rhCount++;
            if (rhCount <= 3) {
                console.log(`  RH ${rhCount}:`, {
                    status: row[0],
                    concepto: row[4],
                    monto: row[7],
                });
            }
        }
    }
}
console.log(`\nTotal RH con datos: ${rhCount}`);

// Analizar MATERIALES
console.log('\n\n=== MATERIALES ===\n');
const matSheet = workbook.Sheets['MATERIALES'];
const matData = XLSX.utils.sheet_to_json(matSheet, { header: 1, defval: '' });

let matHeaderRow = -1;
for (let i = 0; i < matData.length; i++) {
    if (matData[i][0] === 'Status' && matData[i][4] === 'Concepto') {
        matHeaderRow = i;
        console.log(`Headers en fila ${i}:`, matData[i].slice(0, 12));
        break;
    }
}

let matCount = 0;
if (matHeaderRow >= 0) {
    for (let i = matHeaderRow + 1; i < matData.length; i++) {
        const row = matData[i];
        if (row[4] && (row[9] > 0 || parseFloat(row[9]) > 0)) {
            matCount++;
            if (matCount <= 3) {
                console.log(`  Mat ${matCount}:`, {
                    status: row[0],
                    concepto: row[4],
                    costoUnit: row[5],
                    piezas: row[6],
                    subtotal: row[7],
                    iva: row[8],
                    monto: row[9],
                });
            }
        }
    }
}
console.log(`\nTotal Materiales con datos: ${matCount}`);

// Analizar PROVISIONES
console.log('\n\n=== PROVISIONES ===\n');
const provSheet = workbook.Sheets['PROVISIONES'];
const provData = XLSX.utils.sheet_to_json(provSheet, { header: 1, defval: '' });

// Buscar headers con contenido
for (let i = 0; i < Math.min(20, provData.length); i++) {
    const row = provData[i];
    const hasContent = row.some(cell => cell && String(cell).trim());
    if (hasContent) {
        console.log(`Fila ${i}:`, row.slice(0, 8));
    }
}

console.log('\n\n✅ Análisis completado');
