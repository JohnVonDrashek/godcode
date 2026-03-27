import { afterEach, expect, test } from "bun:test"
import path from "path"
import { Server } from "../../src/server/server"
import { Filesystem } from "../../src/util/filesystem"
import { resetDatabase } from "../fixture/db"
import { tmpdir } from "../fixture/fixture"

afterEach(async () => {
  await resetDatabase()
})

test("session.agentView exports the exact next request payload", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "holycode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          enabled_providers: ["alibaba"],
          provider: {
            alibaba: {
              options: {
                apiKey: "test-key",
                baseURL: "https://example.com/v1",
              },
            },
          },
          big_picture: "Build a calm project management tool for small teams.",
        }),
      )
    },
  })

  const app = Server.Default()
  const res = await app.request("/session/agent-view", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-opencode-directory": tmp.path,
    },
    body: JSON.stringify({
      agent: "build",
      model: {
        providerID: "alibaba",
        modelID: "qwen-plus",
      },
      parts: [{ type: "text", text: "Investigate the login flow." }],
    }),
  })

  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.request.system.join("\n")).toContain("<big-picture>")
  expect(body.request.system.join("\n")).toContain("Build a calm project management tool")
  expect(JSON.stringify(body.request.messages)).toContain("Investigate the login flow.")
  expect(JSON.stringify(body.request.prompt)).toContain("Investigate the login flow.")
})
