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
  .option('--no-meshopt', 'Skip meshopt compression')
  .option('--no-quantize', 'Skip quantization')
  .option('--lods <ratios>', 'Comma-separated LOD ratios, e.g. 0.5,0.15,0.04', '0.5,0.15,0.04')
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

    console.log(`\nOptimizing: ${inputPath}`)
    console.log(`Output:     ${resolve(opts.out)}\n`)

    const start = Date.now()

    const result = await optimize(inputPath, {
      lods,
      compress: {
        meshopt: opts.meshopt !== false,
        quantize: opts.quantize !== false,
      },
      output: {
        dir: resolve(opts.out as string),
        name,
      },
    })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const { manifest } = result

    console.log(`Source: ${manifest.source.triangles.toLocaleString()} triangles, ${formatBytes(manifest.source.fileSize)}`)
    console.log('')

    for (const lod of manifest.lods) {
      const reduction = (100 - (lod.triangles / manifest.source.triangles) * 100).toFixed(0)
      const savings = (100 - (lod.fileSize / manifest.source.fileSize) * 100).toFixed(0)
      console.log(
        `${lod.name.padEnd(6)} ${lod.triangles.toLocaleString().padStart(10)} tri  `+
        `${formatBytes(lod.fileSize).padStart(8)}  `+
        `(-${reduction}% poly, -${savings}% size)`
      )
    }

    console.log(`\nDone in ${elapsed}s — manifest: ${result.outputDir}/${manifest.name}.manifest.json`)
  })

program.parse()

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
