# 🚀 PLAN DE IMPLEMENTACIÓN: UNIFICAR FORMULARIOS DE GASTOS

## 📋 OBJETIVO
Crear un formulario único de gastos que:
1. ✅ Funcione para Eventos Y Gastos No Impactados
2. ✅ Tenga detección automática de XML CFDI
3. ✅ Valide facturas con SAT
4. ✅ Soporte OCR para tickets
5. ✅ Maneje 4 tipos de documentos
6. ✅ Incluya campo Responsable

---

## 📎 DOCUMENTOS SOPORTADOS

| Documento | Formato | Para | Obligatorio |
|-----------|---------|------|-------------|
| **Factura PDF** | PDF | Facturas | ✅ Si factura |
| **Factura XML** | XML CFDI | Facturas | ✅ Si factura |
| **Ticket** | JPG/PNG | Tickets | ✅ Si ticket |
| **Comprobante Pago** | PDF/JPG | Ambos | ✅ Siempre |

---

## 🔧 FUNCIONALIDADES A IMPLEMENTAR

### 1. Parseo XML CFDI (100% precisión)
- Extraer: Emisor, Receptor, UUID, Montos, Fecha
- Usar: `parseCFDIXml()` de `cfdiXmlParser.ts`

### 2. Validación SAT
- Verificar que factura sea VIGENTE
- Bloquear si está CANCELADA
- Advertir si NO ENCONTRADA
- Usar: `useSATValidation()` hook

### 3. Validación QR vs XML
- Comparar QR del PDF con datos del XML
- Asegurar que coinciden
- Usar: `validarQRvsXML()` service

### 4. OCR para Tickets
- Extraer datos de imagen de ticket
- Usar: `processFileWithOCR()` de `dualOCRService.ts`

---

## 📁 ARCHIVOS A MODIFICAR/CREAR

### FASE 1: Crear Componente Unificado
```
src/shared/components/gastos/
├── UnifiedExpenseForm.tsx      # Formulario unificado
├── DocumentUploader.tsx        # Subida de 4 tipos de docs
├── CFDIProcessor.tsx           # Procesamiento XML
└── types.ts                    # Tipos compartidos
```

### FASE 2: Migrar Módulos
```
# Eventos
src/modules/eventos-erp/components/finances/
└── ExpenseForm.tsx → Usar UnifiedExpenseForm

# Gastos No Impactados  
src/modules/contabilidad-erp/components/
└── GastoFormModal.tsx → Usar UnifiedExpenseForm
```

### FASE 3: Base de Datos
```sql
ALTER TABLE evt_gastos_erp ADD COLUMN comprobante_pago_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN factura_pdf_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN factura_xml_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN ticket_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN responsable_id UUID;
ALTER TABLE evt_gastos_erp ADD COLUMN estado VARCHAR(20) DEFAULT 'provision';
```

---

## ⏱️ ORDEN DE EJECUCIÓN

1. **Agregar columnas a BD** (5 min)
2. **Crear UnifiedExpenseForm** basado en GastoFormModal (30 min)
3. **Agregar DocumentUploader** con 4 tipos de docs (20 min)
4. **Integrar en EventoDetailModal** (15 min)
5. **Probar flujos** (10 min)

---

## ✅ PRÓXIMO PASO

¿Procedo a ejecutar la FASE 1 (agregar columnas a BD)?
