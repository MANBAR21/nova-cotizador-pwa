# vendor/

Librerías servidas desde el mismo origen que la app. **No se cargan de ningún CDN.**

Esa es la única razón de que existan aquí: el `install` del service worker no
puede depender de que cuatro servidores ajenos respondan en ese instante. Con
todo en el mismo origen, la garantía offline se verifica de una sola forma —
modo avión, abrir, cotizar, exportar — y no hay estado de caché intermedio que
razonar.

| archivo | versión | origen |
|---|---|---|
| `supabase.min.js` | 2.x | `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` |
| `html2canvas.min.js` | 1.4.1 | `cdnjs.cloudflare.com` |
| `jspdf.umd.min.js` | 2.5.1 | `cdnjs.cloudflare.com` |
| `xlsx.bundle.js` | 1.2.0 (xlsx-js-style) | `cdn.jsdelivr.net/npm/xlsx-js-style` |

Descargadas el 2026-09-21. Los sha256 están en `VENDOR.sha256`; verifica con
`sha256sum -c VENDOR.sha256` desde esta carpeta.

`xlsx.full.min.js` (SheetJS 0.18.5, 881 KB) **ya no está**. Era el fallback de
`exportExcel` por si fallaba el CDN de `xlsx-js-style`. Vendorizado no hay CDN
que falle, así que sobraba.

## Si actualizas una librería

Cambia el archivo, regenera `VENDOR.sha256` y **vuelve a publicar la app**: el
`CACHE_NAME` del service worker se calcula sobre el conjunto `index.html +
manifest.json + vendor/*`, así que si no se republica, los dispositivos que ya
tienen la app instalada siguen con la versión vieja en caché.
