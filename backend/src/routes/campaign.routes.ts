/**
 * @file campaign.routes.ts
 * @version 2.0.0
 * @description Rotas para gestão de campanhas da API EPS Campanhas.
 * Define endpoints para CRUD de campanhas, kits, estatísticas e relatórios.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa das rotas de campanhas
 * - Endpoints específicos por perfil de usuário
 * - Sistema de kits e progresso
 * - Relatórios e estatísticas detalhadas
 * - Validação robusta com Zod schemas
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { 
  campaignParamsSchema,
  campaignFiltersSchema,
  createCampaignSchema,
  updateCampaignSchema,
  duplicateCampaignSchema,
  toggleCampaignStatusSchema
} from '../schemas/campaign.schema';
import {
  createCampaignHandler,
  getCampaignHandler,
  listCampaignsHandler,
  getCampaignDetailsHandler,
  updateCampaignHandler,
  deleteCampaignHandler,
  getCampaignStatsHandler,
  getActiveCampaignsHandler,
  duplicateCampaignHandler,
  toggleCampaignStatusHandler,
  checkParticipationHandler,
  getCampaignPerformanceHandler,
  updateExpiredCampaignsHandler
} from '../controllers/campaign.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

// ==================== PLUGIN DE ROTAS DE CAMPANHAS ====================

export async function campaignRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Registra provider de tipos Zod
  fastify.withTypeProvider<ZodTypeProvider>();

  // ==================== MIDDLEWARE GLOBAL ====================
  // Todas as rotas de campanha requerem autenticação
  fastify.addHook('preHandler', authenticate);

  // ==================== ROTAS PRINCIPAIS ====================

  /**
   * GET /api/campaigns
   * Lista campanhas com filtros (dados específicos por perfil)
   */
  fastify.get('/', {
    schema: {
      description: 'Lista campanhas com filtros e paginação',
      tags: ['Campanhas'],
      querystring: campaignFiltersSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'array' },
            pagination: { type: 'object' },
          },
        },
      },
    },
  }, listCampaignsHandler);

  /**
   * POST /api/campaigns
   * Cria nova campanha (apenas admin)
   */
  fastify.post('/', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Cria nova campanha no sistema',
      tags: ['Campanhas', 'Administração'],
      body: createCampaignSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                campaign: { type: 'object' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, createCampaignHandler);

  /**
   * GET /api/campaigns/active
   * Lista campanhas ativas (dados específicos por perfil)
   */
  fastify.get('/active', {
    schema: {
      description: 'Lista campanhas ativas do usuário',
      tags: ['Campanhas'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                campaigns: { type: 'array' },
              },
            },
          },
        },
      },
    },
  }, getActiveCampaignsHandler);

  /**
   * POST /api/campaigns/duplicate
   * Duplica campanha existente (apenas admin)
   */
  fastify.post('/duplicate', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Duplica campanha existente',
      tags: ['Campanhas', 'Administração'],
      body: duplicateCampaignSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                campaign: { type: 'object' },
                originalCampaignId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, duplicateCampaignHandler);

  /**
   * GET /api/campaigns/:id
   * Busca campanha específica por ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Busca campanha por ID',
      tags: ['Campanhas'],
      params: campaignParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                campaign: { type: 'object' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, getCampaignHandler);

  /**
   * PUT /api/campaigns/:id
   * Atualiza campanha (apenas admin)
   */
  fastify.put('/:id', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Atualiza dados da campanha',
      tags: ['Campanhas', 'Administração'],
      params: campaignParamsSchema,
      body: updateCampaignSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                campaign: { type: 'object' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, updateCampaignHandler);

  /**
   * DELETE /api/campaigns/:id
   * Exclui campanha (apenas admin)
   */
  fastify.delete('/:id', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Exclui campanha do sistema',
      tags: ['Campanhas', 'Administração'],
      params: campaignParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, deleteCampaignHandler);

  /**
   * GET /api/campaigns/:id/details
   * Detalhes da campanha com progresso do usuário
   */
  fastify.get('/:id/details', {
    schema: {
      description: 'Obtém detalhes da campanha com dados específicos do usuário',
      tags: ['Campanhas'],
      params: campaignParamsSchema,
      querystring: {
        type: 'object',
        properties: {
          includeTeamData: { type: 'boolean' },
          includeStats: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, getCampaignDetailsHandler);

  /**
   * GET /api/campaigns/:id/stats
   * Estatísticas da campanha (gerentes e admins)
   */
  fastify.get('/:id/stats', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Obtém estatísticas detalhadas da campanha',
      tags: ['Campanhas', 'Estatísticas'],
      params: campaignParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                stats: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, getCampaignStatsHandler);

  /**
   * GET /api/campaigns/:id/performance
   * Relatório de performance da campanha (gerentes e admins)
   */
  fastify.get('/:id/performance', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Obtém relatório de performance da campanha',
      tags: ['Campanhas', 'Relatórios'],
      params: campaignParamsSchema,
      querystring: {
        type: 'object',
        properties: {
          groupBy: { type: 'string', enum: ['day', 'week', 'month', 'user'] },
          includeDetails: { type: 'boolean' },
          format: { type: 'string', enum: ['json', 'csv', 'excel'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, getCampaignPerformanceHandler);

  /**
   * POST /api/campaigns/:id/check-participation
   * Verifica se usuário pode participar da campanha
   */
  fastify.post('/:id/check-participation', {
    schema: {
      description: 'Verifica se usuário pode participar da campanha',
      tags: ['Campanhas'],
      params: campaignParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                campaignId: { type: 'string' },
                userId: { type: 'string' },
                canParticipate: { type: 'boolean' },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, checkParticipationHandler);

  /**
   * PATCH /api/campaigns/:id/status
   * Altera status da campanha (apenas admin)
   */
  fastify.patch('/:id/status', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Altera status da campanha (ativa/concluída/expirada)',
      tags: ['Campanhas', 'Administração'],
      params: campaignParamsSchema,
      body: toggleCampaignStatusSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, toggleCampaignStatusHandler);

  // ==================== ROTAS DE MANUTENÇÃO ====================

  /**
   * POST /api/campaigns/maintenance/update-expired
   * Atualiza campanhas expiradas (apenas admin)
   */
  fastify.post('/maintenance/update-expired', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Atualiza automaticamente campanhas expiradas',
      tags: ['Campanhas', 'Manutenção'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                updatedCampaigns: { type: 'number' },
                executedAt: { type: 'string' },
                executedBy: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, updateExpiredCampaignsHandler);

  // ==================== HOOKS ESPECÍFICOS ====================

  // Hook para log de operações administrativas
  fastify.addHook('onRequest', async (request, reply) => {
    const adminRoutes = ['POST /', 'PUT /', 'DELETE /', '/status', '/duplicate', '/maintenance'];
    const isAdminOperation = adminRoutes.some(route => 
      (request.method + ' ' + request.routeOptions?.url?.replace(':id', 'ID')).includes(route) ||
      request.url.includes('maintenance') ||
      request.url.includes('status')
    );
    
    if (isAdminOperation) {
      console.log(`[CAMPAIGN_ROUTES] Operação administrativa: ${request.method} ${request.url} por ${request.user?.email || 'não autenticado'}`);
    }
  });

  // Hook para validação de datas em campanhas
  fastify.addHook('preHandler', async (request, reply) => {
    if ((request.method === 'POST' || request.method === 'PUT') && request.body) {
      const body = request.body as any;
      
      // Valida datas se estiverem presentes
      if (body.startDate && body.endDate) {
        const startDate = new Date(body.startDate);
        const endDate = new Date(body.endDate);
        
        if (startDate >= endDate) {
          reply.code(400).send({
            success: false,
            error: 'Datas inválidas',
            message: 'Data de início deve ser anterior à data de fim',
          });
          return;
        }
        
        // Verifica se não é muito no passado para campanhas novas
        if (request.method === 'POST') {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          if (startDate < oneYearAgo) {
            reply.code(400).send({
              success: false,
              error: 'Data inválida',
              message: 'Data de início não pode ser mais de um ano no passado',
            });
            return;
          }
        }
      }
    }
  });

  // Hook para cache específico de campanhas
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Lista de campanhas ativas pode ser cacheada por pouco tempo
    if (request.method === 'GET' && request.url.includes('/active')) {
      reply.header('Cache-Control', 'private, max-age=180'); // 3 minutos
    }

    // Estatísticas podem ser cacheadas por mais tempo
    if (request.url.includes('/stats') || request.url.includes('/performance')) {
      reply.header('Cache-Control', 'private, max-age=600'); // 10 minutos
    }

    // Detalhes de campanha específica podem ter cache médio
    if (request.method === 'GET' && request.url.match(/\/campaigns\/[^\/]+$/)) {
      reply.header('Cache-Control', 'private, max-age=300'); // 5 minutos
    }

    // Operações de modificação não devem ser cacheadas
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    return payload;
  });

  // Hook para validar permissões específicas de campanha
  fastify.addHook('preHandler', async (request, reply) => {
    // Para rotas de detalhes e performance, vendedores só podem ver campanhas que participam
    if (request.user?.role === UserRole.VENDEDOR && 
        (request.url.includes('/details') || request.url.includes('/performance'))) {
      
      // Aqui seria implementada verificação se vendedor participa da campanha
      // Por agora, permite acesso
    }
  });

  // Hook para auditoria de alterações críticas
  fastify.addHook('onResponse', async (request, reply) => {
    const criticalOperations = ['DELETE /', '/status'];
    const isCritical = criticalOperations.some(op => 
      request.method.includes('DELETE') || request.url.includes('/status')
    );

    if (isCritical && reply.statusCode >= 200 && reply.statusCode < 300) {
      console.log(`[CAMPAIGN_ROUTES] Operação crítica executada: ${request.method} ${request.url} por ${request.user?.email} - Status: ${reply.statusCode}`);
    }
  });
}
