import { writeFile } from 'node:fs/promises'
import path from 'path'
import { createRequire } from 'node:module'
import { base32 } from 'iso-base/rfc4648'
import * as esbuild from 'esbuild'
import { deleteAsync } from 'del'

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
 * @param {string} filePath - Path to a TypeScript file
 * @param {string} outDir - Path to a directory to write the Wasm component file
 */
export async function build(filePath, outDir = process.cwd()) {
  const pkgPath = require.resolve('@fission-codes/homestar-wit')
  const witPath = path.join(pkgPath, '..', '..', 'wit')
  let witHash

  // Clean up any old WIT files in the wit directory
  // componentize process.exit(1) if it fails so we can't clean up after it
  await deleteAsync([`${witPath}/*.wit`], { force: true })

  try {
    const { hash, src, wasiImports } = await bundle(filePath)
    witHash = base32.encode(hash).toLowerCase()

    // TODO: check the wit hash and only componentize if it has changed
    const witSource = await wit({ filePath, worldName: witHash, wasiImports })
    const witFile = path.join(witPath, `${witHash}.wit`)
    await writeFile(witFile, witSource, 'utf8')
    const { component } = await componentize(src, {
      witPath,
      worldName: witHash,
      // debug: true,
      sourceName: filePath,
    })
    const outPath = path.join(outDir, `${witHash}.wasm`)
    await writeFile(outPath, component)

    return {
      outPath,
      witHash,
    }
  } finally {
    if (witHash) {
      await deleteAsync([path.join(witPath, `${witHash}.wit`)], { force: true })
    }
  }
}
