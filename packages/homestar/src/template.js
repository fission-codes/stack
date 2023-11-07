import { get } from 'object-path'

/**
 * @template {unknown} Value
 * @param {unknown} value
 * @returns {value is Record<PropertyKey, Value>}
 */
export function isPlainObject(value) {
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
 * @param {import('./types.js').WorkflowContext} context
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
 * e.g. "['{{foo:bar}}']" --> { key: "foo", defaultValue: "bar" }
 *
 * @param {string} match
 */
function parameter(match) {
  const matchValue = match.slice(2, 2 + match.length - 4).trim()
  const i = matchValue.indexOf(':')

  const param =
    i === -1
      ? { key: matchValue }
      : {
          key: matchValue.slice(0, Math.max(0, i)),
          defaultValue: matchValue.slice(i + 1),
        }

  return param
}

/**
 * Parses string with handlebars.
 *
 * @param {string } value
 * @param {import('./types.js').WorkflowContext} context
 * @returns {string}
 */
export function parseString(value, context) {
  const regex = /{{(&?\w|:|[\s$()*+,./=?@_-])+}}/g
  const matches = value.match(regex)
  if (matches) {
    // eslint-disable-next-line unicorn/no-array-reduce
    return matches.reduce((acc, match) => {
      const param = parameter(match)
      const paramValue = get(context, param.key, param.defaultValue)

      if (matches.length === 1) {
        if (typeof paramValue === 'function' && paramValue !== undefined) {
          // @ts-ignore
          return paramValue(param.defaultValue)
        }
        return paramValue
      }

      return paramValue === undefined ? acc : acc.replace(match, paramValue)
    }, value)
  }
  return value
}

/**
 * Parses non-leaf-nodes in the template object that are objects.
 *
 * @param {Record<string, any>} object
 * @param {import('./types.js').WorkflowContext} context
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
 * @param {import('./types.js').WorkflowContext} context
 */
function parseArray(array, context) {
  return array.map((i) => parse(i, context))
}
