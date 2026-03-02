import { KycObjectRef, KycStorage } from '@/lib/kyc/storage/KycStorage';

type SupabaseClientLike = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: ArrayBuffer | Uint8Array,
        options: { contentType: string; upsert?: boolean; cacheControl?: string },
      ) => Promise<{ data: { path: string } | null; error: { message: string } | null }>;
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

function assertSafeKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) throw new Error('KYC storage key is required');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) throw new Error('KYC storage key must be a path, not a URL');
  if (trimmed.includes('..')) throw new Error('KYC storage key contains invalid path traversal');
}

export class SupabasePrivateKycStorage implements KycStorage {
  constructor(
    private readonly supabase: SupabaseClientLike,
    private readonly bucket: string,
  ) {}

  async putObject(params: { key: string; contentType: string; data: ArrayBuffer }): Promise<KycObjectRef> {
    assertSafeKey(params.key);

    const body = new Uint8Array(params.data);
    const { data, error } = await this.supabase.storage.from(this.bucket).upload(params.key, body, {
      contentType: params.contentType,
      upsert: false,
      cacheControl: 'no-store',
    });

    if (error || !data?.path) {
      throw new Error(`KYC storage upload failed: ${error?.message ?? 'unknown'}`);
    }

    return {
      bucket: this.bucket,
      key: data.path,
      contentType: params.contentType,
      sizeBytes: body.byteLength,
    };
  }

  async getSignedReadUrl(params: { key: string; expiresInSeconds: number }): Promise<string> {
    assertSafeKey(params.key);
    const ttl = Math.max(60, Math.min(params.expiresInSeconds, 60 * 60));

    const { data, error } = await this.supabase.storage.from(this.bucket).createSignedUrl(params.key, ttl);
    if (error || !data?.signedUrl) {
      throw new Error(`KYC storage signedUrl failed: ${error?.message ?? 'unknown'}`);
    }
    return data.signedUrl;
  }

  async deleteObject(params: { key: string }): Promise<void> {
    assertSafeKey(params.key);
    const { error } = await this.supabase.storage.from(this.bucket).remove([params.key]);
    if (error) throw new Error(`KYC storage delete failed: ${error.message}`);
  }
}
