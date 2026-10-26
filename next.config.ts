import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The dev server blocks requests from any host other than localhost, which
  // stops the page hydrating (dead buttons) when opened from a phone on the
  // LAN or Tailscale. Production (`next start`) is unaffected.
  allowedDevOrigins: ["192.168.*.*", "100.*.*.*", "*.ts.net", "gaming-pc.tailc774aa.ts.net", "imagine"],
}

export default nextConfig
