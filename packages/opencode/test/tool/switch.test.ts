import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { MessageID, type SessionID } from "../../src/session/schema"
import { AgentSwitchTool } from "../../src/tool/switch"
import * as QuestionModule from "../../src/question"
import { Provider } from "../../src/provider/provider"
import type { MessageV2 } from "../../src/session/message-v2"

function ctx(sessionID: SessionID, agent = "build") {
  return {
    sessionID,
    messageID: MessageID.ascending(),
    callID: "call",
    agent,
    abort: AbortSignal.any([]),
    messages: [],
    metadata: () => {},
    ask: async () => {},
  }
}

describe("tool.switch", () => {
  let ask: ReturnType<typeof spyOn>

  beforeEach(() => {
    ask = spyOn(QuestionModule.Question, "ask")
  })

  afterEach(async () => {
    ask.mockRestore()
    await Instance.disposeAll()
  })

  test("agent_switch switches to a custom opted-in agent", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        const root = path.join(dir, ".holycode", "agent")
        await fs.mkdir(root, { recursive: true })
        await Bun.write(
          path.join(root, "holybuild.md"),
          [
            "---",
            "description: Custom builder",
            "mode: primary",
            "switch: true",
            "---",
            "",
            "Use this agent when a custom build workflow is preferred.",
          ].join("\n"),
        )
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await Session.create({})
        const model = await Provider.defaultModel()

        await Session.updateMessage({
          id: MessageID.ascending(),
          sessionID: session.id,
          role: "user",
          time: { created: Date.now() },
          agent: "build",
          model,
          tools: {},
          mode: "build",
        } as unknown as MessageV2.Info)

        ask.mockResolvedValueOnce([["Yes"]])

        const tool = await AgentSwitchTool.init()
        const result = await tool.execute({ agent: "holybuild" }, ctx(session.id))

        expect(result.metadata.agent).toBe("holybuild")

        const msgs = await Session.messages({ sessionID: session.id })
        const msg = msgs.findLast((item) => item.info.role === "user" && item.info.agent === "holybuild")

        expect(msg).toBeDefined()
        expect(msg?.parts.some((part) => part.type === "text" && part.text.includes("holybuild agent"))).toBe(true)
      },
    })
  })

  test("agent_switch rejects non-switchable custom agents", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        const root = path.join(dir, ".holycode", "agent")
        await fs.mkdir(root, { recursive: true })
        await Bun.write(
          path.join(root, "holybuild.md"),
          [
            "---",
            "description: Custom builder",
            "mode: primary",
            "---",
            "",
            "Use this agent when a custom build workflow is preferred.",
          ].join("\n"),
        )
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await Session.create({})
        const tool = await AgentSwitchTool.init()

        await expect(tool.execute({ agent: "holybuild" }, ctx(session.id))).rejects.toThrow(
          'Agent "holybuild" is not a switchable primary agent.',
        )
        expect(ask).not.toHaveBeenCalled()
      },
    })
  })

  test("cli mode registers switch tools by default", async () => {
    const root = path.resolve(import.meta.dir, "../..")
    const script = [
      'const { Instance } = await import("./src/project/instance")',
      'const { ToolRegistry } = await import("./src/tool/registry")',
      'await Instance.provide({ directory: process.cwd(), fn: async () => console.log((await ToolRegistry.ids()).filter((x) => x.includes("switch") || x.includes("plan_")).join(",")) })',
    ].join(";")
    const proc = Bun.spawn(["bun", "--eval", script], {
      cwd: root,
      env: {
        ...process.env,
        OPENCODE_CLIENT: "cli",
      },
      stdout: "pipe",
      stderr: "pipe",
    })

    const out = await new Response(proc.stdout).text()
    const err = await new Response(proc.stderr).text()
    expect(await proc.exited).toBe(0)
    expect(typeof err).toBe("string")
    expect(out).toContain("agent_switch")
    expect(out).toContain("plan_enter")
    expect(out).toContain("plan_exit")
  })
})
