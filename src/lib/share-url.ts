import os from "node:os";

export function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname === "[::1]"
    || hostname.endsWith(".localhost")
  );
}

export function getLanAddresses(): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.push(entry.address);
    }
  }
  return [...new Set(addresses)];
}

export function getConfiguredBaseUrl(): string | null {
  const raw = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

/**
 * 生成学生手机上可访问的地址。
 * 优先级：显式配置的公网地址 > 教师当前访问的非回环地址 > 本机局域网 IP。
 */
export function buildShareBaseUrl(input: {
  requestHost: string;
  forwardedProto?: string | null;
  lanAddresses?: string[];
}): string {
  const configured = getConfiguredBaseUrl();
  if (configured) return configured;

  const host = (input.requestHost || "").split(",")[0].trim();
  const hostname = host.replace(/^\[(.+)\](?::\d+)?$/, "$1").replace(/:\d+$/, "");
  const port = /:(\d+)$/.exec(host)?.[1] ?? "3000";

  if (host && hostname && !isLoopbackHost(hostname)) {
    const proto = input.forwardedProto === "https" || input.forwardedProto === "http"
      ? input.forwardedProto
      : "http";
    return `${proto}://${host}`;
  }

  const lan = (input.lanAddresses ?? getLanAddresses())[0];
  return lan ? `http://${lan}:${port}` : `http://127.0.0.1:${port}`;
}