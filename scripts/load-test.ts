const args = process.argv.slice(2);
const mode = args[0] || 'light';

const config = {
    light: { requests: 100, concurrency: 10 },
    medium: { requests: 500, concurrency: 50 },
    heavy: { requests: 2000, concurrency: 100 }
};

const settings = config[mode as keyof typeof config] || config.light;
const url = 'http://localhost:3012/api/health'; 

console.log(`\n🔥 Iniciando Teste de Carga: Modo ${mode.toUpperCase()}`);
console.log(`   URL: ${url}`);
console.log(`   Requests: ${settings.requests}`);
console.log(`   Concurrency: ${settings.concurrency}\n`);

const latencies: number[] = [];
let errors = 0;
const start = Date.now();

async function worker(id: number, count: number) {
    for (let i = 0; i < count; i++) {
        const reqStart = Date.now();
        try {
            const res = await fetch(url);
            if (!res.ok) errors++;
            latencies.push(Date.now() - reqStart);
        } catch (e) {
            errors++;
            latencies.push(Date.now() - reqStart);
        }
    }
}

const workers = Array(settings.concurrency).fill(null).map((_, i) => 
    worker(i, Math.ceil(settings.requests / settings.concurrency))
);

Promise.all(workers).then(() => {
    const totalTime = (Date.now() - start) / 1000;
    latencies.sort((a, b) => a - b);
    
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const max = latencies[latencies.length - 1] || 0;

    console.log('-'.repeat(40));
    console.log('📊 RESULTADOS DO TESTE');
    console.log('-'.repeat(40));
    console.log(`Tempo Total:       ${totalTime.toFixed(2)}s`);
    console.log(`RPS (Req/s):       ${(settings.requests / totalTime).toFixed(2)}`);
    console.log(`Taxa de Sucesso:   ${((settings.requests - errors) / settings.requests * 100).toFixed(2)}%`);
    console.log(`Erros:             ${errors}`);
    console.log('-'.repeat(40));
    console.log('⏱️  LATÊNCIA (ms)');
    console.log(`Média:             ${avg.toFixed(2)}ms`);
    console.log(`Mediana (P50):     ${p50}ms`);
    console.log(`P95:               ${p95}ms`);
    console.log(`P99:               ${p99}ms`);
    console.log(`Máxima:            ${max}ms`);
    console.log('-'.repeat(40));

    if (p95 > 500) {
        console.log('⚠️  ALERTA: P95 acima de 500ms. Otimização necessária.');
        process.exit(1);
    } else if (errors > 0) {
        console.log('⚠️  ALERTA: Erros detectados durante o teste.');
        process.exit(1);
    } else {
        console.log('✅ Performance Aceitável.');
        process.exit(0);
    }
});