import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useTheme } from '../../../shared/components/theme';

// Formatos de código soportados (QR + Códigos de Barras)
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
];

type ScanMode = 'all' | 'qr' | 'barcode';

interface QRScannerProps {
  onScan: (code: string, format?: string) => void;
  onError?: (error: string) => void;
  isOpen: boolean;
  onClose: () => void;
  mode?: ScanMode; // Modo de escaneo: todos, solo QR, o solo código de barras
  title?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  isOpen,
  onClose,
  mode = 'all',
  title,
}) => {
  const { paletteConfig, isDark } = useTheme();
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [lastScannedFormat, setLastScannedFormat] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanMode>(mode);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Obtener formatos según el modo
  const getFormatsForMode = useCallback((currentMode: ScanMode) => {
    switch (currentMode) {
      case 'qr':
        return [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.DATA_MATRIX];
      case 'barcode':
        return [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.PDF_417,
        ];
      default:
        return SUPPORTED_FORMATS;
    }
  }, []);

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#1f2937' : '#ffffff',
    cardBg: isDark ? '#374151' : '#f9fafb',
    border: isDark ? '#4b5563' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }), [paletteConfig, isDark]);

  // Obtener nombre amigable del formato
  const getFormatName = (formatCode: number): string => {
    const formatNames: Record<number, string> = {
      0: 'QR Code',
      1: 'AZTEC',
      2: 'CODABAR',
      3: 'CODE 39',
      4: 'CODE 93',
      5: 'CODE 128',
      6: 'DATA MATRIX',
      7: 'MAXICODE',
      8: 'ITF',
      9: 'EAN-13',
      10: 'EAN-8',
      11: 'PDF 417',
      12: 'RSS 14',
      13: 'RSS EXPANDED',
      14: 'UPC-A',
      15: 'UPC-E',
      16: 'UPC EAN',
    };
    return formatNames[formatCode] || 'Código';
  };

  // Obtener cámaras disponibles
  useEffect(() => {
    if (isOpen) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          setCameras(devices);
          if (devices.length > 0) {
            // Preferir cámara trasera
            const backCamera = devices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('trasera')
            );
            setSelectedCamera(backCamera?.id || devices[0].id);
          }
        })
        .catch((err) => {
          console.error('Error obteniendo cámaras:', err);
          setErrorMessage('No se pudieron obtener las cámaras. Verifique los permisos.');
          setShowManualInput(true);
        });
    }
  }, [isOpen]);

  // Iniciar/detener scanner
  useEffect(() => {
    const startScanner = async () => {
      if (!selectedCamera || !containerRef.current || scannerRef.current) return;

      try {
        const html5QrCode = new Html5Qrcode('qr-scanner-container', {
          formatsToSupport: getFormatsForMode(scanMode),
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        // Configurar tamaño del área de escaneo según el modo
        const qrboxSize = scanMode === 'barcode' 
          ? { width: 300, height: 150 } // Rectángulo horizontal para códigos de barras
          : { width: 250, height: 250 }; // Cuadrado para QR

        await html5QrCode.start(
          selectedCamera,
          {
            fps: 15,
            qrbox: qrboxSize,
            aspectRatio: scanMode === 'barcode' ? 2 : 1,
          },
          (decodedText, decodedResult) => {
            // Código escaneado exitosamente
            const formatName = getFormatName(decodedResult.result.format?.format || 0);
            setLastScannedFormat(formatName);
            onScan(decodedText, formatName);
            // Vibración si está disponible
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
          },
          () => {
            // Error de escaneo (silencioso)
          }
        );
        setIsScanning(true);
        setErrorMessage(null);
      } catch (err: any) {
        console.error('Error iniciando scanner:', err);
        setErrorMessage(err.message || 'Error al iniciar el escáner');
        setShowManualInput(true);
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          // Verificar si el scanner está escaneando antes de detenerlo
          const scanner = scannerRef.current;
          scannerRef.current = null; // Limpiar referencia primero
          
          if (scanner.isScanning) {
            await scanner.stop();
          }
          // Solo llamar clear si el elemento existe en el DOM
          const container = document.getElementById(containerId);
          if (container && container.children.length > 0) {
            try {
              await scanner.clear();
            } catch (clearErr) {
              // Ignorar errores de clear, el elemento ya puede estar removido
            }
          }
        } catch (err: any) {
          // Solo loguear si no es un error de nodo ya removido
          if (!err.message?.includes('removeChild') && !err.message?.includes('not a child')) {
            console.warn('Error deteniendo scanner:', err.message);
          }
        }
        setIsScanning(false);
      }
    };

    if (isOpen && selectedCamera) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, selectedCamera, onScan, scanMode, getFormatsForMode]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen && scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      
      // Detener de forma segura
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
      
      setIsScanning(false);
      setManualCode('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Manejar código manual
  const handleManualSubmit = useCallback(() => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  }, [manualCode, onScan]);

  // Cambiar cámara
  const handleCameraChange = useCallback(async (newCameraId: string) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error cambiando cámara:', err);
      }
    }
    setSelectedCamera(newCameraId);
  }, []);

  // Cambiar modo de escaneo
  const handleModeChange = useCallback(async (newMode: ScanMode) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error cambiando modo:', err);
      }
    }
    setScanMode(newMode);
  }, []);

  // Obtener título dinámico
  const getTitle = () => {
    if (title) return title;
    switch (scanMode) {
      case 'qr': return 'Escanear Código QR';
      case 'barcode': return 'Escanear Código de Barras';
      default: return 'Escanear QR / Código de Barras';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: themeColors.background }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})` }}
        >
          <div className="flex items-center gap-2">
            {scanMode === 'barcode' ? (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h2v12H4zM8 6h1v12H8zM11 6h3v12h-3zM16 6h2v12h-2zM20 6h1v12h-1z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            )}
            <h2 className="text-lg font-bold text-white">{getTitle()}</h2>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Selector de modo de escaneo */}
          <div className="flex gap-2">
            <button
              onClick={() => handleModeChange('all')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                scanMode === 'all' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: scanMode === 'all' ? themeColors.primary : themeColors.cardBg,
                color: scanMode === 'all' ? 'white' : themeColors.text,
                border: `1px solid ${scanMode === 'all' ? themeColors.primary : themeColors.border}`,
              }}
            >
              Todos
            </button>
            <button
              onClick={() => handleModeChange('qr')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                scanMode === 'qr' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: scanMode === 'qr' ? themeColors.primary : themeColors.cardBg,
                color: scanMode === 'qr' ? 'white' : themeColors.text,
                border: `1px solid ${scanMode === 'qr' ? themeColors.primary : themeColors.border}`,
              }}
            >
              QR
            </button>
            <button
              onClick={() => handleModeChange('barcode')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                scanMode === 'barcode' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: scanMode === 'barcode' ? themeColors.primary : themeColors.cardBg,
                color: scanMode === 'barcode' ? 'white' : themeColors.text,
                border: `1px solid ${scanMode === 'barcode' ? themeColors.primary : themeColors.border}`,
              }}
            >
              Barras
            </button>
          </div>

          {/* Selector de cámara */}
          {cameras.length > 1 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.textMuted }}>
                Cámara
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: themeColors.cardBg,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Cámara ${camera.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Área del scanner */}
          <div
            id="qr-scanner-container"
            ref={containerRef}
            className="relative rounded-lg overflow-hidden bg-black"
            style={{ minHeight: '280px' }}
          >
            {!isScanning && !errorMessage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm">Iniciando cámara...</p>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">
              <p className="font-medium">Error</p>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Mensaje de escaneo activo */}
          {isScanning && (
            <div className="text-center text-sm" style={{ color: themeColors.textMuted }}>
              <p>
                {scanMode === 'barcode' 
                  ? 'Apunte la cámara al código de barras del producto'
                  : scanMode === 'qr'
                  ? 'Apunte la cámara al código QR del producto'
                  : 'Apunte la cámara al código QR o código de barras'}
              </p>
              {lastScannedFormat && (
                <p className="mt-1 text-xs" style={{ color: themeColors.primary }}>
                  Último formato detectado: {lastScannedFormat}
                </p>
              )}
            </div>
          )}

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t" style={{ borderColor: themeColors.border }} />
            <span className="text-xs" style={{ color: themeColors.textMuted }}>O ingrese manualmente</span>
            <div className="flex-1 border-t" style={{ borderColor: themeColors.border }} />
          </div>

          {/* Input manual */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Código del producto..."
              className="flex-1 px-3 py-2 rounded-lg border focus:ring-2 transition-all"
              style={{
                backgroundColor: themeColors.cardBg,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              className="px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: themeColors.primary }}
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t flex justify-end"
          style={{ borderColor: themeColors.border }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
