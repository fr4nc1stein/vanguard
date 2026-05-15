// Cloudflare runtime bindings available via getCloudflareContext().env
// These mirror the [[d1_databases]] bindings in wrangler.toml

export interface CloudflareEnv {
  DB: D1Database;
}

// Augment the global process.env type with our expected variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENCRYPTION_KEY: string;
      CLOUDFLARE_ACCOUNT_ID?: string;
      R2_ACCESS_KEY_ID?: string;
      R2_SECRET_ACCESS_KEY?: string;
      R2_BUCKET_NAME?: string;
      R2_PUBLIC_URL?: string;
      DISCORD_WEBHOOK_URL?: string;
      CLERK_SECRET_KEY?: string;
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
    }
  }
}

// Minimal D1 typings (wrangler provides the full @cloudflare/workers-types)
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1ExecResult>;
  }
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown[]>(): Promise<T[]>;
  }
  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta: Record<string, unknown>;
    error?: string;
  }
  interface D1ExecResult {
    count: number;
    duration: number;
  }
  interface R2Bucket {
    put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<R2Object>;
    get(key: string): Promise<R2ObjectBody | null>;
    delete(key: string): Promise<void>;
    list(options?: R2ListOptions): Promise<R2Objects>;
    createMultipartUpload(key: string, options?: R2MultipartOptions): Promise<R2MultipartUpload>;
  }
  interface R2PutOptions { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string>; }
  interface R2Object { key: string; size: number; etag: string; }
  interface R2ObjectBody extends R2Object { body: ReadableStream; arrayBuffer(): Promise<ArrayBuffer>; text(): Promise<string>; }
  interface R2Objects { objects: R2Object[]; truncated: boolean; cursor?: string; }
  interface R2ListOptions { prefix?: string; cursor?: string; limit?: number; }
  interface R2MultipartOptions { httpMetadata?: { contentType?: string }; }
  interface R2MultipartUpload { uploadId: string; uploadPart(partNumber: number, value: ReadableStream | ArrayBuffer): Promise<R2UploadedPart>; complete(parts: R2UploadedPart[]): Promise<R2Object>; abort(): Promise<void>; }
  interface R2UploadedPart { partNumber: number; etag: string; }
}

export {};
