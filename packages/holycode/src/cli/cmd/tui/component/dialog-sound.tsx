import { useKeyboard } from "@opentui/solid"
import type { Renderable, ScrollBoxRenderable } from "@opentui/core"
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
    help: "Play when the session fully returns to idle without pending input.",
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

const volume = {
  title: "Volume",
  help: "Set one shared output level for all sounds.",
  preview: "agent-finished",
} as const

export function DialogSound() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const sound = useSound()
  let scroll: ScrollBoxRenderable | undefined
  const [store, setStore] = createStore({
    selected: 0,
  })

  const total = () => rows.length + 1
  const current = createMemo(() => rows[store.selected])
  const selectedVolume = createMemo(() => store.selected === rows.length)

  function find(root: Renderable, id: string): Renderable | undefined {
    for (const child of root.getChildren()) {
      if (child.id === id) return child
      const nested = find(child, id)
      if (nested) return nested
    }
  }

  function focus(next: number) {
    let index = next
    if (index < 0) index = total() - 1
    if (index >= total()) index = 0
    setStore("selected", index)
    if (!scroll || index >= rows.length) return
    const child = find(scroll, `sound-${rows[index]?.key}`)
    if (!child) return
    const top = child.y - scroll.y
    const bottom = top + child.height
    if (bottom > scroll.height) scroll.scrollBy(bottom - scroll.height)
    if (top < 0) {
      scroll.scrollBy(top)
      if (index === 0) scroll.scrollTo(0)
    }
  }

  function move(dir: 1 | -1) {
    focus(store.selected + dir)
  }

  function flip(key = current()?.key) {
    if (!key) return
    sound.toggle(key)
  }

  function adjust(dir: 1 | -1) {
    sound.volume(sound.state.volume + dir * 10)
  }

  function test() {
    const row = current()
    sound.preview(row?.preview ?? volume.preview)
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
      if (selectedVolume()) {
        if (evt.name === "left" || evt.name === "h") adjust(-1)
        if (evt.name === "right" || evt.name === "l" || evt.name === "space") adjust(1)
        return
      }
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
        <text fg={theme.textMuted}>Toggle sounds, adjust volume, and preview the selected item with `p`.</text>
      </box>

      <box flexDirection="column" gap={1}>
        <scrollbox
          maxHeight={9}
          ref={(r: ScrollBoxRenderable) => (scroll = r)}
          verticalScrollbarOptions={{
            visible: true,
            trackOptions: {
              backgroundColor: theme.backgroundElement,
              foregroundColor: theme.border,
            },
          }}
          viewportOptions={{
            paddingRight: 1,
          }}
        >
          <box flexDirection="column" gap={1}>
            <For each={rows}>
              {(row, i) => {
                const on = () => sound.state[row.key]
                const active = () => store.selected === i()
                return (
                  <box
                    id={`sound-${row.key}`}
                    flexDirection="column"
                    gap={1}
                    paddingLeft={1}
                    paddingRight={1}
                    paddingTop={1}
                    paddingBottom={1}
                    backgroundColor={active() ? theme.backgroundElement : theme.backgroundPanel}
                    onMouseUp={() => focus(i())}
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
        </scrollbox>

        <box
          flexDirection="column"
          gap={1}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          paddingBottom={1}
          backgroundColor={selectedVolume() ? theme.backgroundElement : theme.backgroundPanel}
          onMouseUp={() => setStore("selected", rows.length)}
        >
          <box flexDirection="row" justifyContent="space-between">
            <box flexDirection="row" gap={1}>
              <text fg={selectedVolume() ? theme.primary : theme.textMuted}>{rows.length + 1}.</text>
              <text fg={theme.text}>{volume.title}</text>
            </box>
            <box flexDirection="row" gap={1}>
              <text fg={theme.textMuted}>-</text>
              <text fg={theme.text}>{sound.state.volume}%</text>
              <text fg={theme.textMuted}>+</text>
            </box>
          </box>
          <text fg={theme.textMuted}>{volume.help}</text>
        </box>
      </box>

      <box flexDirection="row" gap={2}>
        <text fg={theme.accent} onMouseUp={test}>
          p <span style={{ fg: theme.textMuted }}>preview</span>
        </text>
        <text fg={theme.secondary}>
          space <span style={{ fg: theme.textMuted }}>{selectedVolume() ? "louder" : "toggle"}</span>
        </text>
        <text fg={theme.secondary}>
          ←/→ <span style={{ fg: theme.textMuted }}>adjust</span>
        </text>
        <text fg={theme.textMuted}>enter close</text>
      </box>
    </box>
  )
}
