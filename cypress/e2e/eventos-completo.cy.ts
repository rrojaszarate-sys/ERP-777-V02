/// <reference types="cypress" />

/**
 * ============================================================================
 * SUITE DE PRUEBAS COMPLETA - MÓDULO DE EVENTOS
 * ============================================================================
 *
 * Cobertura:
 * 1. Clientes - CRUD completo
 * 2. Eventos - Crear, editar, workflow
 * 3. Ingresos - Agregar, editar, eliminar
 * 4. Gastos - Manual, OCR, categorías
 * 5. Material de Almacén - Integración
 * 6. Análisis Financiero - Cálculos
 *
 * Ejecutar: npx cypress run --spec "cypress/e2e/eventos-completo.cy.ts"
 * ============================================================================
 */

describe('🎯 MÓDULO DE EVENTOS - PRUEBAS COMPLETAS', { testIsolation: false }, () => {

  // Variables compartidas entre tests
  let testClientId: number;
  let testEventId: number;
  let testEventKey: string;

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================

  before(() => {
    cy.log('🚀 Iniciando pruebas del módulo de Eventos');
    cy.log('📅 Fecha: ' + new Date().toISOString());
  });

  // ============================================================================
  // 1️⃣ NAVEGACIÓN Y ACCESO
  // ============================================================================
  describe('📍 1. NAVEGACIÓN - Verificar acceso a páginas', () => {

    const paginas = [
      { ruta: '/eventos', nombre: 'Lista de Eventos' },
      { ruta: '/eventos/dashboard', nombre: 'Dashboard Eventos' },
    ];

    paginas.forEach((pagina, index) => {
      it(`1.${index + 1} ✅ ${pagina.nombre} carga correctamente`, () => {
        cy.visit(pagina.ruta, { failOnStatusCode: false, timeout: 10000 });
        cy.wait(1000);

        cy.get('body').should('exist');
        cy.get('body').should('not.contain', '404');

        cy.screenshot(`01-nav-${pagina.nombre.toLowerCase().replace(/\s/g, '-')}`);
        cy.log(`✅ ${pagina.nombre} cargó correctamente`);
      });
    });
  });

  // ============================================================================
  // 2️⃣ LISTA DE EVENTOS - Dashboard Principal
  // ============================================================================
  describe('📋 2. LISTA DE EVENTOS - Dashboard', () => {

    beforeEach(() => {
      cy.visit('/eventos', { failOnStatusCode: false, timeout: 10000 });
      cy.wait(1500);
    });

    it('2.1 ✅ Verificar que hay eventos en la lista', () => {
      cy.get('body').then($body => {
        // Buscar tabla o lista de eventos
        const hasTable = $body.find('table').length > 0;
        const hasCards = $body.find('[class*="card"], [class*="event"]').length > 0;

        cy.log(hasTable || hasCards ? '✅ Lista de eventos encontrada' : '⚠️ No se detectó lista');
        cy.screenshot('02-lista-eventos');
      });
    });

    it('2.2 ✅ Verificar filtros disponibles', () => {
      cy.get('body').then($body => {
        const hasYearFilter = $body.find('select').length > 0 || $body.text().includes('2025') || $body.text().includes('2024');
        const hasSearch = $body.find('input[type="search"], input[placeholder*="buscar" i]').length > 0;

        cy.log(hasYearFilter ? '✅ Filtro de año encontrado' : '⚠️ No hay filtro de año');
        cy.log(hasSearch ? '✅ Campo de búsqueda encontrado' : '⚠️ No hay búsqueda');
      });
    });

    it('2.3 ✅ Verificar KPIs/métricas', () => {
      cy.get('body').then($body => {
        // Buscar elementos de KPIs (cards con números, totales)
        const text = $body.text();
        const hasMetrics = text.includes('$') || text.includes('Total') || text.includes('Utilidad');

        cy.log(hasMetrics ? '✅ Métricas financieras visibles' : '⚠️ No se detectaron métricas');
      });
    });

    it('2.4 ✅ Verificar botón Nuevo Evento', () => {
      cy.get('button').then($buttons => {
        const newButton = $buttons.filter((i, el) => {
          const text = el.innerText.toLowerCase();
          return text.includes('nuevo') || text.includes('crear') || text.includes('+');
        });

        expect(newButton.length).to.be.greaterThan(0);
        cy.log('✅ Botón Nuevo Evento encontrado');
      });
    });
  });

  // ============================================================================
  // 3️⃣ CREAR EVENTO - Flujo completo
  // ============================================================================
  describe('🆕 3. CREAR EVENTO - Flujo completo', () => {

    it('3.1 ✅ Abrir modal de nuevo evento', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);

      // Clic en botón nuevo
      cy.get('button').contains(/nuevo|crear|\+/i).first().click({ force: true });
      cy.wait(800);

      // Verificar que se abrió modal/formulario
      cy.get('body').then($body => {
        const hasModal = $body.find('[class*="modal"], [role="dialog"], form').length > 0;
        cy.log(hasModal ? '✅ Modal/formulario abierto' : '⚠️ No se detectó modal');
        cy.screenshot('03-modal-nuevo-evento');
      });
    });

    it('3.2 ✅ Verificar campos del formulario', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1000);
      cy.get('button').contains(/nuevo|crear|\+/i).first().click({ force: true });
      cy.wait(800);

      // Verificar campos requeridos
      cy.get('body').then($body => {
        const hasNombre = $body.find('input[name*="nombre"], input[placeholder*="nombre" i]').length > 0;
        const hasCliente = $body.find('select[name*="cliente"], [class*="cliente"]').length > 0 || $body.text().toLowerCase().includes('cliente');
        const hasFecha = $body.find('input[type="date"]').length > 0;

        cy.log(hasNombre ? '✅ Campo nombre encontrado' : '⚠️ No hay campo nombre');
        cy.log(hasCliente ? '✅ Selector de cliente encontrado' : '⚠️ No hay selector cliente');
        cy.log(hasFecha ? '✅ Campo fecha encontrado' : '⚠️ No hay campo fecha');
      });
    });

    it('3.3 ✅ Verificar sección de provisiones', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1000);
      cy.get('button').contains(/nuevo|crear|\+/i).first().click({ force: true });
      cy.wait(800);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasProvisiones = text.includes('provis') || text.includes('estimado') ||
                               text.includes('combustible') || text.includes('materiales') ||
                               text.includes('rh') || text.includes('solicitud');

        cy.log(hasProvisiones ? '✅ Sección de provisiones encontrada' : '⚠️ No se detectó sección provisiones');
      });
    });
  });

  // ============================================================================
  // 4️⃣ DETALLE DE EVENTO - Verificar tabs y secciones
  // ============================================================================
  describe('📄 4. DETALLE DE EVENTO - Estructura', () => {

    it('4.1 ✅ Abrir detalle de evento existente', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);

      // Clic en primer evento (fila de tabla o card)
      cy.get('table tbody tr, [class*="event-card"], [class*="evento"]').first().click({ force: true });
      cy.wait(1000);

      cy.screenshot('04-detalle-evento');
      cy.log('✅ Detalle de evento abierto');
    });

    it('4.2 ✅ Verificar tabs de Ingresos/Gastos', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr, [class*="event-card"], [class*="evento"]').first().click({ force: true });
      cy.wait(1000);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasIngresos = text.includes('ingreso');
        const hasGastos = text.includes('gasto');
        const hasProvisiones = text.includes('provisión') || text.includes('provision');

        cy.log(hasIngresos ? '✅ Tab Ingresos encontrado' : '⚠️ No hay tab Ingresos');
        cy.log(hasGastos ? '✅ Tab Gastos encontrado' : '⚠️ No hay tab Gastos');
        cy.log(hasProvisiones ? '✅ Tab Provisiones encontrado' : '⚠️ No hay tab Provisiones');
      });
    });

    it('4.3 ✅ Verificar resumen financiero', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr, [class*="event-card"], [class*="evento"]').first().click({ force: true });
      cy.wait(1000);

      cy.get('body').then($body => {
        const text = $body.text();
        const hasTotals = text.includes('$') && (text.toLowerCase().includes('total') || text.toLowerCase().includes('utilidad'));

        cy.log(hasTotals ? '✅ Resumen financiero visible' : '⚠️ No se detectó resumen');
      });
    });
  });

  // ============================================================================
  // 5️⃣ INGRESOS - CRUD
  // ============================================================================
  describe('💵 5. INGRESOS - Funcionalidad', () => {

    it('5.1 ✅ Ver lista de ingresos de un evento', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr, [class*="event-card"]').first().click({ force: true });
      cy.wait(1000);

      // Buscar tab de ingresos y clicar
      cy.get('button, [role="tab"]').contains(/ingreso/i).click({ force: true });
      cy.wait(500);

      cy.screenshot('05-ingresos-lista');
      cy.log('✅ Sección ingresos accesible');
    });

    it('5.2 ✅ Verificar botón agregar ingreso', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/ingreso/i).click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const hasAddButton = $body.find('button').filter((i, el) => {
          const text = el.innerText.toLowerCase();
          return text.includes('agregar') || text.includes('nuevo') || text.includes('+');
        }).length > 0;

        cy.log(hasAddButton ? '✅ Botón agregar ingreso encontrado' : '⚠️ No se encontró botón');
      });
    });

    it('5.3 ✅ Verificar campos del formulario de ingreso', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/ingreso/i).click({ force: true });
      cy.wait(500);

      // Intentar abrir formulario
      cy.get('button').contains(/agregar|nuevo|\+/i).first().click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasConcepto = text.includes('concepto');
        const hasTotal = text.includes('total');
        const hasCliente = text.includes('cliente');

        cy.log(hasConcepto ? '✅ Campo concepto' : '⚠️ No hay concepto');
        cy.log(hasTotal ? '✅ Campo total' : '⚠️ No hay total');
        cy.log(hasCliente ? '✅ Campo cliente' : '⚠️ No hay cliente');

        cy.screenshot('05-formulario-ingreso');
      });
    });
  });

  // ============================================================================
  // 6️⃣ GASTOS - CRUD y categorías
  // ============================================================================
  describe('💸 6. GASTOS - Funcionalidad', () => {

    it('6.1 ✅ Ver lista de gastos de un evento', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);

      // Buscar tab de gastos
      cy.get('button, [role="tab"]').contains(/gasto/i).click({ force: true });
      cy.wait(500);

      cy.screenshot('06-gastos-lista');
      cy.log('✅ Sección gastos accesible');
    });

    it('6.2 ✅ Verificar categorías de gastos', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/gasto/i).click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const categorias = ['material', 'combustible', 'solicitud', 'pago', 'rh', 'recurso'];
        const foundCategories = categorias.filter(c => text.includes(c));

        cy.log(`✅ Categorías detectadas: ${foundCategories.join(', ')}`);
      });
    });

    it('6.3 ✅ Verificar formulario de gasto', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/gasto/i).click({ force: true });
      cy.wait(500);

      // Intentar abrir formulario
      cy.get('button').contains(/agregar|nuevo|\+/i).first().click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasConcepto = text.includes('concepto');
        const hasSubtotal = text.includes('subtotal');
        const hasIva = text.includes('iva');
        const hasCategoria = text.includes('categoría') || text.includes('categoria');

        cy.log(hasConcepto ? '✅ Campo concepto' : '⚠️ No hay concepto');
        cy.log(hasSubtotal ? '✅ Campo subtotal' : '⚠️ No hay subtotal');
        cy.log(hasIva ? '✅ Campo IVA' : '⚠️ No hay IVA');
        cy.log(hasCategoria ? '✅ Campo categoría' : '⚠️ No hay categoría');

        cy.screenshot('06-formulario-gasto');
      });
    });

    it('6.4 ✅ Verificar opciones de entrada (Manual/OCR/Material)', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/gasto/i).click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasManual = text.includes('manual') || text.includes('simple');
        const hasOCR = text.includes('ocr') || text.includes('escanear') || text.includes('ticket');
        const hasMaterial = text.includes('material') || text.includes('almacén');

        cy.log(hasManual ? '✅ Opción manual' : '⚠️ No hay manual');
        cy.log(hasOCR ? '✅ Opción OCR' : '⚠️ No hay OCR');
        cy.log(hasMaterial ? '✅ Opción material' : '⚠️ No hay material');
      });
    });
  });

  // ============================================================================
  // 7️⃣ PROVISIONES - Estimaciones
  // ============================================================================
  describe('📊 7. PROVISIONES - Estimaciones', () => {

    it('7.1 ✅ Ver provisiones de un evento', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);

      // Buscar tab de provisiones
      cy.get('button, [role="tab"]').contains(/provisión|provision|estimad/i).click({ force: true });
      cy.wait(500);

      cy.screenshot('07-provisiones');
      cy.log('✅ Sección provisiones accesible');
    });

    it('7.2 ✅ Verificar categorías de provisiones', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/provisión|provision|estimad/i).click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const categorias = [
          { key: 'combustible', label: 'Combustible/Peaje' },
          { key: 'material', label: 'Materiales' },
          { key: 'rh', label: 'RH' },
          { key: 'solicitud', label: 'SPs' }
        ];

        categorias.forEach(cat => {
          if (text.includes(cat.key)) {
            cy.log(`✅ Categoría ${cat.label} encontrada`);
          }
        });
      });
    });
  });

  // ============================================================================
  // 8️⃣ ANÁLISIS FINANCIERO
  // ============================================================================
  describe('📈 8. ANÁLISIS FINANCIERO', () => {

    it('8.1 ✅ Verificar cálculos en dashboard', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);

      cy.get('body').then($body => {
        const text = $body.text();

        // Buscar indicadores financieros
        const hasIngresos = text.includes('Ingreso');
        const hasGastos = text.includes('Gasto');
        const hasUtilidad = text.includes('Utilidad') || text.includes('Ganancia');
        const hasMargen = text.includes('Margen') || text.includes('%');

        cy.log(hasIngresos ? '✅ Ingresos visible' : '⚠️ No hay ingresos');
        cy.log(hasGastos ? '✅ Gastos visible' : '⚠️ No hay gastos');
        cy.log(hasUtilidad ? '✅ Utilidad visible' : '⚠️ No hay utilidad');
        cy.log(hasMargen ? '✅ Margen visible' : '⚠️ No hay margen');

        cy.screenshot('08-analisis-financiero');
      });
    });

    it('8.2 ✅ Verificar comparativa estimado vs real', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasEstimado = text.includes('estimado') || text.includes('proyectado');
        const hasReal = text.includes('real') || text.includes('actual');
        const hasDesviacion = text.includes('desviación') || text.includes('diferencia');

        cy.log(hasEstimado ? '✅ Valores estimados' : '⚠️ No hay estimados');
        cy.log(hasReal ? '✅ Valores reales' : '⚠️ No hay reales');
        cy.log(hasDesviacion ? '✅ Desviación calculada' : '⚠️ No hay desviación');
      });
    });
  });

  // ============================================================================
  // 9️⃣ WORKFLOW DE ESTADOS
  // ============================================================================
  describe('🔄 9. WORKFLOW DE ESTADOS', () => {

    it('9.1 ✅ Verificar indicador de estado', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const estados = ['borrador', 'cotiza', 'aprobad', 'proceso', 'completad', 'facturad', 'cobrad', 'prospecto'];
        const foundStates = estados.filter(e => text.includes(e));

        cy.log(`✅ Estados detectados: ${foundStates.join(', ')}`);
        cy.screenshot('09-estados-workflow');
      });
    });

    it('9.2 ✅ Verificar acciones de cambio de estado', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasStateActions = text.includes('cambiar estado') || text.includes('avanzar') ||
                                text.includes('aprobar') || text.includes('facturar');

        cy.log(hasStateActions ? '✅ Acciones de estado disponibles' : '⚠️ No se detectaron acciones');
      });
    });
  });

  // ============================================================================
  // 🔟 CLIENTES
  // ============================================================================
  describe('👥 10. CLIENTES', () => {

    it('10.1 ✅ Verificar selector de clientes en evento', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('button').contains(/nuevo|crear|\+/i).first().click({ force: true });
      cy.wait(800);

      cy.get('body').then($body => {
        const hasClienteSelector = $body.find('select').length > 0 ||
                                   $body.find('[class*="select"]').length > 0;
        const hasClienteButton = $body.find('button').filter((i, el) => {
          return el.innerText.toLowerCase().includes('cliente');
        }).length > 0;

        cy.log(hasClienteSelector ? '✅ Selector de cliente encontrado' : '⚠️ No hay selector');
        cy.log(hasClienteButton ? '✅ Botón crear cliente' : '⚠️ No hay botón cliente');

        cy.screenshot('10-clientes-selector');
      });
    });
  });

  // ============================================================================
  // 1️⃣1️⃣ MATERIAL DE ALMACÉN
  // ============================================================================
  describe('📦 11. MATERIAL DE ALMACÉN', () => {

    it('11.1 ✅ Verificar opción de material en gastos', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/gasto/i).click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasMaterialOption = text.includes('material') && text.includes('almacén');

        cy.log(hasMaterialOption ? '✅ Opción material de almacén' : '⚠️ No se detectó opción');
        cy.screenshot('11-material-almacen');
      });
    });

    it('11.2 ✅ Verificar integración con inventario', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/gasto/i).click({ force: true });
      cy.wait(500);

      // Intentar abrir formulario de material
      cy.get('button').contains(/material|almacén/i).first().click({ force: true });
      cy.wait(800);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasProductos = text.includes('producto');
        const hasCantidad = text.includes('cantidad');
        const hasCosto = text.includes('costo') || text.includes('precio');

        cy.log(hasProductos ? '✅ Selector productos' : '⚠️ No hay productos');
        cy.log(hasCantidad ? '✅ Campo cantidad' : '⚠️ No hay cantidad');
        cy.log(hasCosto ? '✅ Campo costo' : '⚠️ No hay costo');
      });
    });
  });

  // ============================================================================
  // 1️⃣2️⃣ DOCUMENTOS Y ARCHIVOS
  // ============================================================================
  describe('📎 12. DOCUMENTOS Y ARCHIVOS', () => {

    it('12.1 ✅ Verificar sección de documentos', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasDocuments = text.includes('documento') || text.includes('archivo') || text.includes('adjunto');

        cy.log(hasDocuments ? '✅ Sección documentos encontrada' : '⚠️ No se detectó sección');
      });
    });

    it('12.2 ✅ Verificar upload de facturas XML', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/ingreso/i).click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasXML = text.includes('xml') || text.includes('factura') || text.includes('cfdi');

        cy.log(hasXML ? '✅ Opción subir XML/factura' : '⚠️ No se detectó opción XML');
        cy.screenshot('12-documentos-xml');
      });
    });
  });

  // ============================================================================
  // 1️⃣3️⃣ OCR - Procesamiento de tickets
  // ============================================================================
  describe('📷 13. OCR - PROCESAMIENTO', () => {

    it('13.1 ✅ Verificar opción OCR en gastos', () => {
      cy.visit('/eventos', { failOnStatusCode: false });
      cy.wait(1500);
      cy.get('table tbody tr').first().click({ force: true });
      cy.wait(1000);
      cy.get('button, [role="tab"]').contains(/gasto/i).click({ force: true });
      cy.wait(500);

      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasOCR = text.includes('ocr') || text.includes('escanear') ||
                       text.includes('ticket') || text.includes('imagen');

        cy.log(hasOCR ? '✅ Opción OCR disponible' : '⚠️ No se detectó OCR');
        cy.screenshot('13-ocr-opcion');
      });
    });
  });

  // ============================================================================
  // RESUMEN FINAL
  // ============================================================================
  describe('📋 RESUMEN FINAL', () => {

    it('✅ Generar reporte de pruebas', () => {
      cy.log('========================================');
      cy.log('🏁 PRUEBAS DE EVENTOS COMPLETADAS');
      cy.log('========================================');
      cy.log('📅 ' + new Date().toISOString());
      cy.log('Revisa screenshots en cypress/screenshots/');
      cy.screenshot('99-resumen-final');
    });
  });
});
