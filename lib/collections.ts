import { z } from "zod"

export const collectionNameSchema = z
  .string({ error: "Name is required" })
  .trim()
  .min(1, "Name is required")
  .max(60, "Name must be 60 characters or fewer")

export const imageIdsSchema = z
  .array(z.number().int().positive())
  .min(1)
  .max(500)
