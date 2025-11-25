# 🔧 Fix: Credenciales de Supabase Restauradas

## ❗ Problema Detectado

El archivo `.env` estaba **incompleto** - faltaba la `VITE_SUPABASE_SERVICE_ROLE_KEY`.

Cuando configuré Google Vision, solo incluí:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ❌ **FALTABA:** `VITE_SUPABASE_SERVICE_ROLE_KEY`

---

## ✅ Solución Aplicada

He agregado la credencial faltante al archivo `.env`:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔄 ACCIÓN REQUERIDA: Reiniciar Servidor

Vite **NO recarga automáticamente** las variables de entorno. Debes reiniciar manualmente:

### En la terminal donde corre `npm run dev`:

```bash
# 1. Detener el servidor:
Ctrl + C

# 2. Iniciar de nuevo:
npm run dev
```

---

## ✅ Verificar que Funciona

Después de reiniciar, deberías poder:

1. **Ver la base de datos** ✅
2. **Ver eventos** ✅
3. **Acceder a todas las funciones** ✅

---

## 📁 Estado del Archivo `.env`

### Antes (Incompleto):
```env
VITE_SUPABASE_URL="..."
VITE_SUPABASE_ANON_KEY="..."
# ❌ Faltaba SERVICE_ROLE_KEY
```

### Después (Completo):
```env
VITE_SUPABASE_URL="https://gomnouwackzvthpwyric.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJ..."
VITE_SUPABASE_SERVICE_ROLE_KEY="eyJ..."  ← AGREGADO
VITE_GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

---

## 🔐 Qué Hace Cada Credencial

| Credencial | Uso | Permisos |
|------------|-----|----------|
| **ANON_KEY** | Frontend público | Solo lectura básica + RLS |
| **SERVICE_ROLE_KEY** | Admin/desarrollo | Bypass RLS, acceso total |
| **GOOGLE_SERVICE_ACCOUNT** | OCR | Solo Cloud Vision API |

---

## 🚨 Si Aún No Funciona

### 1. Verifica que el servidor se reinició:
```bash
# Busca en la terminal:
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 2. Verifica las variables en el navegador:
```javascript
// En la consola del navegador (F12):
console.log(import.meta.env.VITE_SUPABASE_URL)
// Debe mostrar: "https://gomnouwackzvthpwyric.supabase.co"

console.log(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
// Debe mostrar: "eyJhbGciOiJIU..."
```

### 3. Si sigue sin funcionar:
```bash
# Limpiar cache y reinstalar:
rm -rf node_modules/.vite
npm run dev
```

---

## ✅ Resumen

- ❌ **Problema:** Faltaba `SERVICE_ROLE_KEY` en `.env`
- ✅ **Solución:** Agregada la credencial
- 🔄 **Acción:** Reiniciar servidor (`Ctrl+C` → `npm run dev`)
- 🎯 **Resultado:** Base de datos visible de nuevo

---

**🔄 Reinicia el servidor ahora para que tome efecto!**
