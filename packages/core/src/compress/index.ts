import { Document } from '@gltf-transform/core'
import { meshopt, quantize } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import type { CompressOptions } from '../types.js'

export async function compress(doc: Document, options: CompressOptions = {}): Promise<void> {
  const { meshopt: doMeshopt = true, quantize: doQuantize = true } = options

  await MeshoptEncoder.ready

  if (doQuantize) {
    await doc.transform(
      quantize({
        quantizePosition: 14,
        quantizeNormal: 8,
        quantizeTexcoord: 12,
        quantizeColor: 8,
      }),
    )
  }

  if (doMeshopt) {
    // meshopt transform creates EXTMeshoptCompression and registers the encoder internally
    await doc.transform(
      meshopt({
        encoder: MeshoptEncoder,
        level: 'high',
      }),
    )
  }
}
