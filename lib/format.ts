export function formatCost(usd: number) {
  if (usd === 0) return "$0.00"
  return usd < 1 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}

export function formatTokens(n: number) {
  return n.toLocaleString("en-US")
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}
