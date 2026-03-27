import { afterEach, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Server } from "../../src/server/server"
import { Filesystem } from "../../src/util/filesystem"
import { resetDatabase } from "../fixture/db"
import { tmpdir } from "../fixture/fixture"

afterEach(async () => {
  await resetDatabase()
})

test("config.big-picture endpoint writes to project root holycode config", async () => {
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

  const app = Server.Default()
  const res = await app.request("/config/big-picture", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-holycode-directory": path.join(tmp.path, "src"),
    },
    body: JSON.stringify({
      big_picture: "Build a calm project management tool for small teams.",
    }),
  })

  expect(res.status).toBe(200)
  expect(await res.json()).toBe(true)
  expect(await Filesystem.readJson<Record<string, unknown>>(path.join(tmp.path, "holycode.json"))).toEqual({
    $schema: "https://holycode.ai/config.json",
    model: "test/model",
    big_picture: "Build a calm project management tool for small teams.",
  })
})
