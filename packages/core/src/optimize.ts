import { NodeIO, Logger } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'

import { repair } from './repair/index.js'
import { generateLods, countTriangles, DEFAULT_LODS } from './simplify/index.js'
import { compress } from './compress/index.js'
import { compressTextures, getTextureSizeBytes } from './compress/textures.js'
import { buildManifest, writeManifest } from './manifest/index.js'
import type { OptimizeOptions, OptimizeResult, LodEntry } from './types.js'

// Texture resolution caps per LOD index — lod0 keeps full, lod1 halved, lod2 quartered
const LOD_TEXTURE_RESOLUTION = [2048, 1024, 512]

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
    .setLogger(new Logger(Logger.Verbosity.ERROR))

  // Read source
  const inputBuffer = await readFile(inputPath)
  const sourceFileSize = (await stat(inputPath)).size
  const doc = await io.readBinary(new Uint8Array(inputBuffer))
  const sourceTriangles = countTriangles(doc)
  const sourceTextureSizeBytes = getTextureSizeBytes(doc)

  // Repair source in place
  await repair(doc, repairOptions)

  // Generate LODs
  const lodDocs = await generateLods(doc, lods)

  const name = output.name ?? basename(inputPath, extname(inputPath))
  const outputDir = output.dir

  await mkdir(outputDir, { recursive: true })

  const lodEntries: LodEntry[] = []
  let lodIndex = 0

  for (const [lodName, lodDoc] of lodDocs) {
    // Texture compression — skip if explicitly disabled
    if (compressOptions.textures !== false) {
      const texOpts = compressOptions.textures ?? {}
      const maxResolution = texOpts.maxResolution ?? LOD_TEXTURE_RESOLUTION[lodIndex] ?? 512
      await compressTextures(lodDoc, {
        ...texOpts,
        maxResolution,
      })
    }

    // Geometry compression
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
      textureSizeBytes: getTextureSizeBytes(lodDoc),
    })

    lodIndex++
  }

  const manifest = buildManifest(name, sourceTriangles, sourceFileSize, sourceTextureSizeBytes, lodEntries)
  await writeManifest(manifest, outputDir)

  return { manifest, outputDir }
}
