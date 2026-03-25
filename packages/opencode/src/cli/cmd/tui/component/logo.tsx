import { TextAttributes, RGBA } from "@opentui/core"
import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { logo } from "@/cli/logo"

const YELLOW = RGBA.fromHex("#ffd700")

export function Logo() {
  const { theme } = useTheme()

  return (
    <box>
      <For each={logo.left}>
        {(line, index) => (
          <box flexDirection="row" gap={1}>
            <text fg={YELLOW} selectable={false}>{line}</text>
            <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>{logo.right[index()]}</text>
          </box>
        )}
      </For>
    </box>
  )
}
