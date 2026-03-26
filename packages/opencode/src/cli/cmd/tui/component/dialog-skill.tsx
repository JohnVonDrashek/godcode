import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { createResource, createMemo, createSignal } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "@tui/context/sdk"
import { useKeybind } from "@tui/context/keybind"
import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"

export type DialogSkillProps = {
  onSelect: (skill: string) => void
}

export function DialogSkill(props: DialogSkillProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const keybind = useKeybind()
  const { theme } = useTheme()
  const toast = useToast()
  dialog.setSize("large")
  const [toDelete, setToDelete] = createSignal<string>()

  const [skills, { refetch }] = createResource(async () => {
    const result = await sdk.client.app.skills()
    return result.data ?? []
  })

  const options = createMemo<DialogSelectOption<string>[]>(() => {
    const list = skills() ?? []
    const maxWidth = Math.max(0, ...list.map((s) => s.name.length))
    return list.map((skill) => ({
      title:
        toDelete() === skill.name
          ? `Press ${keybind.print("session_delete")} again to confirm`
          : skill.name.padEnd(maxWidth),
      description: skill.description?.replace(/\s+/g, " ").trim(),
      value: skill.name,
      category: skill.deletable ? "Skills" : "Remote Skills",
      footer: skill.deletable ? undefined : "read-only",
      bg: toDelete() === skill.name ? theme.error : undefined,
      onSelect: () => {
        props.onSelect(skill.name)
        dialog.clear()
      },
    }))
  })

  return (
    <DialogSelect
      title="Skills"
      placeholder="Search skills..."
      options={options()}
      onMove={() => {
        setToDelete(undefined)
      }}
      keybind={[
        {
          keybind: keybind.all.session_delete?.[0],
          title: "delete",
          onTrigger: async (option) => {
            const skill = (skills() ?? []).find((item) => item.name === option.value)
            if (!skill) return
            if (!skill.deletable) {
              toast.show({ message: "This skill is read-only", variant: "info" })
              return
            }
            if (toDelete() !== option.value) {
              setToDelete(option.value)
              return
            }
            const result = await sdk.client.app.skill.remove({ name: option.value }).catch(() => undefined)
            setToDelete(undefined)
            if (result?.error) {
              toast.show({ message: "Failed to delete skill", variant: "error" })
              return
            }
            await refetch()
            toast.show({ message: "Skill deleted", variant: "success" })
          },
        },
      ]}
    />
  )
}
