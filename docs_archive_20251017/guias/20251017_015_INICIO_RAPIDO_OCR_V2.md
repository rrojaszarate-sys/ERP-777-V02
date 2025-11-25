# ⚡ INICIO RÁPIDO - OCR V2 con Google Vision

## 🚀 En 5 Minutos

### 1. Instalar Dependencias Backend (1 min)

```bash
cd server
npm install
```

### 2. Configurar Google Vision (2 min)

Edita `.env` y agrega tus credenciales:

```bash
VITE_GOOGLE_VISION_CREDENTIALS='{"type":"service_account","project_id":"tu-proyecto","private_key":"...","client_email":"..."}'
OCR_API_PORT=3001
VITE_OCR_API_URL=http://localhost:3001
```

### 3. Iniciar Backend (30 seg)

```bash
# Desde /server
npm start
```

Espera a ver:
```
🚀 API OCR con Google Vision - ACTIVA
Google Vision: ✅ CONFIGURADO
```

### 4. Iniciar Frontend (30 seg)

Nueva terminal:
```bash
# Desde raíz del proyecto
npm run dev
```

### 5. Probar (1 min)

1. Ve a cualquier evento → Finanzas → Nuevo Gasto
2. Clic en **"Extraer datos automáticamente (OCR)"**
3. Sube tu imagen `ocr.jpg`
4. ¡Listo! Los campos se llenarán automáticamente

---

## 🔍 Verificación Rápida

### ¿Backend funcionando?

```bash
curl http://localhost:3001/health
```

Debe retornar:
```json
{"status":"ok","google_vision":"configured"}
```

### ¿Google Vision configurado?

En los logs del backend debes ver:
```
✅ Google Vision inicializado con credenciales de .env
```

---

## ❌ Problemas Comunes

### "Backend no disponible"
→ El servidor no está corriendo. Ejecuta `cd server && npm start`

### "Google Vision no configurado"
→ Falta agregar credenciales al `.env`. Lee la sección 2

### OCR muy lento (>15s)
→ Está usando Tesseract fallback. Verifica que el backend esté corriendo

---

## 📖 Documentación Completa

Para más detalles, lee: [OCR_V2_GUIA_COMPLETA.md](./OCR_V2_GUIA_COMPLETA.md)

---

## ✅ Checklist

- [ ] `npm install` en `/server` ejecutado
- [ ] Credenciales en `.env` configuradas
- [ ] Backend corriendo (puerto 3001)
- [ ] Frontend corriendo (puerto 5173)
- [ ] Probado con 1 ticket
- [ ] Campos se autocompletaron

## 🎉 ¡Listo para usar!
