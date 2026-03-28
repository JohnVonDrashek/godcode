import { describe, expect, test } from "bun:test"
import { arm, owns, read, ready, short } from "../../../src/cli/cmd/tui/component/prompt/auto"

describe("auto", () => {
  test("read trims and validates saved state", () => {
    expect(read(undefined)).toBeUndefined()
    expect(read({ text: "   " })).toBeUndefined()
    expect(read({ text: "  keep going  ", armed: true, sessionID: "ses_1", last: "msg_1" })).toEqual({
      text: "keep going",
      armed: true,
      sessionID: "ses_1",
      last: "msg_1",
    })
  })

  test("owns matches attached sessions", () => {
    expect(owns(undefined, "ses_1")).toBe(false)
    expect(owns({ text: "go", armed: false }, "ses_1")).toBe(true)
    expect(owns({ text: "go", armed: false, sessionID: "ses_1" }, "ses_1")).toBe(true)
    expect(owns({ text: "go", armed: false, sessionID: "ses_1" }, "ses_2")).toBe(false)
  })

  test("arm keeps existing session and marks state armed", () => {
    expect(arm({ text: "go", armed: false }, "ses_1")).toEqual({ text: "go", armed: true, sessionID: "ses_1" })
    expect(arm({ text: "go", armed: false, sessionID: "ses_1" }, "ses_2")).toEqual({
      text: "go",
      armed: true,
      sessionID: "ses_1",
    })
  })

  test("ready only triggers for fresh completed assistant turns", () => {
    const item = { text: "go", armed: true, sessionID: "ses_1" as const }
    expect(ready(item, { sessionID: "ses_1", status: "idle", messageID: "msg_1", completed: true })).toBe(true)
    expect(ready(item, { sessionID: "ses_1", status: "busy", messageID: "msg_1", completed: true })).toBe(false)
    expect(ready(item, { sessionID: "ses_2", status: "idle", messageID: "msg_1", completed: true })).toBe(false)
    expect(ready(item, { sessionID: "ses_1", status: "idle", messageID: "msg_1", completed: true, error: true })).toBe(
      false,
    )
    expect(
      ready({ ...item, last: "msg_1" }, { sessionID: "ses_1", status: "idle", messageID: "msg_1", completed: true }),
    ).toBe(false)
  })

  test("short truncates long phrases", () => {
    expect(short("keep going", 20)).toBe("keep going")
    expect(short("continue making improvements forever", 20)).toBe("continue making i...")
  })
})
