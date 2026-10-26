"use client"

import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function NameForm({
  initialName,
  submitLabel,
  onSubmit,
}: {
  initialName: string
  submitLabel: string
  /** Resolves to an error message, or null once the name was accepted. */
  onSubmit: (name: string) => Promise<string | null>
}) {
  const [name, setName] = React.useState(initialName)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(await onSubmit(name.trim()))
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Input
          autoFocus
          value={name}
          maxLength={60}
          placeholder="Collection name"
          aria-label="Collection name"
          aria-invalid={!!error}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function CollectionNameDialog({
  open,
  onOpenChange,
  title,
  initialName = "",
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialName?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<string | null>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so the field resets each time. */}
        <NameForm
          initialName={initialName}
          submitLabel={submitLabel}
          onSubmit={async (name) => {
            const error = await onSubmit(name)
            if (!error) onOpenChange(false)
            return error
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
