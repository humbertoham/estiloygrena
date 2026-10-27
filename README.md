# Estilo y Greña

Aplicación nueva de Next.js App Router, TypeScript estricto, Tailwind 4, Motion, Prisma 7 con adaptador Neon, PostgreSQL y Cloudflare R2. Reservas sin cuenta, servicios de precio fijo o cotización y panel de administrador. Preparada para un despliegue Node.js en Vercel; no usa Docker.

## Inicio local

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm dev
```

Abre `http://localhost:3000`. Si PowerShell bloquea los scripts `.ps1`, usa `corepack.cmd pnpm dev`. En esta máquina Node está instalado en `C:\Users\yo\AppData\Local\nvm\v22.18.0`; si falta en PATH, agrégalo a la sesión de terminal.

La configuración original está en `.env`. `.env.local` tiene prioridad y contiene la URL del esquema nuevo y el acceso local generado. Consulta `ADMIN_USERNAME` y `ADMIN_PASSWORD` **en ese archivo** para entrar a `/admin/login`. Ningún secreto está incluido en el código, documentación ni control de versiones. Usa credenciales propias de producción al desplegar. Cambiar `ADMIN_SESSION_SECRET` invalida todas las sesiones existentes.

## Base de datos y seguridad de los datos anteriores

### Error `Failed to load config file ... TypeError: Invalid URL` en Vercel

El build ejecuta `prisma generate` antes de Next.js. `DATABASE_URL` debe estar configurada en Vercel; los archivos locales `.env` y `.env.local` están ignorados y no se transfieren con el código. La configuración ahora valida las URL e indica el nombre de la variable incorrecta sin imprimir su valor.

En **Project → Settings → Environment Variables**, agrega los valores para el entorno del despliegue (Production o Preview):

- `DATABASE_URL`: copia el valor de `.env.local`, conservando `schema=estilo_greenfield`. Introduce solo el valor, sin `DATABASE_URL=` ni comillas.
- `DIRECT_URL`: opcional; déjala sin configurar si no la necesitas. Si se establece, debe apuntar a la misma base. El código conserva el esquema de `DATABASE_URL`.
- Las variables `R2_*` del `.env`; `R2_PUBLIC_URL` debe comenzar con `https://`.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` y `CRON_SECRET`, con valores propios del despliegue.
- `NEXT_PUBLIC_APP_URL`: URL completa del sitio, incluyendo `https://`.

Después de guardar, realiza un nuevo **Redeploy** para aplicar las variables. No subas archivos de secretos al repositorio. [Documentación de variables de entorno de Vercel](https://vercel.com/docs/environment-variables).

Se inspeccionó la base existente antes de escribir. La aplicación nueva usa exclusivamente el esquema PostgreSQL **`estilo_greenfield`** mediante `?schema=estilo_greenfield` en `DATABASE_URL`. Se aplicaron las cuatro migraciones y se importaron las fotos a registros nuevos. Las tablas del esquema `public` anterior se conservaron.

Para producción se recomienda una rama/base Neon dedicada, con las mismas migraciones. `DIRECT_URL` es opcional para Prisma CLI; si no se proporciona, la configuración deriva el endpoint directo de Neon retirando `-pooler` del hostname. Prisma Client usa el endpoint de `DATABASE_URL` y su esquema explícito.

```sh
pnpm db:inspect
pnpm db:migrate
pnpm db:seed
pnpm images:import
```

La semilla es idempotente, está restringida a `estilo_greenfield` y no sobrescribe valores existentes. Los cinco servicios son ejemplos identificados en la interfaz. No se sembraron horarios sin confirmar y la agenda pública permanece cerrada hasta su activación en el panel.

Durante la verificación apareció un advisory lock de Prisma retenido en una conexión compartida de la base existente (origen no determinado). No se interrumpió esa conexión. Las migraciones de esta aplicación ya están aplicadas; una migración futura debe usar la conexión directa y resolver ese bloqueo con el propietario de la base o utilizar una rama Neon dedicada. No uses `migrate reset` ni desactives protecciones en la base existente.

## Dirección visual

- Muro fotográfico continuo de 24 mosaicos estables, con tamaños y recortes distintos, sin separación ni filtros de color. Imágenes optimizadas con Next Image; carga prioritaria limitada al primer grupo.
- Carteles superpuestos, asimetría, índices numerados, hojas de contacto, bordes rectos y pequeños detalles de impresión.
- UnifrakturCook Bold para titulares góticos; Instrument Serif Regular/Italic para tipografía editorial; Arial y Courier New para controles y datos. Fuentes locales con sus licencias OFL en `public/fonts/licenses`.
- Negro `#000000`, blanco `#FFFFFF`, papel `#F0EEE9` y grises. Las fotografías conservan sus colores naturales.
- Animación breve de posición, sin ocultar contenido esencial y con respeto a movimiento reducido.

Falta el logo original. Colócalo en `public/logo.png`; el componente lo detecta y sustituye el texto temporal. Los 14 originales se conservan en `public/images/cortes`.

## Páginas

Públicas: `/`, `/servicios`, `/galeria`, `/calendario`, `/agendar`, `/ubicacion`, `/privacidad`, `/politica-de-cancelacion`.

Privadas por token: `/cita/[secureToken]`. Estados de pago: `/pago/exito`, `/pago/pendiente`, `/pago/error`. Las rutas privadas, pagos, API y administración no se indexan. Incluye metadatos, Open Graph, favicon, sitemap, robots y datos estructurados HairSalon sin teléfono ni horarios inventados.

Panel: `/admin`, `/admin/citas`, `/admin/citas/nueva`, `/admin/calendario`, `/admin/servicios`, `/admin/horarios`, `/admin/bloqueos`, `/admin/galeria`, `/admin/configuracion`.

## Reservas

El motor compartido combina horario semanal con varios intervalos, excepciones, cierres, bloqueos de varios días, citas existentes, duración, anticipación, ventana de reserva y tiempo adicional entre citas. Inicios configurables de 15, 30, 60 o 90 minutos; valor inicial 60. Usa `America/Monterrey` para interpretar fechas locales y UTC para almacenamiento, sin sumar manualmente un offset.

Cada reserva vuelve a consultar la disponibilidad dentro de una transacción con bloqueo de calendario. Una restricción de exclusión GiST de PostgreSQL impide solapamientos de citas pendientes y confirmadas, incluso ante escrituras concurrentes. Los intervalos son semiabiertos: una cita puede comenzar cuando termina la anterior.

Los precios y duraciones se toman del servidor y se guardan como instantáneas. Los servicios `QUOTE` usan importe nulo, no `$0`, y no permiten Mercado Pago. Las citas en local se confirman y quedan pendientes de cobro; las cotizaciones se confirman sin cobro en línea. El enlace de WhatsApp aparece solo cuando se configura un número válido. La confirmación usa un token aleatorio de 256 bits cuyo hash se guarda en Neon; no publica datos de contacto del cliente.

## Administración

Credenciales en entorno, cookies HttpOnly con SameSite estricto y expiración de ocho horas, JWT firmado, comparación de credenciales en tiempo constante y límite de intentos persistido en PostgreSQL. Cada mutación se autoriza en el servidor; Server Actions verifican el origen y las API de reserva exigen el origen configurado.

El panel permite altas manuales, filtros, reprogramación con la duración original, cancelación, asistencia, cobro en local, servicios y precios, intervalos semanales, excepciones, bloqueos editables y configuración pública. Las citas afectadas por un bloqueo se conservan: se exige reconocer el conflicto y resolverlo en el calendario. Hay vistas de día y semana con accesos desde cada horario disponible para crear una cita o bloquearlo.

La galería permite subir, describir, reordenar, destacar, desactivar y eliminar una imagen con confirmación específica. Los servicios admiten fotografía propia. No se pueden marcar pagos de Mercado Pago como pagados o reembolsados manualmente.

Modelos: `Service`, `Appointment`, `WeeklySchedule`, `ScheduleException`, `BlockedPeriod`, `GalleryImage`, `SiteSetting`, `PaymentTransaction`, `PaymentEvent` y `RateLimit`. No hay cuentas de administrador en la base.

## R2

Se verificaron acceso al bucket, subida de las 14 fotografías, registros en Neon e imágenes públicas en el navegador. Se reutilizan las variables R2 del `.env`. La importación usa claves por SHA-256 y upsert para no duplicar registros ni borrar originales.

Se aceptan JPEG, PNG y WebP de hasta **4 MB**, con inspección real de formato, límite de píxeles, eliminación de metadatos por recodificación y WebP optimizado. El límite permite cargas mediante Server Actions dentro del límite de petición de Vercel. Se borran únicamente claves válidas bajo `gallery/` referenciadas por el registro seleccionado.

`R2_PUBLIC_URL` puede ser una URL HTTPS `r2.dev` o un dominio personalizado. Se utiliza para construir enlaces y configurar `images.remotePatterns`; reinicia o reconstruye Next al cambiar el host. El bucket público solo almacena fotografías; nunca documentos de clientes. Las claves de acceso permanecen en el servidor.

## Mercado Pago

Integración de Checkout Pro mediante API REST oficial: preferencias en servidor, precio verificado, referencia interna, URLs de retorno, verificación HMAC de webhook, consulta autenticada del pago, comprobación de moneda/importe y persistencia idempotente de eventos y transacciones. Las pantallas de retorno nunca confirman pagos por sus parámetros.

La reserva de pago dura 15 minutos. El webhook no reactiva citas canceladas o expiradas ni toma el horario de otra persona. Registra el dinero y marca la cita para revisión. El panel ofrece enlace a actividad de Mercado Pago y una resolución documentada; el reembolso se realiza en el procesador y se espera su confirmación por webhook. Los eventos antiguos no deben degradar un pago aprobado; pagos múltiples se revisan y se conserva el estado financiero agregado.

**No se verificó conectividad real de Mercado Pago:** faltan `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` y una URL pública HTTPS. No se crearon cargos reales. El pago en línea está deshabilitado mientras falte configuración. Checkout Pro no necesita el SDK de tarjeta en el cliente; la variable de clave pública se documenta para compatibilidad.

Para probar en sandbox:

1. Obtén las credenciales de prueba oficiales y el secreto del webhook en Mercado Pago.
2. Inicia `pnpm dev`. Usa un túnel HTTPS temporal hacia el puerto 3000, por ejemplo `cloudflared tunnel --url http://localhost:3000`.
3. Configura `NEXT_PUBLIC_APP_URL` con el origen HTTPS del túnel y reinicia la app.
4. Registra `https://TU-TUNEL/api/webhooks/mercadopago` para eventos de pago. Prueba con comprador y medios de prueba.
5. Comprueba preferencia, retorno, webhook aprobado/pendiente/rechazado y expiración. Para credenciales reales se requiere habilitar explícitamente `ALLOW_LIVE_PAYMENTS=true`.

Documentación primaria: [Checkout Pro y webhooks](https://www.mercadopago.com.mx/developers/en/docs/checkout-pro-preferences/additional-content/notifications/webhooks), [Prisma con Neon](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers).

## Expiración programada y despliegue

`vercel.json` declara una llamada por minuto a `/api/cron/expire`. Configura `CRON_SECRET` en Vercel; la ruta exige `Authorization: Bearer <CRON_SECRET>`. También puede llamarla un programador externo autorizado si el plan de hosting no permite esa frecuencia. La disponibilidad descarta holds vencidos y cada nueva reserva los expira transaccionalmente, por lo que un retraso del cron no permite traslapes.

En Vercel: instala con pnpm, build `pnpm build`, importa las variables de `.env.example` con valores propios, conserva `?schema=estilo_greenfield` si se usa esa base y añade el dominio real a `NEXT_PUBLIC_APP_URL`. Aplica migraciones desde una conexión directa como paso de despliegue controlado. No cargues `.env` ni `.env.local` al repositorio. Revisa el alcance de las credenciales R2 y el acceso a la rama Neon destinada al despliegue.

Antes de abrir al público: reemplaza datos de ejemplo; confirma precios, duraciones y horarios; configura WhatsApp e Instagram reales si aplican; agrega el logo; revisa avisos legales y contacto de privacidad; verifica Mercado Pago en sandbox, dominio, webhook y cron. La agenda permanece cerrada hasta que el administrador la active. Este trabajo no se ha desplegado en Vercel.

## Verificación

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:full
```

`pnpm test` ejecuta pruebas unitarias y omite la integración si no hay un entorno aislado. **`pnpm test:full` crea un esquema temporal único `estilo_test_*`, aplica los SQL reales de las migraciones a esa conexión, ejecuta Vitest, prepara datos de prueba y levanta Next en el puerto 3100 para Playwright. Elimina solo ese esquema temporal al terminar.** No reutiliza datos de clientes ni realiza cargos. Requiere permisos para crear esquemas y un Chromium instalado (`pnpm exec playwright install chromium`).

La batería cubre intervalos, duraciones largas, citas consecutivas, cierres, excepciones, bloqueos, concurrencia real, snapshots, cotizaciones, expiración, firma de webhook, repetición de eventos, aprobación tardía, sesiones, acciones administrativas sin autorización y flujos de reserva/admin. Los screenshots se guardan en `artifacts/qa`; las trazas de fallo, que pueden contener credenciales desechables de pruebas, quedan ignoradas en `test-results`.

La revisión visual incluye 1440×900, 1280×800, 768×1024, 390×844 y 375×812; también portada, servicios, galería, ubicación, formulario y panel. Consulta `IMPLEMENTATION-REPORT.md` para los resultados finales y límites de verificación.
