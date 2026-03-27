import { TextareaRenderable, TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { onMount } from "solid-js"
import { createSignal } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"

export function DialogBigPicture() {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const { theme } = useTheme()
  const toast = useToast()
  const [busy, setBusy] = createSignal(false)
  let input: TextareaRenderable

  const save = async () => {
    if (!input || input.isDestroyed || busy()) return
    setBusy(true)
    const text = input.plainText
    const result = await sdk.client.config.bigPicture.update({ big_picture: text })
    setBusy(false)
    if (result.error) {
      toast.show({
        message: result.error instanceof Error ? result.error.message : "Failed to save project big picture",
        variant: "error",
      })
      return
    }
    await sync.bootstrap()
    toast.show({
      message: text.trim() ? "Project big picture saved" : "Project big picture cleared",
      variant: "success",
    })
    dialog.clear()
  }

  useKeyboard((evt) => {
    if (evt.ctrl && evt.name === "s") {
      evt.preventDefault()
      void save()
    }
  })

  onMount(() => {
    dialog.setSize("large")
    setTimeout(() => {
      if (!input || input.isDestroyed) return
      input.focus()
      input.gotoBufferEnd()
    }, 1)
  })

  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Project Big Picture
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>

      <text fg={theme.textMuted} wrapMode="word">
        Give the agent the long-term vision for this project. It is injected as a dedicated system prompt layer on every
        non-isolated run.
      </text>

      <text fg={theme.textMuted} wrapMode="word">
        Saved to the hidden project config at {sync.data.path.worktree || sync.data.path.directory}
        /.holycode/holycode.json.
      </text>

      <textarea
        ref={(val: TextareaRenderable) => (input = val)}
        initialValue={sync.data.config.big_picture ?? ""}
        placeholder="Describe the product vision, users, and what great outcomes look like"
        minHeight={8}
        maxHeight={16}
        textColor={theme.text}
        focusedTextColor={theme.text}
        cursorColor={theme.primary}
      />

      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.textMuted}>Use plain text. Leave blank to clear it.</text>
        <text fg={busy() ? theme.textMuted : theme.primary} onMouseUp={() => void save()}>
          {busy() ? "saving..." : "save"}
        </text>
      </box>

      <box flexDirection="row" gap={2}>
        <text fg={theme.primary}>
          ctrl+s <span style={{ fg: theme.textMuted }}>save</span>
        </text>
        <text fg={theme.textMuted}>esc close</text>
      </box>
    </box>
  )
}
