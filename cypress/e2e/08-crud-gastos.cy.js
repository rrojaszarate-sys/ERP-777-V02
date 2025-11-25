/**
 * Test Suite: CRUD de Gastos
 * Basado en: MANUAL_PRUEBAS_COMPLETO.md - Prueba UI 8
 */

describe('UI-08: CRUD de Gastos', () => {
  const gastoTest = {
    descripcion: `Gasto de Prueba ${Date.now()}`,
    total: 5000,
    tipo_comprobante: 'E'
  };

  beforeEach(() => {
    cy.visit('/eventos');
    cy.waitForSupabase();

    // Abrir primer evento
    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.get('[data-testid="evento-detail-modal"]').should('be.visible');

    // Ir a tab Gastos
    cy.contains('Gastos').click();
  });

  it('Debe mostrar botón para agregar nuevo gasto', () => {
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).should('be.visible');
  });

  it('Debe abrir modal de crear gasto', () => {
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();
    cy.get('[data-testid="modal-crear-gasto"]').should('be.visible');
  });

  it('Debe permitir crear nuevo gasto', () => {
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();

    // Llenar formulario
    cy.get('input[name="descripcion"]').type(gastoTest.descripcion);

    // Seleccionar fecha
    cy.get('input[name="fecha"]').click();
    cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();

    // Seleccionar categoría
    cy.get('select[name="categoria_id"]').select(1);

    // Ingresar total
    cy.get('input[name="total"]').clear().type(gastoTest.total.toString());

    // Seleccionar tipo de comprobante
    cy.get('select[name="tipo_comprobante"]').select('E');

    // Marcar como pagado/pendiente
    cy.get('input[type="checkbox"][name="pagado"]').check();

    // Guardar
    cy.contains('button', /Guardar|Crear/i).click();
    cy.waitForSupabase();

    // Verificar que se creó
    cy.contains('Gasto creado exitosamente').should('be.visible');
    cy.contains(gastoTest.descripcion).should('be.visible');
  });

  it('Debe validar que total del gasto es numérico y positivo', () => {
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();

    // Intentar con valor inválido
    cy.get('input[name="total"]').clear().type('-100');
    cy.contains('button', /Guardar|Crear/i).click();

    // Verificar mensaje de error
    cy.contains(/debe ser positivo|valor inválido/i).should('be.visible');
  });

  it('Debe validar que tipo de comprobante es válido (E, N, P)', () => {
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();

    // Verificar opciones de tipo de comprobante
    cy.get('select[name="tipo_comprobante"]').within(() => {
      cy.contains('E').should('exist');
      cy.contains('N').should('exist');
      cy.contains('P').should('exist');
    });
  });

  it('Debe advertir si gasto excede provisión de la categoría', () => {
    // Obtener provisión de categoría
    cy.get('[data-category="combustible"] [data-testid="categoria-total"]')
      .invoke('text')
      .then(provisionText => {
        const provision = parseFloat(provisionText.replace(/[$,]/g, ''));

        // Intentar crear gasto mayor
        cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();

        cy.get('input[name="descripcion"]').type('Gasto que excede provisión');
        cy.get('select[name="categoria_id"]').select('Combustible y Peaje');
        cy.get('input[name="total"]').clear().type((provision * 2).toString());

        // Debería mostrar advertencia
        cy.contains(/excede la provisión|alerta de presupuesto/i)
          .should('be.visible');
      });
  });

  it('Debe permitir editar gasto existente', () => {
    // Seleccionar primer gasto
    cy.get('[data-testid="gasto-item"]').first().click();

    // Clic en botón editar
    cy.contains('button', /Editar/i).click();

    // Modificar descripción
    const nuevaDescripcion = `Gasto Editado ${Date.now()}`;
    cy.get('input[name="descripcion"]').clear().type(nuevaDescripcion);

    // Guardar
    cy.contains('button', /Guardar/i).click();
    cy.waitForSupabase();

    // Verificar actualización
    cy.contains('Gasto actualizado exitosamente').should('be.visible');
    cy.contains(nuevaDescripcion).should('be.visible');
  });

  it('Debe permitir marcar gasto como pagado/pendiente', () => {
    // Seleccionar primer gasto
    cy.get('[data-testid="gasto-item"]').first().within(() => {
      // Obtener estado actual
      cy.get('[data-testid="gasto-estado"]').invoke('text').then(estadoActual => {
        // Hacer clic en botón de cambiar estado
        cy.get('[data-testid="btn-toggle-pagado"]').click();
        cy.waitForSupabase();

        // Verificar que cambió
        cy.get('[data-testid="gasto-estado"]')
          .invoke('text')
          .should('not.equal', estadoActual);
      });
    });
  });

  it('Debe permitir eliminar gasto', () => {
    // Buscar gasto de prueba
    cy.contains(gastoTest.descripcion).then($gasto => {
      if ($gasto.length > 0) {
        // Seleccionar gasto
        cy.wrap($gasto).closest('[data-testid="gasto-item"]').click();

        // Eliminar
        cy.contains('button', /Eliminar/i).click();

        // Confirmar
        cy.get('[data-testid="modal-confirmar-eliminar"]').should('be.visible');
        cy.contains('button', /Confirmar|Eliminar/i).click();
        cy.waitForSupabase();

        // Verificar eliminación
        cy.contains('Gasto eliminado exitosamente').should('be.visible');
        cy.contains(gastoTest.descripcion).should('not.exist');
      }
    });
  });

  it('Debe actualizar totales al crear/editar/eliminar gastos', () => {
    // Obtener total actual
    cy.get('[data-testid="gastos-total-general"]')
      .invoke('text')
      .then(totalAntes => {
        const totalAntesNum = parseFloat(totalAntes.replace(/[$,]/g, ''));

        // Crear nuevo gasto
        cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();
        cy.get('input[name="descripcion"]').type('Gasto para verificar totales');
        cy.get('input[name="fecha"]').click();
        cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();
        cy.get('select[name="categoria_id"]').select(1);
        cy.get('input[name="total"]').clear().type('1000');
        cy.get('select[name="tipo_comprobante"]').select('E');
        cy.contains('button', /Guardar|Crear/i).click();
        cy.waitForSupabase();

        // Verificar que total aumentó
        cy.get('[data-testid="gastos-total-general"]')
          .invoke('text')
          .then(totalDespues => {
            const totalDespuesNum = parseFloat(totalDespues.replace(/[$,]/g, ''));
            expect(totalDespuesNum).to.be.greaterThan(totalAntesNum);
          });
      });
  });

  it('Debe validar fecha del gasto dentro de rango coherente (±30 días del evento)', () => {
    // Obtener fecha del evento
    cy.get('[data-testid="evento-fecha"]')
      .invoke('text')
      .then(fechaEventoText => {
        const fechaEvento = new Date(fechaEventoText);

        // Intentar crear gasto con fecha fuera de rango
        cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();

        cy.get('input[name="descripcion"]').type('Gasto con fecha fuera de rango');

        // Seleccionar fecha muy lejana (más de 30 días)
        const fechaLejana = new Date(fechaEvento);
        fechaLejana.setDate(fechaLejana.getDate() + 60);

        cy.get('input[name="fecha"]').type(fechaLejana.toISOString().split('T')[0]);
        cy.get('select[name="categoria_id"]').select(1);
        cy.get('input[name="total"]').clear().type('1000');

        // Debería mostrar advertencia (opcional)
        cy.contains(/fecha fuera de rango|más de 30 días/i).should('exist');
      });
  });

  it('Debe filtrar gastos por categoría', () => {
    // Clic en una categoría específica
    cy.get('[data-category="combustible"] h3').click();

    // Verificar que solo muestra gastos de esa categoría
    cy.get('[data-testid="gasto-item"]:visible').each(($gasto) => {
      cy.wrap($gasto)
        .should('have.attr', 'data-category', 'combustible');
    });
  });

  it('Debe mostrar resumen de gastos pagados vs pendientes', () => {
    // Verificar que muestra totales separados
    cy.get('[data-testid="gastos-pagados-total"]').should('be.visible');
    cy.get('[data-testid="gastos-pendientes-total"]').should('be.visible');

    // Verificar que suman al total general
    cy.get('[data-testid="gastos-pagados-total"]')
      .invoke('text')
      .then(pagadosText => {
        const pagados = parseFloat(pagadosText.replace(/[$,]/g, ''));

        cy.get('[data-testid="gastos-pendientes-total"]')
          .invoke('text')
          .then(pendientesText => {
            const pendientes = parseFloat(pendientesText.replace(/[$,]/g, ''));

            cy.get('[data-testid="gastos-total-general"]')
              .invoke('text')
              .then(totalText => {
                const total = parseFloat(totalText.replace(/[$,]/g, ''));
                expect(total).to.be.closeTo(pagados + pendientes, 1);
              });
          });
      });
  });
});
