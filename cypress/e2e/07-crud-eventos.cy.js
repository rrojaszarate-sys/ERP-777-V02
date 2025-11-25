/**
 * Test Suite: CRUD de Eventos
 * Basado en: MANUAL_PRUEBAS_COMPLETO.md - Prueba UI 7
 */

describe('UI-07: CRUD de Eventos', () => {
  const eventoTest = {
    clave: `EVT-TEST-${Date.now()}`,
    proyecto: `Proyecto de Prueba ${Date.now()}`,
    provision_combustible: 15000,
    provision_materiales: 30000,
    provision_rh: 50000,
    provision_sps: 25000
  };

  beforeEach(() => {
    cy.visit('/eventos');
    cy.waitForSupabase();
  });

  it('Debe abrir modal de crear nuevo evento', () => {
    // Clic en botón crear
    cy.contains('button', /Nuevo Evento|Crear Evento/i).click();

    // Verificar que modal se abre
    cy.get('[data-testid="modal-crear-evento"]').should('be.visible');
  });

  it('Debe permitir crear nuevo evento con todos los campos requeridos', () => {
    // Abrir modal
    cy.contains('button', /Nuevo Evento|Crear Evento/i).click();

    // Llenar formulario
    cy.get('input[name="clave_evento"]').type(eventoTest.clave);
    cy.get('input[name="nombre_proyecto"]').type(eventoTest.proyecto);

    // Seleccionar fecha
    cy.get('input[name="fecha_evento"]').click();
    cy.get('.react-datepicker').within(() => {
      cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();
    });

    // Seleccionar cliente
    cy.get('select[name="cliente_id"]').select(1);

    // Seleccionar tipo de evento
    cy.get('select[name="tipo_evento_id"]').select(1);

    // Seleccionar estado
    cy.get('select[name="estado_id"]').select(1);

    // Ingresar provisiones
    cy.get('input[name="provision_combustible_peaje"]').clear().type(eventoTest.provision_combustible.toString());
    cy.get('input[name="provision_materiales"]').clear().type(eventoTest.provision_materiales.toString());
    cy.get('input[name="provision_recursos_humanos"]').clear().type(eventoTest.provision_rh.toString());
    cy.get('input[name="provision_solicitudes_pago"]').clear().type(eventoTest.provision_sps.toString());

    // Guardar
    cy.contains('button', /Guardar|Crear/i).click();
    cy.waitForSupabase();

    // Verificar que se creó
    cy.contains('Evento creado exitosamente').should('be.visible');
    cy.get('[data-testid="modal-crear-evento"]').should('not.exist');
  });

  it('Debe validar campos requeridos al crear evento', () => {
    // Abrir modal
    cy.contains('button', /Nuevo Evento|Crear Evento/i).click();

    // Intentar guardar sin llenar campos
    cy.contains('button', /Guardar|Crear/i).click();

    // Verificar mensajes de error
    cy.contains(/Campo requerido|Este campo es obligatorio/i).should('be.visible');
  });

  it('Debe permitir editar evento existente', () => {
    // Clic en primer evento
    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.get('[data-testid="evento-detail-modal"]').should('be.visible');

    // Clic en botón editar
    cy.contains('button', /Editar/i).click();

    // Modificar nombre de proyecto
    const nuevoNombre = `Proyecto Editado ${Date.now()}`;
    cy.get('input[name="nombre_proyecto"]').clear().type(nuevoNombre);

    // Guardar cambios
    cy.contains('button', /Guardar/i).click();
    cy.waitForSupabase();

    // Verificar que se guardó
    cy.contains('Evento actualizado exitosamente').should('be.visible');
    cy.contains(nuevoNombre).should('be.visible');
  });

  it('Debe permitir eliminar evento', () => {
    // Buscar el evento de prueba creado anteriormente
    cy.get('input[placeholder*="Buscar"]').type(eventoTest.clave);
    cy.waitForSupabase();

    cy.get('[data-testid="eventos-table"] tbody tr').then($rows => {
      if ($rows.length > 0) {
        // Abrir detalle
        cy.wrap($rows).first().click();
        cy.get('[data-testid="evento-detail-modal"]').should('be.visible');

        // Clic en botón eliminar
        cy.contains('button', /Eliminar/i).click();

        // Confirmar eliminación
        cy.get('[data-testid="modal-confirmar-eliminar"]').should('be.visible');
        cy.contains('button', /Confirmar|Eliminar/i).click();
        cy.waitForSupabase();

        // Verificar que se eliminó
        cy.contains('Evento eliminado exitosamente').should('be.visible');
        cy.get('[data-testid="evento-detail-modal"]').should('not.exist');
      }
    });
  });

  it('Debe validar formato de clave de evento (EVT-YYYY-MM-NN)', () => {
    cy.contains('button', /Nuevo Evento|Crear Evento/i).click();

    // Intentar con formato inválido
    cy.get('input[name="clave_evento"]').type('INVALIDO-123');
    cy.contains('button', /Guardar|Crear/i).click();

    // Verificar mensaje de error
    cy.contains(/Formato inválido|debe seguir el formato EVT-/i).should('be.visible');
  });

  it('Debe calcular provisión total automáticamente', () => {
    cy.contains('button', /Nuevo Evento|Crear Evento/i).click();

    // Ingresar provisiones
    cy.get('input[name="provision_combustible_peaje"]').clear().type('10000');
    cy.get('input[name="provision_materiales"]').clear().type('20000');
    cy.get('input[name="provision_recursos_humanos"]').clear().type('30000');
    cy.get('input[name="provision_solicitudes_pago"]').clear().type('15000');

    // Verificar que el total se calcula
    cy.get('[data-testid="provision-total-calculado"]')
      .should('contain', '75,000');
  });

  it('Debe permitir duplicar evento', () => {
    // Abrir primer evento
    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.get('[data-testid="evento-detail-modal"]').should('be.visible');

    // Buscar botón duplicar
    cy.contains('button', /Duplicar/i).then($btn => {
      if ($btn.length > 0) {
        $btn.click();

        // Verificar que abre modal con datos pre-llenados
        cy.get('[data-testid="modal-crear-evento"]').should('be.visible');

        // Verificar que tiene datos copiados
        cy.get('input[name="provision_combustible_peaje"]')
          .should('not.have.value', '');
      }
    });
  });

  it('Debe mantener integridad referencial al eliminar', () => {
    // Intentar eliminar evento que tiene gastos/ingresos asociados
    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.get('[data-testid="evento-detail-modal"]').should('be.visible');

    // Verificar que tiene gastos
    cy.contains('Gastos').click();
    cy.get('[data-testid="gastos-list"] > div').then($gastos => {
      if ($gastos.length > 0) {
        // Intentar eliminar
        cy.contains('button', /Eliminar/i).then($deleteBtn => {
          if ($deleteBtn.length > 0) {
            $deleteBtn.click();

            // Debería mostrar advertencia
            cy.contains(/tiene registros asociados|eliminar gastos primero/i)
              .should('be.visible');
          }
        });
      }
    });
  });
});
