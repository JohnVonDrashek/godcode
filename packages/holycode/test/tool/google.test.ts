import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { GoogleTool } from "../../src/tool/google"
import { SessionID, MessageID } from "../../src/session/schema"
import { Instance } from "../../src/project/instance"
import { ToolRegistry } from "../../src/tool/registry"
import { tmpdir } from "../fixture/fixture"
import * as ProcessModule from "../../src/util/process"

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

describe("tool.google", () => {
  afterEach(async () => {
    await Instance.disposeAll()
  })

  test("formats google search results", async () => {
    const ask = spyOn(ctx, "ask").mockImplementation(async () => {})
    const run = spyOn(ProcessModule.Process, "text").mockResolvedValue({
      code: 0,
      stdout: Buffer.from("[]"),
      stderr: Buffer.alloc(0),
      text: JSON.stringify([
        {
          title: "Responses Overview | OpenAI API Reference",
          url: "https://developers.openai.com/api/reference/responses/overview",
          abstract: "Official documentation for the Responses API.",
        },
      ]),
    })

    const tool = await GoogleTool.init()
    const result = await tool.execute({ query: "openai responses api", numResults: 3 }, ctx)

    expect(ask).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledWith(["ddgr", "--json", "--np", "-n", "3", "openai responses api"], {
      abort: ctx.abort,
    })
    expect(result.output).toContain("1. Responses Overview | OpenAI API Reference")
    expect(result.output).toContain("https://developers.openai.com/api/reference/responses/overview")

    ask.mockRestore()
    run.mockRestore()
  })

  test("retries ddgr with fallback flags on HTTP 202", async () => {
    const ask = spyOn(ctx, "ask").mockImplementation(async () => {})
    const run = spyOn(ProcessModule.Process, "text")
      .mockResolvedValueOnce({
        code: 0,
        stdout: Buffer.from("[]\n"),
        stderr: Buffer.from("[ERROR] HTTP Error 202: Accepted\n"),
        text: "[]\n",
      })
      .mockResolvedValueOnce({
        code: 0,
        stdout: Buffer.from("[]"),
        stderr: Buffer.alloc(0),
        text: JSON.stringify([
          {
            title: "How to Geek",
            url: "https://www.howtogeek.com/example",
            abstract: "fallback worked",
          },
        ]),
      })

    const tool = await GoogleTool.init()
    const result = await tool.execute({ query: "discord alternatives self-hosted", numResults: 5 }, ctx)

    expect(run).toHaveBeenNthCalledWith(1, ["ddgr", "--json", "--np", "-n", "5", "discord alternatives self-hosted"], {
      abort: ctx.abort,
    })
    expect(run).toHaveBeenNthCalledWith(
      2,
      ["ddgr", "--json", "--np", "--noua", "--unsafe", "-n", "5", "discord alternatives self-hosted"],
      {
        abort: ctx.abort,
      },
    )
    expect(result.output).toContain("How to Geek")

    ask.mockRestore()
    run.mockRestore()
  })

  test("registers in the tool registry", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const ids = await ToolRegistry.ids()
        expect(ids).toContain("google")
      },
    })
  })
})
