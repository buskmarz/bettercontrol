Better Mood Coffee · Control de Cafetería

Resumen
- Single‑page app (HTML/JS/CSS) lista para ejecutarse en el navegador, offline‑first usando localStorage. Opcionalmente puede espejar datos en una API PostgREST/Supabase (Config → Modo API).
- Rebrand aplicado: amarillo #FFD74B / negro #231F20. Tabs y textos renombrados para cafetería sin cambiar IDs/data-tab.
- Módulos clave visibles: Ventas, Insumos/Compras, Gastos, Agenda, Catálogos, Recetas/Costeo, Dashboard (KPIs), Config.

Importaciones
- Ventas (Excel): en la pestaña Ventas, usa “Importar ventas (Excel)”. Soporta múltiples archivos tipo productosvendidos_0000000001_*.xlsx con encabezados comunes (fecha, ticket/folio, sku, descripción, cantidad, precio, subtotal, impuestos, total, medio de pago). Deduplica por fecha+ticket+sku. Guarda en sn_ventas_detalle y sn_ventas_ticket.
- Corte de caja (PDF): en la pestaña Ventas, usa “Importar corte (PDF)”. Extrae (heurístico) Efectivo, Tarjetas, Vales y Propinas. Calcula diferencia vs sistema (ventas del día) y guarda en sn_cortes.
- Compras (CSV): en Insumos/Compras, usa “Importar CSV”. Encabezados comunes (fecha, insumo/producto, cantidad, unidad, costo, folio). Registra entradas en sn_kardex y agrega insumos al catálogo si son nuevos.

KPIs y dónde verlos
- Sidebar: Ticket promedio (periodo), Margen estimado, Utilidad total, Pedidos activos.
- Dashboard (Cafetería):
  - Tickets / Periodo
  - Artículos vendidos
  - Costo insumos (desde Kardex salidas)
  - Gastos operativos (desde módulo Gastos)
  - Ingresos (ventas)
  - Costo total
- Tabla “Ventas por unidad” y “Resumen por periodo (café)” conservan estructura y filtros existentes.

Recetas / Costeo
- En la pestaña Recetas/Costeo, “Calcular costo” estima costo estándar por porción y “Exportar PDF” genera una ficha imprimible simple. Los campos reetiquetados reutilizan IDs existentes para no romper la lógica previa.

Inventario / Kardex
- Se calcula desde sn_kardex. “Cerrar turno” en Ventas descuenta insumos por ventas cuando existan recetas/ingredientes (campo sku coincidente) y refresca Inventario.

Exportaciones
- CSV existentes: Dashboard, Gastos e Insumos/Compras (botón Exportar CSV).
- PDF: Recetas/Costeo (botón Exportar PDF listos con estilos @media print).

Notas de uso
- Offline‑first: todo persiste en localStorage con prefijo sn_.
- API opcional: Config → define Base URL y Token (Bearer) para PostgREST/Supabase y cambia Modo a API. La app intentará espejar colecciones.
- Roles UI básicos: por ahora decorativos (admin/operador). Ocultar config avanzada al operador puede resolverse en CSS/JS si se requiere.

Colecciones locales clave (prefijo sn_)
- ventas_ticket, ventas_detalle, insumos, inventario, kardex, recetas, recetas_ingredientes, proveedores, estaciones, empleados, cortes.

Validaciones y robustez
- Importadores: manejo básico de encabezados, deduplicación por ticket+sku+fecha y errores de archivo.
- Tablas grandes: usa render simple + filtros (se puede cambiar a paginación virtual si crece).
- Backups: exporta CSV por módulo; para backup completo, exporta localStorage desde el navegador.

Pruebas sugeridas (criterios de aceptación)
- Importa 3 Excels de ventas → se actualizan Tickets, Artículos vendidos, Ventas, Ticket Promedio (ver Dashboard/Sidebar).
- Importa 2 PDFs de corte → totales correctos y diferencia calculada (ver sección “Cortes de caja”).
- Crea una receta con 3 ingredientes y usa Recetas/Costeo → costo/porción y precio sugerido correctos.
- Registra compra de 2 insumos (CSV o formulario) → inventario sube; “Cerrar turno” tras vender porciones → inventario baja (si hay correspondencia sku↔receta).
- Exporta CSV de ventas (Dashboard) y Kardex (Insumos/Compras) sin errores.

Requisitos
- Para importadores: acceso a las librerías en CDN (`xlsx` y `pdfjs-dist`) o copias locales equivalentes.

Netlify Blobs (sync remoto)
- En el panel de Netlify: habilita Blobs para el sitio.
- Variables de entorno recomendadas:
  - `BMC_BLOBS_SITE_ID` y `BMC_BLOBS_TOKEN` (desde la seccion Blobs del sitio).
  - `BMC_USER` y `BMC_PASS` si quieres cambiar credenciales.
- El endpoint de sync es `/.netlify/functions/bmc-blobs` (debe responder 401 si esta vivo).
