/**
 * Curated country labels for the dark basemap.
 *
 * The bundled geometry has no label layer, so we draw a hand-picked set of
 * country names (matching the reference design) onto the animation canvas at
 * their approximate centres. `min` is the lowest map zoom at which a label
 * appears — small countries only show once you zoom in, to avoid clutter at the
 * world view.
 */
export interface MapLabel {
  text: string;
  lat: number;
  lon: number;
  /** Minimum Leaflet zoom at which to show this label (default 0). */
  min?: number;
}

export const COUNTRY_LABELS: MapLabel[] = [
  // North & Central America
  { text: "Canada", lat: 60, lon: -100 },
  { text: "United States", lat: 39.5, lon: -98 },
  { text: "Mexico", lat: 23.5, lon: -102 },
  { text: "Guatemala", lat: 15.6, lon: -90.3, min: 3 },
  { text: "Cuba", lat: 21.7, lon: -78, min: 3 },
  // South America
  { text: "Venezuela", lat: 7, lon: -66 },
  { text: "Colombia", lat: 3.5, lon: -73 },
  { text: "Ecuador", lat: -1.5, lon: -78.2, min: 3 },
  { text: "Peru", lat: -10, lon: -76 },
  { text: "Bolivia", lat: -17, lon: -64 },
  { text: "Brazil", lat: -10, lon: -52 },
  { text: "Argentina", lat: -35, lon: -65 },
  // Europe
  { text: "Norway", lat: 62, lon: 9 },
  { text: "Sweden", lat: 63, lon: 16 },
  { text: "Ireland", lat: 53.3, lon: -8.2 },
  { text: "United Kingdom", lat: 53, lon: -2 },
  { text: "France", lat: 47, lon: 2.2 },
  { text: "Spain", lat: 40, lon: -3.6 },
  { text: "Germany", lat: 51, lon: 10.3 },
  { text: "Poland", lat: 52, lon: 19.3 },
  { text: "Italy", lat: 42.6, lon: 12.8 },
  { text: "Greece", lat: 39.2, lon: 22 },
  { text: "Romania", lat: 46, lon: 25 },
  { text: "Ukraine", lat: 49, lon: 32 },
  { text: "Russia", lat: 61, lon: 92 },
  // Africa
  { text: "Morocco", lat: 32, lon: -6 },
  { text: "Algeria", lat: 28, lon: 3 },
  { text: "Tunisia", lat: 34, lon: 9.5, min: 3 },
  { text: "Libya", lat: 27, lon: 17 },
  { text: "Egypt", lat: 26.5, lon: 30 },
  { text: "Mali", lat: 17.5, lon: -3.5 },
  { text: "Niger", lat: 17, lon: 9 },
  { text: "Chad", lat: 15, lon: 19 },
  { text: "Sudan", lat: 15, lon: 30 },
  { text: "Nigeria", lat: 9.5, lon: 8 },
  { text: "Ghana", lat: 7.9, lon: -1.2 },
  { text: "Cameroon", lat: 5.6, lon: 12.5 },
  { text: "D.R.C.", lat: -2.5, lon: 23.5 },
  { text: "Kenya", lat: 0.5, lon: 37.9 },
  { text: "Ethiopia", lat: 9, lon: 39.5 },
  { text: "Tanzania", lat: -6.3, lon: 35 },
  { text: "Angola", lat: -12, lon: 17.8 },
  { text: "Namibia", lat: -22, lon: 17 },
  { text: "Mozambique", lat: -18, lon: 35.5 },
  { text: "Madagascar", lat: -19.5, lon: 46.8 },
  { text: "South Africa", lat: -29, lon: 24 },
  // Middle East & Central Asia
  { text: "Turkey", lat: 39, lon: 35 },
  { text: "Saudi Arabia", lat: 23.5, lon: 45 },
  { text: "Iraq", lat: 33, lon: 43.5 },
  { text: "Iran", lat: 32.5, lon: 53.5 },
  { text: "Israel", lat: 31.3, lon: 34.9, min: 4 },
  { text: "Yemen", lat: 15.5, lon: 47.6 },
  { text: "Kazakhstan", lat: 48, lon: 67 },
  { text: "Uzbekistan", lat: 41.5, lon: 63.5 },
  { text: "Afghanistan", lat: 33.9, lon: 66.5 },
  { text: "Pakistan", lat: 30, lon: 69 },
  // South & East Asia
  { text: "India", lat: 22.5, lon: 79 },
  { text: "Nepal", lat: 28.3, lon: 84, min: 3 },
  { text: "Sri Lanka", lat: 7.6, lon: 80.8, min: 3 },
  { text: "Mongolia", lat: 46.8, lon: 103 },
  { text: "China", lat: 35.8, lon: 103 },
  { text: "N. Korea", lat: 40.2, lon: 127.2, min: 3 },
  { text: "S. Korea", lat: 36.3, lon: 128, min: 3 },
  { text: "Japan", lat: 36.5, lon: 138 },
  { text: "Taiwan", lat: 23.7, lon: 121, min: 4 },
  { text: "Thailand", lat: 15.5, lon: 101 },
  { text: "Vietnam", lat: 16, lon: 107.8 },
  { text: "Malaysia", lat: 4.2, lon: 102 },
  { text: "Indonesia", lat: -2, lon: 118 },
  { text: "Philippines", lat: 12, lon: 122 },
  // Oceania
  { text: "Papua New Guinea", lat: -6.5, lon: 144, min: 3 },
  { text: "Australia", lat: -25, lon: 134 },
  { text: "New Caledonia", lat: -21.5, lon: 165.5, min: 4 },
];
