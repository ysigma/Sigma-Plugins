# Sigma Plugins

This repo hosts two [Sigma](https://www.sigmacomputing.com/) custom plugins, built
from one Vite project and deployed as **separate URLs**:

- **3D Globe** — `index.html` (the site root)
- **Apdex badge** — `apdex.html`

Register each URL with Sigma independently (see
[Register a plugin](#register-the-plugin-with-sigma)).

---

## 3D Globe plugin

An interactive, rotatable **3D globe** custom plugin. Drop a **country** dimension
and a **measure** onto it, and the globe paints each country as a choropleth
(discrete color buckets). Hover any country to get a dynamic popup showing the
country name and its value.

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

## Apdex badge plugin

A compact **KPI badge / pill** (`apdex.html`) that shows a single **measure** with
its label and a **category** dimension — e.g. `Overall Apdex  0.92 · Excellent`.
The border and text color are **driven by a condition on the category**: define a
color per category value (green for *Excellent*, red for *Poor*, …) and the badge
recolors automatically as the value changes. The border and the label/category text
share one accent color (they're linked); only the number has its own color, and the
background can also be set per condition.

### Editor panel options

| Option | Type | Description |
| --- | --- | --- |
| **Data source** | element | The Sigma element providing the data. |
| **Value (measure)** | column | The numeric measure shown as the big number. |
| **Category (dimension)** | column | Drives the conditional colors and the trailing label. |
| **Label** | text | Text before the number. Defaults to the value column's name. |
| **Decimal places** | dropdown | `Auto`, or 0–4 fixed decimals. |
| **Show category** | toggle | Show/hide the trailing category text. |
| **Category separator** | text | Character before the category (default `·`). |
| **Size** | dropdown | Small / Medium / Large. |
| **Border width (px)** | dropdown | 0–4. |
| **Corner radius (px)** | dropdown | 0–20, or fully rounded (`999`). |
| **Value (number) color** | color | Color of the number (default white). |
| **Default colors** | color ×2 | Accent + background used when no condition matches. |
| **Condition 1–6** | text + color ×2 | Per slot: the category value to match, plus its border/text and background colors. |

Conditions are matched against the category value case- and whitespace-insensitively;
the **first match wins**. The standard Apdex tiers (*Excellent, Good, Fair, Poor,
Unacceptable*) are prefilled and get sensible built-in colors out of the box, so you
only pick colors where you want to override them.

> Preview the badge standalone at `http://localhost:3000/apdex.html` (it shows demo
> data). Append e.g. `?category=Poor&value=0.45&label=My%20KPI` to preview other states.

## Local development

```bash
npm install
npm run dev        # serves on http://localhost:3000
```

> The dev server runs on port **3000** to match Sigma's **Plugin Dev Playground**
> default URL (`http://localhost:3000`). The globe is at `/` and the Apdex badge is
> at `/apdex.html`.

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
2. A Sigma **Org Admin** registers each plugin with its **Production URL**
   (Administration → Plugins → Register) — the globe at the site root
   (`https://your-site.netlify.app/`) and the Apdex badge at
   `https://your-site.netlify.app/apdex.html`. See
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
index.html              # 3D Globe entry page
apdex.html              # Apdex badge entry page
src/
  main.tsx              # globe entry: registers editor panel, mounts <App/>
  App.tsx               # reads Sigma config/data, builds the country->value map
  components/
    GlobeView.tsx       # the react-globe.gl globe + hover handling
    Legend.tsx          # stepped bucket legend
    EmptyState.tsx      # setup instructions until configured
  lib/
    sigmaConfig.ts      # globe editor panel definition
    countries.ts        # auto-detect country -> ISO numeric matching
    geo.ts              # TopoJSON -> GeoJSON features + label centroids
    color.ts            # discrete bucket color scale + legend (shared helpers)
    format.ts           # number formatting
  apdex/                # Apdex badge plugin
    main.tsx            # entry: registers editor panel, mounts <ApdexApp/>
    ApdexApp.tsx        # reads config/data, renders the badge
    sigmaConfig.ts      # editor panel definition (value, category, conditions)
    colors.ts           # condition → accent/background color resolution
    styles.css          # badge styling
```
