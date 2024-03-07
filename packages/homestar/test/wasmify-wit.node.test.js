import { assert, suite } from 'playwright-test/taps'
import { wit } from '../src/wasmify/wit.js'

const { test } = suite('wasmify-wit')

test('should create wit', async function () {
  const src = await wit({
    source: `
const foo = true;
export { foo };
export const bar = 1; 
export function baz() { return 1; };
export function bazType(): number { return 1; }; 
export function addType(n: number, n1: number): number { return 1; }; 
export const cb = (a:number) => a + 1;

      `,
    wasiImports: new Set(),
    worldName: 'foo',
  })

  assert.equal(
    src,
    `
package local:foo;

world foo {
  

  export baz: func() -> float64;
  export baz-type: func() -> float64;
  export add-type: func(n: float64, n1: float64) -> float64;
  export cb: func(a: float64) -> float64;
}`
  )
})

test('should throws with multiple signatures', async function () {
  await assert.rejects(
    () => {
      return wit({
        source: `
function multiply(a: number, b: number): number;
function multiply(a: string, b: number): string;
function multiply(a: any, b: any): any {
  if (typeof a === "number" && typeof b === "number") {
    return a * b;
  } else {
    return a.repeat(b);
  }
}

export { multiply };
      `,
        worldName: 'foo',
      })
    },
    {
      message: 'Function "multiply" has multiple signatures',
    }
  )
})

test('should throws any type', async function () {
  await assert.rejects(
    () => {
      return wit({
        source: `export const cb = (a) => a + 1;`,
        worldName: 'foo',
      })
    },
    {
      message:
        'Unsupported type: {"text":"any","kind":"Intrinsic"}\n    at cb (<source>:1)',
    }
  )
})

test('should throws unknown type', async function () {
  await assert.rejects(
    () => {
      return wit({
        source: `export const cb = (a: number): unknown => a + 1;`,
        worldName: 'foo',
      })
    },
    {
      message:
        'Unsupported type: {"text":"unknown","kind":"Unknown"}\n    at cb (<source>:1)',
    }
  )
})

test('should support bigint', async function () {
  const src = await wit({
    source: `export function cb(a: bigint): bigint { return a + 1n; }`,
    worldName: 'foo',
  })

  assert.equal(
    src,
    `
package local:foo;

world foo {
  

  export cb: func(a: s64) -> s64;
}`
  )
})

test('should support arrays', async function () {
  const src = await wit({
    source: `export function cb(a: bigint): Array<bigint> { return [a + 1n]; }`,
    worldName: 'foo',
  })

  assert.equal(
    src,
    `
package local:foo;

world foo {
  

  export cb: func(a: s64) -> list<s64>;
}`
  )
})

test('should support typedarray', async function () {
  const src = await wit({
    source: `
export function buf(): Uint8Array {
  return new Uint8Array(2)
}`,
    worldName: 'foo',
  })

  assert.equal(
    src,
    `
package local:foo;

world foo {
  

  export buf: func() -> list<u8>;
}`
  )
})

test('should support tuple', async function () {
  const src = await wit({
    source: `export function cb(a: [number, number]): [number, string] { return [a[0], '1']; }`,
    worldName: 'foo',
  })

  assert.equal(
    src,
    `
package local:foo;

world foo {
  

  export cb: func(a: tuple<float64, float64>) -> tuple<float64, string>;
}`
  )
})

test('should support plain objects', async function () {
  const src = await wit({
    source: `

    export type CID = {ss: string};
    export interface Options {
      a: number;
    }
    export function config(a: number) { return { a: a}; }
    `,
    worldName: 'foo',
  })

  assert.equal(
    src,
    `
package local:foo;

world foo {
  

  export config: func(a: float64) -> record object-literal {a: float64};
}`
  )
})
