import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function analizarPorStatus() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     ANÁLISIS POR STATUS (PAGADO vs OTROS)');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const workbook = XLSX.readFile(EXCEL_PATH);

    const pestanas = [
        { nombre: "SP´S", colTotal: 'H', colSubtotal: 'F', colIva: 'G', esperado: 859674.39 },
        { nombre: "COMBUSTIBLE  PEAJE", colTotal: 'H', colSubtotal: 'F', colIva: 'G', esperado: 30350.78 },
        { nombre: "RH", colTotal: 'H', colSubtotal: 'F', colIva: 'G', esperado: 40552.09 },
        { nombre: "MATERIALES", colTotal: 'J', colSubtotal: 'H', colIva: 'I', esperado: 477883.94 }
    ];

    for (const config of pestanas) {
        const sheet = workbook.Sheets[config.nombre];
        if (!sheet) continue;

        console.log(`\n📋 ${config.nombre} (esperado: $${config.esperado.toLocaleString()}):`);

        const porStatus = {};

        for (let r = 7; r <= 500; r++) {
            const cellStatus = sheet['A' + r];
            const cellTotal = sheet[config.colTotal + r];
            const cellSubtotal = sheet[config.colSubtotal + r];
            const cellIva = sheet[config.colIva + r];

            if (cellTotal && cellTotal.v !== undefined && cellTotal.v !== null) {
                const total = parseFloat(cellTotal.v) || 0;
                const subtotal = parseFloat(cellSubtotal?.v) || 0;
                const iva = parseFloat(cellIva?.v) || 0;

                if (total !== 0) {
                    const status = cellStatus ? String(cellStatus.v).toUpperCase().trim() : 'SIN_STATUS';

                    if (!porStatus[status]) {
                        porStatus[status] = { count: 0, total: 0, subtotal: 0, iva: 0 };
                    }
                    porStatus[status].count++;
                    porStatus[status].total += total;
                    porStatus[status].subtotal += subtotal;
                    porStatus[status].iva += iva;
                }
            }
        }

        let sumaTotal = 0;
        Object.keys(porStatus).forEach(status => {
            const s = porStatus[status];
            console.log(`   ${status}: ${s.count} registros`);
            console.log(`      Total: $${s.total.toLocaleString()} | Subtotal: $${s.subtotal.toLocaleString()} | IVA: $${s.iva.toLocaleString()}`);
            sumaTotal += s.total;
        });

        console.log(`\n   SUMA TOTAL: $${sumaTotal.toLocaleString()}`);
        console.log(`   ESPERADO:   $${config.esperado.toLocaleString()}`);
        console.log(`   DIFERENCIA: $${(sumaTotal - config.esperado).toLocaleString()}`);

        // Ver si solo PAGADO coincide
        if (porStatus['PAGADO']) {
            console.log(`\n   Solo PAGADO: $${porStatus['PAGADO'].total.toLocaleString()}`);
            console.log(`   ¿Coincide? ${Math.abs(porStatus['PAGADO'].total - config.esperado) < 1 ? '✅ SÍ' : '❌ NO'}`);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════════\n');
}

analizarPorStatus();
