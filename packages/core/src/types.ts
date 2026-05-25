export interface OptimizeOptions {
  lods?: LodConfig[]
  repair?: RepairOptions
  compress?: CompressOptions
  output?: OutputOptions
}

export interface LodConfig {
  name: string
  /** 0–1: fraction of triangles to keep */
  ratio: number
  /** 0–1: error threshold (higher = more aggressive) */
  error: number
}

export interface RepairOptions {
  weld?: boolean
  degenerateTriangles?: boolean
  windingOrder?: boolean
  isolatedVertices?: boolean
}

export interface CompressOptions {
  meshopt?: boolean
  quantize?: boolean
  textures?: TextureOptions | false
}

export interface TextureOptions {
  /** Max texture resolution per side. Default: 2048 for lod0, scales down per LOD */
  maxResolution?: number
  /** Target format. Default: webp */
  format?: 'webp' | 'jpeg' | 'png'
  /** Quality 1–100. Default: 85 */
  quality?: number
}

export interface OutputOptions {
  dir: string
  name?: string
}

export interface LodEntry {
  name: string
  file: string
  ratio: number
  triangles: number
  fileSize: number
  textureSizeBytes: number
}

export interface Manifest {
  name: string
  source: {
    triangles: number
    fileSize: number
    textureSizeBytes: number
  }
  lods: LodEntry[]
  createdAt: string
}

export interface OptimizeResult {
  manifest: Manifest
  outputDir: string
}
