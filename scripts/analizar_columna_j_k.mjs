import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 ANÁLISIS DE COLUMNAS J (SP S) y K (FLUJO)');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets["SP´S"];

    // Leer encabezados
    console.log('\n📋 Encabezados fila 6:');
    for (let col = 0; col <= 12; col++) {
        const letra = String.fromCharCode(65 + col);
        const val = getCellValue(sheet, letra, 6);
        if (val) console.log(`   ${letra}: ${val}`);
    }

    // Analizar cada fila
    console.log('\n\n📊 ANÁLISIS DE FILAS CON VALORES EN COLUMNA J o K:');

    let sumaConJ = 0;
    let sumaSinJ = 0;
    let sumaConK = 0;
    let sumaSinK = 0;

    const filasConJ = [];
    const filasSinJ = [];

    for (let fila = 7; fila <= 137; fila++) {
        const monto = getCellValue(sheet, 'H', fila);
        const concepto = getCellValue(sheet, 'E', fila);
        const colJ = getCellValue(sheet, 'J', fila);
        const colK = getCellValue(sheet, 'K', fila);

        if (monto && parseFloat(monto) > 0) {
            const montoNum = parseFloat(monto);

            // Análisis columna J
            if (colJ !== null && colJ !== undefined && String(colJ).trim() !== '') {
                sumaConJ += montoNum;
                filasConJ.push({ fila, monto: montoNum, concepto: String(concepto || '').substring(0, 40), colJ, colK });
            } else {
                sumaSinJ += montoNum;
                filasSinJ.push({ fila, monto: montoNum, concepto: String(concepto || '').substring(0, 40), colJ, colK });
            }

            // Análisis columna K
            if (colK !== null && colK !== undefined && String(colK).trim() !== '') {
                sumaConK += montoNum;
            } else {
                sumaSinK += montoNum;
            }
        }
    }

    console.log('\n   RESUMEN POR COLUMNA J (SP S):');
    console.log(`   ├── Filas CON valor en J: ${filasConJ.length} → Suma: $${sumaConJ.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   └── Filas SIN valor en J: ${filasSinJ.length} → Suma: $${sumaSinJ.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    console.log('\n   RESUMEN POR COLUMNA K (FLUJO):');
    console.log(`   ├── Filas CON valor en K: → Suma: $${sumaConK.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   └── Filas SIN valor en K: → Suma: $${sumaSinK.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    // Comparar con el total esperado
    const totalEsperado = 859674.39;
    console.log('\n\n   📊 COMPARACIÓN CON TOTAL DEL RESUMEN ($859,674.39):');
    console.log(`   Suma SIN columna J: $${sumaSinJ.toFixed(2)} → Diferencia: $${(sumaSinJ - totalEsperado).toFixed(2)}`);
    console.log(`   Suma CON columna J: $${sumaConJ.toFixed(2)} → Diferencia: $${(sumaConJ - totalEsperado).toFixed(2)}`);
    console.log(`   Suma SIN columna K: $${sumaSinK.toFixed(2)} → Diferencia: $${(sumaSinK - totalEsperado).toFixed(2)}`);
    console.log(`   Suma CON columna K: $${sumaConK.toFixed(2)} → Diferencia: $${(sumaConK - totalEsperado).toFixed(2)}`);

    // Mostrar las filas CON valor en J (posibles excluidas)
    if (filasConJ.length > 0 && filasConJ.length <= 20) {
        console.log('\n\n   🔸 FILAS CON VALOR EN COLUMNA J (posibles excluidas):');
        filasConJ.forEach(f => {
            console.log(`      Fila ${f.fila}: $${f.monto.toLocaleString()} | J="${f.colJ}" | K="${f.colK || ''}" | "${f.concepto}"`);
        });
    }

    // Verificar valores únicos en columna J
    console.log('\n\n   📋 VALORES ÚNICOS EN COLUMNA J:');
    const valoresJ = new Map();
    for (let fila = 7; fila <= 137; fila++) {
        const colJ = getCellValue(sheet, 'J', fila);
        const monto = getCellValue(sheet, 'H', fila);
        if (colJ !== null && colJ !== undefined && String(colJ).trim() !== '' && monto > 0) {
            const key = String(colJ).trim();
            if (!valoresJ.has(key)) {
                valoresJ.set(key, { count: 0, suma: 0 });
            }
            valoresJ.get(key).count++;
            valoresJ.get(key).suma += parseFloat(monto);
        }
    }

    valoresJ.forEach((val, key) => {
        console.log(`      "${key}": ${val.count} registros = $${val.suma.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    });

    // Verificar valores únicos en columna K
    console.log('\n\n   📋 VALORES ÚNICOS EN COLUMNA K:');
    const valoresK = new Map();
    for (let fila = 7; fila <= 137; fila++) {
        const colK = getCellValue(sheet, 'K', fila);
        const monto = getCellValue(sheet, 'H', fila);
        if (colK !== null && colK !== undefined && String(colK).trim() !== '' && monto > 0) {
            const key = String(colK).trim();
            if (!valoresK.has(key)) {
                valoresK.set(key, { count: 0, suma: 0 });
            }
            valoresK.get(key).count++;
            valoresK.get(key).suma += parseFloat(monto);
        }
    }

    valoresK.forEach((val, key) => {
        console.log(`      "${key}": ${val.count} registros = $${val.suma.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    });

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
