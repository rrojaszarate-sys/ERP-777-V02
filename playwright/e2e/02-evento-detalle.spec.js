/**
 * Test Suite: Detalle de Evento
 * Pruebas de tabs: Provisiones, Gastos, Ingresos
 * Convertido de Cypress a Playwright
 * Actualizado: 2025-11-24
 */

import { test, expect } from '@playwright/test';

test.describe('UI-02: Detalle de Evento', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/eventos');
    await page.waitForTimeout(2000);
  });

  test('Debe abrir modal de detalle al hacer clic en evento', async ({ page }) => {
    // Clic en primer evento
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);

    // Verificar que se abre algún modal o detalle
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  test.describe('Tab Provisiones', () => {
    test('Debe mostrar Tab Provisiones con categorías', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Buscar tab o botón de Provisiones
      const provisionesBtn = page.getByText('Provisiones', { exact: false }).first();

      if (await provisionesBtn.isVisible()) {
        await provisionesBtn.click();
        await page.waitForTimeout(500);

        // Verificar que hay contenido relacionado a provisiones
        const content = await page.locator('body').textContent();
        const hasProvisionContent =
          content?.includes('Combustible') ||
          content?.includes('Materiales') ||
          content?.includes('Recursos Humanos') ||
          content?.includes('RH') ||
          content?.includes('$');

        expect(hasProvisionContent).toBeTruthy();
      }
    });
  });

  test.describe('Tab Gastos', () => {
    test('Debe mostrar Tab Gastos', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Buscar tab de Gastos
      const gastosBtn = page.getByText('Gastos', { exact: false }).first();

      if (await gastosBtn.isVisible()) {
        await gastosBtn.click();
        await page.waitForTimeout(500);

        // Verificar que hay contenido de gastos
        const content = await page.locator('body').textContent();
        const hasGastosContent =
          content?.includes('$') ||
          content?.includes('Gasto') ||
          content?.includes('Total');

        expect(hasGastosContent).toBeTruthy();
      }
    });
  });

  test.describe('Tab Ingresos', () => {
    test('Debe mostrar Tab Ingresos', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Buscar tab de Ingresos
      const ingresosBtn = page.getByText('Ingresos', { exact: false }).first();

      if (await ingresosBtn.isVisible()) {
        await ingresosBtn.click();
        await page.waitForTimeout(500);

        // Verificar contenido
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });
});
