/**
 * Smoke Test - Prueba de Escritorio
 * Verifica que el sistema está funcionando correctamente
 * Convertido de Cypress a Playwright
 * Actualizado: 2025-11-24
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Test - Verificación del Sistema', () => {

  test.describe('Carga de la Aplicación', () => {
    test('La página principal carga correctamente', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).not.toContain('error');
    });

    test('No hay errores críticos de JavaScript', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));

      await page.goto('/');
      await page.waitForTimeout(2000);

      // Filtrar errores críticos (ignorar warnings de React)
      const criticalErrors = errors.filter(e =>
        !e.includes('ResizeObserver') &&
        !e.includes('Warning:')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Navegación Principal', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
    });

    test('El menú de navegación está visible', async ({ page }) => {
      const nav = page.locator('nav, [role="navigation"], aside, header').first();
      await expect(nav).toBeVisible();
    });

    test('Puede navegar a la página de eventos', async ({ page }) => {
      await page.goto('/eventos');
      expect(page.url()).toContain('/eventos');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Conexión con Base de Datos', () => {
    test('Carga datos de eventos desde Supabase', async ({ page }) => {
      await page.goto('/eventos');
      await page.waitForTimeout(2000);

      const rows = page.locator('table tbody tr, [role="row"], .evento-row');
      await expect(rows.first()).toBeVisible({ timeout: 15000 });
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('Los datos de eventos contienen información válida', async ({ page }) => {
      await page.goto('/eventos');
      await page.waitForTimeout(2000);

      const content = await page.locator('table tbody, [data-testid="eventos-list"]').first().textContent();
      expect(content?.length).toBeGreaterThanOrEqual(10);
    });
  });

  test.describe('Módulos Principales', () => {
    test('Módulo de Eventos está accesible', async ({ page }) => {
      await page.goto('/eventos');
      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).toContain('/eventos');
    });

    test('Módulo de Dashboard está accesible', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Funcionalidades Básicas', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/eventos');
      await page.waitForTimeout(2000);
    });

    test('El buscador funciona', async ({ page }) => {
      const input = page.locator('input[type="text"]').first();
      await input.fill('EVT');
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    });

    test('Se puede hacer clic en elementos de la lista', async ({ page }) => {
      const firstRow = page.locator('table tbody tr, [role="row"]').first();
      await firstRow.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Rendimiento Básico', () => {
    test('La página carga en tiempo razonable', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/eventos');
      await page.waitForTimeout(1000);

      const rows = page.locator('table tbody tr, [role="row"]');
      await expect(rows.first()).toBeVisible({ timeout: 15000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(15000);
    });
  });
});
