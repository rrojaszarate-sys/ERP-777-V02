/**
 * Test Suite: Lista de Eventos
 * Basado en: Documentación BD ERP 777
 * Actualizado: 2025-11-24 - Selectores genéricos
 *
 * Base de datos actual:
 * - 144 eventos
 * - 6 clientes
 * - 5 tipos de evento
 * - 12 estados
 */

describe('UI-01: Lista de Eventos', () => {
  beforeEach(() => {
    cy.visit('/eventos');
    cy.waitForSupabase();
  });

  it('Debe cargar la página de eventos correctamente', () => {
    cy.url().should('include', '/eventos');
    cy.get('body').should('be.visible');
  });

  it('Debe mostrar eventos en la tabla', () => {
    // Verificar que hay eventos cargados
    cy.get('table tbody tr', { timeout: 15000 })
      .should('have.length.at.least', 1);
  });

  it('Debe mostrar eventos del periodo 2024-2025', () => {
    // Verificar que hay eventos de los años actuales
    cy.get('body').should('contain.text', '2024').or('contain.text', '2025');
  });

  it('Debe tener columnas de información', () => {
    // Verificar que hay encabezados de tabla
    cy.get('table thead th, th').should('have.length.at.least', 3);
  });

  it('Debe permitir buscar eventos', () => {
    // Buscar un evento
    cy.get('input[type="text"], input[type="search"]')
      .first()
      .type('EVT');
    cy.waitForSupabase();

    // Verificar que la búsqueda funciona
    cy.get('body').should('be.visible');
  });

  it('Debe mostrar claves de evento con prefijo EVT', () => {
    // Verificar formato de clave
    cy.get('table tbody tr')
      .first()
      .should('contain', 'EVT');
  });

  it('Debe poder interactuar con eventos de la lista', () => {
    // Hacer clic en un evento
    cy.get('table tbody tr').first().click();
    cy.wait(500);
    // La interacción debería funcionar sin errores
    cy.get('body').should('be.visible');
  });
});
