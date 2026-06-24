# Sigma Plugins

A collection of custom [Sigma](https://www.sigmacomputing.com/) plugins built as
a single Vite multi-page app and hosted on GitHub Pages. Each plugin is its own
page, so each has its own URL to register in Sigma:

| Plugin | Hosted URL (Production URL for Sigma) | Source |
| --- | --- | --- |
| **3D Globe choropleth** | `https://ysigma.github.io/Sigma-Plugins/` | `src/` |
| **Saudi Arabia regions map** | `https://ysigma.github.io/Sigma-Plugins/saudi.html` | `src/saudi/` |
| **Mini bar-line table** | `https://ysigma.github.io/Sigma-Plugins/table.html` | `src/table/` |
| **Service status timeline** | `https://ysigma.github.io/Sigma-Plugins/status.html` | `src/status/` |

> Pages deploys on push to `main` (see `.github/workflows/deploy-pages.yml`). A
> new plugin page goes live at its URL once merged to `main`.

---

## 3D Globe Plugin

An interactive, rotatable **3D globe** custom plugin for Sigma. Drop a
**country** dimension and a **measure** onto it, and the globe paints each
country as a choropleth (discrete color buckets). Hover any country to get a
dynamic popup showing the country name and its value.

## Features

- 🌍 **Rotatable 3D globe** (drag to spin, scroll to zoom, optional auto-rotate)
  built on [`react-globe.gl`](https://github.com/vasturiano/react-globe.gl) /
  Three.js.
- 🎨 **Choropleth coloring** by a measure using **discrete color buckets**
  (quantile or equal-interval), with a matching stepped legend.
- 🔎 **Hover tooltips** showing the country name and the measure value.
- 🧭 **Auto-detect country matching** — accepts country **names**
  (`United States`), **ISO alpha-2** (`US`), **ISO alpha-3** (`USA`), and **ISO
  numeric** (`840`) codes, plus common aliases (`UK`, `DRC`, `South Korea`,
  `Côte d'Ivoire`, …).
- ⚙️ **Configurable in Sigma** — palette, bucket count, bucket method, dark/light
  mode, country labels, auto-rotate, legend, and no-data color are all editor
  panel options. No redeploy needed to restyle.
- 📦 **Fully self-contained** — country borders and the name/ISO lookup are
  bundled at build time, so the plugin makes **no external network calls** at
  runtime.

## Editor panel options

| Option | Type | Description |
| --- | --- | --- |
| **Data source** | element | The Sigma element (table/viz) providing the data. |
| **Country (dimension)** | column | Country names or ISO codes. |
| **Color metric (measure)** | column | The numeric measure used for coloring. |
| **Color palette** | dropdown | Blues, Greens, Oranges, Reds, Purples, Viridis, Yellow-Green-Blue, Red-Blue (diverging). |
| **Number of color buckets** | dropdown | 3–7. |
| **Bucket method** | dropdown | `Quantile` (equal count per bucket) or `Equal interval` (equal value ranges). |
| **No-data color** | color | Fill for countries with no matching row. |
| **Dark mode** | toggle | Dark space background vs. light/minimal globe. |
| **Show country labels** | toggle | Render country name labels on the globe. |
| **Auto-rotate globe** | toggle | Spin the globe automatically. |
| **Show legend** | toggle | Show/hide the bucket legend. |

## How matching works

Each value in the **Country** column is normalized (lowercased, accent- and
punctuation-insensitive) and resolved to an ISO 3166-1 numeric code via the
[`world-countries`](https://github.com/mledoze/countries) dataset plus an alias
table. The globe geometry ([`world-atlas`](https://github.com/topojson/world-atlas),
Natural Earth 1:110m) is keyed by the same numeric code, so a resolved row lights
up the matching polygon.

If multiple rows resolve to the same country, their measure values are **summed**.
In practice Sigma usually aggregates the measure per dimension value already, so
you'll have one row per country. Rows whose country can't be matched are counted
and surfaced in a small on-screen notice to aid debugging.

---

## Saudi Arabia Regions Map

URL: **`https://ysigma.github.io/Sigma-Plugins/saudi.html`**

A **semi-3D, tilt-only** map of Saudi Arabia's 13 administrative regions, built
on raw [Three.js](https://threejs.org/) (no globe library). The regions are
extruded into a slab you can **tilt up and down** to see all provinces — the
camera is constrained so it never spins around or under the map.

### Features

- 🗺️ **3D extruded regions** — all 13 ADM1 provinces in a fixed light silver-grey
  palette (matching the reference design), with region labels lying on the map
  and crisp white borders. Geometry is bundled (simplified geoBoundaries ADM1,
  ~1k points) so there are **no runtime network calls**.
- 🎚️ **Tilt-only rotation** — drag to tilt between near top-down and a low oblique
  angle; horizontal spin is locked by default (toggle "Allow left/right spin" for
  a small ± range). Scroll to zoom.
- 📍 **Fixed site pins** — four callouts (DR, PIF TOWER, RDC, WAMID) baked in at
  the reference-design positions (no lat/lng to manage). The **pin color** is a
  picker; label text auto-contrasts for readability.
- ✅ **Optional status** — a healthy/down state per pin can be driven from data,
  matched to a pin by its label (healthy → green ✓, down → red ✕). With no data,
  all pins show healthy.
- 🔎 **Hover tooltips** on each pin, plus an extra "Ad Dammam" place label inside
  Eastern Province.

### Editor panel options

| Group | Option | Description |
| --- | --- | --- |
| Status | **Site status source** (optional) | Element providing per-site status. |
| Status | **Site label** | Matches a row to a pin (DR / PIF TOWER / RDC / WAMID). |
| Status | **Site status** | healthy → ✓ / down → ✕. |
| Appearance | **Pin color** | Callout color (label text auto-contrasts). |
| Appearance | **Background color** | Canvas background. |
| Appearance | **3D thickness** | Flat · Low · Medium · High slab depth. |
| Appearance | **Initial tilt** | Top-down · Low · Medium · High. |
| Appearance | **Allow left/right spin** | Off = tilt up/down only (default). |
| Appearance | **Show region labels** | Toggle. |

### Standalone demo

Opening the URL directly (outside Sigma) reproduces the reference design — the
four healthy site pins at their fixed positions. Query params preview variants:

- `?pin=RRGGBB` — pin color, `?bg=RRGGBB` — background
- `?tilt=Top-down|Low|Medium|High`, `?extrude=Flat|Low|Medium|High`
- `?spin=1`, `?labels=0`

### Region geometry

Bundled at `src/saudi/lib/saudiProvinces.json` (source: geoBoundaries gbOpen
SAU ADM1, simplified). Coordinates are projected to a flat plane with a plain
Mercator and **fitted/centroid-ed in planar space** (not via d3's spherical
helpers, which are winding-order sensitive), then extruded with
`THREE.ExtrudeGeometry`.

---

## Service Status Timeline

URL: **`https://ysigma.github.io/Sigma-Plugins/status.html`**

An uptime **status heatmap**: one row per application (the **Application / URL**
column on the left), and a row of colored squares to the right where each square
is one **truncated window of time**. The square's color is driven by a **status
measure** — green when the service is up, red when it's down, amber when
degraded. Built to reproduce a typical service-availability board.

### Features

- 🟩 **Timeline heatmap** — each square = one time bucket; gaps in the data render
  as empty (no-data) squares so outages and monitoring gaps are visible.
- ⏱️ **Selectable bucket size** — choose how much time each square represents:
  **1 min · 5 min · 15 min · 30 min · 1 hour · 6 hours · 1 day**. Readings are
  floored to the start of their bucket so they line up into a regular grid.
- 🚦 **Binary up / down coloring** (with optional **degraded**) from the status
  measure. `1`/`true`/`up`/`ok`/`healthy` → up; `0`/`false`/`down`/`error`/`fail`
  → down. You can extend the down/degraded vocabularies in the editor panel
  (e.g. add `500` or `maintenance` as Down).
- 🧮 **Per-bucket aggregation** — when several readings fall in one square, combine
  them by **Worst status wins** (default — any outage shows), **Most recent**, or
  **Average**.
- 🔗 **Clickable URLs** — a URL inside the row label opens the service in a new tab.
- 🕐 **Auto time axis** — evenly spaced tick labels under the grid, formatted to
  suit the bucket size.
- 📊 **Demo mode** — opening the URL outside Sigma shows synthetic data for ~19
  services so you can see the layout immediately.

### Editor panel options

| Group | Option | Description |
| --- | --- | --- |
| Data | **Data source** | Element providing one row per reading. |
| Data | **Application / URL** | Row label (e.g. `BitBucket - https://…`). |
| Data | **Timestamp** | When each reading was taken (datetime or epoch). |
| Data | **Status measure** | Value that colors the square (up / down). |
| Timeline | **Time per square** | Bucket size: 1 min → 1 day. |
| Timeline | **When a square has multiple readings** | Worst status wins · Most recent · Average. |
| Timeline | **Values counted as Down** | Optional extra tokens (e.g. `0, 500, maintenance`). |
| Timeline | **Values counted as Degraded** | Optional extra tokens (e.g. `warn, slow`). |
| Appearance | **Title** | Optional label, top-left. |
| Appearance | **Up / Degraded / Down / No-data color** | Square colors. |
| Appearance | **Background / Text color** | Panel styling. |
| Appearance | **Label column width** | 180–480 px. |
| Appearance | **Make URLs clickable** | Linkify URLs in the row label (default on). |
| Appearance | **Show legend** | Up/Down(/Degraded) swatches in the header. |

### How bucketing & coloring work

Every reading's timestamp is floored to the start of its bucket
(`floor(t / bucketMs) * bucketMs`). The grid spans from the earliest to the
latest reading, **including empty buckets** so real gaps stay visible (capped at
600 columns — increase the bucket size for very long ranges). Within each
bucket the readings are classified to `up` / `degraded` / `down` and combined by
the chosen aggregation; the resulting status picks the square color.

## Local development

```bash
npm install
npm run dev        # serves on http://localhost:3000
```

> The dev server runs on port **3000** to match Sigma's **Plugin Dev Playground**
> default URL (`http://localhost:3000`).

### Testing in Sigma

1. Open a Sigma workbook (Edit mode) and add the **Plugin Dev Playground** plugin
   element (or a registered plugin pointed at your dev URL).
2. Make sure its development URL is `http://localhost:3000`.
3. In the plugin's editor panel: choose a **Data source**, then assign the
   **Country** and **Color metric** columns.

See Sigma's docs:
[Develop plugins](https://help.sigmacomputing.com/docs/develop-plugins-for-sigma) ·
[Get started with custom plugins](https://help.sigmacomputing.com/docs/get-started-with-custom-plugins).

## Build

```bash
npm run build      # type-checks then builds to dist/
npm run preview    # preview the production build on http://localhost:3000
```

## Deploy to Netlify

This repo includes a `netlify.toml`. Either:

- **Connect the repo** in the Netlify UI (build command `npm run build`, publish
  directory `dist`), or
- **Deploy from the CLI:**

  ```bash
  npm i -g netlify-cli
  netlify deploy --build --prod
  ```

Netlify serves the plugin over HTTPS (required for Sigma). The `base` is set to
`./` so it also works from sub-paths / deploy previews.

## Register the plugin with Sigma

1. Build & deploy (get your production HTTPS URL, e.g.
   `https://your-site.netlify.app`).
2. A Sigma **Org Admin** registers the plugin with that **Production URL**
   (Administration → Plugins → Register). See
   [Register a plugin](https://help.sigmacomputing.com/docs/register-a-plugin-with-your-sigma-organization).
3. Add the plugin element to a workbook and configure its columns as above.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [`@sigmacomputing/plugin`](https://github.com/sigmacomputing/plugin) — Sigma
  plugin bridge (editor panel config + data hooks)
- [`react-globe.gl`](https://github.com/vasturiano/react-globe.gl) — Three.js
  globe with polygon (country) rendering & hover
- [`world-atlas`](https://github.com/topojson/world-atlas) +
  [`topojson-client`](https://github.com/topojson/topojson-client) — country
  geometry
- [`world-countries`](https://github.com/mledoze/countries) — name/ISO/alias
  lookup
- [`d3-scale`](https://github.com/d3/d3-scale) /
  [`d3-scale-chromatic`](https://github.com/d3/d3-scale-chromatic) — bucketed
  color scales & palettes

## Project structure

```
src/
  main.tsx              # entry: registers editor panel, mounts <App/>
  App.tsx               # reads Sigma config/data, builds the country->value map
  components/
    GlobeView.tsx       # the react-globe.gl globe + hover handling
    Legend.tsx          # stepped bucket legend
    EmptyState.tsx      # setup instructions until configured
  lib/
    sigmaConfig.ts      # editor panel definition
    countries.ts        # auto-detect country -> ISO numeric matching
    geo.ts              # TopoJSON -> GeoJSON features + label centroids
    color.ts            # discrete bucket color scale + legend
    format.ts           # number formatting
  status/               # Service status timeline (status.html)
    main.tsx            # entry: registers editor panel, mounts <App/>
    App.tsx             # buckets readings per app, builds the heatmap grid
    components/
      StatusRow.tsx     # one app row: label + track of status squares
      TimeAxis.tsx      # evenly spaced time-axis tick labels
      Legend.tsx        # up/down(/degraded) swatches
      EmptyState.tsx    # setup instructions until configured
    lib/
      sigmaConfig.ts    # editor panel definition
      time.ts           # bucket sizes, timestamp parsing, axis formatting
      status.ts         # value -> status classification + per-bucket aggregation
      demoData.ts       # synthetic services for standalone demo
```

> Other plugins live alongside in `src/saudi/` and `src/table/`, each with its
> own `*.html` entry at the repo root and a matching entry in `vite.config.ts`.
