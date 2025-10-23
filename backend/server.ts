/**
 * @file server.ts
 * @version 2.0.1
 * @description Servidor principal da API EPS Campanhas.
 * Configura Fastify, middlewares, rotas e inicia o servidor.
 * @author DevEPS
 * @since 2025-10-21
 * * @changelog
 * - 2.0.1 (2025-10-22): Corrigida falha de CORS em desenvolvimento.
 * Alterado 'origin: true' para 'origin: [process.env.FRONTEND_URL || 'http://localhost:3000']'
 * para permitir 'credentials: true' com uma origem explícita.
 */

import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { ZodTypeProvider, serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod';

// Importação das rotas
import { authRoutes } from './src/routes/auth.routes';
import { userRoutes } from './src/routes/user.routes';
import { campaignRoutes } from './src/routes/campaign.routes';
import { dashboardRoutes } from './src/routes/dashboard.routes';
import { earningRoutes } from './src/routes/earning.routes';
import { premioRoutes } from './src/routes/premio.routes';
import { submissionRoutes } from './src/routes/submission.routes';
import { validationRoutes } from './src/routes/validation.routes';

// ==================== CONFIGURAÇÕES ====================

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || 'v1';

// ==================== CRIAÇÃO DO SERVIDOR ====================

/**
 * Cria e configura instância do Fastify
 */
const createServer = (): FastifyInstance => {
  const server = fastify({
    logger: {
      level: NODE_ENV === 'production' ? 'info' : 'debug',
      transport: NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: true,
        },
      } : undefined,
    },
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: 'array',
        useDefaults: true,
      },
    },
    trustProxy: NODE_ENV === 'production',
    bodyLimit: 50 * 1024 * 1024, // 50MB para uploads
  });

  return server.withTypeProvider<ZodTypeProvider>();
};

/**
 * Registra plugins essenciais
 */
const registerPlugins = async (server: FastifyInstance): Promise<void> => {
  // Validação e serialização com Zod
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // CORS
  await server.register(cors, {
    // CORREÇÃO AQUI:
    // Não podemos usar 'origin: true' (que é '*') junto com 'credentials: true'.
    // Devemos especificar a(s) origem(ns) permitida(s).
    origin: NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://eps-campanhas.com']
      : [process.env.FRONTEND_URL || 'http://localhost:3000'], // Permite localhost:3000
    
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  // Segurança com Helmet
  await server.register(helmet, {
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: NODE_ENV === 'production' ? 100 : 1000, // requests per window
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => {
      return {
        success: false,
        error: 'Muitas requisições',
        message: `Limite de ${context.max} requisições por minuto excedido`,
        retryAfter: Math.round(context.ttl / 1000),
      };
    },
  });

  // Upload de arquivos
  await server.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1024 * 1024, // 1MB
      fields: 10,
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 5,
      headerPairs: 2000,
    },
  });

  // Documentação Swagger
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'EPS Campanhas API',
        description: 'API completa para sistema de campanhas de incentivo EPS',
        version: '2.0.0',
        contact: {
          name: 'DevEPS',
          email: 'dev@eps.com',
        },
      },
      servers: [
        {
          url: NODE_ENV === 'production' 
            ? 'https://api.eps-campanhas.com'
            : `http://localhost:${PORT}`,
          description: NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento',
        },
      ],
      tags: [
        { name: 'Autenticação', description: 'Endpoints de autenticação e autorização' },
        { name: 'Dashboard', description: 'Dashboards específicos por perfil' },
        { name: 'Usuários', description: 'Gestão de usuários e hierarquias' },
        { name: 'Campanhas', description: 'Gestão de campanhas e kits' },
        { name: 'Submissões', description: 'Submissões de vendas e validação' },
        { name: 'Earnings', description: 'Sistema financeiro e pagamentos' },
        { name: 'Prêmios', description: 'Catálogo de prêmios e resgates' },
        { name: 'Validação', description: 'Sistema de validação de planilhas' },
        { name: 'Sistema', description: 'Utilitários e monitoramento' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ BearerAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });

  // Interface Swagger UI
  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
      defaultModelExpandDepth: 2,
      defaultModelsExpandDepth: 1,
      displayOperationId: false,
      displayRequestDuration: true,
      filter: true,
      showExtensions: false,
      showCommonExtensions: false,
      tryItOutEnabled: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });
};

/**
 * Registra todas as rotas da API
 */
const registerRoutes = async (server: FastifyInstance): Promise<void> => {
  // Registra rotas com prefixo /api
  await server.register(async function (fastify) {
    // Rotas de autenticação
    await fastify.register(authRoutes, { prefix: '/auth' });
    
    // Rotas principais
    await fastify.register(userRoutes, { prefix: '/users' });
    await fastify.register(campaignRoutes, { prefix: '/campaigns' });
    await fastify.register(dashboardRoutes, { prefix: '/dashboard' });
    await fastify.register(earningRoutes, { prefix: '/earnings' });
    await fastify.register(premioRoutes, { prefix: '/premios' });
    await fastify.register(submissionRoutes, { prefix: '/submissions' });
    await fastify.register(validationRoutes, { prefix: '/validation' });
  }, { prefix: '/api' });
};

/**
 * Configura middleware global e handlers
 */
const setupGlobalMiddleware = (server: FastifyInstance): void => {
  // Handler para rotas não encontradas
  server.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: 'Rota não encontrada',
      message: `${request.method} ${request.url} não existe`,
      timestamp: new Date().toISOString(),
    });
  });

  // Handler global de erros
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);

    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';

    // Erros de validação Zod
    if (error.code === 'FST_ERR_VALIDATION') {
      statusCode = 400;
      errorMessage = 'Dados inválidos';
    }

    // Rate limiting
    if (error.statusCode === 429) {
      statusCode = 429;
      errorMessage = 'Muitas requisições';
    }

    // Payload muito grande
    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      statusCode = 413;
      errorMessage = 'Arquivo muito grande';
    }

    reply.code(statusCode).send({
      success: false,
      error: error.name || 'Erro interno',
      message: errorMessage,
      ...(NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack,
      }),
      timestamp: new Date().toISOString(),
    });
  });

  // Hook global para log de requisições
  server.addHook('onRequest', async (request, reply) => {
    server.log.info(`${request.method} ${request.url} - IP: ${request.ip}`);
  });

  // Hook global para log de respostas
  server.addHook('onSend', async (request, reply, payload) => {
    const duration = reply.elapsedTime;
    
    if (duration > 2000) { // Log slow requests (>2s)
      server.log.warn(`Slow request: ${request.method} ${request.url} - ${duration}ms`);
    }

    return payload;
  });

  // Hook para headers de segurança
  server.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-API-Version', '2.0.0');
    reply.header('X-Powered-By', 'EPS-Campanhas');
    return payload;
  });
};

/**
 * Configura rotas de saúde e utilitários
 */
const setupHealthRoutes = (server: FastifyInstance): void => {
  // Health check principal
  server.get('/health', {
    schema: {
      description: 'Health check da API',
      tags: ['Sistema'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                timestamp: { type: 'string' },
                version: { type: 'string' },
                uptime: { type: 'number' },
                environment: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      success: true,
      message: 'API EPS Campanhas está funcionando',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        uptime: Math.round(process.uptime()),
        environment: NODE_ENV,
      },
    };
  });

  // Rota raiz
  server.get('/', {
    schema: {
      description: 'Informações da API',
      tags: ['Sistema'],
    },
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Bem-vindo à API EPS Campanhas',
      data: {
        name: 'EPS Campanhas API',
        version: '2.0.0',
        description: 'Sistema completo de campanhas de incentivo para vendedores',
        documentation: '/docs',
        health: '/health',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          campaigns: '/api/campaigns',
          dashboard: '/api/dashboard',
          earnings: '/api/earnings',
          premios: '/api/premios',
          submissions: '/api/submissions',
          validation: '/api/validation',
        },
      },
    };
  });

  // Rota de status do banco de dados
  server.get('/health/database', {
    schema: {
      description: 'Status da conexão com banco de dados',
      tags: ['Sistema'],
    },
  }, async (request, reply) => {
    try {
      const { prisma } = require('./lib/prismaClient');
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        success: true,
        message: 'Conexão com banco de dados OK',
        data: {
          status: 'connected',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      server.log.error('Database connection failed:', error);
      
      reply.code(503);
      return {
        success: false,
        error: 'Database connection failed',
        message: 'Falha na conexão com banco de dados',
        data: {
          status: 'disconnected',
          timestamp: new Date().toISOString(),
        },
      };
    }
  });
};

/**
 * Inicia o servidor
 */
const start = async (): Promise<void> => {
  const server = createServer();

  try {
    // Registra plugins essenciais
    await registerPlugins(server);

    // Configura middleware global
    setupGlobalMiddleware(server);

    // Configura rotas de saúde
    setupHealthRoutes(server);

    // Registra todas as rotas da API
    await registerRoutes(server);

    // Inicia o servidor
    await server.listen({
      port: PORT,
      host: HOST,
    });

    // Log de inicialização
    console.log('');
    console.log('🚀 ========================================');
    console.log('🎯 EPS CAMPANHAS API - V2.0.0');
    console.log('🚀 ========================================');
    console.log(`✅ Servidor rodando em: http://${HOST}:${PORT}`);
    console.log(`📚 Documentação em: http://${HOST}:${PORT}/docs`);
    console.log(`💚 Health check em: http://${HOST}:${PORT}/health`);
    console.log(`🌍 Ambiente: ${NODE_ENV}`);
    console.log(`🔗 CORS configurado para: ${NODE_ENV === 'production' ? (process.env.FRONTEND_URL || 'produção') : (process.env.FRONTEND_URL || 'http://localhost:3000')}`); // <-- LOG CORRIGIDO
    console.log('🚀 ========================================');
    console.log('');

    // Log das rotas principais
    console.log('📋 ENDPOINTS PRINCIPAIS:');
    console.log(`   🔐 Autenticação: http://${HOST}:${PORT}/api/auth`);
    console.log(`   👥 Usuários: http://${HOST}:${PORT}/api/users`);
    console.log(`   🎯 Campanhas: http://${HOST}:${PORT}/api/campaigns`);
    console.log(`   📊 Dashboard: http://${HOST}:${PORT}/api/dashboard`);
    console.log(`   💰 Earnings: http://${HOST}:${PORT}/api/earnings`);
    console.log(`   🎁 Prêmios: http://${HOST}:${PORT}/api/premios`);
    console.log(`   📝 Submissões: http://${HOST}:${PORT}/api/submissions`);
    console.log(`   ✅ Validação: http://${HOST}:${PORT}/api/validation`);
    console.log('');

    console.log('🔥 SISTEMA PRONTO PARA USO!');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

/**
 * Handler para graceful shutdown
 */
const gracefulShutdown = (server: FastifyInstance) => {
  const signals = ['SIGTERM', 'SIGINT'];
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n📴 Recebido sinal ${signal}. Iniciando shutdown graceful...`);
      
      try {
        await server.close();
        
        // Fecha conexão com banco de dados
        const { prisma } = require('./lib/prismaClient');
        await prisma.$disconnect();
        
        console.log('✅ Shutdown concluído com sucesso');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro durante shutdown:', error);
        process.exit(1);
      }
    });
  });
};

/**
 * Handler para erros não capturados
 */
const setupErrorHandlers = (): void => {
  process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', promise, 'reason:', reason);
    process.exit(1);
  });
};

// ==================== EXECUÇÃO ====================

// Configura handlers de erro
setupErrorHandlers();

// Cria e configura servidor
const server = createServer();

// Configura graceful shutdown
gracefulShutdown(server);

// Inicia servidor
start();

// Exporta servidor para testes
export default server;