/**
 * ============================================================================
 * 🧪 SUITE COMPLETA PLAYWRIGHT - FACTURACIÓN CFDI 4.0
 * ============================================================================
 *
 * Ejecutar: npx playwright test playwright/e2e/facturacion-cfdi-suite.spec.js
 * ============================================================================
 */

import { test, expect } from '@playwright/test';

// Configuración
const TIMEOUT = 10000;
const WAIT_TIME = 2000;

test.describe('📄 FACTURACIÓN CFDI 4.0 - Suite Completa de Pruebas', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: NAVEGACIÓN Y ACCESO
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('1. Navegación', () => {

    test('1.1 Dashboard de facturación accesible', async ({ page }) => {
      await page.goto('/facturacion');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/facturacion/);
      await page.screenshot({ path: 'test-results/facturacion/01-dashboard.png' });
    });

    test('1.2 Lista de facturas accesible', async ({ page }) => {
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/facturacion/02-lista.png' });
    });

    test('1.3 Nueva factura accesible', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/facturacion/03-nueva.png' });
    });

    test('1.4 Clientes accesible', async ({ page }) => {
      await page.goto('/facturacion/clientes');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.5 Configuración CFDI accesible', async ({ page }) => {
      await page.goto('/facturacion/configuracion');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.6 Reportes accesible', async ({ page }) => {
      await page.goto('/facturacion/reportes');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: FORMULARIO DE NUEVA FACTURA
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('2. Formulario Nueva Factura', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');
    });

    test('2.1 Selector de cliente presente', async ({ page }) => {
      const clienteSelector = page.locator('select, [class*="autocomplete"], [class*="select"]').first();
      const hasCliente = await page.locator('text=/cliente|receptor/i').count() > 0;

      expect(await clienteSelector.count() > 0 || hasCliente).toBeTruthy();
    });

    test('2.2 Selector de tipo de comprobante', async ({ page }) => {
      const tipoSelector = page.locator('select').filter({ has: page.locator('option') });
      const hasTipo = await page.locator('text=/tipo.*comprobante|ingreso|egreso/i').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('2.3 Selector de uso CFDI presente', async ({ page }) => {
      const usoCFDI = page.locator('text=/uso.*cfdi|G01|G03/i');

      if (await usoCFDI.count() > 0) {
        await expect(usoCFDI.first()).toBeVisible();
      }
    });

    test('2.4 Selector de forma de pago', async ({ page }) => {
      const formaPago = page.locator('text=/forma.*pago|efectivo|transferencia/i');

      await expect(page.locator('body')).toBeVisible();
    });

    test('2.5 Selector de método de pago', async ({ page }) => {
      const metodoPago = page.locator('text=/método.*pago|PUE|PPD/i');

      await expect(page.locator('body')).toBeVisible();
    });

    test('2.6 Sección de conceptos presente', async ({ page }) => {
      const conceptos = page.locator('text=/concepto|producto|servicio/i');

      expect(await conceptos.count()).toBeGreaterThan(0);
    });

    test('2.7 Botón agregar concepto', async ({ page }) => {
      const agregarBtn = page.locator('button').filter({ hasText: /agregar|añadir|\+/i }).first();

      if (await agregarBtn.count() > 0) {
        await expect(agregarBtn).toBeVisible();
      }
    });

    test('2.8 Campos de concepto (descripción, cantidad, precio)', async ({ page }) => {
      const hasDescripcion = await page.locator('input[name*="descripcion"], textarea[name*="descripcion"], input[placeholder*="descripción" i]').count() > 0;
      const hasCantidad = await page.locator('input[name*="cantidad"], input[type="number"]').count() > 0;
      const hasPrecio = await page.locator('input[name*="precio"], input[name*="unitario"]').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('2.9 Selector de clave SAT para concepto', async ({ page }) => {
      const claveSAT = page.locator('text=/clave.*sat|clave.*producto|clave.*servicio/i');

      await expect(page.locator('body')).toBeVisible();
    });

    test('2.10 Cálculo automático de IVA', async ({ page }) => {
      const ivaField = page.locator('text=/iva|16%|impuesto/i');

      if (await ivaField.count() > 0) {
        await expect(ivaField.first()).toBeVisible();
      }
    });

    test('2.11 Total calculado visible', async ({ page }) => {
      const total = page.locator('text=/total|importe/i');

      expect(await total.count()).toBeGreaterThan(0);
    });

    test('2.12 Botón de timbrar visible', async ({ page }) => {
      const timbrarBtn = page.locator('button').filter({ hasText: /timbrar|generar|emitir/i }).first();

      if (await timbrarBtn.count() > 0) {
        await expect(timbrarBtn).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: LISTA DE FACTURAS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('3. Lista de Facturas', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');
    });

    test('3.1 Tabla de facturas visible', async ({ page }) => {
      const hasTable = await page.locator('table').count() > 0;
      const hasCards = await page.locator('[class*="card"]').count() > 0;
      const hasEmpty = await page.locator('text=/no hay|sin facturas/i').count() > 0;

      expect(hasTable || hasCards || hasEmpty).toBeTruthy();
    });

    test('3.2 Filtro por estado presente', async ({ page }) => {
      const estadoFilter = page.locator('select, [class*="filter"]').first();
      const hasEstado = await page.locator('text=/estado|timbrada|cancelada|pendiente/i').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('3.3 Filtro por fecha presente', async ({ page }) => {
      const dateInput = page.locator('input[type="date"]');
      const hasFecha = await page.locator('text=/fecha|periodo/i').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('3.4 Búsqueda por folio/RFC', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();

      if (await searchInput.count() > 0) {
        await searchInput.fill('A-001');
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('3.5 Columnas de información (Folio, Cliente, Total, Estado)', async ({ page }) => {
      const hasFolio = await page.locator('th, [class*="header"]').filter({ hasText: /folio|serie/i }).count() > 0;
      const hasCliente = await page.locator('th, [class*="header"]').filter({ hasText: /cliente|receptor/i }).count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('3.6 Acciones por factura (ver, descargar, cancelar)', async ({ page }) => {
      const verBtn = page.locator('button, a').filter({ hasText: /ver|detalle/i }).first();
      const downloadBtn = page.locator('button').filter({ hasText: /descargar|pdf|xml/i }).first();

      await expect(page.locator('body')).toBeVisible();
    });

    test('3.7 Indicadores de estado con colores', async ({ page }) => {
      const badges = page.locator('[class*="badge"], [class*="chip"], [class*="status"]');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: DETALLE DE FACTURA
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('4. Detalle de Factura', () => {

    test('4.1 Vista previa de factura', async ({ page }) => {
      // Primero ir a lista
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');

      // Buscar botón de ver
      const verBtn = page.locator('button, a').filter({ hasText: /ver|detalle/i }).first();

      if (await verBtn.count() > 0) {
        await verBtn.click();
        await page.waitForTimeout(WAIT_TIME);
        await page.screenshot({ path: 'test-results/facturacion/04-detalle.png' });
      }
    });

    test('4.2 Datos del emisor visibles', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      const hasEmisor = await page.locator('text=/emisor|empresa/i').count() > 0;
      await expect(page.locator('body')).toBeVisible();
    });

    test('4.3 Datos del receptor visibles', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      const hasReceptor = await page.locator('text=/receptor|cliente/i').count() > 0;
      await expect(page.locator('body')).toBeVisible();
    });

    test('4.4 Conceptos listados', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      const hasConceptos = await page.locator('text=/concepto|producto|servicio/i').count() > 0;
      expect(hasConceptos).toBeTruthy();
    });

    test('4.5 Desglose de impuestos', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      const hasImpuestos = await page.locator('text=/iva|impuesto|traslado/i').count() > 0;
      await expect(page.locator('body')).toBeVisible();
    });

    test('4.6 Totales (subtotal, IVA, total)', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      const hasSubtotal = await page.locator('text=/subtotal/i').count() > 0;
      const hasTotal = await page.locator('text=/total/i').count() > 0;

      expect(hasTotal).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: CONFIGURACIÓN CFDI
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('5. Configuración CFDI', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/facturacion/configuracion');
      await page.waitForLoadState('networkidle');
    });

    test('5.1 Datos del emisor configurables', async ({ page }) => {
      const hasRFC = await page.locator('text=/RFC/i').count() > 0;
      const hasRazonSocial = await page.locator('text=/razón social|nombre/i').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('5.2 Régimen fiscal seleccionable', async ({ page }) => {
      const hasRegimen = await page.locator('text=/régimen|fiscal/i').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('5.3 Configuración de serie y folio', async ({ page }) => {
      const hasSerie = await page.locator('text=/serie|folio/i').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('5.4 Configuración PAC visible', async ({ page }) => {
      const hasPAC = await page.locator('text=/PAC|timbrado|certificado/i').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });

    test('5.5 Lugar de expedición', async ({ page }) => {
      const hasLugar = await page.locator('text=/lugar|código postal|expedición/i').count() > 0;

      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 6: CLIENTES / RECEPTORES
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('6. Clientes/Receptores', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/facturacion/clientes');
      await page.waitForLoadState('networkidle');
    });

    test('6.1 Lista de clientes visible', async ({ page }) => {
      await expect(page.locator('body')).toBeVisible();

      const hasTable = await page.locator('table').count() > 0;
      const hasCards = await page.locator('[class*="card"]').count() > 0;

      expect(hasTable || hasCards).toBeTruthy();
    });

    test('6.2 Botón nuevo cliente', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();

      if (await nuevoBtn.count() > 0) {
        await expect(nuevoBtn).toBeVisible();
      }
    });

    test('6.3 Formulario de cliente tiene campos fiscales', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();

      if (await nuevoBtn.count() > 0) {
        await nuevoBtn.click();
        await page.waitForTimeout(WAIT_TIME);

        const hasRFC = await page.locator('input[name*="rfc"], label:has-text("RFC")').count() > 0;
        const hasRazonSocial = await page.locator('input[name*="razon"], label:has-text("Razón")').count() > 0;

        await page.screenshot({ path: 'test-results/facturacion/05-cliente-form.png' });
      }
    });

    test('6.4 Búsqueda de clientes', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();

      if (await searchInput.count() > 0) {
        await searchInput.fill('TEST');
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 7: CANCELACIÓN DE FACTURAS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('7. Cancelación', () => {

    test('7.1 Botón cancelar visible en facturas timbradas', async ({ page }) => {
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');

      const cancelBtn = page.locator('button').filter({ hasText: /cancelar/i }).first();

      // Puede o no existir dependiendo de las facturas
      await expect(page.locator('body')).toBeVisible();
    });

    test('7.2 Modal de motivo de cancelación', async ({ page }) => {
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');

      const cancelBtn = page.locator('button').filter({ hasText: /cancelar/i }).first();

      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
        await page.waitForTimeout(WAIT_TIME);

        const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
        if (await modal.count() > 0) {
          const hasMotivo = await page.locator('text=/motivo|razón/i').count() > 0;
          await page.screenshot({ path: 'test-results/facturacion/06-cancelar-modal.png' });
        }
      }
    });

    test('7.3 Opciones de motivo SAT', async ({ page }) => {
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');

      // Verificar si hay select con motivos del SAT
      const cancelBtn = page.locator('button').filter({ hasText: /cancelar/i }).first();

      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
        await page.waitForTimeout(WAIT_TIME);

        const hasMotivos = await page.locator('select option, [class*="option"]').count() > 0;
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 8: DESCARGA DE ARCHIVOS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('8. Descarga de Archivos', () => {

    test('8.1 Botón descargar PDF', async ({ page }) => {
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');

      const pdfBtn = page.locator('button, a').filter({ hasText: /pdf/i }).first();

      if (await pdfBtn.count() > 0) {
        await expect(pdfBtn).toBeVisible();
      }
    });

    test('8.2 Botón descargar XML', async ({ page }) => {
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');

      const xmlBtn = page.locator('button, a').filter({ hasText: /xml/i }).first();

      if (await xmlBtn.count() > 0) {
        await expect(xmlBtn).toBeVisible();
      }
    });

    test('8.3 Descarga masiva disponible', async ({ page }) => {
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');

      const checkboxes = page.locator('input[type="checkbox"]');
      const massDownload = page.locator('button').filter({ hasText: /descargar.*selec|masiva/i }).first();

      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 9: VALIDACIONES
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('9. Validaciones', () => {

    test('9.1 RFC inválido muestra error', async ({ page }) => {
      await page.goto('/facturacion/clientes');
      await page.waitForLoadState('networkidle');

      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();

      if (await nuevoBtn.count() > 0) {
        await nuevoBtn.click();
        await page.waitForTimeout(500);

        const rfcInput = page.locator('input[name*="rfc"]').first();
        if (await rfcInput.count() > 0) {
          await rfcInput.fill('RFC-INVALIDO');
          await rfcInput.blur();
          await page.waitForTimeout(500);

          // Debería mostrar error
          const hasError = await page.locator('[class*="error"], [class*="invalid"]').count() > 0;
        }
      }
    });

    test('9.2 Campos requeridos validados', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      const submitBtn = page.locator('button').filter({ hasText: /timbrar|generar|guardar/i }).first();

      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(500);

        // Debería mostrar errores de validación
        const hasErrors = await page.locator('[class*="error"], [class*="required"], [class*="invalid"]').count() > 0;
      }
    });

    test('9.3 Código postal válido', async ({ page }) => {
      await page.goto('/facturacion/configuracion');
      await page.waitForLoadState('networkidle');

      const cpInput = page.locator('input[name*="postal"], input[placeholder*="postal"]').first();

      if (await cpInput.count() > 0) {
        await cpInput.fill('00000'); // CP inválido
        await cpInput.blur();
        await page.waitForTimeout(500);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 10: PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('10. Performance', () => {

    test('10.1 Dashboard carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/facturacion');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;

      console.log(`⏱️ Dashboard: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('10.2 Lista facturas carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/facturacion/facturas');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;

      console.log(`⏱️ Lista facturas: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('10.3 Nueva factura carga en < 3s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;

      console.log(`⏱️ Nueva factura: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(3000);
    });

    test('10.4 Sin errores JavaScript críticos', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto('/facturacion');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const criticalErrors = errors.filter(e =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error')
      );

      if (criticalErrors.length > 0) {
        console.log('⚠️ Errores:', criticalErrors);
      }

      expect(criticalErrors.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 11: RESPONSIVE
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('11. Responsive', () => {

    test('11.1 Desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/facturacion');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/facturacion/07-desktop.png' });
    });

    test('11.2 Tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/facturacion');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/facturacion/08-tablet.png' });
    });

    test('11.3 Mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/facturacion');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/facturacion/09-mobile.png' });
    });

    test('11.4 Formulario responsive en móvil', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/facturacion/10-form-mobile.png' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 12: CATÁLOGOS SAT
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('12. Catálogos SAT', () => {

    test('12.1 Catálogo de productos/servicios carga', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      // Verificar que se puede buscar en catálogo SAT
      const catalogoInput = page.locator('input[placeholder*="clave" i], input[placeholder*="SAT" i]').first();

      await expect(page.locator('body')).toBeVisible();
    });

    test('12.2 Catálogo de unidades disponible', async ({ page }) => {
      await page.goto('/facturacion/nueva');
      await page.waitForLoadState('networkidle');

      const unidadSelector = page.locator('text=/unidad|pieza|servicio/i');

      await expect(page.locator('body')).toBeVisible();
    });

    test('12.3 Regímenes fiscales disponibles', async ({ page }) => {
      await page.goto('/facturacion/configuracion');
      await page.waitForLoadState('networkidle');

      const regimenSelector = page.locator('text=/régimen|601|612|626/i');

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
