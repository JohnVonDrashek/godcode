import { useKeyboard } from "@opentui/solid"
import { useDialog } from "@tui/ui/dialog"
import { useTheme } from "@tui/context/theme"
import { useSound } from "@tui/context/sound"
import { createMemo, For } from "solid-js"
import { createStore } from "solid-js/store"
import type { Sound as Player } from "@tui/util/sound"

const rows = [
  {
    key: "agent_finished",
    title: "Agent finished",
    help: "Play when an assistant message finishes streaming.",
    preview: "agent-finished",
  },
  {
    key: "needs_input",
    title: "Needs input",
    help: "Play when a question or permission request needs your attention.",
    preview: "needs-input",
  },
  {
    key: "error",
    title: "Error",
    help: "Play when the TUI surfaces a non-abort error.",
    preview: "error",
  },
  {
    key: "tool_start",
    title: "Tool start",
    help: "Play when a tool begins running.",
    preview: "tool-start",
  },
  {
    key: "tool_finish",
    title: "Tool finish",
    help: "Play when a tool completes successfully.",
    preview: "tool-finish",
  },
  {
    key: "tool_error",
    title: "Tool error",
    help: "Play when a tool finishes with an error.",
    preview: "tool-error",
  },
] as const satisfies Array<{
  key: keyof ReturnType<typeof useSound>["state"]
  title: string
  help: string
  preview: Player.Intent
}>

export function DialogSound() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const sound = useSound()
  const [store, setStore] = createStore({
    selected: 0,
  })

  const current = createMemo(() => rows[store.selected])

  function move(dir: 1 | -1) {
    let next = store.selected + dir
    if (next < 0) next = rows.length - 1
    if (next >= rows.length) next = 0
    setStore("selected", next)
  }

  function flip(key = current()?.key) {
    if (!key) return
    sound.toggle(key)
  }

  function test() {
    const row = current()
    if (!row) return
    sound.preview(row.preview)
  }

  useKeyboard((evt) => {
    if (evt.name === "up" || evt.name === "k") {
      evt.preventDefault()
      move(-1)
      return
    }
    if (evt.name === "down" || evt.name === "j") {
      evt.preventDefault()
      move(1)
      return
    }
    if (evt.name === "left" || evt.name === "right" || evt.name === "h" || evt.name === "l" || evt.name === "space") {
      evt.preventDefault()
      flip()
      return
    }
    if (evt.name === "p") {
      evt.preventDefault()
      test()
      return
    }
    if (evt.name === "return") {
      evt.preventDefault()
      dialog.clear()
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1} flexDirection="column">
      <box flexDirection="column">
        <text fg={theme.text}>
          <b>Sound settings</b>
        </text>
        <text fg={theme.textMuted}>Toggle each sound intention and preview the selected one with `p`.</text>
      </box>

      <box flexDirection="column" gap={1}>
        <For each={rows}>
          {(row, i) => {
            const on = () => sound.state[row.key]
            const active = () => store.selected === i()
            return (
              <box
                flexDirection="column"
                gap={1}
                paddingLeft={1}
                paddingRight={1}
                paddingTop={1}
                paddingBottom={1}
                backgroundColor={active() ? theme.backgroundElement : theme.backgroundPanel}
                onMouseUp={() => setStore("selected", i())}
              >
                <box flexDirection="row" justifyContent="space-between">
                  <box flexDirection="row" gap={1}>
                    <text fg={active() ? theme.primary : theme.textMuted}>{i() + 1}.</text>
                    <text fg={theme.text}>{row.title}</text>
                  </box>
                  <box
                    paddingLeft={1}
                    paddingRight={1}
                    backgroundColor={on() ? theme.success : theme.backgroundPanel}
                    onMouseUp={() => flip(row.key)}
                  >
                    <text fg={on() ? theme.background : theme.textMuted}>{on() ? "on" : "off"}</text>
                  </box>
                </box>
                <text fg={theme.textMuted}>{row.help}</text>
              </box>
            )
          }}
        </For>
      </box>

      <box flexDirection="row" gap={2}>
        <text fg={theme.accent} onMouseUp={test}>
          p <span style={{ fg: theme.textMuted }}>preview</span>
        </text>
        <text fg={theme.secondary}>
          space <span style={{ fg: theme.textMuted }}>toggle</span>
        </text>
        <text fg={theme.textMuted}>enter close</text>
      </box>
    </box>
  )
}
