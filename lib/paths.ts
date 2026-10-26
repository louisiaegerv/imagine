import path from "node:path"

/**
 * Where the library (images + database) lives. Set LIBRARY_DIR to keep it
 * outside the project; otherwise it sits in the project root. Contents:
 *   <LIBRARY_DIR>/images/  generated and attached images
 *   <LIBRARY_DIR>/data/    the SQLite database
 */
export const LIBRARY_DIR = path.resolve(
  process.env.LIBRARY_DIR?.trim() || process.cwd()
)
