import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

function getCellValue(sheet, col, row) {
    const cell = sheet[col + row];
    return cell ? cell.v : null;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 BUSCANDO COMBINACIÓN EXACTA DE $35,999');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets["SP´S"];

    // Recopilar todos los montos
    const filas = [];
    for (let fila = 7; fila <= 137; fila++) {
        const monto = getCellValue(sheet, 'H', fila);
        const concepto = getCellValue(sheet, 'E', fila);
        const proveedor = getCellValue(sheet, 'D', fila);
        const colJ = getCellValue(sheet, 'J', fila);

        if (monto && parseFloat(monto) > 0) {
            filas.push({
                fila,
                monto: parseFloat(monto),
                concepto: String(concepto || '').toUpperCase(),
                proveedor: String(proveedor || '').toUpperCase(),
                tieneJ: colJ === 'SI'
            });
        }
    }

    const diferencia = 35999;

    // Buscar combinaciones de 1, 2 o 3 filas que sumen exactamente $35,999
    console.log('\n📊 Buscando combinación de filas que sumen $35,999...\n');

    // Buscar fila individual
    console.log('   1️⃣ FILAS INDIVIDUALES cercanas a $35,999:');
    filas.filter(f => Math.abs(f.monto - diferencia) < 100).forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto.toLocaleString()} - "${f.concepto.substring(0, 50)}"`);
    });

    // Buscar pares exactos
    console.log('\n   2️⃣ PARES QUE SUMEN EXACTO $35,999 (±$1):');
    for (let i = 0; i < filas.length; i++) {
        for (let j = i + 1; j < filas.length; j++) {
            const suma = filas[i].monto + filas[j].monto;
            if (Math.abs(suma - diferencia) <= 1) {
                console.log(`      Filas ${filas[i].fila} + ${filas[j].fila}: $${filas[i].monto.toLocaleString()} + $${filas[j].monto.toLocaleString()} = $${suma.toLocaleString()}`);
                console.log(`         ├─ "${filas[i].concepto.substring(0, 50)}"`);
                console.log(`         └─ "${filas[j].concepto.substring(0, 50)}"`);
            }
        }
    }

    // Buscar ANTICIPOS y sus LIQUIDACIONES que podrían estar duplicados
    console.log('\n\n   🔎 BUSCANDO POSIBLES DUPLICADOS (ANTICIPO + LIQUIDACIÓN):');

    const anticipos = filas.filter(f => f.concepto.includes('ANTICIPO'));
    const liquidaciones = filas.filter(f => f.concepto.includes('LIQUIDACION') || f.concepto.includes('FINIQUITO') || f.concepto.includes('PAGO TOTAL'));

    console.log(`\n   ANTICIPOS encontrados (${anticipos.length}):`);
    anticipos.forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto.toLocaleString()} - "${f.concepto.substring(0, 60)}"`);
    });

    console.log(`\n   LIQUIDACIONES/FINIQUITOS encontrados (${liquidaciones.length}):`);
    liquidaciones.forEach(f => {
        console.log(`      Fila ${f.fila}: $${f.monto.toLocaleString()} - "${f.concepto.substring(0, 60)}"`);
    });

    // Buscar si hay ANTICIPOS cuyo monto aparece también en una LIQUIDACIÓN
    console.log('\n\n   🔍 POSIBLES DUPLICADOS (anticipo + liquidación del mismo proveedor):');

    for (const ant of anticipos) {
        // Buscar liquidación del mismo monto o similar concepto
        for (const liq of liquidaciones) {
            // Si tienen proveedor similar o concepto similar
            if (ant.proveedor && liq.proveedor &&
                (ant.proveedor.includes(liq.proveedor.substring(0, 10)) ||
                    liq.proveedor.includes(ant.proveedor.substring(0, 10)) ||
                    ant.concepto.includes(liq.concepto.substring(0, 15)) ||
                    liq.concepto.includes(ant.concepto.substring(0, 15)))) {
                console.log(`\n      📌 POSIBLE RELACIÓN:`);
                console.log(`         Anticipo fila ${ant.fila}: $${ant.monto.toLocaleString()} - "${ant.concepto.substring(0, 50)}"`);
                console.log(`         Liquidación fila ${liq.fila}: $${liq.monto.toLocaleString()} - "${liq.concepto.substring(0, 50)}"`);
            }
        }
    }

    // Buscar filas que podrían estar siendo excluidas por ser "provisiones" o similar
    console.log('\n\n   🔍 FILAS CON CONCEPTOS ESPECIALES:');
    const especiales = filas.filter(f =>
        f.concepto.includes('PROVISION') ||
        f.concepto.includes('ESTIMADO') ||
        f.concepto.includes('PENDIENTE') ||
        f.concepto.includes('PRESUPUESTO')
    );

    if (especiales.length > 0) {
        especiales.forEach(f => {
            console.log(`      Fila ${f.fila}: $${f.monto.toLocaleString()} - "${f.concepto.substring(0, 60)}"`);
        });
    } else {
        console.log('      Ninguna encontrada');
    }

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
