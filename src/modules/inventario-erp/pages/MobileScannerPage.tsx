/**
 * MobileScannerPage - Página móvil para escanear productos
 * 
 * Accesible via QR code, permite:
 * - Escanear múltiples productos con la cámara del teléfono
 * - Acumular lista de productos escaneados
 * - Enviar la lista al documento de inventario en la PC
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../../core/config/supabase';
import { QRCodeCanvas } from 'qrcode.react';

// Formatos soportados
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

interface ProductoEscaneado {
  codigo: string;
  nombre?: string;
  cantidad: number;
  timestamp: Date;
}

interface SessionData {
  sessionId: string;
  tipo: 'entrada' | 'salida';
  companyId: string;
  almacenId?: number;
  createdAt: Date;
}

export const MobileScannerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const tipo = searchParams.get('tipo') as 'entrada' | 'salida' || 'entrada';
  const companyId = searchParams.get('company') || '';
  
  // Estados
  const [productos, setProductos] = useState<ProductoEscaneado[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [manualCode, setManualCode] = useState('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTime = useRef<number>(0);

  // Colores del tema
  const colors = {
    primary: tipo === 'entrada' ? '#10b981' : '#f59e0b',
    primaryDark: tipo === 'entrada' ? '#059669' : '#d97706',
    bg: '#f9fafb',
    card: '#ffffff',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
  };

  // Obtener cámaras disponibles
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) {
          // Preferir cámara trasera
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('trasera') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
        }
      })
      .catch((err) => {
        console.error('Error obteniendo cámaras:', err);
        setError('No se pudo acceder a la cámara. Verifica los permisos.');
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Iniciar/detener scanner
  const toggleScanner = useCallback(async () => {
    if (isScanning) {
      // Detener
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current = null;
        } catch (e) {
          console.warn('Error deteniendo scanner:', e);
        }
      }
      setIsScanning(false);
    } else {
      // Iniciar
      if (!selectedCamera) {
        setError('No hay cámara seleccionada');
        return;
      }

      try {
        const scanner = new Html5Qrcode('mobile-scanner-container', {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          selectedCamera,
          {
            fps: 10,
            qrbox: { width: 280, height: 200 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Evitar escaneos duplicados (debounce de 1.5 segundos)
            const now = Date.now();
            if (now - lastScanTime.current < 1500) return;
            lastScanTime.current = now;

            handleScan(decodedText);
          },
          () => {} // Error de escaneo silencioso
        );
        setIsScanning(true);
        setError(null);
      } catch (err: any) {
        console.error('Error iniciando scanner:', err);
        setError(err.message || 'Error al iniciar el escáner');
      }
    }
  }, [isScanning, selectedCamera]);

  // Procesar código escaneado
  const handleScan = useCallback(async (codigo: string) => {
    setLastScanned(codigo);
    
    // Vibrar
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Verificar si ya está en la lista
    const existente = productos.find(p => p.codigo === codigo);
    if (existente) {
      // Incrementar cantidad
      setProductos(prev => prev.map(p => 
        p.codigo === codigo 
          ? { ...p, cantidad: p.cantidad + 1, timestamp: new Date() }
          : p
      ));
    } else {
      // Buscar nombre del producto en la base de datos
      let nombre = codigo;
      try {
        const { data } = await supabase
          .from('productos_erp')
          .select('nombre')
          .or(`clave.eq.${codigo},codigo_qr.eq.${codigo}`)
          .limit(1)
          .single();
        
        if (data) {
          nombre = data.nombre;
        }
      } catch (e) {
        // Si no encuentra, usar el código como nombre
      }

      // Agregar nuevo producto
      setProductos(prev => [...prev, {
        codigo,
        nombre,
        cantidad: 1,
        timestamp: new Date(),
      }]);
    }

    // Limpiar mensaje después de 2 segundos
    setTimeout(() => setLastScanned(null), 2000);
  }, [productos]);

  // Agregar código manual
  const handleManualAdd = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  // Actualizar cantidad
  const updateCantidad = (codigo: string, delta: number) => {
    setProductos(prev => prev.map(p => {
      if (p.codigo === codigo) {
        const nuevaCantidad = Math.max(0, p.cantidad + delta);
        return nuevaCantidad === 0 ? null : { ...p, cantidad: nuevaCantidad };
      }
      return p;
    }).filter(Boolean) as ProductoEscaneado[]);
  };

  // Eliminar producto
  const eliminarProducto = (codigo: string) => {
    setProductos(prev => prev.filter(p => p.codigo !== codigo));
  };

  // Enviar datos al servidor
  const enviarDatos = async () => {
    if (productos.length === 0) {
      setError('No hay productos para enviar');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      // Guardar en una tabla temporal o usar localStorage + broadcast
      const payload = {
        sessionId,
        tipo,
        companyId,
        productos: productos.map(p => ({
          codigo: p.codigo,
          nombre: p.nombre,
          cantidad: p.cantidad,
        })),
        timestamp: new Date().toISOString(),
      };

      // Opción 1: Guardar en tabla de sesiones de escaneo
      const { error: insertError } = await supabase
        .from('scan_sessions_erp')
        .upsert({
          id: sessionId,
          company_id: companyId,
          tipo,
          productos: payload.productos,
          status: 'completed',
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        // Si la tabla no existe, usar localStorage como fallback
        console.warn('Tabla scan_sessions no existe, usando localStorage');
        localStorage.setItem(`scan_session_${sessionId}`, JSON.stringify(payload));
      }

      setEnviado(true);
      
      // Vibrar éxito
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

    } catch (err: any) {
      console.error('Error enviando datos:', err);
      setError('Error al enviar los datos: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Limpiar lista
  const limpiarLista = () => {
    if (confirm('¿Eliminar todos los productos escaneados?')) {
      setProductos([]);
      setEnviado(false);
    }
  };

  // Total de productos
  const totalProductos = productos.reduce((sum, p) => sum + p.cantidad, 0);

  // Si no hay sesión válida, mostrar instrucciones
  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Escáner Móvil ERP
          </h1>
          <p className="text-gray-600 mb-6">
            Para usar el escáner móvil, escanea el código QR que aparece en la pantalla de tu computadora al crear un documento de entrada o salida.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm text-yellow-800">
              <strong>💡 Tip:</strong> En la PC, ve a Inventario → Documentos → Nueva Entrada/Salida y busca el botón "Escanear desde teléfono".
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de éxito
  if (enviado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: colors.bg }}>
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary + '20' }}>
            <svg className="w-12 h-12" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: colors.text }}>
            ¡Datos Enviados!
          </h1>
          <p className="text-gray-600 mb-6">
            Se enviaron <strong>{totalProductos}</strong> productos ({productos.length} diferentes) para {tipo === 'entrada' ? 'entrada' : 'salida'} de inventario.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setEnviado(false)}
              className="w-full py-3 rounded-lg font-medium text-white"
              style={{ backgroundColor: colors.primary }}
            >
              Escanear más productos
            </button>
            <button
              onClick={limpiarLista}
              className="w-full py-3 rounded-lg font-medium border"
              style={{ borderColor: colors.border, color: colors.textMuted }}
            >
              Nueva sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header className="px-4 py-3 text-white" style={{ backgroundColor: colors.primary }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">
              {tipo === 'entrada' ? '📥 Entrada' : '📤 Salida'} de Inventario
            </h1>
            <p className="text-xs opacity-80">Sesión: {sessionId?.substring(0, 8)}...</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{totalProductos}</div>
            <div className="text-xs opacity-80">productos</div>
          </div>
        </div>
      </header>

      {/* Scanner */}
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderColor: colors.border }}>
          {/* Área de escaneo */}
          <div 
            id="mobile-scanner-container" 
            className="relative bg-black"
            style={{ height: isScanning ? '250px' : '0', transition: 'height 0.3s' }}
          />

          {/* Controles de cámara */}
          <div className="p-4 space-y-3">
            {/* Selector de cámara */}
            {cameras.length > 1 && (
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                disabled={isScanning}
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Cámara ${cam.id.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            )}

            {/* Botón de escaneo */}
            <button
              onClick={toggleScanner}
              className="w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: isScanning ? '#ef4444' : colors.primary }}
            >
              {isScanning ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Detener Escaneo
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Iniciar Escaneo
                </>
              )}
            </button>

            {/* Input manual */}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                placeholder="Código manual..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={handleManualAdd}
                disabled={!manualCode.trim()}
                className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: colors.primary }}
              >
                +
              </button>
            </div>
          </div>

          {/* Último escaneado */}
          {lastScanned && (
            <div className="mx-4 mb-4 p-3 rounded-lg text-center text-white animate-pulse" style={{ backgroundColor: colors.primary }}>
              ✓ Escaneado: {lastScanned}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Lista de productos */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: colors.text }}>
              Productos ({productos.length})
            </h2>
            {productos.length > 0 && (
              <button
                onClick={limpiarLista}
                className="text-xs text-red-500"
              >
                Limpiar
              </button>
            )}
          </div>

          {productos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>Escanea productos para agregarlos</p>
            </div>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {productos.map((producto, index) => (
                <div key={producto.codigo + index} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm" style={{ color: colors.text }}>
                      {producto.nombre}
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      {producto.codigo}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateCantidad(producto.codigo, -1)}
                      className="w-8 h-8 rounded-full border flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold">{producto.cantidad}</span>
                    <button
                      onClick={() => updateCantidad(producto.codigo, 1)}
                      className="w-8 h-8 rounded-full border flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => eliminarProducto(producto.codigo)}
                      className="w-8 h-8 rounded-full text-red-500 flex items-center justify-center ml-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Botón enviar */}
      {productos.length > 0 && (
        <div className="p-4 bg-white border-t shadow-lg">
          <button
            onClick={enviarDatos}
            disabled={enviando}
            className="w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: colors.primary }}
          >
            {enviando ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enviando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar {totalProductos} productos
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileScannerPage;
