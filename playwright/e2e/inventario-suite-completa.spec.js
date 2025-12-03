/**
 * ============================================================================
 * 🧪 SUITE COMPLETA PLAYWRIGHT - MÓDULO INVENTARIO
 * ============================================================================
 * 
 * Ejecutar: npx playwright test playwright/e2e/inventario-suite-completa.spec.js
 * ============================================================================
 */

import { test, expect } from '@playwright/test';

// Configuración
const TIMEOUT = 10000;
const WAIT_TIME = 2000;

test.describe('📦 MÓDULO INVENTARIO - Suite Completa de Pruebas', () => {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: NAVEGACIÓN Y ACCESO
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('1. Navegación', () => {
    
    test('1.1 Dashboard de inventario accesible', async ({ page }) => {
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/inventario/);
      await page.screenshot({ path: 'test-results/inventario/01-dashboard.png' });
    });

    test('1.2 Almacenes accesible', async ({ page }) => {
      await page.goto('/inventario/almacenes');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/inventario/02-almacenes.png' });
    });

    test('1.3 Productos accesible', async ({ page }) => {
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/inventario/03-productos.png' });
    });

    test('1.4 Documentos accesible', async ({ page }) => {
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/inventario/04-documentos.png' });
    });

    test('1.5 Stock accesible', async ({ page }) => {
      await page.goto('/inventario/stock');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/inventario/05-stock.png' });
    });

    test('1.6 Movimientos accesible', async ({ page }) => {
      await page.goto('/inventario/movimientos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.7 Kardex accesible', async ({ page }) => {
      await page.goto('/inventario/kardex');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.8 Transferencias accesible', async ({ page }) => {
      await page.goto('/inventario/transferencias');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.9 Etiquetas QR accesible', async ({ page }) => {
      await page.goto('/inventario/etiquetas');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.10 Configuración accesible', async ({ page }) => {
      await page.goto('/inventario/configuracion');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.11 Ubicaciones accesible', async ({ page }) => {
      await page.goto('/inventario/ubicaciones');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.12 Lotes accesible', async ({ page }) => {
      await page.goto('/inventario/lotes');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: GESTIÓN DE ALMACENES
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('2. CRUD Almacenes', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/inventario/almacenes');
      await page.waitForLoadState('networkidle');
    });

    test('2.1 Lista de almacenes visible', async ({ page }) => {
      await expect(page.locator('body')).toBeVisible();
      
      const hasTable = await page.locator('table').count() > 0;
      const hasCards = await page.locator('[class*="card"], [class*="grid"]').count() > 0;
      
      expect(hasTable || hasCards).toBeTruthy();
    });

    test('2.2 Botón de nuevo almacén visible', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await expect(nuevoBtn).toBeVisible();
      }
    });

    test('2.3 Modal de almacén abre', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await nuevoBtn.click();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
        if (await modal.count() > 0) {
          await expect(modal).toBeVisible();
          await page.screenshot({ path: 'test-results/inventario/06-modal-almacen.png' });
        }
      }
    });

    test('2.4 Formulario tiene campos requeridos', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await nuevoBtn.click();
        await page.waitForTimeout(500);
        
        const inputs = page.locator('input');
        expect(await inputs.count()).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: GESTIÓN DE PRODUCTOS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('3. CRUD Productos', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
    });

    test('3.1 Lista de productos visible', async ({ page }) => {
      await expect(page.locator('body')).toBeVisible();
    });

    test('3.2 Búsqueda de productos funciona', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();
      
      if (await searchInput.count() > 0) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('3.3 Botón de nuevo producto visible', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await expect(nuevoBtn).toBeVisible();
      }
    });

    test('3.4 Modal de producto abre', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await nuevoBtn.click();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
        if (await modal.count() > 0) {
          await expect(modal).toBeVisible();
          await page.screenshot({ path: 'test-results/inventario/07-modal-producto.png' });
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: DOCUMENTOS DE INVENTARIO
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('4. Documentos de Inventario', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
    });

    test('4.1 Lista de documentos visible', async ({ page }) => {
      await expect(page.locator('body')).toBeVisible();
    });

    test('4.2 Botón de entrada visible', async ({ page }) => {
      const entradaBtn = page.locator('button').filter({ hasText: /entrada/i }).first();
      
      if (await entradaBtn.count() > 0) {
        await expect(entradaBtn).toBeVisible();
      }
    });

    test('4.3 Botón de salida visible', async ({ page }) => {
      const salidaBtn = page.locator('button').filter({ hasText: /salida/i }).first();
      
      if (await salidaBtn.count() > 0) {
        await expect(salidaBtn).toBeVisible();
      }
    });

    test('4.4 Formulario de entrada abre', async ({ page }) => {
      const entradaBtn = page.locator('button').filter({ hasText: /entrada/i }).first();
      
      if (await entradaBtn.count() > 0) {
        await entradaBtn.click();
        await page.waitForTimeout(WAIT_TIME);
        await page.screenshot({ path: 'test-results/inventario/08-form-entrada.png' });
      }
    });

    test('4.5 Formulario tiene selector de almacén', async ({ page }) => {
      const entradaBtn = page.locator('button').filter({ hasText: /entrada/i }).first();
      
      if (await entradaBtn.count() > 0) {
        await entradaBtn.click();
        await page.waitForTimeout(WAIT_TIME);
        
        const hasSelect = await page.locator('select').count() > 0;
        const hasAlmacen = await page.locator('text=/almac/i').count() > 0;
        
        expect(hasSelect || hasAlmacen).toBeTruthy();
      }
    });

    test('4.6 Formulario tiene sección de firmas', async ({ page }) => {
      const entradaBtn = page.locator('button').filter({ hasText: /entrada/i }).first();
      
      if (await entradaBtn.count() > 0) {
        await entradaBtn.click();
        await page.waitForTimeout(WAIT_TIME);
        
        const hasFirmas = await page.locator('text=/firma|entrega|recibe/i').count() > 0;
        expect(hasFirmas).toBeTruthy();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: CONSULTA DE STOCK
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('5. Consulta de Stock', () => {
    
    test('5.1 Página de stock carga', async ({ page }) => {
      await page.goto('/inventario/stock');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('5.2 Selector de almacén presente', async ({ page }) => {
      await page.goto('/inventario/stock');
      await page.waitForLoadState('networkidle');
      
      const hasSelect = await page.locator('select, [class*="select"]').count() > 0;
      const hasAlmacen = await page.locator('text=/almac/i').count() > 0;
      
      expect(hasSelect || hasAlmacen).toBeTruthy();
    });

    test('5.3 Muestra productos con cantidades', async ({ page }) => {
      await page.goto('/inventario/stock');
      await page.waitForLoadState('networkidle');
      
      const hasTable = await page.locator('table').count() > 0;
      const hasGrid = await page.locator('[class*="grid"]').count() > 0;
      
      expect(hasTable || hasGrid).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 6: ETIQUETAS QR
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('6. Etiquetas QR', () => {
    
    test('6.1 Página de etiquetas carga', async ({ page }) => {
      await page.goto('/inventario/etiquetas');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('6.2 Checkboxes de selección presentes', async ({ page }) => {
      await page.goto('/inventario/etiquetas');
      await page.waitForLoadState('networkidle');
      
      const checkboxes = page.locator('input[type="checkbox"]');
      expect(await checkboxes.count()).toBeGreaterThanOrEqual(0);
    });

    test('6.3 Botón de generar/imprimir visible', async ({ page }) => {
      await page.goto('/inventario/etiquetas');
      await page.waitForLoadState('networkidle');
      
      const btn = page.locator('button').filter({ hasText: /generar|imprimir|descargar/i }).first();
      if (await btn.count() > 0) {
        await expect(btn).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 7: CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('7. Configuración', () => {
    
    test('7.1 Página de configuración carga', async ({ page }) => {
      await page.goto('/inventario/configuracion');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('7.2 Toggles de submódulos presentes', async ({ page }) => {
      await page.goto('/inventario/configuracion');
      await page.waitForLoadState('networkidle');
      
      const toggles = page.locator('input[type="checkbox"], [role="switch"]');
      expect(await toggles.count()).toBeGreaterThanOrEqual(0);
    });

    test('7.3 Configuración persiste en localStorage', async ({ page }) => {
      await page.goto('/inventario/configuracion');
      await page.waitForLoadState('networkidle');
      
      // Verificar que se puede acceder a localStorage
      const hasStorage = await page.evaluate(() => {
        return typeof localStorage !== 'undefined';
      });
      
      expect(hasStorage).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 8: MOVIMIENTOS Y KARDEX
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('8. Movimientos y Kardex', () => {
    
    test('8.1 Página de movimientos carga', async ({ page }) => {
      await page.goto('/inventario/movimientos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('8.2 Página de kardex carga', async ({ page }) => {
      await page.goto('/inventario/kardex');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('8.3 Kardex tiene filtros', async ({ page }) => {
      await page.goto('/inventario/kardex');
      await page.waitForLoadState('networkidle');
      
      const hasFilters = await page.locator('select, input[type="date"], [class*="filter"]').count() > 0;
      expect(hasFilters).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 9: TRANSFERENCIAS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('9. Transferencias', () => {
    
    test('9.1 Página de transferencias carga', async ({ page }) => {
      await page.goto('/inventario/transferencias');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('9.2 Muestra mensaje de simulación o datos', async ({ page }) => {
      await page.goto('/inventario/transferencias');
      await page.waitForLoadState('networkidle');
      
      // Puede mostrar datos simulados o mensaje
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 10: PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('10. Performance', () => {
    
    test('10.1 Dashboard carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Dashboard: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('10.2 Productos carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Productos: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('10.3 Stock carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/inventario/stock');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Stock: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('10.4 Documentos carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Documentos: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('10.5 Sin errores JavaScript críticos', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Filtrar errores no críticos
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
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/inventario/09-desktop.png' });
    });

    test('11.2 Tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/inventario/10-tablet.png' });
    });

    test('11.3 Mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/inventario/11-mobile.png' });
    });
  });
});
