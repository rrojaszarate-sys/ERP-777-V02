import React, { useEffect, useRef, useCallback } from 'react';
import JsBarcode from 'jsbarcode';

// ============================================================================
// TIPOS DE CÓDIGOS DE BARRAS SOPORTADOS
// ============================================================================

export type BarcodeFormat = 
  | 'CODE128' 
  | 'CODE39' 
  | 'EAN13' 
  | 'EAN8' 
  | 'UPC' 
  | 'ITF14'
  | 'ITF'
  | 'MSI'
  | 'pharmacode'
  | 'codabar';

export interface BarcodeProps {
  value: string;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: 'top' | 'bottom';
  textMargin?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  flat?: boolean;
  className?: string;
  onError?: (error: string) => void;
}

// ============================================================================
// COMPONENTE DE CÓDIGO DE BARRAS SVG
// ============================================================================

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  format = 'CODE128',
  width = 2,
  height = 100,
  displayValue = true,
  fontSize = 14,
  textAlign = 'center',
  textPosition = 'bottom',
  textMargin = 2,
  background = '#ffffff',
  lineColor = '#000000',
  margin = 10,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  flat = false,
  className = '',
  onError,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        // Validar formato EAN-13
        let adjustedValue = value;
        if (format === 'EAN13' && value.length === 12) {
          // Agregar dígito de verificación si es necesario
          adjustedValue = value;
        }

        JsBarcode(svgRef.current, adjustedValue, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          textAlign,
          textPosition,
          textMargin,
          background,
          lineColor,
          margin,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          flat,
        });
      } catch (error: any) {
        console.error('Error generando código de barras:', error);
        if (onError) {
          onError(error.message || 'Error al generar código de barras');
        }
      }
    }
  }, [
    value, format, width, height, displayValue, fontSize, 
    textAlign, textPosition, textMargin, background, lineColor,
    margin, marginTop, marginBottom, marginLeft, marginRight, flat, onError
  ]);

  return <svg ref={svgRef} className={className} />;
};

// ============================================================================
// COMPONENTE CANVAS (para exportar a imagen)
// ============================================================================

export interface BarcodeCanvasProps extends BarcodeProps {
  onRender?: (canvas: HTMLCanvasElement) => void;
}

export const BarcodeCanvas: React.FC<BarcodeCanvasProps> = ({
  value,
  format = 'CODE128',
  width = 2,
  height = 100,
  displayValue = true,
  fontSize = 14,
  textAlign = 'center',
  textPosition = 'bottom',
  textMargin = 2,
  background = '#ffffff',
  lineColor = '#000000',
  margin = 10,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  flat = false,
  className = '',
  onError,
  onRender,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          textAlign,
          textPosition,
          textMargin,
          background,
          lineColor,
          margin,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          flat,
        });

        if (onRender && canvasRef.current) {
          onRender(canvasRef.current);
        }
      } catch (error: any) {
        console.error('Error generando código de barras:', error);
        if (onError) {
          onError(error.message || 'Error al generar código de barras');
        }
      }
    }
  }, [
    value, format, width, height, displayValue, fontSize, 
    textAlign, textPosition, textMargin, background, lineColor,
    margin, marginTop, marginBottom, marginLeft, marginRight, flat, onError, onRender
  ]);

  return <canvas ref={canvasRef} className={className} />;
};

// ============================================================================
// HOOK PARA GENERAR CÓDIGO DE BARRAS COMO DATA URL
// ============================================================================

export const useBarcodeDataUrl = () => {
  const generateDataUrl = useCallback((
    value: string,
    options: Partial<BarcodeProps> = {}
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      
      try {
        JsBarcode(canvas, value, {
          format: options.format || 'CODE128',
          width: options.width || 2,
          height: options.height || 100,
          displayValue: options.displayValue !== false,
          fontSize: options.fontSize || 14,
          textAlign: options.textAlign || 'center',
          textPosition: options.textPosition || 'bottom',
          textMargin: options.textMargin || 2,
          background: options.background || '#ffffff',
          lineColor: options.lineColor || '#000000',
          margin: options.margin || 10,
          marginTop: options.marginTop,
          marginBottom: options.marginBottom,
          marginLeft: options.marginLeft,
          marginRight: options.marginRight,
          flat: options.flat || false,
        });

        resolve(canvas.toDataURL('image/png'));
      } catch (error: any) {
        reject(error);
      }
    });
  }, []);

  return { generateDataUrl };
};

// ============================================================================
// UTILIDADES
// ============================================================================

// Validar formato de código
export const validateBarcodeValue = (value: string, format: BarcodeFormat): { valid: boolean; error?: string } => {
  if (!value) {
    return { valid: false, error: 'El valor no puede estar vacío' };
  }

  switch (format) {
    case 'EAN13':
      if (!/^\d{12,13}$/.test(value)) {
        return { valid: false, error: 'EAN-13 debe tener 12 o 13 dígitos numéricos' };
      }
      break;
    case 'EAN8':
      if (!/^\d{7,8}$/.test(value)) {
        return { valid: false, error: 'EAN-8 debe tener 7 u 8 dígitos numéricos' };
      }
      break;
    case 'UPC':
      if (!/^\d{11,12}$/.test(value)) {
        return { valid: false, error: 'UPC debe tener 11 o 12 dígitos numéricos' };
      }
      break;
    case 'CODE39':
      if (!/^[A-Z0-9\-\.\ \$\/\+\%]+$/i.test(value)) {
        return { valid: false, error: 'CODE39 solo permite: A-Z, 0-9, -, ., espacio, $, /, +, %' };
      }
      break;
    case 'ITF14':
      if (!/^\d{13,14}$/.test(value)) {
        return { valid: false, error: 'ITF-14 debe tener 13 o 14 dígitos numéricos' };
      }
      break;
    case 'ITF':
      if (!/^\d+$/.test(value) || value.length % 2 !== 0) {
        return { valid: false, error: 'ITF debe tener un número par de dígitos numéricos' };
      }
      break;
    case 'CODE128':
    case 'codabar':
    case 'MSI':
    case 'pharmacode':
      // Más flexibles
      break;
  }

  return { valid: true };
};

// Generar código EAN-13 con dígito de verificación
export const generateEAN13CheckDigit = (code: string): string => {
  if (code.length !== 12) {
    throw new Error('El código debe tener exactamente 12 dígitos');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit;
};

// Generar código único para producto
export const generateProductBarcode = (productId: number, prefix: string = '200'): string => {
  // Formato: prefijo (3) + producto (8) + check (1) = EAN-13
  const productCode = productId.toString().padStart(8, '0');
  const baseCode = prefix + productCode;
  return generateEAN13CheckDigit(baseCode.substring(0, 12));
};

export default Barcode;
