#!/usr/bin/env bun

import { Script } from "@opencode-ai/script"
import { $ } from "bun"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const pkg = (await import("../package.json").then((m) => m.default)) as {
  name: string
  exports: Record<string, string | object>
  publishConfig?: {
    registry: string
  }
  repository?: {
    type: string
    url: string
  }
}
const original = JSON.parse(JSON.stringify(pkg))
const name = process.env.OPENCODE_PUBLISH_PACKAGE
const reg = process.env.OPENCODE_PUBLISH_REGISTRY
const repo = process.env.OPENCODE_PUBLISH_REPO

function transformExports(exports: Record<string, string | object>) {
  for (const [key, value] of Object.entries(exports)) {
    if (typeof value === "object" && value !== null) {
      transformExports(value as Record<string, string | object>)
    } else if (typeof value === "string") {
      const file = value.replace("./src/", "./dist/").replace(".ts", "")
      exports[key] = {
        import: file + ".js",
        types: file + ".d.ts",
      }
    }
  }
}

transformExports(pkg.exports)
if (name) pkg.name = name
if (reg) pkg.publishConfig = { registry: reg }
if (repo) pkg.repository = { type: "git", url: repo }
await Bun.write("package.json", JSON.stringify(pkg, null, 2))
await $`bun pm pack`
await $`npm publish *.tgz --tag ${Script.channel} --access public`
await Bun.write("package.json", JSON.stringify(original, null, 2))
