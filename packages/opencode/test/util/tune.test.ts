import { describe, expect, test } from "bun:test"
import { Tune } from "../../src/util/tune"
import codex from "../../src/session/prompt/codex.txt"
import path from "path"
import fs from "fs/promises"
import { tmpdir } from "../fixture/fixture"

describe("tune", () => {
  test("default tune matches codex", () => {
    expect(Tune.prompt(Tune.DEFAULT)).toBe(codex.trim())
  })

  test("fills missing keys and preserves custom order", () => {
    const tune = Tune.from({
      order: ["git", "base"],
      values: {
        git: "permissive",
      },
    })

    expect(tune.order).toEqual(["git", "base", "editing", "tooling", "frontend", "presenting", "format"])
    expect(tune.values.git).toBe("permissive")
    expect(tune.values.base).toBe("default")
  })

  test("prompt assembly follows tune order", () => {
    const tune = Tune.from({
      order: ["format", "base", "editing", "tooling", "git", "frontend", "presenting"],
      values: {
        base: "lean",
        editing: "strict",
        tooling: "focused",
        git: "cautious",
        frontend: "preserve",
        presenting: "teaching",
        format: "structured",
      },
    })
    const text = Tune.prompt(tune)

    expect(text).toContain("## Final answer structure and style guidelines")
    expect(text.indexOf("## Final answer structure and style guidelines")).toBeLessThan(
      text.indexOf("You are HolyCode"),
    )
    expect(text.indexOf("You are HolyCode")).toBeLessThan(text.indexOf("## Editing constraints"))
  })

  test("migrates legacy option names", () => {
    const tune = Tune.from({
      values: {
        base: "extra",
        editing: "extra",
        tooling: "light",
        git: "off",
        frontend: "preserve",
        presenting: "concise",
        format: "extra",
      },
    })

    expect(tune.values.base).toBe("agentic")
    expect(tune.values.editing).toBe("strict")
    expect(tune.values.tooling).toBe("focused")
    expect(tune.values.git).toBe("permissive")
    expect(tune.values.frontend).toBe("preserve")
    expect(tune.values.presenting).toBe("terse")
    expect(tune.values.format).toBe("structured")
  })

  test("autoloads custom folders and txt metadata", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        const root = path.join(dir, "tune")
        await fs.mkdir(path.join(root, "base"), { recursive: true })
        await fs.mkdir(path.join(root, "voice"), { recursive: true })
        await fs.writeFile(
          path.join(root, "options.txt"),
          `---
order:
  - voice
  - base
sections:
  voice:
    name: Voice
    description: Controls the narration style
    default: dry
  base:
    name: Base
    description: Base role
    default: default
---
`,
        )
        await fs.writeFile(
          path.join(root, "base", "default.txt"),
          `---
name: Default
description: Base default role
---

You are HolyCode.
`,
        )
        await fs.writeFile(
          path.join(root, "voice", "dry.txt"),
          `---
name: Dry
description: Keep the voice plain and minimal.
---

Keep the tone dry.
`,
        )
        await fs.writeFile(
          path.join(root, "voice", "warm.txt"),
          `---
name: Warm
description: Keep the voice warmer and more conversational.
---

Keep the tone warm.
`,
        )
        return root
      },
    })

    const prev = process.env.OPENCODE_TUNE_DIR
    process.env.OPENCODE_TUNE_DIR = tmp.extra
    Tune.reload()

    try {
      expect(Tune.list()).toEqual(["voice", "base"])
      expect(Tune.meta("voice")).toEqual({
        title: "Voice",
        help: "Controls the narration style",
        values: {
          dry: {
            label: "Dry",
            hint: "Keep the voice plain and minimal.",
            path: path.join(tmp.extra, "voice", "dry.txt"),
            prompt: "Keep the tone dry.",
          },
          warm: {
            label: "Warm",
            hint: "Keep the voice warmer and more conversational.",
            path: path.join(tmp.extra, "voice", "warm.txt"),
            prompt: "Keep the tone warm.",
          },
        },
      })
      expect(Tune.DEFAULT.values.voice).toBe("dry")
      expect(Tune.prompt(Tune.DEFAULT)).toContain("Keep the tone dry.")
    } finally {
      if (prev === undefined) delete process.env.OPENCODE_TUNE_DIR
      else process.env.OPENCODE_TUNE_DIR = prev
      Tune.reload()
    }
  })
})
