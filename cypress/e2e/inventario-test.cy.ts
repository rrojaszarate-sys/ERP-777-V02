/// <reference types="cypress" />

/**
 * ============================================================================
 * 🧪 PRUEBAS AUTOMATIZADAS - MÓDULO DE INVENTARIO
 * ============================================================================
 * 
 * Estas pruebas verifican las funcionalidades principales del módulo.
 * Requieren que el servidor esté corriendo y la base de datos activa.
 * 
 * Ejecutar: npx cypress run --spec "cypress/e2e/inventario-test.cy.ts"
 * Modo interactivo: npx cypress open
 * ============================================================================
 */

describe('MÓDULO DE INVENTARIO - PRUEBAS FUNCIONALES', () => {
  
  // Configuración global
  const BASE_TIMEOUT = 20000;
  
  beforeEach(() => {
    // Limpiar estado antes de cada prueba
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  // ============================================================================
  // PRUEBA 1: ACCESO AL DASHBOARD
  // ============================================================================
  describe('1. Dashboard de Inventario', () => {
    
    it('1.1 Debe cargar el dashboard correctamente', () => {
      cy.visit('/inventario', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      // Verificar que estamos en la página correcta
      cy.url().should('include', '/inventario');
      
      // Verificar que hay contenido
      cy.get('body').should('not.be.empty');
      
      // Verificar título o header
      cy.contains(/inventario/i).should('exist');
      
      cy.screenshot('01-dashboard-cargado');
    });

    it('1.2 Debe mostrar el selector de modo desarrollo', () => {
      cy.visit('/inventario', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      // Verificar modo desarrollo (selector de rol)
      cy.contains(/modo desarrollo/i).should('exist');
      
      cy.screenshot('01-modo-desarrollo');
    });
  });

  // ============================================================================
  // PRUEBA 2: ALMACENES
  // ============================================================================
  describe('2. Gestión de Almacenes', () => {
    
    beforeEach(() => {
      cy.visit('/inventario/almacenes', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
    });

    it('2.1 Debe cargar la página de almacenes', () => {
      cy.url().should('include', '/almacenes');
      cy.contains(/almacen/i).should('exist');
      cy.screenshot('02-almacenes-pagina');
    });

    it('2.2 Debe tener botón para crear nuevo almacén', () => {
      // Buscar botón de nuevo/crear/agregar
      cy.get('button').contains(/nuevo|crear|agregar|\+/i).should('exist');
      cy.screenshot('02-almacenes-boton-nuevo');
    });

    it('2.3 Debe abrir modal al crear nuevo almacén', () => {
      cy.get('button').contains(/nuevo|crear|agregar|\+/i).first().click();
      cy.wait(500);
      
      // Verificar que se abrió un modal/formulario
      cy.get('input').should('exist');
      cy.screenshot('02-almacenes-modal');
    });
  });

  // ============================================================================
  // PRUEBA 3: PRODUCTOS
  // ============================================================================
  describe('3. Gestión de Productos', () => {
    
    beforeEach(() => {
      cy.visit('/inventario/productos', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
    });

    it('3.1 Debe cargar la página de productos', () => {
      cy.url().should('include', '/productos');
      cy.contains(/producto/i).should('exist');
      cy.screenshot('03-productos-pagina');
    });

    it('3.2 Debe tener campo de búsqueda', () => {
      cy.get('input[type="text"], input[type="search"], input[placeholder*="buscar" i]')
        .should('exist');
      cy.screenshot('03-productos-busqueda');
    });

    it('3.3 Debe tener botón para crear producto', () => {
      cy.get('button').contains(/nuevo|crear|agregar|\+/i).should('exist');
      cy.screenshot('03-productos-boton-nuevo');
    });
  });

  // ============================================================================
  // PRUEBA 4: DOCUMENTOS DE INVENTARIO
  // ============================================================================
  describe('4. Documentos de Inventario', () => {
    
    beforeEach(() => {
      cy.visit('/inventario/documentos', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
    });

    it('4.1 Debe cargar la página de documentos', () => {
      cy.url().should('include', '/documentos');
      cy.screenshot('04-documentos-pagina');
    });

    it('4.2 Debe tener botones de entrada y salida', () => {
      // Verificar que existen opciones de entrada/salida
      cy.contains(/entrada/i).should('exist');
      cy.contains(/salida/i).should('exist');
      cy.screenshot('04-documentos-botones');
    });

    it('4.3 Debe abrir formulario de nueva entrada', () => {
      // Click en Nueva Entrada
      cy.contains(/entrada/i).click();
      cy.wait(1000);
      
      // Verificar que se abrió el formulario
      cy.get('input, select').should('exist');
      cy.screenshot('04-documentos-form-entrada');
    });

    it('4.4 El formulario debe tener campo de almacén', () => {
      cy.contains(/entrada/i).click();
      cy.wait(1000);
      
      // Verificar selector de almacén
      cy.contains(/almac[eé]n/i).should('exist');
      cy.screenshot('04-documentos-almacen');
    });

    it('4.5 El formulario debe tener sección de firmas', () => {
      cy.contains(/entrada/i).click();
      cy.wait(1000);
      
      // Verificar sección de firmas
      cy.contains(/firma|entrega|recibe/i).should('exist');
      cy.screenshot('04-documentos-firmas');
    });

    it('4.6 Debe poder cerrar el formulario con Cancelar', () => {
      cy.contains(/entrada/i).click();
      cy.wait(1000);
      
      // Buscar y click en botón cancelar/cerrar
      cy.get('button').contains(/cancelar|cerrar/i).click();
      cy.wait(500);
      
      // Verificar que el formulario se cerró (volvemos a ver la lista)
      cy.url().should('include', '/documentos');
      cy.screenshot('04-documentos-cerrado');
    });
  });

  // ============================================================================
  // PRUEBA 5: STOCK
  // ============================================================================
  describe('5. Consulta de Stock', () => {
    
    it('5.1 Debe cargar la página de stock', () => {
      cy.visit('/inventario/stock', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      cy.url().should('include', '/stock');
      cy.screenshot('05-stock-pagina');
    });

    it('5.2 Debe tener selector de almacén', () => {
      cy.visit('/inventario/stock', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      cy.get('select').should('exist');
      cy.screenshot('05-stock-selector');
    });
  });

  // ============================================================================
  // PRUEBA 6: ETIQUETAS QR
  // ============================================================================
  describe('6. Generación de Etiquetas QR', () => {
    
    it('6.1 Debe cargar la página de etiquetas', () => {
      cy.visit('/inventario/etiquetas', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      cy.url().should('include', '/etiquetas');
      cy.screenshot('06-etiquetas-pagina');
    });

    it('6.2 Debe mostrar lista de productos con checkboxes', () => {
      cy.visit('/inventario/etiquetas', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      // Verificar checkboxes
      cy.get('input[type="checkbox"]').should('exist');
      cy.screenshot('06-etiquetas-checkboxes');
    });
  });

  // ============================================================================
  // PRUEBA 7: CONFIGURACIÓN
  // ============================================================================
  describe('7. Configuración de Inventario', () => {
    
    it('7.1 Debe cargar la página de configuración', () => {
      cy.visit('/inventario/configuracion', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      cy.url().should('include', '/configuracion');
      cy.screenshot('07-configuracion-pagina');
    });

    it('7.2 Debe mostrar toggles de submódulos', () => {
      cy.visit('/inventario/configuracion', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      // Verificar switches/toggles
      cy.get('input[type="checkbox"], [role="switch"]').should('exist');
      cy.screenshot('07-configuracion-toggles');
    });
  });

  // ============================================================================
  // PRUEBA 8: TRANSFERENCIAS
  // ============================================================================
  describe('8. Transferencias entre Almacenes', () => {
    
    it('8.1 Debe cargar la página de transferencias', () => {
      cy.visit('/inventario/transferencias', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      cy.url().should('include', '/transferencias');
      cy.screenshot('08-transferencias-pagina');
    });
  });

  // ============================================================================
  // PRUEBA 9: KARDEX
  // ============================================================================
  describe('9. Consulta de Kardex', () => {
    
    it('9.1 Debe cargar la página de kardex', () => {
      cy.visit('/inventario/kardex', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      cy.url().should('include', '/kardex');
      cy.screenshot('09-kardex-pagina');
    });
  });

  // ============================================================================
  // PRUEBA 10: MOVIMIENTOS
  // ============================================================================
  describe('10. Historial de Movimientos', () => {
    
    it('10.1 Debe cargar la página de movimientos', () => {
      cy.visit('/inventario/movimientos', { timeout: BASE_TIMEOUT });
      cy.wait(2000);
      
      cy.url().should('include', '/movimientos');
      cy.screenshot('10-movimientos-pagina');
    });
  });

  // ============================================================================
  // RESUMEN FINAL
  // ============================================================================
  after(() => {
    cy.log('==========================================');
    cy.log('✅ PRUEBAS DE INVENTARIO COMPLETADAS');
    cy.log('==========================================');
    cy.log('Revisa los screenshots en cypress/screenshots/');
    cy.log('Revisa el reporte en cypress/reports/');
  });
});
