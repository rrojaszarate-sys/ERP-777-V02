// ============================================
// HOOKS DE REACT QUERY PARA FACTURACIÓN
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { facturacionService } from '../services/facturacionService';
import toast from 'react-hot-toast';
import type {
  Factura,
  ConceptoFactura,
  ConfiguracionFacturacion,
  ComplementoPago
} from '../types';

// ============================================
// HOOKS DE CONFIGURACIÓN
// ============================================

export const useConfiguracion = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['configuracion-facturacion', user?.company_id],
    queryFn: () => facturacionService.fetchConfiguracion(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateConfiguracion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (config: Partial<ConfiguracionFacturacion>) =>
      facturacionService.createConfiguracion({ ...config, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion-facturacion'] });
      toast.success('Configuración creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear configuración');
    }
  });
};

export const useUpdateConfiguracion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, config }: { id: number; config: Partial<ConfiguracionFacturacion> }) =>
      facturacionService.updateConfiguracion(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion-facturacion'] });
      toast.success('Configuración actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar configuración');
    }
  });
};

// ============================================
// HOOKS DE FACTURAS
// ============================================

export const useFacturas = (filters?: {
  serie?: string;
  status?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  cliente_id?: number;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['facturas', user?.company_id, filters],
    queryFn: () => facturacionService.fetchFacturas(user!.company_id!, filters),
    enabled: !!user?.company_id
  });
};

export const useFactura = (id: number) => {
  return useQuery({
    queryKey: ['factura', id],
    queryFn: () => facturacionService.fetchFacturaById(id),
    enabled: !!id
  });
};

export const useGenerarFolio = (serie: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['folio-factura', user?.company_id, serie],
    queryFn: () => facturacionService.generarFolio(user!.company_id!, serie),
    enabled: !!user?.company_id && !!serie
  });
};

export const useCreateFactura = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      factura,
      conceptos
    }: {
      factura: Partial<Factura>;
      conceptos: Partial<ConceptoFactura>[];
    }) =>
      facturacionService.createFactura(
        { ...factura, company_id: user!.company_id },
        conceptos
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Factura creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear factura');
    }
  });
};

export const useUpdateFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, factura }: { id: number; factura: Partial<Factura> }) =>
      facturacionService.updateFactura(id, factura),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Factura actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar factura');
    }
  });
};

export const useDeleteFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => facturacionService.deleteFactura(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Factura eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar factura');
    }
  });
};

// ============================================
// HOOKS DE TIMBRADO
// ============================================

export const useTimbrarFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (facturaId: number) => facturacionService.timbrarFactura(facturaId),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['facturas'] });
        toast.success('Factura timbrada exitosamente');
      } else {
        toast.error(response.error || 'Error al timbrar factura');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al timbrar factura');
    }
  });
};

export const useCancelarFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      facturaId,
      motivo,
      uuidSustitucion
    }: {
      facturaId: number;
      motivo: string;
      uuidSustitucion?: string;
    }) => facturacionService.cancelarFactura(facturaId, motivo, uuidSustitucion),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['facturas'] });
        toast.success('Factura cancelada exitosamente');
      } else {
        toast.error(response.error || 'Error al cancelar factura');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cancelar factura');
    }
  });
};

// ============================================
// HOOKS DE DESCARGAS
// ============================================

export const useDescargarXML = () => {
  return useMutation({
    mutationFn: (facturaId: number) => facturacionService.descargarXML(facturaId),
    onSuccess: () => {
      toast.success('XML descargado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al descargar XML');
    }
  });
};

export const useDescargarPDF = () => {
  return useMutation({
    mutationFn: (facturaId: number) => facturacionService.descargarPDF(facturaId),
    onSuccess: () => {
      toast.success('PDF abierto en nueva ventana');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al abrir PDF');
    }
  });
};

// ============================================
// HOOKS DE COMPLEMENTOS DE PAGO
// ============================================

export const useComplementosPago = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['complementos-pago', user?.company_id],
    queryFn: () => facturacionService.fetchComplementosPago(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCreateComplementoPago = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (complemento: Partial<ComplementoPago>) =>
      facturacionService.createComplementoPago({ ...complemento, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementos-pago'] });
      toast.success('Complemento de pago creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear complemento de pago');
    }
  });
};
