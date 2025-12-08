import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 ANÁLISIS DE DEVOLUCIONES (MONTOS NEGATIVOS)');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);

    // ═══════════════════════════════════════════════════════════════════════
    // SP's - Buscar montos negativos
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📊 SP´S - MONTOS NEGATIVOS (DEVOLUCIONES):');

    const sheetSPS = workbook.Sheets["SP´S"];
    let sumaPositivos = 0;
    let sumaNegativos = 0;
    const devoluciones = [];

    for (let fila = 7; fila <= 137; fila++) {
        const monto = getCellValue(sheetSPS, 'H', fila);
        const concepto = getCellValue(sheetSPS, 'E', fila);

        if (monto !== null && monto !== undefined) {
            const montoNum = parseFloat(monto);
            if (!isNaN(montoNum)) {
                if (montoNum < 0) {
                    sumaNegativos += montoNum;
                    devoluciones.push({ fila, monto: montoNum, concepto: String(concepto || '') });
                } else if (montoNum > 0) {
                    sumaPositivos += montoNum;
                }
            }
        }
    }

    console.log(`\n   Suma de POSITIVOS: $${sumaPositivos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Suma de NEGATIVOS: $${sumaNegativos.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   TOTAL NETO: $${(sumaPositivos + sumaNegativos).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Total esperado: $859,674.39`);
    console.log(`   Diferencia: $${((sumaPositivos + sumaNegativos) - 859674.39).toFixed(2)}`);

    if (devoluciones.length > 0) {
        console.log(`\n   🔴 DEVOLUCIONES ENCONTRADAS (${devoluciones.length}):`);
        devoluciones.forEach(d => {
            console.log(`      Fila ${d.fila}: $${d.monto.toLocaleString()} - "${d.concepto.substring(0, 60)}"`);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MATERIALES - Buscar montos negativos
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n\n' + '═'.repeat(70));
    console.log('📊 MATERIALES - MONTOS NEGATIVOS (DEVOLUCIONES):');

    const sheetMat = workbook.Sheets["MATERIALES"];
    let sumaPositivosMat = 0;
    let sumaNegativosMat = 0;
    const devolucionesMat = [];

    for (let fila = 7; fila <= 174; fila++) {
        const monto = getCellValue(sheetMat, 'J', fila);
        const concepto = getCellValue(sheetMat, 'E', fila);

        if (monto !== null && monto !== undefined) {
            const montoNum = parseFloat(monto);
            if (!isNaN(montoNum)) {
                if (montoNum < 0) {
                    sumaNegativosMat += montoNum;
                    devolucionesMat.push({ fila, monto: montoNum, concepto: String(concepto || '') });
                } else if (montoNum > 0) {
                    sumaPositivosMat += montoNum;
                }
            }
        }
    }

    console.log(`\n   Suma de POSITIVOS: $${sumaPositivosMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Suma de NEGATIVOS: $${sumaNegativosMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   TOTAL NETO: $${(sumaPositivosMat + sumaNegativosMat).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Total esperado: $477,883.94`);
    console.log(`   Diferencia: $${((sumaPositivosMat + sumaNegativosMat) - 477883.94).toFixed(2)}`);

    if (devolucionesMat.length > 0) {
        console.log(`\n   🔴 DEVOLUCIONES ENCONTRADAS (${devolucionesMat.length}):`);
        devolucionesMat.forEach(d => {
            console.log(`      Fila ${d.fila}: $${d.monto.toLocaleString()} - "${d.concepto.substring(0, 60)}"`);
        });
    }

    console.log('\n\n' + '═'.repeat(70));
    console.log('   📋 CONCLUSIÓN');
    console.log('═'.repeat(70));

    const totalNetoSPS = sumaPositivos + sumaNegativos;
    const totalNetoMat = sumaPositivosMat + sumaNegativosMat;

    if (Math.abs(totalNetoSPS - 859674.39) < 1) {
        console.log('\n   ✅ SP´S: ¡CUADRA PERFECTAMENTE! (incluyendo devoluciones)');
    } else {
        console.log(`\n   ❌ SP´S: Aún hay diferencia de $${(totalNetoSPS - 859674.39).toFixed(2)}`);
    }

    if (Math.abs(totalNetoMat - 477883.94) < 1) {
        console.log('   ✅ MATERIALES: ¡CUADRA PERFECTAMENTE! (incluyendo devoluciones)');
    } else {
        console.log(`   ❌ MATERIALES: Aún hay diferencia de $${(totalNetoMat - 477883.94).toFixed(2)}`);
    }

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
