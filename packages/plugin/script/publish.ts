#!/usr/bin/env bun
import { Script } from "@opencode-ai/script"
import { $ } from "bun"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

await $`bun tsc`
const pkg = (await import("../package.json").then((m) => m.default)) as {
  name: string
  version: string
  dependencies?: Record<string, string>
  exports: Record<string, string | { import: string; types: string }>
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
const sdk = process.env.OPENCODE_PUBLISH_SDK_PACKAGE

for (const [key, value] of Object.entries(pkg.exports)) {
  if (typeof value !== "string") continue
  const file = value.replace("./src/", "./dist/").replace(".ts", "")
  pkg.exports[key] = {
    import: file + ".js",
    types: file + ".d.ts",
  }
}
if (name) pkg.name = name
pkg.version = Script.version
const dep = pkg.dependencies?.["@opencode-ai/sdk"]
if (sdk && dep && pkg.dependencies) {
  delete pkg.dependencies["@opencode-ai/sdk"]
  pkg.dependencies[sdk] = Script.version
}
if (reg) pkg.publishConfig = { registry: reg }
if (repo) pkg.repository = { type: "git", url: repo }
await Bun.write("package.json", JSON.stringify(pkg, null, 2))
await $`bun pm pack && npm publish *.tgz --tag ${Script.channel} --access public`
await Bun.write("package.json", JSON.stringify(original, null, 2))
