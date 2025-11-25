/**
 * Test Suite: Vista Financiera Global
 * Basado en: MANUAL_PRUEBAS_COMPLETO.md - Prueba UI 6
 */

describe('UI-06: Vista Financiera Global', () => {
  beforeEach(() => {
    cy.visit('/reportes/financiero');
    cy.waitForSupabase();
  });

  it('Debe mostrar dashboard financiero', () => {
    // Verificar que la página carga
    cy.contains(/Análisis Financiero|Dashboard Financiero/i).should('be.visible');
  });

  it('Debe mostrar tarjetas de resumen con métricas clave', () => {
    // Verificar tarjetas de métricas
    const metricasEsperadas = [
      'Total Provisiones',
      'Total Gastos',
      'Total Ingresos',
      'Margen Utilidad'
    ];

    metricasEsperadas.forEach(metrica => {
      cy.contains(metrica, { matchCase: false }).should('be.visible');
    });
  });

  it('Debe calcular Total de Provisiones correctamente', () => {
    // Obtener valor mostrado
    cy.get('[data-testid="total-provisiones"]')
      .invoke('text')
      .then(text => {
        const total = parseFloat(text.replace(/[$,]/g, ''));

        // Verificar que es un número válido y positivo
        expect(total).to.be.a('number');
        expect(total).to.be.greaterThan(0);

        // Para 72 eventos con provisión promedio ~$121,921
        // Total esperado: ~$8,778,317
        expect(total).to.be.closeTo(8778317, 500000);
      });
  });

  it('Debe calcular Total de Gastos correctamente', () => {
    cy.get('[data-testid="total-gastos"]')
      .invoke('text')
      .then(text => {
        const total = parseFloat(text.replace(/[$,]/g, ''));

        // Verificar que es un número válido
        expect(total).to.be.a('number');
        expect(total).to.be.greaterThan(0);

        // Para 648 gastos, total esperado: ~$8,589,260
        expect(total).to.be.closeTo(8589260, 500000);
      });
  });

  it('Debe verificar que gastos NO exceden provisiones + 10%', () => {
    cy.get('[data-testid="total-provisiones"]')
      .invoke('text')
      .then(provisionText => {
        const totalProvisiones = parseFloat(provisionText.replace(/[$,]/g, ''));
        const limiteMaximo = totalProvisiones * 1.10;

        cy.get('[data-testid="total-gastos"]')
          .invoke('text')
          .then(gastosText => {
            const totalGastos = parseFloat(gastosText.replace(/[$,]/g, ''));

            expect(totalGastos, 'Gastos totales no deben exceder provisiones + 10%')
              .to.be.at.most(limiteMaximo);
          });
      });
  });

  it('Debe mostrar gráfico de distribución de gastos por categoría', () => {
    // Verificar que existe gráfico
    cy.get('[data-testid="grafico-gastos-categoria"]').should('be.visible');

    // Verificar que muestra las 4 categorías
    const categorias = [
      'Combustible',
      'Materiales',
      'Recursos Humanos',
      'Solicitudes de Pago'
    ];

    categorias.forEach(categoria => {
      cy.contains(categoria, { matchCase: false }).should('be.visible');
    });
  });

  it('Debe mostrar gráfico de evolución temporal', () => {
    // Verificar gráfico de línea o barras temporal
    cy.get('[data-testid="grafico-evolucion-temporal"]').should('be.visible');

    // Verificar que muestra datos de 3 años
    cy.contains('2023').should('be.visible');
    cy.contains('2024').should('be.visible');
    cy.contains('2025').should('be.visible');
  });

  it('Debe permitir filtrar por rango de fechas', () => {
    // Seleccionar filtro de fecha
    cy.get('[data-testid="filtro-fecha-desde"]').click();
    cy.get('.react-datepicker').within(() => {
      cy.contains('2023').click();
      cy.contains('Jan').click();
      cy.contains('1').click();
    });

    cy.get('[data-testid="filtro-fecha-hasta"]').click();
    cy.get('.react-datepicker').within(() => {
      cy.contains('2023').click();
      cy.contains('Dec').click();
      cy.contains('31').click();
    });

    cy.waitForSupabase();

    // Verificar que se actualizan las métricas
    cy.get('[data-testid="total-provisiones"]')
      .should('be.visible')
      .and('not.contain', '$0');
  });

  it('Debe mostrar tabla de eventos con métricas financieras', () => {
    // Verificar que existe tabla
    cy.get('[data-testid="tabla-eventos-financiero"]').should('be.visible');

    // Verificar columnas
    const columnasEsperadas = [
      'Evento',
      'Provisión',
      'Gastos',
      'Ingresos',
      'Margen'
    ];

    columnasEsperadas.forEach(columna => {
      cy.contains('th', columna, { matchCase: false }).should('be.visible');
    });
  });

  it('Debe calcular margen de utilidad estimado', () => {
    // Obtener ingresos y gastos
    cy.get('[data-testid="total-ingresos"]')
      .invoke('text')
      .then(ingresosText => {
        const ingresos = parseFloat(ingresosText.replace(/[$,]/g, '')) || 0;

        cy.get('[data-testid="total-gastos"]')
          .invoke('text')
          .then(gastosText => {
            const gastos = parseFloat(gastosText.replace(/[$,]/g, ''));

            const margenEsperado = ingresos - gastos;

            // Verificar margen mostrado
            cy.get('[data-testid="margen-utilidad"]')
              .invoke('text')
              .then(margenText => {
                const margenMostrado = parseFloat(margenText.replace(/[$,]/g, ''));

                if (ingresos > 0) {
                  expect(margenMostrado).to.be.closeTo(margenEsperado, 100);
                }
              });
          });
      });
  });

  it('Debe permitir exportar reporte a Excel', () => {
    // Verificar que existe botón de exportar
    cy.contains('button', /Exportar|Excel/i).should('be.visible');
  });

  it('Debe mostrar indicadores de alerta para eventos fuera de presupuesto', () => {
    // Buscar eventos con gastos > provisión
    cy.get('[data-testid="tabla-eventos-financiero"] tbody tr').each(($row) => {
      cy.wrap($row).within(() => {
        // Obtener provisión y gastos
        cy.get('[data-testid="evento-provision"]')
          .invoke('text')
          .then(provText => {
            const provision = parseFloat(provText.replace(/[$,]/g, ''));

            cy.get('[data-testid="evento-gastos"]')
              .invoke('text')
              .then(gastosText => {
                const gastos = parseFloat(gastosText.replace(/[$,]/g, ''));

                // Si gastos > provisión, debe mostrar alerta
                if (gastos > provision * 1.10) {
                  cy.get('[data-testid="alerta-presupuesto"]')
                    .should('be.visible')
                    .and('have.class', 'text-danger');
                }
              });
          });
      });
    });
  });
});
