export type KycObjectRef = {
  bucket: string;
  key: string;
  contentType: string;
  sizeBytes: number;
};

export interface KycStorage {
  putObject(params: {
    key: string;
    contentType: string;
    data: ArrayBuffer;
  }): Promise<KycObjectRef>;

  getSignedReadUrl(params: {
    key: string;
    expiresInSeconds: number;
  }): Promise<string>;

  deleteObject(params: { key: string }): Promise<void>;
}

