# 📋 Resumen de Mejoras - Flujo de Documentos de Ingresos

**Fecha:** 28 de octubre de 2025  
**Módulo:** Ingresos (Eventos)

---

## 🎯 Objetivo

Mejorar el flujo de documentos del módulo de ingresos permitiendo la carga de **archivos en formato PDF e imágenes (JPEG, PNG)** para la **orden de compra** y el **comprobante de pago**, siguiendo el mismo patrón de almacenamiento que las facturas.

---

## ✅ Cambios Implementados

### 1️⃣ **Actualización de Validaciones de Archivos**

**Archivo:** `src/services/fileUploadService.ts`

**Cambio:**
- ✅ La validación de tipo `income` ahora acepta **PDF, JPG, JPEG y PNG**
- Antes: Solo aceptaba PDF
- Ahora: Acepta PDF e imágenes para orden de compra y comprobante de pago

**Código modificado:**
```typescript
// ✅ ACTUALIZADO: Income files ahora aceptan PDF e imágenes
const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
if (!allowedTypes.includes(file.type)) {
  errors.push('Los archivos de ingreso deben ser PDF, JPG, JPEG o PNG');
}
```

---

### 2️⃣ **Nueva Función de Subida para Orden de Compra**

**Archivo:** `src/modules/eventos/components/finances/IncomeForm.tsx`

**Cambio:**
- ✅ Implementada función `handleOrdenCompraUpload` que usa `uploadEventDocument`
- ✅ Sigue el formato de nombre: `{ClaveEvento}_OrdenCompra_V{N}_{NombreArchivo}`
- ✅ Guarda archivos en: `{ClaveEvento}/OrdenCompra/`
- ✅ Estado `uploadingDocument` para controlar carga asíncrona

**Código nuevo:**
```typescript
const handleOrdenCompraUpload = async (file: File) => {
  if (!eventId) {
    toast.error('❌ Debe guardar el evento antes de subir archivos');
    return;
  }

  try {
    setUploadingDocument(true);
    
    // Usar uploadEventDocument para mantener el formato correcto
    const uploadResult = await fileUploadService.uploadEventDocument(
      file,
      eventId,
      'OrdenCompra' // Tipo de documento
    );

    setFormData(prev => ({
      ...prev,
      orden_compra_url: uploadResult.url,
      orden_compra_nombre: uploadResult.fileName
    }));

    toast.success('✅ Orden de compra adjuntada correctamente');
  } catch (error) {
    console.error('❌ Error subiendo orden de compra:', error);
    toast.error(error instanceof Error ? error.message : 'Error al subir la orden de compra');
  } finally {
    setUploadingDocument(false);
  }
};
```

---

### 3️⃣ **Actualización de UI para Orden de Compra**

**Archivo:** `src/modules/eventos/components/finances/IncomeForm.tsx`

**Cambios:**
- ❌ **Eliminado:** Botón "Procesar" separado
- ✅ **Agregado:** Subida automática al seleccionar archivo
- ✅ **Actualizado:** Accept incluye `application/pdf,image/jpeg,image/jpg,image/png`
- ✅ **Mejorado:** Indicador de carga durante la subida
- ✅ **Documentado:** Mensaje explicativo del formato de guardado

**UI Nueva:**
```tsx
<input
  type="file"
  id="ordenCompraInput"
  accept="application/pdf,image/jpeg,image/jpg,image/png"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setOrdenCompraFile(file);
      // Subir automáticamente al seleccionar
      await handleOrdenCompraUpload(file);
    }
  }}
  className="hidden"
  disabled={isSubmitting || uploadingDocument}
/>
<label htmlFor="ordenCompraInput" className="...">
  {uploadingDocument ? 'Subiendo...' : 'Subir Orden de Compra (PDF o Imagen)'}
</label>
```

**Mensaje informativo:**
```
Opcional. Acepta PDF, JPG y PNG. 
Se guardará como: ClaveEvento_OrdenCompra_V1_NombreArchivo
```

---

### 4️⃣ **Actualización de Comprobante de Pago**

**Archivo:** `src/modules/eventos/components/finances/IncomeForm.tsx`

**Cambios:**
- ✅ Usa `uploadEventDocument` en lugar de `uploadFile`
- ✅ Formato de nombre: `{ClaveEvento}_ComprobantePago_V{N}_{NombreArchivo}`
- ✅ Guarda archivos en: `{ClaveEvento}/ComprobantePago/`
- ✅ Acepta: `application/pdf,image/jpeg,image/jpg,image/png`
- ✅ Validación de eventId antes de subir

**Código actualizado:**
```typescript
onChange={async (e) => {
  const file = e.target.files?.[0];
  if (file) {
    if (!eventId) {
      toast.error('❌ Debe guardar el evento antes de subir archivos');
      return;
    }

    try {
      setComprobantePagoFile(file);
      setUploadingDocument(true);
      
      // Usar uploadEventDocument con formato correcto
      const uploadResult = await fileUploadService.uploadEventDocument(
        file,
        eventId,
        'ComprobantePago' // Tipo de documento
      );
      
      setFormData(prev => ({
        ...prev,
        documento_pago_url: uploadResult.url,
        documento_pago_nombre: uploadResult.fileName
      }));
      
      toast.success('✅ Comprobante de pago cargado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '❌ Error al cargar comprobante');
    } finally {
      setUploadingDocument(false);
    }
  }
}}
```

---

### 5️⃣ **Visualización de Enlaces en Lista de Eventos**

**Archivo:** `src/modules/eventos/components/finances/IncomeCard.tsx`

**Cambio:**
- ✅ Agregada sección de "File attachment links" que muestra:
  - 📄 **Factura** (XML + PDF) - Morado
  - 📋 **Orden de Compra** - Índigo
  - 💰 **Comprobante de Pago** - Verde
- ✅ Enlaces clicables que abren en nueva pestaña
- ✅ Iconos y colores distintivos para cada tipo de documento

**Código nuevo:**
```tsx
{/* File attachment links */}
<div className="space-y-2 mb-3">
  {/* Factura (XML + PDF) */}
  {income.archivo_adjunto && (
    <div className="flex items-center space-x-2 text-sm">
      <Paperclip className="w-3 h-3 text-purple-500" />
      <span className="text-gray-600 font-medium">Factura:</span>
      <a href={income.archivo_adjunto} target="_blank" rel="noopener noreferrer"
         className="text-purple-600 hover:text-purple-800 hover:underline">
        {income.archivo_nombre || 'Ver factura adjunta'}
      </a>
    </div>
  )}

  {/* Orden de Compra */}
  {(income as any).orden_compra_url && (
    <div className="flex items-center space-x-2 text-sm">
      <Paperclip className="w-3 h-3 text-indigo-500" />
      <span className="text-gray-600 font-medium">Orden de Compra:</span>
      <a href={(income as any).orden_compra_url} target="_blank" rel="noopener noreferrer"
         className="text-indigo-600 hover:text-indigo-800 hover:underline">
        {(income as any).orden_compra_nombre || 'Ver orden de compra'}
      </a>
    </div>
  )}

  {/* Comprobante de Pago */}
  {income.documento_pago_url && (
    <div className="flex items-center space-x-2 text-sm">
      <Paperclip className="w-3 h-3 text-green-500" />
      <span className="text-gray-600 font-medium">Comprobante de Pago:</span>
      <a href={income.documento_pago_url} target="_blank" rel="noopener noreferrer"
         className="text-green-600 hover:text-green-800 hover:underline">
        {income.documento_pago_nombre || 'Ver comprobante de pago'}
      </a>
    </div>
  )}
</div>
```

---

## 📦 Formato de Almacenamiento

### **Estructura de Carpetas en Supabase Storage (bucket: `event_docs`)**

```
event_docs/
└── {ClaveEvento}/                    # Ejemplo: EVT001/
    ├── OrdenCompra/
    │   ├── EVT001_OrdenCompra_V1_Pedido_Materiales.pdf
    │   ├── EVT001_OrdenCompra_V2_Actualizacion.jpg
    │   └── EVT001_OrdenCompra_V3_Final.png
    ├── ComprobantePago/
    │   ├── EVT001_ComprobantePago_V1_Transferencia_001.pdf
    │   ├── EVT001_ComprobantePago_V2_Correccion.png
    │   └── EVT001_ComprobantePago_V3_Final.jpg
    └── Factura/                       # (Existente - XML + PDF)
        ├── EVT001_Factura_V1_...xml
        └── EVT001_Factura_V1_...pdf
```

### **Patrón de Nombres:**
```
{ClaveEvento}_{TipoDocumento}_V{NumeroVersion}_{NombreArchivo}
```

**Ejemplos:**
- `EVT123_OrdenCompra_V1_Pedido_Material_Construccion.pdf`
- `EVT123_ComprobantePago_V1_Transferencia_Bancaria_12345.jpg`
- `EVT123_ComprobantePago_V2_Comprobante_Actualizado.png`

---

## 🔄 Flujo de Usuario Actualizado

### **Antes:**
1. Usuario selecciona archivo para orden de compra
2. Usuario hace clic en botón "Procesar"
3. Archivo se sube con nombre genérico
4. Sin visualización clara en lista de eventos

### **Ahora:**
1. Usuario selecciona archivo (PDF o imagen)
2. ✅ **Subida automática** (sin botón adicional)
3. ✅ **Nombre estructurado** según patrón
4. ✅ **Versionado automático** (V1, V2, V3...)
5. ✅ **Enlaces visibles** en tarjeta de ingreso con colores distintivos
6. ✅ **Indicador de carga** mientras se procesa

---

## 📊 Tipos de Archivo Aceptados

| Documento | Formatos Aceptados | Obligatorio | Tamaño Máximo |
|-----------|-------------------|-------------|---------------|
| **Factura (XML + PDF)** | `.xml`, `.pdf` | ✅ Sí (Estado FACTURADO) | 10 MB |
| **Orden de Compra** | `.pdf`, `.jpg`, `.jpeg`, `.png` | ❌ No (Opcional) | 10 MB |
| **Comprobante de Pago** | `.pdf`, `.jpg`, `.jpeg`, `.png` | ✅ Sí (Estado PAGADO) | 10 MB |

---

## 🎨 Indicadores Visuales

### **En el Formulario:**
- **Orden de Compra:** 🔵 Borde índigo, icono de subida
- **Comprobante de Pago:** 🟢 Borde verde, icono de subida
- **Durante carga:** ⏳ Texto "Subiendo..." con cursor deshabilitado

### **En la Lista de Ingresos:**
- **Factura:** 🟣 Morado (`text-purple-600`)
- **Orden de Compra:** 🔵 Índigo (`text-indigo-600`)
- **Comprobante de Pago:** 🟢 Verde (`text-green-600`)

---

## 🧪 Casos de Prueba Recomendados

### **Test 1: Subida de Orden de Compra (PDF)**
1. Crear nuevo ingreso
2. Adjuntar PDF como orden de compra
3. ✅ Verificar nombre: `{Clave}_OrdenCompra_V1_{nombre}.pdf`
4. ✅ Verificar carpeta: `{Clave}/OrdenCompra/`
5. ✅ Verificar enlace visible en lista de ingresos

### **Test 2: Subida de Orden de Compra (Imagen)**
1. Adjuntar JPG como orden de compra
2. ✅ Verificar aceptación del archivo
3. ✅ Verificar compresión automática si excede 2MB
4. ✅ Verificar formato de nombre correcto

### **Test 3: Comprobante de Pago (PDF)**
1. Adjuntar PDF como comprobante de pago
2. ✅ Verificar cambio de estado a PAGADO
3. ✅ Verificar nombre: `{Clave}_ComprobantePago_V1_{nombre}.pdf`
4. ✅ Verificar carpeta: `{Clave}/ComprobantePago/`

### **Test 4: Comprobante de Pago (Imagen)**
1. Adjuntar PNG como comprobante de pago
2. ✅ Verificar aceptación del archivo
3. ✅ Verificar visualización en tarjeta con enlace verde

### **Test 5: Versionado Automático**
1. Subir orden de compra → V1
2. Eliminar y subir otra → V2
3. ✅ Verificar incremento correcto de versión

### **Test 6: Validación de Evento Guardado**
1. Intentar subir archivo sin guardar evento
2. ✅ Verificar mensaje: "Debe guardar el evento antes de subir archivos"

### **Test 7: Indicadores de Carga**
1. Seleccionar archivo grande
2. ✅ Verificar texto "Subiendo..." aparece
3. ✅ Verificar botón deshabilitado durante carga
4. ✅ Verificar mensaje de éxito al finalizar

---

## 📝 Archivos Modificados

| Archivo | Cambios Realizados |
|---------|-------------------|
| `src/services/fileUploadService.ts` | ✅ Actualizada validación para aceptar imágenes en tipo `income` |
| `src/modules/eventos/components/finances/IncomeForm.tsx` | ✅ Implementada función `handleOrdenCompraUpload`<br>✅ Actualizada UI de orden de compra (subida automática)<br>✅ Actualizada lógica de comprobante de pago<br>✅ Agregado estado `uploadingDocument` |
| `src/modules/eventos/components/finances/IncomeCard.tsx` | ✅ Agregada sección de visualización de enlaces<br>✅ Enlaces a factura, orden de compra y comprobante<br>✅ Colores distintivos por tipo de documento |

---

## 🚀 Beneficios de los Cambios

1. ✅ **Flexibilidad:** Acepta imágenes (capturas de pantalla, fotos de documentos)
2. ✅ **Organización:** Nomenclatura estructurada y consistente
3. ✅ **Trazabilidad:** Versionado automático de documentos
4. ✅ **Usabilidad:** Subida automática sin clics adicionales
5. ✅ **Visibilidad:** Enlaces claros y accesibles en tarjetas de ingreso
6. ✅ **Validación:** Verificación de evento guardado antes de subir
7. ✅ **Feedback:** Indicadores de carga y mensajes de confirmación

---

## 📌 Notas Técnicas

- **Service usado:** `fileUploadService.uploadEventDocument()`
- **Bucket de almacenamiento:** `event_docs`
- **Compresión automática:** Imágenes > 2MB se comprimen automáticamente
- **Estado de carga:** Variable `uploadingDocument` controla UI durante subida
- **Validación TypeScript:** Se usa `(income as any)` temporalmente para `orden_compra_url` (requiere actualización del tipo `Income`)

---

## 🔮 Mejoras Futuras Sugeridas

1. ⭐ Actualizar interfaz `Income` para incluir `orden_compra_url` y `orden_compra_nombre`
2. ⭐ Implementar preview de imágenes antes de subir
3. ⭐ Agregar drag & drop para subida de archivos
4. ⭐ Implementar visor de documentos (PDF viewer) integrado
5. ⭐ Agregar historial de versiones de documentos
6. ⭐ Notificaciones por email cuando se adjunten documentos importantes

---

**Implementación completada:** 28 de octubre de 2025  
**Estado:** ✅ Listo para pruebas
