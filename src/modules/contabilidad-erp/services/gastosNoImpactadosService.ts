/**
 * SERVICIO DE GASTOS NO IMPACTADOS (GNI)
 * CRUD y operaciones para gestión de gastos operativos
 */

import { supabase } from '../../../core/config/supabase';
import type {
  GastoNoImpactado,
  GastoNoImpactadoView,
  GastoNoImpactadoFormData,
  ClaveGasto,
  FormaPago,
  Proveedor,
  Ejecutivo,
  GNIFiltros,
  GNITotalesPeriodo,
  ProveedorFormData,
  ClaveGastoFormData,
  ImportExcelResult,
  ExcelGastoRow,
  MembreteConfig
} from '../types/gastosNoImpactados';

// ============================================================================
// GASTOS NO IMPACTADOS - CRUD
// ============================================================================

export const fetchGastosNoImpactados = async (
  companyId: string,
  filtros?: GNIFiltros
) => {
  let query = supabase
    .from('v_gastos_no_impactados')
    .select('*')
    .eq('company_id', companyId)
    .order('fecha_gasto', { ascending: false });

  if (filtros?.periodo) {
    query = query.eq('periodo', filtros.periodo);
  }
  if (filtros?.cuenta) {
    query = query.eq('cuenta', filtros.cuenta);
  }
  if (filtros?.clave_gasto_id) {
    query = query.eq('clave_gasto_id', filtros.clave_gasto_id);
  }
  if (filtros?.proveedor_id) {
    query = query.eq('proveedor_id', filtros.proveedor_id);
  }
  if (filtros?.ejecutivo_id) {
    query = query.eq('ejecutivo_id', filtros.ejecutivo_id);
  }
  if (filtros?.forma_pago_id) {
    query = query.eq('forma_pago_id', filtros.forma_pago_id);
  }
  if (filtros?.validacion) {
    query = query.eq('validacion', filtros.validacion);
  }
  if (filtros?.status_pago) {
    query = query.eq('status_pago', filtros.status_pago);
  }
  if (filtros?.fecha_inicio) {
    query = query.gte('fecha_gasto', filtros.fecha_inicio);
  }
  if (filtros?.fecha_fin) {
    query = query.lte('fecha_gasto', filtros.fecha_fin);
  }

  // Supabase tiene límite default de 1000 - establecemos explícitamente un límite mayor
  const { data, error } = await query.limit(5000);
  if (error) throw error;
  return data as GastoNoImpactadoView[];
};

export const fetchGastoById = async (id: number) => {
  const { data, error } = await supabase
    .from('cont_gastos_externos')
    .select(`
      *,
      clave_gasto:cont_claves_gasto(*),
      proveedor_rel:cont_proveedores(*),
      forma_pago_rel:cont_formas_pago(*),
      ejecutivo_rel:cont_ejecutivos(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createGasto = async (
  gasto: GastoNoImpactadoFormData,
  companyId: string,
  userId?: string
) => {
  const { data, error } = await supabase
    .from('cont_gastos_externos')
    .insert([{
      company_id: companyId,
      tipo: 'gasto_operativo',
      concepto: gasto.concepto,
      subtotal: gasto.subtotal,
      iva: gasto.iva,
      iva_porcentaje: gasto.iva > 0 ? (gasto.iva / gasto.subtotal) * 100 : 0,
      total: gasto.total,
      clave_gasto_id: gasto.clave_gasto_id,
      proveedor_id: gasto.proveedor_id,
      forma_pago_id: gasto.forma_pago_id,
      ejecutivo_id: gasto.ejecutivo_id,
      periodo: gasto.periodo,
      fecha_gasto: gasto.fecha_gasto,
      validacion: gasto.validacion,
      status_pago: gasto.status_pago,
      pagado: gasto.status_pago === 'pagado',
      folio_factura: gasto.folio_factura,
      documento_url: gasto.documento_url,
      notas: gasto.notas,
      cuenta_id: 1, // Default, se puede configurar
      importado_de: 'manual',
      created_by: userId
    }])
    .select()
    .single();

  if (error) throw error;
  return data as GastoNoImpactado;
};

export const updateGasto = async (
  id: number,
  updates: Partial<GastoNoImpactadoFormData>,
  userId?: string
) => {
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_by: userId,
    updated_at: new Date().toISOString()
  };

  if (updates.status_pago) {
    updateData.pagado = updates.status_pago === 'pagado';
  }

  const { data, error } = await supabase
    .from('cont_gastos_externos')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as GastoNoImpactado;
};

export const deleteGasto = async (id: number) => {
  const { error } = await supabase
    .from('cont_gastos_externos')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw error;
  return true;
};

// ============================================================================
// CATÁLOGO: CLAVES DE GASTO
// ============================================================================

export const fetchClavesGasto = async (companyId: string) => {
  const { data, error } = await supabase
    .from('cont_claves_gasto')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('cuenta')
    .order('clave');

  if (error) throw error;
  return data as ClaveGasto[];
};

export const fetchClavesGastoAgrupadas = async (companyId: string) => {
  const claves = await fetchClavesGasto(companyId);

  // Agrupar por cuenta
  const agrupadas: Record<string, ClaveGasto[]> = {};
  claves.forEach(clave => {
    if (!agrupadas[clave.cuenta]) {
      agrupadas[clave.cuenta] = [];
    }
    agrupadas[clave.cuenta].push(clave);
  });

  return agrupadas;
};

export const createClaveGasto = async (
  clave: ClaveGastoFormData,
  companyId: string
) => {
  const { data, error } = await supabase
    .from('cont_claves_gasto')
    .insert([{ ...clave, company_id: companyId }])
    .select()
    .single();

  if (error) throw error;
  return data as ClaveGasto;
};

export const updateClaveGasto = async (
  id: number,
  updates: Partial<ClaveGastoFormData>
) => {
  const { data, error } = await supabase
    .from('cont_claves_gasto')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ClaveGasto;
};

// ============================================================================
// CATÁLOGO: FORMAS DE PAGO
// ============================================================================

export const fetchFormasPago = async (companyId: string) => {
  const { data, error } = await supabase
    .from('cont_formas_pago')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data as FormaPago[];
};

export const createFormaPago = async (
  nombre: string,
  tipo: string,
  companyId: string
) => {
  const { data, error } = await supabase
    .from('cont_formas_pago')
    .insert([{ nombre, tipo, company_id: companyId }])
    .select()
    .single();

  if (error) throw error;
  return data as FormaPago;
};

// ============================================================================
// CATÁLOGO: PROVEEDORES
// ============================================================================

export const fetchProveedores = async (
  companyId: string,
  modulo?: string | null
) => {
  let query = supabase
    .from('cont_proveedores')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('razon_social');

  // Si se especifica módulo, filtrar por módulo o globales
  if (modulo !== undefined) {
    query = query.or(`modulo_origen.is.null,modulo_origen.eq.${modulo}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Proveedor[];
};

export const searchProveedores = async (
  companyId: string,
  busqueda: string
) => {
  const { data, error } = await supabase
    .from('cont_proveedores')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .or(`razon_social.ilike.%${busqueda}%,rfc.ilike.%${busqueda}%,nombre_comercial.ilike.%${busqueda}%`)
    .order('razon_social')
    .limit(20);

  if (error) throw error;
  return data as Proveedor[];
};

export const createProveedor = async (
  proveedor: ProveedorFormData,
  companyId: string
) => {
  const { data, error } = await supabase
    .from('cont_proveedores')
    .insert([{ ...proveedor, company_id: companyId }])
    .select()
    .single();

  if (error) throw error;
  return data as Proveedor;
};

export const updateProveedor = async (
  id: number,
  updates: Partial<ProveedorFormData>
) => {
  const { data, error } = await supabase
    .from('cont_proveedores')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Proveedor;
};

export const findOrCreateProveedor = async (
  razonSocial: string,
  companyId: string
): Promise<Proveedor> => {
  // Buscar existente
  const { data: existing } = await supabase
    .from('cont_proveedores')
    .select('*')
    .eq('company_id', companyId)
    .ilike('razon_social', razonSocial)
    .limit(1)
    .single();

  if (existing) {
    return existing as Proveedor;
  }

  // Crear nuevo
  return createProveedor({
    rfc: '',
    razon_social: razonSocial,
    nombre_comercial: '',
    direccion: '',
    telefono: '',
    email: '',
    contacto_nombre: '',
    modulo_origen: 'contabilidad'
  }, companyId);
};

// ============================================================================
// CATÁLOGO: EJECUTIVOS
// ============================================================================

export const fetchEjecutivos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('cont_ejecutivos')
    .select('*')
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data as Ejecutivo[];
};

export const createEjecutivo = async (
  nombre: string,
  companyId: string
) => {
  const { data, error } = await supabase
    .from('cont_ejecutivos')
    .insert([{ nombre, company_id: companyId }])
    .select()
    .single();

  if (error) throw error;
  return data as Ejecutivo;
};

export const findOrCreateEjecutivo = async (
  nombre: string,
  companyId: string
): Promise<Ejecutivo> => {
  const { data: existing } = await supabase
    .from('cont_ejecutivos')
    .select('*')
    .eq('company_id', companyId)
    .ilike('nombre', nombre)
    .limit(1)
    .single();

  if (existing) {
    return existing as Ejecutivo;
  }

  return createEjecutivo(nombre, companyId);
};

// ============================================================================
// REPORTES Y TOTALES
// ============================================================================

export const fetchTotalesPeriodo = async (
  companyId: string,
  periodo: string
) => {
  const { data, error } = await supabase
    .rpc('calcular_totales_gni_periodo', {
      p_company_id: companyId,
      p_periodo: periodo
    });

  if (error) throw error;
  return data as GNITotalesPeriodo[];
};

export const fetchResumenAnual = async (
  companyId: string,
  anio: number
) => {
  const meses = Array.from({ length: 12 }, (_, i) => {
    const mes = (i + 1).toString().padStart(2, '0');
    return `${anio}-${mes}`;
  });

  const { data, error } = await supabase
    .from('v_gastos_no_impactados')
    .select('periodo, total, cuenta')
    .eq('company_id', companyId)
    .in('periodo', meses)
    .limit(10000); // Asegurar que traemos todos los registros del año

  if (error) throw error;

  // Agrupar por mes
  const resumen = meses.map(periodo => {
    const gastosMes = data?.filter(g => g.periodo === periodo) || [];
    const porCuenta: Record<string, number> = {};

    gastosMes.forEach(g => {
      if (g.cuenta) {
        porCuenta[g.cuenta] = (porCuenta[g.cuenta] || 0) + (g.total || 0);
      }
    });

    return {
      periodo,
      total_gastos: gastosMes.reduce((sum, g) => sum + (g.total || 0), 0),
      cantidad_registros: gastosMes.length,
      por_cuenta: Object.entries(porCuenta).map(([cuenta, total]) => ({
        cuenta,
        total
      }))
    };
  });

  return resumen;
};

// ============================================================================
// IMPORTACIÓN DESDE EXCEL
// ============================================================================

export const importarDesdeExcel = async (
  rows: ExcelGastoRow[],
  companyId: string,
  periodo: string,
  userId?: string
): Promise<ImportExcelResult> => {
  const result: ImportExcelResult = {
    total_filas: rows.length,
    importados: 0,
    errores: 0,
    proveedores_nuevos: 0,
    detalle_errores: []
  };

  // Cargar catálogos en memoria
  const claves = await fetchClavesGasto(companyId);
  const formasPago = await fetchFormasPago(companyId);
  const clavesMap = new Map(claves.map(c => [c.clave, c.id]));
  const formasMap = new Map(formasPago.map(f => [f.nombre.toUpperCase(), f.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Validar campos requeridos
      if (!row.PROVEEDOR || !row.CONCEPTO || !row.TOTAL) {
        throw new Error('Campos requeridos faltantes: PROVEEDOR, CONCEPTO, TOTAL');
      }

      // Buscar o crear proveedor
      const proveedor = await findOrCreateProveedor(row.PROVEEDOR, companyId);
      if (!proveedor.id) {
        result.proveedores_nuevos++;
      }

      // Buscar o crear ejecutivo
      let ejecutivoId: number | null = null;
      if (row.EJECUTIVO) {
        const ejecutivo = await findOrCreateEjecutivo(row.EJECUTIVO, companyId);
        ejecutivoId = ejecutivo.id;
      }

      // Buscar clave de gasto
      const claveGastoId = row.CLAVE ? clavesMap.get(row.CLAVE) || null : null;

      // Buscar forma de pago
      const formaPagoId = row['FORMA DE PAGO']
        ? formasMap.get(row['FORMA DE PAGO'].toUpperCase()) || null
        : null;

      // Convertir fecha de Excel
      let fechaGasto = new Date().toISOString().split('T')[0];
      if (typeof row.FECHA === 'number') {
        // Excel serial date
        const excelEpoch = new Date(1899, 11, 30);
        const fecha = new Date(excelEpoch.getTime() + row.FECHA * 24 * 60 * 60 * 1000);
        fechaGasto = fecha.toISOString().split('T')[0];
      } else if (typeof row.FECHA === 'string') {
        fechaGasto = row.FECHA;
      }

      // Crear el gasto
      await createGasto({
        proveedor_id: proveedor.id,
        concepto: row.CONCEPTO,
        clave_gasto_id: claveGastoId,
        subtotal: row.SUBTOTAL || 0,
        iva: row.IVA || 0,
        total: row.TOTAL,
        validacion: row.VALIDACION?.toLowerCase() === 'correcto' ? 'correcto' : 'pendiente',
        forma_pago_id: formaPagoId,
        ejecutivo_id: ejecutivoId,
        status_pago: row.STATUS?.toLowerCase() === 'pagado' ? 'pagado' : 'pendiente',
        fecha_gasto: fechaGasto,
        periodo: periodo,
        folio_factura: row.FACTURA || '',
        documento_url: null,
        notas: ''
      }, companyId, userId);

      result.importados++;
    } catch (error) {
      result.errores++;
      result.detalle_errores.push({
        fila: i + 2, // +2 porque Excel empieza en 1 y hay header
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  return result;
};

// ============================================================================
// MEMBRETE Y CONFIGURACIÓN
// ============================================================================

export const fetchMembreteConfig = async (companyId: string): Promise<MembreteConfig> => {
  const { data, error } = await supabase
    .from('core_companies')
    .select(`
      name,
      rfc,
      logo_url,
      membrete_slogan,
      membrete_direccion,
      membrete_telefono,
      membrete_email,
      membrete_website,
      membrete_footer
    `)
    .eq('id', companyId)
    .single();

  if (error) throw error;

  return {
    logo_url: data?.logo_url || null,
    nombre_empresa: data?.name || '',
    rfc: data?.rfc || null,
    slogan: data?.membrete_slogan || null,
    direccion: data?.membrete_direccion || null,
    telefono: data?.membrete_telefono || null,
    email: data?.membrete_email || null,
    website: data?.membrete_website || null,
    footer: data?.membrete_footer || null
  };
};

export const updateMembreteConfig = async (
  companyId: string,
  config: Partial<MembreteConfig>
) => {
  const updates: Record<string, unknown> = {};

  if (config.logo_url !== undefined) updates.logo_url = config.logo_url;
  if (config.slogan !== undefined) updates.membrete_slogan = config.slogan;
  if (config.direccion !== undefined) updates.membrete_direccion = config.direccion;
  if (config.telefono !== undefined) updates.membrete_telefono = config.telefono;
  if (config.email !== undefined) updates.membrete_email = config.email;
  if (config.website !== undefined) updates.membrete_website = config.website;
  if (config.footer !== undefined) updates.membrete_footer = config.footer;

  const { data, error } = await supabase
    .from('core_companies')
    .update(updates)
    .eq('id', companyId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================================================
// UTILIDADES
// ============================================================================

export const getPeriodoActual = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

export const getPeriodosDisponibles = (anioInicio: number = 2025): string[] => {
  const periodos: string[] = [];
  const now = new Date();
  const anioActual = now.getFullYear();
  const mesActual = now.getMonth() + 1;

  for (let anio = anioInicio; anio <= anioActual; anio++) {
    const maxMes = anio === anioActual ? mesActual : 12;
    for (let mes = 1; mes <= maxMes; mes++) {
      periodos.push(`${anio}-${mes.toString().padStart(2, '0')}`);
    }
  }

  return periodos.reverse();
};
