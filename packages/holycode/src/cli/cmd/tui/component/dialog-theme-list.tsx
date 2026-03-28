import { InputRenderable, RGBA, ScrollBoxRenderable, TextAttributes } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { selectedForeground, useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import * as fuzzysort from "fuzzysort"
import { createEffect, createMemo, For, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"

export function DialogThemeList() {
  const dialog = useDialog()
  const dim = useTerminalDimensions()
  const { theme } = useTheme()
  const style = useTheme()
  const initial = style.selected
  const random = style.random()
  let confirmed = false
  let input: InputRenderable
  let scroll: ScrollBoxRenderable | undefined

  const [store, setStore] = createStore({
    selected: 1,
    filter: "",
  })

  const options = createMemo(() => {
    return Object.keys(style.all())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((value) => ({
        title: value,
        value,
      }))
  })

  const filtered = createMemo(() => {
    if (!store.filter) return options()
    return fuzzysort.go(store.filter.toLowerCase(), options(), { key: "title" }).map((item) => item.obj)
  })

  const rows = createMemo(() => {
    return [
      {
        type: "random" as const,
      },
      ...filtered().map((item) => ({
        type: "theme" as const,
        ...item,
      })),
    ]
  })

  const current = createMemo(() => rows()[store.selected])
  const height = createMemo(() => Math.min(Math.max(filtered().length, 1), Math.floor(dim().height / 2) - 8))

  createEffect(() => {
    const index = options().findIndex((item) => item.value === initial)
    if (index === -1) return
    setStore("selected", index + 1)
  })

  createEffect(() => {
    const max = rows().length - 1
    if (store.selected <= max) return
    setStore("selected", max)
  })

  onCleanup(() => {
    if (!confirmed) style.set(initial)
    if (!confirmed) style.setRandom(random)
  })

  function move(dir: number) {
    if (rows().length === 0) return
    let next = store.selected + dir
    if (next < 0) next = rows().length - 1
    if (next >= rows().length) next = 0
    focus(next)
  }

  function focus(index: number) {
    setStore("selected", index)
    const row = rows()[index]
    if (row?.type === "theme") style.set(row.value)
    if (index === 0) return
    if (row?.type !== "theme") return
    const child = scroll?.getChildren().find((item) => item.id === `theme-${row.value}`)
    if (!child || !scroll) return
    const y = child.y - scroll.y
    if (y >= scroll.height) scroll.scrollBy(y - scroll.height + 1)
    if (y < 0) scroll.scrollBy(y)
  }

  function toggle() {
    style.setRandom(!style.random())
  }

  useKeyboard((evt) => {
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      evt.preventDefault()
      move(-1)
      return
    }
    if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      evt.preventDefault()
      move(1)
      return
    }
    if (evt.name === "pageup") {
      evt.preventDefault()
      move(-10)
      return
    }
    if (evt.name === "pagedown") {
      evt.preventDefault()
      move(10)
      return
    }
    if (evt.name === "home") {
      evt.preventDefault()
      focus(0)
      return
    }
    if (evt.name === "end") {
      evt.preventDefault()
      focus(rows().length - 1)
      return
    }
    if (evt.name !== "return") return
    evt.preventDefault()
    const row = current()
    if (!row) return
    if (row.type === "random") {
      toggle()
      return
    }
    style.set(row.value)
    confirmed = true
    dialog.clear()
  })

  const rowbg = (active: boolean) => (active ? theme.primary : RGBA.fromInts(0, 0, 0, 0))
  const rowfg = (active: boolean) => (active ? selectedForeground(theme) : theme.text)
  const rowmuted = (active: boolean) => (active ? selectedForeground(theme) : theme.textMuted)

  return (
    <box gap={1} paddingBottom={1}>
      <box paddingLeft={4} paddingRight={4}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Themes
          </text>
          <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
            esc
          </text>
        </box>
        <box paddingTop={1}>
          <input
            onInput={(value) => {
              setStore("filter", value)
            }}
            focusedBackgroundColor={theme.backgroundPanel}
            cursorColor={theme.primary}
            focusedTextColor={theme.textMuted}
            ref={(r) => {
              input = r
              setTimeout(() => {
                if (!input || input.isDestroyed) return
                input.focus()
              }, 1)
            }}
            placeholder="Search themes"
          />
        </box>
      </box>

      <box paddingLeft={1} paddingRight={1}>
        <box
          flexDirection="column"
          paddingLeft={3}
          paddingRight={3}
          paddingTop={1}
          paddingBottom={1}
          backgroundColor={rowbg(store.selected === 0)}
          onMouseOver={() => focus(0)}
          onMouseUp={() => toggle()}
        >
          <box flexDirection="row" justifyContent="space-between" gap={1}>
            <text fg={rowfg(store.selected === 0)} attributes={store.selected === 0 ? TextAttributes.BOLD : undefined}>
              Randomly choose theme on start
            </text>
            <text fg={style.random() ? rowfg(store.selected === 0) : rowmuted(store.selected === 0)}>
              {style.random() ? "on" : "off"}
            </text>
          </box>
          <text fg={rowmuted(store.selected === 0)}>Adds some variety every time Holycode starts.</text>
        </box>
      </box>

      <box paddingLeft={4} paddingRight={4}>
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          Themes
        </text>
      </box>

      <box paddingLeft={1} paddingRight={1}>
        <scrollbox
          scrollbarOptions={{ visible: false }}
          ref={(r: ScrollBoxRenderable) => (scroll = r)}
          maxHeight={height()}
        >
          <Show
            when={filtered().length > 0}
            fallback={
              <box paddingLeft={3} paddingRight={3} paddingTop={1}>
                <text fg={theme.textMuted}>No themes found</text>
              </box>
            }
          >
            <For each={filtered()}>
              {(item, i) => {
                const active = () => store.selected === i() + 1
                const current = () => style.selected === item.value
                return (
                  <box
                    id={`theme-${item.value}`}
                    flexDirection="row"
                    paddingLeft={current() ? 1 : 3}
                    paddingRight={3}
                    gap={1}
                    backgroundColor={rowbg(active())}
                    onMouseOver={() => focus(i() + 1)}
                    onMouseUp={() => {
                      style.set(item.value)
                      confirmed = true
                      dialog.clear()
                    }}
                  >
                    <Show when={current()}>
                      <text flexShrink={0} fg={active() ? rowfg(true) : theme.primary}>
                        ●
                      </text>
                    </Show>
                    <text
                      flexGrow={1}
                      fg={rowfg(active())}
                      attributes={active() ? TextAttributes.BOLD : undefined}
                      overflow="hidden"
                      wrapMode="none"
                      paddingLeft={3}
                    >
                      {item.title}
                    </text>
                  </box>
                )
              }}
            </For>
          </Show>
        </scrollbox>
      </box>

      <box paddingRight={2} paddingLeft={4} flexDirection="row" gap={2} flexShrink={0} paddingTop={1}>
        <text>
          <span style={{ fg: theme.text }}>
            <b>enter</b>{" "}
          </span>
          <span style={{ fg: theme.textMuted }}>{current()?.type === "random" ? "toggle" : "select"}</span>
        </text>
      </box>
    </box>
  )
}
