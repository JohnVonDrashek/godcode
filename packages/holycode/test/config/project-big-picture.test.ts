import { expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Config } from "../../src/config/config"
import { Instance } from "../../src/project/instance"
import { Filesystem } from "../../src/util/filesystem"
import { tmpdir } from "../fixture/fixture"

test("writes project big picture to root holycode config", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await fs.mkdir(path.join(dir, "src"), { recursive: true })
      await Filesystem.write(
        path.join(dir, "holycode.json"),
        JSON.stringify({
          $schema: "https://holycode.ai/config.json",
          model: "test/model",
        }),
      )
    },
  })

  await Instance.provide({
    directory: path.join(tmp.path, "src"),
    fn: async () => {
      await Config.updateProject({
        big_picture: "Build a calm project management tool for small teams.",
      })

      expect(await Filesystem.readJson<Record<string, unknown>>(path.join(tmp.path, "holycode.json"))).toEqual({
        $schema: "https://holycode.ai/config.json",
        model: "test/model",
        big_picture: "Build a calm project management tool for small teams.",
      })
      expect(await Filesystem.exists(path.join(tmp.path, "src", "config.json"))).toBe(false)
    },
  })
})
