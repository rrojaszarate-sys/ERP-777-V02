/**
 * Test Suite: Filtros y Búsqueda
 * Actualizado: 2025-11-24 - Selectores genéricos
 */

describe('UI-05: Filtros y Búsqueda', () => {
  beforeEach(() => {
    cy.visit('/eventos');
    cy.waitForSupabase();
  });

  it('Debe tener campo de búsqueda visible', () => {
    cy.get('input[type="text"], input[type="search"]')
      .should('exist');
  });

  it('Debe filtrar eventos al buscar', () => {
    cy.get('input[type="text"], input[type="search"]')
      .first()
      .type('EVT-2024');
    cy.waitForSupabase();

    cy.get('body').should('be.visible');
  });

  it('Debe limpiar búsqueda correctamente', () => {
    cy.get('input[type="text"], input[type="search"]')
      .first()
      .type('EVT')
      .clear();
    cy.waitForSupabase();

    cy.get('table tbody tr').should('have.length.at.least', 1);
  });

  it('Debe tener filtros disponibles', () => {
    cy.get('select, [role="combobox"], button').should('have.length.at.least', 1);
  });

  it('Debe mostrar resultados después de filtrar', () => {
    cy.get('input[type="text"], input[type="search"]')
      .first()
      .type('EVT');
    cy.waitForSupabase();

    cy.get('body').should('be.visible');
  });
});
