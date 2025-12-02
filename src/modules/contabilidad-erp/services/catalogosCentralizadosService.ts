/**
 * SERVICIO PARA CATÁLOGOS CENTRALIZADOS
 * Fuente única de verdad para proveedores, clientes, cuentas, formas de pago
 */

import { supabase } from '@/core/config/supabase';
import type {
  CuentaContable,
  CuentaContableFormData,
  ProveedorCentralizado,
  ProveedorFormData,
  ActualizacionFiscalProveedor,
  ClienteCentralizado,
  ClienteFormData,
  FormaPagoCentralizada,
  EjecutivoCentralizado,
  CategoriaGasto,
  GastoConsolidado
} from '../types/catalogosCentralizados';

// ============================================================================
// CUENTAS CONTABLES
// ============================================================================

export async function getCuentasContables(companyId: string): Promise<CuentaContable[]> {
  const { data, error } = await supabase
    .from('cont_cuentas_contables')
    .select('*')
    .eq('company_id', companyId)
    .eq('activa', true)
    .order('cuenta')
    .order('orden_display');

  if (error) throw error;
  return data || [];
}

export async function getCuentasContablesPorTipo(
  companyId: string,
  tipo: CuentaContable['tipo']
): Promise<CuentaContable[]> {
  const { data, error } = await supabase
    .from('cont_cuentas_contables')
    .select('*')
    .eq('company_id', companyId)
    .eq('tipo', tipo)
    .eq('activa', true)
    .order('cuenta')
    .order('orden_display');

  if (error) throw error;
  return data || [];
}

export async function createCuentaContable(
  companyId: string,
  formData: CuentaContableFormData
): Promise<CuentaContable> {
  const { data, error } = await supabase
    .from('cont_cuentas_contables')
    .insert({
      company_id: companyId,
      ...formData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCuentasContablesPorAnio(
  companyId: string,
  anio: number
): Promise<CuentaContable[]> {
  const { data, error } = await supabase
    .from('cont_cuentas_contables')
    .select('*')
    .eq('company_id', companyId)
    .eq('anio', anio)
    .order('cuenta')
    .order('clave');

  if (error) throw error;
  return data || [];
}

export async function getAniosDisponiblesCuentas(
  companyId: string
): Promise<number[]> {
  const { data, error } = await supabase
    .from('cont_cuentas_contables')
    .select('anio')
    .eq('company_id', companyId)
    .not('anio', 'is', null);

  if (error) throw error;

  const anios = [...new Set((data || []).map(d => d.anio as number))];
  return anios.sort((a, b) => b - a); // Más reciente primero
}

export async function updateCuentaContable(
  id: number,
  formData: Partial<CuentaContableFormData>
): Promise<CuentaContable> {
  const { data, error } = await supabase
    .from('cont_cuentas_contables')
    .update({
      ...formData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCuentaContable(id: number): Promise<void> {
  const { error } = await supabase
    .from('cont_cuentas_contables')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function toggleCuentaContableActiva(
  id: number,
  activa: boolean
): Promise<CuentaContable> {
  const { data, error } = await supabase
    .from('cont_cuentas_contables')
    .update({ activa, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function duplicarEstructuraAnio(
  companyId: string,
  anioOrigen: number,
  anioDestino: number,
  prefijo: string = 'MDE'
): Promise<{ creadas: number; existentes: number }> {
  // Obtener cuentas del año origen
  const cuentasOrigen = await getCuentasContablesPorAnio(companyId, anioOrigen);

  // Filtrar solo las que tienen el prefijo correcto
  const cuentasADuplicar = cuentasOrigen.filter(c =>
    c.clave.includes(String(anioOrigen))
  );

  let creadas = 0;
  let existentes = 0;

  for (const cuenta of cuentasADuplicar) {
    const nuevaClave = cuenta.clave.replace(String(anioOrigen), String(anioDestino));

    // Verificar si ya existe
    const { data: existente } = await supabase
      .from('cont_cuentas_contables')
      .select('id')
      .eq('company_id', companyId)
      .eq('clave', nuevaClave)
      .single();

    if (existente) {
      existentes++;
      continue;
    }

    // Crear nueva cuenta
    await supabase
      .from('cont_cuentas_contables')
      .insert({
        company_id: companyId,
        clave: nuevaClave,
        cuenta: cuenta.cuenta,
        subcuenta: cuenta.subcuenta,
        tipo: cuenta.tipo,
        presupuesto_anual: cuenta.presupuesto_anual,
        orden_display: cuenta.orden_display,
        activa: true,
        descripcion: cuenta.descripcion,
        anio: anioDestino
      });

    creadas++;
  }

  return { creadas, existentes };
}

// ============================================================================
// PROVEEDORES
// ============================================================================

export async function getProveedores(companyId: string): Promise<ProveedorCentralizado[]> {
  // Usar vista unificada que combina proveedores de todo el sistema (proveedores_erp)
  const { data, error } = await supabase
    .from('v_proveedores_unificados')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data || [];
}

export async function getProveedorById(id: number): Promise<ProveedorCentralizado | null> {
  const { data, error } = await supabase
    .from('v_proveedores_unificados')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createProveedor(
  companyId: string,
  formData: ProveedorFormData
): Promise<ProveedorCentralizado> {
  // Insertar en tabla unificada proveedores_erp
  const { data, error } = await supabase
    .from('proveedores_erp')
    .insert({
      company_id: companyId,
      nombre_comercial: formData.nombre,
      razon_social: formData.razon_social || formData.nombre,
      rfc: formData.rfc,
      direccion: formData.direccion,
      telefono: formData.telefono,
      email: formData.email,
      contacto_nombre: formData.contacto_nombre,
      categoria: formData.categoria,
      activo: true,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Retornar en formato esperado
  return {
    ...data,
    nombre: data.nombre_comercial || data.razon_social,
    datos_fiscales_completos: !!(data.rfc && data.razon_social),
    requiere_actualizacion: !(data.rfc && data.razon_social),
    created_at: data.fecha_creacion,
    updated_at: data.fecha_actualizacion
  };
}

export async function updateProveedorDatosFiscales(
  id: number,
  datos: ActualizacionFiscalProveedor
): Promise<ProveedorCentralizado> {
  const { data, error } = await supabase
    .from('proveedores_erp')
    .update({
      rfc: datos.rfc,
      razon_social: datos.razon_social,
      direccion: datos.direccion,
      fecha_actualizacion: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    nombre: data.nombre_comercial || data.razon_social,
    datos_fiscales_completos: true,
    requiere_actualizacion: false,
    regimen_fiscal: datos.regimen_fiscal,
    fecha_actualizacion_fiscal: new Date().toISOString(),
    created_at: data.fecha_creacion,
    updated_at: data.fecha_actualizacion
  };
}

export async function buscarProveedorPorRFC(
  companyId: string,
  rfc: string
): Promise<ProveedorCentralizado | null> {
  const { data, error } = await supabase
    .from('proveedores_erp')
    .select('*')
    .eq('company_id', companyId)
    .eq('rfc', rfc.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    nombre: data.nombre_comercial || data.razon_social,
    datos_fiscales_completos: !!(data.rfc && data.razon_social),
    requiere_actualizacion: !(data.rfc && data.razon_social),
    created_at: data.fecha_creacion,
    updated_at: data.fecha_actualizacion
  };
}

// ============================================================================
// CLIENTES
// ============================================================================

export async function getClientes(companyId: string): Promise<ClienteCentralizado[]> {
  const { data, error } = await supabase
    .from('cont_clientes')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data || [];
}

export async function getClienteById(id: number): Promise<ClienteCentralizado | null> {
  const { data, error } = await supabase
    .from('cont_clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createCliente(
  companyId: string,
  formData: ClienteFormData
): Promise<ClienteCentralizado> {
  const { data, error } = await supabase
    .from('cont_clientes')
    .insert({
      company_id: companyId,
      ...formData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCliente(
  id: number,
  formData: Partial<ClienteFormData>
): Promise<ClienteCentralizado> {
  const { data, error } = await supabase
    .from('cont_clientes')
    .update({
      ...formData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// FORMAS DE PAGO
// ============================================================================

export async function getFormasPago(companyId?: string): Promise<FormaPagoCentralizada[]> {
  let query = supabase
    .from('cont_formas_pago')
    .select('*')
    .eq('activa', true)
    .order('nombre');

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getFormaPagoPorCodigoSAT(codigoSat: string): Promise<FormaPagoCentralizada | null> {
  const { data, error } = await supabase
    .from('cont_formas_pago')
    .select('*')
    .eq('codigo_sat', codigoSat)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ============================================================================
// EJECUTIVOS
// ============================================================================

export async function getEjecutivos(companyId: string): Promise<EjecutivoCentralizado[]> {
  const { data, error } = await supabase
    .from('cont_ejecutivos')
    .select('*')
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data || [];
}

export async function getEjecutivosConPermisoAprobacion(companyId: string): Promise<EjecutivoCentralizado[]> {
  const { data, error } = await supabase
    .from('cont_ejecutivos')
    .select('*')
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .eq('activo', true)
    .eq('puede_aprobar_gastos', true)
    .order('nombre');

  if (error) throw error;
  return data || [];
}

// ============================================================================
// CATEGORÍAS DE GASTO
// ============================================================================

export async function getCategoriasGasto(companyId?: string): Promise<CategoriaGasto[]> {
  let query = supabase
    .from('cat_categorias_gasto')
    .select('*')
    .eq('activo', true)
    .order('orden_display');

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================================================
// VISTA CONSOLIDADA DE GASTOS
// ============================================================================

export async function getGastosConsolidados(
  companyId: string,
  filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    origen?: 'GNI' | 'EVENTO';
    proveedorId?: number;
    cuentaId?: number;
  }
): Promise<GastoConsolidado[]> {
  const { data, error } = await supabase
    .from('v_gastos_consolidados')
    .select('*')
    .eq('company_id', companyId)
    .order('fecha_gasto', { ascending: false });

  if (error) throw error;

  let resultado = data || [];

  // Aplicar filtros en memoria (la vista no tiene todos los filtros)
  if (filtros?.fechaInicio) {
    resultado = resultado.filter(g => g.fecha_gasto >= filtros.fechaInicio!);
  }
  if (filtros?.fechaFin) {
    resultado = resultado.filter(g => g.fecha_gasto <= filtros.fechaFin!);
  }
  if (filtros?.origen) {
    resultado = resultado.filter(g => g.origen === filtros.origen);
  }

  return resultado;
}

// ============================================================================
// UTILIDADES
// ============================================================================

export async function verificarProveedorRequiereActualizacion(id: number): Promise<boolean> {
  const proveedor = await getProveedorById(id);
  if (!proveedor) return false;
  return proveedor.requiere_actualizacion || !proveedor.datos_fiscales_completos;
}

export async function getResumenCatalogos(companyId: string): Promise<{
  cuentas: number;
  proveedores: number;
  clientes: number;
  formasPago: number;
  ejecutivos: number;
}> {
  const [cuentas, proveedores, clientes, formasPago, ejecutivos] = await Promise.all([
    supabase.from('cont_cuentas_contables').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('activa', true),
    supabase.from('cont_proveedores').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('activo', true),
    supabase.from('cont_clientes').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('activo', true),
    supabase.from('cont_formas_pago').select('id', { count: 'exact', head: true }).eq('activa', true),
    supabase.from('cont_ejecutivos').select('id', { count: 'exact', head: true }).eq('activo', true)
  ]);

  return {
    cuentas: cuentas.count || 0,
    proveedores: proveedores.count || 0,
    clientes: clientes.count || 0,
    formasPago: formasPago.count || 0,
    ejecutivos: ejecutivos.count || 0
  };
}
