import type { SchemaObject } from 'ajv'

export interface ConfigGlobal {
  config: string
}

export interface ConfigDev extends ConfigGlobal {
  fn: string
  ipfsPort: number
}

export interface Variables {
  fn: string
  schema: SchemaObject
}
