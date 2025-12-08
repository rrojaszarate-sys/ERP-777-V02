import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 ANÁLISIS COMPLETO DE SP´S - FILA POR FILA');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetSPS = workbook.Sheets["SP´S"];

    // Total esperado según el resumen
    const totalEsperado = 859674.39;

    let sumaTotal = 0;
    let registros = 0;
    const filas = [];

    // Leer todas las filas
    for (let fila = 7; fila < 138; fila++) {
        const monto = getCellValue(sheetSPS, 'H', fila);
        const concepto = getCellValue(sheetSPS, 'E', fila);
        const proveedor = getCellValue(sheetSPS, 'D', fila);
        const status = getCellValue(sheetSPS, 'A', fila);
        const subtotal = getCellValue(sheetSPS, 'F', fila);

        if (monto && parseFloat(monto) > 0) {
            const montoNum = parseFloat(monto);

            filas.push({
                fila,
                monto: montoNum,
                subtotal: parseFloat(subtotal) || 0,
                concepto: String(concepto || '').substring(0, 50),
                status: String(status || ''),
                proveedor: String(proveedor || '').substring(0, 30)
            });

            sumaTotal += montoNum;
            registros++;
        }
    }

    console.log(`\n   Total de registros encontrados: ${registros}`);
    console.log(`   Suma de montos: $${sumaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Total esperado: $${totalEsperado.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Diferencia: $${(sumaTotal - totalEsperado).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    // Buscar las filas que causan la diferencia de ~$35,999
    const diferencia = sumaTotal - totalEsperado;
    console.log(`\n\n   🔎 Buscando combinaciones de filas que sumen ~$${diferencia.toFixed(2)}`);

    // Primero buscar filas individuales cercanas a la diferencia
    console.log('\n   Filas individuales cercanas a la diferencia:');
    filas.filter(f => Math.abs(f.monto - diferencia) < 1000).forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto.toLocaleString()} - "${f.concepto}"`);
    });

    // Buscar pares de filas que sumen la diferencia
    console.log('\n   Pares de filas que sumen ~$35,999:');
    for (let i = 0; i < filas.length; i++) {
        for (let j = i + 1; j < filas.length; j++) {
            const suma = filas[i].monto + filas[j].monto;
            if (Math.abs(suma - diferencia) < 100) {
                console.log(`      Filas ${filas[i].fila} + ${filas[j].fila}: $${filas[i].monto.toLocaleString()} + $${filas[j].monto.toLocaleString()} = $${suma.toLocaleString()}`);
                console.log(`         → "${filas[i].concepto}"`);
                console.log(`         → "${filas[j].concepto}"`);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ANALIZAR MATERIALES
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n\n' + '═'.repeat(70));
    console.log('   🔍 ANÁLISIS COMPLETO DE MATERIALES - FILA POR FILA');
    console.log('═'.repeat(70));

    const sheetMat = workbook.Sheets["MATERIALES"];
    const totalEsperadoMat = 477883.94;

    let sumaTotalMat = 0;
    let registrosMat = 0;
    const filasMat = [];

    for (let fila = 7; fila < 175; fila++) {
        const monto = getCellValue(sheetMat, 'J', fila);
        const concepto = getCellValue(sheetMat, 'E', fila);
        const proveedor = getCellValue(sheetMat, 'D', fila);
        const status = getCellValue(sheetMat, 'A', fila);
        const subtotal = getCellValue(sheetMat, 'H', fila);

        if (monto && parseFloat(monto) > 0) {
            const montoNum = parseFloat(monto);

            filasMat.push({
                fila,
                monto: montoNum,
                subtotal: parseFloat(subtotal) || 0,
                concepto: String(concepto || '').substring(0, 50),
                status: String(status || ''),
                proveedor: String(proveedor || '').substring(0, 30)
            });

            sumaTotalMat += montoNum;
            registrosMat++;
        }
    }

    const diferenciaMat = sumaTotalMat - totalEsperadoMat;

    console.log(`\n   Total de registros encontrados: ${registrosMat}`);
    console.log(`   Suma de montos: $${sumaTotalMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Total esperado: $${totalEsperadoMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Diferencia: $${diferenciaMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    console.log('\n   🔎 Filas individuales cercanas a la diferencia de $6,047.66:');
    filasMat.filter(f => Math.abs(f.monto - diferenciaMat) < 500).forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto.toLocaleString()} - "${f.concepto}" [${f.status}]`);
    });

    // Verificar fila 138 de SP's para entender la fórmula
    console.log('\n\n' + '═'.repeat(70));
    console.log('   📋 ANALIZANDO FILA TOTAL DE SP´S (138)');
    console.log('═'.repeat(70));

    console.log('\n   Contenido fila 138 SP´S:');
    for (let col = 0; col <= 10; col++) {
        const letra = String.fromCharCode(65 + col);
        const cell = sheetSPS[letra + '138'];
        if (cell) {
            console.log(`      ${letra}: valor=${cell.v}, formula=${cell.f || 'N/A'}`);
        }
    }

    console.log('\n   Contenido fila 175 MATERIALES:');
    for (let col = 0; col <= 12; col++) {
        const letra = String.fromCharCode(65 + col);
        const cell = sheetMat[letra + '175'];
        if (cell) {
            console.log(`      ${letra}: valor=${cell.v}, formula=${cell.f || 'N/A'}`);
        }
    }

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
