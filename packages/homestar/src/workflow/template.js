import pkg from 'object-path'

const { get } = pkg

/**
 * Check if the given value is a plain object.
 *
 * @template {unknown} Value
 * @param {unknown} value
 * @returns {value is Record<PropertyKey, Value>}
 */
function isPlainObject(value) {
  // From: https://github.com/sindresorhus/is-plain-obj/blob/main/index.js
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  )
}

/**
 * Parses the given template object.
 *
 * @template {import('./types.js').TemplateInput} T
 * @template {import('./types.js').TemplateOutput<T>} R
 * @param {T} value
 * @param {Record<string,any>} context
 * @returns {R}
 */
export function parse(value, context) {
  if (Array.isArray(value)) {
    return /** @type {R} */ (parseArray(value, context))
  }

  if (isPlainObject(value)) {
    return /** @type {R} */ (parseObject(value, context))
  }

  if (typeof value === 'string') {
    return /** @type {R} */ (parseString(value, context))
  }

  // @ts-ignore
  return /** @type {R} */ (value)
}

/**
 * Constructs a parameter object from a match result.
 * e.g. "['{{foo}}']" --> { key: "foo" }
 * e.g. "['{{foo:bar}}']" --> { key: "foo", param: "bar" }
 *
 * @param {string }str
 * @returns {{placeholder: string, key: string, param?: string}[]}
 */
function extractMatches(str) {
  const regex = /{{\s*(?:([\w.-]+)|([\w.-]+):(\w+))\s*}}/g
  const matches = [...str.matchAll(regex)]
  return matches.map((match) => {
    return {
      placeholder: match[0],
      key: match[1] || match[2],
      param: match[3],
    }
  })
}

/**
 * Parses string with handlebars.
 *
 * @param {string} value
 * @param {Record<string,any>} context
 * @returns {string}
 */
function parseString(value, context) {
  const matches = extractMatches(value)
  if (matches.length > 0) {
    // eslint-disable-next-line unicorn/no-array-reduce
    return matches.reduce((acc, match) => {
      const { placeholder, key, param } = match
      /** @type {any} */
      const contextValue = get(context, key, param)

      if (contextValue === undefined) {
        throw new Error(`Could not find value for key "${key}" in context`)
      }

      if (matches.length === 1 && placeholder === value) {
        if (typeof contextValue === 'function') {
          return contextValue(param)
        }
        return contextValue
      }

      return acc.replace(
        placeholder,
        typeof contextValue === 'string'
          ? contextValue
          : JSON.stringify(contextValue)
      )
    }, value)
  }
  return value
}

/**
 * Parses non-leaf-nodes in the template object that are objects.
 *
 * @param {Record<string, any>} object
 * @param {Record<string,any>} context
 */
function parseObject(object, context) {
  const children = Object.keys(object).map((key) => ({
    keyTemplate: parseString(key, context),
    valueTemplate: parse(object[key], context),
  }))

  // eslint-disable-next-line unicorn/no-array-reduce
  return children.reduce((newObject, child) => {
    newObject[child.keyTemplate] = child.valueTemplate
    return newObject
  }, /** @type {Record<string, any>} */ ({}))
}

/**
 * Parses non-leaf-nodes in the template object that are arrays.
 *
 * @param {any[]} array
 * @param {Record<string,any>} context
 */
function parseArray(array, context) {
  return array.map((i) => parse(i, context))
}
