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
  'Common.loading': 'Carregando...',
  'Cards.removeCard': 'Remover Cartão',
  'Cards.removeCardAria': 'Remover cartão',
  'Cards.deleteDialog.title': 'Remover Cartão',
  'Cards.deleteDialog.description': 'Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.',
  'Cards.deleteDialog.confirm': 'Remover Cartão',
  'CardEmail.View.title': 'Seu cartão GlobalSecure',
  'CardEmail.View.subtitle': 'Veja saldo e gastos recentes sem criar conta.',
  'CardEmail.View.balanceInitial': 'Saldo inicial',
  'CardEmail.View.balanceAvailable': 'Saldo disponível',
  'CardEmail.View.transactionsTitle': 'Gastos',
  'CardEmail.View.emptyTransactions': 'Nenhuma transação ainda.',
  'CardEmail.View.merchantUnknown': 'Estabelecimento desconhecido',
  'CardEmail.View.note': 'Cartão virtual pré-pago. Não precisa de conta bancária.',
  'CardEmail.View.error.invalidOrExpired': 'Link inválido ou expirado.',
  'CardEmail.View.error.generic': 'Não foi possível carregar os dados. Tente novamente.',
  'CardEmail.View.otp.title': 'Código de acesso obrigatório',
  'CardEmail.View.otp.description': 'Digite o código de acesso de 6 caracteres para continuar.',
  'CardEmail.View.otp.label': 'Código de acesso',
  'CardEmail.View.otp.placeholder': '123456',
  'CardEmail.View.otp.submit': 'Continuar',
  'CardEmail.View.otp.submitting': 'Verificando...',
  'CardEmail.View.otp.invalid': 'Formato de código inválido.',
  'CardEmail.View.otp.failed': 'Código inválido ou link expirado.',
  'Incidents.treasuryHalt.title': 'Restrição temporária de serviço',
  'Incidents.treasuryHalt.description': 'Depósitos e saques podem ficar temporariamente indisponíveis. Tente novamente mais tarde.',
  'Incidents.yieldPaused.title': 'Yield temporariamente pausado',
  'Incidents.yieldPaused.description': 'Novas alocações em yield estão temporariamente indisponíveis. Posições existentes não são afetadas.',
  'Incidents.partnerOutage.title': 'Interrupção temporária de serviço',
  'Incidents.partnerOutage.description': 'Algumas funcionalidades podem ficar temporariamente indisponíveis. Tente novamente mais tarde.',
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
