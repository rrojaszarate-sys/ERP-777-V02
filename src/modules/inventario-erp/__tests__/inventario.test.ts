/**
 * ============================================================================
 * PRUEBAS UNITARIAS - SERVICIOS DE INVENTARIO
 * ============================================================================
 * 
 * Pruebas para verificar la lógica de negocio de los servicios de inventario.
 * Estas pruebas se ejecutan contra Supabase en modo de prueba.
 * 
 * Ejecutar: npx vitest run src/modules/inventario-erp/__tests__/inventario.test.ts
 * ============================================================================
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase para pruebas
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Company ID de prueba (debe existir en la BD)
const TEST_COMPANY_ID = process.env.TEST_COMPANY_ID || 'test-company-uuid';

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================
const testData = {
  almacen: {
    nombre: `Test Almacén ${Date.now()}`,
    codigo: `TEST-${Date.now()}`,
    direccion: 'Dirección de prueba',
    tipo: 'principal',
    activo: true,
    company_id: TEST_COMPANY_ID
  },
  producto: {
    nombre: `Test Producto ${Date.now()}`,
    clave: `TPROD-${Date.now()}`,
    descripcion: 'Producto de prueba para tests',
    unidad: 'pieza',
    precio_venta: 100.00,
    costo: 50.00,
    company_id: TEST_COMPANY_ID
  }
};

// IDs creados durante las pruebas para limpieza
let createdAlmacenId: number | null = null;
let createdProductoId: number | null = null;
let createdMovimientoIds: number[] = [];

// ============================================================================
// SUITE: ALMACENES
// ============================================================================
describe('📦 Servicios de Almacenes', () => {
  
  describe('fetchAlmacenes', () => {
    it('debe retornar un array de almacenes', async () => {
      const { data, error } = await supabase
        .from('almacenes_erp')
        .select('*')
        .eq('company_id', TEST_COMPANY_ID);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('debe filtrar por company_id correctamente', async () => {
      const { data, error } = await supabase
        .from('almacenes_erp')
        .select('*')
        .eq('company_id', TEST_COMPANY_ID);
      
      expect(error).toBeNull();
      if (data && data.length > 0) {
        data.forEach(almacen => {
          expect(almacen.company_id).toBe(TEST_COMPANY_ID);
        });
      }
    });
  });

  describe('createAlmacen', () => {
    it('debe crear un almacén correctamente', async () => {
      const { data, error } = await supabase
        .from('almacenes_erp')
        .insert([testData.almacen])
        .select()
        .single();
      
      if (data) {
        createdAlmacenId = data.id;
      }
      
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.nombre).toBe(testData.almacen.nombre);
      expect(data?.codigo).toBe(testData.almacen.codigo);
      expect(data?.tipo).toBe('principal');
    });

    it('debe fallar con código duplicado', async () => {
      if (!createdAlmacenId) return;
      
      const { data, error } = await supabase
        .from('almacenes_erp')
        .insert([{
          ...testData.almacen,
          nombre: 'Otro nombre'
        }])
        .select()
        .single();
      
      // Debería fallar por constraint unique en código
      expect(error).not.toBeNull();
    });
  });

  describe('updateAlmacen', () => {
    it('debe actualizar un almacén existente', async () => {
      if (!createdAlmacenId) return;
      
      const nuevaDireccion = 'Nueva Dirección Actualizada';
      
      const { data, error } = await supabase
        .from('almacenes_erp')
        .update({ direccion: nuevaDireccion })
        .eq('id', createdAlmacenId)
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data?.direccion).toBe(nuevaDireccion);
    });
  });

  describe('Tipos de almacén', () => {
    it('debe aceptar tipo "principal"', async () => {
      const { data, error } = await supabase
        .from('almacenes_erp')
        .insert([{
          ...testData.almacen,
          codigo: `TEST-P-${Date.now()}`,
          nombre: 'Test Principal',
          tipo: 'principal'
        }])
        .select()
        .single();
      
      if (data) {
        // Limpieza inmediata
        await supabase.from('almacenes_erp').delete().eq('id', data.id);
      }
      
      expect(error).toBeNull();
      expect(data?.tipo).toBe('principal');
    });

    it('debe aceptar tipo "sucursal"', async () => {
      const { data, error } = await supabase
        .from('almacenes_erp')
        .insert([{
          ...testData.almacen,
          codigo: `TEST-S-${Date.now()}`,
          nombre: 'Test Sucursal',
          tipo: 'sucursal'
        }])
        .select()
        .single();
      
      if (data) {
        await supabase.from('almacenes_erp').delete().eq('id', data.id);
      }
      
      expect(error).toBeNull();
      expect(data?.tipo).toBe('sucursal');
    });

    it('debe aceptar tipo "transito"', async () => {
      const { data, error } = await supabase
        .from('almacenes_erp')
        .insert([{
          ...testData.almacen,
          codigo: `TEST-T-${Date.now()}`,
          nombre: 'Test Tránsito',
          tipo: 'transito'
        }])
        .select()
        .single();
      
      if (data) {
        await supabase.from('almacenes_erp').delete().eq('id', data.id);
      }
      
      expect(error).toBeNull();
      expect(data?.tipo).toBe('transito');
    });

    it('debe rechazar tipo inválido', async () => {
      const { data, error } = await supabase
        .from('almacenes_erp')
        .insert([{
          ...testData.almacen,
          codigo: `TEST-I-${Date.now()}`,
          nombre: 'Test Inválido',
          tipo: 'invalido'
        }])
        .select()
        .single();
      
      // Debería fallar por constraint check
      expect(error).not.toBeNull();
    });
  });
});

// ============================================================================
// SUITE: PRODUCTOS
// ============================================================================
describe('📋 Servicios de Productos', () => {
  
  describe('fetchProductos', () => {
    it('debe retornar un array de productos', async () => {
      const { data, error } = await supabase
        .from('productos_erp')
        .select('*')
        .eq('company_id', TEST_COMPANY_ID)
        .limit(100);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('debe poder buscar por nombre', async () => {
      const { data, error } = await supabase
        .from('productos_erp')
        .select('*')
        .eq('company_id', TEST_COMPANY_ID)
        .ilike('nombre', '%test%')
        .limit(10);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('createProducto', () => {
    it('debe crear un producto correctamente', async () => {
      const { data, error } = await supabase
        .from('productos_erp')
        .insert([testData.producto])
        .select()
        .single();
      
      if (data) {
        createdProductoId = data.id;
      }
      
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.nombre).toBe(testData.producto.nombre);
      expect(data?.clave).toBe(testData.producto.clave);
    });

    it('debe calcular margen correctamente (precio - costo)', async () => {
      if (!createdProductoId) return;
      
      const { data, error } = await supabase
        .from('productos_erp')
        .select('precio_venta, costo')
        .eq('id', createdProductoId)
        .single();
      
      expect(error).toBeNull();
      const margen = (data?.precio_venta || 0) - (data?.costo || 0);
      expect(margen).toBe(50); // 100 - 50 = 50
    });
  });
});

// ============================================================================
// SUITE: MOVIMIENTOS DE INVENTARIO
// ============================================================================
describe('📊 Servicios de Movimientos', () => {
  
  describe('Crear Movimientos', () => {
    it('debe crear movimiento de ENTRADA', async () => {
      if (!createdAlmacenId || !createdProductoId) return;
      
      const { data, error } = await supabase
        .from('movimientos_inventario_erp')
        .insert([{
          almacen_id: createdAlmacenId,
          producto_id: createdProductoId,
          tipo: 'entrada',
          cantidad: 100,
          costo_unitario: 50,
          referencia: `TEST-ENT-${Date.now()}`,
          concepto: 'Entrada de prueba'
        }])
        .select()
        .single();
      
      if (data) {
        createdMovimientoIds.push(data.id);
      }
      
      expect(error).toBeNull();
      expect(data?.tipo).toBe('entrada');
      expect(data?.cantidad).toBe(100);
    });

    it('debe crear movimiento de SALIDA', async () => {
      if (!createdAlmacenId || !createdProductoId) return;
      
      const { data, error } = await supabase
        .from('movimientos_inventario_erp')
        .insert([{
          almacen_id: createdAlmacenId,
          producto_id: createdProductoId,
          tipo: 'salida',
          cantidad: 30,
          referencia: `TEST-SAL-${Date.now()}`,
          concepto: 'Salida de prueba'
        }])
        .select()
        .single();
      
      if (data) {
        createdMovimientoIds.push(data.id);
      }
      
      expect(error).toBeNull();
      expect(data?.tipo).toBe('salida');
      expect(data?.cantidad).toBe(30);
    });

    it('debe crear movimiento de AJUSTE', async () => {
      if (!createdAlmacenId || !createdProductoId) return;
      
      const { data, error } = await supabase
        .from('movimientos_inventario_erp')
        .insert([{
          almacen_id: createdAlmacenId,
          producto_id: createdProductoId,
          tipo: 'ajuste',
          cantidad: 5,
          referencia: `TEST-AJU-${Date.now()}`,
          concepto: 'Ajuste de inventario'
        }])
        .select()
        .single();
      
      if (data) {
        createdMovimientoIds.push(data.id);
      }
      
      expect(error).toBeNull();
      expect(data?.tipo).toBe('ajuste');
    });
  });

  describe('Cálculo de Stock', () => {
    it('debe calcular stock correctamente (entradas - salidas)', async () => {
      if (!createdAlmacenId || !createdProductoId) return;
      
      // Obtener entradas
      const { data: entradas } = await supabase
        .from('movimientos_inventario_erp')
        .select('cantidad')
        .eq('producto_id', createdProductoId)
        .eq('almacen_id', createdAlmacenId)
        .in('tipo', ['entrada', 'ajuste']);
      
      // Obtener salidas
      const { data: salidas } = await supabase
        .from('movimientos_inventario_erp')
        .select('cantidad')
        .eq('producto_id', createdProductoId)
        .eq('almacen_id', createdAlmacenId)
        .eq('tipo', 'salida');
      
      const totalEntradas = (entradas || []).reduce((sum, m) => sum + m.cantidad, 0);
      const totalSalidas = (salidas || []).reduce((sum, m) => sum + m.cantidad, 0);
      const stockActual = totalEntradas - totalSalidas;
      
      // 100 (entrada) + 5 (ajuste) - 30 (salida) = 75
      expect(stockActual).toBe(75);
    });
  });
});

// ============================================================================
// SUITE: DOCUMENTOS DE INVENTARIO
// ============================================================================
describe('📄 Servicios de Documentos de Inventario', () => {
  let documentoId: number | null = null;

  describe('Crear Documentos', () => {
    it('debe crear documento de ENTRADA', async () => {
      if (!createdAlmacenId) return;
      
      const { data, error } = await supabase
        .from('documentos_inventario_erp')
        .insert([{
          tipo: 'entrada',
          fecha: new Date().toISOString().split('T')[0],
          almacen_id: createdAlmacenId,
          estado: 'borrador',
          observaciones: 'Documento de prueba',
          company_id: TEST_COMPANY_ID
        }])
        .select()
        .single();
      
      if (data) {
        documentoId = data.id;
      }
      
      expect(error).toBeNull();
      expect(data?.tipo).toBe('entrada');
      expect(data?.estado).toBe('borrador');
      expect(data?.numero_documento).toBeDefined(); // Auto-generado
    });

    it('debe generar número de documento automáticamente', async () => {
      if (!documentoId) return;
      
      const { data, error } = await supabase
        .from('documentos_inventario_erp')
        .select('numero_documento')
        .eq('id', documentoId)
        .single();
      
      expect(error).toBeNull();
      expect(data?.numero_documento).toMatch(/^ENT-\d{4}-\d+$/);
    });
  });

  describe('Estados de Documento', () => {
    it('debe permitir cambiar a estado "confirmado"', async () => {
      if (!documentoId) return;
      
      const { data, error } = await supabase
        .from('documentos_inventario_erp')
        .update({ estado: 'confirmado' })
        .eq('id', documentoId)
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data?.estado).toBe('confirmado');
    });

    it('debe permitir cambiar a estado "cancelado"', async () => {
      if (!documentoId) return;
      
      const { data, error } = await supabase
        .from('documentos_inventario_erp')
        .update({ estado: 'cancelado' })
        .eq('id', documentoId)
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data?.estado).toBe('cancelado');
    });
  });

  afterAll(async () => {
    // Limpieza del documento
    if (documentoId) {
      await supabase.from('documentos_inventario_erp').delete().eq('id', documentoId);
    }
  });
});

// ============================================================================
// SUITE: UBICACIONES
// ============================================================================
describe('📍 Servicios de Ubicaciones', () => {
  let ubicacionId: number | null = null;

  it('debe crear ubicación en almacén', async () => {
    if (!createdAlmacenId) return;
    
    const { data, error } = await supabase
      .from('ubicaciones_almacen_erp')
      .insert([{
        almacen_id: createdAlmacenId,
        codigo: `A-01-01-${Date.now()}`,
        nombre: 'Pasillo A, Rack 1, Nivel 1',
        pasillo: 'A',
        rack: '01',
        nivel: '01',
        tipo: 'estante',
        es_picking: false,
        activo: true,
        company_id: TEST_COMPANY_ID
      }])
      .select()
      .single();
    
    if (data) {
      ubicacionId = data.id;
    }
    
    expect(error).toBeNull();
    expect(data?.codigo).toContain('A-01-01');
    expect(data?.tipo).toBe('estante');
  });

  afterAll(async () => {
    if (ubicacionId) {
      await supabase.from('ubicaciones_almacen_erp').delete().eq('id', ubicacionId);
    }
  });
});

// ============================================================================
// SUITE: LOTES
// ============================================================================
describe('📦 Servicios de Lotes', () => {
  let loteId: number | null = null;

  it('debe crear lote con fecha de caducidad', async () => {
    if (!createdAlmacenId || !createdProductoId) return;
    
    const fechaCaducidad = new Date();
    fechaCaducidad.setMonth(fechaCaducidad.getMonth() + 6);
    
    const { data, error } = await supabase
      .from('lotes_inventario_erp')
      .insert([{
        producto_id: createdProductoId,
        almacen_id: createdAlmacenId,
        numero_lote: `LOT-TEST-${Date.now()}`,
        fecha_ingreso: new Date().toISOString().split('T')[0],
        fecha_caducidad: fechaCaducidad.toISOString().split('T')[0],
        cantidad_inicial: 100,
        cantidad_actual: 100,
        estado: 'activo',
        company_id: TEST_COMPANY_ID
      }])
      .select()
      .single();
    
    if (data) {
      loteId = data.id;
    }
    
    expect(error).toBeNull();
    expect(data?.estado).toBe('activo');
    expect(data?.cantidad_inicial).toBe(100);
  });

  it('debe actualizar cantidad del lote', async () => {
    if (!loteId) return;
    
    const { data, error } = await supabase
      .from('lotes_inventario_erp')
      .update({ cantidad_actual: 80 })
      .eq('id', loteId)
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data?.cantidad_actual).toBe(80);
  });

  afterAll(async () => {
    if (loteId) {
      await supabase.from('lotes_inventario_erp').delete().eq('id', loteId);
    }
  });
});

// ============================================================================
// SUITE: RESERVAS
// ============================================================================
describe('🔒 Servicios de Reservas', () => {
  let reservaId: number | null = null;

  it('debe crear reserva de inventario', async () => {
    if (!createdAlmacenId || !createdProductoId) return;
    
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);
    
    const { data, error } = await supabase
      .from('reservas_inventario_erp')
      .insert([{
        producto_id: createdProductoId,
        almacen_id: createdAlmacenId,
        cantidad: 10,
        motivo: 'Reserva de prueba',
        referencia_tipo: 'test',
        referencia_id: 1,
        estado: 'activa',
        fecha_vencimiento: fechaVencimiento.toISOString(),
        company_id: TEST_COMPANY_ID
      }])
      .select()
      .single();
    
    if (data) {
      reservaId = data.id;
    }
    
    expect(error).toBeNull();
    expect(data?.estado).toBe('activa');
    expect(data?.cantidad).toBe(10);
  });

  afterAll(async () => {
    if (reservaId) {
      await supabase.from('reservas_inventario_erp').delete().eq('id', reservaId);
    }
  });
});

// ============================================================================
// LIMPIEZA GLOBAL
// ============================================================================
afterAll(async () => {
  console.log('🧹 Limpiando datos de prueba...');
  
  // Limpiar movimientos
  for (const id of createdMovimientoIds) {
    await supabase.from('movimientos_inventario_erp').delete().eq('id', id);
  }
  
  // Limpiar producto
  if (createdProductoId) {
    await supabase.from('productos_erp').delete().eq('id', createdProductoId);
  }
  
  // Limpiar almacén
  if (createdAlmacenId) {
    await supabase.from('almacenes_erp').delete().eq('id', createdAlmacenId);
  }
  
  console.log('✅ Limpieza completada');
});
