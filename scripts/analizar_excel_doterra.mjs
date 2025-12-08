import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

function analizarHoja(workbook, nombreHoja, config) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 ANALIZANDO: ${nombreHoja}`);
    console.log(`${'═'.repeat(60)}`);

    const sheet = workbook.Sheets[nombreHoja];
    if (!sheet) {
        console.log('   ⚠️ Hoja no encontrada');
        return { registros: 0, total: 0, filas: [] };
    }

    let fila = config.filaInicio;
    let filasSinDatos = 0;
    let sumaTotal = 0;
    let registros = 0;
    const filasDetalle = [];
    const filasTotales = [];

    while (fila < 500 && filasSinDatos < 15) {
        const monto = getCellValue(sheet, config.colMonto, fila);
        const concepto = getCellValue(sheet, config.colConcepto, fila);
        const proveedor = getCellValue(sheet, config.colProveedor, fila);
        const status = config.colStatus ? getCellValue(sheet, config.colStatus, fila) : '';

        if (monto === null || monto === undefined) {
            filasSinDatos++;
            fila++;
            continue;
        }

        filasSinDatos = 0;
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            fila++;
            continue;
        }

        const texto = String(concepto || '') + String(proveedor || '') + String(status || '');
        const esTotal = texto.toUpperCase().includes('TOTAL') ||
            texto.toUpperCase().includes('SUMA') ||
            texto.toUpperCase().includes('RESUMEN');

        const filaInfo = {
            fila,
            monto: montoNum,
            concepto: String(concepto || proveedor || '').substring(0, 50),
            esTotal
        };

        if (esTotal) {
            filasTotales.push(filaInfo);
            console.log(`   🔴 FILA ${fila} [TOTAL]: $${montoNum.toLocaleString()} - "${filaInfo.concepto}"`);
        } else {
            filasDetalle.push(filaInfo);
            sumaTotal += montoNum;
            registros++;
        }

        fila++;
    }

    console.log(`\n   📈 RESUMEN ${nombreHoja}:`);
    console.log(`      Registros válidos: ${registros}`);
    console.log(`      Suma calculada: $${sumaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`      Filas de TOTAL detectadas: ${filasTotales.length}`);

    if (filasTotales.length > 0) {
        filasTotales.forEach(ft => {
            console.log(`         → Fila ${ft.fila}: $${ft.monto.toLocaleString()} "${ft.concepto}"`);
        });
    }

    return { registros, total: sumaTotal, filasTotales };
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 ANÁLISIS DETALLADO DEL EXCEL DOTERRA 2025');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);
    console.log('\n📂 Hojas disponibles:', workbook.SheetNames);

    // Configuración de cada pestaña según la estructura del Excel
    const resultados = {};

    // SP's
    resultados.sps = analizarHoja(workbook, "SP´S", {
        filaInicio: 7,
        colMonto: 'H',
        colConcepto: 'E',
        colProveedor: 'D',
        colStatus: 'A'
    });

    // Combustible
    resultados.combustible = analizarHoja(workbook, "COMBUSTIBLE  PEAJE", {
        filaInicio: 7,
        colMonto: 'H',
        colConcepto: 'E',
        colProveedor: 'D',
        colStatus: 'A'
    });

    // RH
    resultados.rh = analizarHoja(workbook, "RH", {
        filaInicio: 7,
        colMonto: 'H',
        colConcepto: 'E',
        colProveedor: 'D',
        colStatus: 'A'
    });

    // MATERIALES - Columna J para monto
    resultados.materiales = analizarHoja(workbook, "MATERIALES", {
        filaInicio: 7,
        colMonto: 'J',
        colConcepto: 'E',
        colProveedor: 'D',
        colStatus: 'A'
    });

    // PROVISIONES
    resultados.provisiones = analizarHoja(workbook, "PROVISIONES", {
        filaInicio: 9,
        colMonto: 'E',
        colConcepto: 'B',
        colProveedor: 'A',
        colStatus: null
    });

    // RESUMEN FINAL
    console.log('\n' + '═'.repeat(70));
    console.log('   📊 RESUMEN COMPARATIVO FINAL');
    console.log('═'.repeat(70));

    const esperados = {
        sps: 859674.39,
        combustible: 30350.78,
        rh: 40552.09,
        materiales: 477883.94,
        provisiones: 1500970.64
    };

    console.log('\n| Categoría      | Esperado (Excel) | Calculado      | Diferencia    | Estado |');
    console.log('|----------------|------------------|----------------|---------------|--------|');

    let totalEsperado = 0;
    let totalCalculado = 0;

    for (const [key, esperado] of Object.entries(esperados)) {
        const calculado = resultados[key]?.total || 0;
        const diff = calculado - esperado;
        const estado = Math.abs(diff) < 1 ? '✅' : '❌';
        totalEsperado += esperado;
        totalCalculado += calculado;

        console.log(`| ${key.padEnd(14)} | $${esperado.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(14)} | $${calculado.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)} | $${diff.toFixed(2).padStart(11)} | ${estado}     |`);
    }

    console.log('|----------------|------------------|----------------|---------------|--------|');
    console.log(`| TOTAL          | $${totalEsperado.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(14)} | $${totalCalculado.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)} | $${(totalCalculado - totalEsperado).toFixed(2).padStart(11)} |        |`);

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
