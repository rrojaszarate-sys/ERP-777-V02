# 📘 Guía de Uso: Sistema OCR con Análisis Espacial

## 🎯 Para Desarrolladores Frontend

Esta guía explica cómo usar el nuevo sistema OCR con análisis espacial desde tu aplicación React/TypeScript.

---

## 📦 Respuesta del API

### Endpoint
```
POST /api/ocr-process
```

### Request Body
```json
{
  "image": "base64_encoded_image_string"
}
```

### Response Exitosa
```json
{
  "success": true,
  "text": "Texto completo extraído del documento...",
  "data": {
    "proveedor": "Restaurante XYZ",
    "rfc": "ABC123456DEF",
    "fecha": "27/10/2025",
    "codigo_postal": "06600",
    "total": 450.50,
    "subtotal": 388.36,
    "iva": 62.14,
    "detalle": [
      {
        "descripcion": "Café Americano",
        "precio": 45.00
      },
      {
        "descripcion": "Pan Dulce",
        "precio": 25.00
      }
    ]
  },
  "confidence": 0.95
}
```

---

## 🔧 Integración en TypeScript

### 1. Importar Tipos
```typescript
import type { DetalleItem, TicketData } from '@/modules/ocr/types/OCRTypes';
```

### 2. Función de Procesamiento
```typescript
async function processOCR(file: File): Promise<TicketData> {
  // Convertir archivo a base64
  const base64 = await fileToBase64(file);

  // Llamar al API
  const response = await fetch('/api/ocr-process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: base64 })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Error procesando OCR');
  }

  return result.data;
}

// Helper para convertir File a base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remover el prefijo "data:image/...;base64,"
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
  });
}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Mostrar Datos Básicos
```tsx
function OCRResultDisplay({ data }: { data: TicketData }) {
  return (
    <div className="ocr-result">
      <h3>Datos Extraídos</h3>

      <div className="field">
        <label>Proveedor:</label>
        <span>{data.proveedor || 'No detectado'}</span>
      </div>

      <div className="field">
        <label>RFC:</label>
        <span>{data.rfc || 'No detectado'}</span>
      </div>

      <div className="field">
        <label>Código Postal:</label>
        <span>{data.codigo_postal || 'No detectado'}</span>
      </div>

      <div className="field">
        <label>Fecha:</label>
        <span>{data.fecha || 'No detectada'}</span>
      </div>

      <div className="field">
        <label>Total:</label>
        <span>${data.total?.toFixed(2) || '0.00'}</span>
      </div>
    </div>
  );
}
```

### Ejemplo 2: Tabla de Detalle de Artículos
```tsx
function DetalleTable({ detalle }: { detalle: DetalleItem[] }) {
  const total = detalle.reduce((sum, item) => sum + item.precio, 0);

  return (
    <table className="detalle-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Descripción</th>
          <th>Precio</th>
        </tr>
      </thead>
      <tbody>
        {detalle.map((item, index) => (
          <tr key={index}>
            <td>{index + 1}</td>
            <td>{item.descripcion}</td>
            <td>${item.precio.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2}><strong>Total</strong></td>
          <td><strong>${total.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
  );
}
```

### Ejemplo 3: Componente Completo de Upload + OCR
```tsx
import { useState } from 'react';
import type { TicketData } from '@/modules/ocr/types/OCRTypes';

function OCRUploader() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await processOCR(file);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ocr-uploader">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={loading}
      />

      {loading && <div className="spinner">Procesando OCR...</div>}

      {error && <div className="error">{error}</div>}

      {data && (
        <div className="result">
          <OCRResultDisplay data={data} />

          {data.detalle && data.detalle.length > 0 && (
            <>
              <h4>Detalle de Artículos</h4>
              <DetalleTable detalle={data.detalle} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 Validación de Datos

### Verificar Campos Críticos
```typescript
function validateOCRData(data: TicketData): string[] {
  const warnings: string[] = [];

  if (!data.total || data.total <= 0) {
    warnings.push('Total no detectado o inválido');
  }

  if (!data.proveedor) {
    warnings.push('Proveedor no detectado');
  }

  if (!data.fecha) {
    warnings.push('Fecha no detectada');
  }

  // Verificar que la suma del detalle coincida con el total
  if (data.detalle && data.detalle.length > 0) {
    const sumaDetalle = data.detalle.reduce((sum, item) => sum + item.precio, 0);
    const diferencia = Math.abs((data.total || 0) - sumaDetalle);

    if (diferencia > 0.50) {
      warnings.push(
        `Diferencia entre total (${data.total}) y suma de detalle (${sumaDetalle.toFixed(2)})`
      );
    }
  }

  return warnings;
}
```

### Usar Validación
```tsx
function OCRResultWithValidation({ data }: { data: TicketData }) {
  const warnings = validateOCRData(data);

  return (
    <>
      {warnings.length > 0 && (
        <div className="warnings">
          <h4>⚠️ Advertencias</h4>
          <ul>
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <OCRResultDisplay data={data} />
    </>
  );
}
```

---

## 🔄 Integración con Formularios de Gastos

### Prellenar Formulario con Datos OCR
```tsx
import { useForm } from 'react-hook-form';

function ExpenseFormWithOCR() {
  const { register, setValue } = useForm();

  const handleOCRComplete = (data: TicketData) => {
    // Prellenar campos del formulario
    if (data.proveedor) setValue('proveedor', data.proveedor);
    if (data.rfc) setValue('rfc', data.rfc);
    if (data.fecha) setValue('fecha', data.fecha);
    if (data.total) setValue('monto', data.total);
    if (data.codigo_postal) setValue('codigo_postal', data.codigo_postal);

    // Si hay detalle, crear descripción concatenada
    if (data.detalle && data.detalle.length > 0) {
      const descripcion = data.detalle
        .map(item => `${item.descripcion} - $${item.precio.toFixed(2)}`)
        .join('\n');
      setValue('descripcion', descripcion);
    }
  };

  return (
    <form>
      <OCRUploader onComplete={handleOCRComplete} />

      <input {...register('proveedor')} placeholder="Proveedor" />
      <input {...register('rfc')} placeholder="RFC" />
      <input {...register('fecha')} type="date" />
      <input {...register('monto')} type="number" step="0.01" />
      <textarea {...register('descripcion')} />

      <button type="submit">Guardar Gasto</button>
    </form>
  );
}
```

---

## 📊 Mostrar Confianza del OCR

```tsx
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const color = percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red';

  return (
    <div className={`confidence confidence-${color}`}>
      <span>Confianza: {percentage}%</span>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
```

---

## 🚨 Manejo de Errores

```typescript
type OCRError = {
  type: 'network' | 'processing' | 'validation';
  message: string;
};

async function processOCRWithErrorHandling(file: File): Promise<TicketData> {
  try {
    // Validar tamaño de archivo
    if (file.size > 5 * 1024 * 1024) { // 5MB
      throw { type: 'validation', message: 'Archivo muy grande (máx 5MB)' };
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      throw { type: 'validation', message: 'Solo se aceptan imágenes' };
    }

    const base64 = await fileToBase64(file);
    const response = await fetch('/api/ocr-process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 })
    });

    if (!response.ok) {
      throw { type: 'network', message: `Error HTTP ${response.status}` };
    }

    const result = await response.json();

    if (!result.success) {
      throw { type: 'processing', message: result.message || 'Error procesando OCR' };
    }

    return result.data;

  } catch (error) {
    if ((error as OCRError).type) {
      throw error;
    }
    throw { type: 'network', message: 'Error de red' };
  }
}
```

---

## 🎁 Componente Bonus: Vista Previa + OCR

```tsx
function ImagePreviewWithOCR() {
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<TicketData | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Procesar OCR
    try {
      const data = await processOCR(file);
      setOcrData(data);
    } catch (err) {
      console.error('Error OCR:', err);
    }
  };

  return (
    <div className="preview-container">
      <input type="file" accept="image/*" onChange={handleFileSelect} />

      <div className="preview-grid">
        {preview && (
          <div className="preview-image">
            <h4>Vista Previa</h4>
            <img src={preview} alt="Preview" />
          </div>
        )}

        {ocrData && (
          <div className="preview-data">
            <h4>Datos Extraídos</h4>
            <OCRResultDisplay data={ocrData} />
            {ocrData.detalle && <DetalleTable detalle={ocrData.detalle} />}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📖 Tips y Best Practices

### 1. Optimización de Imágenes
```typescript
// Comprimir imagen antes de enviar
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Redimensionar si es muy grande
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

### 2. Caché de Resultados
```typescript
const ocrCache = new Map<string, TicketData>();

async function processOCRWithCache(file: File): Promise<TicketData> {
  const key = `${file.name}-${file.size}-${file.lastModified}`;

  if (ocrCache.has(key)) {
    return ocrCache.get(key)!;
  }

  const result = await processOCR(file);
  ocrCache.set(key, result);

  return result;
}
```

### 3. Loading States
```tsx
type LoadingState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

function OCRWithStates() {
  const [state, setState] = useState<LoadingState>('idle');

  const messages = {
    uploading: '📤 Subiendo imagen...',
    processing: '🔍 Analizando documento...',
    done: '✅ Procesamiento completado',
    error: '❌ Error en el procesamiento'
  };

  return (
    <div>
      {state !== 'idle' && <div className="status">{messages[state]}</div>}
      {/* ... resto del componente */}
    </div>
  );
}
```

---

## 🔗 Referencias

- [Documentación completa del sistema](./OCR_SPATIAL_ANALYSIS.md)
- [Resumen ejecutivo](./OCR_REFACTORIZACION_RESUMEN.md)
- [Tipos TypeScript](../src/modules/ocr/types/OCRTypes.ts)

---

**Fecha**: Octubre 2025
**Versión**: 2.0 - Análisis Espacial
**Autor**: Equipo de Desarrollo
