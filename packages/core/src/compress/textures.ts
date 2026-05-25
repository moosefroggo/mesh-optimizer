import { Document } from '@gltf-transform/core'
import { textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'

export interface TextureCompressOptions {
  /** Max texture resolution per side. Default: 2048 */
  maxResolution?: number
  /** Target format. Default: webp */
  format?: 'webp' | 'jpeg' | 'png'
  /** WebP quality 1–100. Default: 85 */
  quality?: number
}

export async function compressTextures(
  doc: Document,
  options: TextureCompressOptions = {},
): Promise<void> {
  const {
    maxResolution = 2048,
    format = 'webp',
    quality = 85,
  } = options

  const textureCount = doc.getRoot().listTextures().length
  if (textureCount === 0) return

  await doc.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: format,
      resize: [maxResolution, maxResolution],
      // Sharp encoder options passed through
      quality,
    } as Parameters<typeof textureCompress>[0]),
  )
}

/** Returns total byte size of all textures in a document */
export function getTextureSizeBytes(doc: Document): number {
  return doc.getRoot().listTextures().reduce((sum, tex) => {
    return sum + (tex.getImage()?.byteLength ?? 0)
  }, 0)
}
