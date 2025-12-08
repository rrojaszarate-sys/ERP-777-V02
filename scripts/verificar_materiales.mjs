import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function verificarMateriales() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     VERIFICANDO PESTAÑA MATERIALES - TODAS LAS FILAS CON DATOS');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets['MATERIALES'];

    let countTotal = 0;
    let countPagado = 0;
    let filaFinal = 0;
    let filasSinDatos = 0;

    for (let r = 7; r <= 300; r++) {
        const cellStatus = sheet['A' + r];
        const cellTotal = sheet['J' + r];
        const cellConcepto = sheet['E' + r];

        const status = cellStatus ? String(cellStatus.v || '').trim() : '';
        const total = cellTotal ? parseFloat(cellTotal.v) || 0 : 0;
        const concepto = cellConcepto ? String(cellConcepto.v || '').substring(0, 40) : '';

        if (total === 0) {
            filasSinDatos++;
            if (filasSinDatos >= 10) {
                console.log(`   Deteniendo en fila ${r} (10 filas sin datos)`);
                break;
            }
            continue;
        }

        filasSinDatos = 0;
        countTotal++;
        filaFinal = r;

        if (status.toUpperCase() === 'PAGADO') {
            countPagado++;
        }

        // Mostrar filas relevantes
        if (r <= 15 || r >= 140 || total < 0) {
            console.log(`   Fila ${r}: Status="${status}" | Total=$${total.toLocaleString()} | ${concepto}`);
        }
    }

    console.log(`\n   TOTAL filas con datos: ${countTotal}`);
    console.log(`   Filas con status PAGADO: ${countPagado}`);
    console.log(`   Última fila procesada: ${filaFinal}`);
    console.log(`\n   ESPERADO: 132 registros = $477,883.94`);
}

verificarMateriales();
