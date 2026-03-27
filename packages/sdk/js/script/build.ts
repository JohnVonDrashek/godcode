#!/usr/bin/env bun
import { fileURLToPath } from "url"
import { pathToFileURL } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

import { $ } from "bun"
import path from "path"

import { createClient } from "@hey-api/openapi-ts"

const openapi = path.join(dir, "openapi.json")
const { Server } = await import(pathToFileURL(path.join(dir, "../../opencode/src/server/server.ts")).href)

await Bun.write(openapi, JSON.stringify(await Server.openapi(), null, 2))

await createClient({
  input: openapi,
  output: {
    path: "./src/v2/gen",
    tsConfigPath: path.join(dir, "tsconfig.json"),
    clean: true,
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      exportFromIndex: false,
    },
    {
      name: "@hey-api/sdk",
      instance: "OpencodeClient",
      exportFromIndex: false,
      auth: false,
      paramsStructure: "flat",
    },
    {
      name: "@hey-api/client-fetch",
      exportFromIndex: false,
      baseUrl: "http://localhost:4096",
    },
  ],
})

await $`bun prettier --write src/gen`
await $`bun prettier --write src/v2`
await $`rm -rf dist`
await $`bun tsc`
await Bun.file(openapi).delete()
