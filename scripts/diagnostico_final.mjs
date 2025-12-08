import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 DIAGNÓSTICO FINAL - RECÁLCULO FORZADO');
    console.log('═'.repeat(70));

    // Leer sin forzar recálculo
    const workbook1 = XLSX.readFile(EXCEL_PATH);
    const sheet1 = workbook1.Sheets["SP´S"];

    console.log('\n📊 LECTURA ESTÁNDAR:');

    // Ver exactamente qué hay en H138
    const cellH138 = sheet1['H138'];
    console.log('\n   Celda H138 (TOTAL SP´S):');
    console.log('      Tipo (t):', cellH138?.t);
    console.log('      Valor (v):', cellH138?.v);
    console.log('      Fórmula (f):', cellH138?.f);
    console.log('      Valor crudo (w):', cellH138?.w);
    console.log('      Toda la celda:', JSON.stringify(cellH138, null, 2));

    // Verificar también F138 (subtotal)
    const cellF138 = sheet1['F138'];
    console.log('\n   Celda F138 (SUBTOTAL SP´S):');
    console.log('      Valor (v):', cellF138?.v);
    console.log('      Fórmula (f):', cellF138?.f);

    // Ahora vamos a calcular manualmente la suma de H7:H137
    console.log('\n\n📊 CÁLCULO MANUAL CELDA POR CELDA:');

    let suma = 0;
    const detalles = [];

    for (let fila = 7; fila <= 137; fila++) {
        const cell = sheet1['H' + fila];
        if (cell && cell.v !== undefined && cell.v !== null) {
            const val = Number(cell.v);
            if (!isNaN(val) && val > 0) {
                suma += val;
                if (val > 10000) {
                    detalles.push({ fila, valor: val, concepto: sheet1['E' + fila]?.v || '' });
                }
            }
        }
    }

    console.log(`\n   Suma manual H7:H137: $${suma.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Valor de la fórmula: $${cellH138?.v?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Diferencia: $${(suma - (cellH138?.v || 0)).toFixed(2)}`);

    // Mostrar los registros mayores a $10,000
    console.log('\n   Registros > $10,000:');
    detalles.forEach(d => {
        console.log(`      Fila ${d.fila}: $${d.valor.toLocaleString()} - "${d.concepto?.substring(0, 40)}"`);
    });

    // Ver si hay alguna fila problemática
    console.log('\n\n📊 BUSCANDO FILA EXACTA DE $35,999:');

    // Buscar fila con valor exacto
    for (let fila = 7; fila <= 137; fila++) {
        const cell = sheet1['H' + fila];
        if (cell && Math.abs(Number(cell.v) - 35999) < 100) {
            console.log(`   Fila ${fila}: $${cell.v}`);
        }
    }

    // Hacer la misma verificación con MATERIALES
    const sheetMat = workbook1.Sheets["MATERIALES"];
    const cellJ175 = sheetMat['J175'];

    console.log('\n\n' + '═'.repeat(70));
    console.log('📊 MATERIALES:');
    console.log('\n   Celda J175 (TOTAL MATERIALES):');
    console.log('      Valor (v):', cellJ175?.v);
    console.log('      Fórmula (f):', cellJ175?.f);

    let sumaMat = 0;
    for (let fila = 7; fila <= 174; fila++) {
        const cell = sheetMat['J' + fila];
        if (cell && cell.v !== undefined && cell.v !== null) {
            const val = Number(cell.v);
            if (!isNaN(val) && val > 0) {
                sumaMat += val;
            }
        }
    }

    console.log(`\n   Suma manual J7:J174: $${sumaMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Valor de la fórmula: $${cellJ175?.v?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Diferencia: $${(sumaMat - (cellJ175?.v || 0)).toFixed(2)}`);

    console.log('\n\n' + '═'.repeat(70));
    console.log('   💡 CONCLUSIÓN');
    console.log('═'.repeat(70));
    console.log(`
   El archivo Excel tiene valores en cache que DIFIEREN de lo que
   calcula la biblioteca XLSX al leer las celdas.
   
   Esto puede suceder porque:
   1. El Excel no fue guardado después del último recálculo
   2. Hay fórmulas circulares o dependencias no resueltas
   3. El Excel usa funciones que XLSX no recalcula (ej. SUMIFS)
   
   SOLUCIÓN: 
   Importar usando los VALORES DE LA FÓRMULA (celdas de TOTAL)
   en lugar de sumar fila por fila.
`);

    console.log('\n✅ Diagnóstico completado');
}

main().catch(console.error);
