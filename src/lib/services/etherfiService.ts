import { callPartnerWithBreaker } from '@/lib/services/partner-circuit-breaker';

export type EtherFiCreatePositionInput = {
  transferId: string;
  userId: string;
  amount: number;
  currency: string;
};

export type EtherFiCreatePositionOutput = {
  positionId: string;
  status: 'OPEN' | 'PENDING';
};

export type EtherFiClosePositionInput = {
  positionId: string;
  reason: 'OTP_UNLOCK';
};

export type EtherFiClosePositionOutput = {
  positionId: string;
  status: 'CLOSED' | 'PENDING';
};

export type EtherFiPositionSnapshot = {
  positionId: string;
  currency: string;
  valueUsd: number;
  updatedAtIso: string;
};

function getEtherFiConfig() {
  const baseUrl = process.env.ETHERFI_API_URL;
  const apiKey = process.env.ETHERFI_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('ETHERFI_NOT_CONFIGURED');
  }
  return { baseUrl, apiKey };
}

export async function createEtherFiPosition(
  input: EtherFiCreatePositionInput
): Promise<EtherFiCreatePositionOutput> {
  const { baseUrl, apiKey } = getEtherFiConfig();

  const res = await callPartnerWithBreaker('etherfi', 'positions.create', async () =>
    fetch(`${baseUrl.replace(/\/$/, '')}/positions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'idempotency-key': input.transferId,
      },
      body: JSON.stringify({
        reference: input.transferId,
        customerId: input.userId,
        amount: input.amount,
        currency: input.currency,
      }),
    }),
  );

  if (!res.ok) {
    throw new Error(`ETHERFI_CREATE_FAILED:${res.status}`);
  }

  const data = (await res.json()) as { id?: string; status?: string };

  if (!data?.id) {
    throw new Error('ETHERFI_CREATE_FAILED:INVALID_RESPONSE');
  }

  return {
    positionId: data.id,
    status: data.status === 'PENDING' ? 'PENDING' : 'OPEN',
  };
}

export async function closeEtherFiPosition(
  input: EtherFiClosePositionInput
): Promise<EtherFiClosePositionOutput> {
  const { baseUrl, apiKey } = getEtherFiConfig();

  const res = await callPartnerWithBreaker('etherfi', 'positions.close', async () =>
    fetch(`${baseUrl.replace(/\/$/, '')}/positions/${encodeURIComponent(input.positionId)}/close`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ reason: input.reason }),
    }),
  );

  if (!res.ok) {
    throw new Error(`ETHERFI_CLOSE_FAILED:${res.status}`);
  }

  const data = (await res.json()) as { id?: string; status?: string };

  if (!data?.id) {
    throw new Error('ETHERFI_CLOSE_FAILED:INVALID_RESPONSE');
  }

  return {
    positionId: data.id,
    status: data.status === 'PENDING' ? 'PENDING' : 'CLOSED',
  };
}

export async function getEtherFiPositionSnapshot(positionId: string): Promise<EtherFiPositionSnapshot> {
  const { baseUrl, apiKey } = getEtherFiConfig();

  const res = await callPartnerWithBreaker('etherfi', 'positions.get', async () =>
    fetch(`${baseUrl.replace(/\/$/, '')}/positions/${encodeURIComponent(positionId)}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    }),
  );

  if (!res.ok) {
    throw new Error(`ETHERFI_POSITION_FETCH_FAILED:${res.status}`);
  }

  const data = (await res.json()) as any;
  const valueUsd = Number(data?.valueUsd ?? data?.value_usd ?? data?.reportedUsd ?? 0);
  const currency = String(data?.currency ?? 'USD');
  const updatedAtIso = String(data?.updatedAt ?? data?.updated_at ?? new Date().toISOString());

  return { positionId, currency, valueUsd, updatedAtIso };
}
