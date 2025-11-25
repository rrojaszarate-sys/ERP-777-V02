# 🎯 SISTEMA HÍBRIDO DE CARGA DE DOCUMENTOS

## 📋 Resumen Ejecutivo

Sistema inteligente que permite al usuario subir:
- ✅ **Solo XML** → Extracción perfecta (100% precisión)
- ✅ **Solo PDF/Imagen** → OCR tradicional
- ✅ **XML + PDF** → Datos del XML + archivo visual de respaldo

---

## 🎨 Interfaz de Usuario (Nueva Propuesta)

### Wireframe Visual

```
┌───────────────────────────────────────────────────────────────┐
│  🆕 Nuevo Gasto - Subir Comprobantes                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  📄 FACTURA ELECTRÓNICA (XML CFDI)                     ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                         ┃  │
│  ┃  📎 Arrastra aquí el archivo XML o                    ┃  │
│  ┃  [Seleccionar XML CFDI...]                            ┃  │
│  ┃                                                         ┃  │
│  ┃  ✅ factura_samsung.xml (7.2 KB)                       ┃  │
│  ┃     Folio: H47823 | Total: $764.24                    ┃  │
│  ┃     [Ver Preview] [Quitar]                            ┃  │
│  ┃                                                         ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                               │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  📷 ARCHIVO VISUAL (PDF o Imagen) - Opcional          ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                         ┃  │
│  ┃  📎 Arrastra aquí el PDF/Imagen o                     ┃  │
│  ┃  [Seleccionar PDF/Imagen...]                          ┃  │
│  ┃                                                         ┃  │
│  ┃  📄 factura_samsung.pdf (156 KB)                       ┃  │
│  ┃     [Ver Preview] [Quitar]                            ┃  │
│  ┃                                                         ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                               │
│  💡 Sugerencias:                                              │
│  • Facturas: Sube XML + PDF (datos precisos + visual)       │
│  • Tickets: Solo PDF o Imagen (usará OCR automático)        │
│  • XML solo: Datos perfectos sin archivo visual             │
│                                                               │
│  [Procesar y Continuar]  [Cancelar]                          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujos de Usuario

### **Flujo 1: Solo XML (Factura sin PDF)**

```
1. Usuario arrastra: factura.xml
   ↓
2. Sistema detecta XML
   ↓
3. Muestra preview rápido:
   "Folio: H47823 | Total: $764.24 | Emisor: SAMSUNG"
   ↓
4. Usuario click "Procesar"
   ↓
5. Sistema:
   - Parsea XML completo
   - Extrae TODOS los datos
   - Sube XML a: gastos/EVT-001/H47823/factura.xml
   - Auto-rellena formulario
   ↓
6. Usuario revisa y guarda
   ✅ Tiempo: ~2 segundos
```

---

### **Flujo 2: XML + PDF (Factura completa) - RECOMENDADO**

```
1. Usuario arrastra:
   - factura.xml
   - factura.pdf
   ↓
2. Sistema detecta ambos
   ↓
3. Muestra preview de ambos:
   "📄 XML: H47823 | $764.24"
   "📷 PDF: 156 KB"
   ↓
4. Usuario click "Procesar"
   ↓
5. Sistema:
   - Parsea XML (datos)
   - Sube AMBOS archivos a: gastos/EVT-001/H47823/
     ├─ factura.xml
     └─ factura.pdf
   - Auto-rellena formulario
   - Guarda URLs de ambos archivos
   ↓
6. Usuario revisa y guarda
   ✅ Tiempo: ~3 segundos
   ✅ Tiene: Datos + Visual
```

---

### **Flujo 3: Solo PDF/Imagen (Ticket)**

```
1. Usuario arrastra: ticket.jpg
   ↓
2. Sistema detecta imagen (no XML)
   ↓
3. Muestra preview de imagen
   ↓
4. Usuario click "Procesar"
   ↓
5. Sistema:
   - Procesa con OCR (Google Vision)
   - Extrae datos (~85-95% precisión)
   - Sube a: gastos/EVT-001/TEMP_timestamp/ticket.jpg
   - Auto-rellena formulario
   ↓
6. Usuario corrige si es necesario y guarda
   ✅ Tiempo: ~5 segundos
```

---

## 📁 Estructura de Almacenamiento

### Organización por Folio/UUID

```
event_docs/
└── gastos/
    └── EVT-2025-001/
        ├── H47823/                    ← Folio de factura
        │   ├── factura_samsung.xml
        │   └── factura_samsung.pdf
        │
        ├── A12345/                    ← Otro folio
        │   ├── factura_office.xml
        │   └── factura_office.pdf
        │
        └── TEMP_1729000000/           ← Ticket sin folio
            └── ticket_gasolina.jpg
```

**Ventajas**:
✅ Organizado por documento
✅ Fácil de auditar
✅ Ambos archivos juntos
✅ Búsqueda por folio

---

## 🎯 Base de Datos (Campos Necesarios)

### Tabla: `evt_gastos`

```sql
-- Campos existentes que usaremos:
archivo_adjunto VARCHAR     -- URL del archivo visual (PDF/IMG)

-- Campos NUEVOS a agregar:
archivo_xml_url VARCHAR     -- URL del XML CFDI
carpeta_documentos VARCHAR  -- Path de la carpeta (ej: gastos/EVT-001/H47823)
tiene_xml BOOLEAN          -- TRUE si se subió XML
tiene_visual BOOLEAN       -- TRUE si se subió PDF/imagen
modo_captura VARCHAR       -- 'xml', 'ocr', 'hybrid'
```

---

## 🔧 Implementación Técnica

### 1. **Componente de Doble Subida**

```typescript
// Estado
const [xmlFile, setXmlFile] = useState<File | null>(null);
const [visualFile, setVisualFile] = useState<File | null>(null);
const [xmlPreview, setXmlPreview] = useState<any>(null);

// Manejar subida de XML
const handleXMLUpload = async (file: File) => {
  setXmlFile(file);
  
  // Obtener preview rápido
  const quickInfo = await getXMLQuickInfo(file);
  setXmlPreview(quickInfo);
};

// Manejar subida de Visual
const handleVisualUpload = (file: File) => {
  setVisualFile(file);
};

// Procesar ambos archivos
const handleProcess = async () => {
  const files = [xmlFile, visualFile].filter(Boolean) as File[];
  
  const result = await processDocuments(eventId, files, (msg) => {
    setProgress(msg);
  });
  
  // Auto-rellenar formulario
  setFormData(result.formData);
};
```

---

### 2. **Procesamiento Inteligente**

Ya implementado en `documentProcessor.ts`:

```typescript
// Detecta automáticamente el modo
const mode = determineProcessingMode([xml, pdf]);

// Procesa según lo detectado
if (xml) {
  // Extrae del XML (100% precisión)
}

if (pdf && !xml) {
  // Usa OCR
}

// Sube AMBOS archivos si existen
// Organiza en carpeta por folio
```

---

## 📊 Comparativa de Experiencias

| Aspecto | Subida Simple | Subida Dual (Propuesta) |
|---------|---------------|-------------------------|
| **Archivos** | 1 solo | 1 o 2 |
| **Precisión Factura** | OCR ~85% | XML 100% ✅ |
| **Archivo Visual** | Solo si es PDF/IMG | Siempre disponible ✅ |
| **Organización** | Archivo suelto | Carpeta por folio ✅ |
| **Auditoría** | Difícil | Fácil ✅ |
| **Flexibilidad** | Baja | Alta ✅ |
| **Complejidad UX** | Simple | Media |

---

## 🎨 Variantes de Interfaz

### **Opción A: Dos Zonas Separadas (RECOMENDADA)**
```
[Zona XML]
[Zona PDF/Imagen]
[Botón Procesar]
```
**Pros**: Clara, intuitiva, flexible
**Contras**: Más espacio vertical

### **Opción B: Una Zona con Toggle**
```
[Toggle: Factura / Ticket]
↓
Si Factura → Mostrar zona XML + zona PDF
Si Ticket → Mostrar solo zona imagen
```
**Pros**: Adaptativa, menos espacio
**Contras**: Un click extra

### **Opción C: Zona Única Inteligente**
```
[Arrastra archivo(s) aquí]
↓
Sistema detecta automáticamente
```
**Pros**: Ultra simple
**Contras**: Menos control del usuario

---

## ✅ Recomendación Final

### **Implementar Opción A con estas características:**

1. **Dos zonas de subida**:
   - Zona 1: XML CFDI (factura)
   - Zona 2: PDF/Imagen (visual)

2. **Ambas opcionales** pero con lógica:
   - Si sube XML → Extrae datos de XML
   - Si sube XML + PDF → Datos de XML + archivo visual
   - Si sube solo PDF/Imagen → OCR tradicional

3. **Preview inteligente**:
   - XML: Mostrar folio, total, emisor
   - PDF: Mostrar miniatura
   - Imagen: Mostrar preview

4. **Almacenamiento organizado**:
   - Carpeta por folio/UUID
   - Ambos archivos juntos
   - Fácil auditoría

5. **Base de datos**:
   - `archivo_xml_url`: URL del XML
   - `archivo_adjunto`: URL del PDF/imagen
   - `carpeta_documentos`: Path de carpeta
   - `modo_captura`: 'xml', 'ocr', 'hybrid'

---

## 🚀 Ventajas del Sistema Híbrido

**Para Usuario**:
- ✅ Máxima flexibilidad (1 o 2 archivos)
- ✅ Datos perfectos con XML
- ✅ Archivo visual siempre disponible
- ✅ Funciona con tickets (OCR)

**Para Negocio**:
- ✅ 100% cumplimiento SAT (XML)
- ✅ Auditoría fácil (carpetas organizadas)
- ✅ Respaldo visual (PDF)
- ✅ Compatible con tickets sin XML

**Para Desarrollo**:
- ✅ Sistema ya creado (`documentProcessor.ts`)
- ✅ Compatible con código existente
- ✅ Escalable y mantenible

---

## 📝 Siguiente Paso

¿Quieres que implemente la interfaz de doble subida en `DualOCRExpenseForm.tsx`?

Incluiría:
- Dos zonas de drag & drop
- Preview de archivos
- Procesamiento híbrido
- Almacenamiento organizado
