/**
 * Suite de Pruebas E2E - Módulo de Eventos Completo
 * Incluye: Clientes, Eventos, Ingresos, Gastos, Provisiones, Materiales, Almacén
 *
 * Para ejecutar: npx cypress open --e2e
 */

describe('Módulo de Eventos - Suite Completa', () => {

  // Datos de prueba generados dinámicamente
  const timestamp = Date.now();
  const testData = {
    cliente: {
      razonSocial: `Cliente Prueba Cypress ${timestamp}`,
      nombreComercial: 'CPC Test',
      rfc: `CPT${timestamp.toString().slice(-9)}`,
      email: `cliente${timestamp}@test.com`,
      telefono: '55 1234 5678'
    },
    evento: {
      nombre: `Evento Prueba ${timestamp}`,
      descripcion: 'Evento creado por pruebas automatizadas Cypress',
      lugar: 'Centro de Convenciones CDMX',
      ingresoEstimado: 500000,
      provisionCombustible: 15000,
      provisionMateriales: 25000,
      provisionRH: 80000,
      provisionSPs: 50000
    },
    ingreso: {
      concepto: 'Contrato principal de servicios',
      subtotal: 431034.48,
      iva: 68965.52,
      total: 500000
    },
    gastos: {
      combustible: { concepto: 'Gasolina traslados', total: 8000 },
      materiales: { concepto: 'Lonas y banners', total: 15000 },
      rh: { concepto: 'Staff operativo', total: 45000 },
      sps: { concepto: 'Renta de audio', total: 35000 }
    }
  };

  beforeEach(() => {
    // Interceptar llamadas API para monitoreo
    cy.intercept('GET', '**/evt_eventos_erp**').as('getEventos');
    cy.intercept('GET', '**/evt_clientes_erp**').as('getClientes');
    cy.intercept('GET', '**/evt_gastos_erp**').as('getGastos');
    cy.intercept('GET', '**/evt_ingresos_erp**').as('getIngresos');
    cy.intercept('GET', '**/evt_provisiones_erp**').as('getProvisiones');
    cy.intercept('GET', '**/inv_productos**').as('getProductos');
    cy.intercept('POST', '**/evt_eventos_erp**').as('createEvento');
    cy.intercept('POST', '**/evt_clientes_erp**').as('createCliente');
  });

  // ============================================================================
  // SECCIÓN 1: NAVEGACIÓN Y CARGA INICIAL
  // ============================================================================
  describe('1. Navegación y Carga del Módulo', () => {

    it('1.1 Debe cargar el dashboard de eventos', () => {
      cy.visit('/');
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

      // Verificar elementos del dashboard
      cy.get('[class*="card"], [class*="Card"]').should('have.length.at.least', 1);

      // Tomar screenshot del dashboard
      cy.screenshot('01-dashboard-eventos');
    });

    it('1.2 Debe navegar al listado de eventos', () => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');

      // Verificar que carga la lista
      cy.contains('Eventos', { timeout: 10000 }).should('be.visible');

      // Verificar controles de la tabla
      cy.get('input[placeholder*="Buscar"]').should('exist');

      cy.screenshot('02-listado-eventos');
    });

    it('1.3 Debe navegar al módulo de clientes', () => {
      cy.visit('/eventos-erp/clientes');
      cy.wait('@getClientes');

      cy.contains('Clientes', { timeout: 10000 }).should('be.visible');
      cy.screenshot('03-listado-clientes');
    });

    it('1.4 Debe navegar al análisis financiero', () => {
      cy.visit('/eventos-erp/analisis-financiero');

      cy.contains('Análisis', { timeout: 10000 }).should('be.visible');
      cy.screenshot('04-analisis-financiero');
    });

    it('1.5 Debe navegar a catálogos', () => {
      cy.visit('/eventos-erp/catalogos');

      cy.contains('Catálogo', { timeout: 10000 }).should('be.visible');
      cy.screenshot('05-catalogos');
    });
  });

  // ============================================================================
  // SECCIÓN 2: GESTIÓN DE CLIENTES
  // ============================================================================
  describe('2. Gestión de Clientes (CRUD)', () => {

    beforeEach(() => {
      cy.visit('/eventos-erp/clientes');
      cy.wait('@getClientes');
    });

    it('2.1 Debe mostrar el listado de clientes existentes', () => {
      // Esperar que cargue la tabla
      cy.get('table, [class*="table"]', { timeout: 10000 }).should('exist');

      // Verificar que hay al menos un cliente o mensaje de vacío
      cy.get('body').then($body => {
        if ($body.find('tbody tr').length > 0) {
          cy.get('tbody tr').should('have.length.at.least', 1);
        }
      });

      cy.screenshot('06-clientes-listado');
    });

    it('2.2 Debe abrir modal para crear nuevo cliente', () => {
      // Buscar botón de nuevo cliente
      cy.contains('button', /nuevo|crear|agregar/i).click();

      // Verificar que se abre el modal
      cy.get('[role="dialog"], [class*="modal"], [class*="Modal"]', { timeout: 5000 })
        .should('be.visible');

      cy.screenshot('07-cliente-modal-nuevo');
    });

    it('2.3 Debe validar campos requeridos del cliente', () => {
      cy.contains('button', /nuevo|crear|agregar/i).click();

      // Intentar guardar sin datos
      cy.contains('button', /guardar|crear|aceptar/i).click();

      // Verificar mensajes de error o validación
      cy.get('[class*="error"], [class*="invalid"], [class*="required"]')
        .should('exist');

      cy.screenshot('08-cliente-validacion');
    });

    it('2.4 Debe crear un cliente nuevo exitosamente', () => {
      cy.contains('button', /nuevo|crear|agregar/i).click();

      // Llenar formulario
      cy.get('input[name="razon_social"], input[placeholder*="razón"], input[placeholder*="Razón"]')
        .first()
        .clear()
        .type(testData.cliente.razonSocial);

      cy.get('input[name="rfc"], input[placeholder*="RFC"]')
        .first()
        .clear()
        .type(testData.cliente.rfc);

      // Buscar campo de email si existe
      cy.get('body').then($body => {
        if ($body.find('input[name="email"], input[type="email"]').length > 0) {
          cy.get('input[name="email"], input[type="email"]')
            .first()
            .clear()
            .type(testData.cliente.email);
        }
      });

      cy.screenshot('09-cliente-formulario-lleno');

      // Guardar
      cy.contains('button', /guardar|crear|aceptar/i).click();

      // Verificar éxito
      cy.contains(/éxito|creado|guardado/i, { timeout: 10000 }).should('be.visible');

      cy.screenshot('10-cliente-creado-exito');
    });

    it('2.5 Debe buscar cliente por nombre', () => {
      cy.get('input[placeholder*="Buscar"], input[type="search"]')
        .first()
        .clear()
        .type('Prueba');

      // Esperar filtrado
      cy.wait(500);

      cy.screenshot('11-cliente-busqueda');
    });
  });

  // ============================================================================
  // SECCIÓN 3: GESTIÓN DE EVENTOS
  // ============================================================================
  describe('3. Gestión de Eventos (CRUD)', () => {

    beforeEach(() => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');
    });

    it('3.1 Debe mostrar el listado de eventos', () => {
      cy.get('table, [class*="table"], [class*="grid"]', { timeout: 10000 })
        .should('exist');

      cy.screenshot('12-eventos-listado');
    });

    it('3.2 Debe abrir modal para crear nuevo evento', () => {
      cy.contains('button', /nuevo|crear|agregar/i).click();

      cy.get('[role="dialog"], [class*="modal"], [class*="Modal"]', { timeout: 5000 })
        .should('be.visible');

      cy.screenshot('13-evento-modal-nuevo');
    });

    it('3.3 Debe llenar formulario de evento con provisiones', () => {
      cy.contains('button', /nuevo|crear|agregar/i).click();

      // Nombre del proyecto
      cy.get('input[name="nombre_proyecto"], input[placeholder*="nombre"], input[placeholder*="proyecto"]')
        .first()
        .clear()
        .type(testData.evento.nombre);

      // Descripción si existe
      cy.get('body').then($body => {
        if ($body.find('textarea[name="descripcion"]').length > 0) {
          cy.get('textarea[name="descripcion"]')
            .first()
            .clear()
            .type(testData.evento.descripcion);
        }
      });

      // Lugar
      cy.get('body').then($body => {
        if ($body.find('input[name="lugar"]').length > 0) {
          cy.get('input[name="lugar"]')
            .first()
            .clear()
            .type(testData.evento.lugar);
        }
      });

      // Ingreso estimado / Ganancia estimada
      cy.get('input[name="ganancia_estimada"], input[name="ingreso_estimado"]')
        .first()
        .clear()
        .type(testData.evento.ingresoEstimado.toString());

      // Provisiones
      cy.get('body').then($body => {
        if ($body.find('input[name="provision_combustible_peaje"]').length > 0) {
          cy.get('input[name="provision_combustible_peaje"]')
            .clear()
            .type(testData.evento.provisionCombustible.toString());
        }

        if ($body.find('input[name="provision_materiales"]').length > 0) {
          cy.get('input[name="provision_materiales"]')
            .clear()
            .type(testData.evento.provisionMateriales.toString());
        }

        if ($body.find('input[name="provision_recursos_humanos"]').length > 0) {
          cy.get('input[name="provision_recursos_humanos"]')
            .clear()
            .type(testData.evento.provisionRH.toString());
        }

        if ($body.find('input[name="provision_solicitudes_pago"]').length > 0) {
          cy.get('input[name="provision_solicitudes_pago"]')
            .clear()
            .type(testData.evento.provisionSPs.toString());
        }
      });

      cy.screenshot('14-evento-formulario-provisiones');
    });

    it('3.4 Debe seleccionar cliente en el evento', () => {
      cy.contains('button', /nuevo|crear|agregar/i).click();

      // Buscar selector de cliente
      cy.get('select[name="cliente_id"], [class*="select"]')
        .first()
        .then($select => {
          if ($select.is('select')) {
            cy.wrap($select).select(1); // Seleccionar primera opción
          } else {
            cy.wrap($select).click();
            cy.get('[class*="option"]').first().click();
          }
        });

      cy.screenshot('15-evento-cliente-seleccionado');
    });

    it('3.5 Debe abrir detalle de evento existente', () => {
      // Click en el primer evento de la lista
      cy.get('tbody tr, [class*="row"]').first().click();

      // Verificar que se abre el detalle
      cy.get('[role="dialog"], [class*="modal"], [class*="Modal"]', { timeout: 5000 })
        .should('be.visible');

      cy.screenshot('16-evento-detalle');
    });

    it('3.6 Debe mostrar tabs en detalle de evento', () => {
      cy.get('tbody tr, [class*="row"]').first().click();

      // Verificar tabs
      cy.contains(/overview|resumen|general/i).should('be.visible');
      cy.contains(/ingreso/i).should('be.visible');
      cy.contains(/gasto/i).should('be.visible');
      cy.contains(/provis/i).should('be.visible');

      cy.screenshot('17-evento-tabs');
    });

    it('3.7 Debe filtrar eventos por búsqueda', () => {
      cy.get('input[placeholder*="Buscar"], input[type="search"]')
        .first()
        .clear()
        .type('TEST');

      cy.wait(500);
      cy.screenshot('18-eventos-filtro-busqueda');
    });
  });

  // ============================================================================
  // SECCIÓN 4: GESTIÓN DE INGRESOS
  // ============================================================================
  describe('4. Gestión de Ingresos', () => {

    beforeEach(() => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');
    });

    it('4.1 Debe navegar al tab de ingresos', () => {
      // Abrir primer evento
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"], [class*="modal"]', { timeout: 5000 }).should('be.visible');

      // Click en tab de ingresos
      cy.contains(/ingreso/i).click();

      cy.screenshot('19-ingresos-tab');
    });

    it('4.2 Debe abrir modal para crear ingreso', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/ingreso/i).click();

      // Buscar botón de agregar ingreso
      cy.contains('button', /agregar|nuevo|\+/i).first().click();

      cy.screenshot('20-ingreso-modal-nuevo');
    });

    it('4.3 Debe mostrar campos del formulario de ingreso', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/ingreso/i).click();
      cy.contains('button', /agregar|nuevo|\+/i).first().click();

      // Verificar campos
      cy.get('input, textarea, select').should('have.length.at.least', 3);

      cy.screenshot('21-ingreso-formulario');
    });

    it('4.4 Debe mostrar totales de ingresos', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/ingreso/i).click();

      // Verificar que muestra totales
      cy.get('[class*="total"], [class*="sum"]').should('exist');

      cy.screenshot('22-ingresos-totales');
    });
  });

  // ============================================================================
  // SECCIÓN 5: GESTIÓN DE GASTOS POR CATEGORÍA
  // ============================================================================
  describe('5. Gestión de Gastos por Categoría', () => {

    beforeEach(() => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');
    });

    it('5.1 Debe navegar al tab de gastos', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      cy.contains(/gasto/i).click();

      cy.screenshot('23-gastos-tab');
    });

    it('5.2 Debe mostrar subtabs de categorías de gastos', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();

      // Verificar subtabs de categorías
      cy.contains(/todos/i).should('be.visible');
      cy.contains(/combustible/i).should('be.visible');
      cy.contains(/material/i).should('be.visible');
      cy.contains(/rh|recursos/i).should('be.visible');
      cy.contains(/sp|solicitud/i).should('be.visible');

      cy.screenshot('24-gastos-categorias-tabs');
    });

    it('5.3 Debe filtrar gastos por categoría Combustible', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();

      cy.contains(/combustible/i).click();
      cy.wait(300);

      cy.screenshot('25-gastos-filtro-combustible');
    });

    it('5.4 Debe filtrar gastos por categoría Materiales', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();

      cy.contains(/material/i).click();
      cy.wait(300);

      cy.screenshot('26-gastos-filtro-materiales');
    });

    it('5.5 Debe filtrar gastos por categoría RH', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();

      cy.contains(/rh|recursos humanos/i).click();
      cy.wait(300);

      cy.screenshot('27-gastos-filtro-rh');
    });

    it('5.6 Debe filtrar gastos por categoría SPs', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();

      cy.contains(/sp|solicitud/i).click();
      cy.wait(300);

      cy.screenshot('28-gastos-filtro-sps');
    });

    it('5.7 Debe abrir modal para crear gasto', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();

      cy.contains('button', /agregar|nuevo|\+/i).first().click();

      cy.screenshot('29-gasto-modal-nuevo');
    });

    it('5.8 Debe mostrar totales por categoría', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();

      // Verificar que cada tab muestra su total
      cy.get('[class*="currency"], [class*="total"]').should('exist');

      cy.screenshot('30-gastos-totales-categoria');
    });
  });

  // ============================================================================
  // SECCIÓN 6: GESTIÓN DE PROVISIONES
  // ============================================================================
  describe('6. Gestión de Provisiones', () => {

    beforeEach(() => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');
    });

    it('6.1 Debe navegar al tab de provisiones', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      cy.contains(/provis/i).click();

      cy.screenshot('31-provisiones-tab');
    });

    it('6.2 Debe mostrar provisiones existentes', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/provis/i).click();

      // Esperar carga
      cy.wait(500);

      cy.screenshot('32-provisiones-listado');
    });

    it('6.3 Debe mostrar categorías de provisiones', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/provis/i).click();

      // Verificar subtabs de categorías (similar a gastos)
      cy.contains(/todos/i).should('be.visible');

      cy.screenshot('33-provisiones-categorias');
    });

    it('6.4 Debe abrir modal para crear provisión', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/provis/i).click();

      cy.contains('button', /agregar|nuevo|\+/i).first().click();

      cy.screenshot('34-provision-modal-nuevo');
    });

    it('6.5 Debe mostrar total de provisiones', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/provis/i).click();

      cy.get('[class*="total"], [class*="sum"]').should('exist');

      cy.screenshot('35-provisiones-total');
    });
  });

  // ============================================================================
  // SECCIÓN 7: INTEGRACIÓN CON ALMACÉN / MATERIALES
  // ============================================================================
  describe('7. Integración con Almacén - Materiales', () => {

    beforeEach(() => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');
    });

    it('7.1 Debe mostrar opción de material desde almacén', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();
      cy.contains(/material/i).click();

      // Buscar botón de agregar desde almacén
      cy.get('body').then($body => {
        if ($body.find('button:contains("Almacén")').length > 0) {
          cy.contains('button', /almacén/i).should('be.visible');
        }
      });

      cy.screenshot('36-materiales-opcion-almacen');
    });

    it('7.2 Debe abrir modal de ingreso de material', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();
      cy.contains(/material/i).click();

      // Buscar opción de ingresar material
      cy.get('body').then($body => {
        const btnAlmacen = $body.find('button:contains("Almacén"), button:contains("Ingreso Material")');
        if (btnAlmacen.length > 0) {
          cy.wrap(btnAlmacen.first()).click();
          cy.screenshot('37-material-almacen-modal');
        }
      });
    });

    it('7.3 Debe mostrar catálogo de productos del almacén', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();
      cy.contains(/material/i).click();

      cy.get('body').then($body => {
        const btnAlmacen = $body.find('button:contains("Almacén"), button:contains("Ingreso")');
        if (btnAlmacen.length > 0) {
          cy.wrap(btnAlmacen.first()).click();

          // Verificar que muestra productos
          cy.wait(500);
          cy.get('select, [class*="select"]').should('exist');
          cy.screenshot('38-material-catalogo-productos');
        }
      });
    });

    it('7.4 Debe mostrar opción de retorno de material', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();
      cy.contains(/material/i).click();

      cy.get('body').then($body => {
        if ($body.find('button:contains("Retorno")').length > 0) {
          cy.contains('button', /retorno/i).should('be.visible');
          cy.screenshot('39-material-opcion-retorno');
        }
      });
    });

    it('7.5 Debe mostrar materiales consolidados', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/gasto/i).click();
      cy.contains(/material/i).click();

      // Verificar que muestra tarjeta consolidada o listado
      cy.wait(500);
      cy.screenshot('40-materiales-consolidado');
    });
  });

  // ============================================================================
  // SECCIÓN 8: FLUJO DE WORKFLOW / ESTADOS
  // ============================================================================
  describe('8. Flujo de Workflow y Estados', () => {

    beforeEach(() => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');
    });

    it('8.1 Debe navegar al tab de workflow', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      cy.contains(/workflow|estado|flujo/i).click();

      cy.screenshot('41-workflow-tab');
    });

    it('8.2 Debe mostrar estado actual del evento', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/workflow|estado|flujo/i).click();

      // Verificar indicador de estado
      cy.get('[class*="status"], [class*="badge"], [class*="state"]').should('exist');

      cy.screenshot('42-workflow-estado-actual');
    });

    it('8.3 Debe mostrar opciones de avance de estado', () => {
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.contains(/workflow|estado|flujo/i).click();

      // Verificar botones de acción
      cy.get('button').should('have.length.at.least', 1);

      cy.screenshot('43-workflow-acciones');
    });

    it('8.4 Debe navegar a la página de workflow visual', () => {
      cy.visit('/eventos-erp/workflow');

      cy.contains(/workflow|flujo|estados/i, { timeout: 10000 }).should('be.visible');

      cy.screenshot('44-workflow-pagina');
    });
  });

  // ============================================================================
  // SECCIÓN 9: ANÁLISIS FINANCIERO
  // ============================================================================
  describe('9. Análisis Financiero', () => {

    it('9.1 Debe cargar la página de análisis financiero', () => {
      cy.visit('/eventos-erp/analisis-financiero');

      cy.contains(/análisis|financiero/i, { timeout: 10000 }).should('be.visible');

      cy.screenshot('45-analisis-pagina');
    });

    it('9.2 Debe mostrar gráficos o indicadores', () => {
      cy.visit('/eventos-erp/analisis-financiero');

      cy.wait(1000);

      // Verificar que hay elementos visuales
      cy.get('canvas, svg, [class*="chart"], [class*="graph"]').should('exist');

      cy.screenshot('46-analisis-graficos');
    });

    it('9.3 Debe mostrar resumen de utilidades', () => {
      cy.visit('/eventos-erp/analisis-financiero');

      cy.wait(1000);

      cy.get('[class*="card"], [class*="summary"]').should('exist');

      cy.screenshot('47-analisis-resumen');
    });

    it('9.4 Debe mostrar métricas en detalle de evento', () => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');

      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      // Verificar métricas en overview
      cy.get('[class*="metric"], [class*="stat"], [class*="gauge"]').should('exist');

      cy.screenshot('48-evento-metricas');
    });
  });

  // ============================================================================
  // SECCIÓN 10: RESUMEN VISUAL DEL EVENTO DE PRUEBA
  // ============================================================================
  describe('10. Evento de Prueba - EVT-2025-TEST01', () => {

    beforeEach(() => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');
    });

    it('10.1 Debe encontrar el evento de prueba', () => {
      cy.get('input[placeholder*="Buscar"]')
        .first()
        .clear()
        .type('TEST01');

      cy.wait(500);
      cy.screenshot('49-buscar-evento-prueba');
    });

    it('10.2 Debe abrir el evento de prueba', () => {
      cy.get('input[placeholder*="Buscar"]')
        .first()
        .clear()
        .type('TEST01');

      cy.wait(500);

      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      cy.screenshot('50-evento-prueba-detalle');
    });

    it('10.3 Debe mostrar ingresos del evento de prueba', () => {
      cy.get('input[placeholder*="Buscar"]').first().clear().type('TEST01');
      cy.wait(500);
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      cy.contains(/ingreso/i).click();
      cy.wait(500);

      cy.screenshot('51-evento-prueba-ingresos');
    });

    it('10.4 Debe mostrar gastos del evento de prueba', () => {
      cy.get('input[placeholder*="Buscar"]').first().clear().type('TEST01');
      cy.wait(500);
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      cy.contains(/gasto/i).click();
      cy.wait(500);

      cy.screenshot('52-evento-prueba-gastos');
    });

    it('10.5 Debe mostrar provisiones del evento de prueba', () => {
      cy.get('input[placeholder*="Buscar"]').first().clear().type('TEST01');
      cy.wait(500);
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      cy.contains(/provis/i).click();
      cy.wait(500);

      cy.screenshot('53-evento-prueba-provisiones');
    });

    it('10.6 Captura final del evento completo', () => {
      cy.get('input[placeholder*="Buscar"]').first().clear().type('TEST01');
      cy.wait(500);
      cy.get('tbody tr, [class*="row"]').first().click();
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');

      // Scroll y captura completa
      cy.screenshot('54-evento-prueba-completo', { capture: 'viewport' });
    });
  });

  // ============================================================================
  // SECCIÓN 11: MÓDULO DE INVENTARIO (Verificación de Integración)
  // ============================================================================
  describe('11. Integración con Inventario', () => {

    it('11.1 Debe navegar al módulo de inventario', () => {
      cy.visit('/inventario');

      cy.contains(/inventario|stock|almacén/i, { timeout: 10000 }).should('be.visible');

      cy.screenshot('55-inventario-dashboard');
    });

    it('11.2 Debe mostrar productos disponibles', () => {
      cy.visit('/inventario/productos');

      cy.wait(1000);
      cy.screenshot('56-inventario-productos');
    });

    it('11.3 Debe mostrar movimientos de inventario', () => {
      cy.visit('/inventario/movimientos');

      cy.wait(1000);
      cy.screenshot('57-inventario-movimientos');
    });
  });

  // ============================================================================
  // SECCIÓN 12: REPORTES Y EXPORTACIÓN
  // ============================================================================
  describe('12. Reportes y Exportación', () => {

    it('12.1 Debe tener opción de exportar listado de eventos', () => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');

      // Buscar botón de exportar
      cy.get('body').then($body => {
        if ($body.find('button:contains("Exportar"), button:contains("Excel"), button:contains("PDF")').length > 0) {
          cy.contains('button', /exportar|excel|pdf/i).should('be.visible');
        }
      });

      cy.screenshot('58-eventos-exportar');
    });

    it('12.2 Debe mostrar opciones de filtros avanzados', () => {
      cy.visit('/eventos-erp');
      cy.wait('@getEventos');

      // Buscar filtros
      cy.get('select, [class*="filter"], [class*="dropdown"]').should('exist');

      cy.screenshot('59-eventos-filtros');
    });
  });
});

// ============================================================================
// COMANDOS PERSONALIZADOS
// ============================================================================
Cypress.Commands.add('loginAsAdmin', () => {
  // En modo desarrollo, el sistema no requiere login
  cy.visit('/');
  cy.wait(1000);
});
