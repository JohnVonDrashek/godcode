import { describe, expect, test } from "bun:test"
import { Tune } from "../../src/util/tune"
import codex from "../../src/session/prompt/codex.txt"

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
})
