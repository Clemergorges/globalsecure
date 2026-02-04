export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white">Política de Privacidade</h1>
        <p>Última atualização: Fevereiro 2026</p>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">1. Coleta de Dados</h2>
          <p>Coletamos apenas as informações necessárias para processar suas transações financeiras e cumprir com as regulamentações bancárias (KYC/AML).</p>
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">2. Segurança</h2>
          <p>Utilizamos criptografia de ponta a ponta e não compartilhamos seus dados com terceiros não autorizados.</p>
        </section>
      </div>
    </div>
  );
}
