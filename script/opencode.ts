import { createOpencodeClient as createLegacyClient } from "@opencode-ai/sdk"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { Instance } from "../packages/opencode/src/project/instance"
import { Server } from "../packages/opencode/src/server/server"

const url = "http://opencode.internal"

export function createOpencode(opts?: { directory?: string }) {
  return {
    client: createOpencodeClient({
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

export function createLegacyOpencode(opts?: { directory?: string }) {
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
