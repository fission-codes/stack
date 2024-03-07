// import { log as wasiLog } from 'wasi:logging/logging'

let wasiLog

/**
 * Emit a log message.
 
 A log message has a `level` describing what kind of message is being
 sent, a context, which is an uninterpreted string meant to help
 consumers group similar messages, and a string containing the message
 text.
 * 
 * @param {'trace' | 'debug' | 'info' | 'warn' | 'error' | 'critical' } level
 * @param {string} context
 * @param {string} message
 */
function _log(level, context, message) {
  // eslint-disable-next-line no-console
  console.log(level, context, message)
}

/** @type {typeof _log} */
export const log = wasiLog || _log
