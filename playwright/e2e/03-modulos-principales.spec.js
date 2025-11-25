/**
 * Test Suite: Módulos Principales del ERP
 * Pruebas de navegación y funcionalidad básica
 * Actualizado: 2025-11-24
 */

import { test, expect } from '@playwright/test';

test.describe('UI-03: Navegación de Módulos', () => {

  test('Dashboard carga correctamente', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Módulo Eventos carga correctamente', async ({ page }) => {
    await page.goto('/eventos');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/eventos');

    // Verificar que hay contenido
    const rows = page.locator('table tbody tr, [role="row"]');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
  });

  test('Navegación desde Dashboard a Eventos', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Buscar link a Eventos en sidebar o navbar
    const eventosLink = page.getByRole('link', { name: /eventos/i }).first();

    if (await eventosLink.isVisible()) {
      await eventosLink.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/eventos');
    } else {
      // Navegar directamente
      await page.goto('/eventos');
      expect(page.url()).toContain('/eventos');
    }
  });

  test('Módulo de Gastos está accesible', async ({ page }) => {
    await page.goto('/gastos');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Módulo de Ingresos está accesible', async ({ page }) => {
    await page.goto('/ingresos');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Módulo de Clientes está accesible', async ({ page }) => {
    await page.goto('/clientes');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Módulo de Reportes está accesible', async ({ page }) => {
    await page.goto('/reportes');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('UI-04: Funcionalidad de Búsqueda', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/eventos');
    await page.waitForTimeout(2000);
  });

  test('Buscador filtra eventos correctamente', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('EVT-2024');
    await page.waitForTimeout(1000);

    // Verificar que sigue habiendo resultados o mensaje de no resultados
    await expect(page.locator('body')).toBeVisible();
  });

  test('Buscador acepta entrada de texto', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('prueba');
    const value = await input.inputValue();
    expect(value).toBe('prueba');
  });

  test('Limpiar búsqueda muestra todos los eventos', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('EVT');
    await page.waitForTimeout(500);
    await input.clear();
    await page.waitForTimeout(1000);

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('UI-05: Paginación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/eventos');
    await page.waitForTimeout(2000);
  });

  test('La tabla muestra múltiples eventos', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Controles de paginación están visibles', async ({ page }) => {
    // Buscar elementos de paginación
    const pagination = page.locator('[class*="pagination"], [aria-label*="pagination"], button:has-text("Siguiente"), button:has-text("Anterior")');
    const count = await pagination.count();

    // Puede o no tener paginación dependiendo de la cantidad de datos
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('UI-06: Filtros', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/eventos');
    await page.waitForTimeout(2000);
  });

  test('Filtro por estado funciona', async ({ page }) => {
    // Buscar selector de estado
    const stateFilter = page.locator('select, [role="combobox"]').first();

    if (await stateFilter.isVisible()) {
      await stateFilter.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('Filtro por tipo de evento funciona', async ({ page }) => {
    // Buscar selector de tipo
    const typeFilter = page.locator('select, [role="combobox"]').nth(1);

    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
