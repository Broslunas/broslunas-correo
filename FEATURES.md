## 📬 1. Operaciones Principales de Correo (Core Email)
[x] 1. **Redactor de texto enriquecido (WYSIWYG)**: Soporte para formato de texto (negrita, cursiva, listas, enlaces) e inserción de imágenes en línea.
[x] 2. **Gestión de archivos adjuntos**: Carga de archivos por arrastrar y soltar (drag-and-drop) con límites configurables y previsualización de imágenes/PDFs.
3. **Búsqueda indexada y avanzada**: Filtrado instantáneo por remitente, destinatario, fecha, palabras clave, etiquetas y presencia de adjuntos.
[x] 4. **Borradores automáticos (Auto-save)**: Guardado en tiempo real en segundo plano del correo en redacción para evitar pérdidas por desconexión.
[x] 5. **Carpetas estándar**: Separación por defecto en Bandeja de entrada, Enviados, Borradores, Spam, Papelera y Archivo.
6. **Paginación e Infinite Scroll**: Carga rápida y eficiente de listados de correos mediante scroll infinito inteligente o paginación ágil.
7. **Responder, Responder a todos y Reenviar**: Flujos estándar de respuesta manteniendo correctamente los hilos y referencias del correo original.
8. **Gestión de hilos de conversación**: Agrupación inteligente de correos con el mismo asunto/referencia en una sola conversación continua.

---

## 🔒 2. Seguridad y Privacidad
[x] 9. **Verificación en Dos Pasos (2FA)**: Autenticación de doble factor compatible con aplicaciones TOTP (Google Authenticator, Authy, etc.).
10. **Filtro Anti-Spam Inteligente**: Clasificación automática de correos sospechosos y posibilidad de marcar/desmarcar elementos manualmente.
11. **Configuración y validación DNS (SPF, DKIM, DMARC)**: Panel para configurar y verificar las claves criptográficas y registros de seguridad del dominio emisor.
12. **Bloqueo y lista negra de remitentes**: Capacidad de bloquear direcciones o dominios completos directamente desde la interfaz del correo.
13. **Cifrado de datos en tránsito y reposo**: Asegurar que las comunicaciones usen SSL/TLS estricto y que los correos almacenados estén encriptados.
14. **Control de sesiones activas**: Listado de dispositivos con sesión iniciada y opción para cerrar sesión de manera remota en cualquiera de ellos.
15. **Protección contra rastreadores (Tracker Blocking)**: Bloqueo automático de imágenes invisibles (píxeles de seguimiento) que revelan si el usuario abrió el correo.
16. **Detección de Phishing**: Alertas visuales destacadas cuando un correo entrante parece fraudulento o suplanta una identidad conocida.

---

## 🎨 3. Interfaz y Experiencia de Usuario (UI/UX)
[x] 17. **Diseño completamente responsivo**: Adaptabilidad impecable a dispositivos móviles, tablets y pantallas de escritorio.
18. **Tema Oscuro y Claro nativos**: Soporte para cambio de tema dinámico y detección automática de la preferencia del sistema operativo.
19. **Atajos de teclado**: Navegación rápida, lectura, eliminación y redacción mediante combinaciones de teclas (estilo Gmail/Outlook).
20. **Acciones rápidas al pasar el cursor (Hover Actions)**: Botones rápidos para archivar, borrar, marcar como leído o posponer sin abrir el correo.
21. **Etiquetas y carpetas personalizadas**: Organización flexible mediante la creación de carpetas jerárquicas o etiquetas con colores personalizados.
22. **Modo Multi-cuenta (si aplica)**: Capacidad de cambiar rápidamente entre diferentes bandejas de entrada asociadas.
23. **Gestión de firmas de correo**: Configuración de firmas en formato HTML para que se adjunten automáticamente al redactar.
24. **Notificaciones Push y de escritorio**: Alertas en tiempo real al recibir nuevos correos, incluso cuando la pestaña no está activa.

---

## ⚡ 4. Funcionalidades Avanzadas de Correo
25. **Deshacer envío (Undo Send)**: Retrasar el envío real unos segundos (ej. 5-30s) para permitir al usuario cancelar si cometió un error.
26. **Posponer correos (Snooze)**: Ocultar temporalmente un correo y hacer que reaparezca en la bandeja de entrada en una fecha y hora específicas.
27. **Programación de envíos (Schedule Send)**: Redactar un correo y definir exactamente cuándo debe ser enviado de forma automática.
28. **Reglas y filtros automáticos**: Automatización para archivar, etiquetar, reenviar o eliminar correos que cumplan con criterios predefinidos.
29. **Plantillas de respuesta rápida**: Crear y guardar respuestas predefinidas para insertarlas con un clic al responder correos repetitivos.
30. **Respuestas automáticas de ausencia (Vacation Auto-responder)**: Mensaje automático configurable para responder durante periodos vacacionales.
31. **Buzón de voz / Notas de voz rápidas**: Posibilidad de adjuntar audios directamente grabados desde el editor de correo.
32. **Importador/Exportador de contactos**: Agenda de contactos integrada con soporte para importar/exportar archivos vCard o CSV.

---

## 🛠️ 5. Administración y Gestión de Dominios
33. **Panel de control de administración**: Interfaz interna para gestionar usuarios, dominios, límites de almacenamiento y cuotas.
34. **Invitación de usuarios**: Sistema para invitar a nuevos miembros a unirse al servicio de correo del dominio mediante enlaces seguros.
35. **Alias de correo**: Creación de direcciones alternativas (ej. `soporte@dominio.com`) que redirigen a un buzón principal.
36. **Redirecciones de correo (Forwarding rules)**: Configurar el reenvío automático de correos entrantes hacia direcciones externas.
37. **Límites de almacenamiento personalizados**: Asignación de espacio en disco máximo por usuario o por dominio.
38. **Gestión de múltiples dominios**: Soporte para recibir y enviar correos desde distintos dominios configurados bajo una misma cuenta.
39. **Logs de entrega y depuración**: Registro detallado para administradores que muestra si un correo fue enviado, rebotado o rechazado.
40. **Políticas de contraseñas y expiración**: Configuración de requisitos de seguridad para contraseñas de usuarios.

---

## ⚙️ 6. Rendimiento, Integración e Infraestructura
41. **Arquitectura Cloudflare Workers**: Procesamiento ultrarrápido en el Edge para la recepción, enrutamiento y envío ágil de correos.
[x] 42. **Soporte Offline**: Uso de Service Workers para permitir la lectura de correos ya descargados y redacción de borradores sin conexión a internet.
43. **Búsqueda predictiva y auto-completado de contactos**: Sugerencias inmediatas de correos al empezar a escribir en los campos "Para", "CC" y "CCO".
44. **API REST / Webhooks**: Integraciones externas para que desarrolladores puedan enviar correos o reaccionar a correos entrantes mediante código.
45. **Compresión y optimización de adjuntos**: Reducción automática de tamaño en imágenes adjuntas y optimización del almacenamiento en base de datos.
46. **Copias de seguridad automáticas (Backups)**: Sistema programado para respaldar bandejas de entrada y permitir restauraciones selectivas.
47. **Métricas y analíticas de envío**: Gráficos de volumen de correos enviados/recibidos, tasas de rebote (bounce rate) y spam.
48. **Monitoreo de reputación de IP**: Alertas y herramientas para asegurar que la IP/dominio del servidor de salida no entre en listas negras de spam.
