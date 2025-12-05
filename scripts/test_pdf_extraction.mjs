/**
 * Script de diagnóstico para probar extracción de datos fiscales de PDFs
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Busca datos fiscales en el texto extraído del PDF
 */
function buscarDatosFiscales(texto) {
  // Normalizar texto para búsqueda
  const textoNormalizado = texto
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .toUpperCase();

  const resultado = {
    uuid: null,
    rfcEmisor: null,
    rfcReceptor: null,
    total: null,
    rfcsEncontrados: []
  };

  // RFCs de PACs conocidos a excluir
  const pacRFCs = new Set([
    'SNF171020F3A', // Software NFe
    'FLI081010EK2', // Facturación Electrónica
    'TSO211020B22', // Tralix
    'SAT970701NN3', // SAT (pruebas)
    'MAS0810247C0', // Masivo Fiscal
    'SFE0807172W7', // Solución Factible
  ]);

  // RFCs genéricos válidos para receptor
  const rfcsGenericos = new Set([
    'XAXX010101000', // Público en general
    'XEXX010101000', // Extranjeros
  ]);

  // ============================================
  // 1. BUSCAR UUID
  // ============================================
  const uuidPatterns = [
    /FOLIO\s*FISCAL[:\s]*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi,
    /UUID[:\s]*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi,
    /ID=([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi,
    /([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi
  ];

  for (const patron of uuidPatterns) {
    const match = textoNormalizado.match(patron);
    if (match && match[0]) {
      const uuidMatch = match[0].match(/[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/i);
      if (uuidMatch) {
        resultado.uuid = uuidMatch[0].toUpperCase();
        break;
      }
    }
  }

  // ============================================
  // 2. BUSCAR TODOS LOS RFCs
  // ============================================
  const patronRFC = /\b([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})\b/g;
  const rfcsUnicos = new Set();
  let rfcMatch;
  while ((rfcMatch = patronRFC.exec(textoNormalizado)) !== null) {
    const rfc = rfcMatch[0].toUpperCase();
    if (rfc.length >= 12 && rfc.length <= 13) {
      rfcsUnicos.add(rfc);
    }
  }

  resultado.rfcsEncontrados = Array.from(rfcsUnicos);
  console.log(`${colors.cyan}📋 Todos los RFCs encontrados: ${resultado.rfcsEncontrados.join(', ')}${colors.reset}`);

  // ============================================
  // 2.1 BUSCAR EN URL DEL SAT (MÁS CONFIABLE)
  // ============================================
  const reMatch = textoNormalizado.match(/RE=([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
  const rrMatch = textoNormalizado.match(/RR=([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
  const ttMatch = textoNormalizado.match(/TT=(\d+\.?\d*)/i);
  const idMatch = textoNormalizado.match(/ID=([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/i);

  if (reMatch || rrMatch) {
    console.log(`${colors.green}✅ Encontrado en URL SAT:${colors.reset}`);
    if (reMatch) {
      resultado.rfcEmisor = reMatch[1].toUpperCase();
      console.log(`   RE (Emisor): ${resultado.rfcEmisor}`);
    }
    if (rrMatch) {
      resultado.rfcReceptor = rrMatch[1].toUpperCase();
      console.log(`   RR (Receptor): ${resultado.rfcReceptor}`);
    }
    if (ttMatch) {
      console.log(`   TT (Total): ${ttMatch[1]}`);
    }
    if (idMatch) {
      console.log(`   ID (UUID): ${idMatch[1]}`);
    }
  }

  // ============================================
  // 2.2 BUSCAR CON ETIQUETA "R.F.C."
  // ============================================
  if (!resultado.rfcEmisor || !resultado.rfcReceptor) {
    const rfcConEtiqueta = textoNormalizado.match(/R\.?F\.?C\.?\s*[:.]?\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/gi);
    if (rfcConEtiqueta && rfcConEtiqueta.length >= 1) {
      const rfcsOrdenados = [];
      for (const match of rfcConEtiqueta) {
        const rfcExt = match.match(/[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}/i);
        if (rfcExt) {
          const rfc = rfcExt[0].toUpperCase();
          if (!pacRFCs.has(rfc)) {
            rfcsOrdenados.push(rfc);
          }
        }
      }
      console.log(`${colors.cyan}📋 RFCs con etiqueta R.F.C.: ${rfcsOrdenados.join(', ')}${colors.reset}`);

      if (rfcsOrdenados.length >= 1 && !resultado.rfcEmisor) {
        // El primer RFC NO genérico es el emisor
        for (const rfc of rfcsOrdenados) {
          if (!rfcsGenericos.has(rfc)) {
            resultado.rfcEmisor = rfc;
            break;
          }
        }
      }
      if (rfcsOrdenados.length >= 2 && !resultado.rfcReceptor) {
        // El segundo RFC (o genérico) es el receptor
        for (const rfc of rfcsOrdenados) {
          if (rfc !== resultado.rfcEmisor) {
            resultado.rfcReceptor = rfc;
            break;
          }
        }
      }
    }
  }

  // ============================================
  // 2.3 FALLBACK: Inferir de RFCs encontrados
  // ============================================
  const rfcsFiltrados = resultado.rfcsEncontrados.filter(rfc => !pacRFCs.has(rfc));

  if (!resultado.rfcEmisor && rfcsFiltrados.length >= 1) {
    // El primer RFC no genérico es el emisor
    for (const rfc of rfcsFiltrados) {
      if (!rfcsGenericos.has(rfc)) {
        resultado.rfcEmisor = rfc;
        console.log(`${colors.yellow}⚠️ RFC Emisor (inferido): ${rfc}${colors.reset}`);
        break;
      }
    }
  }

  if (!resultado.rfcReceptor && rfcsFiltrados.length >= 2) {
    // Cualquier otro RFC diferente al emisor
    for (const rfc of rfcsFiltrados) {
      if (rfc !== resultado.rfcEmisor) {
        resultado.rfcReceptor = rfc;
        console.log(`${colors.yellow}⚠️ RFC Receptor (inferido): ${rfc}${colors.reset}`);
        break;
      }
    }
  }

  // ============================================
  // 3. BUSCAR TOTAL
  // ============================================
  const patronesTotal = [
    /TOTAL\s*(?:A\s*PAGAR)?[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
    /IMPORTE\s*TOTAL[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
    /TT=(\d+\.?\d*)/gi,
    /\$\s*([\d,]+\.\d{2})\b/g
  ];

  for (const patron of patronesTotal) {
    let match;
    while ((match = patron.exec(textoNormalizado)) !== null) {
      const valorStr = match[1].replace(/,/g, '');
      const valor = parseFloat(valorStr);
      if (!isNaN(valor) && valor > 0 && valor < 10000000) {
        if (!resultado.total || patron.source.includes('TOTAL')) {
          resultado.total = valor;
          break;
        }
      }
    }
    if (resultado.total) break;
  }

  return resultado;
}

/**
 * Prueba un archivo PDF
 */
async function probarPDF(filePath) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${colors.blue}📄 Probando: ${path.basename(filePath)}${colors.reset}`);
  console.log(`${'═'.repeat(60)}`);

  try {
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(pdfBuffer);

    console.log(`\n${colors.cyan}Texto extraído (${data.text?.length || 0} caracteres):${colors.reset}`);
    console.log('-'.repeat(40));

    // Mostrar primeros 2000 caracteres del texto
    const textoMuestra = data.text?.substring(0, 2000) || '';
    console.log(textoMuestra);
    console.log('-'.repeat(40));

    // Buscar datos fiscales
    console.log(`\n${colors.cyan}🔍 Buscando datos fiscales...${colors.reset}`);
    const datos = buscarDatosFiscales(data.text);

    console.log(`\n${colors.cyan}📊 RESULTADO:${colors.reset}`);
    console.log(`  UUID: ${datos.uuid ? colors.green + datos.uuid + colors.reset : colors.red + '❌ NO ENCONTRADO' + colors.reset}`);
    console.log(`  RFC Emisor: ${datos.rfcEmisor ? colors.green + datos.rfcEmisor + colors.reset : colors.red + '❌ NO ENCONTRADO' + colors.reset}`);
    console.log(`  RFC Receptor: ${datos.rfcReceptor ? colors.green + datos.rfcReceptor + colors.reset : colors.red + '❌ NO ENCONTRADO' + colors.reset}`);
    console.log(`  Total: ${datos.total ? colors.green + '$' + datos.total.toFixed(2) + colors.reset : colors.red + '❌ NO ENCONTRADO' + colors.reset}`);

    return datos;

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Busca PDFs en el directorio home/Downloads del usuario
 */
async function main() {
  console.log(`${colors.blue}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}  DIAGNÓSTICO DE EXTRACCIÓN PDF PARA CFDI${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(60)}${colors.reset}`);

  // Buscar en varias ubicaciones posibles
  const directorios = [
    '/home/rodri/Descargas',
    '/home/rodri/Downloads',
    '/tmp',
    '/home/rodri'
  ];

  const pdfFiles = [];

  for (const dir of directorios) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.pdf')) {
          const fullPath = path.join(dir, file);
          const stats = fs.statSync(fullPath);
          // Solo archivos modificados en las últimas 24 horas
          const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
          if (ageHours < 24) {
            pdfFiles.push(fullPath);
          }
        }
      }
    }
  }

  if (pdfFiles.length === 0) {
    console.log(`${colors.yellow}⚠️ No se encontraron PDFs recientes.${colors.reset}`);
    console.log(`\nPuedes probar manualmente con:`);
    console.log(`node scripts/test_pdf_extraction.mjs /ruta/al/archivo.pdf`);
    return;
  }

  console.log(`\n${colors.cyan}Encontrados ${pdfFiles.length} PDFs recientes:${colors.reset}`);
  pdfFiles.forEach(f => console.log(`  - ${f}`));

  // Probar cada PDF
  for (const pdf of pdfFiles) {
    await probarPDF(pdf);
  }
}

// Permitir probar un archivo específico
const args = process.argv.slice(2);
if (args.length > 0) {
  // Probar archivo específico
  for (const arg of args) {
    if (fs.existsSync(arg)) {
      probarPDF(arg);
    } else {
      console.error(`${colors.red}❌ Archivo no encontrado: ${arg}${colors.reset}`);
    }
  }
} else {
  main();
}
