import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { MessageID, SessionID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { IndependentResearchTool } from "../../src/tool/independent-research"
import { ToolRegistry } from "../../src/tool/registry"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"
import * as TaskModule from "../../src/tool/task"

const ctx = {
  sessionID: SessionID.make("ses_test-session"),
  messageID: MessageID.make("test-message"),
  callID: "test-call",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("tool.independent-research", () => {
  afterEach(async () => {
    await Instance.disposeAll()
  })

  test("delegates to runTask with fixed subagent type", async () => {
    const result = {
      title: "research",
      metadata: {
        sessionId: SessionID.make("ses_research-task"),
        model: {
          providerID: ProviderID.make("openai"),
          modelID: ModelID.make("gpt-test"),
        },
      },
      output: "done",
    } satisfies Awaited<ReturnType<typeof TaskModule.runTask>>
    const run = spyOn(TaskModule, "runTask").mockImplementation(async () => result)
    const tool = await IndependentResearchTool.init()

    const output = await tool.execute(
      {
        description: "Check docs",
        prompt: "Compare official docs",
      },
      ctx,
    )

    expect(run).toHaveBeenCalledWith(
      {
        description: "Check docs",
        prompt: "Compare official docs",
        subagent_type: "independent-research",
      },
      ctx,
    )
    expect(output.output).toBe("done")
    run.mockRestore()
  })

  test("registers in the tool registry", async () => {
    await using tmp = await tmpdir()

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const ids = await ToolRegistry.ids()
        expect(ids).toContain("independent-research")
      },
    })
  })
})
