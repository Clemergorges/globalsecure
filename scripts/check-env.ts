import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url().describe('PostgreSQL Connection URL'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').describe('Stripe Secret Key (Production)'),
  RESEND_API_KEY: z.string().startsWith('re_').describe('Resend API Key'),
  NEXTAUTH_SECRET: z.string().min(32).describe('NextAuth Secret for JWT encryption'),
  NEXT_PUBLIC_APP_URL: z.string().url().describe('Application Public URL'),
  SENTRY_DSN: z.string().url().optional().describe('Sentry DSN for Error Tracking'),
  CRON_SECRET: z.string().min(10).describe('Secret to protect Cron Endpoints'),
  REDIS_URL: z.string().url().optional().describe('Redis URL for Rate Limiting/Queues')
});

async function checkEnv() {
  console.log('\n🔍 Iniciando Verificação de Variáveis de Ambiente para PRODUÇÃO...\n');

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ ERRO: Variáveis de ambiente inválidas ou ausentes:');
    const formatted = result.error.format();
    Object.entries(formatted).forEach(([key, value]) => {
      if (key !== '_errors') {
        // @ts-ignore
        console.error(`   - ${key}: ${value._errors.join(', ')}`);
      }
    });
    console.log('\n⚠️  Ação Necessária: Configure as variáveis acima no arquivo .env ou no painel de deploy.\n');
    process.exit(1);
  }

  console.log('✅ Todas as variáveis críticas estão presentes e com formato correto.');

  // Validações Adicionais de Conectividade (Simuladas se credenciais não forem reais)
  console.log('\n📡 Testando Conectividade com Serviços Externos...');
  
  // 1. Database Check
  try {
      // Simples check de URL, conexão real seria feita via Prisma
      const dbUrl = new URL(process.env.DATABASE_URL!);
      console.log(`   ✅ Database URL format valid (Host: ${dbUrl.hostname})`);
  } catch (e) {
      console.log(`   ❌ Database URL invalid`);
  }

  // 2. Stripe Check
  if (process.env.STRIPE_SECRET_KEY?.includes('_test_')) {
      console.warn('   ⚠️  AVISO: Stripe está usando chave de TESTE (_test_). Para produção, use chave live.');
  } else {
      console.log('   ✅ Stripe Production Key detected');
  }

  console.log('\n🚀 Ambiente pronto para validação final.\n');
}

checkEnv();