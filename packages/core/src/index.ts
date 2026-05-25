export { optimize } from './optimize.js'
export { repair } from './repair/index.js'
export { generateLods, countTriangles, DEFAULT_LODS } from './simplify/index.js'
export { compress } from './compress/index.js'
export { buildManifest, writeManifest } from './manifest/index.js'
export type {
  OptimizeOptions,
  OptimizeResult,
  LodConfig,
  RepairOptions,
  CompressOptions,
  OutputOptions,
  Manifest,
  LodEntry,
} from './types.js'
