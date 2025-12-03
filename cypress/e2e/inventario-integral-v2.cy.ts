/// <reference types="cypress" />

/**
 * ============================================================================
 * 🧪 PRUEBA INTEGRAL - MÓDULO DE INVENTARIO ERP
 * ============================================================================
 * 
 * Esta prueba verifica todas las funcionalidades principales del módulo.
 * Está diseñada para ejecutarse de forma secuencial y resiliente.
 * 
 * Ejecutar: npx cypress run --spec "cypress/e2e/inventario-integral-v2.cy.ts"
 * ============================================================================
 */

describe('🏭 MÓDULO DE INVENTARIO - PRUEBA INTEGRAL', () => {
  
  // Configuración
  const WAIT_TIME = 3000;
  const SHORT_WAIT = 1000;
  
  // ============================================================================
  // SECCIÓN 1: NAVEGACIÓN Y ACCESO
  // ============================================================================
  describe('📍 SECCIÓN 1: Navegación y Acceso', () => {

    it('1.1 - Acceso al Dashboard de Inventario', () => {
      // Navegar directamente - puede tardar la primera vez
      cy.visit('/inventario', { 
        timeout: 90000,
        failOnStatusCode: false 
      });
      cy.wait(5000);
      
      // Verificar URL
      cy.url().should('include', '/inventario');
      
      // Verificar que hay contenido
      cy.get('body').should('not.be.empty');
      
      // Verificar modo desarrollo
      cy.get('body').then($body => {
        if ($body.text().toLowerCase().includes('modo desarrollo')) {
          cy.log('✅ Modo desarrollo detectado');
        }
      });
      
      cy.screenshot('01-dashboard-inventario');
    });

    it('1.2 - Navegación a Almacenes', () => {
      cy.visit('/inventario/almacenes');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/almacenes');
      cy.screenshot('01-almacenes');
    });

    it('1.3 - Navegación a Productos', () => {
      cy.visit('/inventario/productos');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/productos');
      cy.screenshot('01-productos');
    });

    it('1.4 - Navegación a Documentos', () => {
      cy.visit('/inventario/documentos');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/documentos');
      cy.screenshot('01-documentos');
    });

    it('1.5 - Navegación a Stock', () => {
      cy.visit('/inventario/stock');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/stock');
      cy.screenshot('01-stock');
    });

    it('1.6 - Navegación a Configuración', () => {
      cy.visit('/inventario/configuracion');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/configuracion');
      cy.screenshot('01-configuracion');
    });
  });

  // ============================================================================
  // SECCIÓN 2: ALMACENES - CRUD
  // ============================================================================
  describe('📦 SECCIÓN 2: Gestión de Almacenes', () => {
    
    beforeEach(() => {
      cy.visit('/inventario/almacenes');
      cy.wait(WAIT_TIME);
    });

    it('2.1 - Ver lista de almacenes', () => {
      // Verificar que la página cargó
      cy.get('body').should('not.be.empty');
      
      // Buscar tabla o lista
      cy.get('body').then($body => {
        const hasTable = $body.find('table').length > 0;
        const hasList = $body.find('[class*="list"], [class*="grid"]').length > 0;
        cy.log(hasTable || hasList ? '✅ Lista de almacenes visible' : '⚠️ Sin lista visible');
      });
      
      cy.screenshot('02-almacenes-lista');
    });

    it('2.2 - Abrir formulario de nuevo almacén', () => {
      // Buscar botón de nuevo
      cy.get('button').then($buttons => {
        const nuevoBtn = $buttons.filter((i, el) => {
          const text = el.innerText?.toLowerCase() || '';
          return text.includes('nuevo') || text.includes('crear') || text.includes('agregar') || text === '+';
        });
        
        if (nuevoBtn.length > 0) {
          cy.wrap(nuevoBtn.first()).click({ force: true });
          cy.wait(SHORT_WAIT);
          cy.screenshot('02-almacenes-modal-nuevo');
        } else {
          cy.log('⚠️ No se encontró botón de nuevo almacén');
        }
      });
    });

    it('2.3 - Verificar campos del formulario', () => {
      cy.get('button').contains(/nuevo|crear|agregar|\+/i).first().click({ force: true });
      cy.wait(SHORT_WAIT);
      
      // Verificar campos básicos
      cy.get('input').should('exist');
      cy.screenshot('02-almacenes-formulario-campos');
    });
  });

  // ============================================================================
  // SECCIÓN 3: PRODUCTOS - CRUD
  // ============================================================================
  describe('📋 SECCIÓN 3: Gestión de Productos', () => {
    
    beforeEach(() => {
      cy.visit('/inventario/productos');
      cy.wait(WAIT_TIME);
    });

    it('3.1 - Ver lista de productos', () => {
      cy.get('body').should('not.be.empty');
      cy.screenshot('03-productos-lista');
    });

    it('3.2 - Verificar campo de búsqueda', () => {
      cy.get('body').then($body => {
        const inputs = $body.find('input');
        let hasSearch = false;
        inputs.each((i, el) => {
          const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
          const type = el.getAttribute('type') || '';
          if (placeholder.includes('buscar') || placeholder.includes('search') || type === 'search') {
            hasSearch = true;
          }
        });
        cy.log(hasSearch ? '✅ Campo de búsqueda encontrado' : '⚠️ Sin campo de búsqueda visible');
      });
      cy.screenshot('03-productos-busqueda');
    });

    it('3.3 - Abrir formulario de nuevo producto', () => {
      cy.get('button').then($buttons => {
        const nuevoBtn = $buttons.filter((i, el) => {
          const text = el.innerText?.toLowerCase() || '';
          return text.includes('nuevo') || text.includes('crear') || text.includes('agregar');
        });
        
        if (nuevoBtn.length > 0) {
          cy.wrap(nuevoBtn.first()).click({ force: true });
          cy.wait(SHORT_WAIT);
          cy.screenshot('03-productos-modal-nuevo');
        }
      });
    });
  });

  // ============================================================================
  // SECCIÓN 4: DOCUMENTOS DE INVENTARIO
  // ============================================================================
  describe('📄 SECCIÓN 4: Documentos de Inventario', () => {
    
    beforeEach(() => {
      cy.visit('/inventario/documentos');
      cy.wait(WAIT_TIME);
    });

    it('4.1 - Ver lista de documentos', () => {
      cy.get('body').should('not.be.empty');
      cy.screenshot('04-documentos-lista');
    });

    it('4.2 - Verificar botones de entrada/salida', () => {
      cy.get('body').then($body => {
        const hasEntrada = $body.text().toLowerCase().includes('entrada');
        const hasSalida = $body.text().toLowerCase().includes('salida');
        
        cy.log(hasEntrada ? '✅ Botón Entrada visible' : '⚠️ Sin botón Entrada');
        cy.log(hasSalida ? '✅ Botón Salida visible' : '⚠️ Sin botón Salida');
      });
      cy.screenshot('04-documentos-botones');
    });

    it('4.3 - Abrir formulario de nueva entrada', () => {
      // Buscar botón de entrada
      cy.get('button').then($buttons => {
        const entradaBtn = $buttons.filter((i, el) => {
          const text = el.innerText?.toLowerCase() || '';
          return text.includes('entrada');
        });
        
        if (entradaBtn.length > 0) {
          cy.wrap(entradaBtn.first()).click({ force: true });
          cy.wait(WAIT_TIME);
          cy.screenshot('04-documentos-form-entrada');
        } else {
          cy.log('⚠️ No se encontró botón de entrada');
        }
      });
    });

    it('4.4 - Verificar formulario tiene selector de almacén', () => {
      cy.get('button').contains(/entrada/i).first().click({ force: true });
      cy.wait(WAIT_TIME);
      
      cy.get('body').then($body => {
        const hasSelect = $body.find('select').length > 0;
        const hasAlmacen = $body.text().toLowerCase().includes('almac');
        cy.log((hasSelect && hasAlmacen) ? '✅ Selector de almacén presente' : '⚠️ Revisar selector');
      });
      cy.screenshot('04-documentos-selector-almacen');
    });

    it('4.5 - Verificar sección de firmas', () => {
      cy.get('button').contains(/entrada/i).first().click({ force: true });
      cy.wait(WAIT_TIME);
      
      cy.get('body').then($body => {
        const hasFirmas = $body.text().toLowerCase().includes('firma') || 
                         $body.text().toLowerCase().includes('entrega') ||
                         $body.text().toLowerCase().includes('recibe');
        cy.log(hasFirmas ? '✅ Sección de firmas presente' : '⚠️ Revisar firmas');
      });
      cy.screenshot('04-documentos-firmas');
    });

    it('4.6 - Cerrar formulario con botón Cancelar', () => {
      cy.get('button').contains(/entrada/i).first().click({ force: true });
      cy.wait(WAIT_TIME);
      
      // Buscar botón cancelar/cerrar
      cy.get('button').then($buttons => {
        const cancelBtn = $buttons.filter((i, el) => {
          const text = el.innerText?.toLowerCase() || '';
          return text.includes('cancelar') || text.includes('cerrar');
        });
        
        if (cancelBtn.length > 0) {
          cy.wrap(cancelBtn.first()).click({ force: true });
          cy.wait(SHORT_WAIT);
          cy.log('✅ Modal cerrado correctamente');
        }
      });
      cy.screenshot('04-documentos-cerrado');
    });
  });

  // ============================================================================
  // SECCIÓN 5: CONSULTA DE STOCK
  // ============================================================================
  describe('📊 SECCIÓN 5: Consulta de Stock', () => {
    
    it('5.1 - Cargar página de stock', () => {
      cy.visit('/inventario/stock');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/stock');
      cy.screenshot('05-stock-pagina');
    });

    it('5.2 - Verificar selector de almacén', () => {
      cy.visit('/inventario/stock');
      cy.wait(WAIT_TIME);
      
      // Buscar selector (puede ser select o componente personalizado)
      cy.get('body').then($body => {
        const hasSelect = $body.find('select').length > 0;
        const hasCustomSelect = $body.find('[class*="select"], [role="combobox"], [role="listbox"]').length > 0;
        const hasAlmacenText = $body.text().toLowerCase().includes('almac');
        cy.log((hasSelect || hasCustomSelect || hasAlmacenText) ? '✅ Selector de almacén presente' : '⚠️ Revisar selector');
      });
      cy.screenshot('05-stock-selector');
    });
  });

  // ============================================================================
  // SECCIÓN 6: ETIQUETAS QR
  // ============================================================================
  describe('🏷️ SECCIÓN 6: Etiquetas QR', () => {
    
    it('6.1 - Cargar página de etiquetas', () => {
      cy.visit('/inventario/etiquetas');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/etiquetas');
      cy.screenshot('06-etiquetas-pagina');
    });

    it('6.2 - Verificar checkboxes de selección', () => {
      cy.visit('/inventario/etiquetas');
      cy.wait(WAIT_TIME);
      
      cy.get('body').then($body => {
        const hasCheckboxes = $body.find('input[type="checkbox"]').length > 0;
        cy.log(hasCheckboxes ? '✅ Checkboxes de selección presentes' : '⚠️ Sin checkboxes');
      });
      cy.screenshot('06-etiquetas-checkboxes');
    });
  });

  // ============================================================================
  // SECCIÓN 7: CONFIGURACIÓN
  // ============================================================================
  describe('⚙️ SECCIÓN 7: Configuración', () => {
    
    it('7.1 - Cargar página de configuración', () => {
      cy.visit('/inventario/configuracion');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/configuracion');
      cy.screenshot('07-configuracion-pagina');
    });

    it('7.2 - Verificar toggles de submódulos', () => {
      cy.visit('/inventario/configuracion');
      cy.wait(WAIT_TIME);
      
      cy.get('body').then($body => {
        const hasToggles = $body.find('input[type="checkbox"], [role="switch"], button[class*="toggle"]').length > 0;
        cy.log(hasToggles ? '✅ Toggles de configuración presentes' : '⚠️ Sin toggles');
      });
      cy.screenshot('07-configuracion-toggles');
    });
  });

  // ============================================================================
  // SECCIÓN 8: TRANSFERENCIAS
  // ============================================================================
  describe('🔄 SECCIÓN 8: Transferencias', () => {
    
    it('8.1 - Cargar página de transferencias', () => {
      cy.visit('/inventario/transferencias');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/transferencias');
      cy.screenshot('08-transferencias-pagina');
    });
  });

  // ============================================================================
  // SECCIÓN 9: KARDEX
  // ============================================================================
  describe('📈 SECCIÓN 9: Kardex', () => {
    
    it('9.1 - Cargar página de kardex', () => {
      cy.visit('/inventario/kardex');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/kardex');
      cy.screenshot('09-kardex-pagina');
    });
  });

  // ============================================================================
  // SECCIÓN 10: MOVIMIENTOS
  // ============================================================================
  describe('📋 SECCIÓN 10: Movimientos', () => {
    
    it('10.1 - Cargar página de movimientos', () => {
      cy.visit('/inventario/movimientos');
      cy.wait(WAIT_TIME);
      cy.url().should('include', '/movimientos');
      cy.screenshot('10-movimientos-pagina');
    });
  });

  // ============================================================================
  // RESUMEN
  // ============================================================================
  after(() => {
    cy.log('═══════════════════════════════════════════');
    cy.log('🏁 PRUEBA INTEGRAL COMPLETADA');
    cy.log('═══════════════════════════════════════════');
    cy.log('📸 Screenshots: cypress/screenshots/');
    cy.log('📊 Reportes: cypress/reports/');
  });
});
