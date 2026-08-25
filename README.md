# 🏎️ PIT CREW: Telemetría Táctica de Salud y Pacing (V4.0 Master)
### Aplicación PWA para Disautonomía / POTS / Intolerancia Ortostática

Aplicación médica y de preservación de energía con identidad táctica de *"Equipo de Boxes de F1"*. Diseñada para personas con fatiga extrema, mareos ortostáticos y *brain fog*, con interacción táctil $\le 30$ segundos, áreas de toque $\ge 56\text{dp}$, cero sobrecarga cognitiva y funcionamiento 100% offline (local-first).

---

## 🌟 Características Principales

1. **Módulo 1: Calibración Basal de Chasis (Onboarding):**
   - Configuración inicial en 1 minuto de diagnóstico, metas de hidratación (2.5L - 3.5L), sodio/electrolitos, tratamiento y detonantes.
   - Red de apoyo dinámica (hasta 3 contactos de confianza para emergencias).
   - **100% local y privado:** Cero requerimiento de API Keys externas ni cuentas.

2. **Módulo 2: Ingesta Diaria Rápida:**
   - **Escáner Óptico On-Device:** Reconocimiento de capturas de pantalla de **Mi Fitness** y **EufyLife** mediante OCR local y expresiones regulares (extrae RHR, Sueño Profundo y Peso) sin enviar datos a la nube.
   - **Respaldo Manual:** 3 casillas numéricas rápidas siempre disponibles.
   - **Telemetría Climática y Barómetro:** Consulta a Open-Meteo vía GPS para presión atmosférica en hPa, temperatura y alertas preventivas de caídas barométricas bruscas ($\Delta \ge 3\text{ hPa}$).
   - **Tanque de Combustible (Hidratación Anti-Temblor):** Medidor de llenado visual, botones `+250ml`, `+500ml`, `⚡ Electrolitos`, botón `-250ml`, **Snackbar flotante de 4s con botón [DESHACER]** y ajuste táctil exacto tocando el contador.
   - **Batería Percibida:** Slider táctil del 1% al 100% con cambio reactivo de color y presets rápidos (25%, 50%, 75%, 100%).

3. **Módulo 3: Auditoría Táctica de Síntomas:**
   - Chips táctiles de 1 toque organizados en 3 sistemas:
     - ⚡ *Sistema Vascular y Respuesta Ortostática*
     - 🛡️ *Chasis, Dolor y Sobrecarga Sensorial*
     - 🧠 *Despliegue Operativo y Roles*

4. **Módulo 4: Motor de Decisiones (Semáforo F1 y Pacing):**
   - 🟢 **VERDE (Pista Libre):** Batería $>70\%$, biometría favorable. Ventana de alta demanda y foco.
   - 🟡 **AMARILLO (Safety Car):** Batería $40\% - 70\%$. Misiones Cinéticas a Ras de Suelo (elevación de piernas a 45°, movilidad horizontal, refuerzo salino).
   - 🔴 **ROJO (Modo Búnker):** Batería $<40\%$ o síntomas críticos. Emite el **Permiso Táctico Oficial de Reposo** (validación médica/psicológica sin culpas) y accesos directos a emergencias.

5. **Módulo 5: Sistema de Crisis y SOS Multi-Contacto:**
   - **Bengalas SOS WhatsApp:** Botones dedicados por contacto que obtienen la ubicación GPS (`https://maps.google.com/?q=lat,lng`), limpian el teléfono y abren WhatsApp directamente sin bloqueos de navegador.
   - **Escudo Médico Fullscreen:** Tarjeta de alto contraste en negro puro para transeúntes con instrucciones vitales (NO levantar, recostar con piernas a 45°, aflojar ropa, llamar a contactos) y alarma sonora táctica con Web Audio API.
   - **Generador de Fondo de Pantalla SOS:** Exportación en alta resolución (Canvas 1080x1920) a la galería del teléfono para usar como fondo de pantalla de bloqueo.

---

## 🚀 Despliegue Rápido en la Nube (HTTPS Gratuito)

Para probar la app como **PWA instalable en tu celular**, despliégala en cualquiera de estas opciones gratuitas:

### Opción 1: Vercel (Recomendada - 1 Clic)
1. Sube esta carpeta a un repositorio de **GitHub**.
2. Entra en [vercel.com](https://vercel.com) e inicia sesión con GitHub.
3. Haz clic en **"Add New Project"**, selecciona el repositorio y presiona **"Deploy"** (el archivo `vercel.json` ya está configurado).
4. Obtendrás tu enlace `https://tu-app.vercel.app`.

### Opción 2: Netlify (Drag & Drop en 30 Segundos)
1. Entra en [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastra y suelta la carpeta `app salud` en la ventana del navegador.
3. Netlify te entregará de inmediato una URL segura `https://...netlify.app`.

### Opción 3: GitHub Pages
1. Sube los archivos a una rama `main` en tu repositorio de GitHub.
2. En GitHub ve a **Settings > Pages > Branch: main > Save**.
3. Tu app estará disponible en `https://usuario.github.io/repositorio/`.

---

## 📱 Cómo Instalar como PWA en tu Celular

- **En Android (Chrome / Edge / Brave):**
  1. Abre el enlace `https://...` en Chrome.
  2. Toca el banner superior **"INSTALAR"** o ve al menú (tres puntos) > **"Instalar aplicación"** / **"Agregar a la pantalla principal"**.
- **En iPhone / iPad (Safari):**
  1. Abre el enlace `https://...` en Safari.
  2. Toca el botón **Compartir** (icono de cuadrado con flecha hacia arriba).
  3. Desliza hacia abajo y selecciona **"Agregar al inicio"** (*Add to Home Screen*).

---

## 🛠️ Estructura del Código

```
app salud/
├── index.html                   # Shell principal PWA y UI táctica
├── manifest.webmanifest         # Configuración PWA y metadatos de instalación
├── sw.js                        # Service Worker para funcionamiento 100% offline
├── vercel.json                  # Configuración de cabeceras y hosting Vercel
├── package.json                 # Configuración de scripts
├── css/
│   ├── main.css                 # Variables, dark mode puro, layout responsive
│   ├── components.css           # Tanque de combustible, chips, slider de batería
│   ├── f1-theme.css             # Semáforo F1, permiso de reposo, OCR styling
│   └── crisis.css               # Bengalas SOS, Escudo Médico, generador de fondo
├── js/
│   ├── app.js                   # Orquestador principal y router de vistas
│   ├── state.js                 # Store reactivo local-first (IndexedDB / LocalStorage)
│   ├── onboarding.js            # Calibración basal de chasis
│   ├── local-ocr.js             # Motor OCR on-device y regex parser (Mi Fitness/EufyLife)
│   ├── weather-telemetry.js     # Barómetro y alertas de caída de presión (Open-Meteo)
│   ├── hydration.js             # Tanque de combustible con Undo de 4s y anti-temblor
│   ├── symptoms.js              # Auditoría táctica con chips de 1 toque
│   ├── decision-engine.js       # Semáforo F1, misiones a ras de suelo y bunker mode
│   ├── emergency.js             # Bengalas SOS con GPS, Escudo Médico y Canvas Wallpaper
│   ├── history.js               # Logs históricos y exportación CSV/JSON
│   └── audio-synth.js           # Sintetizador Web Audio API para alarma médica
└── assets/
    └── f1-badge.svg             # Logo vectorial Pit Crew Telemetry
```
