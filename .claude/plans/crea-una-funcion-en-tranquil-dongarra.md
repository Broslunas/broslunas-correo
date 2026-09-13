# Plan: Límites de Almacenamiento por Buzón y Explorador de Archivos R2 Estilo Google Drive

## Context
El usuario solicita ampliar la gestión de almacenamiento y límites para que aplique no sólo por usuario de acceso, sino también **por cuenta de correo/buzón** (`mailboxes`). Además, solicita poder visualizar todos los archivos almacenados en Cloudflare R2 con una experiencia visual estilo **Google Drive** (vista cuadrícula/tarjetas con miniaturas, selector de vista lista, búsqueda, filtros por tipo de archivo, metadatos del correo asociado y acciones de descarga/eliminación).

---

## Enfoque Recomendado

### 1. Gestión de Cuotas y Límites por Cuenta de Correo (`mailboxes`)
- **Extensión de modelo `mailboxes`**:
  - `storageLimitMB`: Límite en megabytes para el buzón (0 = ilimitado).
  - `dailySendLimit`: Límite de correos salientes diarios desde esa dirección (0 = ilimitado).
  - `status`: `'active' | 'suspended'` (permite deshabilitar envíos desde una cuenta específica).
- **Actualizar `src/app/api/admin/mailboxes/route.ts`**:
  - `GET`: Retornar `storageLimitMB`, `dailySendLimit`, `status`.
  - `POST`: Aceptar `storageLimitMB`, `dailySendLimit`, `status`.
  - `PATCH` (Nuevo): Modificar nombre, límites y estado del buzón.
- **Actualizar `src/app/api/admin/storage/route.ts`**:
  - Incorporar en el retorno la clave `mailboxes` con estadísticas por cuenta: correos asociados (`from` o `to`), adjuntos en R2, MB usados, % de cuota consumida y envíos de hoy vs límite diario.
- **Actualizar `src/app/api/send/route.ts`**:
  - Validar si el buzón remitente (`cleanFrom`) está suspendido (`403`).
  - Validar si el buzón remitente superó su límite de envíos diarios (`429`).
  - Validar si el buzón remitente superó su cuota de almacenamiento (`413`).

### 2. Explorador de Archivos R2 Estilo Google Drive (`admin-drive.tsx`)
- **Backend: `src/app/api/admin/files/route.ts` (Nuevo)**:
  - `GET`:
    - Lista objetos de Cloudflare R2 usando `ListObjectsV2Command` del SDK `@aws-sdk/client-s3`.
    - Realiza una consulta batch a MongoDB `emails` sobre `attachments.r2Url` para asociar cada objeto con el correo remitente, destinatario, asunto, fecha y nombre de archivo legible.
    - Si un archivo en R2 no tiene correo en DB, se clasifica como `isOrphan: true` ("Huérfano").
    - Admite búsqueda de texto, filtro por categoría (`image`, `document`, `spreadsheet`, `archive`, `media`, `other`, `orphan`), y ordenación por fecha o tamaño.
    - Paginación integrada (ej. 24 archivos por página).
  - `DELETE`:
    - Recibe array de claves `{ keys: string[] }`.
    - Elimina los objetos en R2 llamando a `deleteR2Objects`.
    - Actualiza MongoDB con `$pull` para remover esos adjuntos de los correos correspondientes.
- **Backend: `src/app/api/attachments/route.ts` (Ajuste)**:
  - Permitir `disposition: inline` cuando se solicite previsualización de PDF (`application/pdf`) o con parámetro `inline=true`.
- **Frontend: `src/components/admin-drive.tsx` (Nuevo Componente)**:
  - **Barra de control Google Drive**:
    - Conmutador de vista: **Cuadrícula** (Grid) con miniaturas vs **Lista** (Table detallada).
    - Buscador reactivo por nombre de archivo o asunto.
    - Filtros por tipo de archivo con badges: Todos, Imágenes, Documentos (PDF/Word), Planillas (Excel/CSV), Comprimidos (ZIP/RAR), Multimedia, y Huérfanos.
    - Selector desplegable para filtrar archivos por cuenta de correo específica.
    - Barra de estadísticas: total de archivos, total MB en R2, y cantidad de huérfanos detectados.
  - **Tarjetas en cuadrícula (Google Drive Cards)**:
    - Previsualización visual inmediata para imágenes (endpoint `/api/attachments?key=...&inline=true`).
    - Iconografía específica con color por tipo (PDF rojo, Excel verde, Word azul, ZIP naranja, genérico gris).
    - Nombre del archivo, tamaño formateado (KB/MB), fecha de creación y buzón origen.
    - Menú de acciones: Previsualizar (modal), Descargar, Eliminar.
  - **Modal de Previsualización**:
    - Renderiza imágenes a tamaño completo o PDFs en `iframe` integrado.
- **Frontend: `src/components/user-management.tsx` (Integración)**:
  - Añadir pestaña **"Archivos en R2 (Drive)"** (`activeTab === 'drive'`).
  - En pestaña **"Cuentas de Correo"**: formulario para fijar cuota y límite diario al registrar buzón, tabla con estado y botón para editar límites.
  - En pestaña **"Almacenamiento y Límites"**: agregar sección de tabla con cuotas y barras de progreso por cada buzón además de los usuarios.

---

## Archivos Críticos
1. `src/app/api/admin/files/route.ts` (Nuevo endpoint de listado y borrado de archivos R2 enriquecidos).
2. `src/components/admin-drive.tsx` (Nuevo componente UI estilo Google Drive).
3. `src/app/api/admin/mailboxes/route.ts` (Soporte GET, POST y PATCH de cuotas y estado por buzón).
4. `src/app/api/admin/storage/route.ts` (Métricas de uso y cuotas para buzones).
5. `src/app/api/send/route.ts` (Enforcement de cuotas y límites a nivel buzón remitente).
6. `src/components/user-management.tsx` (Pestaña Drive y controles de cuota por buzón).
7. `src/app/api/attachments/route.ts` (Soporte para previsualización inline de PDFs).

---

## Funciones y Utilidades Existentes a Reutilizar
- `s3Client` y `BUCKET_NAME` en `src/lib/r2.ts` para ejecutar `ListObjectsV2Command`.
- `deleteR2Objects` en `src/lib/r2.ts` para borrado por lotes en R2.
- `connectToDatabase` en `src/lib/db.ts` para consultas MongoDB.
- `verifyAdminSession` en endpoints admin para autenticación de cookies de sesión.

---

## Verificación y Pruebas
1. **Límites de Buzón**:
   - Asignar a un buzón cuota de 1 MB o límite de 1 envío/día vía `PATCH /api/admin/mailboxes`.
   - Probar envío desde esa cuenta y confirmar bloqueo HTTP 429 al exceder límite o 413 al exceder cuota.
   - Probar suspensión de buzón y confirmar HTTP 403.
2. **Explorador Drive**:
   - Consultar `/api/admin/files` y verificar listado de archivos con nombres legibles, tamaños y remitentes.
   - Navegar en la pestaña "Archivos en R2 (Drive)": alternar entre vista cuadrícula y lista.
   - Filtrar por categoría (ej. imágenes) y verificar que las miniaturas carguen correctamente.
   - Abrir previsualización de una imagen y de un PDF en modal.
   - Eliminar un archivo desde el Drive y verificar su remoción de R2 y del array `attachments` en MongoDB.
3. **TypeScript / Build**:
   - Ejecutar `npx tsc --noEmit` y suite de auto-verificación en `scripts/`.
