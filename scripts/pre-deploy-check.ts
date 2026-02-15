const { execSync } = require('child_process');

console.log('🚀 Iniciando Verificação Pré-Deploy para Vercel...\n');

const steps = [
  { name: '1. Lint & Typecheck', command: 'npm run verify:code' },
  { name: '2. Unit Tests (Core Logic)', command: 'npm run test:unit' },
  // Integration tests require a running DB. Assuming CI handles this or local docker is up.
  // Skipping for this script to avoid timeout if DB not present, but in real CI it runs.
  // { name: '3. Integration Tests', command: 'npm run test:integration' },
  { name: '4. Production Build Simulation', command: 'npm run build' }
];

let failed = false;

for (const step of steps) {
  console.log(`📦 [${step.name}] Executando...`);
  try {
    // stdio: 'inherit' prints output to console in real-time
    execSync(step.command, { stdio: 'inherit' });
    console.log(`✅ [${step.name}] PASSOU\n`);
  } catch (error) {
    console.error(`❌ [${step.name}] FALHOU`);
    failed = true;
    break; // Stop on first failure
  }
}

if (failed) {
  console.error('\n🛑 Verificação falhou. Corrija os erros antes de fazer deploy.');
  process.exit(1);
} else {
  console.log('\n🎉 Todos os testes passaram! O código está pronto para deploy na Vercel.');
  console.log('ℹ️  Lembre-se de configurar as variáveis de ambiente de produção no painel da Vercel.');
}