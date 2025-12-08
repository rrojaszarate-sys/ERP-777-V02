import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function analizarExcel() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     ANÁLISIS DEL EXCEL ORIGINAL: ESTRUCTURA DE IVA');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const workbook = XLSX.readFile(EXCEL_PATH);
    console.log('📂 Hojas en el Excel:', workbook.SheetNames.join(', '));
    console.log('');

    // Analizar cada pestaña relevante
    const pestanas = ["SP´S", "COMBUSTIBLE  PEAJE", "RH", "MATERIALES", "PROVISIONES"];

    pestanas.forEach(nombrePestana => {
        const sheet = workbook.Sheets[nombrePestana];
        if (!sheet) {
            console.log(`\n⚠️  Pestaña "${nombrePestana}" no encontrada`);
            return;
        }

        console.log(`\n═══════════════════════════════════════════════════════════════════`);
        console.log(`📋 PESTAÑA: ${nombrePestana}`);
        console.log(`═══════════════════════════════════════════════════════════════════`);

        // Obtener rango de la hoja
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

        // Ver las primeras filas para entender la estructura
        console.log('\n   ENCABEZADOS (primeras 6 filas):');
        for (let r = 0; r <= Math.min(6, range.e.r); r++) {
            let fila = `   Fila ${r + 1}: `;
            for (let c = 0; c <= Math.min(15, range.e.c); c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = sheet[addr];
                if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
                    const col = String.fromCharCode(65 + c);
                    fila += `${col}="${String(cell.v).substring(0, 15)}" `;
                }
            }
            if (fila.length > 15) console.log(fila);
        }

        // Buscar columnas de IVA, Subtotal, Total
        console.log('\n   ANÁLISIS DE COLUMNAS:');
        const headers = {};
        for (let r = 0; r <= 10; r++) {
            for (let c = 0; c <= 20; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = sheet[addr];
                if (cell && cell.v) {
                    const val = String(cell.v).toUpperCase().trim();
                    if (val.includes('IVA') || val.includes('SUBTOTAL') || val.includes('TOTAL') ||
                        val.includes('MONTO') || val.includes('IMPORTE') || val.includes('PRECIO')) {
                        const col = String.fromCharCode(65 + c);
                        console.log(`      Fila ${r + 1}, Col ${col}: "${cell.v}"`);
                        headers[col] = { row: r + 1, name: val };
                    }
                }
            }
        }

        // Mostrar algunas filas de datos
        console.log('\n   MUESTRA DE DATOS (primeros 5 registros con valores):');
        let datosEncontrados = 0;
        for (let r = 6; r <= range.e.r && datosEncontrados < 5; r++) {
            // Buscar una fila con datos numéricos
            let tieneNumero = false;
            let filaData = {};

            for (let c = 0; c <= Math.min(12, range.e.c); c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = sheet[addr];
                if (cell && cell.v !== undefined) {
                    const col = String.fromCharCode(65 + c);
                    filaData[col] = cell.v;
                    if (typeof cell.v === 'number' && cell.v > 100) tieneNumero = true;
                }
            }

            if (tieneNumero) {
                datosEncontrados++;
                console.log(`      Fila ${r + 1}:`, JSON.stringify(filaData));
            }
        }
    });

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('   CONCLUSIONES:');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('   Revisa si el Excel tiene columnas separadas para:');
    console.log('   - SUBTOTAL (monto sin IVA)');
    console.log('   - IVA (16%)');
    console.log('   - TOTAL (monto con IVA)');
    console.log('');
    console.log('   O si solo tiene UNA columna de monto (que puede ser subtotal o total)');
    console.log('═══════════════════════════════════════════════════════════════════\n');
}

analizarExcel();
