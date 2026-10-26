"use client"

import * as React from "react"

import type { ImageRecord } from "@/lib/types"

export type Job = {
  id: string
  prompt: string
  aspectRatio: string
  n: number
  attachments: number
  status: "pending" | "done" | "error"
  items: ImageRecord[]
  error?: string
}

type SubmitInput = {
  prompt: string
  aspectRatio: string
  n: number
  files: File[]
}

type GenerationContextValue = {
  jobs: Job[]
  pendingCount: number
  submit: (input: SubmitInput) => void
  dismiss: (id: string) => void
}

const GenerationContext = React.createContext<GenerationContextValue | null>(
  null
)

/**
 * Lives in the root layout so a request keeps running (and its result is kept)
 * when the user navigates between Generate and Library.
 */
export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = React.useState<Job[]>([])

  const update = React.useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }, [])

  const submit = React.useCallback(
    ({ prompt, aspectRatio, n, files }: SubmitInput) => {
      const id = crypto.randomUUID()
      setJobs((prev) => [
        {
          id,
          prompt,
          aspectRatio,
          n,
          attachments: files.length,
          status: "pending",
          items: [],
        },
        ...prev,
      ])

      const body = new FormData()
      body.set("prompt", prompt)
      body.set("aspectRatio", aspectRatio)
      body.set("n", String(n))
      for (const file of files) body.append("images", file)

      fetch("/api/generate", { method: "POST", body })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error ?? "Generation failed")
          update(id, { status: "done", items: data.items })
        })
        .catch((err) =>
          update(id, {
            status: "error",
            error: err instanceof Error ? err.message : "Generation failed",
          })
        )
    },
    [update]
  )

  const dismiss = React.useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  const value = React.useMemo(
    () => ({
      jobs,
      pendingCount: jobs.filter((j) => j.status === "pending").length,
      submit,
      dismiss,
    }),
    [jobs, submit, dismiss]
  )

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  )
}

export function useGeneration() {
  const ctx = React.useContext(GenerationContext)
  if (!ctx) throw new Error("useGeneration must be used inside GenerationProvider")
  return ctx
}
