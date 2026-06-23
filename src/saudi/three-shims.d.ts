// `three` (0.184) ships no bundled .d.ts and we deliberately avoid pulling in a
// version-pinned @types/three. The 3D map code uses the three API directly and
// is verified by building/running, mirroring how the globe plugin treats its
// three-backed globe ref as `any`.
declare module "three";
declare module "three/examples/jsm/controls/OrbitControls.js";
