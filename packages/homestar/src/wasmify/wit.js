import { parseFromFiles, parseFromSource } from '@ts-ast-parser/core'
import { getTsconfig } from 'get-tsconfig'
import kebabCase from 'just-kebab-case'

/**
 * WIT keywords
 */
const witKeywords = new Set([
  'use',
  'type',
  'resource',
  'func',
  'record',
  'enum',
  'flags',
  'variant',
  'static',
  'interface',
  'world',
  'import',
  'export',
  'package',
  'include',
])
/**
 * TS identifier to WIT identifier
 *
 * @param {string} str
 */
function witId(str) {
  const id = kebabCase(str)
  if (witKeywords.has(id)) {
    return `%${id}`
  }
  return id
}

/**
 * Ts type to WIT type
 *
 * @param {import('@ts-ast-parser/core').Type} type
 * @param {string} [msg]
 * @returns {string}
 */
function witType(type, msg = '') {
  if (type.text === 'boolean') {
    return 'bool'
  }
  if (type.text === 'string') {
    return 'string'
  }

  if (type.text === 'number') {
    return 'float64'
  }

  if (type.text === 'bigint') {
    return 's64'
  }

  if (type.text === 'Uint8Array') {
    return 'list<u8>'
  }

  if (type.kind === 'Array' && type.elementType) {
    return `list<${witType(type.elementType, msg)}>`
  }

  if (type.kind === 'Tuple' && type.elements) {
    return `tuple<${type.elements.map((t) => witType(t, msg)).join(', ')}>`
  }

  // @ts-ignore-next-line
  if (type.kind === 'ObjectLiteral' && type.properties) {
    return `record object-literal {${type.properties
      .map((p) => `${witId(p.name)}: ${witType(p.type, msg)}`)
      .join(', ')}}`
  }
  throw new Error(
    `Unsupported type: ${JSON.stringify(type)}${msg ? `\n    ${msg}` : ''}`
  )
}

/**
 *
 * @param {string} name
 * @param {string} loc
 * @param {number} [line]
 */
function msg(name, loc, line) {
  return `at ${name} (${loc}:${line})`
}

/**
 *
 * Generate a WIT file from a TypeScript file/source
 *
 * @param {import('../types').WitOptions} options
 */
export async function wit(options) {
  const { entryPoint: filePath, source, wasiImports, worldName } = options

  /** @type {import('@ts-ast-parser/core').AnalyserResult } */
  let result

  if (source) {
    result = await parseFromSource(source, {
      //   jsProject: true,
    })
  } else if (filePath) {
    const cfg = getTsconfig(filePath)
    if (!cfg) {
      throw new Error('No tsconfig found')
    }

    result = await parseFromFiles([filePath], {
      tsConfigFilePath: cfg.path,
    })
  } else {
    throw new Error('No source or filePath')
  }

  if (result.errors.length > 0) {
    const errors = result.errors.map((e) => {
      let errorType

      // @ts-ignore
      switch (e.category) {
        case 0: {
          errorType = 'Warning'
          break
        }
        case 1: {
          errorType = 'Error'
          break
        }
        case 2: {
          errorType = 'Suggestion'
          break
        }
        case 3: {
          errorType = 'Message'
          break
        }
        default: {
          errorType = 'Unknown'
          break
        }
      }
      return `[${errorType}] ${e.messageText} `
    })
    console.error(errors.join('\n'))
    // throw new Error(`TypeScript errors \n    ${errors.join('\n    ')}`)
  }
  const reflectedModules = result.project?.getModules() ?? []

  if (reflectedModules.length === 0) {
    throw new Error('No modules found')
  }

  const module = reflectedModules[0].serialize()
  const exportNames = module.exports.map((d) => d.name) ?? []
  const declarations =
    /** @type {import('@ts-ast-parser/core').FunctionDeclaration[]} */ (
      module.declarations.filter(
        (d) => exportNames.includes(d.name) && d.kind === 'Function'
      )
    )

  const fns = []

  const loc = filePath ?? '<source>'

  for (const d of declarations) {
    if (d.signatures.length > 1) {
      throw new Error(`Function "${d.name}" has multiple signatures`)
    }
    const name = d.name
    const signature = d.signatures[0]
    const params = signature.parameters
      ? signature.parameters.map(
          (p) => `${p.name}: ${witType(p.type, msg(d.name, loc, p.line))}`
        )
      : []
    const returnType = witType(
      signature.return.type,
      msg(d.name, loc, signature.line)
    )
    fns.push(
      `export ${witId(name)}: func(${params.join(', ')}) -> ${returnType};`
    )
  }

  // WIT World template
  const wit = `
package local:${witId(worldName)};

world ${witId(worldName)} {
  ${[...(wasiImports ?? [])].join('\n  ')}

  ${fns.join('\n  ')}
}`

  //   console.log('🚀 ~ WIT World\n\n', wit)
  return wit
}
