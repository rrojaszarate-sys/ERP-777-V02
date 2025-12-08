import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 ANÁLISIS FILA POR FILA: RESUMEN CIERRE INTERNO');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets["RESUMEN CIERRE INTERNO"];

    // Buscar dónde están las fórmulas del resumen
    console.log('\n📊 Buscando fórmulas y valores del resumen...\n');

    // Revisar columnas típicas donde estaría el resumen (siguiendo la imagen)
    // La imagen muestra que el resumen tiene: Sub-Total, IVA, Total, Porcentaje
    // Las categorías son: SP's, Combustible, RH, Materiales, Provisiones

    const columnas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

    console.log('Buscando celdas con valores numéricos grandes (posibles totales):\n');

    for (let fila = 1; fila <= 60; fila++) {
        let filaTieneDatos = false;
        let lineaOutput = `Fila ${String(fila).padStart(2)}: `;

        for (const col of columnas) {
            const valor = getCellValue(sheet, col, fila);
            if (valor !== null && valor !== undefined) {
                // Buscar números significativos
                if (typeof valor === 'number' && valor > 10000) {
                    lineaOutput += `${col}=${valor.toLocaleString()} | `;
                    filaTieneDatos = true;
                } else if (typeof valor === 'string' && (
                    valor.includes('TOTAL') ||
                    valor.includes('SP') ||
                    valor.includes('COMBUSTIBLE') ||
                    valor.includes('RH') ||
                    valor.includes('MATERIALES') ||
                    valor.includes('PROVISIONES') ||
                    valor.includes('RESUMEN')
                )) {
                    lineaOutput += `${col}="${valor}" | `;
                    filaTieneDatos = true;
                }
            }
        }

        if (filaTieneDatos) {
            console.log(lineaOutput);
        }
    }

    // Ahora vamos a leer específicamente las celdas del RESUMEN EGRESOS según la imagen
    console.log('\n\n' + '═'.repeat(70));
    console.log('   📋 LECTURA DIRECTA DE CELDAS DEL RESUMEN');
    console.log('═'.repeat(70));

    // Según la imagen, el RESUMEN EGRESOS está en:
    // Fila con SP's subtotal $826,051.73
    // Fila con Combustible subtotal $26,427.59
    // etc.

    // Buscar en varias filas para encontrar los valores correctos
    for (let fila = 26; fila <= 40; fila++) {
        const a = getCellValue(sheet, 'A', fila);
        const b = getCellValue(sheet, 'B', fila);
        const c = getCellValue(sheet, 'C', fila);
        const d = getCellValue(sheet, 'D', fila);
        const e = getCellValue(sheet, 'E', fila);

        if (a || b || c || d || e) {
            console.log(`Fila ${fila}: A=${a} | B=${b} | C=${c} | D=${d} | E=${e}`);
        }
    }

    // Leer el rango completo del resumen de egresos
    console.log('\n\n📊 LEYENDO ESTRUCTURA COMPLETA DE RESUMEN EGRESOS:');

    // Leer toda la hoja para entender la estructura
    const range = XLSX.utils.decode_range(sheet['!ref']);
    console.log(`Rango de la hoja: ${sheet['!ref']}`);
    console.log(`Filas: ${range.s.r + 1} a ${range.e.r + 1}, Columnas: ${range.s.c + 1} a ${range.e.c + 1}`);

    // Imprimir las primeras 50 filas con todos los valores
    console.log('\n\n=== CONTENIDO COMPLETO FILAS 20-45 ===\n');
    for (let r = 20; r <= 45; r++) {
        let rowData = `Fila ${String(r).padStart(2)}: `;
        for (let c = 0; c <= 10; c++) {
            const addr = XLSX.utils.encode_cell({ r: r - 1, c: c });
            const cell = sheet[addr];
            if (cell && cell.v !== undefined) {
                const val = typeof cell.v === 'number' ? cell.v.toFixed(2) : cell.v;
                rowData += `[${String.fromCharCode(65 + c)}]=${val} | `;
            }
        }
        console.log(rowData);
    }

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
