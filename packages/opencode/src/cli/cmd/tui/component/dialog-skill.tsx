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
  const [pending, setPending] = createSignal<string>()

  const [skills, { refetch }] = createResource(async () => {
    const result = await sdk.client.app.skills()
    return result.data ?? []
  })

  const options = createMemo<DialogSelectOption<string>[]>(() => {
    const list = skills() ?? []
    const maxWidth = Math.max(0, ...list.map((s) => s.name.length))
    return list.map((skill) => ({
      title:
        pending() === skill.name
          ? `Press ${keybind.print("session_delete")} again to confirm`
          : skill.name.padEnd(maxWidth),
      description: skill.description?.replace(/\s+/g, " ").trim(),
      value: skill.name,
      category: skill.disabled ? "Disabled Skills" : skill.deletable ? "Skills" : "Read-only Skills",
      footer: skill.disabled ? "disabled" : skill.deletable ? undefined : "read-only",
      bg: pending() === skill.name ? theme.error : undefined,
      onSelect: () => {
        if (skill.disabled) {
          toast.show({ message: "This skill is disabled", variant: "info" })
          return
        }
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
        setPending(undefined)
      }}
      keybind={[
        {
          keybind: keybind.all.session_delete?.[0],
          title: "delete/disable",
          onTrigger: async (option) => {
            const skill = (skills() ?? []).find((item) => item.name === option.value)
            if (!skill) return
            if (pending() !== option.value) {
              setPending(option.value)
              return
            }
            setPending(undefined)
            if (!skill.deletable) {
              const cfg = await sdk.client.global.config.get().catch(() => undefined)
              if (cfg?.error || !cfg?.data) {
                toast.show({ message: "Failed to load global config", variant: "error" })
                return
              }
              const disabled = new Set(cfg.data.skills?.disabled ?? [])
              if (skill.disabled) disabled.delete(skill.name)
              else disabled.add(skill.name)
              const result = await sdk.client.global.config
                .update({
                  config: {
                    skills: {
                      disabled: Array.from(disabled).toSorted(),
                    },
                  },
                })
                .catch(() => undefined)
              if (result?.error) {
                toast.show({ message: `Failed to ${skill.disabled ? "enable" : "disable"} skill`, variant: "error" })
                return
              }
              await refetch()
              toast.show({ message: `Skill ${skill.disabled ? "enabled" : "disabled"}`, variant: "success" })
              return
            }
            const result = await sdk.client.app.skill.remove({ name: option.value }).catch(() => undefined)
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
