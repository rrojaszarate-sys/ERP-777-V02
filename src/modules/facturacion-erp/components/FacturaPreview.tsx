/**
 * Preview de Factura CFDI 4.0 - FASE 5.1
 * Representación visual del CFDI en formato imprimible
 */
import { forwardRef } from 'react';
import { Card, CardBody, Divider, Chip } from '@nextui-org/react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import QRCode from 'qrcode.react';
import {
  USO_CFDI_CATALOG,
  FORMA_PAGO_CATALOG,
  METODO_PAGO_LABEL,
  REGIMEN_FISCAL_CATALOG,
  TIPO_COMPROBANTE_LABEL,
  type UsoCFDI,
  type FormaPago,
  type MetodoPago,
  type TipoComprobante
} from '../types/cfdi';
import type { Factura, ConceptoFactura } from '../types';

interface FacturaPreviewProps {
  factura: Factura;
  emisor: {
    rfc: string;
    razon_social: string;
    regimen_fiscal: string;
    domicilio_fiscal: string;
    logo_url?: string;
  };
  showQR?: boolean;
}

export const FacturaPreview = forwardRef<HTMLDivElement, FacturaPreviewProps>(
  ({ factura, emisor, showQR = true }, ref) => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: factura.moneda || 'MXN'
      }).format(value);
    };

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getStatusBadge = () => {
      switch (factura.status) {
        case 'timbrada':
          return (
            <Chip color="success" startContent={<CheckCircle className="w-3 h-3" />}>
              TIMBRADA
            </Chip>
          );
        case 'cancelada':
          return (
            <Chip color="danger" startContent={<XCircle className="w-3 h-3" />}>
              CANCELADA
            </Chip>
          );
        case 'pendiente':
          return (
            <Chip color="warning" startContent={<Clock className="w-3 h-3" />}>
              PENDIENTE
            </Chip>
          );
        default:
          return (
            <Chip color="default">
              {factura.status.toUpperCase()}
            </Chip>
          );
      }
    };

    // Generar URL para QR del SAT
    const qrUrl = factura.uuid
      ? `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${factura.uuid}&re=${emisor.rfc}&rr=${factura.rfc_receptor || factura.cliente?.rfc}&tt=${factura.total}&fe=`
      : '';

    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Encabezado */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            {emisor.logo_url ? (
              <img src={emisor.logo_url} alt="Logo" className="h-16 w-auto" />
            ) : (
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{emisor.razon_social}</h1>
              <p className="text-sm text-gray-600">RFC: {emisor.rfc}</p>
              <p className="text-sm text-gray-600">
                Régimen: {REGIMEN_FISCAL_CATALOG[emisor.regimen_fiscal as keyof typeof REGIMEN_FISCAL_CATALOG] || emisor.regimen_fiscal}
              </p>
              <p className="text-xs text-gray-500">{emisor.domicilio_fiscal}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="mb-2">{getStatusBadge()}</div>
            <h2 className="text-2xl font-bold text-primary">
              {TIPO_COMPROBANTE_LABEL[factura.tipo_comprobante as TipoComprobante] || 'Factura'}
            </h2>
            <p className="text-lg font-mono font-semibold">
              {factura.serie}{factura.folio}
            </p>
            <p className="text-sm text-gray-600">
              Fecha: {formatDate(factura.fecha_emision)}
            </p>
          </div>
        </div>

        <Divider className="my-4" />

        {/* Folio Fiscal (UUID) */}
        {factura.uuid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Folio Fiscal (UUID)</p>
                <p className="font-mono text-sm font-medium break-all">{factura.uuid}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Fecha y Hora de Certificación</p>
                <p className="text-sm">{factura.fecha_timbrado ? formatDate(factura.fecha_timbrado) : '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Datos del Receptor */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">RECEPTOR</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">RFC</p>
              <p className="font-mono font-medium">{factura.rfc_receptor || factura.cliente?.rfc}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Razón Social</p>
              <p className="font-medium">{factura.razon_social_receptor || factura.cliente?.razon_social}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Régimen Fiscal</p>
              <p className="text-sm">
                {factura.regimen_fiscal_receptor || factura.cliente?.regimen_fiscal}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Uso de CFDI</p>
              <p className="text-sm">
                {factura.uso_cfdi} - {USO_CFDI_CATALOG[factura.uso_cfdi as UsoCFDI] || factura.uso_cfdi}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Domicilio Fiscal</p>
              <p className="text-sm">{factura.domicilio_fiscal_receptor || factura.cliente?.codigo_postal}</p>
            </div>
          </div>
        </div>

        {/* Datos del Comprobante */}
        <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500">Forma de Pago</p>
            <p className="font-medium">
              {factura.forma_pago} - {FORMA_PAGO_CATALOG[factura.forma_pago as FormaPago] || factura.forma_pago}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500">Método de Pago</p>
            <p className="font-medium">
              {factura.metodo_pago} - {METODO_PAGO_LABEL[factura.metodo_pago as MetodoPago] || factura.metodo_pago}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500">Moneda</p>
            <p className="font-medium">{factura.moneda}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500">Lugar de Expedición</p>
            <p className="font-medium">{factura.lugar_expedicion}</p>
          </div>
        </div>

        {/* Conceptos */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">CONCEPTOS</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Clave</th>
                <th className="p-2 text-left">Descripción</th>
                <th className="p-2 text-center">Cantidad</th>
                <th className="p-2 text-right">P. Unit.</th>
                <th className="p-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {(factura.conceptos || []).map((concepto, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2 font-mono text-xs">{concepto.clave_prod_serv}</td>
                  <td className="p-2">
                    <p>{concepto.descripcion}</p>
                    <p className="text-xs text-gray-500">Unidad: {concepto.clave_unidad}</p>
                  </td>
                  <td className="p-2 text-center">{concepto.cantidad}</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(concepto.valor_unitario)}</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(concepto.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales y QR */}
        <div className="flex justify-between items-end">
          {/* QR Code */}
          {showQR && factura.uuid && (
            <div className="flex items-center gap-4">
              <QRCode value={qrUrl} size={100} level="M" />
              <div className="text-xs text-gray-500">
                <p>Escanea el código QR para</p>
                <p>verificar este CFDI en el SAT</p>
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="w-64">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-mono">{formatCurrency(factura.subtotal)}</span>
              </div>
              {factura.descuento > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento:</span>
                  <span className="font-mono">-{formatCurrency(factura.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">IVA Trasladado:</span>
                <span className="font-mono">{formatCurrency(factura.total_impuestos_trasladados)}</span>
              </div>
              {factura.total_impuestos_retenidos > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Retenciones:</span>
                  <span className="font-mono">-{formatCurrency(factura.total_impuestos_retenidos)}</span>
                </div>
              )}
              <Divider />
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span className="font-mono text-primary">{formatCurrency(factura.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sellos y Cadenas */}
        {factura.uuid && (
          <div className="mt-6 text-xs text-gray-500 space-y-2">
            <Divider />
            {factura.cadena_original && (
              <div>
                <p className="font-semibold">Cadena Original del Complemento de Certificación Digital del SAT:</p>
                <p className="font-mono break-all text-[10px]">{factura.cadena_original}</p>
              </div>
            )}
            {factura.sello_digital && (
              <div>
                <p className="font-semibold">Sello Digital del CFDI:</p>
                <p className="font-mono break-all text-[10px]">{factura.sello_digital}</p>
              </div>
            )}
            {factura.sello_sat && (
              <div>
                <p className="font-semibold">Sello del SAT:</p>
                <p className="font-mono break-all text-[10px]">{factura.sello_sat}</p>
              </div>
            )}
          </div>
        )}

        {/* Observaciones */}
        {factura.observaciones && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase mb-1">Observaciones</p>
            <p className="text-sm">{factura.observaciones}</p>
          </div>
        )}

        {/* Pie de página */}
        <div className="mt-6 pt-4 border-t text-center text-xs text-gray-400">
          <p>Este documento es una representación impresa de un CFDI versión 4.0</p>
          <p>Generado por MADE ERP - Sistema de Facturación Electrónica</p>
        </div>
      </div>
    );
  }
);

FacturaPreview.displayName = 'FacturaPreview';

export default FacturaPreview;
