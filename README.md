# TuSolo - Extractor de Solos de Música

Aplicación web para extraer y visualizar tablasturas de guitarra, bajo y piano a partir de archivos de audio o video.

## Características

- 🎵 **Análisis de audio en tiempo real** - Detecta notas de solos usando análisis de pitch
- 🎸 **Múltiples instrumentos** - Guitarra (6 cuerdas), bajo (4 cuerdas) y notación de piano
- 📊 **Visualización clara** - Tablasturas en formato estándar fácil de leer
- ⏱️ **Sincronización con reproducción** - Las notas se muestran conforme avanza la canción
- 📋 **Estadísticas por minuto** - Tabla con notas detectadas agrupadas por minuto
- 💾 **Descargar resultados** - Exporta las tablasturas en formato texto (.txt)

## Stack Tecnológico

- **Frontend**: React 19 + TanStack Router
- **Análisis de Audio**: Web Audio API + Autocorrelación para detección de pitch
- **Estilos**: Tailwind CSS v4
- **UI Components**: Radix UI (Button)
- **Iconos**: Lucide React

## Cómo Usar

1. Carga un archivo de audio (MP3, WAV, FLAC, M4A, OGG) o video (MP4, WebM, Ogg)
2. La aplicación analiza automáticamente las notas del solo
3. Visualiza las tablasturas en tiempo real mientras se reproduce
4. Descarga las tablaturas en formato texto

## Instalación

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Algoritmo de Detección

Utiliza autocorrelación para detectar la frecuencia fundamental de las notas:
- Análisis de frames de 2048 muestras
- Confianza mínima del 60% para incluir notas
- Agrupación de notas cercanas (0.2s) para evitar saturación
- Conversión de frecuencia a MIDI y notas musicales

## Formato de Tablatura

### Guitarra (6 cuerdas)
```
e|--0--2--3--
B|--0--2--3--
G|--1--3--4--
D|--2--3--5--
A|--3--4--5--
E|--3--4--5--
```

### Bajo (4 cuerdas)
```
G|--5--7--9--
D|--3--5--7--
A|--1--3--5--
E|--0--2--4--
```

Los números representan los trastes donde se toca cada nota en cada cuerda.

## Licencia

MIT
