import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function analizarMateriales() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     ANÁLISIS DETALLADO: PESTAÑA MATERIALES');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets['MATERIALES'];

    if (!sheet) {
        console.log('❌ Pestaña MATERIALES no encontrada');
        return;
    }

    // Ver encabezados
    console.log('📋 ENCABEZADOS (fila 6):');
    for (let c = 0; c <= 15; c++) {
        const addr = XLSX.utils.encode_cell({ r: 5, c }); // Fila 6 es índice 5
        const cell = sheet[addr];
        if (cell && cell.v) {
            const col = String.fromCharCode(65 + c);
            console.log(`   Col ${col}: "${cell.v}"`);
        }
    }

    // Sumar TODOS los valores de la columna J (Monto a Pagar)
    console.log('\n📊 SUMANDO COLUMNA J (Monto a Pagar) - TODAS LAS FILAS:');
    let sumaTotal = 0;
    let sumaSubtotal = 0;
    let sumaIva = 0;
    let registros = 0;

    for (let r = 6; r <= 500; r++) { // Empezar desde fila 7 (índice 6)
        const cellJ = sheet['J' + r];
        const cellH = sheet['H' + r];
        const cellI = sheet['I' + r];
        const cellE = sheet['E' + r]; // Concepto

        const total = cellJ ? parseFloat(cellJ.v) || 0 : 0;
        const subtotal = cellH ? parseFloat(cellH.v) || 0 : 0;
        const iva = cellI ? parseFloat(cellI.v) || 0 : 0;
        const concepto = cellE ? String(cellE.v) : '';

        if (total > 0) {
            registros++;
            sumaTotal += total;
            sumaSubtotal += subtotal;
            sumaIva += iva;

            if (registros <= 10 || r > 200) {
                console.log(`   Fila ${r}: ${concepto?.substring(0, 30)} | Sub: $${subtotal.toLocaleString()} | IVA: $${iva.toLocaleString()} | Total: $${total.toLocaleString()}`);
            }
        }
    }

    console.log(`\n   ... (mostrando primeras 10 filas)`);
    console.log(`\n   ═══════════════════════════════════════`);
    console.log(`   TOTAL en Excel (Col J): ${registros} registros`);
    console.log(`   Suma Subtotal (Col H): $${sumaSubtotal.toLocaleString()}`);
    console.log(`   Suma IVA (Col I): $${sumaIva.toLocaleString()}`);
    console.log(`   Suma Total (Col J): $${sumaTotal.toLocaleString()}`);

    console.log(`\n   ESPERADO según imagen:`);
    console.log(`   Subtotal: $411,968.91`);
    console.log(`   IVA: $65,915.03`);
    console.log(`   Total: $477,883.94`);

    const diffTotal = sumaTotal - 477883.94;
    console.log(`\n   Diferencia Total: $${diffTotal.toLocaleString()}`);

    // Buscar filas problemáticas
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('🔍 BUSCANDO FILAS CON VALORES EN OTRAS COLUMNAS:');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // La pestaña MATERIALES puede tener la estructura diferente
    // Revisemos si hay valores en columnas L, M, N, etc.
    for (let r = 1; r <= 10; r++) {
        console.log(`Fila ${r}:`);
        for (let c = 0; c <= 15; c++) {
            const addr = XLSX.utils.encode_cell({ r: r - 1, c });
            const cell = sheet[addr];
            if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
                const col = String.fromCharCode(65 + c);
                console.log(`   ${col}: ${String(cell.v).substring(0, 40)}`);
            }
        }
        console.log('');
    }
}

analizarMateriales();
