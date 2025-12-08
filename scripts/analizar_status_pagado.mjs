import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 ANÁLISIS PROFUNDO: SP´S Y MATERIALES');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);

    // ═══════════════════════════════════════════════════════════════════════
    // SP's: Diferencia de $35,999 ($895,673 importado vs $859,674 esperado)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n\n📊 SP´S: Buscando $35,999 de diferencia');
    console.log('   (Importado: $895,673.39 | Esperado: $859,674.39)\n');

    const sheetSPS = workbook.Sheets["SP´S"];

    // Leer TODAS las columnas para cada fila y buscar algún indicador de exclusión
    console.log('   Analizando columnas adicionales de SP´S...\n');

    // Revisar estructura de encabezados (fila 6 probablemente)
    console.log('   Encabezados SP´S:');
    for (let col = 0; col <= 12; col++) {
        const letra = String.fromCharCode(65 + col);
        const val = getCellValue(sheetSPS, letra, 6);
        if (val) console.log(`      ${letra}: ${val}`);
    }

    // Buscar patrones en filas que podrían no contabilizarse
    console.log('\n\n   🔎 Filas con status diferente a PAGADO en SP´S:');
    let sumaNoPagedSPS = 0;

    for (let fila = 7; fila < 140; fila++) {
        const monto = getCellValue(sheetSPS, 'H', fila);
        const status = getCellValue(sheetSPS, 'A', fila);
        const concepto = getCellValue(sheetSPS, 'E', fila);

        if (monto && parseFloat(monto) > 0) {
            const montoNum = parseFloat(monto);
            const statusStr = String(status || '').toUpperCase().trim();

            // Si no está marcado como PAGADO
            if (!statusStr.includes('PAGADO') && statusStr !== '') {
                console.log(`      Fila ${fila}: [${statusStr}] $${montoNum.toLocaleString()} - "${String(concepto || '').substring(0, 40)}"`);
                sumaNoPagedSPS += montoNum;
            }
        }
    }
    console.log(`\n   SUMA de registros NO PAGADOS en SP´S: $${sumaNoPagedSPS.toLocaleString()}`);

    // ═══════════════════════════════════════════════════════════════════════
    // MATERIALES: Diferencia de $6,047.69
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n\n' + '═'.repeat(70));
    console.log('📊 MATERIALES: Buscando $6,047.69 de diferencia');
    console.log('   (Importado: $483,931.63 | Esperado: $477,883.94)\n');

    const sheetMat = workbook.Sheets["MATERIALES"];

    // Revisar estructura de encabezados
    console.log('   Encabezados MATERIALES:');
    for (let col = 0; col <= 14; col++) {
        const letra = String.fromCharCode(65 + col);
        const val = getCellValue(sheetMat, letra, 6);
        if (val) console.log(`      ${letra}: ${val}`);
    }

    console.log('\n\n   🔎 Filas con status diferente a PAGADO en MATERIALES:');
    let sumaNoPagedMat = 0;

    for (let fila = 7; fila < 180; fila++) {
        const monto = getCellValue(sheetMat, 'J', fila);
        const status = getCellValue(sheetMat, 'A', fila);
        const concepto = getCellValue(sheetMat, 'E', fila);

        if (monto && parseFloat(monto) > 0) {
            const montoNum = parseFloat(monto);
            const statusStr = String(status || '').toUpperCase().trim();

            if (!statusStr.includes('PAGADO') && statusStr !== '') {
                console.log(`      Fila ${fila}: [${statusStr}] $${montoNum.toLocaleString()} - "${String(concepto || '').substring(0, 40)}"`);
                sumaNoPagedMat += montoNum;
            }
        }
    }
    console.log(`\n   SUMA de registros NO PAGADOS en MATERIALES: $${sumaNoPagedMat.toLocaleString()}`);

    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICAR FÓRMULA DEL RESUMEN
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n\n' + '═'.repeat(70));
    console.log('   📋 VERIFICANDO SI EL RESUMEN FILTRA POR STATUS');
    console.log('═'.repeat(70));

    // Leer las fórmulas del resumen si están disponibles
    const sheetResumen = workbook.Sheets["RESUMEN CIERRE INTERNO"];

    // Celda B22 contiene el subtotal de SP's ($826,051.73)
    const cellB22 = sheetResumen['B22'];
    console.log('\n   Celda B22 (SubTotal SP´S):');
    console.log(`      Valor: ${cellB22?.v}`);
    console.log(`      Fórmula: ${cellB22?.f || 'Sin fórmula visible'}`);

    // Celda D22 contiene el total de SP's
    const cellD22 = sheetResumen['D22'];
    console.log('\n   Celda D22 (Total SP´S):');
    console.log(`      Valor: ${cellD22?.v}`);
    console.log(`      Fórmula: ${cellD22?.f || 'Sin fórmula visible'}`);

    // Celda B25 contiene el subtotal de Materiales
    const cellB25 = sheetResumen['B25'];
    console.log('\n   Celda B25 (SubTotal MATERIALES):');
    console.log(`      Valor: ${cellB25?.v}`);
    console.log(`      Fórmula: ${cellB25?.f || 'Sin fórmula visible'}`);

    console.log('\n\n' + '═'.repeat(70));
    console.log('   📋 CONCLUSIÓN');
    console.log('═'.repeat(70));
    console.log(`
   Si la suma de NO PAGADOS coincide aproximadamente con las diferencias:
   - SP's diferencia: $35,999 vs NO PAGADOS: $${sumaNoPagedSPS.toLocaleString()}
   - Materiales diferencia: $6,047 vs NO PAGADOS: $${sumaNoPagedMat.toLocaleString()}
   
   Entonces el resumen del Excel está FILTRANDO por STATUS = PAGADO
   y debemos hacer lo mismo en el script de importación.
`);

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
