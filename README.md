# Sigma Custom Plugins

A small collection of custom [Sigma](https://www.sigmacomputing.com/) plugins,
built and published together as a single multi-page static site. **Each plugin
has its own URL** — register whichever ones you need with your Sigma org.

| Plugin | Live URL | What it does |
| --- | --- | --- |
| **3D Globe** | `https://ysigma.github.io/Sigma-Plugins/` | Rotatable globe choropleth colored by a tier/measure, with hover tooltips. |
| **Segmented Bar Meter** | `https://ysigma.github.io/Sigma-Plugins/segmented-bar/` | A 4-section colored threshold bar with a value marker positioned across a min→max scale. |

> Open either URL directly in a browser to see a self-contained **demo** (sample
> data); embed it in Sigma for live data.

---

## 3D Globe

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

## Segmented Bar Meter

A horizontal gauge: a bar split into **four colored sections** with a **value
marker** (needle + value pill) that sits at the right spot across a numeric
scale. You define the **min and max** of the whole bar, the **three thresholds**
that split it into sections, and the **color** of each section. Great for
"current level vs. thresholds" displays (risk/threat level, SLA, score, etc.).

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

> URL preview params (when opened standalone) let you tweak the demo:
> `?value=72&min=0&max=100&t=31,57,79&colors=3aa655,c9b13a,e08a3c,cf4436&title=Score&light=1`.

## Local development

```bash
npm install
npm run dev        # serves on http://localhost:3000  (3D Globe at /, bar at /segmented-bar/)
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

This is a **multi-page Vite build**: each plugin is its own HTML entry point and
is emitted to its own folder in `dist/`, so each gets a distinct URL.

```
index.html              # 3D Globe entry (served at /)
src/                     # 3D Globe source
  main.tsx              # entry: registers editor panel, mounts <App/>
  App.tsx               # reads Sigma config/data, builds the country->value map
  components/           # GlobeView, Legend, EmptyState
  lib/                  # sigmaConfig, countries, geo, color, format

segmented-bar/           # Segmented Bar Meter (served at /segmented-bar/)
  index.html            # entry HTML for this plugin
  main.tsx              # registers editor panel, mounts <App/>
  App.tsx               # reads Sigma config/data; scale, thresholds, value
  SegmentedBar.tsx      # the colored bar + value marker
  EmptyState.tsx        # setup instructions until configured
  sigmaConfig.ts        # editor panel definition
  format.ts             # number formatting
  styles.css            # plugin styles
```

Both entry points are declared in `vite.config.ts` (`build.rollupOptions.input`).
