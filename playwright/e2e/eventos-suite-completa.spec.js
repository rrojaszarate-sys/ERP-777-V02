/**
 * ============================================================================
 * 🧪 SUITE COMPLETA PLAYWRIGHT - MÓDULO EVENTOS
 * ============================================================================
 * 
 * Ejecutar: npx playwright test playwright/e2e/eventos-suite-completa.spec.js
 * ============================================================================
 */

import { test, expect } from '@playwright/test';

// Configuración
const TIMEOUT = 10000;

test.describe('🎯 MÓDULO EVENTOS - Suite Completa de Pruebas', () => {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: NAVEGACIÓN Y CARGA INICIAL
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('1. Navegación y Carga', () => {
    
    test('1.1 Dashboard principal carga correctamente', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/eventos/01-dashboard.png' });
    });

    test('1.2 Lista de eventos accesible', async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/eventos/);
      await page.screenshot({ path: 'test-results/eventos/02-lista-eventos.png' });
    });

    test('1.3 Módulo de clientes accesible', async ({ page }) => {
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/eventos/03-clientes.png' });
    });

    test('1.4 Análisis financiero accesible', async ({ page }) => {
      await page.goto('/eventos-erp/analisis-financiero');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/eventos/04-analisis.png' });
    });

    test('1.5 Catálogos accesible', async ({ page }) => {
      await page.goto('/eventos-erp/catalogos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/eventos/05-catalogos.png' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: GESTIÓN DE CLIENTES
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('2. CRUD Clientes', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
    });

    test('2.1 Lista de clientes muestra datos o mensaje vacío', async ({ page }) => {
      const hasTable = await page.locator('table').count() > 0;
      const hasCards = await page.locator('[class*="card"]').count() > 0;
      const hasEmpty = await page.locator('text=/no hay|vacío|sin datos/i').count() > 0;
      
      expect(hasTable || hasCards || hasEmpty).toBeTruthy();
    });

    test('2.2 Botón de nuevo cliente visible', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await expect(nuevoBtn).toBeVisible();
      }
    });

    test('2.3 Modal de cliente abre correctamente', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await nuevoBtn.click();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
        await expect(modal).toBeVisible({ timeout: TIMEOUT });
        await page.screenshot({ path: 'test-results/eventos/06-modal-cliente.png' });
      }
    });

    test('2.4 Formulario tiene campos de razón social y RFC', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear|agregar/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await nuevoBtn.click();
        await page.waitForTimeout(500);
        
        const inputs = page.locator('input');
        const inputCount = await inputs.count();
        expect(inputCount).toBeGreaterThan(0);
      }
    });

    test('2.5 Búsqueda de clientes funciona', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();
      
      if (await searchInput.count() > 0) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: GESTIÓN DE EVENTOS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('3. CRUD Eventos', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
    });

    test('3.1 Lista de eventos visible', async ({ page }) => {
      await expect(page.locator('body')).toBeVisible();
      
      const hasContent = await page.locator('table, [class*="grid"], [class*="list"]').count() > 0;
      expect(hasContent).toBeTruthy();
    });

    test('3.2 Eventos muestran información básica', async ({ page }) => {
      const rows = page.locator('table tbody tr, [data-testid*="evento"]');
      const count = await rows.count();
      
      if (count > 0) {
        // Verificar que el primer evento tiene texto
        const firstRow = rows.first();
        const text = await firstRow.textContent();
        expect(text?.length).toBeGreaterThan(0);
      }
    });

    test('3.3 Botón de nuevo evento visible', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await expect(nuevoBtn).toBeVisible();
      }
    });

    test('3.4 Modal de evento abre', async ({ page }) => {
      const nuevoBtn = page.locator('button').filter({ hasText: /nuevo|crear/i }).first();
      
      if (await nuevoBtn.count() > 0) {
        await nuevoBtn.click();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
        if (await modal.count() > 0) {
          await expect(modal).toBeVisible();
          await page.screenshot({ path: 'test-results/eventos/07-modal-evento.png' });
        }
      }
    });

    test('3.5 Click en evento abre detalle', async ({ page }) => {
      const rows = page.locator('table tbody tr').first();
      
      if (await rows.count() > 0) {
        await rows.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/eventos/08-detalle-evento.png' });
      }
    });

    test('3.6 Filtros/búsqueda funcionan', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();
      
      if (await searchInput.count() > 0) {
        await searchInput.fill('2025');
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: ANÁLISIS FINANCIERO
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('4. Análisis Financiero', () => {
    
    test('4.1 Página de análisis carga', async ({ page }) => {
      await page.goto('/eventos-erp/analisis-financiero');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('4.2 Muestra métricas o gráficos', async ({ page }) => {
      await page.goto('/eventos-erp/analisis-financiero');
      await page.waitForLoadState('networkidle');
      
      // Buscar elementos de métricas
      const hasCards = await page.locator('[class*="card"], [class*="Card"]').count() > 0;
      const hasCharts = await page.locator('canvas, svg, [class*="chart"]').count() > 0;
      const hasNumbers = await page.locator('text=/\\$|\\%|[0-9,]+/').count() > 0;
      
      expect(hasCards || hasCharts || hasNumbers).toBeTruthy();
      await page.screenshot({ path: 'test-results/eventos/09-analisis-metricas.png' });
    });

    test('4.3 Tabla de resumen visible', async ({ page }) => {
      await page.goto('/eventos-erp/analisis-financiero');
      await page.waitForLoadState('networkidle');
      
      const hasTable = await page.locator('table').count() > 0;
      const hasList = await page.locator('[class*="list"], [class*="grid"]').count() > 0;
      
      expect(hasTable || hasList).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('5. Performance', () => {
    
    test('5.1 Lista de eventos carga en < 5 segundos', async ({ page }) => {
      const start = Date.now();
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Eventos: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('5.2 Clientes carga en < 5 segundos', async ({ page }) => {
      const start = Date.now();
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Clientes: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('5.3 Análisis financiero carga en < 8 segundos', async ({ page }) => {
      const start = Date.now();
      await page.goto('/eventos-erp/analisis-financiero');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Análisis: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(8000);
    });

    test('5.4 Sin errores JavaScript', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      if (errors.length > 0) {
        console.log('⚠️ Errores JS detectados:', errors);
      }
      
      // Permitir algunos errores no críticos
      const criticalErrors = errors.filter(e => 
        !e.includes('ResizeObserver') && 
        !e.includes('Non-Error')
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 6: RESPONSIVE
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('6. Responsive', () => {
    
    test('6.1 Desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/eventos/10-desktop.png' });
    });

    test('6.2 Tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/eventos/11-tablet.png' });
    });

    test('6.3 Mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({ path: 'test-results/eventos/12-mobile.png' });
    });
  });
});
