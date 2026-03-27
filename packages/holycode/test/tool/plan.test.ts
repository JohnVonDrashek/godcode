import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { PlanEnterTool } from "../../src/tool/plan"
import * as QuestionModule from "../../src/question"
import { Provider } from "../../src/provider/provider"
import type { MessageV2 } from "../../src/session/message-v2"

describe("tool.plan", () => {
  let ask: ReturnType<typeof spyOn>

  beforeEach(() => {
    ask = spyOn(QuestionModule.Question, "ask")
  })

  afterEach(async () => {
    ask.mockRestore()
    await Instance.disposeAll()
  })

  test("plan_enter switches the session to plan mode after approval", async () => {
    await using tmp = await tmpdir()

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

        const tool = await PlanEnterTool.init()
        const result = await tool.execute(
          {},
          {
            sessionID: session.id,
            messageID: MessageID.ascending(),
            callID: "call",
            agent: "build",
            abort: AbortSignal.any([]),
            messages: [],
            metadata: () => {},
            ask: async () => {},
          },
        )

        expect(result.title).toBe("Switching to plan agent")

        const msgs = await Session.messages({ sessionID: session.id })
        const msg = msgs.findLast((item) => item.info.role === "user" && item.info.agent === "plan")

        expect(msg).toBeDefined()
        expect(msg?.parts.some((part) => part.type === "text" && part.text.includes("enter plan mode"))).toBe(true)
      },
    })
  })

  test("plan_enter aborts when the user declines", async () => {
    await using tmp = await tmpdir()

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await Session.create({})

        ask.mockResolvedValueOnce([["No"]])

        const tool = await PlanEnterTool.init()
        await expect(
          tool.execute(
            {},
            {
              sessionID: session.id,
              messageID: MessageID.ascending(),
              callID: "call",
              agent: "build",
              abort: AbortSignal.any([]),
              messages: [],
              metadata: () => {},
              ask: async () => {},
            },
          ),
        ).rejects.toBeInstanceOf(QuestionModule.Question.RejectedError)

        const msgs = await Session.messages({ sessionID: session.id })
        expect(msgs.some((item) => item.info.role === "user" && item.info.agent === "plan")).toBe(false)
      },
    })
  })
})
