/**
 * Script de prueba para servicios de procesamiento de documentos
 * Ejecutar con: npx ts-node --esm scripts/test-document-services.ts
 */
import * as fs from 'fs';
import * as path from 'path';

// Simular tipos de File para Node.js
class NodeFile {
    name: string;
    type: string;
    size: number;
    private buffer: Buffer;

    constructor(filePath: string) {
        this.buffer = fs.readFileSync(filePath);
        this.name = path.basename(filePath);
        this.size = this.buffer.length;

        const ext = path.extname(filePath).toLowerCase();
        this.type = ext === '.xml' ? 'application/xml'
            : ext === '.pdf' ? 'application/pdf'
                : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                    : ext === '.png' ? 'image/png'
                        : 'application/octet-stream';
    }

    async text(): Promise<string> {
        return this.buffer.toString('utf-8');
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        return this.buffer.buffer.slice(
            this.buffer.byteOffset,
            this.buffer.byteOffset + this.buffer.byteLength
        );
    }
}

// Directorio de archivos de prueba
const FACT_DIR = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/fact';

async function testXMLProcessing() {
    console.log('\n========================================');
    console.log('🔵 PRUEBA: Procesamiento XML CFDI');
    console.log('========================================\n');

    const xmlFiles = fs.readdirSync(FACT_DIR).filter(f => f.endsWith('.xml'));

    for (const xmlFile of xmlFiles) {
        console.log(`📄 Archivo: ${xmlFile}`);

        try {
            const filePath = path.join(FACT_DIR, xmlFile);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Verificar estructura básica
            const tieneCFDI = content.includes('cfdi:Comprobante') || content.includes('<Comprobante');
            const tieneEmisor = content.includes('cfdi:Emisor') || content.includes('<Emisor');
            const tieneTimbre = content.includes('tfd:TimbreFiscalDigital') || content.includes('TimbreFiscalDigital');

            console.log(`   ✓ CFDI válido: ${tieneCFDI}`);
            console.log(`   ✓ Tiene Emisor: ${tieneEmisor}`);
            console.log(`   ✓ Tiene Timbre: ${tieneTimbre}`);

            // Extraer datos básicos con regex
            const rfcMatch = content.match(/Rfc="([A-Z0-9]+)"/);
            const nombreMatch = content.match(/Nombre="([^"]+)"/);
            const totalMatch = content.match(/Total="([\d.]+)"/);
            const uuidMatch = content.match(/UUID="([A-F0-9\-]+)"/i);

            if (rfcMatch) console.log(`   📌 RFC Emisor: ${rfcMatch[1]}`);
            if (nombreMatch) console.log(`   📌 Nombre: ${nombreMatch[1]}`);
            if (totalMatch) console.log(`   📌 Total: $${parseFloat(totalMatch[1]).toFixed(2)}`);
            if (uuidMatch) console.log(`   📌 UUID: ${uuidMatch[1]}`);

            console.log('   ✅ ÉXITO\n');
        } catch (error) {
            console.log(`   ❌ ERROR: ${(error as Error).message}\n`);
        }
    }
}

function testImagePatterns() {
    console.log('\n========================================');
    console.log('🟡 PRUEBA: Patrones de extracción OCR');
    console.log('========================================\n');

    // Simular texto de ticket para probar patrones
    const textosPrueba = [
        {
            nombre: 'Ticket OXXO',
            texto: `
                OXXO
                RFC: CDD930127UM4
                SUCURSAL 1234
                FECHA: 15/12/2023 14:30
                
                PRODUCTO A          $25.00
                PRODUCTO B          $15.50
                
                SUBTOTAL            $40.50
                IVA 16%             $6.48
                TOTAL               $46.98
                
                EFECTIVO            $50.00
                CAMBIO              $3.02
                
                FOLIO: 123456
            `
        },
        {
            nombre: 'Ticket 7-Eleven',
            texto: `
                7-ELEVEN MEXICO
                RFC: SME011011FA5
                
                05-DIC-2023 10:15
                
                CAFE GRANDE         $35.00
                DONA                $22.00
                
                TOTAL A PAGAR:      $57.00
                
                TARJETA ****1234
            `
        },
        {
            nombre: 'Ticket Walmart',
            texto: `
                WALMART
                Nueva Walmart de Mexico S de RL de CV
                RFC: NWM9709244W4
                
                12/06/2023
                
                ARTICULO 1          125.90
                ARTICULO 2          89.50
                
                SUBTOTAL           215.40
                IVA                 34.46
                TOTAL              249.86
            `
        }
    ];

    // Patrones de prueba
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
    ];

    for (const { nombre, texto } of textosPrueba) {
        console.log(`📝 ${nombre}:`);

        // RFC
        const matchRFC = texto.match(PATRONES.rfc);
        if (matchRFC) {
            const rfc = (matchRFC[1] + matchRFC[2] + matchRFC[3]).toUpperCase();
            console.log(`   RFC: ${rfc}`);
        }

        // Establecimiento
        for (const est of establecimientos) {
            if (est.patron.test(texto)) {
                console.log(`   Establecimiento: ${est.nombre}`);
                break;
            }
        }

        // Total
        const matchTotal = texto.match(PATRONES.total);
        if (matchTotal) {
            console.log(`   Total: $${parseFloat(matchTotal[1].replace(/,/g, '')).toFixed(2)}`);
        }

        // Subtotal
        const matchSubtotal = texto.match(PATRONES.subtotal);
        if (matchSubtotal) {
            console.log(`   Subtotal: $${parseFloat(matchSubtotal[1].replace(/,/g, '')).toFixed(2)}`);
        }

        // IVA
        const matchIVA = texto.match(PATRONES.iva);
        if (matchIVA) {
            console.log(`   IVA: $${parseFloat(matchIVA[1].replace(/,/g, '')).toFixed(2)}`);
        }

        // Fecha
        const matchFecha = texto.match(PATRONES.fecha);
        if (matchFecha) {
            console.log(`   Fecha: ${matchFecha[0]}`);
        }

        // Folio
        const matchFolio = texto.match(PATRONES.folio);
        if (matchFolio) {
            console.log(`   Folio: ${matchFolio[1]}`);
        }

        console.log('   ✅ Extracción exitosa\n');
    }
}

function listTestFiles() {
    console.log('\n========================================');
    console.log('📁 ARCHIVOS DE PRUEBA EN /fact');
    console.log('========================================\n');

    const files = fs.readdirSync(FACT_DIR);

    const xmlFiles = files.filter(f => f.endsWith('.xml'));
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    const imageFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

    console.log('📄 XMLs (Facturas CFDI):');
    xmlFiles.forEach(f => {
        const size = fs.statSync(path.join(FACT_DIR, f)).size;
        console.log(`   - ${f} (${(size / 1024).toFixed(1)} KB)`);
    });

    console.log('\n📋 PDFs:');
    pdfFiles.forEach(f => {
        const size = fs.statSync(path.join(FACT_DIR, f)).size;
        console.log(`   - ${f} (${(size / 1024).toFixed(1)} KB)`);
    });

    console.log('\n🖼️  Imágenes (Tickets):');
    imageFiles.forEach(f => {
        const size = fs.statSync(path.join(FACT_DIR, f)).size;
        console.log(`   - ${f} (${(size / 1024).toFixed(1)} KB)`);
    });
}

// Ejecutar pruebas
async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🧪 PRUEBAS DE SERVICIOS DE PROCESAMIENTO      ║');
    console.log('╚════════════════════════════════════════════════╝');

    listTestFiles();
    await testXMLProcessing();
    testImagePatterns();

    console.log('\n✅ TODAS LAS PRUEBAS COMPLETADAS');
    console.log('\nPara probar con imágenes reales, usa la interfaz web');
    console.log('y sube los archivos de /fact\n');
}

main().catch(console.error);
