import { toast } from "sonner"

/**
 * Shows a loading toast that resolves to a success or error toast once the
 * request settles. `request` resolves to whether it worked.
 */
export function notifyResult(
  request: Promise<boolean>,
  messages: { loading: string; success: string; error: string }
) {
  toast.promise(
    request.then((ok) => {
      if (!ok) throw new Error(messages.error)
    }),
    messages
  )
  return request
}
