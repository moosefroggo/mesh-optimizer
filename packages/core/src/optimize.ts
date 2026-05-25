import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'

import { repair } from './repair/index.js'
import { generateLods, countTriangles, DEFAULT_LODS } from './simplify/index.js'
import { compress } from './compress/index.js'
import { buildManifest, writeManifest } from './manifest/index.js'
import type { OptimizeOptions, OptimizeResult, LodEntry } from './types.js'

export async function optimize(
  inputPath: string,
  options: OptimizeOptions = {},
): Promise<OptimizeResult> {
  const {
    lods = DEFAULT_LODS,
    repair: repairOptions = {},
    compress: compressOptions = {},
    output = { dir: './optimized' },
  } = options

  await MeshoptDecoder.ready
  await MeshoptEncoder.ready

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    })

  // Read source
  const inputBuffer = await readFile(inputPath)
  const sourceFileSize = (await stat(inputPath)).size
  const doc = await io.readBinary(new Uint8Array(inputBuffer))
  const sourceTriangles = countTriangles(doc)

  // Repair the source document in place
  await repair(doc, repairOptions)

  // Generate LODs — each is an independent cloned document
  const lodDocs = await generateLods(doc, lods)

  // Compress each LOD and write to disk
  const name = output.name ?? basename(inputPath, extname(inputPath))
  const outputDir = output.dir

  await mkdir(outputDir, { recursive: true })

  const lodEntries: LodEntry[] = []

  for (const [lodName, lodDoc] of lodDocs) {
    await compress(lodDoc, compressOptions)

    const glb = await io.writeBinary(lodDoc)
    const fileName = `${name}.${lodName}.glb`
    const filePath = join(outputDir, fileName)
    await writeFile(filePath, glb)

    lodEntries.push({
      name: lodName,
      file: fileName,
      ratio: lods.find(l => l.name === lodName)!.ratio,
      triangles: countTriangles(lodDoc),
      fileSize: glb.byteLength,
    })
  }

  const manifest = buildManifest(name, sourceTriangles, sourceFileSize, lodEntries)
  await writeManifest(manifest, outputDir)

  return { manifest, outputDir }
}
