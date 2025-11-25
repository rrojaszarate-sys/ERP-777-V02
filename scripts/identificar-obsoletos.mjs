/**
 * Script para identificar archivos obsoletos y código no utilizado
 * 
 * Funcionalidad:
 * 1. Escanea todos los archivos del proyecto
 * 2. Identifica imports no utilizados
 * 3. Detecta funciones y variables sin referencias
 * 4. Genera reporte detallado
 * 
 * Uso: node scripts/identificar-obsoletos.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const config = {
  rootDir: path.join(__dirname, '..'),
  excludeDirs: ['node_modules', '.git', 'documentacion', 'backup', 'dist', 'build', '.vite'],
  fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
  reportPath: path.join(__dirname, '..', 'documentacion', 'v1.0.0', 'reporte-obsoletos.json')
};

/**
 * Resultado del análisis
 */
const resultado = {
  fecha: new Date().toISOString(),
  archivosAnalizados: 0,
  archivosObsoletos: [],
  codigoDuplicado: [],
  importsNoUtilizados: [],
  funcionesSinReferencias: []
};

/**
 * Escanea directorio recursivamente
 * @param {string} dir - Directorio a escanear
 * @returns {Array} Lista de archivos
 */
function escanearDirectorio(dir) {
  let archivos = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!config.excludeDirs.includes(item)) {
          archivos = archivos.concat(escanearDirectorio(fullPath));
        }
      } else {
        const ext = path.extname(item);
        if (config.fileExtensions.includes(ext)) {
          archivos.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error al escanear ${dir}:`, error.message);
  }
  
  return archivos;
}

/**
 * Analiza archivo para detectar código obsoleto
 * @param {string} filePath - Ruta del archivo
 */
function analizarArchivo(filePath) {
  try {
    const contenido = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(config.rootDir, filePath);
    
    // Detectar archivos con "old" o "legacy" en el nombre
    if (relativePath.includes('old') || relativePath.includes('legacy')) {
      resultado.archivosObsoletos.push({
        archivo: relativePath,
        razon: 'Nombre contiene "old" o "legacy"'
      });
    }
    
    // Detectar imports no utilizados (análisis simple)
    const imports = contenido.match(/import\s+.*\s+from\s+['"].*['"]/g) || [];
    for (const imp of imports) {
      const match = imp.match(/import\s+\{?\s*(\w+)\s*\}?\s+from/);
      if (match) {
        const importName = match[1];
        const regex = new RegExp(`\\b${importName}\\b`, 'g');
        const usos = (contenido.match(regex) || []).length;
        
        // Si solo aparece una vez (en el import), probablemente no se usa
        if (usos === 1) {
          resultado.importsNoUtilizados.push({
            archivo: relativePath,
            import: importName,
            linea: imp
          });
        }
      }
    }
    
    // Detectar funciones que parecen no usarse
    const funciones = contenido.match(/(?:function|const|let|var)\s+(\w+)\s*=/g) || [];
    for (const func of funciones) {
      const match = func.match(/(\w+)\s*=/);
      if (match) {
        const funcName = match[1];
        const regex = new RegExp(`\\b${funcName}\\b`, 'g');
        const usos = (contenido.match(regex) || []).length;
        
        // Si solo aparece una vez (en la declaración)
        if (usos === 1) {
          resultado.funcionesSinReferencias.push({
            archivo: relativePath,
            funcion: funcName
          });
        }
      }
    }
    
    resultado.archivosAnalizados++;
  } catch (error) {
    console.error(`Error al analizar ${filePath}:`, error.message);
  }
}

/**
 * Genera reporte HTML
 */
function generarReporteHTML() {
  const htmlPath = path.join(__dirname, '..', 'documentacion', 'v1.0.0', 'reporte-obsoletos.html');
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Código Obsoleto</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; background: white; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .stats { background: #e7f3fe; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reporte de Código Obsoleto</h1>
    <div class="stats">
      <p><strong>Fecha de análisis:</strong> ${new Date(resultado.fecha).toLocaleString()}</p>
      <p><strong>Archivos analizados:</strong> ${resultado.archivosAnalizados}</p>
      <p><strong>Archivos obsoletos:</strong> ${resultado.archivosObsoletos.length}</p>
      <p><strong>Imports no utilizados:</strong> ${resultado.importsNoUtilizados.length}</p>
      <p><strong>Funciones sin referencias:</strong> ${resultado.funcionesSinReferencias.length}</p>
    </div>

    <h2>Archivos Obsoletos</h2>
    <table>
      <tr><th>Archivo</th><th>Razón</th></tr>
      ${resultado.archivosObsoletos.map(item => `
        <tr><td>${item.archivo}</td><td>${item.razon}</td></tr>
      `).join('')}
    </table>

    <h2>Imports No Utilizados</h2>
    <table>
      <tr><th>Archivo</th><th>Import</th></tr>
      ${resultado.importsNoUtilizados.map(item => `
        <tr><td>${item.archivo}</td><td>${item.import}</td></tr>
      `).join('')}
    </table>

    <h2>Funciones Sin Referencias</h2>
    <table>
      <tr><th>Archivo</th><th>Función</th></tr>
      ${resultado.funcionesSinReferencias.map(item => `
        <tr><td>${item.archivo}</td><td>${item.funcion}</td></tr>
      `).join('')}
    </table>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(htmlPath, html);
  console.log(`\n✅ Reporte HTML generado: ${htmlPath}`);
}

/**
 * Función principal
 */
function main() {
  console.log('🔍 Iniciando análisis de código obsoleto...\n');
  
  // Crear directorio de documentación si no existe
  const docDir = path.join(__dirname, '..', 'documentacion', 'v1.0.0');
  if (!fs.existsSync(docDir)) {
    fs.mkdirSync(docDir, { recursive: true });
  }
  
  // Escanear archivos
  const archivos = escanearDirectorio(config.rootDir);
  console.log(`📁 Encontrados ${archivos.length} archivos para analizar`);
  
  // Analizar cada archivo
  archivos.forEach(analizarArchivo);
  
  // Guardar resultado JSON
  fs.writeFileSync(config.reportPath, JSON.stringify(resultado, null, 2));
  console.log(`\n✅ Reporte JSON generado: ${config.reportPath}`);
  
  // Generar reporte HTML
  generarReporteHTML();
  
  // Resumen
  console.log('\n📊 RESUMEN:');
  console.log(`   - Archivos analizados: ${resultado.archivosAnalizados}`);
  console.log(`   - Archivos obsoletos: ${resultado.archivosObsoletos.length}`);
  console.log(`   - Imports no utilizados: ${resultado.importsNoUtilizados.length}`);
  console.log(`   - Funciones sin referencias: ${resultado.funcionesSinReferencias.length}`);
}

// Ejecutar
main();
