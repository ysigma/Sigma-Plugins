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
| **Global threat-origin arc map** | `https://ysigma.github.io/Sigma-Plugins/arc.html` | `src/arc/` |
| **Segmented Bar Meter** | `https://ysigma.github.io/Sigma-Plugins/segmented-bar/` | `segmented-bar/` |
| **Circle Grid** | `https://ysigma.github.io/Sigma-Plugins/circle/` | `circle/` |
| **Assessment Dot Plot** | `https://ysigma.github.io/Sigma-Plugins/assessment/` | `assessment/` |

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

## Global Threat-Origin Arc Map

An interactive, animated **attack-flow map** (`arc.html`). Each row's source
coordinates spawn a glowing orange **arc** that flows — with a moving arrowhead
"comet" — toward a destination (every arc converges on Riyadh, Saudi Arabia by
default). Origin locations **pulsate**, and the destination shows a stronger
convergence pulse. Built on [Leaflet](https://leafletjs.com/) for pan / zoom over
a self-contained dark vector basemap, with a `requestAnimationFrame` canvas
overlay for the flow animation.

**Hosted at:** `https://ysigma.github.io/Sigma-Plugins/arc.html`

### Features

- 🌐 **Animated flow arcs** from each origin to the destination, with a bright
  arrowhead that travels the arc and loops — drawn over a persistent line.
- 📡 **Pulsating origins** and a **convergence pulse** at the destination.
- 🎨 **Orange theme with severity accents** — Critical / High routes glow
  brighter, draw thicker and pulse faster (a volume-weighted *representative*
  severity per route); turn accents off for a uniform-orange look.
- 🖱️ **Interactive** — smooth Leaflet pan / zoom (+/- control) and rich hover
  tooltips (origin, attack types, severity breakdown, target assets, volume).
- 🧮 **Auto-aggregation** — rows sharing a source/destination are merged
  (volume summed) so the animation stays smooth on large datasets.
- 🗺️ **Self-contained** — bundles Natural Earth 1:50m geometry; **no external
  tile/network calls** at runtime, so it renders reliably inside Sigma.
- ⚙️ **Configurable** — arc/land/border/label colors, flow speed, labels,
  legend, and a default destination (name + lat/lon) are editor-panel options.

### Editor panel options

| Option | Type | Description |
| --- | --- | --- |
| **Data source** | element | The Sigma element providing the rows. |
| **Source latitude / longitude** | column | Origin coordinates (required). |
| **Source label** | column | Origin country / city for tooltips. |
| **Destination latitude / longitude** | column | Optional; omit to use the default destination for every arc. |
| **Destination label** | column | Optional destination name for tooltips. |
| **Severity** | column | Critical → Low; drives the orange accents. |
| **Attack volume / count** | column | Scales arc thickness; summed per route. |
| **Attack type / Target asset** | column | Shown in tooltips. |
| **Default destination name / lat,lon** | text | Fallback destination (defaults to `Saudi Arabia` / `24.7136, 46.6753`). |
| **Arc / Ocean / Land / Border / Label color** | color | Theme overrides. |
| **Flow speed** | dropdown | Slow / Medium / Fast. |
| **Accent arcs by severity** | toggle | Brighter/thicker/faster for higher-severity routes. |
| **Show country labels / legend** | toggle | Map labels and the severity legend. |
| **Auto-fit to data** | toggle | Frame the map to the bound points on load. |

### How the flow & severity work

Rows are aggregated into one arc per source→destination route (and one pulse per
origin), summing the attack volume and keeping a full per-severity breakdown for
the tooltip. A route's accent severity is its **volume-weighted mean severity**
rounded to the nearest bucket, so a mostly-medium route reads cooler than a
mostly-critical one. Arc width scales with volume; brightness, flow speed and
pulse size scale with the accent severity — all within the orange family.

---

## Segmented Bar Meter

URL: **`https://ysigma.github.io/Sigma-Plugins/segmented-bar/`**

A horizontal gauge: a bar split into **four colored sections** with a **value
marker** (needle + value pill) that sits at the right spot across a numeric
scale. You define the **min and max** of the whole bar, the **three thresholds**
that split it into sections, and the **color** of each section. Great for
"current level vs. thresholds" displays (risk/threat level, SLA, score, etc.).

### Features

- 🎨 **4 section colors** — each picked from Sigma's color palette (sensible
  green → red defaults if left blank).
- 📐 **Custom thresholds** — type the three cut-points; sections can be unequal
  widths. Leave a threshold blank to fall back to an equal quarter of the range.
- 🎯 **Value marker** — a single measure value drives a needle + value pill,
  clamped to the bar ends if it falls outside the range. The needle's core takes
  the color of the section it lands in (or a fixed marker color you choose).
- 🔢 **Scale & threshold labels**, optional **title**, configurable bar
  thickness, decimal places, marker/background/text colors.

### Editor panel options

| Option | Type | Description |
| --- | --- | --- |
| **Data source** | element | The Sigma element providing the data. |
| **Value (measure)** | column | Numeric measure; the first value positions the marker. |
| **Scale minimum / maximum** | text | The numeric range of the whole bar (default `0` / `100`). |
| **Threshold 1 / 2 / 3** | text | Section boundaries. Blank → ¼ / ½ / ¾ of the range. |
| **Section 1–4 color** | color | Color for each of the four sections (left → right). |
| **Title** | text | Optional title shown above the bar. |
| **Show value label** | toggle | Show/hide the value pill on the marker. |
| **Show scale & threshold labels** | toggle | Show/hide min/threshold/max ticks and numbers. |
| **Decimal places** | dropdown | `Auto` or a fixed number of decimals. |
| **Bar thickness (px)** | dropdown | Height of the bar. |
| **Marker color** | color | Overrides the marker core color (blank = section color). |
| **Background / Text color** | color | Plugin background and text color (auto-contrast by default). |

### Standalone demo

Opening the URL directly (outside Sigma) shows a demo that mirrors the reference
design (value `25` on a 0–100 scale). Query params preview variants:
`?value=72&min=0&max=100&t=31,57,79&colors=3aa655,c9b13a,e08a3c,cf4436&title=Score&light=1`.

## Circle Grid

URL: **`https://ysigma.github.io/Sigma-Plugins/circle/`**

A responsive grid of **high-definition rings**, one per value of a dimension,
each with its **label centered inside** the ring and an optional **measure
drawn below** it — matching the gold-rings-on-black reference design. A
**single color control** drives the rings, their labels, and the values
together, so the whole grid stays on one palette.

### Features

- ⭕ **Crisp SVG rings** — scale to any size without blurring; ring thickness is
  proportional so circles read consistently at every size.
- 🔤 **Label inside, measure below** — bind a dimension for the labels and
  (optionally) a measure for the number under each ring. Labels wrap only at
  spaces (whole words are never split mid-character), and **Auto-fit** shrinks
  each label just enough to stay inside its ring. A **Label text size** control
  also offers fixed sizes for manual control.
- 🎨 **One color, everything** — a single color selector colors the rings,
  labels, and values in unison (defaults to the reference gold). A separate
  background control defaults to near-black to match the wireframe, and the
  setup chrome auto-themes for light or dark backgrounds.
- 🧱 **Responsive layout** — auto-fit columns (or a fixed 1–6) and Small /
  Medium / Large circle sizes; the grid centers when it fits and scrolls when it
  doesn't.

### Editor panel options

| Option | Type | Description |
| --- | --- | --- |
| **Data source** | element | The Sigma element providing the data. |
| **Label (dimension)** | column | One circle is drawn per row; this text goes inside the ring. |
| **Measure** | column | Optional numeric measure drawn below each ring. |
| **Color — rings, labels & values** | color | The single color applied to rings, labels, and values. |
| **Background color** | color | Plugin background (defaults to near-black; falls back to the workbook style). |
| **Circle size** | dropdown | Extra small / Small / Medium / Large / Extra large. |
| **Circle size override (px)** | text | Optional exact diameter in px (24–600); overrides the dropdown. |
| **Label text size** | dropdown | `Auto-fit` (shrink each label to fit its ring) or fixed Small / Medium / Large / Extra large. |
| **Columns** | dropdown | `Auto` (fit to width) or a fixed 1–6. |
| **Ring thickness** | dropdown | Thin / Medium / Thick. |
| **Show measure below circle** | toggle | Show/hide the value under each ring. |
| **Uppercase labels** | toggle | Render labels in uppercase. |
| **Decimal places** | dropdown | `Auto` or a fixed number of decimals. |

### Standalone demo

Opening the URL directly (outside Sigma) shows a demo that mirrors the reference
design (Departments and their open-item counts). Query params preview variants:
`?color=2f6fd0&bg=ffffff&cols=4&thick=Thick&size=Small&px=72&lsize=Auto-fit&upper=1`.

## Assessment Dot Plot

URL: **`https://ysigma.github.io/Sigma-Plugins/assessment/`**

A categorical **dot plot** for tracking each item (e.g. a tech platform) through a
pipeline of stages. It takes **two dimensions**: a **Platform** dimension on the
**rows** (one row per value) and a **Stage** dimension on the **x-axis**. Each
platform's circle is drawn in the column matching its stage value — so dropping
in or re-pointing the **Stage** column moves the circle to that stage. Matches the
PIF assurance reference (Secure Design → Security Assessments → Remediation).

### Features

- ⏺ **Two-dimension placement** — platforms list down the left; each gets one
  circle positioned in its stage's column. Change a row's stage and the dot moves.
- 🎨 **Customizable color** — pick a swatch from the palette (Gold, Amber, Blue,
  Teal, Green, Red, Orange, Purple, Pink, Slate) or set an exact custom hex. The
  canvas auto-themes (light/dark) from the background, falling back to the
  workbook style.
- 📏 **Customizable circle size** — Extra small → Extra large, or an exact px-radius
  override.
- 📜 **Fits any list** — columns stay aligned; when there are more platforms than
  fit, the plot scrolls vertically while the x-axis stays pinned at the bottom.
- 🔎 **Hover tooltips** with the platform name and its stage. Platforms with no
  stage value are listed (no circle) and counted in a small notice.

### Editor panel options

| Option | Type | Description |
| --- | --- | --- |
| **Data source** | element | The Sigma element providing the data. |
| **Platform (dimension)** | column | One row per distinct value, listed down the Y axis. |
| **Stage (dimension)** | column | Decides which column each platform's circle sits in. |
| **Stage order (left → right)** | text | Optional comma-separated column order, e.g. `Secure Design, Security Assessments, Remediation`. Stages not listed are appended in first-seen order. |
| **Circle color (palette)** | dropdown | Named swatch for the circles. |
| **Circle color (custom override)** | color | A custom hex color that overrides the palette swatch. |
| **Background color** | color | Plugin background (defaults to near-black; falls back to the workbook style). |
| **Circle size** | dropdown | Extra small / Small / Medium / Large / Extra large. |
| **Circle size override (px radius)** | text | Optional exact radius in px (2–40); overrides the dropdown. |
| **Show gridlines** | toggle | Faint row/column gridlines. |

### Standalone demo

Opening the URL directly (outside Sigma) shows a demo that mirrors the reference
dashboard (platforms across the three assessment stages). Query params preview
variants: `?color=4e79a7&bg=ffffff&size=Large&px=12&grid=0`.

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
