import {
  Document,
  Logger,
  Primitive,
} from '@gltf-transform/core'
import {
  weld,
  dedup,
  prune,
} from '@gltf-transform/functions'
import type { RepairOptions } from '../types.js'

export async function repair(doc: Document, options: RepairOptions = {}): Promise<void> {
  doc.setLogger(new Logger(Logger.Verbosity.WARN))
  const {
    weld: doWeld = true,
    degenerateTriangles = true,
    windingOrder = false,
    isolatedVertices = true,
  } = options

  // Merge duplicate accessors, materials, textures
  await doc.transform(dedup())

  if (doWeld) {
    // Merge bitwise-identical vertices — fixes the most common AI-generator artifact
    await doc.transform(weld())
  }

  if (degenerateTriangles) {
    removeDegenerateTriangles(doc)
  }

  if (isolatedVertices) {
    // prune removes unused nodes, accessors, and materials
    await doc.transform(prune())
  }

  if (windingOrder) {
    fixWindingOrder(doc)
  }
}

function removeDegenerateTriangles(doc: Document): void {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      removeDegenerate(prim)
    }
  }
}

function removeDegenerate(prim: Primitive): void {
  const indices = prim.getIndices()
  const position = prim.getAttribute('POSITION')
  if (!indices || !position) return

  const indexArray = indices.getArray()
  if (!indexArray) return

  const kept: number[] = []

  for (let i = 0; i < indexArray.length; i += 3) {
    const a = indexArray[i]
    const b = indexArray[i + 1]
    const c = indexArray[i + 2]

    // Degenerate: two or more indices are identical
    if (a === b || b === c || a === c) continue

    const pa = position.getElement(a, [0, 0, 0])
    const pb = position.getElement(b, [0, 0, 0])
    const pc = position.getElement(c, [0, 0, 0])

    // Degenerate: zero-area triangle (all points on a line or same point)
    if (isZeroArea(pa, pb, pc)) continue

    kept.push(a, b, c)
  }

  if (kept.length === indexArray.length) return

  const TypedArray = indexArray.constructor as new (length: number) => typeof indexArray
  const newArray = new TypedArray(kept.length) as NonNullable<typeof indexArray>
  ;(newArray as unknown as { set(arr: number[]): void }).set(kept)
  indices.setArray(newArray)
}

function isZeroArea(a: number[], b: number[], c: number[]): boolean {
  // Cross product of (b-a) and (c-a) — zero length means degenerate
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2]
  const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2]
  const cx = aby * acz - abz * acy
  const cy = abz * acx - abx * acz
  const cz = abx * acy - aby * acx
  return cx * cx + cy * cy + cz * cz < 1e-16
}

function fixWindingOrder(_doc: Document): void {
  // Placeholder — consistent winding order requires a manifold check
  // which is non-trivial; will be implemented in the remesh layer
}
