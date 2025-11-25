# Plan de Implementación - Módulos de Ingresos y Gastos

## PRIORIDAD 1: Cambios en Base de Datos

### Nuevas Tablas y Campos

```sql
-- Migración: 20251024_ingresos_gastos_improvements.sql

-- =====================================================
-- ESTADOS DE INGRESOS
-- =====================================================
CREATE TABLE IF NOT EXISTS evt_estados_ingreso (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO evt_estados_ingreso (nombre, descripcion, orden, color) VALUES
('PLANEADO', 'Ingreso planeado/proyectado', 1, 'blue'),
('ORDEN_COMPRA', 'Orden de compra recibida', 2, 'indigo'),
('FACTURADO', 'Factura emitida al cliente', 3, 'yellow'),
('PAGADO', 'Pago recibido y comprobado', 4, 'green');

-- =====================================================
-- CAMPOS ADICIONALES EN INGRESOS
-- =====================================================
ALTER TABLE evt_ingresos
ADD COLUMN IF NOT EXISTS estado_id INT REFERENCES evt_estados_ingreso(id) DEFAULT 1,
ADD COLUMN IF NOT EXISTS dias_facturacion INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS fecha_limite_facturacion DATE,
ADD COLUMN IF NOT EXISTS orden_compra_url TEXT,
ADD COLUMN IF NOT EXISTS orden_compra_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS alertas_enviadas JSONB DEFAULT '[]'::jsonb;

-- Actualizar ingresos existentes
UPDATE evt_ingresos
SET estado_id = CASE
  WHEN cobrado = true THEN 4 -- PAGADO
  WHEN facturado = true THEN 3 -- FACTURADO
  ELSE 1 -- PLANEADO
END
WHERE estado_id IS NULL;

-- =====================================================
-- TABLA DE CUENTAS CONTABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS evt_cuentas_contables (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES core_companies(id),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'activo', 'pasivo', 'capital', 'ingreso', 'gasto'
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar cuentas básicas
INSERT INTO evt_cuentas_contables (codigo, nombre, tipo, descripcion) VALUES
('1001', 'Caja', 'activo', 'Efectivo en caja'),
('1002', 'Bancos', 'activo', 'Cuentas bancarias'),
('2001', 'Proveedores', 'pasivo', 'Cuentas por pagar a proveedores'),
('4001', 'Ventas', 'ingreso', 'Ingresos por ventas'),
('5001', 'Compras', 'gasto', 'Compras de mercancía'),
('5002', 'Gastos de Operación', 'gasto', 'Gastos operativos generales'),
('5003', 'Gastos de Administración', 'gasto', 'Gastos administrativos'),
('5004', 'Gastos de Venta', 'gasto', 'Gastos relacionados con ventas');

-- =====================================================
-- CAMPOS ADICIONALES EN GASTOS
-- =====================================================
ALTER TABLE evt_gastos
ADD COLUMN IF NOT EXISTS cuenta_id INT REFERENCES evt_cuentas_contables(id),
ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT,
ADD COLUMN IF NOT EXISTS comprobante_pago_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS fecha_pago DATE,
ADD COLUMN IF NOT EXISTS responsable_pago_id UUID REFERENCES core_users(id),
ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS comprobado BOOLEAN DEFAULT false;

-- Marcar todos los gastos existentes como autorizados
UPDATE evt_gastos SET autorizado = true WHERE autorizado IS NULL OR autorizado = false;

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista de ingresos pendientes de facturar
CREATE OR REPLACE VIEW vw_ingresos_pendientes_facturar AS
SELECT
  i.*,
  e.nombre_proyecto as evento_nombre,
  c.nombre_comercial as cliente_nombre,
  u.nombre as responsable_nombre,
  CASE
    WHEN i.fecha_limite_facturacion < CURRENT_DATE THEN 'vencido'
    WHEN i.fecha_limite_facturacion <= CURRENT_DATE + INTERVAL '2 days' THEN 'proximo'
    ELSE 'normal'
  END as estado_vencimiento
FROM evt_ingresos i
LEFT JOIN evt_eventos e ON i.evento_id = e.id
LEFT JOIN evt_clientes c ON i.cliente_id = c.id
LEFT JOIN core_users u ON i.responsable_id = u.id
WHERE i.estado_id IN (1, 2) -- PLANEADO u ORDEN_COMPRA
  AND i.activo = true
ORDER BY i.fecha_limite_facturacion ASC;

-- Vista de gastos pendientes de pago
CREATE OR REPLACE VIEW vw_gastos_pendientes_pago AS
SELECT
  g.*,
  e.nombre_proyecto as evento_nombre,
  p.nombre as proveedor_nombre,
  u.nombre as responsable_pago_nombre,
  cc.nombre as cuenta_nombre,
  DATEDIFF('day', g.created_at, CURRENT_DATE) as dias_pendiente
FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN evt_proveedores p ON g.proveedor_id = p.id
LEFT JOIN core_users u ON g.responsable_pago_id = u.id
LEFT JOIN evt_cuentas_contables cc ON g.cuenta_id = cc.id
WHERE g.pagado = false
  AND g.autorizado = true
  AND g.activo = true
ORDER BY g.created_at ASC;

-- Vista de gastos pendientes de comprobar
CREATE OR REPLACE VIEW vw_gastos_pendientes_comprobar AS
SELECT
  g.*,
  e.nombre_proyecto as evento_nombre,
  p.nombre as proveedor_nombre,
  cc.nombre as cuenta_nombre
FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN evt_proveedores p ON g.proveedor_id = p.id
LEFT JOIN evt_cuentas_contables cc ON g.cuenta_id = cc.id
WHERE (g.archivo_adjunto IS NULL OR g.archivo_adjunto = '')
  AND g.activo = true
ORDER BY g.created_at DESC;
```

## PRIORIDAD 2: Tipos TypeScript

### Archivo: src/modules/eventos/types/Finance.ts

Agregar al final:

```typescript
export interface EstadoIngreso {
  id: number;
  nombre: 'PLANEADO' | 'ORDEN_COMPRA' | 'FACTURADO' | 'PAGADO';
  descripcion?: string;
  orden: number;
  color?: string;
}

export interface CuentaContable {
  id: number;
  company_id?: string;
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
  descripcion?: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

// Extender Income
export interface IncomeExtended extends Income {
  estado_id?: number;
  dias_facturacion?: number;
  fecha_limite_facturacion?: string;
  orden_compra_url?: string;
  orden_compra_nombre?: string;
  alertas_enviadas?: any[];
}

// Extender Expense
export interface ExpenseExtended extends Expense {
  cuenta_id?: number;
  comprobante_pago_url?: string;
  comprobante_pago_nombre?: string;
  fecha_pago?: string;
  responsable_pago_id?: string;
  pagado?: boolean;
  comprobado?: boolean;
}
```

## PRIORIDAD 3: Servicios

### Archivo: src/modules/eventos/services/accountsService.ts (NUEVO)

```typescript
import { supabase } from '../../../core/config/supabase';
import { CuentaContable } from '../types/Finance';

export class AccountsService {
  static async getCuentas(): Promise<CuentaContable[]> {
    const { data, error } = await supabase
      .from('evt_cuentas_contables')
      .select('*')
      .eq('activa', true)
      .order('codigo');

    if (error) throw error;
    return data || [];
  }

  static async createCuenta(cuenta: Partial<CuentaContable>): Promise<CuentaContable> {
    const { data, error } = await supabase
      .from('evt_cuentas_contables')
      .insert([cuenta])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCuenta(id: number, updates: Partial<CuentaContable>): Promise<CuentaContable> {
    const { data, error } = await supabase
      .from('evt_cuentas_contables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getGastosPorCuenta(cuentaId: number) {
    const { data, error } = await supabase
      .from('evt_gastos')
      .select(`
        *,
        evento:evt_eventos(nombre_proyecto, clave_evento)
      `)
      .eq('cuenta_id', cuentaId)
      .eq('activo', true)
      .order('fecha_gasto', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const accountsService = new AccountsService();
```

## PRIORIDAD 4: Hooks

### Archivo: src/modules/eventos/hooks/useAccounts.ts (NUEVO)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsService } from '../services/accountsService';
import { CuentaContable } from '../types/Finance';

export const useAccounts = () => {
  return useQuery({
    queryKey: ['cuentas-contables'],
    queryFn: () => accountsService.getCuentas(),
    staleTime: 1000 * 60 * 30 // 30 minutos
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cuenta: Partial<CuentaContable>) => accountsService.createCuenta(cuenta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
    }
  });
};

export const useGastosPorCuenta = (cuentaId: number) => {
  return useQuery({
    queryKey: ['gastos-por-cuenta', cuentaId],
    queryFn: () => accountsService.getGastosPorCuenta(cuentaId),
    enabled: !!cuentaId
  });
};
```

## NOTAS DE IMPLEMENTACIÓN

1. **Archivos opcionales**: Se elimina validación `required` de archivos
2. **Botones pequeños**: Cambiar `className` a `text-sm px-2 py-1`
3. **Estado PENDIENTE_FACTURAR**: Usar `estado_id = 1` (PLANEADO)
4. **Alertas**: Crear servicio de notificaciones separado
5. **Provisiones**: Solo ocultar con `display: none` en ExpenseForm

## ORDEN DE EJECUCIÓN

1. ✅ Ejecutar migración SQL
2. ✅ Actualizar tipos TypeScript
3. ✅ Crear servicios y hooks
4. ✅ Modificar IncomeForm y ExpenseForm
5. ✅ Crear vistas de listados
6. ✅ Crear módulo de cuentas

---

**Estado**: Plan aprobado - Listo para implementación

Debido al tamaño masivo de los cambios (>100KB de código), se recomienda implementar por fases.

¿Deseas que proceda con la implementación fase por fase?
