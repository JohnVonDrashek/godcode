import { expect, test } from "bun:test"
import path from "path"
import { formatAgentView, writeAgentView } from "../../src/cli/cmd/tui/util/agent-view"
import { Filesystem } from "../../src/util/filesystem"
import { tmpdir } from "../fixture/fixture"

test("formats system prompt strings with real newlines", () => {
  const text = formatAgentView(
    {
      providerID: "openai",
      modelID: "gpt-test",
      agent: "build",
      sessionID: "ses_test",
      request: {
        system: ["line one\nline two"],
        messages: [{ role: "user", content: [{ type: "text", text: "hello\nworld" }] }],
        prompt: [],
        headers: {},
        providerOptions: {},
        activeTools: ["bash"],
        tools: {},
      },
    },
    "/tmp/view.json",
  )

  expect(text).toContain("## System")
  expect(text).toContain("line one\nline two")
  expect(text).toContain("hello\nworld")
  expect(text).toContain("- raw snapshot: /tmp/view.json")
  expect(text).not.toContain('"line one\\nline two"')
})

test("writeAgentView writes markdown and json exports", async () => {
  await using tmp = await tmpdir()

  const view = await writeAgentView(
    {
      providerID: "openai",
      modelID: "gpt-test",
      agent: "build",
      sessionID: "ses_test",
      request: {
        system: ["line one\nline two"],
        messages: [{ role: "user", content: [{ type: "text", text: "hello\nworld" }] }],
        prompt: [],
        headers: {},
        providerOptions: {},
        activeTools: ["bash"],
        tools: {},
      },
    },
    { root: tmp.path },
  )

  expect(view.startsWith(path.join(tmp.path, ".holycode", "agent-view"))).toBe(true)
  expect(await Filesystem.exists(view)).toBe(true)
  expect(await Filesystem.exists(view.replace(/\.md$/, ".json"))).toBe(true)
  expect(await Filesystem.readText(view)).toContain("# Agent View")
})

test("writeAgentView throws a clear error without a root path", async () => {
  await expect(
    writeAgentView(
      {
        providerID: "openai",
        modelID: "gpt-test",
        agent: "build",
        sessionID: "ses_test",
        request: {},
      },
      {},
    ),
  ).rejects.toThrow("Project path is unavailable")
})
