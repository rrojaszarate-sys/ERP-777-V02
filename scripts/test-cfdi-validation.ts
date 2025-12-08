/**
 * Script de pruebas para validar el parsing de XML CFDI y validación SAT
 * Ejecutar con: npx tsx scripts/test-cfdi-validation.ts
 */

import { parseCFDIXml, cfdiToExpenseData } from '../src/modules/eventos-erp/utils/cfdiXmlParser';
import { validarCFDI } from '../src/services/satValidationService';
import * as fs from 'fs';
import * as path from 'path';

const FACTURAS_DIR = path.join(__dirname, '..', 'fact');

async function testXMLParsing() {
    console.log('\n========================================');
    console.log('🧪 PRUEBA 1: Parsing de XML CFDI');
    console.log('========================================\n');

    const xmlFiles = fs.readdirSync(FACTURAS_DIR).filter(f => f.endsWith('.xml'));

    for (const xmlFile of xmlFiles) {
        console.log(`📄 Archivo: ${xmlFile}`);

        try {
            const xmlPath = path.join(FACTURAS_DIR, xmlFile);
            const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

            const cfdiData = await parseCFDIXml(xmlContent);

            console.log('   ✅ Parsing exitoso');
            console.log(`   📌 UUID: ${cfdiData.timbreFiscal?.uuid}`);
            console.log(`   🏢 Emisor: ${cfdiData.emisor.nombre} (${cfdiData.emisor.rfc})`);
            console.log(`   👤 Receptor: ${cfdiData.receptor.nombre} (${cfdiData.receptor.rfc})`);
            console.log(`   💰 Subtotal: $${cfdiData.subtotal.toFixed(2)}`);
            console.log(`   💰 IVA: $${(cfdiData.totalImpuestosTrasladados || 0).toFixed(2)}`);
            console.log(`   💰 Total: $${cfdiData.total.toFixed(2)}`);
            console.log(`   📅 Fecha: ${cfdiData.fecha}`);
            console.log('');

            // Convertir a datos de gasto
            const expenseData = cfdiToExpenseData(cfdiData);
            console.log('   📋 Datos para formulario:');
            console.log(`      - concepto: ${expenseData.concepto}`);
            console.log(`      - subtotal: ${expenseData.subtotal}`);
            console.log(`      - iva: ${expenseData.iva}`);
            console.log(`      - total: ${expenseData.total}`);
            console.log(`      - proveedor: ${expenseData.proveedor}`);
            console.log(`      - uuid_cfdi: ${expenseData.uuid_cfdi}`);
            console.log('');

        } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        console.log('----------------------------------------\n');
    }
}

async function testSATValidation() {
    console.log('\n========================================');
    console.log('🧪 PRUEBA 2: Validación con SAT');
    console.log('========================================\n');

    // Factura de prueba (NO1725201_0.xml)
    const testData = {
        uuid: '3a3ee863-2ec6-4b58-934d-6d2c0071a37e',
        rfcEmisor: 'HTM011012DW7',
        rfcReceptor: 'ROZR760828PR8',
        total: 500.00
    };

    console.log('📄 Datos de prueba:');
    console.log(`   UUID: ${testData.uuid}`);
    console.log(`   RFC Emisor: ${testData.rfcEmisor}`);
    console.log(`   RFC Receptor: ${testData.rfcReceptor}`);
    console.log(`   Total: $${testData.total}`);
    console.log('');

    console.log('🔄 Validando con SAT...');

    try {
        const resultado = await validarCFDI(testData);

        console.log('');
        console.log('📋 Resultado de validación:');
        console.log(`   Estado: ${resultado.estado}`);
        console.log(`   Mensaje: ${resultado.mensaje}`);
        console.log(`   ✅ Es Válida: ${resultado.esValida}`);
        console.log(`   ❌ Es Cancelada: ${resultado.esCancelada}`);
        console.log(`   ⚠️ No Encontrada: ${resultado.noEncontrada}`);
        console.log(`   🔓 Permitir Guardar: ${resultado.permitirGuardar}`);

        if (resultado.codigoEstatus) {
            console.log(`   📌 Código SAT: ${resultado.codigoEstatus}`);
        }

    } catch (error: any) {
        console.log(`   ❌ Error de validación: ${error.message}`);
    }
}

async function testOCRFiles() {
    console.log('\n========================================');
    console.log('🧪 PRUEBA 3: Archivos para OCR');
    console.log('========================================\n');

    const imageFiles = fs.readdirSync(FACTURAS_DIR).filter(f =>
        f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg')
    );

    console.log(`📷 Imágenes disponibles para OCR: ${imageFiles.length}`);

    for (const imageFile of imageFiles) {
        const filePath = path.join(FACTURAS_DIR, imageFile);
        const stats = fs.statSync(filePath);
        console.log(`   - ${imageFile} (${(stats.size / 1024).toFixed(1)} KB)`);
    }

    console.log('\n⚠️ Para probar OCR, subir estos archivos manualmente en el formulario de gastos.');
}

async function testPDFFiles() {
    console.log('\n========================================');
    console.log('🧪 PRUEBA 4: Archivos PDF');
    console.log('========================================\n');

    const pdfFiles = fs.readdirSync(FACTURAS_DIR).filter(f => f.endsWith('.pdf'));
    const xmlFiles = fs.readdirSync(FACTURAS_DIR).filter(f => f.endsWith('.xml'));

    console.log(`📄 PDFs disponibles: ${pdfFiles.length}`);

    for (const pdfFile of pdfFiles) {
        const baseName = pdfFile.replace('.pdf', '');
        const hasXml = xmlFiles.some(x => x.replace('.xml', '') === baseName);

        const filePath = path.join(FACTURAS_DIR, pdfFile);
        const stats = fs.statSync(filePath);

        console.log(`   - ${pdfFile}`);
        console.log(`     Tamaño: ${(stats.size / 1024).toFixed(1)} KB`);
        console.log(`     XML correspondiente: ${hasXml ? '✅ Sí' : '❌ No (usar "Validar solo PDF")'}`);
    }
}

async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  PRUEBAS DE VALIDACIÓN DE FACTURAS CFDI                   ║');
    console.log('║  Sistema ERP - Homologación de Gastos                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    await testXMLParsing();
    await testSATValidation();
    await testOCRFiles();
    await testPDFFiles();

    console.log('\n========================================');
    console.log('✅ PRUEBAS COMPLETADAS');
    console.log('========================================\n');

    console.log('📝 Resumen de archivos para pruebas manuales:');
    console.log('   1. Factura con XML: NO1725201_0.pdf + NO1725201_0.xml');
    console.log('   2. Factura con XML: NO1743751_0.pdf + NO1743751_0.xml');
    console.log('   3. Validar solo PDF: FAC 39705.pdf');
    console.log('   4. Validar solo PDF: invoice_203391601_Factura.pdf');
    console.log('   5. Ticket OCR: 58158f3e-669b-483b-9d5d-3eb6179fa3bd.jpg');
    console.log('   6. Ticket OCR: ocr.jpg');
    console.log('');
}

main().catch(console.error);
