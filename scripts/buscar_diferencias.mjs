import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 BÚSQUEDA DE DIFERENCIAS EN SP´S Y MATERIALES');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);

    // ═══════════════════════════════════════════════════════════════════════
    // ANÁLISIS DE SP's - Diferencia de $3,867
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n\n📊 ANÁLISIS DETALLADO: SP´S');
    console.log('   Total esperado según Excel: $859,674.39');
    console.log('   Total calculado sumando filas: $863,541.39');
    console.log('   Diferencia: $3,867.00');
    console.log('\n   Buscando filas que podrían estar excluidas del total...\n');

    const sheetSPS = workbook.Sheets["SP´S"];
    let sumaSPS = 0;
    const filasSPS = [];

    for (let fila = 7; fila < 140; fila++) {
        const monto = getCellValue(sheetSPS, 'H', fila);
        const concepto = getCellValue(sheetSPS, 'E', fila);
        const proveedor = getCellValue(sheetSPS, 'D', fila);
        const status = getCellValue(sheetSPS, 'A', fila);

        if (monto && parseFloat(monto) > 0) {
            const montoNum = parseFloat(monto);
            const texto = String(concepto || '') + String(proveedor || '') + String(status || '');
            const esTotal = texto.toUpperCase().includes('TOTAL') || texto.toUpperCase().includes('SUMA');

            filasSPS.push({
                fila,
                monto: montoNum,
                concepto: String(concepto || '').substring(0, 40),
                proveedor: String(proveedor || '').substring(0, 30),
                status: String(status || ''),
                esTotal
            });

            if (!esTotal) {
                sumaSPS += montoNum;
            }
        }
    }

    // Buscar registros cercanos a $3,867
    console.log('   🔎 Registros cercanos a la diferencia de $3,867:');
    filasSPS.filter(f => !f.esTotal && f.monto >= 3500 && f.monto <= 4200).forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto} - "${f.concepto}" [${f.status}]`);
    });

    // Ver si algún registro tiene status que indique que no debería sumarse
    console.log('\n   🔎 Registros con status especiales (PENDIENTE, CANCELADO, etc.):');
    filasSPS.filter(f => !f.esTotal && (
        f.status.toUpperCase().includes('PENDIENTE') ||
        f.status.toUpperCase().includes('CANCELADO') ||
        f.status.toUpperCase().includes('DEVUELTO')
    )).forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto} - "${f.concepto}" [${f.status}]`);
    });

    // Fila 117 - "PAGO TOTAL BLASTER" - Esto es un PAGO TOTAL, no un TOTAL de suma
    console.log('\n   ⚠️ HALLAZGO IMPORTANTE:');
    console.log('   La fila 117 dice "PAGO TOTAL BLASTER" con $32,132');
    console.log('   Esto NO es una fila de suma, ES un gasto real (pago total del proveedor Blaster)');
    console.log('   El script anterior la excluyó incorrectamente.');

    // ═══════════════════════════════════════════════════════════════════════
    // ANÁLISIS DE MATERIALES - Diferencia de $6,047.66
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n\n📊 ANÁLISIS DETALLADO: MATERIALES');
    console.log('   Total esperado según Excel: $477,883.94');
    console.log('   Total calculado sumando filas: $483,931.60');
    console.log('   Diferencia: $6,047.66');
    console.log('\n   Buscando filas que podrían estar excluidas del total...\n');

    const sheetMat = workbook.Sheets["MATERIALES"];
    let sumaMat = 0;
    const filasMat = [];

    for (let fila = 7; fila < 180; fila++) {
        const monto = getCellValue(sheetMat, 'J', fila);
        const concepto = getCellValue(sheetMat, 'E', fila);
        const proveedor = getCellValue(sheetMat, 'D', fila);
        const status = getCellValue(sheetMat, 'A', fila);

        if (monto && parseFloat(monto) > 0) {
            const montoNum = parseFloat(monto);
            const texto = String(concepto || '') + String(proveedor || '') + String(status || '');
            const esTotal = texto.toUpperCase().includes('TOTAL') || texto.toUpperCase().includes('SUMA');

            filasMat.push({
                fila,
                monto: montoNum,
                concepto: String(concepto || '').substring(0, 40),
                proveedor: String(proveedor || '').substring(0, 30),
                status: String(status || ''),
                esTotal
            });

            if (!esTotal) {
                sumaMat += montoNum;
            }
        }
    }

    // Buscar registros cercanos a $6,047.66
    console.log('   🔎 Registros cercanos a la diferencia de $6,047.66:');
    filasMat.filter(f => !f.esTotal && f.monto >= 5500 && f.monto <= 6500).forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto} - "${f.concepto}" [${f.status}]`);
    });

    // Ver si hay registros PENDIENTES que no deberían contar
    console.log('\n   🔎 Registros con status PENDIENTE en MATERIALES:');
    let sumaPendientes = 0;
    filasMat.filter(f => !f.esTotal && f.status.toUpperCase().includes('PENDIENTE')).forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto.toFixed(2)} - "${f.concepto}"`);
        sumaPendientes += f.monto;
    });
    console.log(`      SUMA PENDIENTES: $${sumaPendientes.toFixed(2)}`);

    // CONCLUSIÓN
    console.log('\n\n' + '═'.repeat(70));
    console.log('   📋 CONCLUSIONES');
    console.log('═'.repeat(70));
    console.log(`
   1. SP's: La fila 117 "PAGO TOTAL BLASTER" ($32,132) es un GASTO REAL,
      no una fila de suma. El script la excluyó incorrectamente porque
      contiene la palabra "TOTAL" en el concepto.

   2. MATERIALES: La diferencia de $6,047.66 probablemente corresponde
      a registros con status PENDIENTE que el resumen del Excel excluye
      de su cálculo.

   3. El RESUMEN INTERNO del Excel parece filtrar por:
      - Excluir registros PENDIENTES
      - O aplicar otra lógica de agrupación

   RECOMENDACIÓN: Revisar si el resumen del Excel filtra por STATUS = PAGADO
   y eliminar la lógica de exclusión por palabra "TOTAL" en el concepto.
`);

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
