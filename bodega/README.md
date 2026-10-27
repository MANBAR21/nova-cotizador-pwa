# Bodega Nova (PWA)

App de celular para registrar los racks de la bodega: escanear el QR de la
etiqueta, llenar qué guarda y cuántos equipos le caben, tomar las fotos
(cerrado, abierto y daños) y registrar lo que tiene adentro.

Usa el mismo Supabase del cotizador (NOVA DASH) y la misma llave pública.

## Qué hay en la base (NOVA DASH)

| Tabla | Qué guarda |
|---|---|
| `bod_equipos` | Las 137 referencias del inventario (101…604) |
| `bod_racks` | Cada rack: código, qué guarda, caben, dónde está |
| `bod_rack_contenido` | Qué equipos y cuántos tiene cada rack, dañados, seriales |
| `bod_fotos` | Cada foto (bucket privado `bodega-fotos`), quién y cuándo |
| `bod_historial` | Hoja de vida: todo cambio con antes/después, quién y cuándo |

Solo se escribe por las funciones `bod_guardar_rack`, `bod_guardar_contenido`
y `bod_registrar_foto`. Entran los usuarios con rol `admin`, `gerente` o
`bodega` en la tabla `usuarios`. Las fotos no se pueden borrar ni reemplazar
desde la app.

## Publicar

Necesita HTTPS (la cámara no abre sin él). Igual que el cotizador:

1. Opción A (la más simple): copie esta carpeta como `bodega/` dentro del
   repositorio del cotizador (`MANBAR21/nova-cotizador-pwa`) y publique como
   siempre. Queda en `https://<usuario>.github.io/nova-cotizador-pwa/bodega/`.
   El service worker de bodega rehace su caché solo si el del cotizador la
   borra al publicarse. Revise que `deploy-pwa.ps1` no borre la carpeta.
   Opción B: un repositorio propio (`nova-bodega-pwa`) con GitHub Pages.
2. En cada publicación cambie `CACHE_NAME` en `service-worker.js`
   (por ejemplo `nova-bodega-v2`), o los celulares se quedan con la versión vieja.

## Dar acceso a Rubiel y Santiago

1. Supabase → Authentication → Users → Add user → Create new user, con
   correo y contraseña, marcando "Auto confirm".
2. Crear su fila en `usuarios` con `rol = 'bodega'` y el `auth_user_id` del
   usuario creado (o pedirle a Claude que lo haga con los correos).
3. En el celular: abrir la URL, entrar una vez y "Agregar a pantalla de inicio".

## Sin señal

Cada "Guardar rack" queda primero en el celular (IndexedDB) con sus fotos y se
envía en orden cuando hay conexión. La franja amarilla de inicio muestra lo
que falta por enviar.
