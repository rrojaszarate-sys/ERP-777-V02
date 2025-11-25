import { supabase } from '@/core/config/supabase';
import type { VentaPOS, VentaPOSInsert } from '../types';

export const ventasPOSService = {
  async getAll(): Promise<VentaPOS[]> {
    const { data, error } = await supabase
      .from('pos_ventas')
      .select(`
        *,
        turno:pos_turnos_caja(*)
      `)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (error) throw error;
    return data as VentaPOS[];
  },

  async getByTurno(turnoId: string): Promise<VentaPOS[]> {
    const { data, error } = await supabase
      .from('pos_ventas')
      .select('*')
      .eq('turno_caja_id', turnoId)
      .order('hora', { ascending: false });

    if (error) throw error;
    return data as VentaPOS[];
  },

  async getById(id: string): Promise<VentaPOS> {
    const { data: venta, error: errorVta } = await supabase
      .from('pos_ventas')
      .select(`
        *,
        turno:pos_turnos_caja(*)
      `)
      .eq('id', id)
      .single();

    if (errorVta) throw errorVta;

    const { data: detalles, error: errorDet } = await supabase
      .from('pos_ventas_detalle')
      .select('*')
      .eq('venta_id', id)
      .order('created_at');

    if (errorDet) throw errorDet;

    return { ...venta, detalles } as VentaPOS;
  },

  async create(ventaData: VentaPOSInsert): Promise<VentaPOS> {
    // Generar folio
    const { data: ultimas } = await supabase
      .from('pos_ventas')
      .select('folio')
      .order('created_at', { ascending: false })
      .limit(1);

    const year = new Date().getFullYear();
    const numero = ultimas && ultimas.length > 0
      ? parseInt(ultimas[0].folio.split('-')[2]) + 1
      : 1;
    const folio = `VPOS-${year}-${numero.toString().padStart(8, '0')}`;

    // Calcular totales
    let subtotal = 0;
    let descuentoTotal = 0;
    let iva = 0;

    ventaData.detalles.forEach(detalle => {
      const desc = detalle.descuento || 0;
      const sub = (detalle.precio_unitario * detalle.cantidad) - desc;
      const ivaDetalle = sub * 0.16; // IVA 16%

      subtotal += sub;
      descuentoTotal += desc;
      iva += ivaDetalle;
    });

    const total = subtotal + iva;
    const cambio = ventaData.monto_pagado - total;

    if (cambio < 0) {
      throw new Error('El monto pagado es insuficiente');
    }

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];

    // Crear venta
    const { data: venta, error: errorVta } = await supabase
      .from('pos_ventas')
      .insert({
        folio,
        turno_caja_id: ventaData.turno_caja_id,
        cliente_id: ventaData.cliente_id,
        cliente_nombre: ventaData.cliente_nombre,
        tipo_venta: ventaData.tipo_venta,
        fecha,
        hora,
        subtotal,
        descuento: descuentoTotal,
        iva,
        total,
        tipo_pago: ventaData.tipo_pago,
        monto_pagado: ventaData.monto_pagado,
        cambio,
        requiere_factura: ventaData.requiere_factura || false,
        facturado: false,
        estatus: 'COMPLETADA',
        observaciones: ventaData.observaciones
      })
      .select()
      .single();

    if (errorVta) throw errorVta;

    // Crear detalles
    const detallesConVenta = ventaData.detalles.map(detalle => {
      const desc = detalle.descuento || 0;
      const sub = (detalle.precio_unitario * detalle.cantidad) - desc;
      const ivaDetalle = sub * 0.16;
      const totalDetalle = sub + ivaDetalle;

      return {
        venta_id: venta.id,
        producto_id: detalle.producto_id,
        codigo_producto: '', // Se llenará con trigger
        nombre_producto: '', // Se llenará con trigger
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        descuento: desc,
        subtotal: sub,
        iva: ivaDetalle,
        total: totalDetalle,
        almacen_id: detalle.almacen_id
      };
    });

    const { error: errorDet } = await supabase
      .from('pos_ventas_detalle')
      .insert(detallesConVenta);

    if (errorDet) {
      await supabase.from('pos_ventas').delete().eq('id', venta.id);
      throw errorDet;
    }

    // Actualizar totales del turno
    await this.actualizarTotalesTurno(ventaData.turno_caja_id);

    return this.getById(venta.id);
  },

  async cancelar(id: string, motivo: string): Promise<VentaPOS> {
    const { data, error } = await supabase
      .from('pos_ventas')
      .update({
        estatus: 'CANCELADA',
        fecha_cancelacion: new Date().toISOString(),
        motivo_cancelacion: motivo
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Obtener turno_caja_id para actualizar totales
    const venta = await this.getById(id);
    await this.actualizarTotalesTurno(venta.turno_caja_id);

    return this.getById(id);
  },

  async actualizarTotalesTurno(turnoId: string): Promise<void> {
    // Calcular totales de ventas completadas
    const { data: ventas } = await supabase
      .from('pos_ventas')
      .select('total, tipo_pago')
      .eq('turno_caja_id', turnoId)
      .eq('estatus', 'COMPLETADA');

    let totalVentas = 0;
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransferencia = 0;

    ventas?.forEach(v => {
      totalVentas += v.total;
      if (v.tipo_pago === 'EFECTIVO') totalEfectivo += v.total;
      else if (v.tipo_pago === 'TARJETA_DEBITO' || v.tipo_pago === 'TARJETA_CREDITO') totalTarjeta += v.total;
      else if (v.tipo_pago === 'TRANSFERENCIA') totalTransferencia += v.total;
    });

    await supabase
      .from('pos_turnos_caja')
      .update({
        total_ventas: totalVentas,
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta,
        total_transferencia: totalTransferencia,
        num_ventas: ventas?.length || 0
      })
      .eq('id', turnoId);
  }
};
