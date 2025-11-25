import { supabase } from '@/core/config/supabase';
import type { OrdenCompra, OrdenCompraCompleta, OrdenCompraInsert } from '../types';

export const ordenesCompraService = {
  async getAll(): Promise<OrdenCompra[]> {
    const { data, error } = await supabase
      .from('cmp_ordenes_compra')
      .select(`*, proveedor:cmp_proveedores(*)`)
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data as OrdenCompra[];
  },

  async getById(id: string): Promise<OrdenCompraCompleta> {
    const { data: orden, error: errorOrden } = await supabase
      .from('cmp_ordenes_compra')
      .select(`*, proveedor:cmp_proveedores(*)`)
      .eq('id', id)
      .single();

    if (errorOrden) throw errorOrden;

    const { data: detalles, error: errorDet } = await supabase
      .from('cmp_ordenes_compra_detalle')
      .select(`*, producto:inv_productos(*)`)
      .eq('orden_compra_id', id);

    if (errorDet) throw errorDet;

    return { ...orden, detalles } as OrdenCompraCompleta;
  },

  async create(ordenData: OrdenCompraInsert): Promise<OrdenCompraCompleta> {
    // Generar folio
    const year = new Date().getFullYear();
    const { data: ultimas } = await supabase
      .from('cmp_ordenes_compra')
      .select('folio')
      .like('folio', `OC-${year}-%`)
      .order('folio', { ascending: false })
      .limit(1);

    let numero = 1;
    if (ultimas && ultimas.length > 0) {
      numero = parseInt(ultimas[0].folio.split('-')[2]) + 1;
    }

    const folio = `OC-${year}-${numero.toString().padStart(6, '0')}`;

    // Calcular totales
    let subtotal = 0;
    let iva = 0;
    ordenData.detalles.forEach(det => {
      const st = det.cantidad * det.precio_unitario;
      const desc = (det.descuento_porcentaje || 0) / 100 * st;
      const stNeto = st - desc;
      subtotal += stNeto;
      iva += stNeto * 0.16;
    });

    const total = subtotal + iva;

    const { data: orden, error: errorOrden } = await supabase
      .from('cmp_ordenes_compra')
      .insert({
        folio,
        fecha: ordenData.fecha,
        fecha_entrega_esperada: ordenData.fecha_entrega_esperada,
        proveedor_id: ordenData.proveedor_id,
        almacen_destino_id: ordenData.almacen_destino_id,
        requisicion_id: ordenData.requisicion_id,
        observaciones: ordenData.observaciones,
        subtotal,
        iva,
        total,
        estatus: 'BORRADOR'
      })
      .select()
      .single();

    if (errorOrden) throw errorOrden;

    // Insertar detalles
    const detallesConOrden = ordenData.detalles.map(det => {
      const st = det.cantidad * det.precio_unitario;
      const desc = (det.descuento_porcentaje || 0) / 100 * st;
      const stNeto = st - desc;
      const ivaImporte = stNeto * 0.16;

      return {
        orden_compra_id: orden.id,
        producto_id: det.producto_id,
        descripcion: '',
        cantidad: det.cantidad,
        precio_unitario: det.precio_unitario,
        descuento_porcentaje: det.descuento_porcentaje || 0,
        descuento_importe: desc,
        iva_porcentaje: 16,
        iva_importe: ivaImporte,
        total: stNeto + ivaImporte
      };
    });

    const { error: errorDet } = await supabase
      .from('cmp_ordenes_compra_detalle')
      .insert(detallesConOrden);

    if (errorDet) throw errorDet;

    return this.getById(orden.id);
  }
};
