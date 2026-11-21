import { promises as fs } from "node:fs";
import path from "node:path";
import defaults from "@/config/params.default.json";
import { ParamsSchema, type Params } from "@/engine/params";

export interface ParamsHistoryEntry {
  at: string;
  author: string;
  action: "put" | "reset";
  version: string;
  params: Params;
}

export interface ParamsStore {
  readonly kind: string;
  get(): Promise<Params>;
  put(params: Params, author: string): Promise<Params>;
  reset(author?: string): Promise<Params>;
  history(): Promise<ParamsHistoryEntry[]>;
}

const HISTORY_LIMIT = 50;

export function defaultParams(): Params {
  // Parse a fresh copy so callers can never mutate the bundled defaults.
  return ParamsSchema.parse(structuredClone(defaults));
}

function entry(action: ParamsHistoryEntry["action"], author: string, params: Params): ParamsHistoryEntry {
  return { at: new Date().toISOString(), author, action, version: params.version, params };
}

/** In-process store. Used on serverless hosts without KV; data is lost on cold start. */
export class MemoryParamsStore implements ParamsStore {
  readonly kind = "memory";
  private current: Params = defaultParams();
  private log: ParamsHistoryEntry[] = [];

  async get() {
    return structuredClone(this.current);
  }
  async put(params: Params, author: string) {
    this.current = ParamsSchema.parse(params);
    this.log = [entry("put", author, this.current), ...this.log].slice(0, HISTORY_LIMIT);
    return this.get();
  }
  async reset(author = "system") {
    this.current = defaultParams();
    this.log = [entry("reset", author, this.current), ...this.log].slice(0, HISTORY_LIMIT);
    return this.get();
  }
  async history() {
    return structuredClone(this.log);
  }
}

/** Local file store: data/params.json + data/params-history.json (gitignored). */
export class FileParamsStore implements ParamsStore {
  readonly kind = "file";
  constructor(private dir = path.join(process.cwd(), "data")) {}

  private get paramsFile() {
    return path.join(this.dir, "params.json");
  }
  private get historyFile() {
    return path.join(this.dir, "params-history.json");
  }

  private async readJson<T>(file: string): Promise<T | undefined> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw e;
    }
  }
  private async writeJson(file: string, data: unknown) {
    await fs.mkdir(this.dir, { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, file);
  }
  private async append(e: ParamsHistoryEntry) {
    const log = (await this.history()).slice(0, HISTORY_LIMIT - 1);
    await this.writeJson(this.historyFile, [e, ...log]);
  }

  async get() {
    const stored = await this.readJson<unknown>(this.paramsFile);
    if (stored === undefined) return defaultParams();
    const parsed = ParamsSchema.safeParse(stored);
    if (!parsed.success) {
      console.warn("[paramsStore] data/params.json is invalid, falling back to defaults");
      return defaultParams();
    }
    return parsed.data;
  }
  async put(params: Params, author: string) {
    const valid = ParamsSchema.parse(params);
    await this.writeJson(this.paramsFile, valid);
    await this.append(entry("put", author, valid));
    return valid;
  }
  async reset(author = "system") {
    await fs.rm(this.paramsFile, { force: true });
    const p = defaultParams();
    await this.append(entry("reset", author, p));
    return p;
  }
  async history() {
    return (await this.readJson<ParamsHistoryEntry[]>(this.historyFile)) ?? [];
  }
}

/** Upstash Redis via REST (no SDK). Enabled when UPSTASH_REDIS_REST_URL and _TOKEN are set. */
export class UpstashParamsStore implements ParamsStore {
  readonly kind = "upstash";
  private static KEY = "params:current";
  private static HISTORY_KEY = "params:history";

  constructor(
    private url: string,
    private token: string,
  ) {}

  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${args[0]} failed: ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: string };
    if (json.error) throw new Error(`Upstash ${args[0]} error: ${json.error}`);
    return json.result as T;
  }
  private async append(e: ParamsHistoryEntry) {
    await this.cmd("LPUSH", UpstashParamsStore.HISTORY_KEY, JSON.stringify(e));
    await this.cmd("LTRIM", UpstashParamsStore.HISTORY_KEY, 0, HISTORY_LIMIT - 1);
  }

  async get() {
    const raw = await this.cmd<string | null>("GET", UpstashParamsStore.KEY);
    if (!raw) return defaultParams();
    const parsed = ParamsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn("[paramsStore] Upstash params invalid, falling back to defaults");
      return defaultParams();
    }
    return parsed.data;
  }
  async put(params: Params, author: string) {
    const valid = ParamsSchema.parse(params);
    await this.cmd("SET", UpstashParamsStore.KEY, JSON.stringify(valid));
    await this.append(entry("put", author, valid));
    return valid;
  }
  async reset(author = "system") {
    await this.cmd("DEL", UpstashParamsStore.KEY);
    const p = defaultParams();
    await this.append(entry("reset", author, p));
    return p;
  }
  async history() {
    const raw = await this.cmd<string[]>("LRANGE", UpstashParamsStore.HISTORY_KEY, 0, HISTORY_LIMIT - 1);
    return (raw ?? []).map((s) => JSON.parse(s) as ParamsHistoryEntry);
  }
}

let instance: ParamsStore | undefined;

/**
 * Store selection: PARAMS_STORE=memory|file|upstash overrides; otherwise Upstash when configured,
 * memory on Vercel (read-only filesystem), file locally.
 */
export function getParamsStore(): ParamsStore {
  if (instance) return instance;
  const forced = process.env.PARAMS_STORE;
  const upUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if ((forced === "upstash" || !forced) && upUrl && upToken) {
    instance = new UpstashParamsStore(upUrl, upToken);
  } else if (forced === "memory" || (!forced && process.env.VERCEL)) {
    if (!forced) {
      console.warn("[paramsStore] No Upstash configured on Vercel: using in-memory store, admin changes are not persistent");
    }
    instance = new MemoryParamsStore();
  } else {
    instance = new FileParamsStore();
  }
  return instance;
}

/** Test helper. */
export function setParamsStore(store: ParamsStore | undefined) {
  instance = store;
}
