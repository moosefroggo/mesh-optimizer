# mesh-optimizer

A two-part library for optimizing 3D meshes — an offline pipeline that repairs, simplifies, and compresses GLB files, and a zero-config runtime component for Three.js/R3F.

Built specifically for AI-generated meshes (Meshy, Tripo, etc.) which tend to be over-triangulated, contain duplicate vertices, and carry interior geometry the GPU never needs to render.

---

## Packages

| Package | Description |
|---|---|
| [`@mesh-optimizer/core`](./packages/core) | Node.js optimization pipeline |
| [`@mesh-optimizer/cli`](./packages/cli) | CLI wrapper — `mesh-optimizer optimize model.glb` |
| `@mesh-optimizer/react` *(coming soon)* | Zero-config R3F runtime component |
| `@mesh-optimizer/three` *(coming soon)* | Vanilla Three.js runtime |
| `@mesh-optimizer/vite-plugin` *(coming soon)* | Build-time auto-optimization |

---

## What it does

```
input.glb
  ↓  repair         weld duplicate vertices, remove degenerate triangles, prune unused data
  ↓  simplify       generate 3 LOD levels at 50%, 15%, 4% of original triangle count
  ↓  compress       meshopt geometry compression + quantization
  ↓  manifest       JSON file listing LODs with triangle counts and file sizes
```

Coming in later layers:
- UV unwrapping (xatlas) + normal/AO baking → preserves surface detail at lower poly counts
- KTX2/Basis texture compression → biggest file size wins
- Isotropic remeshing → rebuilds clean topology from AI mesh soup
- R3F/Three.js runtime with auto LOD switching and zero decoder setup

---

## CLI

```bash
npx @mesh-optimizer/cli optimize model.glb --out ./public/assets
```

**Options**

| Flag | Default | Description |
|---|---|---|
| `-o, --out <dir>` | `./optimized` | Output directory |
| `-n, --name <name>` | input filename | Base name for output files |
| `--lods <ratios>` | `0.5,0.15,0.04` | Comma-separated LOD ratios |
| `--no-meshopt` | — | Skip meshopt compression |
| `--no-quantize` | — | Skip quantization |

**Example output**

```
Optimizing: DamagedHelmet.glb
Output:     ./public/assets

Source: 15,452 triangles, 3.6MB

lod0       12,112 tri     3.2MB  (-22% poly, -11% size)
lod1        4,624 tri     3.1MB  (-70% poly, -13% size)
lod2        3,556 tri     3.1MB  (-77% poly, -13% size)

Done in 0.2s — manifest: ./public/assets/DamagedHelmet.manifest.json
```

**Output files**

```
public/assets/
├── DamagedHelmet.lod0.glb
├── DamagedHelmet.lod1.glb
├── DamagedHelmet.lod2.glb
└── DamagedHelmet.manifest.json
```

---

## Node API

```ts
import { optimize } from '@mesh-optimizer/core'

const result = await optimize('./model.glb', {
  lods: [
    { name: 'lod0', ratio: 0.5,  error: 0.001 },
    { name: 'lod1', ratio: 0.15, error: 0.01  },
    { name: 'lod2', ratio: 0.04, error: 0.05  },
  ],
  repair: {
    weld: true,
    degenerateTriangles: true,
    isolatedVertices: true,
  },
  compress: {
    meshopt: true,
    quantize: true,
  },
  output: {
    dir: './public/assets',
    name: 'model',
  },
})

console.log(result.manifest)
// {
//   name: 'model',
//   source: { triangles: 15452, fileSize: 3774464 },
//   lods: [ { name: 'lod0', file: 'model.lod0.glb', triangles: 12112, ... }, ... ],
//   createdAt: '2026-05-25T...'
// }
```

---

## Roadmap

- [x] Repair — weld, dedup, degenerate triangle removal
- [x] Simplification — 3 LOD levels via meshopt
- [x] Geometry compression — meshopt + quantization
- [x] Manifest output
- [x] CLI
- [ ] Texture compression — KTX2/Basis Universal
- [ ] UV unwrapping — xatlas
- [ ] Normal map + AO baking — headless WebGL, no Blender required
- [ ] Isotropic remeshing — rebuilds clean topology for AI meshes
- [ ] `@mesh-optimizer/react` — R3F runtime with auto LOD + zero decoder setup
- [ ] `@mesh-optimizer/vite-plugin` — build-time optimization

---

## Development

```bash
git clone https://github.com/moosefroggo/mesh-optimizer
cd mesh-optimizer
npm install
npm run build
```

---

## Why

I was generating 3D models with Meshy for a portfolio site. The output looked great, but the triangle counts made them unusable on the web — too heavy for mobile, too slow to load, not practical.

The existing options were manual (Blender, hours per model) or paid (RapidPipeline, per-model pricing). Nothing open-source handled the full pipeline in one step, so I built it.

AI mesh generators produce meshes that are technically valid but wasteful for real-time use:

- **Over-triangulated** — Meshy outputs the same model at 10–20× the triangle count a renderer needs
- **Duplicate vertices** — seams between mesh islands leave identical vertices that bloat the index buffer and break the simplifier
- **Interior geometry** — closed objects often have full interior surfaces the camera never sees
- **No LODs** — generators output one high-res mesh, leaving all LOD decisions to the developer

This tool automates the pipeline from raw generator output to render-ready asset.

---

## License

MIT
