# Plan de Implementación: Validación Automática de CFDI con SAT

## Resumen Ejecutivo
Integrar validación en tiempo real de facturas (CFDI) con el Web Service oficial del SAT para verificar que las facturas ingresadas en gastos estén vigentes antes de guardarlas.

---

## 1. Arquitectura (Backend-For-Frontend)

```
┌─────────────────┐     JSON      ┌─────────────────┐     SOAP      ┌──────────────┐
│    FRONTEND     │ ───────────► │    BACKEND      │ ───────────► │     SAT      │
│  (React/Vite)   │ ◄─────────── │  (Node/Express) │ ◄─────────── │  Web Service │
│                 │     JSON      │  Puerto 3001    │     XML      │              │
└─────────────────┘               └─────────────────┘               └──────────────┘
```

**¿Por qué Backend?**
- CORS: El SAT no permite llamadas desde navegadores
- Seguridad: No exponer credenciales
- SOAP: Requiere construcción de envelope XML

---

## 2. Componentes a Crear/Modificar

### 2.1 Backend (Nuevo)

| Archivo | Descripción |
|---------|-------------|
| `server/services/satService.js` | Servicio para consultar SAT vía SOAP |
| `server/ocr-api.js` | Agregar endpoint `/api/sat/validar-cfdi` |

### 2.2 Frontend (Nuevo)

| Archivo | Descripción |
|---------|-------------|
| `src/services/satValidationService.ts` | Cliente HTTP para el backend SAT |
| `src/modules/eventos-erp/hooks/useSATValidation.ts` | Hook React para usar la validación |

### 2.3 Frontend (Modificar)

| Archivo | Ubicación | Cambio |
|---------|-----------|--------|
| `ExpenseForm.tsx` | `/src/modules/eventos-erp/components/finances/` | Validar SAT después de parsear XML |
| `SimpleExpenseForm.tsx` | `/src/modules/eventos-erp/components/finances/` | Agregar validación SAT |
| `GastoFormModal.tsx` | `/src/modules/contabilidad-erp/components/` | Agregar validación SAT |

---

## 3. Especificaciones Técnicas

### 3.1 Endpoint SAT (Web Service)
```
URL: https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc
SOAPAction: http://tempuri.org/IConsultaCFDIService/Consulta
```

### 3.2 SOAP Envelope (Request)
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:Consulta>
         <tem:expresionImpresa>
            <![CDATA[?re={RFC_EMISOR}&rr={RFC_RECEPTOR}&tt={TOTAL}&id={UUID}]]>
         </tem:expresionImpresa>
      </tem:Consulta>
   </soapenv:Body>
</soapenv:Envelope>
```

### 3.3 Respuesta Esperada
| Campo | Descripción |
|-------|-------------|
| `Estado` | "Vigente" / "Cancelado" / "No Encontrado" |
| `CodigoEstatus` | "S - Comprobante obtenido satisfactoriamente" |
| `EsCancelable` | "Cancelable con aceptación" / "Cancelable sin aceptación" |
| `EstatusCancelacion` | null / "En proceso" / "Cancelado" |

---

## 4. Flujo de Usuario

```
1. Usuario sube XML CFDI
         ↓
2. Frontend parsea XML (cfdiXmlParser.ts)
   → Extrae: UUID, RFC Emisor, RFC Receptor, Total
         ↓
3. Frontend llama: POST /api/sat/validar-cfdi
   → Body: { rfcEmisor, rfcReceptor, total, uuid }
         ↓
4. Backend construye SOAP y consulta SAT
         ↓
5. Backend retorna estado JSON
         ↓
6. Frontend muestra resultado:
   ✅ VIGENTE (verde) → Permite guardar
   ❌ CANCELADO (rojo) → Bloquea guardado
   ⚠️ NO ENCONTRADO (amarillo) → Advertencia, permite guardar
```

---

## 5. Tareas de Implementación

### Fase 1: Backend SAT Service (Prioridad Alta)
1. [ ] Crear `server/services/satService.js`
   - Función `consultarSAT(rfcEmisor, rfcReceptor, total, uuid)`
   - Construir SOAP envelope manualmente
   - Usar `axios` para POST HTTPS
   - Parsear XML respuesta con `xml2js`

2. [ ] Agregar endpoint en `server/ocr-api.js`
   - `POST /api/sat/validar-cfdi`
   - Recibir JSON, llamar servicio, retornar resultado

3. [ ] Crear script de prueba `scripts/test_sat_run.mjs`
   - Prueba standalone con datos hardcodeados
   - Verificar conectividad con SAT

### Fase 2: Frontend Service (Prioridad Alta)
4. [ ] Crear `src/services/satValidationService.ts`
   - Función `validarCFDI(data)`
   - Manejo de errores de red
   - Tipos TypeScript

5. [ ] Crear hook `src/modules/eventos-erp/hooks/useSATValidation.ts`
   - Estado: loading, result, error
   - Cache para evitar consultas duplicadas

### Fase 3: Integración en Formularios (Prioridad Media)
6. [ ] Modificar `ExpenseForm.tsx`
   - Llamar validación después de `processXMLCFDI()`
   - Mostrar badge de estado SAT
   - Bloquear submit si cancelado

7. [ ] Modificar `SimpleExpenseForm.tsx`
   - Misma integración que ExpenseForm

8. [ ] Modificar `GastoFormModal.tsx`
   - Misma integración para gastos no impactados

### Fase 4: UI/UX
9. [ ] Crear componente `SATStatusBadge.tsx`
   - Verde: Vigente
   - Rojo: Cancelado
   - Amarillo: No encontrado
   - Gris: Sin validar

10. [ ] Agregar indicador de carga durante validación

---

## 6. Dependencias a Instalar

```bash
# En server/
npm install axios xml2js

# Ya instaladas globalmente:
# - express (OK)
# - cors (OK)
# - dotenv (OK)
```

---

## 7. Variables de Entorno

No se requieren nuevas variables de entorno. El SAT es un servicio público sin autenticación.

---

## 8. Consideraciones

### Manejo de Errores
- Timeout de 10 segundos para llamadas al SAT
- Si SAT no responde, permitir guardar con advertencia
- Log de errores para debugging

### Rate Limiting
- El SAT puede tener límites de consultas
- Implementar cache de 5 minutos por UUID
- No consultar el mismo UUID dos veces

### Formato de Total
- El SAT requiere formato específico: `1234.56`
- Asegurar que 100 se envíe como "100.00"
- Mantener exactamente 2 decimales

---

## 9. Archivos Finales

```
server/
├── ocr-api.js               (modificado: agregar endpoint)
├── services/
│   ├── dailyReportService.js
│   └── satService.js        (NUEVO)

scripts/
└── test_sat_run.mjs         (NUEVO)

src/
├── services/
│   └── satValidationService.ts (NUEVO)
├── modules/
│   ├── eventos-erp/
│   │   ├── components/
│   │   │   ├── finances/
│   │   │   │   ├── ExpenseForm.tsx    (modificado)
│   │   │   │   └── SimpleExpenseForm.tsx (modificado)
│   │   │   └── ui/
│   │   │       └── SATStatusBadge.tsx (NUEVO)
│   │   └── hooks/
│   │       └── useSATValidation.ts    (NUEVO)
│   └── contabilidad-erp/
│       └── components/
│           └── GastoFormModal.tsx     (modificado)
```

---

## 10. Tiempo Estimado

| Fase | Tarea | Complejidad |
|------|-------|-------------|
| 1 | Backend SAT Service | Media |
| 2 | Frontend Service + Hook | Baja |
| 3 | Integración en 3 formularios | Media |
| 4 | UI/UX Badge | Baja |
| - | Testing y ajustes | Baja |

---

## ¿Aprobar este plan?

Una vez aprobado, procederé con la implementación en el orden indicado, comenzando por el Backend SAT Service.
