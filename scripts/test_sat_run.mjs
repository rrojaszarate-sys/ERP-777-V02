/**
 * ============================================================================
 * SCRIPT DE PRUEBA: Validación SAT
 * ============================================================================
 *
 * Ejecutar: node scripts/test_sat_run.mjs
 *
 * Este script prueba la conexión con el Web Service del SAT para validar
 * facturas CFDI. Incluye varios casos de prueba.
 */

import axios from 'axios';

// URL del servidor local
const API_URL = 'http://localhost:3001/api/sat/validar-cfdi';

// Colores para la consola
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

/**
 * Caso de prueba con datos de ejemplo
 * NOTA: Usar datos de una factura real para prueba verdadera
 */
const CASOS_PRUEBA = [
  {
    nombre: 'Factura de Prueba (datos ficticios)',
    datos: {
      rfcEmisor: 'EKU9003173C9',       // RFC de prueba SAT
      rfcReceptor: 'XEXX010101000',    // RFC genérico para extranjeros
      total: 1500.00,
      uuid: '6128396f-c09b-4ec6-8699-43c5f7e3b230' // UUID ficticio
    }
  },
  // Puedes agregar más casos de prueba aquí con facturas reales
];

async function probarConexionSAT() {
  console.log('');
  log(CYAN, '═══════════════════════════════════════════════════════════════');
  log(CYAN, '  PRUEBA DE CONEXIÓN CON SAT - Web Service CFDI');
  log(CYAN, '═══════════════════════════════════════════════════════════════');
  console.log('');

  // Verificar que el servidor esté corriendo
  log(BLUE, '1. Verificando servidor backend...');
  try {
    const health = await axios.get('http://localhost:3001/health');
    log(GREEN, `   ✅ Servidor activo: ${health.data.status}`);
    log(GREEN, `   ✅ Servicio SAT: ${health.data.sat_service}`);
  } catch (error) {
    log(RED, '   ❌ Servidor no disponible');
    log(RED, '   Ejecutar primero: node server/ocr-api.js');
    process.exit(1);
  }

  console.log('');
  log(BLUE, '2. Probando endpoint SAT...');

  // Probar cada caso
  for (const caso of CASOS_PRUEBA) {
    console.log('');
    log(YELLOW, `   📋 ${caso.nombre}`);
    log(YELLOW, `      RFC Emisor: ${caso.datos.rfcEmisor}`);
    log(YELLOW, `      RFC Receptor: ${caso.datos.rfcReceptor}`);
    log(YELLOW, `      Total: $${caso.datos.total}`);
    log(YELLOW, `      UUID: ${caso.datos.uuid.substring(0, 8)}...`);

    try {
      const startTime = Date.now();
      const response = await axios.post(API_URL, caso.datos);
      const duration = Date.now() - startTime;

      const result = response.data;

      console.log('');
      log(BLUE, '   📊 RESULTADO:');

      if (result.esValida) {
        log(GREEN, `      ✅ Estado: ${result.estado}`);
        log(GREEN, `      ✅ Permitir guardar: ${result.permitirGuardar}`);
      } else if (result.esCancelada) {
        log(RED, `      ❌ Estado: ${result.estado}`);
        log(RED, `      ❌ FACTURA CANCELADA - NO PERMITIR`);
      } else if (result.noEncontrada) {
        log(YELLOW, `      ⚠️ Estado: ${result.estado}`);
        log(YELLOW, `      ⚠️ FACTURA NO ENCONTRADA EN SAT`);
      } else {
        log(YELLOW, `      ⚠️ Estado: ${result.estado}`);
      }

      log(BLUE, `      📝 Mensaje: ${result.mensaje}`);
      log(BLUE, `      ⏱️ Tiempo: ${duration}ms`);

      if (result.codigoEstatus) {
        log(BLUE, `      📄 Código SAT: ${result.codigoEstatus}`);
      }

    } catch (error) {
      log(RED, `      ❌ Error: ${error.message}`);
      if (error.response) {
        log(RED, `      Detalle: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  console.log('');
  log(CYAN, '═══════════════════════════════════════════════════════════════');
  log(CYAN, '  PRUEBA COMPLETADA');
  log(CYAN, '═══════════════════════════════════════════════════════════════');
  console.log('');

  // Instrucciones
  log(BLUE, 'NOTAS:');
  console.log('');
  log(YELLOW, '• Para probar con una factura REAL, modifica los datos en CASOS_PRUEBA');
  log(YELLOW, '• Los datos deben coincidir EXACTAMENTE con los del CFDI:');
  log(YELLOW, '  - rfcEmisor: RFC del emisor de la factura');
  log(YELLOW, '  - rfcReceptor: RFC del receptor (tu empresa)');
  log(YELLOW, '  - total: Total exacto con 2 decimales');
  log(YELLOW, '  - uuid: UUID/Folio Fiscal del CFDI');
  console.log('');
  log(BLUE, 'Estados posibles del SAT:');
  log(GREEN, '  • Vigente: La factura es válida y activa');
  log(RED, '  • Cancelado: La factura fue cancelada - NO ACEPTAR');
  log(YELLOW, '  • No Encontrado: No existe en SAT - POSIBLE APÓCRIFA');
  console.log('');
}

// Ejecutar
probarConexionSAT().catch(error => {
  log(RED, `Error fatal: ${error.message}`);
  process.exit(1);
});
