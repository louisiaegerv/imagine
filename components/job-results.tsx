"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { AlertCircleIcon, Loader2Icon, XIcon } from "lucide-react"

import { useGeneration, type Job } from "@/components/generation-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAspectRatio } from "@/lib/image-config"
import { formatCost } from "@/lib/format"

function JobCard({ job }: { job: Job }) {
  const { dismiss } = useGeneration()
  const ratio = getAspectRatio(job.aspectRatio)
  const aspect = ratio ? `${ratio.width} / ${ratio.height}` : "1 / 1"
  const cost = job.items[0]?.generation.costUsd

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="rounded-xl border bg-card p-4"
    >
      <div className="mb-3 flex items-start gap-3">
        <p className="line-clamp-2 flex-1 text-sm">{job.prompt}</p>
        <Badge variant="outline">{job.aspectRatio}</Badge>
        {job.attachments > 0 && (
          <Badge variant="outline">
            {job.attachments} ref{job.attachments > 1 ? "s" : ""}
          </Badge>
        )}
        {cost !== undefined && <Badge variant="secondary">{formatCost(cost)}</Badge>}
        {job.status !== "pending" && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss"
            onClick={() => dismiss(job.id)}
          >
            <XIcon />
          </Button>
        )}
      </div>

      {job.status === "error" ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          {job.error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {job.status === "pending"
            ? Array.from({ length: job.n }, (_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                  style={{ aspectRatio: aspect }}
                  className="flex items-center justify-center rounded-lg bg-muted"
                >
                  <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                </motion.div>
              ))
            : job.items.map((image, i) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                >
                  <Link
                    href={`/library?image=${image.id}`}
                    className="block overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    style={{ aspectRatio: aspect }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={job.prompt}
                      className="size-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                    />
                  </Link>
                </motion.div>
              ))}
        </div>
      )}
    </motion.section>
  )
}

export function JobResults() {
  const { jobs } = useGeneration()

  if (jobs.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Your new images will appear here and are saved to the library
        automatically.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </AnimatePresence>
    </div>
  )
}
