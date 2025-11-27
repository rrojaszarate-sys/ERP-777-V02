import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useTheme } from '../../../shared/components/theme';

interface SignatureCaptureProps {
  label: string;
  value: string | null;
  onChange: (signature: string | null) => void;
  disabled?: boolean;
  required?: boolean;
}

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
}) => {
  const { paletteConfig, isDark } = useTheme();
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEditing, setIsEditing] = useState(!value);
  const containerRef = useRef<HTMLDivElement>(null);

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#1f2937' : '#ffffff',
    cardBg: isDark ? '#374151' : '#f9fafb',
    border: isDark ? '#4b5563' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }), [paletteConfig, isDark]);

  // Limpiar firma
  const handleClear = useCallback(() => {
    if (sigRef.current) {
      sigRef.current.clear();
    }
    onChange(null);
  }, [onChange]);

  // Guardar firma
  const handleSave = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL('image/png');
      onChange(dataUrl);
      setIsEditing(false);
    }
  }, [onChange]);

  // Editar firma existente
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    if (sigRef.current) {
      sigRef.current.clear();
    }
  }, []);

  // Ajustar tamaño del canvas cuando cambia el contenedor
  useEffect(() => {
    const resizeCanvas = () => {
      if (sigRef.current && containerRef.current && isEditing) {
        const canvas = sigRef.current.getCanvas();
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        // Solo redimensionar si hay diferencia significativa
        if (Math.abs(canvas.width - rect.width) > 10 || Math.abs(canvas.height - 150) > 10) {
          canvas.width = rect.width - 4; // Menos borde
          canvas.height = 150;

          // Re-dibujar después de resize
          if (value && !sigRef.current.isEmpty()) {
            const img = new Image();
            img.onload = () => {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              }
            };
            img.src = value;
          }
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isEditing, value]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2" style={{ color: themeColors.text }}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        ref={containerRef}
        className="relative rounded-lg border-2 overflow-hidden"
        style={{
          borderColor: themeColors.border,
          backgroundColor: '#ffffff',
          minHeight: '150px',
        }}
      >
        {isEditing && !disabled ? (
          <>
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{
                className: 'w-full',
                style: {
                  width: '100%',
                  height: '150px',
                  cursor: 'crosshair',
                },
              }}
              penColor="#000000"
              backgroundColor="#ffffff"
              minWidth={1}
              maxWidth={2.5}
              velocityFilterWeight={0.7}
            />

            {/* Línea guía para firma */}
            <div
              className="absolute bottom-8 left-4 right-4 border-b border-dashed"
              style={{ borderColor: '#d1d5db' }}
            />

            {/* Texto indicativo */}
            <p
              className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs"
              style={{ color: themeColors.textMuted }}
            >
              Firme sobre la línea
            </p>

            {/* Botones de acción */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                title="Limpiar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${themeColors.primary}20`, color: themeColors.primary }}
                title="Guardar firma"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </>
        ) : value ? (
          <>
            {/* Vista de firma guardada */}
            <img
              src={value}
              alt={`Firma: ${label}`}
              className="w-full h-[150px] object-contain"
            />

            {/* Botón editar */}
            {!disabled && (
              <button
                type="button"
                onClick={handleEdit}
                className="absolute top-2 right-2 p-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: `${themeColors.primary}20`, color: themeColors.primary }}
                title="Editar firma"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </>
        ) : (
          /* Estado vacío - mostrar canvas si no está disabled */
          !disabled && (
            <>
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  className: 'w-full',
                  style: {
                    width: '100%',
                    height: '150px',
                    cursor: 'crosshair',
                  },
                }}
                penColor="#000000"
                backgroundColor="#ffffff"
                minWidth={1}
                maxWidth={2.5}
                velocityFilterWeight={0.7}
              />

              <div
                className="absolute bottom-8 left-4 right-4 border-b border-dashed"
                style={{ borderColor: '#d1d5db' }}
              />

              <p
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs"
                style={{ color: themeColors.textMuted }}
              >
                Firme sobre la línea
              </p>

              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                  title="Limpiar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: `${themeColors.primary}20`, color: themeColors.primary }}
                  title="Guardar firma"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </>
          )
        )}

        {/* Estado deshabilitado sin firma */}
        {disabled && !value && (
          <div className="flex items-center justify-center h-[150px]" style={{ color: themeColors.textMuted }}>
            <p className="text-sm">Sin firma</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE DE PANEL DE FIRMAS DOBLE (Entrega y Recibe)
// ============================================================================

interface DualSignaturePanelProps {
  nombreEntrega: string;
  firmaEntrega: string | null;
  nombreRecibe: string;
  firmaRecibe: string | null;
  onNombreEntregaChange: (nombre: string) => void;
  onFirmaEntregaChange: (firma: string | null) => void;
  onNombreRecibeChange: (nombre: string) => void;
  onFirmaRecibeChange: (firma: string | null) => void;
  disabled?: boolean;
}

export const DualSignaturePanel: React.FC<DualSignaturePanelProps> = ({
  nombreEntrega,
  firmaEntrega,
  nombreRecibe,
  firmaRecibe,
  onNombreEntregaChange,
  onFirmaEntregaChange,
  onNombreRecibeChange,
  onFirmaRecibeChange,
  disabled = false,
}) => {
  const { paletteConfig, isDark } = useTheme();

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#1f2937' : '#ffffff',
    cardBg: isDark ? '#374151' : '#f9fafb',
    border: isDark ? '#4b5563' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }), [paletteConfig, isDark]);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: themeColors.border, backgroundColor: themeColors.cardBg }}
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Firmas de Conformidad
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firma de quien entrega */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.textMuted }}>
              Nombre de quien entrega
            </label>
            <input
              type="text"
              value={nombreEntrega}
              onChange={(e) => onNombreEntregaChange(e.target.value)}
              disabled={disabled}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 transition-all disabled:opacity-60"
              style={{
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>
          <SignatureCapture
            label="Firma de quien entrega"
            value={firmaEntrega}
            onChange={onFirmaEntregaChange}
            disabled={disabled}
            required
          />
        </div>

        {/* Firma de quien recibe */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.textMuted }}>
              Nombre de quien recibe
            </label>
            <input
              type="text"
              value={nombreRecibe}
              onChange={(e) => onNombreRecibeChange(e.target.value)}
              disabled={disabled}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 transition-all disabled:opacity-60"
              style={{
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>
          <SignatureCapture
            label="Firma de quien recibe"
            value={firmaRecibe}
            onChange={onFirmaRecibeChange}
            disabled={disabled}
            required
          />
        </div>
      </div>
    </div>
  );
};

export default SignatureCapture;
