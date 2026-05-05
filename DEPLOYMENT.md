# Despliegue en Render (Gratis)

## Paso 1: Preparar el repositorio

El código ya está listo. Solo necesitas hacer push a GitHub:

```bash
git add .
git commit -m "Setup backend para YouTube audio analysis"
git push origin main
```

## Paso 2: Desplegar en Render

1. Ve a https://render.com (crea cuenta gratis)
2. Conecta tu repositorio de GitHub
3. Crea un nuevo **Web Service**:
   - **Repository**: Tu repositorio
   - **Branch**: main
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
   - **Environment**: Node 18

4. Render desplegará automáticamente
5. Tu URL será algo como: `https://tusolo-backend.onrender.com`

## Paso 3: Actualizar la app

En `src/routes/app.analyze.tsx`, cambia:

```typescript
const API_URL = "https://tusolo-backend.onrender.com";
```

Reemplaza con la URL que te dé Render.

## Cómo funciona

1. Usuario pega URL de YouTube en la app (web/mobile)
2. Frontend envía URL al backend en Render
3. Backend descarga audio con yt-dlp
4. Backend convierte a base64 y lo envía
5. Frontend decodifica y analiza en el navegador
6. Se muestran las tablaturas de guitarra, bajo y piano

## Notas

- **Gratis**: Render ofrece 750 horas/mes (suficiente para uso normal)
- **Limite**: Videos muy largos pueden tardar (yt-dlp es lento)
- **Dependencias**: yt-dlp se instala automáticamente en Render
- **Almacenamiento**: Los audios se borran cuando la app se reinicia

## Desarrollo local

Para probar en local:

```bash
npm run server
```

En otra terminal:

```bash
npm run dev
```

Luego ve a http://localhost:5173
