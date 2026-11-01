export interface HttpInit {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface CapacitorHttpOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: string;
  responseType: "text";
  readTimeout: number;
  connectTimeout: number;
  shouldEncodeUrlParams: false;
}

export interface CapacitorHttpResponse {
  status: number;
  data: unknown;
}

export interface CapacitorHttpPlugin {
  request(options: CapacitorHttpOptions): Promise<CapacitorHttpResponse>;
}

interface CapacitorLike {
  getPlatform(): string;
  isPluginAvailable?(name: string): boolean;
  Plugins?: { CapacitorHttp?: CapacitorHttpPlugin };
}

export type HttpRoute =
  | { kind: "capacitor"; request: CapacitorHttpPlugin }
  | { kind: "obsidian" }
  | { kind: "unavailable" };

export function capacitorOptions(init: HttpInit, timeoutMs: number): CapacitorHttpOptions {
  const options: CapacitorHttpOptions = {
    url: init.url,
    method: init.method,
    headers: init.headers,
    responseType: "text",
    readTimeout: timeoutMs,
    connectTimeout: timeoutMs,
    shouldEncodeUrlParams: false,
  };
  if (init.body !== undefined) options.data = init.body;
  return options;
}

export function readHttpResult(status: unknown, data: unknown): { status: number; text: string } {
  if (typeof status !== "number" || !Number.isInteger(status)) throw new Error("ответ без кода");
  if (typeof data === "string") return { status, text: data };
  if (data && typeof data === "object") return { status, text: JSON.stringify(data) };
  throw new Error("пустой ответ");
}

export function httpRoute(scope: object = globalThis): HttpRoute {
  const cap = capacitorFrom(scope);
  if (!cap) return { kind: "obsidian" };
  const platform = cap.getPlatform();
  if (platform !== "ios" && platform !== "android") return { kind: "obsidian" };
  if (cap.isPluginAvailable && !cap.isPluginAvailable("CapacitorHttp")) return { kind: "unavailable" };
  const http = cap.Plugins?.CapacitorHttp;
  if (!http || typeof http.request !== "function") return { kind: "unavailable" };
  return { kind: "capacitor", request: http };
}

export function withDeadline<T>(pending: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), timeoutMs);
  });
  pending.catch(() => undefined);
  return Promise.race([pending, deadline]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

function capacitorFrom(scope: object): CapacitorLike | undefined {
  if (!("Capacitor" in scope)) return undefined;
  const value = scope.Capacitor;
  if (!value || typeof value !== "object") return undefined;
  if (!("getPlatform" in value) || typeof value.getPlatform !== "function") return undefined;
  const getPlatform = value.getPlatform;
  const isPluginAvailable = "isPluginAvailable" in value && typeof value.isPluginAvailable === "function" ? value.isPluginAvailable : undefined;
  const plugins = "Plugins" in value ? value.Plugins : undefined;
  const http = plugins && typeof plugins === "object" && "CapacitorHttp" in plugins ? plugins.CapacitorHttp : undefined;
  const plugin = httpPlugin(http);
  return {
    getPlatform: () => {
      const platform = Reflect.apply(getPlatform, value, []);
      if (typeof platform !== "string") throw new Error("платформа Capacitor без имени");
      return platform;
    },
    isPluginAvailable: isPluginAvailable
      ? (name) => {
          const available = Reflect.apply(isPluginAvailable, value, [name]);
          if (typeof available !== "boolean") throw new Error("CapacitorHttp: ответ isPluginAvailable не boolean");
          return available;
        }
      : undefined,
    Plugins: plugin ? { CapacitorHttp: plugin } : undefined,
  };
}

function httpPlugin(value: unknown): CapacitorHttpPlugin | undefined {
  if (!value || typeof value !== "object" || !("request" in value) || typeof value.request !== "function") return undefined;
  const request = value.request;
  return {
    request: (options) => Reflect.apply(request, value, [options]),
  };
}
