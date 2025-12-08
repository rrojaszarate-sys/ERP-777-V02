import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 VERIFICACIÓN EXACTA DE SUMAS');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);

    // SP's
    const sheetSPS = workbook.Sheets["SP´S"];

    console.log('\n📊 SP´S - Verificando SUM(H7:H137)');

    let sumaSPS = 0;
    let registrosSPS = 0;

    for (let fila = 7; fila <= 137; fila++) {
        const monto = getCellValue(sheetSPS, 'H', fila);
        if (monto && parseFloat(monto) > 0) {
            sumaSPS += parseFloat(monto);
            registrosSPS++;
        }
    }

    console.log(`   Suma calculada (filas 7-137): $${sumaSPS.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Registros con monto > 0: ${registrosSPS}`);
    console.log(`   Valor en fila 138 (TOTAL): $${getCellValue(sheetSPS, 'H', 138)}`);
    console.log(`   Diferencia: $${(sumaSPS - 859674.39).toFixed(2)}`);

    // Materiales  
    const sheetMat = workbook.Sheets["MATERIALES"];

    console.log('\n📊 MATERIALES - Verificando SUM(J7:J174)');

    let sumaMat = 0;
    let registrosMat = 0;

    for (let fila = 7; fila <= 174; fila++) {
        const monto = getCellValue(sheetMat, 'J', fila);
        if (monto && parseFloat(monto) > 0) {
            sumaMat += parseFloat(monto);
            registrosMat++;
        }
    }

    console.log(`   Suma calculada (filas 7-174): $${sumaMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Registros con monto > 0: ${registrosMat}`);
    console.log(`   Valor en fila 175 (TOTAL): $${getCellValue(sheetMat, 'J', 175)}`);
    console.log(`   Diferencia: $${(sumaMat - 477883.94).toFixed(2)}`);

    // Ahora verificar si hay filas DESPUÉS del rango que también tienen datos
    console.log('\n\n📊 VERIFICANDO FILAS FUERA DEL RANGO DE LA FÓRMULA');

    console.log('\n   SP´S - Filas después de 137:');
    for (let fila = 138; fila <= 145; fila++) {
        const monto = getCellValue(sheetSPS, 'H', fila);
        const concepto = getCellValue(sheetSPS, 'E', fila);
        const status = getCellValue(sheetSPS, 'A', fila);
        if (monto) {
            console.log(`      Fila ${fila}: [${status}] $${monto} - "${concepto || ''}"`);
        }
    }

    console.log('\n   MATERIALES - Filas después de 174:');
    for (let fila = 175; fila <= 180; fila++) {
        const monto = getCellValue(sheetMat, 'J', fila);
        const concepto = getCellValue(sheetMat, 'E', fila);
        const status = getCellValue(sheetMat, 'A', fila);
        if (monto) {
            console.log(`      Fila ${fila}: [${status}] $${monto} - "${concepto || ''}"`);
        }
    }

    console.log('\n\n' + '═'.repeat(70));
    console.log('   📋 CONCLUSIÓN FINAL');
    console.log('═'.repeat(70));

    if (Math.abs(sumaSPS - 859674.39) < 1) {
        console.log('\n   ✅ SP´S: La suma de H7:H137 COINCIDE con el total del Excel');
    } else {
        console.log(`\n   ❌ SP´S: Diferencia de $${(sumaSPS - 859674.39).toFixed(2)}`);
        console.log('      El script está leyendo filas adicionales fuera del rango');
    }

    if (Math.abs(sumaMat - 477883.94) < 1) {
        console.log('   ✅ MATERIALES: La suma de J7:J174 COINCIDE con el total del Excel');
    } else {
        console.log(`   ❌ MATERIALES: Diferencia de $${(sumaMat - 477883.94).toFixed(2)}`);
        console.log('      El script está leyendo filas adicionales fuera del rango');
    }

    console.log('\n✅ Verificación completada');
}

main().catch(console.error);
