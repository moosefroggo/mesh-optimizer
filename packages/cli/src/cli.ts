import { Command } from 'commander'
import { optimize } from '@mesh-optimizer/core'
import { resolve, basename, extname } from 'node:path'

const program = new Command()

program
  .name('mesh-optimizer')
  .description('Optimize 3D meshes — repair, simplify, compress, generate LODs')
  .version('0.1.0')

program
  .command('optimize <input>')
  .description('Optimize a GLB/GLTF file and write LODs + manifest')
  .option('-o, --out <dir>', 'Output directory', './optimized')
  .option('-n, --name <name>', 'Base name for output files (default: input filename)')
  .option('--no-meshopt', 'Skip meshopt geometry compression')
  .option('--no-quantize', 'Skip quantization')
  .option('--no-textures', 'Skip texture compression')
  .option('--texture-format <format>', 'Texture format: webp, jpeg, png (default: webp)')
  .option('--texture-quality <q>', 'Texture quality 1–100 (default: 85)', '85')
  .option('--texture-max-res <px>', 'Max texture resolution for lod0 (default: 2048)', '2048')
  .option('--lods <ratios>', 'Comma-separated LOD ratios', '0.5,0.15,0.04')
  .action(async (input: string, opts) => {
    const inputPath = resolve(input)
    const name = opts.name ?? basename(inputPath, extname(inputPath))

    const ratios = (opts.lods as string).split(',').map(Number)
    const errors = [0.001, 0.01, 0.05]
    const lodNames = ['lod0', 'lod1', 'lod2']

    const lods = ratios.map((ratio, i) => ({
      name: lodNames[i] ?? `lod${i}`,
      ratio,
      error: errors[i] ?? 0.05,
    }))

    const textureOptions = opts.textures === false
      ? false
      : {
          format: (opts.textureFormat ?? 'webp') as 'webp' | 'jpeg' | 'png',
          quality: parseInt(opts.textureQuality as string, 10),
          maxResolution: parseInt(opts.textureMaxRes as string, 10),
        }

    console.log(`\nOptimizing: ${inputPath}`)
    console.log(`Output:     ${resolve(opts.out)}\n`)

    const start = Date.now()

    const result = await optimize(inputPath, {
      lods,
      compress: {
        meshopt: opts.meshopt !== false,
        quantize: opts.quantize !== false,
        textures: textureOptions,
      },
      output: {
        dir: resolve(opts.out as string),
        name,
      },
    })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const { manifest } = result
    const srcTex = manifest.source.textureSizeBytes

    console.log(
      `Source: ${manifest.source.triangles.toLocaleString()} tri, ` +
      `${formatBytes(manifest.source.fileSize)} total, ` +
      `${formatBytes(srcTex)} textures`
    )
    console.log('')
    console.log('LOD      Triangles      Size    Textures   Poly↓   Size↓')
    console.log('─'.repeat(60))

    for (const lod of manifest.lods) {
      const polyPct  = (100 - (lod.triangles / manifest.source.triangles) * 100).toFixed(0)
      const sizePct  = (100 - (lod.fileSize / manifest.source.fileSize) * 100).toFixed(0)
      const texBytes = formatBytes(lod.textureSizeBytes)
      console.log(
        `${lod.name.padEnd(6)}  ` +
        `${lod.triangles.toLocaleString().padStart(10)}  ` +
        `${formatBytes(lod.fileSize).padStart(8)}  ` +
        `${texBytes.padStart(8)}  ` +
        `${(polyPct + '%').padStart(6)}  ` +
        `${(sizePct + '%').padStart(6)}`
      )
    }

    console.log(`\nDone in ${elapsed}s`)
    console.log(`Manifest: ${result.outputDir}/${manifest.name}.manifest.json`)
  })

program.parse()

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
