import { createHolycodeClient as createLegacyClient } from "@crusadesoft/sdk"
import { createHolycodeClient } from "@crusadesoft/sdk/v2"
import { Instance } from "../packages/holycode/src/project/instance"
import { Server } from "../packages/holycode/src/server/server"

const url = "http://holycode.internal"

export function createHolycode(opts?: { directory?: string }) {
  return {
    client: createHolycodeClient({
      baseUrl: url,
      directory: opts?.directory ?? process.cwd(),
      fetch: async (input, init) => Server.Default().fetch(new Request(input, init)),
    }),
    server: {
      url,
      close: () => Instance.disposeAll(),
    },
  }
}

export function createLegacyHolycode(opts?: { directory?: string }) {
  return {
    client: createLegacyClient({
      baseUrl: url,
      directory: opts?.directory ?? process.cwd(),
      fetch: async (input, init) => Server.Default().fetch(new Request(input, init)),
    }),
    server: {
      url,
      close: () => Instance.disposeAll(),
    },
  }
}
