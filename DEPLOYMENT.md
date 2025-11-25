# 🚀 Guía de Despliegue - MADE ERP 77

## Opción 1: Vercel (Recomendado)

### Pasos para desplegar en Vercel:

1. **Instalar Vercel CLI** (opcional):
   ```bash
   npm install -g vercel
   ```

2. **Desplegar desde la web** (Más fácil):
   - Ve a [vercel.com](https://vercel.com)
   - Click en "Add New" → "Project"
   - Importa tu repositorio: `rrojaszarate-sys/MADE-ERP-77`
   - Selecciona el branch: `ingresos-bien`
   - Vercel detectará automáticamente que es un proyecto Vite
   - Configura las variables de entorno:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_GOOGLE_VISION_API_KEY`
   - Click en "Deploy"

3. **Desplegar desde CLI**:
   ```bash
   cd /home/rodrichrz/proyectos/Made-Erp-777-ok/MADE-ERP-77
   vercel login
   vercel --prod
   ```

### Variables de entorno en Vercel:
- Copia los valores de tu archivo `.env` local
- Agrégalos en: Project Settings → Environment Variables

---

## Opción 2: Netlify

1. Ve a [netlify.com](https://netlify.com)
2. Click en "Add new site" → "Import an existing project"
3. Conecta tu repositorio de GitHub
4. Configuración:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Base directory**: (dejar vacío)
5. Agrega las variables de entorno en Site Settings → Environment Variables
6. Deploy

---

## Opción 3: GitHub Pages (Solo frontend estático)

⚠️ **Nota**: GitHub Pages NO soporta variables de entorno, por lo que tendrías que hardcodear las URLs (NO RECOMENDADO para producción).

```bash
# Agregar al package.json:
"homepage": "https://rrojaszarate-sys.github.io/MADE-ERP-77",
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"

# Instalar gh-pages
npm install --save-dev gh-pages

# Desplegar
npm run deploy
```

---

## Opción 4: Railway (Con backend)

1. Ve a [railway.app](https://railway.app)
2. Click en "New Project" → "Deploy from GitHub repo"
3. Selecciona tu repositorio
4. Railway detectará automáticamente el proyecto
5. Agrega las variables de entorno
6. Deploy automático en cada push

---

## 📊 Comparación de opciones:

| Servicio | Gratuito | SSL | CI/CD | Variables ENV | Recomendado |
|----------|----------|-----|-------|---------------|-------------|
| Vercel   | ✅       | ✅  | ✅    | ✅            | ⭐⭐⭐⭐⭐  |
| Netlify  | ✅       | ✅  | ✅    | ✅            | ⭐⭐⭐⭐    |
| Railway  | ✅*      | ✅  | ✅    | ✅            | ⭐⭐⭐     |
| GitHub Pages | ✅   | ✅  | ✅    | ❌            | ⭐⭐       |

*Railway: 5 USD de crédito gratis mensual

---

## 🔒 Seguridad

**IMPORTANTE**: Nunca subas tu archivo `.env` a GitHub. Ya está en `.gitignore`.

Las variables de entorno deben configurarse en:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables  
- Railway: Variables tab

---

## ✅ Verificación después del despliegue

1. Verifica que la URL funcione
2. Prueba el login
3. Verifica la conexión a Supabase
4. Prueba las funcionalidades principales
5. Revisa la consola del navegador en busca de errores

---

## 🆘 Problemas comunes

### Error: "Failed to load module"
- Solución: Verifica que `base` en `vite.config.ts` sea `'/'`

### Error: "404 on page refresh"
- Solución: Ya configurado en `vercel.json` con rewrites

### Error: "Environment variables undefined"
- Solución: Verifica que agregaste las variables con prefijo `VITE_`

---

## 📝 Próximos pasos

1. Desplegar en Vercel (recomendado)
2. Configurar dominio personalizado (opcional)
3. Configurar monitoreo de errores
4. Configurar analytics
