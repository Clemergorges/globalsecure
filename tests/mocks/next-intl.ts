const PT: Record<string, string> = {
  'SecureTransfer.title': 'Global Link (Transferência Segura)',
  'SecureTransfer.subtitle': 'subtitle',
  'SecureTransfer.amount': 'Valor',
  'SecureTransfer.currency': 'currency',
  'SecureTransfer.recipientEmail': 'Email do Destinatário',
  'SecureTransfer.recipientName': 'Nome do Destinatário',
  'SecureTransfer.message': 'Mensagem',
  'SecureTransfer.submit': 'Gerar Global Link',
  'SecureTransfer.errors.requiredFields': 'Email e valor são obrigatórios.',
  'SecureTransfer.errors.submitFailed': 'Falha ao enviar',
  'SecureTransfer.success.title': 'Envio Realizado com Sucesso!',
  'SecureTransfer.success.description': 'description',
  'Common.cancel': 'Cancelar',
  'Cards.removeCard': 'Remover Cartão',
  'Cards.removeCardAria': 'Remover cartão',
  'Cards.deleteDialog.title': 'Remover Cartão',
  'Cards.deleteDialog.description': 'Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.',
  'Cards.deleteDialog.confirm': 'Remover Cartão',
};

function format(template: string, values?: Record<string, any>) {
  if (!values) return template;
  let out = template;
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === 'string' || typeof v === 'number') {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

export function useTranslations(namespace?: string) {
  const ns = namespace || '';
  const t: any = (key: string, values?: any) => {
    const full = ns ? `${ns}.${key}` : key;
    return format(PT[full] || key, values);
  };
  t.rich = (key: string, values?: any) => {
    const full = ns ? `${ns}.${key}` : key;
    return format(PT[full] || key, values);
  };
  return t;
}

export function useLocale() {
  return 'pt';
}

export function useNow() {
  return new Date();
}

export function useTimeZone() {
  return 'UTC';
}

export function NextIntlClientProvider({ children }: any) {
  return children;
}
