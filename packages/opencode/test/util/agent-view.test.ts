import { expect, test } from "bun:test"
import { formatAgentView } from "../../src/cli/cmd/tui/util/agent-view"

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
