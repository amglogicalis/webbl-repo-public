<p align="center">
  <img src="logo_webbl.png" alt="WEBBL Logo" width="220" />
</p>

<h1 align="center">WEBBL — Terra Ecosystem Hosting & CDN Engine</h1>

<p align="center">
  <strong>Infraestructura de Despliegue de Sitios Estáticos, SPAs y Serverless Morphs basada 100% en GitHub a Coste $0</strong>
</p>

<p align="center">
  <a href="#-visión-y-filosofía">Visión</a> •
  <a href="#-los-3-pilares-de-webbl">Los 3 Pilares</a> •
  <a href="#-instalación-y-cli">CLI & Uso</a> •
  <a href="#-consola-web">Consola Web</a> •
  <a href="#-integración-con-el-ecosistema-terra">Ecosistema Terra</a> •
  <a href="#-licencia">Licencia MIT</a>
</p>

---

## 🌐 Visión y Filosofía

**WEBBL** es el titán de despliegue frontend y CDN global del **Ecosistema Terra**. Proporciona una alternativa autónoma, gratuita y de código abierto a plataformas de hosting tradicionales como Vercel o Netlify.

Su premisa inquebrantable es: **Coste económico de infraestructura cero ($0) y libertad total del desarrollador**.

Aprovecha el **GitHub Engine** para compilar, alojar y distribuir sitios web, Single Page Applications (SPAs) y funciones serverless efímeras directamente desde tus repositorios de GitHub.

---

## 🏛️ Los 3 Pilares de WEBBL

WEBBL está diseñado en torno a 3 conceptos fundamentales:

```
WEBBL
├── 🐛 Cocoons     → Deploy de sitios estáticos & SPAs sobre GitHub Pages.
│                    Preview por rama/PR. Rollback instantáneo. Custom domains.
│
├── 🦋 Morphs      → Serverless Functions en 3 modalidades:
│                    • Async Morphs (~30s, formularios y webhooks)
│                    • Build Morphs (0ms, ejecutados durante la compilación)
│                    • Hatch Morphs (Live Workers efímeros de larga duración en Node.js)
│
└── 🫧 Chrysalis   → Inteligencia de compilación. Detección automática de 14+ frameworks,
                     Lighthouse scores, optimización de assets y build incremental.
```

### 1. 🐛 Cocoons (Static Hosting & CDNs)
- Despliegue automático de proyectos compilados (Vite, React, Next.js estático, Astro, SvelteKit, etc.) hacia la rama `gh-pages`.
- Soporte para vista previa en ramas (`preview deployments`).
- Historial de versiones y **rollback instantáneo** utilizando GitHub Releases en tu propio repositorio sin depender de servicios de terceros.

### 2. 🦋 Morphs (Serverless Functions)
- **Runtime Async Morphs**: Manejo asíncrono de formularios y webhooks mediante eventos dispatch.
- **Build Morphs**: Inyección de datos de APIs externas durante el tiempo de build (0ms de latencia en cliente).
- **Hatch Morphs**: Ejecución de microservicios efímeros Node.js completos (con hasta 7GB de RAM y CPU completa) bajo demanda sobre GitHub Actions runners.

### 3. 🫧 Chrysalis (Build Intelligence)
- Autodetección nativa de más de 14 frameworks populares: **Vite, React, Next.js, Astro, Nuxt, Gatsby, Docusaurus, VitePress, SvelteKit, Eleventy, Hugo, Jekyll, Plain HTML**.
- Ejecución limpia de comandos de compilación y empaquetado de assets.

---

## 🛠️ Instalación y Uso de CLI

### Instalación / Ejecución con `npx`
No requiere instalación global. Puedes ejecutar WEBBL directamente:

```bash
npx webbl <comando>
```

### 🚀 Comandos Principales

#### 1. Inicializar un Proyecto
```bash
npx webbl init
```
Detecta automáticamente el framework usado por Chrysalis y crea el archivo de configuración `webbl.config.json`.

#### 2. Desplegar un Cocoon
```bash
npx webbl deploy
```
Compila y publica el sitio actual. Puedes incluir notas de versión:
```bash
npx webbl deploy -m "Actualización del layout principal"
```

#### 3. Autodetectar Framework
```bash
npx webbl detect
```

#### 4. Listar Sitios Desplegados (Cocoons)
```bash
npx webbl ls
```

#### 5. Historial de Despliegues, Rollback y Gestión de Versiones
Ver historial de versiones:
```bash
npx webbl history usuario/mi-proyecto
```

Restaurar una versión previa (ejecuta un Rollback inmutable re-apuntando la rama `gh-pages` y creando una release de respaldo `v1.0.0-rb-1`):
```bash
npx webbl rollback usuario/mi-proyecto webbl-v1722288000000
```

Renombrar la etiqueta de una versión en el historial:
```bash
npx webbl release rename usuario/mi-proyecto v1.0.0 v1.0.0-prod
```

Eliminar una versión específica del historial:
```bash
npx webbl release delete usuario/mi-proyecto v1.0.0
```

#### 6. Eliminar un Cocoon o Repositorio
Eliminar el despliegue web (`gh-pages`):
```bash
npx webbl delete usuario/mi-proyecto
```

Eliminar el repositorio completo de GitHub permanentemente:
```bash
npx webbl delete usuario/mi-proyecto --repo
```

#### 7. Abrir en Navegador
```bash
npx webbl open
```

---

## 🎛️ Consola Web (UI Dashboard)

WEBBL incluye una interfaz web nativa basada en la estética **Dark Banana Glass** para gestionar todos tus despliegues visualmente.

Para iniciar la consola en local:
```bash
npx webbl console
```

Abre automáticamente `http://localhost:3721` con un dashboard moderno:
- **Deploy & Redeploy**: Arrastra o selecciona archivos estáticos (`.html`, `.css`, `.js`, etc.) con pre-visualización y **botón `X` de descarte individual de archivos**.
- **Version Tags Personalizadas**: Elige la etiqueta de versión (ej. `v1.0.0`, `v2-beta`) o deja que se autogenere.
- **Historial e Indicador Activo Real (`Active`)**: Identifica con precisión la versión que está en vivo en ese instante comparando el commit SHA del HEAD de la rama `gh-pages`.
- **Renombrado y Borrado de Versiones Modal**: Cambia etiquetas o elimina Releases del historial mediante modales Dark Banana Glass sin necesidad de refrescar páginas.
- **Rollbacks con Estado de Progreso en Vivo**: El botón de confirmación permanece bloqueado en estado de carga (*Building GitHub Pages...*) hasta que GitHub confirme que la compilación terminó.
- **Eliminación Permanente de Repositorios**: Borra repositorios completos directamente desde la web con confirmación de seguridad.

---

## ❓ Troubleshooting & Preguntas Frecuentes (FAQ)

### ⚠️ 1. El estado en la Consola Web aparece como "Live" (🟢) o "Building" (🟡) pero los cambios aún no se ven en la web pública. ¿Qué ocurre?

**Explicación**:
El indicador visual en la Consola Web consulta el estado reportado por la API de GitHub Pages (`GET /repos/{owner}/{repo}/pages`). Sin embargo, en ocasiones (aproximadamente 1 de cada 7 despliegues), los servidores de GitHub tardan unos segundos adicionales en sincronizar el estado global o propagar la caché de la CDN.

**Recomendación**:
Ten paciencia. El indicador de la Consola Web es una **guía visual orientativa**. 
El **verdadero progreso en tiempo real y la fuente absoluta de verdad** es hacer clic en el botón **`Repo`** (o ingresar a tu repositorio en GitHub) y revisar la pestaña **Actions** sobre la rama `gh-pages`. Allí verás la ejecución exacta paso a paso del runner de GitHub.

### ❓ 2. El comando `deploy` o la Consola Web me devuelve `404 Not Found` o `Branch gh-pages not found`.

- Asegúrate de que tu GitHub Personal Access Token (PAT) tenga los permisos (scopes) mínimos necesarios:
  - `repo` (Full control of private and public repositories)
  - `workflow` (Update GitHub Action workflows)
  - `delete_repo` (Si deseas eliminar repositorios enteros)
- WEBBL crea automáticamente la rama `gh-pages` y configura el motor estático en `build_type: "legacy"`. Si el repositorio es nuevo, espera 2 o 3 segundos para que la API de GitHub termine de registrar el commit inicial.

### ❓ 3. ¿Por qué al hacer Rollback se crea una Release con el nombre `v1.0.0-rb-1`?

Al hacer un Rollback a una versión antigua (ejemplo `v1.0.0`), WEBBL crea una nueva Release de respaldo etiquetada como `v1.0.0-rb-1` para dejar un **registro inmutable de auditoría**. Esto garantiza que nunca pierdas el historial de despliegues y puedas auditar en qué momento exacto se realizó cada restauración.

---

## 💻 SDK para Node.js / TypeScript (`@terra/webbl`)

También puedes controlar WEBBL de forma programática en tus scripts o herramientas:

```typescript
import { Webbl } from '@terra/webbl';

const webbl = new Webbl({
  githubToken: process.env.GITHUB_TOKEN!
});

// Desplegar un Cocoon
const result = await webbl.deploy({
  repo: 'mi-usuario/mi-sitio',
  message: 'Deploy programático'
});

// Rollback a una versión previa
await webbl.rollback('mi-usuario/mi-sitio', 'v1.0.0');

// Renombrar una release
await webbl.renameRelease('mi-usuario/mi-sitio', 'webbl-v1785370361934', 'v1.0.0');

console.log(`Sitio en vivo en: ${result.url}`);
```

---

## 🔗 Integración con el Ecosistema Terra

WEBBL opera de forma totalmente autosuficiente, pero se integra sinérgicamente con otros titanes del ecosistema:

- **🔐 Lumina**: Autenticación para paneles de control web.
- **🛡️ Synchlor**: Almacenamiento seguro de secretos y tokens.
- **⏰ Syncada**: Despliegues automáticos programados (Rebuilds diarios).
- **🐜 Formica**: Emisión de eventos al completar despliegues.
- **🎭 Ballom**: Enrutamiento DNS y dominios personalizados.

---

## 📜 Licencia

Distribuido bajo la **Licencia MIT**. Consulta [`LICENSE`](LICENSE) para más información.

<p align="center">
  <sub>Desarrollado bajo la filosofía Terra • Nube Serverless a Coste $0</sub>
</p>
