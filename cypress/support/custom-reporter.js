/**
 * Custom Reporter para generar reporte de fallas en formato personalizado
 * Genera archivos JSON y TXT con información detallada de errores
 */

import fs from 'fs';
import path from 'path';

export class CustomFailureReporter {
  constructor() {
    this.results = {
      fecha: new Date().toISOString(),
      total_pruebas: 0,
      aprobadas: 0,
      fallidas: 0,
      omitidas: 0,
      porcentaje_exito: '0',
      duracion_total_ms: 0,
      suites: [],
      fallas: []
    };
  }

  addTestResult(suite, test, result) {
    this.results.total_pruebas++;

    if (result.state === 'passed') {
      this.results.aprobadas++;
    } else if (result.state === 'failed') {
      this.results.fallidas++;

      // Agregar detalle de falla
      this.results.fallas.push({
        suite: suite,
        test: test.title,
        error: result.error?.message || 'Error desconocido',
        stack: result.error?.stack || '',
        screenshot: result.screenshots?.[0]?.path || null,
        duracion_ms: result.duration
      });
    } else if (result.state === 'skipped') {
      this.results.omitidas++;
    }

    this.results.duracion_total_ms += result.duration || 0;
  }

  calculatePercentage() {
    if (this.results.total_pruebas === 0) return '0';
    return ((this.results.aprobadas / this.results.total_pruebas) * 100).toFixed(1);
  }

  generateReport() {
    this.results.porcentaje_exito = this.calculatePercentage();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                     new Date().getTime();

    // Generar reporte JSON
    const jsonPath = path.join('cypress', 'reports', `reporte_fallas_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Generar reporte TXT
    const txtContent = this.generateTextReport();
    const txtPath = path.join('cypress', 'reports', `reporte_fallas_${timestamp}.txt`);
    fs.writeFileSync(txtPath, txtContent);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           📊 REPORTE DE PRUEBAS UI - ERP EVENTOS             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Pruebas Aprobadas: ${this.results.aprobadas}/${this.results.total_pruebas}`);
    console.log(`❌ Pruebas Fallidas:  ${this.results.fallidas}/${this.results.total_pruebas}`);
    console.log(`⏭️  Pruebas Omitidas:  ${this.results.omitidas}/${this.results.total_pruebas}`);
    console.log(`📈 Porcentaje Éxito:  ${this.results.porcentaje_exito}%`);
    console.log(`⏱️  Duración Total:    ${(this.results.duracion_total_ms / 1000).toFixed(2)}s\n`);
    console.log(`📄 Reporte JSON: ${jsonPath}`);
    console.log(`📄 Reporte TXT:  ${txtPath}\n`);

    return { jsonPath, txtPath };
  }

  generateTextReport() {
    let report = '';

    report += '═══════════════════════════════════════════════════════════════\n';
    report += '       REPORTE DE PRUEBAS AUTOMATIZADAS UI - ERP EVENTOS      \n';
    report += '═══════════════════════════════════════════════════════════════\n\n';

    report += `Fecha de Ejecución: ${new Date(this.results.fecha).toLocaleString('es-MX')}\n\n`;

    report += '───────────────────────────────────────────────────────────────\n';
    report += '                        RESUMEN GENERAL                         \n';
    report += '───────────────────────────────────────────────────────────────\n\n';

    report += `Total de Pruebas:     ${this.results.total_pruebas}\n`;
    report += `✅ Pruebas Aprobadas: ${this.results.aprobadas}\n`;
    report += `❌ Pruebas Fallidas:  ${this.results.fallidas}\n`;
    report += `⏭️  Pruebas Omitidas:  ${this.results.omitidas}\n`;
    report += `📈 Porcentaje Éxito:  ${this.results.porcentaje_exito}%\n`;
    report += `⏱️  Duración Total:    ${(this.results.duracion_total_ms / 1000).toFixed(2)}s\n\n`;

    if (this.results.fallidas > 0) {
      report += '═══════════════════════════════════════════════════════════════\n';
      report += '                      DETALLE DE FALLAS                         \n';
      report += '═══════════════════════════════════════════════════════════════\n\n';

      this.results.fallas.forEach((falla, index) => {
        report += `─────────── FALLA #${index + 1} ───────────\n\n`;
        report += `Suite:    ${falla.suite}\n`;
        report += `Prueba:   ${falla.test}\n`;
        report += `Duración: ${falla.duracion_ms}ms\n\n`;
        report += `Error:\n${falla.error}\n\n`;

        if (falla.screenshot) {
          report += `Screenshot: ${falla.screenshot}\n\n`;
        }

        if (falla.stack) {
          report += `Stack Trace:\n${falla.stack}\n\n`;
        }
      });
    } else {
      report += '═══════════════════════════════════════════════════════════════\n';
      report += '               ✅ TODAS LAS PRUEBAS PASARON                    \n';
      report += '═══════════════════════════════════════════════════════════════\n\n';
    }

    report += '───────────────────────────────────────────────────────────────\n';
    report += '                      FIN DEL REPORTE                           \n';
    report += '───────────────────────────────────────────────────────────────\n';

    return report;
  }
}

export default CustomFailureReporter;
