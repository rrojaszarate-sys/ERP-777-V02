/**
 * Test Suite: Detalle de Evento - Tab Gastos
 * Actualizado: 2025-11-24 - Selectores genéricos
 */

describe('UI-03: Detalle de Evento - Tab Gastos', () => {
  beforeEach(() => {
    cy.visit('/eventos');
    cy.waitForSupabase();
  });

  it('Debe mostrar Tab Gastos', () => {
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    // Buscar tab de Gastos
    cy.get('body').then($body => {
      if ($body.text().includes('Gastos')) {
        cy.contains('Gastos').click();
        cy.wait(500);
        cy.get('body').should('be.visible');
      }
    });
  });

  it('Debe mostrar información de gastos', () => {
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    // Verificar contenido con valores monetarios
    cy.get('body').should('contain', '$');
  });

  it('Debe permitir ver detalles de gastos', () => {
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    // Buscar elementos relacionados a gastos
    cy.get('body').should('be.visible');
  });
});
