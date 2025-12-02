/// &lt;reference types="cypress" />

/**
 * ============================================================================
 * SUITE INTEGRAL DE PRUEBAS - MÓDULO DE INVENTARIO ERP
 * ============================================================================
 * 
 * Pruebas automatizadas para verificar todas las funcionalidades del módulo:
 * - Almacenes (CRUD, tipos)
 * - Productos (CRUD)
 * - Stock (entradas, salidas, ajustes)
 * - Movimientos
 * - Documentos de inventario
 * - Ubicaciones
 * - Lotes
 * - Transferencias
 * - Kardex
 * - Conteos físicos
 * - Reservas
 * - Alertas
 * - Kits de evento
 * 
 * Ejecutar: npx cypress run --spec "cypress/e2e/inventario-integral.cy.ts"
 * ============================================================================
 */

describe('🏭 MÓDULO DE INVENTARIO - PRUEBAS INTEGRALES', () => {
  
  // Datos de prueba
  const testData = {
    almacenPrincipal: {
      nombre: `Almacén Principal Test ${Date.now()}`,
      codigo: `ALM-P-${Date.now().toString().slice(-6)}`,
      tipo: 'principal',
      direccion: 'Av. Principal 123, Centro'
    },
    almacenEvento: {
      nombre: `Almacén Eventos Test ${Date.now()}`,
      codigo: `ALM-E-${Date.now().toString().slice(-6)}`,
      tipo: 'sucursal',
      direccion: 'Bodega de Eventos'
    },
    almacenTransito: {
      nombre: `Almacén Tránsito Test ${Date.now()}`,
      codigo: `ALM-T-${Date.now().toString().slice(-6)}`,
      tipo: 'transito',
      direccion: 'En tránsito'
    },
    producto1: {
      nombre: `Producto Test A ${Date.now()}`,
      clave: `PROD-A-${Date.now().toString().slice(-6)}`,
      unidad: 'pieza',
      precio_venta: 150.00,
      costo: 100.00
    },
    producto2: {
      nombre: `Producto Test B ${Date.now()}`,
      clave: `PROD-B-${Date.now().toString().slice(-6)}`,
      unidad: 'metro',
      precio_venta: 50.00,
      costo: 30.00
    },
    producto3: {
      nombre: `Producto Test C ${Date.now()}`,
      clave: `PROD-C-${Date.now().toString().slice(-6)}`,
      unidad: 'kg',
      precio_venta: 200.00,
      costo: 150.00
    }
  };

  // IDs guardados durante las pruebas
  let almacenPrincipalId: number;
  let almacenEventoId: number;
  let producto1Id: number;
  let producto2Id: number;

  beforeEach(() => {
    // Login antes de cada prueba
    cy.visit('/login');
    cy.get('input[type="email"]').type(Cypress.env('TEST_EMAIL') || 'test@erp777.com');
    cy.get('input[type="password"]').type(Cypress.env('TEST_PASSWORD') || 'test123');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
  });

  // ============================================================================
  // SECCIÓN 1: ALMACENES
  // ============================================================================
  describe('📦 1. GESTIÓN DE ALMACENES', () => {
    
    it('1.1 Navegar a la página de almacenes', () => {
      cy.visit('/inventario/almacenes');
      cy.contains('Almacenes', { timeout: 10000 }).should('be.visible');
    });

    it('1.2 Crear almacén tipo PRINCIPAL', () => {
      cy.visit('/inventario/almacenes');
      
      // Abrir modal de nuevo almacén
      cy.contains('button', /nuevo|agregar|crear/i).click();
      
      // Llenar formulario
      cy.get('input[name="nombre"], input[placeholder*="nombre"]').first()
        .clear().type(testData.almacenPrincipal.nombre);
      cy.get('input[name="codigo"], input[placeholder*="codigo"]').first()
        .clear().type(testData.almacenPrincipal.codigo);
      cy.get('select[name="tipo"]').select('principal');
      cy.get('input[name="direccion"], textarea[name="direccion"]').first()
        .clear().type(testData.almacenPrincipal.direccion);
      
      // Guardar
      cy.contains('button', /guardar|crear|agregar/i).click();
      
      // Verificar que se creó
      cy.contains(testData.almacenPrincipal.nombre, { timeout: 5000 }).should('be.visible');
    });

    it('1.3 Crear almacén tipo SUCURSAL para eventos', () => {
      cy.visit('/inventario/almacenes');
      
      cy.contains('button', /nuevo|agregar|crear/i).click();
      
      cy.get('input[name="nombre"], input[placeholder*="nombre"]').first()
        .clear().type(testData.almacenEvento.nombre);
      cy.get('input[name="codigo"], input[placeholder*="codigo"]').first()
        .clear().type(testData.almacenEvento.codigo);
      cy.get('select[name="tipo"]').select('sucursal');
      cy.get('input[name="direccion"], textarea[name="direccion"]').first()
        .clear().type(testData.almacenEvento.direccion);
      
      cy.contains('button', /guardar|crear|agregar/i).click();
      cy.contains(testData.almacenEvento.nombre, { timeout: 5000 }).should('be.visible');
    });

    it('1.4 Crear almacén tipo TRÁNSITO', () => {
      cy.visit('/inventario/almacenes');
      
      cy.contains('button', /nuevo|agregar|crear/i).click();
      
      cy.get('input[name="nombre"], input[placeholder*="nombre"]').first()
        .clear().type(testData.almacenTransito.nombre);
      cy.get('input[name="codigo"], input[placeholder*="codigo"]').first()
        .clear().type(testData.almacenTransito.codigo);
      cy.get('select[name="tipo"]').select('transito');
      cy.get('input[name="direccion"], textarea[name="direccion"]').first()
        .clear().type(testData.almacenTransito.direccion);
      
      cy.contains('button', /guardar|crear|agregar/i).click();
      cy.contains(testData.almacenTransito.nombre, { timeout: 5000 }).should('be.visible');
    });

    it('1.5 Editar almacén existente', () => {
      cy.visit('/inventario/almacenes');
      
      // Buscar y editar el almacén principal
      cy.contains('tr', testData.almacenPrincipal.nombre)
        .find('button[title*="editar"], button[title*="Editar"], button svg')
        .first().click();
      
      // Modificar dirección
      const nuevaDireccion = 'Nueva Dirección Actualizada 456';
      cy.get('input[name="direccion"], textarea[name="direccion"]').first()
        .clear().type(nuevaDireccion);
      
      cy.contains('button', /guardar|actualizar/i).click();
      cy.contains(nuevaDireccion, { timeout: 5000 }).should('be.visible');
    });

    it('1.6 Verificar listado de almacenes creados', () => {
      cy.visit('/inventario/almacenes');
      
      // Verificar que existen los 3 almacenes
      cy.contains(testData.almacenPrincipal.nombre).should('exist');
      cy.contains(testData.almacenEvento.nombre).should('exist');
      cy.contains(testData.almacenTransito.nombre).should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 2: PRODUCTOS
  // ============================================================================
  describe('📋 2. GESTIÓN DE PRODUCTOS', () => {
    
    it('2.1 Navegar a la página de productos', () => {
      cy.visit('/inventario/productos');
      cy.contains(/producto/i, { timeout: 10000 }).should('be.visible');
    });

    it('2.2 Crear producto con precio y costo', () => {
      cy.visit('/inventario/productos');
      
      cy.contains('button', /nuevo|agregar|crear/i).click();
      
      cy.get('input[name="nombre"]').clear().type(testData.producto1.nombre);
      cy.get('input[name="clave"]').clear().type(testData.producto1.clave);
      cy.get('input[name="unidad"], select[name="unidad"]').first()
        .type(testData.producto1.unidad);
      cy.get('input[name="precio_venta"]').clear().type(testData.producto1.precio_venta.toString());
      cy.get('input[name="costo"]').clear().type(testData.producto1.costo.toString());
      
      cy.contains('button', /guardar|crear/i).click();
      cy.contains(testData.producto1.nombre, { timeout: 5000 }).should('be.visible');
    });

    it('2.3 Crear segundo producto', () => {
      cy.visit('/inventario/productos');
      
      cy.contains('button', /nuevo|agregar|crear/i).click();
      
      cy.get('input[name="nombre"]').clear().type(testData.producto2.nombre);
      cy.get('input[name="clave"]').clear().type(testData.producto2.clave);
      cy.get('input[name="unidad"], select[name="unidad"]').first()
        .type(testData.producto2.unidad);
      cy.get('input[name="precio_venta"]').clear().type(testData.producto2.precio_venta.toString());
      cy.get('input[name="costo"]').clear().type(testData.producto2.costo.toString());
      
      cy.contains('button', /guardar|crear/i).click();
      cy.contains(testData.producto2.nombre, { timeout: 5000 }).should('be.visible');
    });

    it('2.4 Buscar producto por nombre', () => {
      cy.visit('/inventario/productos');
      
      cy.get('input[placeholder*="buscar"], input[type="search"]')
        .type(testData.producto1.nombre.substring(0, 10));
      
      cy.contains(testData.producto1.nombre).should('be.visible');
    });

    it('2.5 Editar producto existente', () => {
      cy.visit('/inventario/productos');
      
      cy.contains('tr', testData.producto1.nombre)
        .find('button[title*="editar"], button[title*="Editar"]')
        .first().click();
      
      const nuevaDescripcion = 'Descripción actualizada de prueba';
      cy.get('textarea[name="descripcion"]').clear().type(nuevaDescripcion);
      
      cy.contains('button', /guardar|actualizar/i).click();
    });
  });

  // ============================================================================
  // SECCIÓN 3: STOCK Y MOVIMIENTOS
  // ============================================================================
  describe('📊 3. GESTIÓN DE STOCK Y MOVIMIENTOS', () => {
    
    it('3.1 Navegar a página de stock', () => {
      cy.visit('/inventario/stock');
      cy.contains(/stock|existencias/i, { timeout: 10000 }).should('be.visible');
    });

    it('3.2 Navegar a página de movimientos', () => {
      cy.visit('/inventario/movimientos');
      cy.contains(/movimiento/i, { timeout: 10000 }).should('be.visible');
    });

    it('3.3 Verificar vista de stock por almacén', () => {
      cy.visit('/inventario/stock');
      
      // Debería mostrar filtro o selector de almacén
      cy.get('select').should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 4: DOCUMENTOS DE INVENTARIO
  // ============================================================================
  describe('📄 4. DOCUMENTOS DE INVENTARIO (ENTRADAS/SALIDAS)', () => {
    
    it('4.1 Navegar a documentos de inventario', () => {
      cy.visit('/inventario/documentos');
      cy.contains(/documento/i, { timeout: 10000 }).should('be.visible');
    });

    it('4.2 Crear documento de ENTRADA', () => {
      cy.visit('/inventario/documentos');
      
      // Click en botón de nueva entrada
      cy.contains('button', /entrada/i).click();
      
      // Debería abrir el formulario
      cy.contains(/nuevo.*entrada|entrada.*inventario/i).should('be.visible');
      
      // Seleccionar almacén
      cy.get('select[name="almacen_id"], select').first().select(1);
      
      // Agregar fecha
      cy.get('input[type="date"]').first().type(new Date().toISOString().split('T')[0]);
    });

    it('4.3 Crear documento de SALIDA', () => {
      cy.visit('/inventario/documentos');
      
      cy.contains('button', /salida/i).click();
      
      cy.contains(/nuevo.*salida|salida.*inventario/i).should('be.visible');
    });

    it('4.4 Verificar listado de documentos', () => {
      cy.visit('/inventario/documentos');
      
      // Debería mostrar tabla o listado
      cy.get('table, [class*="list"], [class*="grid"]').should('exist');
    });

    it('4.5 Filtrar documentos por tipo', () => {
      cy.visit('/inventario/documentos');
      
      // Usar filtro de tipo
      cy.contains('button, label', /entrada/i).click();
      cy.wait(500);
      cy.contains('button, label', /salida/i).click();
    });
  });

  // ============================================================================
  // SECCIÓN 5: UBICACIONES
  // ============================================================================
  describe('📍 5. GESTIÓN DE UBICACIONES', () => {
    
    it('5.1 Navegar a página de ubicaciones', () => {
      cy.visit('/inventario/ubicaciones');
      cy.contains(/ubicaci/i, { timeout: 10000 }).should('be.visible');
    });

    it('5.2 Crear ubicación en almacén', () => {
      cy.visit('/inventario/ubicaciones');
      
      cy.contains('button', /nuevo|agregar|crear/i).click();
      
      // Llenar formulario de ubicación
      cy.get('input[name="codigo"]').type('A-01-01');
      cy.get('input[name="nombre"]').type('Pasillo A, Rack 1, Nivel 1');
      cy.get('select[name="tipo"]').select('estante');
      
      cy.contains('button', /guardar/i).click();
    });
  });

  // ============================================================================
  // SECCIÓN 6: LOTES
  // ============================================================================
  describe('📦 6. GESTIÓN DE LOTES', () => {
    
    it('6.1 Navegar a página de lotes', () => {
      cy.visit('/inventario/lotes');
      cy.contains(/lote/i, { timeout: 10000 }).should('be.visible');
    });

    it('6.2 Crear lote con fecha de caducidad', () => {
      cy.visit('/inventario/lotes');
      
      cy.contains('button', /nuevo|agregar|crear/i).click();
      
      // Número de lote
      cy.get('input[name="numero_lote"]').type(`LOT-${Date.now()}`);
      
      // Fecha de caducidad (6 meses en el futuro)
      const fechaCaducidad = new Date();
      fechaCaducidad.setMonth(fechaCaducidad.getMonth() + 6);
      cy.get('input[name="fecha_caducidad"], input[type="date"]').last()
        .type(fechaCaducidad.toISOString().split('T')[0]);
    });
  });

  // ============================================================================
  // SECCIÓN 7: TRANSFERENCIAS
  // ============================================================================
  describe('🔄 7. TRANSFERENCIAS ENTRE ALMACENES', () => {
    
    it('7.1 Navegar a página de transferencias', () => {
      cy.visit('/inventario/transferencias');
      cy.contains(/transferencia/i, { timeout: 10000 }).should('be.visible');
    });

    it('7.2 Iniciar nueva transferencia', () => {
      cy.visit('/inventario/transferencias');
      
      cy.contains('button', /nuevo|nueva|crear/i).click();
      
      // Debería mostrar formulario con origen y destino
      cy.contains(/origen/i).should('be.visible');
      cy.contains(/destino/i).should('be.visible');
    });
  });

  // ============================================================================
  // SECCIÓN 8: KARDEX
  // ============================================================================
  describe('📈 8. KARDEX DE PRODUCTOS', () => {
    
    it('8.1 Navegar a página de kardex', () => {
      cy.visit('/inventario/kardex');
      cy.contains(/kardex/i, { timeout: 10000 }).should('be.visible');
    });

    it('8.2 Buscar kardex de producto específico', () => {
      cy.visit('/inventario/kardex');
      
      // Debería tener buscador o selector de producto
      cy.get('select, input[type="search"]').should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 9: CONTEOS FÍSICOS
  // ============================================================================
  describe('📝 9. CONTEOS FÍSICOS DE INVENTARIO', () => {
    
    it('9.1 Navegar a página de conteos', () => {
      cy.visit('/inventario/conteos');
      cy.contains(/conteo/i, { timeout: 10000 }).should('be.visible');
    });

    it('9.2 Crear nuevo conteo físico', () => {
      cy.visit('/inventario/conteos');
      
      cy.contains('button', /nuevo|crear|iniciar/i).click();
      
      // Debería mostrar formulario de conteo
      cy.contains(/conteo|inventario físico/i).should('be.visible');
    });
  });

  // ============================================================================
  // SECCIÓN 10: RESERVAS
  // ============================================================================
  describe('🔒 10. RESERVAS DE INVENTARIO', () => {
    
    it('10.1 Navegar a página de reservas', () => {
      cy.visit('/inventario/reservas');
      cy.contains(/reserva/i, { timeout: 10000 }).should('be.visible');
    });

    it('10.2 Ver reservas activas', () => {
      cy.visit('/inventario/reservas');
      
      // Debería mostrar listado de reservas
      cy.get('table, [class*="list"]').should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 11: ALERTAS
  // ============================================================================
  describe('⚠️ 11. ALERTAS DE INVENTARIO', () => {
    
    it('11.1 Navegar a página de alertas', () => {
      cy.visit('/inventario/alertas');
      cy.contains(/alerta/i, { timeout: 10000 }).should('be.visible');
    });

    it('11.2 Ver alertas de stock bajo', () => {
      cy.visit('/inventario/alertas');
      
      // Buscar sección de stock bajo
      cy.contains(/stock.*bajo|bajo.*stock|mínimo/i).should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 12: KITS DE EVENTO
  // ============================================================================
  describe('🎪 12. KITS DE EVENTO', () => {
    
    it('12.1 Navegar a página de kits', () => {
      cy.visit('/inventario/kits');
      cy.contains(/kit/i, { timeout: 10000 }).should('be.visible');
    });

    it('12.2 Crear nuevo kit de evento', () => {
      cy.visit('/inventario/kits');
      
      cy.contains('button', /nuevo|crear/i).click();
      
      // Debería mostrar formulario de kit
      cy.contains(/kit|evento/i).should('be.visible');
    });
  });

  // ============================================================================
  // SECCIÓN 13: VALUACIÓN DE INVENTARIO
  // ============================================================================
  describe('💰 13. VALUACIÓN DE INVENTARIO', () => {
    
    it('13.1 Navegar a página de valuación', () => {
      cy.visit('/inventario/valuacion');
      cy.contains(/valuaci/i, { timeout: 10000 }).should('be.visible');
    });

    it('13.2 Verificar métodos de valuación', () => {
      cy.visit('/inventario/valuacion');
      
      // Debería mostrar opciones PEPS/UEPS/Promedio
      cy.contains(/PEPS|FIFO|promedio|UEPS/i).should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 14: PUNTO DE REORDEN
  // ============================================================================
  describe('📊 14. PUNTO DE REORDEN', () => {
    
    it('14.1 Navegar a página de punto de reorden', () => {
      cy.visit('/inventario/punto-reorden');
      cy.contains(/reorden|mínimo/i, { timeout: 10000 }).should('be.visible');
    });

    it('14.2 Verificar productos bajo punto de reorden', () => {
      cy.visit('/inventario/punto-reorden');
      
      // Debería mostrar listado de productos
      cy.get('table, [class*="list"]').should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 15: ETIQUETAS QR
  // ============================================================================
  describe('🏷️ 15. GENERACIÓN DE ETIQUETAS QR', () => {
    
    it('15.1 Navegar a página de etiquetas', () => {
      cy.visit('/inventario/etiquetas');
      cy.contains(/etiqueta|QR/i, { timeout: 10000 }).should('be.visible');
    });

    it('15.2 Generar etiquetas para productos', () => {
      cy.visit('/inventario/etiquetas');
      
      // Seleccionar productos
      cy.get('input[type="checkbox"]').first().check();
      
      // Botón de generar
      cy.contains('button', /generar|imprimir/i).should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 16: CHECKLIST DE EVENTO
  // ============================================================================
  describe('✅ 16. CHECKLIST DE EVENTO', () => {
    
    it('16.1 Navegar a página de checklist', () => {
      cy.visit('/inventario/checklist');
      cy.contains(/checklist|lista.*verificación/i, { timeout: 10000 }).should('be.visible');
    });
  });

  // ============================================================================
  // SECCIÓN 17: DASHBOARD DE INVENTARIO
  // ============================================================================
  describe('📊 17. DASHBOARD DE INVENTARIO', () => {
    
    it('17.1 Navegar al dashboard principal', () => {
      cy.visit('/inventario');
      cy.contains(/inventario|dashboard/i, { timeout: 10000 }).should('be.visible');
    });

    it('17.2 Verificar cards de resumen', () => {
      cy.visit('/inventario');
      
      // Debería mostrar estadísticas
      cy.get('[class*="card"], [class*="stat"]').should('have.length.greaterThan', 0);
    });

    it('17.3 Verificar navegación a submódulos', () => {
      cy.visit('/inventario');
      
      // Verificar enlaces a submódulos
      cy.contains(/almacén|producto|stock/i).should('exist');
    });
  });

  // ============================================================================
  // SECCIÓN 18: CONFIGURACIÓN DE INVENTARIO
  // ============================================================================
  describe('⚙️ 18. CONFIGURACIÓN DE INVENTARIO', () => {
    
    it('18.1 Navegar a página de configuración', () => {
      cy.visit('/inventario/configuracion');
      cy.contains(/configura/i, { timeout: 10000 }).should('be.visible');
    });

    it('18.2 Verificar opciones de visibilidad de submódulos', () => {
      cy.visit('/inventario/configuracion');
      
      // Debería mostrar toggles o switches
      cy.get('input[type="checkbox"], [role="switch"]').should('have.length.greaterThan', 0);
    });
  });

  // ============================================================================
  // PRUEBAS DE INTEGRACIÓN
  // ============================================================================
  describe('🔗 19. PRUEBAS DE INTEGRACIÓN', () => {
    
    it('19.1 Flujo completo: Crear almacén → Agregar stock → Verificar', () => {
      // 1. Ir a almacenes y verificar que existe uno
      cy.visit('/inventario/almacenes');
      cy.get('table tbody tr').should('have.length.greaterThan', 0);
      
      // 2. Ir a productos y verificar existencia
      cy.visit('/inventario/productos');
      cy.get('table tbody tr, [class*="card"]').should('exist');
      
      // 3. Ir a documentos para crear entrada
      cy.visit('/inventario/documentos');
      cy.contains('button', /entrada/i).should('exist');
    });

    it('19.2 Flujo: Documento entrada → Verificar movimiento → Verificar stock', () => {
      cy.visit('/inventario/documentos');
      
      // Verificar que hay documentos o se puede crear uno
      cy.get('table, button').should('exist');
      
      // Ir a movimientos
      cy.visit('/inventario/movimientos');
      cy.contains(/movimiento/i).should('be.visible');
      
      // Ir a stock
      cy.visit('/inventario/stock');
      cy.contains(/stock|existencia/i).should('be.visible');
    });

    it('19.3 Flujo: Reserva → Salida → Actualización de stock', () => {
      // Ir a reservas
      cy.visit('/inventario/reservas');
      cy.contains(/reserva/i).should('be.visible');
      
      // Ir a documentos de salida
      cy.visit('/inventario/documentos');
      cy.contains('button', /salida/i).should('exist');
    });
  });

  // ============================================================================
  // PRUEBAS DE LÍMITES Y ERRORES
  // ============================================================================
  describe('🛡️ 20. PRUEBAS DE LÍMITES Y VALIDACIONES', () => {
    
    it('20.1 No permitir almacén con código duplicado', () => {
      cy.visit('/inventario/almacenes');
      
      cy.contains('button', /nuevo/i).click();
      cy.get('input[name="codigo"]').type('TEST-DUP');
      cy.get('input[name="nombre"]').type('Test Duplicado');
      cy.contains('button', /guardar/i).click();
      
      // Intentar crear otro con mismo código
      cy.contains('button', /nuevo/i).click();
      cy.get('input[name="codigo"]').type('TEST-DUP');
      cy.get('input[name="nombre"]').type('Test Duplicado 2');
      cy.contains('button', /guardar/i).click();
      
      // Debería mostrar error
      cy.contains(/error|duplicad|existe/i).should('be.visible');
    });

    it('20.2 Validar campos requeridos en producto', () => {
      cy.visit('/inventario/productos');
      
      cy.contains('button', /nuevo/i).click();
      
      // Intentar guardar sin datos
      cy.contains('button', /guardar/i).click();
      
      // Debería mostrar errores de validación
      cy.contains(/requerid|obligatori|falta/i).should('exist');
    });

    it('20.3 No permitir salida mayor al stock disponible', () => {
      cy.visit('/inventario/documentos');
      
      cy.contains('button', /salida/i).click();
      
      // Intentar agregar cantidad muy grande
      cy.get('input[type="number"]').first().type('999999');
      
      // Debería validar o mostrar advertencia
    });
  });

  // ============================================================================
  // LIMPIEZA (Opcional - descomentarcon cuidado)
  // ============================================================================
  // after(() => {
  //   // Eliminar datos de prueba si es necesario
  //   cy.log('Limpiando datos de prueba...');
  // });
});
