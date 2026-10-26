// Shared by the API routes and the UI. Keep this file free of Node-only imports.

export const IMAGE_MODEL = "gpt-image-2.5-sunburst"
export const IMAGE_QUALITY = "low"
export const IMAGE_FORMAT = "webp"
export const IMAGE_COMPRESSION = 80

export const MAX_INPUT_IMAGES = 3
export const MAX_INPUT_BYTES = 50 * 1024 * 1024
export const ACCEPTED_INPUT_TYPES = ["image/png", "image/jpeg", "image/webp"]
export const QUANTITIES = [1, 2, 3, 4] as const
export const MAX_PROMPT_LENGTH = 32000

/**
 * Ordered as a spectrum from tallest to widest, with 1:1 in the middle.
 * gpt-image-2.x accepts flexible sizes: both edges a multiple of 16, long edge
 * <= 3840, ratio <= 3:1 and 0.65-8.3 megapixels. Each ratio below is sized at
 * roughly 1 MP, which keeps "low" quality renders cheap.
 */
export const ASPECT_RATIOS = [
  { value: "9:16", width: 720, height: 1280 },
  { value: "2:3", width: 832, height: 1248 },
  { value: "3:4", width: 864, height: 1152 },
  { value: "4:5", width: 896, height: 1120 },
  { value: "1:1", width: 1024, height: 1024 },
  { value: "5:4", width: 1120, height: 896 },
  { value: "4:3", width: 1152, height: 864 },
  { value: "3:2", width: 1248, height: 832 },
  { value: "16:9", width: 1280, height: 720 },
] as const

/** ASPECT_RATIOS is ordered portrait -> landscape, so this is the slider's middle stop. */
export const SQUARE_INDEX = 4

export type AspectRatio = (typeof ASPECT_RATIOS)[number]["value"]

export function getAspectRatio(value: string) {
  return ASPECT_RATIOS.find((r) => r.value === value)
}

/**
 * USD per 1M tokens. These are the published gpt-image-2 rates, which the
 * 2.5 release reportedly keeps; adjust here if OpenAI's pricing page differs.
 */
export const PRICING_PER_MILLION = {
  inputText: 5,
  inputImage: 8,
  outputImage: 30,
} as const

export type Usage = {
  inputTextTokens: number
  inputImageTokens: number
  outputImageTokens: number
  totalTokens: number
}

export function computeCost(usage: Usage) {
  const p = PRICING_PER_MILLION
  return (
    (usage.inputTextTokens * p.inputText +
      usage.inputImageTokens * p.inputImage +
      usage.outputImageTokens * p.outputImage) /
    1_000_000
  )
}
