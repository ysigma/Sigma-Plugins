# Sigma 3D Globe Plugin

An interactive, rotatable **3D globe** custom plugin for
[Sigma](https://www.sigmacomputing.com/). Drop a **country** dimension and a
**measure** onto it, and the globe paints each country as a choropleth (discrete
color buckets). Hover any country to get a dynamic popup showing the country name
and its value.

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
```
