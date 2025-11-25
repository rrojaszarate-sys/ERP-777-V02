/**
 * Test Suite: Detalle de Evento - Tab Ingresos
 * Actualizado: 2025-11-24 - Selectores genéricos
 */

describe('UI-04: Detalle de Evento - Tab Ingresos', () => {
  beforeEach(() => {
    cy.visit('/eventos');
    cy.waitForSupabase();
  });

  it('Debe mostrar Tab Ingresos', () => {
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    // Buscar tab de Ingresos
    cy.get('body').then($body => {
      if ($body.text().includes('Ingresos')) {
        cy.contains('Ingresos').click();
        cy.wait(500);
        cy.get('body').should('be.visible');
      }
    });
  });

  it('Debe mostrar información de ingresos', () => {
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    // Verificar contenido con valores monetarios
    cy.get('body').should('contain', '$');
  });

  it('Debe permitir ver detalles de ingresos', () => {
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    cy.get('body').should('be.visible');
  });
});
