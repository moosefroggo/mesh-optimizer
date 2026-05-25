export { optimize } from './optimize.js'
export { repair } from './repair/index.js'
export { generateLods, countTriangles, DEFAULT_LODS } from './simplify/index.js'
export { compress } from './compress/index.js'
export { compressTextures, getTextureSizeBytes } from './compress/textures.js'
export { buildManifest, writeManifest } from './manifest/index.js'
export type {
  OptimizeOptions,
  OptimizeResult,
  LodConfig,
  RepairOptions,
  CompressOptions,
  TextureOptions,
  OutputOptions,
  Manifest,
  LodEntry,
} from './types.js'
