# ✅ INTERFAZ DUAL IMPLEMENTADA - Guía de Prueba

## 🎉 ¿Qué se implementó?

### **Nueva Interfaz de Doble Subida**

El formulario de gastos ahora tiene **DOS ZONAS separadas**:

1. **🟣 Zona Morada (Superior)**: XML CFDI
   - Para archivos `.xml` de facturas electrónicas
   - Extracción 100% precisa sin OCR
   - Muestra: "📄 XML CFDI (Factura Electrónica)"

2. **🔵 Zona Azul (Inferior)**: PDF/Imagen
   - Para archivos `.pdf`, `.jpg`, `.png`
   - Para tickets o respaldo visual de facturas
   - Usa OCR automático si no hay XML
   - Muestra: "📷 PDF/Imagen (Visual o Ticket)"

---

## 🎨 Aspecto Visual

```
┌─────────────────────────────────────────────┐
│  📎 Documentos del Gasto                    │
├─────────────────────────────────────────────┤
│                                             │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 📄 XML CFDI (Factura Electrónica)    ┃  │
│  ┃ Extracción automática 100% precisa   ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                       ┃  │
│  ┃  [Click o arrastra XML aquí]         ┃  │
│  ┃                                       ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                             │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 📷 PDF/Imagen (Visual o Ticket)      ┃  │
│  ┃ Respaldo visual o ticket sin XML     ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                       ┃  │
│  ┃  [Click o arrastra PDF/Imagen aquí]  ┃  │
│  ┃                                       ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                             │
│  💡 Tip: Para facturas, sube ambos         │
│  archivos (XML + PDF)                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🧪 Casos de Prueba

### **Caso 1: Factura con XML + PDF (Caso Ideal)**

**Objetivo**: Verificar que se pueden subir ambos archivos

**Pasos**:
1. Ir a **Gastos** → **Nuevo Gasto**
2. En zona morada: Click **"Click o arrastra XML aquí"**
3. Seleccionar: `20255200238260Factura.xml`
4. Debería aparecer:
   ```
   ✅ 20255200238260Factura.xml
      XML CFDI • 7.2 KB
   ```
5. En zona azul: Click **"Click o arrastra PDF/Imagen aquí"**
6. Seleccionar: `factura_samsung.pdf`
7. Debería aparecer:
   ```
   ✅ factura_samsung.pdf
      156 KB
   ```
8. Click **"Guardar Gasto"**

**Resultado Esperado**:
- ✅ Formulario auto-relleno con datos del XML
- ✅ Ambos archivos guardados
- ✅ Carpeta creada: `gastos/EVT-001/H47823/`
- ✅ Total: $764.24 (del XML)

---

### **Caso 2: Solo XML (Sin PDF)**

**Objetivo**: Verificar que XML solo funciona

**Pasos**:
1. Ir a **Gastos** → **Nuevo Gasto**
2. En zona morada: Subir solo XML
3. Dejar zona azul **vacía**
4. Click **"Guardar Gasto"**

**Resultado Esperado**:
- ✅ Datos extraídos del XML
- ✅ Formulario auto-relleno
- ✅ Sin archivo visual (OK)
- ✅ Total: $764.24

---

### **Caso 3: Solo Imagen (Ticket sin XML)**

**Objetivo**: Verificar que OCR sigue funcionando

**Pasos**:
1. Ir a **Gastos** → **Nuevo Gasto**
2. Dejar zona morada **vacía**
3. En zona azul: Subir foto de ticket
4. Sistema detecta que no hay XML → Usa OCR
5. Click **"Guardar Gasto"**

**Resultado Esperado**:
- ✅ OCR procesa la imagen
- ✅ Datos extraídos (con ~85-95% precisión)
- ✅ Usuario puede corregir si es necesario

---

### **Caso 4: Drag & Drop**

**Objetivo**: Verificar arrastrar y soltar

**Pasos**:
1. Ir a **Gastos** → **Nuevo Gasto**
2. Arrastrar XML a zona morada
3. Soltar
4. Arrastrar PDF a zona azul
5. Soltar

**Resultado Esperado**:
- ✅ Archivos se cargan automáticamente
- ✅ Aparecen en sus respectivas zonas

---

### **Caso 5: Quitar Archivos**

**Objetivo**: Verificar que se pueden eliminar

**Pasos**:
1. Subir XML
2. Click en **"✕"** (botón de quitar)
3. XML desaparece
4. Subir PDF
5. Click en **"✕"**
6. PDF desaparece

**Resultado Esperado**:
- ✅ Archivos se eliminan
- ✅ Zonas vuelven al estado inicial

---

### **Caso 6: Ver Archivo Existente**

**Objetivo**: Verificar visualización de archivos guardados

**Pasos**:
1. Crear gasto con PDF
2. Guardar
3. Editar el gasto
4. Debería mostrar PDF en zona azul
5. Click **"Ver"**

**Resultado Esperado**:
- ✅ PDF se abre en nueva pestaña
- ✅ Botón "Ver" funciona

---

## ⚙️ Lógica Implementada

### **Detección Automática por Extensión**

```typescript
// XML detectado por extensión
if (file.name.endsWith('.xml')) {
  // Mostrar en zona morada
  // Procesar con parseCFDIXml()
}

// PDF/Imagen detectado por extensión
if (file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
  // Mostrar en zona azul
  // Procesar con OCR (si no hay XML)
}
```

---

## 🎯 Ventajas de la Nueva Interfaz

### **Antes (Interfaz Simple)**:
```
[Una sola zona de subida]
↓
Usuario sube XML → ✅ Datos bien, ❌ sin visual
Usuario sube PDF → ⚠️ OCR impreciso
```

### **Ahora (Interfaz Dual)**:
```
[Zona XML] + [Zona PDF]
↓
Usuario sube XML → ✅ Datos perfectos
Usuario sube PDF → ✅ Visual disponible
Sistema combina ambos → 🏆 PERFECTO
```

---

## 🚨 Validaciones Implementadas

1. **Tipos de Archivo**:
   - Zona XML: Solo `.xml`
   - Zona PDF/Imagen: Solo `.pdf`, `.jpg`, `.jpeg`, `.png`

2. **Estado Visual**:
   - Zona morada (XML): Fondo purple-50
   - Zona azul (PDF): Fondo blue-50
   - Archivos cargados: Borde de color

3. **Botones**:
   - **"✕"**: Quitar archivo
   - **"Ver"**: Abrir en nueva pestaña (solo existentes)

---

## 📋 Próximos Pasos (Opcional)

### **Fase 1: Backend** (Requerido para funcionalidad completa)

**Modificar `handleFileUpload` para usar `documentProcessor`**:

```typescript
import { processDocuments } from '../../utils/documentProcessor';

const handleFileUpload = async (selectedFile: File) => {
  const files = [xmlFile, visualFile].filter(Boolean);
  
  const result = await processDocuments(eventId, files, (msg) => {
    setOcrProgress(msg);
  });
  
  // Auto-rellenar formulario
  setFormData(result.formData);
  
  // Guardar URLs de archivos
  // result.storedFiles.xmlUrl
  // result.storedFiles.visualUrl
};
```

### **Fase 2: Base de Datos**

**Agregar campos necesarios**:

```sql
ALTER TABLE evt_gastos ADD COLUMN IF NOT EXISTS 
  archivo_xml_url VARCHAR(500);

ALTER TABLE evt_gastos ADD COLUMN IF NOT EXISTS 
  carpeta_documentos VARCHAR(200);
```

---

## ✅ Estado Actual

**Frontend**:
- ✅ Interfaz dual implementada
- ✅ Dos zonas de subida separadas
- ✅ Detección por extensión
- ✅ Estados visuales claros
- ✅ Drag & drop funcional

**Pendiente**:
- ⏳ Conectar con `documentProcessor.ts`
- ⏳ Subir ambos archivos simultáneamente
- ⏳ Guardar en carpetas organizadas
- ⏳ Campos de BD (`archivo_xml_url`, `carpeta_documentos`)

---

## 🎉 Resumen

**La interfaz dual está lista visualmente.**

**Beneficios**:
- ✅ Usuario ve claramente dónde subir cada archivo
- ✅ Puede subir 1 o 2 archivos
- ✅ Colores diferenciados (morado=XML, azul=Visual)
- ✅ Mensajes informativos claros

**Para completar la funcionalidad**:
1. Conectar con `documentProcessor.ts` (backend ya existe)
2. Agregar campos en base de datos
3. Probar flujo completo

**Tiempo estimado para completar**: 1-2 horas

---

**¿Listo para probar la interfaz?**

Abre el proyecto (`npm run dev`) y ve a **Gastos** → **Nuevo Gasto**. ¡Deberías ver las dos zonas de color!
