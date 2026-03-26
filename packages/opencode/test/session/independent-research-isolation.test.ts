import { afterEach, expect, spyOn, test } from "bun:test"
import path from "path"
import { Agent } from "../../src/agent/agent"
import { Instance } from "../../src/project/instance"
import { Provider } from "../../src/provider/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import * as LLMModule from "../../src/session/llm"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionPrompt } from "../../src/session/prompt"
import { MessageID } from "../../src/session/schema"
import { tmpdir } from "../fixture/fixture"

afterEach(async () => {
  await Instance.disposeAll()
})

test("isolated prompts store raw text without file expansion", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await Bun.write(path.join(dir, "foo.ts"), "export const secret = 1\n")
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const session = await Session.create({})
      const msg = await SessionPrompt.prompt({
        sessionID: session.id,
        agent: "independent-research",
        isolated: true,
        noReply: true,
        parts: [{ type: "text", text: "Research this claim @foo.ts" }],
      })

      if (msg.info.role !== "user") throw new Error("expected user message")
      expect(msg.info.isolated).toBe(true)

      const stored = await MessageV2.get({
        sessionID: session.id,
        messageID: msg.info.id,
      })

      expect(stored.parts).toHaveLength(1)
      expect(stored.parts[0]).toMatchObject({
        type: "text",
        text: "Research this claim @foo.ts",
      })
      if (stored.parts[0].type === "text") {
        expect(stored.parts[0].synthetic).toBeUndefined()
      }
    },
  })
})

test("isolated independent-research omits env and instruction injection", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await Bun.write(path.join(dir, "AGENTS.md"), "repo instructions that must not leak\n")
      await Bun.write(path.join(dir, "foo.ts"), "export const secret = 1\n")
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const agent = await Agent.get("independent-research")
      if (!agent) throw new Error("missing independent-research agent")

      const model = {
        id: ModelID.make("gpt-test"),
        providerID: ProviderID.make("openai"),
        api: {
          id: "gpt-test",
          url: "https://example.com",
          npm: "@ai-sdk/openai",
        },
        name: "Test Model",
        capabilities: {
          temperature: true,
          reasoning: false,
          attachment: false,
          toolcall: true,
          input: { text: true, audio: false, image: false, video: false, pdf: false },
          output: { text: true, audio: false, image: false, video: false, pdf: false },
          interleaved: false,
        },
        cost: {
          input: 0,
          output: 0,
          cache: { read: 0, write: 0 },
        },
        limit: {
          context: 200000,
          output: 4000,
        },
        status: "active" as const,
        options: {},
        headers: {},
        release_date: "2025-01-01",
      } satisfies Provider.Model

      const getModel = spyOn(Provider, "getModel").mockImplementation(async () => model)
      let captured: LLMModule.LLM.StreamInput | undefined
      const stream = spyOn(LLMModule.LLM, "stream").mockImplementation(async (input) => {
        captured = input
        throw new Error("stop")
      })

      const parent = await Session.create({})
      const session = await Session.create({ parentID: parent.id })

      await SessionPrompt.prompt({
        sessionID: session.id,
        agent: "independent-research",
        isolated: true,
        parts: [{ type: "text", text: "Research this claim @foo.ts" }],
      }).catch(() => undefined)

      expect(captured).toBeDefined()
      expect(captured?.user.isolated).toBe(true)
      expect(captured?.agent.prompt).toBe(agent.prompt)
      expect(captured?.system).toEqual([])

      const user = captured?.messages.find((msg) => msg.role === "user")
      const text = Array.isArray(user?.content)
        ? user.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")
        : String(user?.content ?? "")

      expect(text).toContain("Research this claim @foo.ts")
      expect(text.includes("export const secret = 1")).toBe(false)
      expect(text.includes("repo instructions that must not leak")).toBe(false)

      stream.mockRestore()
      getModel.mockRestore()
    },
  })
})
