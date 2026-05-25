import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Manifest, LodEntry } from '../types.js'

export async function writeManifest(
  manifest: Manifest,
  outputDir: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true })
  const filePath = join(outputDir, `${manifest.name}.manifest.json`)
  await writeFile(filePath, JSON.stringify(manifest, null, 2), 'utf-8')
  return filePath
}

export function buildManifest(
  name: string,
  sourceTriangles: number,
  sourceFileSize: number,
  lods: LodEntry[],
): Manifest {
  return {
    name,
    source: {
      triangles: sourceTriangles,
      fileSize: sourceFileSize,
    },
    lods,
    createdAt: new Date().toISOString(),
  }
}
