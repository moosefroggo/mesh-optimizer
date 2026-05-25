import { Document, Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { simplify, weld } from '@gltf-transform/functions'
import { MeshoptSimplifier, MeshoptDecoder } from 'meshoptimizer'
import type { LodConfig } from '../types.js'

export const DEFAULT_LODS: LodConfig[] = [
  { name: 'lod0', ratio: 0.5,  error: 0.001 },
  { name: 'lod1', ratio: 0.15, error: 0.01  },
  { name: 'lod2', ratio: 0.04, error: 0.05  },
]

/**
 * Produces one cloned, simplified Document per LOD level.
 * The original document is not mutated.
 */
export async function generateLods(
  doc: Document,
  lods: LodConfig[] = DEFAULT_LODS,
): Promise<Map<string, Document>> {
  await MeshoptSimplifier.ready
  await MeshoptDecoder.ready

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

  // Serialize once, re-read per LOD — gltf-transform v4 has no Document.clone()
  const sourceGlb = await io.writeBinary(doc)

  const results = new Map<string, Document>()

  for (const lod of lods) {
    const clone = await io.readBinary(sourceGlb)
    clone.setLogger(new Logger(Logger.Verbosity.ERROR))

    // Re-weld before each simplification pass so the simplifier
    // has merged vertices to collapse — critical for quality
    await clone.transform(weld())

    await clone.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: lod.ratio,
        error: lod.error,
      }),
    )

    results.set(lod.name, clone)
  }

  return results
}

export function countTriangles(doc: Document): number {
  let total = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices()
      if (indices) {
        total += (indices.getArray()?.length ?? 0) / 3
      } else {
        const position = prim.getAttribute('POSITION')
        total += (position?.getCount() ?? 0) / 3
      }
    }
  }
  return total
}
