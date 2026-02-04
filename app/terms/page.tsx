export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white">Termos de Uso</h1>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">1. Aceitação</h2>
          <p>Ao criar uma conta na GlobalSecureSend, você concorda com estes termos.</p>
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">2. Uso do Serviço</h2>
          <p>O serviço destina-se apenas a transações lícitas. Qualquer atividade suspeita resultará no bloqueio imediato da conta.</p>
        </section>
      </div>
    </div>
  );
}
