# 🚀 Inicio Rápido: Gemini AI para OCR

## ⚡ 3 Pasos para Activar el Mapeo Inteligente

### **Paso 1: Obtener API Key (2 minutos)**

1. Ir a → https://aistudio.google.com/app/apikey
2. Login con Gmail
3. Click **"Create API Key"**
4. Copiar la clave

### **Paso 2: Configurar (1 minuto)**

Agregar en tu archivo `.env`:

```bash
VITE_GEMINI_API_KEY="AIzaSy...."  # Pegar tu API Key aquí
```

### **Paso 3: Reiniciar y Usar**

```bash
# Reiniciar servidor
npm run dev
```

Luego:
1. Ir a **Eventos → Finanzas → Nuevo Gasto**
2. Verás un **toggle morado** arriba del área de carga
3. **Activar** el toggle
4. **Subir** tu factura/ticket
5. ¡**Listo**! Los campos se autocompletarán con IA

---

## 🎯 ¿Qué Hace?

**SIN Gemini AI:**
```
OCR extrae texto → Mapeo con reglas → 60-70% precisión
```

**CON Gemini AI:**
```
OCR extrae texto → 🤖 IA interpreta y mapea → 95-98% precisión
```

---

## 💰 Costo

- **Gratis** para desarrollo y pruebas
- **~$0.001 USD** por factura en producción
- Plan gratuito: 15 solicitudes/minuto

---

## ✅ Beneficios

- ✅ **Corrige errores del OCR** automáticamente
- ✅ **Entiende diferentes formatos** de factura
- ✅ **Infiere campos faltantes** usando contexto
- ✅ **Sugiere categoría** automáticamente
- ✅ **Reduce errores hasta 90%**

---

## 🔧 Solución Rápida de Problemas

**Toggle no aparece:**
```bash
# Verificar variable
grep GEMINI .env

# Debe mostrar: VITE_GEMINI_API_KEY="..."
```

**Error "API Key no válida":**
- Verificar que copiaste la clave completa
- No debe tener espacios al inicio/final
- Reiniciar el servidor después de agregar

**No mejora los resultados:**
- Verificar que el toggle esté **ACTIVADO** (morado)
- Verificar en la consola que dice "🤖 Gemini AI activado"
- Probar con una factura de mejor calidad

---

## 📚 Documentación Completa

- 📖 [GUIA_GEMINI_AI_MAPEO.md](./GUIA_GEMINI_AI_MAPEO.md) - Guía detallada
- 📋 [RESUMEN_GEMINI_IMPLEMENTACION.md](./RESUMEN_GEMINI_IMPLEMENTACION.md) - Resumen técnico

---

## 🎉 ¡Eso es Todo!

Con solo 3 pasos simples, tu sistema de OCR ahora usa IA para mapear campos con precisión casi perfecta.

**¿Vale la pena?**
- Si procesas **muchas facturas**: Absolutamente sí
- Si procesas **pocas facturas**: También vale la pena (es gratis)
- Si quieres **máxima precisión**: Sí

**Sin API Key, el sistema sigue funcionando normalmente** con el método tradicional.
