import { writeFile } from 'node:fs/promises'
import path from 'path'
import { parseFromFiles } from '@ts-ast-parser/core'
import * as esbuild from 'esbuild'
import { getTsconfig } from 'get-tsconfig'

// @ts-ignore
import { componentize } from '@bytecodealliance/componentize-js'

/**
 * @param {import('@ts-ast-parser/core').Type} type
 * @returns {string}
 */
function primitiveType(type) {
  if (type.text === 'string') {
    return 'string'
  }

  if (type.text === 'boolean') {
    return 'bool'
  }

  if (type.text === 'number') {
    return 's64'
  }

  if (type.text === 'Uint8Array') {
    return 'list<u8>'
  }

  if (type.kind === 'Array' && type.elementType) {
    return `list<${primitiveType(type.elementType)}>`
  }

  throw new Error(`Unknown type: ${JSON.stringify(type)}`)
}

/**
 *
 * Generate a WIT file from a TypeScript file
 *
 * @param {string} filePath - Path to a TypeScript file
 */
async function wit(filePath) {
  const cfg = getTsconfig(filePath)
  if (!cfg) {
    throw new Error('No tsconfig found')
  }

  const { project, errors } = await parseFromFiles([filePath], {
    tsConfigFilePath: cfg.path,
  })

  if (errors.length > 0) {
    console.error(errors)
    // Handle the errors

    // process.exit(1)
  }

  const result = project?.getModules().map((m) => m.serialize()) ?? []
  if (result.length > 0) {
    // console.log(
    //   '🚀 ~ file: cli.js:23 ~ reflectedModules:',
    //   JSON.stringify(result, null, 2)
    // )
    const { sourcePath, declarations } = result[0]
    const world = path.basename(sourcePath).replace('.ts', '')
    const exports = declarations.map((d) => {
      if (d.kind === 'Function') {
        /** @type {string[]} */
        const params = d.signatures[0].parameters
          ? d.signatures[0].parameters.map(
              (p) => `${p.name}: ${primitiveType(p.type)}`
            )
          : []
        const name = d.name
        const returnType = primitiveType(d.signatures[0].return.type)

        return `  export ${name}: func(${params.join(', ')}) -> ${returnType};`
      }

      return ''
    })

    const wit = `
package local:${world};

world ${world} {
${exports.join('\n')}
}
    `
    // console.log('🚀 ~ WIT World\n\n', wit)
    return wit
  } else {
    throw new Error('No modules found')
  }
}

/**
 * @param {string} filePath - Path to a TypeScript file
 */
async function bundle(filePath) {
  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
  })
  return result.outputFiles[0].text
}

/**
 * @param {string} filePath - Path to a TypeScript file
 * @param {string} outDir - Path to a directory to write the Wasm component file
 */
export async function build(filePath, outDir = process.cwd()) {
  const outName = path
    .basename(filePath)
    .replace(path.extname(filePath), '.wasm')
  const outPath = path.join(outDir, outName)

  const { component } = await componentize(
    await bundle(filePath),
    await wit(filePath)
  )
  await writeFile(outPath, component)

  return {
    outPath,
  }
}
