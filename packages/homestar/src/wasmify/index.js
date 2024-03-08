import { writeFile } from 'node:fs/promises'
import fs from 'node:fs'
import path from 'path'
import { createRequire } from 'node:module'
import { base32 } from 'iso-base/rfc4648'
import * as esbuild from 'esbuild'
import { deleteSync } from 'del'

// @ts-ignore
import replacePlugin from 'esbuild-plugin-replace-regex'

// @ts-ignore
import { componentize } from '@bytecodealliance/componentize-js'
import { wit } from './wit.js'

const require = createRequire(import.meta.url)

/**
 * Bundle the js code with WASI support
 *
 * @param {string} filePath - Path to a TypeScript file
 */
async function bundle(filePath) {
  const wasiImports = new Set()
  /** @type {import('esbuild').Plugin} */
  const wasiPlugin = {
    name: 'wasi imports',
    setup(build) {
      // @ts-ignore
      build.onResolve({ filter: /^wasi:.*/ }, (args) => {
        wasiImports.add(`import ${args.path};`)
      })
    },
  }

  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    plugins: [
      replacePlugin({
        filter: /homestar-wit\/src\/logging.js$/,
        patterns: [
          ['let wasiLog', '// let wasiLog'],
          [
            "// import { log as wasiLog } from 'wasi:logging/logging'",
            "import { log as wasiLog } from 'wasi:logging/logging'",
          ],
        ],
      }),
      wasiPlugin,
    ],
    external: ['wasi:*'],
  })
  return {
    src: result.outputFiles[0].text,
    hash: result.outputFiles[0].hash,
    wasiImports,
  }
}

/**
 * Generate wasm component from a TypeScript file
 *
 * @param {import('../types.js').WasmifyOptions} options
 */
export async function build(options) {
  let {
    entryPoint,
    outDir = process.cwd(),
    debug = false,
    worldName,
    witPath,
  } = options

  if (!witPath) {
    const pkgPath = require.resolve('@fission-codes/homestar-wit')
    witPath = path.join(pkgPath, '..', '..', 'wit')
  }

  if (!worldName) {
    worldName = path.basename(entryPoint, path.extname(entryPoint))
  }

  // Clean up any old WIT files in the wit directory
  // componentize process.exit(1) if it fails so we can't clean up after it
  deleteSync([`${witPath}/*.wit`], { force: true })

  let witFile
  try {
    const { hash, src, wasiImports } = await bundle(entryPoint)
    const witHash = base32.encode(hash).toLowerCase()
    const outPath = path.join(outDir, `${worldName}-${witHash}.wasm`)
    witFile = path.join(witPath, `${worldName}-${witHash}.wit`)

    if (!fs.existsSync(outPath)) {
      const witSource = await wit({
        entryPoint,
        worldName,
        wasiImports,
      })
      await writeFile(witFile, witSource, 'utf8')
      const { component } = await componentize(src, {
        witPath,
        worldName,
        debug,
        sourceName: entryPoint,
      })
      await writeFile(outPath, component)
    }

    return {
      outPath,
      witHash,
    }
  } finally {
    if (witFile) {
      deleteSync([witFile], { force: true })
    }
  }
}
