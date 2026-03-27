import path from "path"
import { afterEach, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { SystemPrompt } from "../../src/session/system"
import { tmpdir } from "../fixture/fixture"

afterEach(async () => {
  await Instance.disposeAll()
})

test("loads project big picture from config as a dedicated system layer", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "holycode.json"),
        JSON.stringify({
          $schema: "https://holycode.ai/config.json",
          big_picture: "Build a calm project management tool for small teams that reduces coordination overhead.",
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const text = await SystemPrompt.picture()
      expect(text).toContain("<big-picture>")
      expect(text).toContain("reduces coordination overhead")
    },
  })
})
