/**
 * Test Suite: Flujo de Integración Completo
 * Basado en: MANUAL_PRUEBAS_COMPLETO.md - Prueba UI 9
 */

describe('UI-09: Flujo de Integración Completo', () => {
  const eventoIntegracion = {
    clave: `EVT-INT-${Date.now()}`,
    proyecto: `Evento Integración ${Date.now()}`,
    provision_combustible: 12000,
    provision_materiales: 28000,
    provision_rh: 45000,
    provision_sps: 22000
  };

  it('Flujo completo: Crear evento → Agregar gastos → Verificar cálculos → Vista financiera', () => {
    // PASO 1: Crear evento
    cy.visit('/eventos');
    cy.waitForSupabase();

    cy.contains('button', /Nuevo Evento|Crear Evento/i).click();
    cy.get('[data-testid="modal-crear-evento"]').should('be.visible');

    cy.get('input[name="clave_evento"]').type(eventoIntegracion.clave);
    cy.get('input[name="nombre_proyecto"]').type(eventoIntegracion.proyecto);

    cy.get('input[name="fecha_evento"]').click();
    cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();

    cy.get('select[name="cliente_id"]').select(1);
    cy.get('select[name="tipo_evento_id"]').select(1);
    cy.get('select[name="estado_id"]').select(1);

    cy.get('input[name="provision_combustible_peaje"]')
      .clear()
      .type(eventoIntegracion.provision_combustible.toString());
    cy.get('input[name="provision_materiales"]')
      .clear()
      .type(eventoIntegracion.provision_materiales.toString());
    cy.get('input[name="provision_recursos_humanos"]')
      .clear()
      .type(eventoIntegracion.provision_rh.toString());
    cy.get('input[name="provision_solicitudes_pago"]')
      .clear()
      .type(eventoIntegracion.provision_sps.toString());

    cy.contains('button', /Guardar|Crear/i).click();
    cy.waitForSupabase();

    cy.contains('Evento creado exitosamente').should('be.visible');

    // PASO 2: Buscar evento recién creado
    cy.get('input[placeholder*="Buscar"]').clear().type(eventoIntegracion.clave);
    cy.waitForSupabase();

    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.get('[data-testid="evento-detail-modal"]').should('be.visible');

    // PASO 3: Verificar provisiones
    cy.contains('Provisiones').click();

    const provisionTotal =
      eventoIntegracion.provision_combustible +
      eventoIntegracion.provision_materiales +
      eventoIntegracion.provision_rh +
      eventoIntegracion.provision_sps;

    cy.get('[data-testid="provision-total"]')
      .invoke('text')
      .then(text => {
        const total = parseFloat(text.replace(/[$,]/g, ''));
        expect(total).to.be.closeTo(provisionTotal, 1);
      });

    // PASO 4: Agregar gastos
    cy.contains('Gastos').click();

    // Agregar gasto 1: Combustible
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();
    cy.get('input[name="descripcion"]').type('Gasolina para transporte');
    cy.get('input[name="fecha"]').click();
    cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();
    cy.get('select[name="categoria_id"]').select('Combustible y Peaje');
    cy.get('input[name="total"]').clear().type('5000');
    cy.get('select[name="tipo_comprobante"]').select('E');
    cy.get('input[type="checkbox"][name="pagado"]').check();
    cy.contains('button', /Guardar|Crear/i).click();
    cy.waitForSupabase();

    // Agregar gasto 2: Materiales
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();
    cy.get('input[name="descripcion"]').type('Materiales decorativos');
    cy.get('input[name="fecha"]').click();
    cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();
    cy.get('select[name="categoria_id"]').select('Materiales');
    cy.get('input[name="total"]').clear().type('15000');
    cy.get('select[name="tipo_comprobante"]').select('E');
    cy.get('input[type="checkbox"][name="pagado"]').check();
    cy.contains('button', /Guardar|Crear/i).click();
    cy.waitForSupabase();

    // Agregar gasto 3: Recursos Humanos
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();
    cy.get('input[name="descripcion"]').type('Pago a personal');
    cy.get('input[name="fecha"]').click();
    cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();
    cy.get('select[name="categoria_id"]').select('Recursos Humanos');
    cy.get('input[name="total"]').clear().type('25000');
    cy.get('select[name="tipo_comprobante"]').select('N');
    cy.get('input[type="checkbox"][name="pagado"]').check();
    cy.contains('button', /Guardar|Crear/i).click();
    cy.waitForSupabase();

    // PASO 5: Verificar totales de gastos
    const totalGastosEsperado = 5000 + 15000 + 25000;

    cy.get('[data-testid="gastos-total-general"]')
      .invoke('text')
      .then(text => {
        const total = parseFloat(text.replace(/[$,]/g, ''));
        expect(total).to.equal(totalGastosEsperado);
      });

    // PASO 6: Verificar que gastos no exceden provisión
    cy.contains('Provisiones').click();
    cy.get('[data-testid="provision-total"]')
      .invoke('text')
      .then(provisionText => {
        const provision = parseFloat(provisionText.replace(/[$,]/g, ''));
        const limiteMaximo = provision * 1.10;

        expect(totalGastosEsperado, 'Gastos no exceden provisión + 10%')
          .to.be.at.most(limiteMaximo);
      });

    // PASO 7: Cerrar modal y verificar en lista
    cy.get('[data-testid="btn-cerrar-modal"]').click();
    cy.get('[data-testid="evento-detail-modal"]').should('not.exist');

    cy.get('input[placeholder*="Buscar"]').clear().type(eventoIntegracion.clave);
    cy.waitForSupabase();

    cy.contains(eventoIntegracion.proyecto).should('be.visible');

    // PASO 8: Verificar en vista financiera
    cy.visit('/reportes/financiero');
    cy.waitForSupabase();

    cy.get('input[placeholder*="Buscar"]').type(eventoIntegracion.clave);
    cy.waitForSupabase();

    // Verificar que aparece en la tabla financiera
    cy.get('[data-testid="tabla-eventos-financiero"]').within(() => {
      cy.contains(eventoIntegracion.clave).should('be.visible');
    });

    // PASO 9: Limpiar - Eliminar evento de prueba
    cy.visit('/eventos');
    cy.waitForSupabase();

    cy.get('input[placeholder*="Buscar"]').clear().type(eventoIntegracion.clave);
    cy.waitForSupabase();

    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.get('[data-testid="evento-detail-modal"]').should('be.visible');

    cy.contains('button', /Eliminar/i).click();
    cy.get('[data-testid="modal-confirmar-eliminar"]').should('be.visible');
    cy.contains('button', /Confirmar|Eliminar/i).click();
    cy.waitForSupabase();

    cy.contains('Evento eliminado exitosamente').should('be.visible');
  });

  it('Flujo de validación: Verificar que gastos excesivos muestran alertas', () => {
    // Crear evento con provisión baja
    cy.visit('/eventos');
    cy.waitForSupabase();

    cy.contains('button', /Nuevo Evento|Crear Evento/i).click();

    const eventoAlerta = {
      clave: `EVT-ALERTA-${Date.now()}`,
      proyecto: `Evento con Alerta ${Date.now()}`
    };

    cy.get('input[name="clave_evento"]').type(eventoAlerta.clave);
    cy.get('input[name="nombre_proyecto"]').type(eventoAlerta.proyecto);
    cy.get('input[name="fecha_evento"]').click();
    cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();
    cy.get('select[name="cliente_id"]').select(1);
    cy.get('select[name="tipo_evento_id"]').select(1);
    cy.get('select[name="estado_id"]').select(1);

    // Provisión baja: solo $10,000
    cy.get('input[name="provision_combustible_peaje"]').clear().type('2500');
    cy.get('input[name="provision_materiales"]').clear().type('2500');
    cy.get('input[name="provision_recursos_humanos"]').clear().type('2500');
    cy.get('input[name="provision_solicitudes_pago"]').clear().type('2500');

    cy.contains('button', /Guardar|Crear/i).click();
    cy.waitForSupabase();

    // Buscar y abrir evento
    cy.get('input[placeholder*="Buscar"]').clear().type(eventoAlerta.clave);
    cy.waitForSupabase();
    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.contains('Gastos').click();

    // Intentar agregar gasto que excede provisión
    cy.contains('button', /Agregar Gasto|Nuevo Gasto/i).click();
    cy.get('input[name="descripcion"]').type('Gasto excesivo');
    cy.get('input[name="fecha"]').click();
    cy.get('.react-datepicker__day').not('.react-datepicker__day--disabled').first().click();
    cy.get('select[name="categoria_id"]').select('Materiales');
    cy.get('input[name="total"]').clear().type('5000'); // Excede provisión de materiales
    cy.get('select[name="tipo_comprobante"]').select('E');

    // Debería mostrar alerta
    cy.contains(/excede|alerta|presupuesto/i, { timeout: 3000 }).should('be.visible');

    // Cancelar y limpiar
    cy.contains('button', /Cancelar/i).click();
    cy.get('[data-testid="btn-cerrar-modal"]').click();

    // Eliminar evento de prueba
    cy.get('input[placeholder*="Buscar"]').clear().type(eventoAlerta.clave);
    cy.waitForSupabase();
    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.contains('button', /Eliminar/i).click();
    cy.get('[data-testid="modal-confirmar-eliminar"]').should('be.visible');
    cy.contains('button', /Confirmar|Eliminar/i).click();
    cy.waitForSupabase();
  });

  it('Flujo de consistencia: Editar provisiones → Verificar impacto en cálculos', () => {
    // Abrir evento existente
    cy.visit('/eventos');
    cy.waitForSupabase();

    cy.get('[data-testid="eventos-table"] tbody tr').first().click();
    cy.get('[data-testid="evento-detail-modal"]').should('be.visible');

    // Obtener totales antes de editar
    cy.contains('Provisiones').click();
    cy.get('[data-testid="provision-total"]')
      .invoke('text')
      .then(totalAntes => {
        const totalAntesNum = parseFloat(totalAntes.replace(/[$,]/g, ''));

        // Editar provisión
        cy.contains('button', /Editar/i).click();
        cy.get('input[name="provision_materiales"]')
          .clear()
          .type((totalAntesNum * 0.3).toString());

        cy.contains('button', /Guardar/i).click();
        cy.waitForSupabase();

        // Verificar que total se recalculó
        cy.get('[data-testid="provision-total"]')
          .invoke('text')
          .then(totalDespues => {
            const totalDespuesNum = parseFloat(totalDespues.replace(/[$,]/g, ''));
            expect(totalDespuesNum).to.not.equal(totalAntesNum);
          });
      });
  });
});
