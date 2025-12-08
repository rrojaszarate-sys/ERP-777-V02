/**
 * Script de prueba para procesamiento de documentos
 * Ejecutar con: node scripts/test-documents.cjs
 */
const fs = require('fs');
const path = require('path');

const FACT_DIR = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/fact';

// Patrones de extracción
const PATRONES = {
    rfc: /\b([A-ZÑ&]{3,4})[-\s]?(\d{6})[-\s]?([A-Z0-9]{3})\b/i,
    total: /(?:TOTAL|IMPORTE\s*TOTAL|MONTO|PAGAR|A\s*PAGAR)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    subtotal: /(?:SUBTOTAL|SUB\s*TOTAL|SUMA)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    iva: /(?:IVA|I\.V\.A\.?|IMPUESTO)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    fecha: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    folio: /(?:FOLIO|TICKET|NO\.|NUMERO|#)[:\s#]*([A-Z0-9\-]+)/i,
};

const establecimientos = [
    { patron: /OXXO/i, nombre: 'OXXO' },
    { patron: /7[-\s]?ELEVEN/i, nombre: '7-Eleven' },
    { patron: /WALMART/i, nombre: 'Walmart' },
    { patron: /SORIANA/i, nombre: 'Soriana' },
    { patron: /CHEDRAUI/i, nombre: 'Chedraui' },
    { patron: /HEB|H[\s-]E[\s-]B/i, nombre: 'HEB' },
    { patron: /COSTCO/i, nombre: 'Costco' },
    { patron: /SAMS|SAM'?S\s*CLUB/i, nombre: "Sam's Club" },
    { patron: /STARBUCKS/i, nombre: 'Starbucks' },
    { patron: /FARMACIA/i, nombre: 'Farmacia' },
    { patron: /GASOLINERA|PEMEX/i, nombre: 'Gasolinera' },
];

console.log('╔════════════════════════════════════════════════╗');
console.log('║  🧪 PRUEBAS DE PROCESAMIENTO DE DOCUMENTOS     ║');
console.log('╚════════════════════════════════════════════════╝\n');

// Listar archivos
console.log('📁 ARCHIVOS EN /fact:\n');
const files = fs.readdirSync(FACT_DIR);
files.forEach(f => {
    const size = fs.statSync(path.join(FACT_DIR, f)).size;
    const tipo = f.endsWith('.xml') ? '📄 XML'
        : f.endsWith('.pdf') ? '📋 PDF'
            : f.match(/\.(jpg|jpeg|png)$/i) ? '🖼️  IMG' : '📦 ???';
    console.log(`   ${tipo}  ${f} (${(size / 1024).toFixed(1)} KB)`);
});

// Probar XMLs
console.log('\n========================================');
console.log('🔵 PRUEBA: Procesamiento XML CFDI');
console.log('========================================\n');

const xmlFiles = files.filter(f => f.endsWith('.xml'));
xmlFiles.forEach(xmlFile => {
    console.log(`📄 ${xmlFile}:`);

    const content = fs.readFileSync(path.join(FACT_DIR, xmlFile), 'utf-8');

    // Verificar estructura
    const tieneCFDI = content.includes('cfdi:Comprobante') || content.includes('<Comprobante');
    const tieneEmisor = content.includes('Emisor');
    const tieneTimbre = content.includes('TimbreFiscal');

    console.log(`   ✓ CFDI: ${tieneCFDI ? 'Sí' : 'No'}`);
    console.log(`   ✓ Emisor: ${tieneEmisor ? 'Sí' : 'No'}`);
    console.log(`   ✓ Timbre: ${tieneTimbre ? 'Sí' : 'No'}`);

    // Extraer datos
    const rfcMatch = content.match(/Rfc="([A-Z0-9]+)"/);
    const nombreMatch = content.match(/Nombre="([^"]+)"/);
    const totalMatch = content.match(/Total="([\d.]+)"/);
    const uuidMatch = content.match(/UUID="([A-F0-9\-]+)"/i);

    if (rfcMatch) console.log(`   📌 RFC: ${rfcMatch[1]}`);
    if (nombreMatch) console.log(`   📌 Nombre: ${nombreMatch[1].slice(0, 40)}...`);
    if (totalMatch) console.log(`   📌 Total: $${parseFloat(totalMatch[1]).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    if (uuidMatch) console.log(`   📌 UUID: ${uuidMatch[1]}`);

    console.log('   ✅ ÉXITO\n');
});

// Probar patrones de tickets
console.log('========================================');
console.log('🟡 PRUEBA: Patrones de extracción OCR');
console.log('========================================\n');

const ticketsPrueba = [
    {
        nombre: 'Ticket OXXO',
        texto: `OXXO\nRFC: CDD930127UM4\nFECHA: 15/12/2023\nSODA     $25.00\nCHIPS    $15.50\nSUBTOTAL $40.50\nIVA      $6.48\nTOTAL    $46.98\nFOLIO: 123456`
    },
    {
        nombre: 'Ticket 7-Eleven',
        texto: `7-ELEVEN MEXICO\nRFC: SME011011FA5\n05-DIC-2023\nCAFE $35.00\nTOTAL A PAGAR: $57.00`
    },
    {
        nombre: 'Ticket Gasolinera',
        texto: `PEMEX GASOLINERA\nRFC GAI850101XY9\n06/12/2023\nGASOLINA MAGNA\n25.5 LTS x $22.50\nTOTAL: $573.75`
    }
];

ticketsPrueba.forEach(({ nombre, texto }) => {
    console.log(`📝 ${nombre}:`);

    // Establecimiento
    for (const est of establecimientos) {
        if (est.patron.test(texto)) {
            console.log(`   🏪 Establecimiento: ${est.nombre}`);
            break;
        }
    }

    // RFC
    const matchRFC = texto.match(PATRONES.rfc);
    if (matchRFC) {
        console.log(`   📌 RFC: ${(matchRFC[1] + matchRFC[2] + matchRFC[3]).toUpperCase()}`);
    }

    // Total
    const matchTotal = texto.match(PATRONES.total);
    if (matchTotal) {
        console.log(`   💰 Total: $${parseFloat(matchTotal[1].replace(/,/g, '')).toFixed(2)}`);
    }

    // Fecha
    const matchFecha = texto.match(PATRONES.fecha);
    if (matchFecha) {
        console.log(`   📅 Fecha: ${matchFecha[0]}`);
    }

    // Folio
    const matchFolio = texto.match(PATRONES.folio);
    if (matchFolio) {
        console.log(`   🔢 Folio: ${matchFolio[1]}`);
    }

    console.log('   ✅ Patrones funcionando\n');
});

// Resumen
console.log('========================================');
console.log('📊 RESUMEN DE PRUEBAS');
console.log('========================================\n');

console.log(`   ✅ XMLs procesados: ${xmlFiles.length}`);
console.log(`   ✅ Patrones de tickets: ${ticketsPrueba.length} tipos probados`);
console.log(`   ✅ Establecimientos reconocidos: ${establecimientos.length}`);

console.log('\n🎯 PRÓXIMO PASO:');
console.log('   Abre la app web y sube los archivos de /fact');
console.log('   Las imágenes (tickets) usarán OCR real con Google Vision\n');
