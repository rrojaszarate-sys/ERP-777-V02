import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function buscarRetornos() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     BUSCANDO RETORNOS Y DEVOLUCIONES (VALORES NEGATIVOS)');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const workbook = XLSX.readFile(EXCEL_PATH);

    const pestanas = ["SP´S", "COMBUSTIBLE  PEAJE", "RH", "MATERIALES"];

    for (const nombrePestana of pestanas) {
        const sheet = workbook.Sheets[nombrePestana];
        if (!sheet) continue;

        console.log(`\n📋 ${nombrePestana}:`);

        let sumaPositivos = 0;
        let sumaNegativos = 0;
        let countPos = 0;
        let countNeg = 0;

        // Determinar columna de total según pestaña
        const colTotal = nombrePestana === 'MATERIALES' ? 'J' : 'H';
        const colConcepto = 'E';

        for (let r = 7; r <= 500; r++) {
            const cellTotal = sheet[colTotal + r];
            const cellConcepto = sheet[colConcepto + r];

            if (cellTotal && cellTotal.v !== undefined) {
                const valor = parseFloat(cellTotal.v) || 0;
                const concepto = cellConcepto ? String(cellConcepto.v) : '';

                if (valor < 0) {
                    countNeg++;
                    sumaNegativos += valor;
                    console.log(`   🔴 Fila ${r}: ${concepto?.substring(0, 50)} = $${valor.toLocaleString()}`);
                } else if (valor > 0) {
                    countPos++;
                    sumaPositivos += valor;
                }
            }
        }

        console.log(`\n   Positivos: ${countPos} registros = $${sumaPositivos.toLocaleString()}`);
        console.log(`   Negativos: ${countNeg} registros = $${sumaNegativos.toLocaleString()}`);
        console.log(`   NETO: $${(sumaPositivos + sumaNegativos).toLocaleString()}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════\n');
}

buscarRetornos();
