/* eslint-disable unicorn/no-null */

export const wasmCID = 'QmXne1sj1xsv8wPMxPHLjiEaLwNMPFQfdua3qK9j1rsPNg'
export const imageCID = 'QmZ3VEcAWa2R7SQ7E1Y7Q5fL3Tzu8ijDrs3UkmF7KF2iXT'
export const workflow1 = {
  tasks: [
    {
      cause: null,
      meta: {
        memory: 4_294_967_296,
        time: 100_000,
      },
      prf: [],
      run: {
        input: {
          args: [
            {
              '/': 'bafybeiejevluvtoevgk66plh5t6xiy3ikyuuxg3vgofuvpeckb6eadresm',
            },
            150,
            350,
            500,
            500,
          ],
          func: 'crop',
        },
        nnc: '',
        op: 'wasm/run',
        rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
      },
    },
    {
      cause: null,
      meta: {
        memory: 4_294_967_296,
        time: 100_000,
      },
      prf: [],
      run: {
        input: {
          args: [
            {
              'await/ok': {
                '/': 'bafyrmigev36skyfjnslfswcez24rnrorzeaxkrpb3wci2arfkly5zcrepy',
              },
            },
          ],
          func: 'grayscale',
        },
        nnc: '',
        op: 'wasm/run',
        rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
      },
    },
  ],
}
