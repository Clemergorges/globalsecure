/**
 * Execute multiple operations concurrently
 */
export async function executeConcurrently<T>(
    operations: (() => Promise<T>)[],
    concurrency: number = 10
): Promise<T[]> {
    const results: T[] = [];
    const chunks = [];

    // Split operations into chunks
    for (let i = 0; i < operations.length; i += concurrency) {
        chunks.push(operations.slice(i, i + concurrency));
    }

    // Execute chunks sequentially, operations within chunk concurrently
    for (const chunk of chunks) {
        const chunkResults = await Promise.all(
            chunk.map(op =>
                retryWithBackoff(op, 5, 50)
            )
        );
        results.push(...chunkResults);
    }

    return results;
}

/**
 * Execute operations with race condition simulation
 */
export async function executeWithRaceCondition<T>(
    operation1: () => Promise<T>,
    operation2: () => Promise<T>
): Promise<[T | Error, T | Error]> {
    const results = await Promise.allSettled([
        retryWithBackoff(operation1, 5, 50),
        retryWithBackoff(operation2, 5, 50),
    ]);

    return results.map(result =>
        result.status === 'fulfilled' ? result.value : result.reason
    ) as [T | Error, T | Error];
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 100
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            const delay = initialDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Measure operation execution time
 */
export async function measureExecutionTime<T>(
    operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;

    return { result, duration };
}
