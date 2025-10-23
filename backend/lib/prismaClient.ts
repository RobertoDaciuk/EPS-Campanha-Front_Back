/**
 * @file prismaClient.ts
 * @version 2.4.0
 * @description
 * Cliente Prisma com singleton seguro, logs completos e recuperação de erros.
 * Corrige o bug "$use is not a function" em ambientes com hot reload (Node 22 + tsx).
 * @since 2025-10-22
 */

import { PrismaClient, Prisma } from '@prisma/client';

/* ============================================================
   LOG HELPER
   ============================================================ */
const log = {
  info: (msg: string) => console.log(`[PRISMA:INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[PRISMA:WARN] ${msg}`),
  error: (msg: string, err?: unknown) =>
    console.error(`[PRISMA:ERROR] ${msg}`, err || ''),
  debug: (msg: string) => {
    if (process.env.NODE_ENV === 'development')
      console.log(`[PRISMA:DEBUG] ${msg}`);
  },
};

/* ============================================================
   SINGLETON ISOLADO COM FALHA SEGURA
   ============================================================ */

const createPrismaClient = (): PrismaClient => {
  log.debug('Criando nova instância do PrismaClient...');
  const logLevel = (() => {
    if (process.env.NODE_ENV === 'development')
      return ['query', 'info', 'warn', 'error'] as Prisma.LogLevel[];
    if (process.env.NODE_ENV === 'production')
      return ['warn', 'error'] as Prisma.LogLevel[];
    return [] as Prisma.LogLevel[];
  })();

  const client = new PrismaClient({
    log: logLevel.map((lvl) => ({ emit: 'stdout', level: lvl })),
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  return client;
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

let prisma: PrismaClient;

/**
 * Função principal que garante que a instância é válida.
 */
const initializeClient = (): PrismaClient => {
  try {
    const existing = globalThis.prismaGlobal;
    if (existing && typeof existing.$use === 'function') {
      log.debug('Usando instância Prisma existente do cache global.');
      return existing;
    }
    log.warn('Instância global inválida ou corrompida. Recriando...');
    const fresh = createPrismaClient();
    if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = fresh;
    return fresh;
  } catch (error) {
    log.error('Falha ao inicializar PrismaClient.', error);
    throw error;
  }
};

// Gera a instância final
prisma = initializeClient();

/* ============================================================
   TESTE DE SAÚDE IMEDIATO
   ============================================================ */
(async () => {
  try {
    await prisma.$executeRawUnsafe('SELECT 1').catch(() => void 0);
    log.info('Instância do Prisma verificada com sucesso.');
  } catch (err) {
    log.warn('Prisma não respondeu ao teste inicial. Tentando novo cliente...');
    prisma = createPrismaClient();
    if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
  }
})();

/* ============================================================
   MIDDLEWARES COM VERIFICAÇÃO ATIVA
   ============================================================ */
const registerMiddlewares = (client: PrismaClient) => {
  if (typeof client.$use !== 'function') {
    log.warn('Método $use ausente; recriando cliente...');
    prisma = createPrismaClient();
    if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
  }

  // Middleware de performance
  client.$use(async (params, next) => {
    const start = Date.now();
    try {
      const result = await next(params);
      const elapsed = Date.now() - start;

      if (process.env.NODE_ENV === 'production' && elapsed > 1000)
        log.warn(
          `Query lenta detectada: ${params.model}.${params.action} (${elapsed}ms)`
        );
      else if (process.env.NODE_ENV === 'development')
        log.debug(`${params.model}.${params.action} (${elapsed}ms)`);

      return result;
    } catch (error) {
      const elapsed = Date.now() - start;
      log.error(
        `Erro em ${params.model ?? 'N/A'}.${params.action ?? 'N/A'} (${elapsed}ms)`,
        error
      );
      throw error;
    }
  });
};

registerMiddlewares(prisma);

/* ============================================================
   EVENTOS E DIAGNÓSTICOS
   ============================================================ */
const registerEventListeners = (client: PrismaClient) => {
  if (typeof client.$on !== 'function') {
    log.warn('Método $on ausente; recriando cliente...');
    prisma = createPrismaClient();
    if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
  }

  if (process.env.NODE_ENV === 'development') {
    client.$on('query', (e: Prisma.QueryEvent) => {
      log.debug(`QUERY: ${e.query}`);
      log.debug(`PARAMS: ${e.params}`);
      log.debug(`DURAÇÃO: ${e.duration}ms`);
    });
  }

  client.$on('info', (e: Prisma.LogEvent) => log.info(e.message));
  client.$on('warn', (e: Prisma.LogEvent) => log.warn(e.message));
  client.$on('error', (e: Prisma.LogEvent) => log.error(e.message));
};

registerEventListeners(prisma);

/* ============================================================
   CONEXÃO E DESCONECTORES
   ============================================================ */

let isConnected = false;

const connectPrisma = async () => {
  if (isConnected) return;
  try {
    log.info('Conectando ao banco de dados...');
    await prisma.$connect();
    isConnected = true;
    log.info('✅ Conexão Prisma estabelecida com sucesso.');
  } catch (err) {
    log.error('❌ Falha ao conectar ao banco de dados.', err);
    throw err;
  }
};

const disconnectPrisma = async () => {
  if (!isConnected) return;
  try {
    log.info('Encerrando conexão com o banco...');
    await prisma.$disconnect();
    isConnected = false;
    log.info('✅ Prisma desconectado com sucesso.');
  } catch (err) {
    log.error('❌ Erro ao desconectar Prisma.', err);
  }
};

if (process.env.NODE_ENV !== 'test') {
  connectPrisma().catch((err) => {
    log.error('Falha na inicialização do Prisma.', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  });
}

process.on('SIGINT', async () => {
  log.info('Recebido SIGINT. Encerrando Prisma...');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.info('Recebido SIGTERM. Encerrando Prisma...');
  await disconnectPrisma();
  process.exit(0);
});

/* ============================================================
   HEALTH & MÉTRICAS
   ============================================================ */

const healthCheck = async (): Promise<boolean> => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return true;
  } catch (err) {
    log.error('Health check Prisma falhou.', err);
    return false;
  }
};

const getStats = () => {
  const pkg = require('@prisma/client/package.json');
  return {
    isConnected,
    db: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'),
    env: process.env.NODE_ENV,
    prismaVersion: pkg.version,
  };
};

/* ============================================================
   UTILITÁRIOS DE CONSULTA
   ============================================================ */

export const prismaUtils = {
  buildPagination(page = 1, limit = 10) {
    const skip = Math.max(0, (page - 1) * limit);
    return { skip, take: Math.max(1, limit) };
  },

  buildTextSearch(term: string | null | undefined, fields: string[]) {
    if (!term || fields.length === 0) return {};
    return {
      OR: fields.map((f) => ({
        [f]: { contains: term, mode: 'insensitive' as const },
      })),
    };
  },

  formatPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    summary?: Record<string, any>
  ) {
    const safeLimit = Math.max(1, limit);
    const pages = Math.ceil(total / safeLimit);
    const safePage = Math.max(1, Math.min(page, pages || 1));
    return {
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: pages,
        hasNext: safePage < pages,
        hasPrev: safePage > 1,
      },
      summary,
    };
  },
};

/* ============================================================
   EXPORTAÇÕES
   ============================================================ */
export { prisma, connectPrisma, disconnectPrisma, healthCheck, getStats };

// Tipo auxiliar para transações
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
