/**
 * ============================================================================
 * COMPONENTE: SATStatusBadge
 * ============================================================================
 *
 * Badge visual para mostrar el estado de validación SAT de una factura.
 *
 * Estados:
 * - Vigente (verde): Factura válida
 * - Cancelado (rojo): Factura cancelada - NO ACEPTAR
 * - No Encontrado (amarillo): Posible factura apócrifa
 * - Sin Verificar (gris): No se ha validado
 * - Validando (azul): En proceso de validación
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Loader2, Shield } from 'lucide-react';
import { ResultadoValidacionSAT } from '../../../../services/satValidationService';

interface SATStatusBadgeProps {
  /** Resultado de la validación SAT */
  resultado?: ResultadoValidacionSAT | null;
  /** true si está validando */
  isValidating?: boolean;
  /** Tamaño del badge: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Mostrar texto completo o solo icono */
  showText?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

const SATStatusBadge: React.FC<SATStatusBadgeProps> = ({
  resultado,
  isValidating = false,
  size = 'md',
  showText = true,
  className = ''
}) => {
  // Configuración de tamaños
  const sizeConfig = {
    sm: {
      icon: 'w-3.5 h-3.5',
      text: 'text-xs',
      padding: 'px-2 py-0.5'
    },
    md: {
      icon: 'w-4 h-4',
      text: 'text-sm',
      padding: 'px-2.5 py-1'
    },
    lg: {
      icon: 'w-5 h-5',
      text: 'text-base',
      padding: 'px-3 py-1.5'
    }
  };

  const config = sizeConfig[size];

  // Estado: Validando
  if (isValidating) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-medium
          bg-blue-100 text-blue-800 border border-blue-200
          ${config.padding} ${config.text} ${className}`}
      >
        <Loader2 className={`${config.icon} animate-spin`} />
        {showText && <span>Validando SAT...</span>}
      </div>
    );
  }

  // Estado: Sin validar
  if (!resultado) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-medium
          bg-gray-100 text-gray-600 border border-gray-200
          ${config.padding} ${config.text} ${className}`}
      >
        <Shield className={config.icon} />
        {showText && <span>Sin verificar SAT</span>}
      </div>
    );
  }

  // Estado: Vigente (verde)
  if (resultado.esValida) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-medium
          bg-green-100 text-green-800 border border-green-200
          ${config.padding} ${config.text} ${className}`}
        title={resultado.mensaje}
      >
        <CheckCircle className={config.icon} />
        {showText && <span>Vigente SAT</span>}
      </div>
    );
  }

  // Estado: Cancelado (rojo)
  if (resultado.esCancelada) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-medium
          bg-red-100 text-red-800 border border-red-300
          ${config.padding} ${config.text} ${className}`}
        title={resultado.mensaje}
      >
        <XCircle className={config.icon} />
        {showText && <span>CANCELADA</span>}
      </div>
    );
  }

  // Estado: No encontrado (amarillo)
  if (resultado.noEncontrada) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-medium
          bg-amber-100 text-amber-800 border border-amber-300
          ${config.padding} ${config.text} ${className}`}
        title={resultado.mensaje}
      >
        <AlertTriangle className={config.icon} />
        {showText && <span>No encontrada</span>}
      </div>
    );
  }

  // Estado: Error o desconocido
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-medium
        bg-gray-100 text-gray-600 border border-gray-200
        ${config.padding} ${config.text} ${className}`}
      title={resultado.mensaje || resultado.error}
    >
      <HelpCircle className={config.icon} />
      {showText && <span>{resultado.estado || 'Desconocido'}</span>}
    </div>
  );
};

/**
 * Componente de alerta para cuando una factura no es válida
 */
export const SATAlertBox: React.FC<{
  resultado: ResultadoValidacionSAT;
  onClose?: () => void;
}> = ({ resultado, onClose }) => {
  if (resultado.esValida) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-green-800">Factura Vigente</h4>
          <p className="text-sm text-green-700 mt-1">{resultado.mensaje}</p>
          {resultado.codigoEstatus && (
            <p className="text-xs text-green-600 mt-1">
              Código SAT: {resultado.codigoEstatus}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (resultado.esCancelada) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-red-800">FACTURA CANCELADA</h4>
          <p className="text-sm text-red-700 mt-1">
            Esta factura ha sido cancelada en el SAT y NO puede ser registrada como gasto.
          </p>
          <p className="text-xs text-red-600 mt-2 font-medium">
            UUID: {resultado.uuid}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700"
            title="Cerrar"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (resultado.noEncontrada) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-amber-800">FACTURA NO ENCONTRADA</h4>
          <p className="text-sm text-amber-700 mt-1">
            Esta factura NO existe en los registros del SAT.
            Podría tratarse de una factura apócrifa o los datos no coinciden.
          </p>
          <p className="text-xs text-amber-600 mt-2 font-medium">
            UUID: {resultado.uuid}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-amber-500 hover:text-amber-700"
            title="Cerrar"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Estado desconocido o error
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
      <HelpCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-gray-700">Estado Desconocido</h4>
        <p className="text-sm text-gray-600 mt-1">{resultado.mensaje}</p>
      </div>
    </div>
  );
};

export default SATStatusBadge;
