import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import type { Renderable, ScrollBoxRenderable } from "@opentui/core"
import { useDialog } from "@tui/ui/dialog"
import { useLocal } from "@tui/context/local"
import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { createMemo, For, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Tune } from "@/util/tune"

export function DialogTune(props: { sessionID?: string }) {
  const dialog = useDialog()
  const local = useLocal()
  const { theme } = useTheme()
  const toast = useToast()
  const sdk = useSDK()
  const sync = useSync()
  const term = useTerminalDimensions()
  let scroll: ScrollBoxRenderable | undefined

  const name = createMemo(() => local.agent.current().name)
  const saved = createMemo(() => Tune.from(local.agent.current().options?.tune))
  const current = createMemo(() => local.tune.get(props.sessionID, name()) ?? saved())
  const [store, setStore] = createStore({
    selected: 0,
    info: Tune.copy(current()),
    busy: false,
  })

  onMount(() => {
    dialog.setSize("large")
    setTimeout(() => focus(store.selected), 1)
  })

  const rows = createMemo(() =>
    store.info.order.map((key) => {
      const meta = Tune.meta(key)
      const value = store.info.values[key]
      return {
        key,
        title: meta.title,
        help: meta.help,
        value,
        hint: meta.values[value]?.hint ?? "",
        path: meta.values[value]?.path ?? "",
        values: Object.entries(meta.values),
      }
    }),
  )

  const height = createMemo(() => Math.max(8, Math.min(Math.floor(term().height * 0.45), term().height - 14)))

  function find(root: Renderable, id: string): Renderable | undefined {
    for (const child of root.getChildren()) {
      if (child.id === id) return child
      const nested = find(child, id)
      if (nested) return nested
    }
  }

  function focus(next: number, center = false) {
    const count = rows().length
    if (count === 0) return
    let index = next
    if (index < 0) index = count - 1
    if (index >= count) index = 0
    setStore("selected", index)
    if (!scroll) return
    const child = find(scroll, `tune-${rows()[index]?.key}`)
    if (!child) return
    const top = child.y - scroll.y
    const bottom = top + child.height
    if (center) {
      scroll.scrollBy(top - Math.floor((scroll.height - child.height) / 2))
      return
    }
    if (bottom > scroll.height) scroll.scrollBy(bottom - scroll.height)
    if (top < 0) {
      scroll.scrollBy(top)
      if (index === 0) scroll.scrollTo(0)
    }
  }

  function apply(info: Tune.Info) {
    const tune = Tune.from(info)
    setStore("info", Tune.copy(tune))
    if (Tune.equal(tune, saved())) {
      local.tune.clear(props.sessionID, name())
      return
    }
    local.tune.set(props.sessionID, name(), tune)
  }

  function move(dir: 1 | -1) {
    const row = rows()[store.selected]
    if (!row) return
    const next = Tune.move(store.info, row.key, dir)
    if (Tune.equal(next, store.info)) return
    apply(next)
    focus(Math.max(0, Math.min(rows().length - 1, store.selected + dir)))
  }

  function cycle(dir: 1 | -1) {
    const row = rows()[store.selected]
    if (!row) return
    apply(Tune.cycle(store.info, row.key, dir))
  }

  function pick(key: Tune.Key, value: string) {
    const next = Tune.copy(store.info)
    next.values[key] = value
    apply(next)
  }

  function reset() {
    apply(saved())
    toast.show({
      message: props.sessionID ? "Session tune reset" : "Tune reset",
      variant: "success",
      duration: 2000,
    })
  }

  async function save(scope: "project" | "global") {
    if (store.busy) return
    setStore("busy", true)
    const tune = Tune.from(store.info)
    const config = {
      agent: {
        [name()]: {
          options: {
            tune,
          },
        },
      },
    }
    const result =
      scope === "global"
        ? await sdk.client.global.config.update({ config })
        : await sdk.client.config.tune.update({ agent: name(), tune })
    setStore("busy", false)
    if (result.error) {
      toast.show({
        message: result.error instanceof Error ? result.error.message : `Failed to save ${scope} tune`,
        variant: "error",
      })
      return
    }
    await sync.bootstrap()
    const next = Tune.from(store.info)
    const agent = sync.data.agent.find((item) => item.name === name())
    if (Tune.equal(next, Tune.from(agent?.options?.tune))) local.tune.clear(props.sessionID, name())
    toast.show({
      message: `${scope === "global" ? "Global" : "Project"} tune saved`,
      variant: "success",
    })
  }

  useKeyboard((evt) => {
    if (evt.name === "up" || evt.name === "k") {
      evt.preventDefault()
      if (evt.shift) {
        move(-1)
        return
      }
      focus(store.selected - 1)
      return
    }
    if (evt.name === "down" || evt.name === "j") {
      evt.preventDefault()
      if (evt.shift) {
        move(1)
        return
      }
      focus(store.selected + 1)
      return
    }
    if (evt.name === "left" || evt.name === "h") {
      evt.preventDefault()
      cycle(-1)
      return
    }
    if (evt.name === "right" || evt.name === "l" || evt.name === "space") {
      evt.preventDefault()
      cycle(1)
      return
    }
    if (evt.name === "return") {
      evt.preventDefault()
      dialog.clear()
      return
    }
    if (evt.name === "r") {
      evt.preventDefault()
      reset()
      return
    }
    if (evt.name === "p") {
      evt.preventDefault()
      void save("project")
      return
    }
    if (evt.name === "g") {
      evt.preventDefault()
      void save("global")
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="column">
          <text fg={theme.text}>
            <b>Tune build agent</b>
          </text>
          <text fg={theme.textMuted}>
            Swap prompt variants and reorder sections to change the assembled system prompt.
          </text>
          <text fg={theme.textMuted}>Use shift+up/down or the arrow buttons to reorder sections.</text>
        </box>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>

      <scrollbox
        maxHeight={height()}
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
          <For each={rows()}>
            {(row, i) => (
              <box
                id={`tune-${row.key}`}
                flexDirection="column"
                gap={1}
                paddingLeft={1}
                paddingRight={1}
                paddingTop={1}
                paddingBottom={1}
                backgroundColor={store.selected === i() ? theme.backgroundElement : theme.backgroundPanel}
                onMouseUp={() => focus(i())}
              >
                <box flexDirection="row" justifyContent="space-between">
                  <box flexDirection="row" gap={1}>
                    <text fg={store.selected === i() ? theme.primary : theme.textMuted}>{i() + 1}.</text>
                    <text fg={theme.text}>{row.title}</text>
                  </box>
                  <box flexDirection="row" gap={1}>
                    <box
                      paddingLeft={1}
                      paddingRight={1}
                      backgroundColor={i() > 0 ? theme.backgroundElement : theme.backgroundPanel}
                      onMouseUp={() => {
                        if (i() === 0) return
                        focus(i())
                        move(-1)
                      }}
                    >
                      <text fg={i() > 0 ? theme.text : theme.textMuted}>^</text>
                    </box>
                    <box
                      paddingLeft={1}
                      paddingRight={1}
                      backgroundColor={i() < rows().length - 1 ? theme.backgroundElement : theme.backgroundPanel}
                      onMouseUp={() => {
                        if (i() >= rows().length - 1) return
                        focus(i())
                        move(1)
                      }}
                    >
                      <text fg={i() < rows().length - 1 ? theme.text : theme.textMuted}>v</text>
                    </box>
                  </box>
                </box>

                <box flexDirection="row" gap={1}>
                  <For each={row.values}>
                    {(item) => (
                      <box
                        paddingLeft={1}
                        paddingRight={1}
                        backgroundColor={row.value === item[0] ? theme.primary : theme.backgroundPanel}
                        onMouseUp={() => pick(row.key, item[0])}
                      >
                        <text fg={row.value === item[0] ? theme.background : theme.textMuted}>{item[1].label}</text>
                      </box>
                    )}
                  </For>
                </box>

                <text fg={theme.textMuted}>{row.help}</text>
                <text fg={theme.textMuted}>{row.hint}</text>
                <text fg={theme.textMuted}>{row.path}</text>
              </box>
            )}
          </For>
        </box>
      </scrollbox>

      <box flexDirection="row" gap={2} paddingTop={1}>
        <text fg={theme.textMuted} onMouseUp={reset}>
          reset session
        </text>
        <text fg={theme.textMuted} onMouseUp={() => void save("project")}>
          save project
        </text>
        <text fg={theme.textMuted} onMouseUp={() => void save("global")}>
          save global
        </text>
        <Show when={store.busy}>
          <text fg={theme.textMuted}>saving...</text>
        </Show>
      </box>

      <box flexDirection="row" gap={2}>
        <text fg={theme.secondary}>
          shift+up/down <span style={{ fg: theme.textMuted }}>move row</span>
        </text>
        <text fg={theme.warning}>
          r <span style={{ fg: theme.textMuted }}>reset</span>
        </text>
        <text fg={theme.accent}>
          p <span style={{ fg: theme.textMuted }}>save project</span>
        </text>
        <text fg={theme.success}>
          g <span style={{ fg: theme.textMuted }}>save global</span>
        </text>
      </box>
    </box>
  )
}
