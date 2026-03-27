import { describe, expect, test } from "bun:test"
import path from "path"
import { Agent } from "../../src/agent/agent"
import type { Provider } from "../../src/provider/provider"
import { Instance } from "../../src/project/instance"
import prompt from "../../src/session/prompt/default.txt"
import { SystemPrompt } from "../../src/session/system"
import { tmpdir } from "../fixture/fixture"

describe("session.system", () => {
  test("provider fallback is vendor agnostic", () => {
    const openai = { api: { id: "gpt-5" } } as unknown as Provider.Model
    const gemini = { api: { id: "gemini-2.5-pro" } } as unknown as Provider.Model
    const claude = { api: { id: "claude-sonnet-4-5" } } as unknown as Provider.Model

    expect(SystemPrompt.provider(openai)).toEqual([prompt])
    expect(SystemPrompt.provider(gemini)).toEqual([prompt])
    expect(SystemPrompt.provider(claude)).toEqual([prompt])
  })

  test("skills output is sorted by name and stable across calls", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        for (const [name, description] of [
          ["zeta-skill", "Zeta skill."],
          ["alpha-skill", "Alpha skill."],
          ["middle-skill", "Middle skill."],
        ]) {
          const skillDir = path.join(dir, ".holycode", "skill", name)
          await Bun.write(
            path.join(skillDir, "SKILL.md"),
            `---
name: ${name}
description: ${description}
---

# ${name}
`,
          )
        }
      },
    })

    const home = process.env.HOLYCODE_TEST_HOME
    process.env.HOLYCODE_TEST_HOME = tmp.path

    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const build = await Agent.get("build")
          const first = await SystemPrompt.skills(build!)
          const second = await SystemPrompt.skills(build!)

          expect(first).toBe(second)

          const alpha = first!.indexOf("<name>alpha-skill</name>")
          const middle = first!.indexOf("<name>middle-skill</name>")
          const zeta = first!.indexOf("<name>zeta-skill</name>")

          expect(alpha).toBeGreaterThan(-1)
          expect(middle).toBeGreaterThan(alpha)
          expect(zeta).toBeGreaterThan(middle)
        },
      })
    } finally {
      process.env.HOLYCODE_TEST_HOME = home
    }
  })
})
