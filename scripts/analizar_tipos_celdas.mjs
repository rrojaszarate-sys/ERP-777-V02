import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔍 ANÁLISIS DE CELDAS - TIPO DE DATOS');
    console.log('═'.repeat(70));

    const workbook = XLSX.readFile(EXCEL_PATH);

    // SP's - Analizar cada celda de la columna H
    const sheetSPS = workbook.Sheets["SP´S"];

    console.log('\n📊 SP´S - Analizando tipo de cada celda en columna H');

    let sumaNumber = 0;
    let sumaString = 0;
    const celdasTexto = [];
    const celdasFormula = [];

    for (let fila = 7; fila <= 137; fila++) {
        const cell = sheetSPS['H' + fila];
        if (cell) {
            const valor = cell.v;
            const tipo = cell.t; // t = tipo: n=número, s=string, b=boolean, e=error
            const formula = cell.f;

            if (tipo === 'n' && valor > 0) {
                sumaNumber += valor;
            } else if (tipo === 's') {
                const numVal = parseFloat(valor);
                if (!isNaN(numVal) && numVal > 0) {
                    sumaString += numVal;
                    celdasTexto.push({ fila, valor, numVal });
                }
            }

            if (formula) {
                celdasFormula.push({ fila, formula, valor });
            }
        }
    }

    console.log(`\n   Suma de celdas tipo NÚMERO (t='n'): $${sumaNumber.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Suma de celdas tipo TEXTO (t='s'): $${sumaString.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Diferencia con total Excel ($859,674.39): $${(sumaNumber - 859674.39).toFixed(2)}`);

    if (celdasTexto.length > 0) {
        console.log(`\n   ⚠️ CELDAS CON FORMATO TEXTO (${celdasTexto.length}):`);
        celdasTexto.forEach(c => {
            console.log(`      Fila ${c.fila}: "${c.valor}" → $${c.numVal}`);
        });
        console.log(`\n   💡 Estas celdas NO suman en la fórmula SUM() de Excel!`);
    }

    if (celdasFormula.length > 0 && celdasFormula.length <= 10) {
        console.log(`\n   📝 Celdas con fórmulas:`);
        celdasFormula.forEach(c => {
            console.log(`      Fila ${c.fila}: =${c.formula} → $${c.valor}`);
        });
    }

    // Materiales
    const sheetMat = workbook.Sheets["MATERIALES"];

    console.log('\n\n' + '═'.repeat(70));
    console.log('📊 MATERIALES - Analizando tipo de cada celda en columna J');

    let sumaNumberMat = 0;
    let sumaStringMat = 0;
    const celdasTextoMat = [];

    for (let fila = 7; fila <= 174; fila++) {
        const cell = sheetMat['J' + fila];
        if (cell) {
            const valor = cell.v;
            const tipo = cell.t;

            if (tipo === 'n' && valor > 0) {
                sumaNumberMat += valor;
            } else if (tipo === 's') {
                const numVal = parseFloat(valor);
                if (!isNaN(numVal) && numVal > 0) {
                    sumaStringMat += numVal;
                    celdasTextoMat.push({ fila, valor, numVal });
                }
            }
        }
    }

    console.log(`\n   Suma de celdas tipo NÚMERO (t='n'): $${sumaNumberMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Suma de celdas tipo TEXTO (t='s'): $${sumaStringMat.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Diferencia con total Excel ($477,883.94): $${(sumaNumberMat - 477883.94).toFixed(2)}`);

    if (celdasTextoMat.length > 0) {
        console.log(`\n   ⚠️ CELDAS CON FORMATO TEXTO (${celdasTextoMat.length}):`);
        celdasTextoMat.forEach(c => {
            console.log(`      Fila ${c.fila}: "${c.valor}" → $${c.numVal}`);
        });
        console.log(`\n   💡 Estas celdas NO suman en la fórmula SUM() de Excel!`);
    }

    // Verificar filas ocultas
    console.log('\n\n' + '═'.repeat(70));
    console.log('   🔍 VERIFICANDO FILAS OCULTAS');
    console.log('═'.repeat(70));

    // Las filas ocultas se almacenan en sheet['!rows']
    const rowsSPS = sheetSPS['!rows'] || [];
    const hiddenSPS = rowsSPS.map((r, i) => r && r.hidden ? i + 1 : null).filter(Boolean);

    if (hiddenSPS.length > 0) {
        console.log(`\n   SP´S tiene ${hiddenSPS.length} filas ocultas: ${hiddenSPS.slice(0, 20).join(', ')}${hiddenSPS.length > 20 ? '...' : ''}`);
    } else {
        console.log('\n   SP´S: No hay información de filas ocultas en el archivo');
    }

    const rowsMat = sheetMat['!rows'] || [];
    const hiddenMat = rowsMat.map((r, i) => r && r.hidden ? i + 1 : null).filter(Boolean);

    if (hiddenMat.length > 0) {
        console.log(`   MATERIALES tiene ${hiddenMat.length} filas ocultas: ${hiddenMat.slice(0, 20).join(', ')}${hiddenMat.length > 20 ? '...' : ''}`);
    } else {
        console.log('   MATERIALES: No hay información de filas ocultas en el archivo');
    }

    console.log('\n✅ Análisis completado');
}

main().catch(console.error);
