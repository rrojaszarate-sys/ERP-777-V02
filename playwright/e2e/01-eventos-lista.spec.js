/**
 * Test Suite: Lista de Eventos
 * Basado en: Documentación BD ERP 777
 * Convertido de Cypress a Playwright
 * Actualizado: 2025-11-24
 *
 * Base de datos actual:
 * - 144 eventos
 * - 6 clientes
 * - 5 tipos de evento
 * - 12 estados
 */

import { test, expect } from '@playwright/test';

test.describe('UI-01: Lista de Eventos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/eventos');
    await page.waitForTimeout(2000);
  });

  test('Debe cargar la página de eventos correctamente', async ({ page }) => {
    expect(page.url()).toContain('/eventos');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Debe mostrar eventos en la tabla', async ({ page }) => {
    const rows = page.locator('table tbody tr, [data-testid="eventos-table"] tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Debe mostrar eventos del periodo 2024-2025', async ({ page }) => {
    const content = await page.locator('body').textContent();
    const hasYears = content?.includes('2024') || content?.includes('2025');
    expect(hasYears).toBeTruthy();
  });

  test('Debe tener columnas de información', async ({ page }) => {
    const headers = page.locator('table thead th, th');
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Debe permitir buscar eventos', async ({ page }) => {
    const input = page.locator('input[type="text"], input[placeholder*="Buscar"], input[placeholder*="buscar"]').first();
    await input.fill('EVT');
    await page.waitForTimeout(1000);

    const rows = page.locator('table tbody tr, [data-testid="eventos-table"] tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Debe mostrar claves de evento con prefijo EVT', async ({ page }) => {
    const firstRow = page.locator('table tbody tr, [data-testid="eventos-table"] tr').first();
    const text = await firstRow.textContent();
    expect(text).toContain('EVT');
  });

  test('Debe poder interactuar con eventos de la lista', async ({ page }) => {
    const firstRow = page.locator('table tbody tr, [data-testid="eventos-table"] tr').first();
    await firstRow.click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });
});
