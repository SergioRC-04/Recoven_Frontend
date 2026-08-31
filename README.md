# ♻️ RECOVEN ECA SAS ESP — Plataforma Integral de Gestión Ambiental y Atención al Usuario

Plataforma web completa para la **Empresa de Servicios Públicos (ECA SAS ESP)** enfocada en economía circular, gestión sostenible de residuos y atención al ciudadano. El sistema integra una landing page institucional con mapa de cobertura territorial, un módulo público de PQRSDF, y un panel de administración robusto con autenticación multifactor, planificación de rutas de recolección sobre mapa, censo de recicladores de oficio y generación de reportes oficiales (SUI, GIS y certificados).

🌐 **Landing Page:** [recovenesp.com](https://recovenesp.com)

---

## 📸 Vista Previa del Proyecto

[![Vista previa de RECOVEN](https://github.com/SergioRC-04/Recoven_Frontend/raw/main/public/assets/image.png)](/SergioRC-04/Recoven_Frontend/blob/main/public/assets/image.png)

---

## 🎯 Visión General y Objetivos

Esta plataforma ha sido diseñada para cumplir con los más altos estándares del sector de servicios públicos en Colombia, ofreciendo:

- **Identidad corporativa rigurosa** que transmite confianza, transparencia y compromiso ambiental.
- **Experiencia de usuario fluida y moderna**, accesible tanto para ciudadanos como para personal administrativo.
- **Cumplimiento normativo** con las leyes 142 de 1994, 1581 de 2012, 1755 de 2015, la Resolución 2184 de 2019 y el formato oficial de reporte de microrrutas de la SSPD (Resolución SSPD 20174000237705).
- **Gestión integral de PQRSDF** (Peticiones, Quejas, Reclamos, Sugerencias, Denuncias y Felicitaciones) alineada con los tiempos de respuesta establecidos por la ley.
- **Planificación territorial de rutas de recolección** sobre un mapa interactivo, con ajuste automático a la malla vial, y su correspondiente visualización pública de cobertura.
- **Censo y seguimiento de recicladores de oficio**, con clasificación, asignación de barrios/rutas, y documentación de respaldo (certificados de vinculación).

---

## 🛠️ Tecnologías y Herramientas

### Frontend

| Tecnología                     | Uso                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **React 18**                   | Biblioteca principal para la construcción de interfaces de usuario                                                                     |
| **TypeScript**                 | Tipado estático y mejor mantenibilidad del código                                                                                      |
| **React Router v6**            | Enrutamiento SPA con rutas protegidas y navegación declarativa                                                                         |
| **Tailwind CSS**               | Sistema de diseño responsivo y utilidades CSS                                                                                          |
| **react-icons**                | Iconografía consistente con Font Awesome y Lucide                                                                                      |
| **Chart.js / react-chartjs-2** | Visualización de métricas operacionales                                                                                                |
| **Swiper**                     | Carruseles interactivos y responsivos                                                                                                  |
| **date-fns**                   | Manipulación y formateo de fechas                                                                                                      |
| **OpenLayers (`ol`)**          | Mapas interactivos: trazado de microrrutas, snap a malla vial, capas de localidades/barrios/rutas, selección de features               |
| **jsPDF**                      | Generación de reportes PDF de microrrutas en el navegador (mapa + ficha de datos), incluyendo lotes de varias rutas en un solo archivo |

### Backend y Servicios

| Tecnología                      | Uso                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **NestJS** (Backend)            | API RESTful para gestión de leads, métricas, certificados, autenticación, PQRSDF, microrrutas, recicladores y territorio |
| **PostgreSQL + PostGIS** (Neon) | Persistencia y cálculos espaciales (intersecciones, longitudes de ruta, ubicación geográfica)                            |
| **Prisma**                      | ORM y consultas raw parametrizadas para las operaciones espaciales                                                       |
| **Supabase**                    | Almacenamiento de archivos adjuntos (documentos, certificados)                                                           |
| **Resend**                      | Envío transaccional de correo (certificados a empresas, códigos 2FA, alertas de error)                                   |
| **ExcelJS**                     | Generación de reportes Excel (formato oficial SUI de microrrutas, listados de recicladores con formato condicional)      |
| **PDFKit**                      | Generación de certificados de vinculación de recicladores en PDF                                                         |
| **JWT**                         | Autenticación con expiración de sesión                                                                                   |
| **2FA**                         | Segundo factor de autenticación por correo electrónico                                                                   |

### Infraestructura

- **Vite** como entorno de desarrollo y empaquetado.
- **Hostinger** para hosting y DNS del dominio, con reglas de reescritura (`.htaccess`) para el enrutamiento del lado del cliente (ver [Despliegue](#-despliegue)).
- **ESLint + Prettier** para calidad y formato del código.

---

## 🗂️ Estructura del Proyecto

```
src/
├── components/
│   ├── admin/                    # Componentes del panel de administración
│   │   ├── LeadsTable.tsx
│   │   ├── MetricsManager.tsx
│   │   ├── DocumentsManager.tsx
│   │   ├── PqrsdfTable.tsx
│   │   ├── PqrsdfDetailModal.tsx
│   │   ├── AdminMicrorrutas.tsx        # Orquestador del módulo de microrrutas
│   │   ├── MicrorrutaMapEditor.tsx     # Mapa interactivo: trazado, snap, edición de geometría, selección
│   │   ├── MicrorrutaFormModal.tsx     # Formulario con campos condicionales según el tipo SUI
│   │   ├── MicrorrutasTable.tsx        # Tabla con selección sincronizada al mapa
│   │   ├── FieldHelp.tsx               # Tooltips de ayuda por campo
│   │   ├── ExportarCapasModal.tsx      # Exportación GeoJSON/Shapefile para QGIS/ArcGIS
│   │   ├── AdminRecyclers.tsx          # Orquestador del módulo de recicladores
│   │   ├── RecyclersTable.tsx
│   │   ├── RecyclerFormModal.tsx
│   │   └── ExportarRecyclersModal.tsx  # Exportación Excel por estado (censados, con ruta, etc.)
│   ├── layout/                   # Componentes estructurales
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── WhatsAppButton.tsx
│   ├── public/                   # Componentes de la interfaz pública
│   │   ├── ClientsCarousel.tsx
│   │   ├── ContactForm.tsx
│   │   ├── CTASection.tsx
│   │   ├── HeroCarouselServices.tsx
│   │   ├── StatisticsSection.tsx
│   │   ├── PqrsdfForm.tsx
│   │   ├── PqrsdfStatusChecker.tsx
│   │   ├── PrivacyPolicyModal.tsx
│   │   └── MapaServicios.tsx     # Mapa de cobertura territorial: localidades/barrios/microrrutas
│   └── ProtectedRoute.tsx        # Envoltura para rutas autenticadas
├── context/
│   ├── AuthContext.tsx           # Estado global de autenticación
│   └── PreselectContext.tsx      # Estado para preselección de servicios
├── hooks/
│   ├── useAuth.ts
│   └── useServicePreselect.ts
├── lib/                          # Utilidades del lado del cliente (no son llamadas a la API)
│   ├── microrrutaReportePdf.ts   # Generación de reportes PDF de microrrutas (mapa + ficha SUI)
│   ├── exportarCapas.ts          # Disparo de descargas GeoJSON/Shapefile generadas por el backend
│   └── descargarBlob.ts          # Helper compartido para descargar un Blob como archivo
├── pages/
│   ├── Home.tsx
│   ├── Empresa.tsx
│   ├── Servicios.tsx
│   ├── Login.tsx
│   ├── Dashboard.tsx             # Layout fijo con sesión y cuenta regresiva real (lee el exp del JWT)
│   └── PqrsdfPage.tsx
├── services/
│   ├── api.ts                    # Cliente HTTP con manejo de sesión
│   ├── auth.ts                   # Autenticación (login, 2FA, logout)
│   ├── leads.ts                  # Gestión de leads (público y admin)
│   ├── metrics.ts                # Métricas operacionales
│   ├── customers.ts              # Gestión de empresas/clientes
│   ├── certificates.ts           # Certificados a empresas y documentación
│   ├── pqrsdf.ts                 # PQRSDF (radicación, consulta, administración)
│   ├── geo.ts                    # Localidades, barrios y vías (con y sin filtro/reproyección)
│   ├── microrutas.ts             # CRUD de microrrutas + exportaciones (Excel SUI, GeoJSON/SHP, ubicación geométrica)
│   └── recyclers.ts              # CRUD de recicladores, censo, certificados, exportaciones
├── types/
│   ├── auth.ts
│   ├── lead.ts
│   ├── metric.ts
│   ├── customer.ts
│   ├── certificate.ts            # Incluye estado (PENDIENTE/ENVIADO/FALLIDO) y detalle de error
│   ├── pqrsdf.ts
│   ├── geo.ts                    # Tipos GeoJSON genéricos + Localidad/Barrio/Vía
│   ├── microrruta.ts             # Catálogos SUI (tipos, días, estación de transferencia, etc.)
│   └── recycler.ts               # Clasificación, estado de vinculación, barrios/rutas asignadas
├── constants/
│   └── navigation.ts
├── App.tsx
└── main.tsx
```

---

## 🚀 Características Principales

### 🏠 Landing Page Pública

- **Hero interactivo** con llamado a la acción para servicios residenciales e industriales.
- **Sección "Nuestra Empresa"** con misión, visión y certificaciones.
- **Tipos de servicio** con tarjetas que preseleccionan el formulario de contacto.
- **Carrusel de clientes** con arrastre suave y loop infinito (drag & swipe nativo).
- **Formulario de contacto** con preselección de servicio y especialidad mediante contexto global.
- **Estadísticas operacionales** con gráficas dinámicas (Chart.js) y descarga de reportes en PDF.
- **Mapa de Cobertura y Operación** (`MapaServicios`): mapa interactivo con las localidades y barrios atendidos, y las microrrutas de recolección activas. Filtro por localidad/barrio, encuadre automático hacia donde efectivamente operan las rutas al cargar, grosor de línea que se adapta al zoom, y una lista lateral (nombre, días de paso, distancia) sincronizada con el mapa: seleccionar una ruta en cualquiera de los dos la resalta en el otro.
- **Sección de PQRSDF** con:
  - Marco legal (Leyes 142, 1755, 1581).
  - Formulario de radicación con carga de archivos adjuntos (FormData).
  - Consultor de estado con visualización de respuestas y descarga de documentos oficiales.
  - Política de privacidad en modal con contenido legal actualizado.

### 🔐 Panel de Administración

- **Autenticación de dos factores (2FA)** con envío de código por correo y cooldown de 60 segundos para reenvío.
- **Sesión con expiración real y visible**: el layout del dashboard es fijo (no se ve afectado por el largo del contenido de cada módulo) y muestra una cuenta regresiva hasta el cierre automático de sesión, leída directamente del `exp` del JWT — no un temporizador aparte que se pueda desincronizar del backend.
- **Dashboard** con navegación lateral y seis módulos:

#### 1. Solicitudes (Leads)

- Visualización de leads registrados desde la landing page.
- Exportación a Excel con un clic.

#### 2. Actualizar Gráficas (Métricas)

- CRUD completo de métricas mensuales por sede (Barranquilla y Puerto Colombia).
- Filtro por año, edición y eliminación de registros.
- Actualización en tiempo real de las gráficas públicas.

#### 3. Envío de Certificados

- Gestión de empresas/clientes (creación, edición, eliminación).
- Carga de certificados (Word o PDF) con envío automático por correo al cliente, con verificación por código QR.
- **Cada intento queda registrado desde el principio** (estado `PENDIENTE` → `ENVIADO`/`FALLIDO`), no solo cuando termina con éxito — si algo falla en la subida o el envío, queda un registro con el detalle del error y se notifica automáticamente al equipo de desarrollo por correo.
- Retroalimentación visual en tiempo real durante el envío (banners de "enviando" / "éxito" / "error" con el detalle real, en vez de alertas genéricas del navegador).
- Historial de certificados despachados con badge de estado por color y vista previa del correo enviado (incluyendo el bloque de verificación QR).

#### 4. PQRSDF

- Tabla de auditoría con filtros por estado.
- Modal de gestión que permite:
  - Cambiar estado (Recibido, En trámite, Resuelto, Rechazado).
  - Redactar respuesta oficial.
  - Adjuntar documento de respuesta (PDF/imagen).
  - Notificación automática al usuario por correo.
- Visualización de archivos adjuntos del usuario y documentos de respuesta.

#### 5. Microrrutas

- **Mapa interactivo** (OpenLayers) para trazar nuevas rutas de recolección con ajuste automático (_snap_) a la malla vial, filtrando por localidad/barrio.
- **Edición de geometría** de rutas existentes mediante retrazado (la geometría original nunca se toca hasta guardar — cancelar no deja nada a medias).
- **Selección sincronizada**: hacer clic en una ruta en el mapa la resalta y desplaza la tabla hasta su fila (y viceversa, clic en la tabla resalta la ruta en el mapa).
- **Formulario con reglas del SUI**: campos condicionales según el tipo de microrruta (horarios/direcciones, distancias viales, tipo de barrido), cálculo automático de distancia pavimentada a partir del trazo dibujado.
- **Reportes**:
  - PDF con mapa de contexto (barrio, malla vial, localizador) por ruta individual o en lote (todas las visibles con el filtro activo, en un solo archivo).
  - Excel en el formato oficial de reporte de microrrutas de la SSPD.
  - Exportación GeoJSON/Shapefile (EPSG:9377) de barrios, localidades, vías y microrrutas para abrir en QGIS/ArcGIS.
- El barrio y la localidad de cada ruta, tanto en pantalla como en los reportes, se calculan geométricamente (intersección espacial, no un dato asignado a mano) contra dónde realmente pasa el trazo.

#### 6. Recicladores

- **Censo y clasificación** (Nuevo, Regular, A quitar) de recicladores de oficio, con asignación de barrios y microrrutas.
- **Certificado de vinculación en PDF** (dos copias por hoja, para recortar) descargable desde cada fila de la tabla, o automáticamente ofrecido al terminar de registrar un trabajador nuevo.
- **Exportación a Excel** por estado (todos los activos, desvinculados, censados, sin censar, con ruta, sin ruta), con formato condicional de color (mismos tonos que usa Excel para verdadero/falso) en censo, asignación de ruta y clasificación.
- Historial de desvinculación/reactivación, con fecha de eliminación visible en el reporte correspondiente.

---

## ⚡ Decisiones Técnicas y Optimización

### 1. **Manejo de Autenticación y Sesión**

- **JWT** almacenado en `localStorage`, con expiración configurada en el backend.
- El dashboard decodifica el `exp` del propio token (sin verificarlo — no requiere la clave secreta) para mostrar una cuenta regresiva real y disparar el cierre de sesión exactamente cuando corresponde.
- **Rutas protegidas** con `ProtectedRoute` que redirige al login si no hay token válido.

### 2. **Manejo de Archivos (FormData)**

- Tanto la radicación de PQRSDF como la respuesta del administrador usan `FormData` para enviar archivos adjuntos.
- El backend (NestJS) procesa los archivos y los sube a Supabase, retornando las URLs públicas.
- En la UI, se muestran enlaces de descarga tanto en la consulta pública como en el panel de administración.

### 3. **Generación de documentos: en el backend, salvo cuando el mapa es parte del documento**

- Los reportes puramente tabulares (Excel SUI de microrrutas, Excel de recicladores, certificados PDF) se generan en el backend (ExcelJS/PDFKit): ya tiene acceso directo a los datos vía PostGIS, y evita enviar dependencias pesadas al navegador.
- El reporte PDF de microrrutas es la excepción deliberada: como necesita renderizar el mismo mapa interactivo (OpenLayers) que ya vive en el navegador, se genera del lado del cliente (captura del canvas del mapa + composición con `jsPDF`), evitando duplicar un motor de renderizado geoespacial en el servidor.
- Las exportaciones GeoJSON/Shapefile para QGIS sí se resolvieron en el backend: la base de datos ya guarda las geometrías nativamente en la proyección oficial colombiana (EPSG:9377), así que no hace falta reproyectar nada del lado del cliente.

### 4. **Estado explícito para operaciones que pueden fallar a medias**

- El envío de certificados registra el intento (`PENDIENTE`) _antes_ de subir el archivo o mandar el correo, no después — así una falla a mitad de camino nunca deja de tener rastro en la base de datos, y el equipo de desarrollo recibe una notificación automática con el detalle del error.

### 5. **Preselección de Servicios con Contexto**

- El contexto `PreselectContext` permite guardar el tipo de servicio seleccionado desde el Hero, las tarjetas de servicios o el carrusel de la página de Servicios.
- Al navegar al formulario de contacto, el campo "Tipo de servicio" se preselecciona automáticamente.

### 6. **Scroll a Elementos con Hash**

- El componente `ScrollToHash` escucha cambios en la URL y hace scroll suave a los elementos con `id` (ej: `#contacto`, `#tipos-servicio`) sin recargar la página.

### 7. **Animaciones y Rendimiento**

- Animaciones `reveal` con `IntersectionObserver` para una carga progresiva.
- Carrusel de clientes con `requestAnimationFrame` y manipulación de `transform` para un rendimiento óptimo (INP < 10ms, CLS 0.05).

---

## 🔧 Instalación y Uso

### Requisitos previos

- Node.js v18 o superior
- npm o yarn

---

## 📦 Despliegue

El proyecto está configurado para despliegue en **Hostinger**.

⚠️ **Importante para SPA con React Router**: Hostinger sirve el contenido como archivos estáticos, así que recargar la página (o entrar directo) en una ruta distinta a la raíz (`/empresa`, `/servicios`, `/dashboard`, etc.) devuelve 404 si no se configura una regla de reescritura. Es necesario un archivo `.htaccess` en `public/` (para que Vite lo copie a cada build) con:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 📄 Licencia y Propiedad Intelectual

Este repositorio es **público exclusivamente con fines de portafolio profesional y demostración técnica**.

El código fuente, diseño, arquitectura y componentes visuales pertenecen a **RECOVEN ECA ESP** y al desarrollador autor. **No se otorga ninguna licencia de uso, copia, modificación o distribución comercial o privada.** Para más detalles sobre las restricciones legales y términos de propiedad, por favor consulta el archivo [LICENSE](https://github.com/SergioRC-04/Recoven_Frontend/blob/main/LICENSE) adjunto en la raíz de este proyecto. Cualquier réplica no autorizada será notificada y procesada legalmente.

---

## 🤝 Contribuciones

Este proyecto es propiedad de RECOVEN ECA ESP. No se aceptan contribuciones externas sin autorización previa por escrito.
