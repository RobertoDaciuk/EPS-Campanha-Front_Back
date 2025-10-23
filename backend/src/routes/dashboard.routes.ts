/**
 * @file dashboard.routes.ts
 * @version 2.0.0
 * @description Rotas para dashboards da API EPS Campanhas.
 * Define endpoints específicos para cada perfil com dados agregados e estatísticas.
 * @author DevEPS
 * @since 2025-10-21
 *
 * @changelog
 * - Implementação completa das rotas de dashboard
 * - Endpoints específicos por perfil (vendedor, gerente, admin)
 * - Sistema de ranking dinâmico
 * - Métricas de crescimento e performance
 * - Cache inteligente por tipo de dados
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  getDashboardDataHandler,
  getRankingHandler,
  getTeamPerformanceHandler,
  getActivityHistoryHandler,
  getGrowthMetricsHandler,
  getSellerDetailsHandler,
  getQuickStatsHandler,
  getTopPerformersHandler,
  refreshDashboardCacheHandler,
  dashboardHealthCheckHandler
} from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

// SCHEMAS ZOD - Reutilizáveis
const periodEnum = z.enum(['7d', '30d', '90d']);
const boolStringEnum = z.enum(['true', 'false']);
const uuid = z.string().uuid();

const apiSuccess = z.object({ success: z.boolean(), message: z.string(), data: z.any() });
const apiError = z.object({ success: z.boolean(), error: z.string(), message: z.string() });

export async function dashboardRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  fastify.withTypeProvider<ZodTypeProvider>();

  // MIDDLEWARE GLOBAL
  fastify.addHook('preHandler', authenticate);

  // ==================== ROTAS PRINCIPAIS ====================

  // GET /api/dashboard
  fastify.get('/', {
    schema: {
      description: 'Dados do dashboard principal específicos para o perfil do usuário',
      tags: ['Dashboard'],
      querystring: z.object({
        period: periodEnum.optional(),
        includeDetails: boolStringEnum.optional(),
      }),
      response: {
        200: apiSuccess,
        403: apiError,
      },
    },
  }, getDashboardDataHandler);

  // GET /api/dashboard/quick-stats
  fastify.get('/quick-stats', {
    schema: {
      description: 'Estatísticas rápidas do dashboard para carregamento otimizado',
      tags: ['Dashboard'],
      response: {
        200: apiSuccess,
      },
    },
  }, getQuickStatsHandler);

  // GET /api/dashboard/ranking
  fastify.get('/ranking', {
    schema: {
      description: 'Ranking de usuários por pontuação',
      tags: ['Dashboard', 'Ranking'],
      querystring: z.object({
        filter: z.enum(['Geral', 'Mensal', 'Semanal']).optional(),
        limit: z.string().regex(/^[1-9][0-9]*$/).optional(),
        page: z.string().regex(/^[1-9][0-9]*$/).optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          data: z.object({
            ranking: z.array(z.any()),
            currentUserPosition: z.any(),
            pagination: z.any(),
            filter: z.string().optional(),
            generatedAt: z.string()
          })
        }),
      },
    },
  }, getRankingHandler);

  // GET /api/dashboard/activity-history
  fastify.get('/activity-history', {
    schema: {
      description: 'Histórico de atividades do usuário ou equipe',
      tags: ['Dashboard', 'Atividades'],
      querystring: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        type: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        userId: uuid.optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          data: z.object({
            activities: z.array(z.any()),
            hasMore: z.boolean(),
            userId: z.string().optional(),
            filters: z.any(),
            generatedAt: z.string()
          })
        }),
      }
    }
  }, getActivityHistoryHandler);

  // ==================== ROTAS PARA GERENTES ====================

  // GET /api/dashboard/team-performance
  fastify.get('/team-performance', {
    preHandler: [authorize(UserRole.GERENTE)],
    schema: {
      description: 'Performance da equipe do gerente',
      tags: ['Dashboard', 'Gerentes'],
      querystring: z.object({
        period: periodEnum.optional(),
        sellerId: uuid.optional()
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          data: z.object({
            performance: z.array(z.any()),
            sellerDetails: z.any(),
            period: z.string(),
            managerId: z.string(),
            generatedAt: z.string(),
          })
        }),
      },
    },
  }, getTeamPerformanceHandler);

  // GET /api/dashboard/seller-details/:sellerId
  fastify.get('/seller-details/:sellerId', {
    preHandler: [authorize(UserRole.GERENTE)],
    schema: {
      description: 'Detalhes específicos de um vendedor da equipe',
      tags: ['Dashboard', 'Gerentes'],
      params: z.object({ sellerId: uuid }),
      querystring: z.object({
        period: periodEnum.optional(),
        includeActivity: boolStringEnum.optional(),
      }),
      response: {
        200: apiSuccess,
        404: apiError,
      }
    }
  }, getSellerDetailsHandler);

  // ==================== ROTAS PARA ADMINS/GERENTES ====================

  // GET /api/dashboard/growth-metrics
  fastify.get('/growth-metrics', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Métricas de crescimento do sistema ou equipe',
      tags: ['Dashboard', 'Métricas'],
      querystring: z.object({
        period: periodEnum.optional(),
        compareWith: periodEnum.optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          data: z.object({
            metrics: z.any(),
            comparison: z.any(),
            period: z.string(),
            generatedAt: z.string()
          })
        }),
      }
    }
  }, getGrowthMetricsHandler);

  // GET /api/dashboard/top-performers
  fastify.get('/top-performers', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Top performers globais ou da equipe',
      tags: ['Dashboard', 'Ranking'],
      querystring: z.object({
        period: periodEnum.optional(),
        limit: z.string().regex(/^[1-9][0-9]*$/).optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          data: z.object({
            topPerformers: z.array(z.any()),
            period: z.string(),
            scope: z.string(),
            generatedAt: z.string()
          })
        }),
      },
    }
  }, getTopPerformersHandler);

  // ==================== ROTAS DE MANUTENÇÃO ====================

  // POST /api/dashboard/refresh-cache
  fastify.post('/refresh-cache', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Atualiza cache do dashboard para otimizar performance',
      tags: ['Dashboard', 'Manutenção'],
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          data: z.object({
            updatedAt: z.string(),
            updatedBy: z.string(),
          })
        })
      }
    }
  }, refreshDashboardCacheHandler);

  // GET /api/dashboard/health
  fastify.get('/health', {
    schema: {
      description: 'Verifica saúde do sistema de dashboard',
      tags: ['Sistema'],
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          data: z.object({
            status: z.string(),
            timestamp: z.string(),
            checks: z.any(),
            failedChecks: z.number(),
            totalChecks: z.number(),
          })
        }),
        503: apiError
      }
    }
  }, dashboardHealthCheckHandler);

  // ==================== HOOKS ESPECÍFICOS ====================

  // Hook para otimização de cache baseado no perfil
  fastify.addHook('onSend', async (request, reply, payload) => {
    const userRole = request.user?.role;

    // Cache específico por tipo de usuário
    if (request.method === 'GET') {
      switch (userRole) {
        case UserRole.VENDEDOR:
          // Vendedores têm dados mais dinâmicos
          reply.header('Cache-Control', 'private, max-age=60'); // 1 minuto
          break;
        case UserRole.GERENTE:
          // Gerentes têm dados de equipe que mudam moderadamente
          reply.header('Cache-Control', 'private, max-age=180'); // 3 minutos
          break;
        case UserRole.ADMIN:
          // Admins têm dados agregados que podem ser cacheados por mais tempo
          reply.header('Cache-Control', 'private, max-age=300'); // 5 minutos
          break;
        default:
          reply.header('Cache-Control', 'private, max-age=60');
      }
    }

    // Rotas de ranking podem ter cache mais longo
    if (request.url.includes('/ranking')) {
      reply.header('Cache-Control', 'private, max-age=300'); // 5 minutos
    }

    // Métricas de crescimento podem ter cache ainda mais longo
    if (request.url.includes('/growth-metrics')) {
      reply.header('Cache-Control', 'private, max-age=600'); // 10 minutos
    }

    // Quick stats devem ser muito rápidas
    if (request.url.includes('/quick-stats')) {
      reply.header('Cache-Control', 'private, max-age=30'); // 30 segundos
    }

    return payload;
  });

  // Hook para log de acesso ao dashboard
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method === 'GET' && request.url === '/api/dashboard') {
      console.log(`[DASHBOARD_ROUTES] Dashboard acessado: ${request.user?.role} - ${request.user?.email}`);
    }
  });

  // Hook para validação de permissões específicas
  fastify.addHook('preHandler', async (request, reply) => {
    // Vendedores não podem acessar métricas de crescimento
    if (request.user?.role === UserRole.VENDEDOR && 
        request.url.includes('/growth-metrics')) {
      reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Vendedores não podem acessar métricas de crescimento',
      });
      return;
    }

    // Validação para rotas de detalhes de vendedor (apenas gerentes podem ver detalhes de sua equipe)
    if (request.url.includes('/seller-details/') && 
        request.user?.role === UserRole.GERENTE) {
      // A validação detalhada é feita no controller
    }
  });

  // Hook para headers de performance
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Adiciona headers para otimização de performance
    reply.header('X-Dashboard-Version', '2.0.0');
    reply.header('X-User-Role', request.user?.role || 'unknown');
    
    // Para dados de ranking, adiciona header de última atualização
    if (request.url.includes('/ranking')) {
      reply.header('X-Ranking-Generated', new Date().toISOString());
    }

    return payload;
  });

  // Hook para monitoramento de performance
  fastify.addHook('onResponse', async (request, reply) => {
    const responseTime = reply.elapsedTime;
    
    // Log de performance para rotas que devem ser rápidas
    if (request.url.includes('/quick-stats') && responseTime > 1000) {
      console.warn(`[DASHBOARD_ROUTES] Quick stats lento: ${responseTime}ms para ${request.user?.role}`);
    }

    if (request.url === '/api/dashboard' && responseTime > 2000) {
      console.warn(`[DASHBOARD_ROUTES] Dashboard principal lento: ${responseTime}ms para ${request.user?.role}`);
    }
  });

  // Hook para validar parâmetros de período
  fastify.addHook('preHandler', async (request, reply) => {
    const query = request.query as any;
    
    if (query.period && !['7d', '30d', '90d'].includes(query.period)) {
      reply.code(400).send({
        success: false,
        error: 'Período inválido',
        message: 'Período deve ser 7d, 30d ou 90d',
      });
      return;
    }

    if (query.limit) {
      const limit = parseInt(query.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        reply.code(400).send({
          success: false,
          error: 'Limit inválido',
          message: 'Limit deve ser um número entre 1 e 100',
        });
        return;
      }
    }

    if (query.page) {
      const page = parseInt(query.page);
      if (isNaN(page) || page < 1) {
        reply.code(400).send({
          success: false,
          error: 'Page inválido',
          message: 'Page deve ser um número maior que 0',
        });
        return;
      }
    }
  });
}
