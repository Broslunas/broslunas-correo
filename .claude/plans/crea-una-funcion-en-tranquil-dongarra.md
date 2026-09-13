# Plan de Implementación: Gestión de Correos, Almacenamiento y Límites para Administradores

## Context
El sistema de correo actual carece de visibilidad y control sobre el almacenamiento (MongoDB para correos y Cloudflare R2 para adjuntos) y cuotas por usuario. Actualmente cualquier usuario autorizado puede enviar sin límite diario ni control de cuota de disco, y los administradores no tienen herramientas para auditar tamaños de buzón ni ejecutar purgas administrativas (ej. vaciar spam o papelera acumulada). Este cambio agrega gestión de cuotas, métricas de almacenamiento, purga de correos y recomendaciones de administración.

---

## Enfoque Recomendado

### 1. Modelo de Datos y Cuotas de Usuario
Extender los campos del usuario en MongoDB (colección `users`):
- `storageLimitMB`: límite en megabytes (0 o null = ilimitado).
- `dailySendLimit`: límite de correos salientes diarios (0 o null = ilimitado).
- `status`: `'active' | 'suspended'` (permite suspensión preventiva inmediata).

### 2. Backend API
- **`src/app/api/admin/storage/route.ts` (Nuevo)**:
  - `GET`: Estadísticas agregadas globales y por usuario.
    - Global: Total de emails, bytes en MongoDB (`$bsonSize`), bytes en adjuntos R2 (suma de `attachments.size` persistidos en `emails`).
    - Desglose por usuario/buzón: Correos asociados a sus `assignedAddresses` y tamaño acumulado.
- **`src/app/api/admin/users/route.ts` (Modificar)**:
  - Extender `GET` para incluir `storageLimitMB`, `dailySendLimit`, `status`.
  - Extender `PATCH` para permitir actualizar estos límites y estado por usuario.
- **`src/app/api/admin/emails/route.ts` (Nuevo)**:
  - `GET`: Búsqueda administrativa de correos con filtros (`folder`, `olderThanDays`, `hasAttachments`, `mailbox`, `search`).
  - `DELETE`: Purga masiva controlada. Soporta purga de carpetas (`spam`/`trash`) mayores a N días. Elimina adjuntos en Cloudflare R2 y documentos en MongoDB.
- **`src/app/api/send/route.ts` (Modificar)**:
  - Enforcement al enviar:
    1. Bloqueo si `user.status === 'suspended'`.
    2. Conteo de envíos en el día (`folder: 'sent'`, `date >= startOfDay`) frente a `dailySendLimit`.
    3. Validación de cuota de almacenamiento si `storageLimitMB` está configurado.
- **`src/lib/r2.ts` (Modificar)**:
  - Añadir helper `deleteR2Objects(keys: string[])` usando `DeleteObjectsCommand` de `@aws-sdk/client-s3`.

### 3. Frontend: Panel de Administración
- **`src/components/user-management.tsx` (Modificar)**:
  - Nueva pestaña `'storage'` ("Almacenamiento y Límites"):
    - **KPIs globales**: Almacenamiento DB usado, almacenamiento R2 usado, conteo total de correos y conteo en papelera/spam.
    - **Tabla de usuarios con cuotas**: Correo, cuota asignada, barra de progreso de almacenamiento usado, límite diario de envíos, estado (Activo/Suspendido), botón para editar cuotas.
    - **Modal para configurar cuotas y límites por usuario**.
    - **Sección de Purga y Mantenimiento**: Botón de acción rápida para vaciar Spam y Papelera con más de 30 días, informando correos afectados y espacio estimado a liberar.

---

## Archivos Críticos
1. `src/components/user-management.tsx` (Nueva pestaña UI, KPIs, tabla de cuotas, modal de límites y panel de purga).
2. `src/app/api/admin/storage/route.ts` (Endpoint GET de métricas de almacenamiento y cálculo de uso por usuario).
3. `src/app/api/admin/emails/route.ts` (Endpoint GET de búsqueda admin y DELETE para purgas masivas con limpieza en R2).
4. `src/app/api/admin/users/route.ts` (Actualización de cuotas y estado en GET y PATCH).
5. `src/app/api/send/route.ts` (Enforcement de límites diarios, suspensión y cuota de almacenamiento).
6. `src/lib/r2.ts` (Helper para eliminación por lotes de objetos en Cloudflare R2).

---

## Funciones y Utilidades Existentes a Reutilizar
- `connectToDatabase` en `src/lib/db.ts` para consultas MongoDB.
- `verifyAdminSession` en `src/app/api/admin/users/route.ts` (o extraer a helper compartido) para proteger rutas admin.
- `s3Client` y `BUCKET_NAME` en `src/lib/r2.ts` para interacción con Cloudflare R2.
- `cn` en `src/lib/utils.ts` para estilos condicionales Tailwind.

---

## Verificación y Pruebas
1. **Prueba de API de Almacenamiento**:
   - Llamar a `/api/admin/storage` como admin y verificar retorno de bytes y conteos globales y por usuario.
2. **Prueba de Configuración de Límites**:
   - Enviar PATCH a `/api/admin/users` asignando `storageLimitMB: 50` y `dailySendLimit: 5`.
   - Verificar persistencia en MongoDB y reflejo en la UI.
3. **Prueba de Enforcement**:
   - Intentar enviar un correo superando `dailySendLimit` y comprobar respuesta HTTP 429 con mensaje explicativo.
   - Probar envío con usuario suspendido y comprobar respuesta HTTP 403.
4. **Prueba de Purga**:
   - Ejecutar purga de spam/papelera vía `/api/admin/emails` y verificar que los correos se eliminen de MongoDB y sus adjuntos se borren de R2 sin dejar huérfanos.
5. **Prueba de UI**:
   - Navegar a `/admin`, abrir pestaña "Almacenamiento y Límites", editar cuotas y verificar actualización reactiva.
