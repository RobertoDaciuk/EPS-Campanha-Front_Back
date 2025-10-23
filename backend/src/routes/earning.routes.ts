/**
 * @file earning.routes.ts
 * @version 2.0.0
 * @description Rotas para gestão de ganhos/earnings da API EPS Campanhas.
 * Define endpoints para sistema financeiro, pagamentos e relatórios.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa das rotas de earnings
 * - Sistema de pagamentos e aprovações
 * - Relatórios financeiros detalhados
 * - Processamento em lote otimizado
 * - Auditoria completa de transações
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { 
  earningParamsSchema,
  earningFiltersSchema,
  createEarningSchema,
  updateEarningSchema,
  markEarningAsPaidSchema,
  bulkProcessEarningsSchema,
  financialReportSchema,
  earningProjectionSchema
} from '../schemas/earning.schema';
import {
  createEarningHandler,
  getEarningHandler,
  listEarningsHandler,
  updateEarningHandler,
  markEarningAsPaidHandler,
  bulkProcessEarningsHandler,
  generateFinancialReportHandler,
  getEarningProjectionHandler,
  getMyEarningsHandler,
  getEarningStatsHandler,
  cancelEarningHandler,
  getPendingEarningsHandler,
  getFinancialSummaryHandler
} from '../controllers/earning.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

// ==================== PLUGIN DE ROTAS DE EARNINGS ====================

export async function earningRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Registra provider de tipos Zod
  fastify.withTypeProvider<ZodTypeProvider>();

  // ==================== MIDDLEWARE GLOBAL ====================
  // Todas as rotas de earning requerem autenticação
  fastify.addHook('preHandler', authenticate);

  // ==================== ROTAS PRINCIPAIS ====================

  /**
   * GET /api/earnings
   * Lista earnings com filtros (dados específicos por perfil)
   */
  fastify.get('/', {
    schema: {
      description: 'Lista earnings com filtros e paginação',
      tags: ['Earnings'],
      querystring: earningFiltersSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'array' },
            pagination: { type: 'object' },
            summary: { type: 'object' },
          },
        },
      },
    },
  }, listEarningsHandler);

  /**
   * POST /api/earnings
   * Cria novo earning manualmente (apenas admin)
   */
  fastify.post('/', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Cria earning manualmente',
      tags: ['Earnings', 'Administração'],
      body: createEarningSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                earning: { type: 'object' },
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
  }, createEarningHandler);

  /**
   * GET /api/earnings/my-earnings
   * Earnings do usuário autenticado
   */
  fastify.get('/my-earnings', {
    schema: {
      description: 'Lista earnings do usuário autenticado',
      tags: ['Earnings'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' },
          status: { type: 'string', enum: ['PENDENTE', 'PAGO', 'all'] },
          type: { type: 'string', enum: ['SELLER', 'MANAGER', 'all'] },
          campaignId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'array' },
            pagination: { type: 'object' },
            summary: { type: 'object' },
          },
        },
      },
    },
  }, getMyEarningsHandler);

  /**
   * GET /api/earnings/pending
   * Earnings pendentes (filtrados por permissão)
   */
  fastify.get('/pending', {
    schema: {
      description: 'Lista earnings pendentes do usuário ou equipe',
      tags: ['Earnings'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'array' },
            summary: {
              type: 'object',
              properties: {
                totalPending: { type: 'number' },
                count: { type: 'number' },
                userId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, getPendingEarningsHandler);

  /**
   * GET /api/earnings/stats
   * Estatísticas de earnings do usuário ou sistema
   */
  fastify.get('/stats', {
    schema: {
      description: 'Estatísticas de earnings',
      tags: ['Earnings', 'Estatísticas'],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['7d', '30d', '90d'] },
          userId: { type: 'string', format: 'uuid' },
        },
      },
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
                period: { type: 'string' },
                userId: { type: 'string' },
                generatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, getEarningStatsHandler);

  /**
   * GET /api/earnings/:id
   * Busca earning específico por ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Busca earning por ID',
      tags: ['Earnings'],
      params: earningParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                earning: { type: 'object' },
              },
            },
          },
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
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
  }, getEarningHandler);

  /**
   * PUT /api/earnings/:id
   * Atualiza earning (apenas admin)
   */
  fastify.put('/:id', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Atualiza dados do earning',
      tags: ['Earnings', 'Administração'],
      params: earningParamsSchema,
      body: updateEarningSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                earning: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, updateEarningHandler);

  // ==================== ROTAS ADMINISTRATIVAS ====================

  /**
   * POST /api/earnings/:id/mark-as-paid
   * Marca earning como pago (apenas admin)
   */
  fastify.post('/:id/mark-as-paid', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Marca earning como pago',
      tags: ['Earnings', 'Pagamentos'],
      params: earningParamsSchema,
      body: markEarningAsPaidSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                earningId: { type: 'string' },
                paidAt: { type: 'string' },
                paidBy: { type: 'string' },
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
  }, markEarningAsPaidHandler);

  /**
   * POST /api/earnings/:id/cancel
   * Cancela earning (apenas admin)
   */
  fastify.post('/:id/cancel', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Cancela earning pendente',
      tags: ['Earnings', 'Administração'],
      params: earningParamsSchema,
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string', minLength: 5, maxLength: 500 },
        },
        required: ['reason'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                earningId: { type: 'string' },
                cancelledAt: { type: 'string' },
                cancelledBy: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, cancelEarningHandler);

  /**
   * POST /api/earnings/bulk-process
   * Processa earnings em lote (apenas admin)
   */
  fastify.post('/bulk-process', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Processa múltiplos earnings em lote',
      tags: ['Earnings', 'Administração'],
      body: bulkProcessEarningsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                processed: { type: 'number' },
                successful: { type: 'number' },
                failed: { type: 'number' },
                details: { type: 'array' },
              },
            },
          },
        },
      },
    },
  }, bulkProcessEarningsHandler);

  // ==================== ROTAS DE RELATÓRIOS ====================

  /**
   * GET /api/earnings/financial-report
   * Gera relatório financeiro (gerentes e admins)
   */
  fastify.get('/financial-report', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Gera relatório financeiro detalhado',
      tags: ['Earnings', 'Relatórios'],
      querystring: financialReportSchema,
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
  }, generateFinancialReportHandler);

  /**
   * GET /api/earnings/projection
   * Obtém projeções de earnings (gerentes e admins)
   */
  fastify.get('/projection', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Calcula projeções de earnings',
      tags: ['Earnings', 'Projeções'],
      querystring: earningProjectionSchema,
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
  }, getEarningProjectionHandler);

  /**
   * GET /api/earnings/financial-summary
   * Resumo financeiro (gerentes e admins)
   */
  fastify.get('/financial-summary', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Obtém resumo financeiro do período',
      tags: ['Earnings', 'Resumos'],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['7d', '30d', '90d'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                summary: { type: 'object' },
                period: { type: 'string' },
                generatedAt: { type: 'string' },
                scope: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, getFinancialSummaryHandler);

  // ==================== HOOKS ESPECÍFICOS ====================

  // Hook para log de operações financeiras críticas
  fastify.addHook('onRequest', async (request, reply) => {
    const criticalOperations = ['/mark-as-paid', '/cancel', '/bulk-process'];
    const isCritical = criticalOperations.some(op => request.url.includes(op));
    
    if (isCritical) {
      console.log(`[EARNING_ROUTES] Operação financeira crítica: ${request.method} ${request.url} por ${request.user?.email || 'não autenticado'}`);
    }
  });


  // Hook para validar permissões específicas de earning
  fastify.addHook('preHandler', async (request, reply) => {
    // Vendedores só podem ver earnings próprios ou fazer consultas básicas
    if (request.user?.role === UserRole.VENDEDOR) {
      const restrictedPaths = ['/financial-report', '/projection', '/bulk-process'];
      const isRestricted = restrictedPaths.some(path => request.url.includes(path));
      
      if (isRestricted) {
        reply.code(403).send({
          success: false,
          error: 'Acesso negado',
          message: 'Vendedores não podem acessar relatórios financeiros avançados',
        });
        return;
      }
    }
  });

  // Hook para monitoramento de performance financeira
  fastify.addHook('onResponse', async (request, reply) => {
    const responseTime = reply.elapsedTime;
    
    // Monitora performance de relatórios financeiros
    if (request.url.includes('/financial-report') && responseTime > 5000) {
      console.warn(`[EARNING_ROUTES] Relatório financeiro lento: ${responseTime}ms`);
    }
    
    // Monitora operações de pagamento
    if (request.url.includes('/mark-as-paid') && reply.statusCode >= 200 && reply.statusCode < 300) {
      console.log(`[EARNING_ROUTES] Pagamento processado: ${request.url} em ${responseTime}ms`);
    }
  });

  // Hook para validação de datas em relatórios
  fastify.addHook('preHandler', async (request, reply) => {
    const query = request.query as any;
    
    // Valida datas em relatórios financeiros
    if ((request.url.includes('/financial-report') || request.url.includes('/projection')) && 
        (query.startDate || query.endDate)) {
      
      if (query.startDate && query.endDate) {
        const startDate = new Date(query.startDate);
        const endDate = new Date(query.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          reply.code(400).send({
            success: false,
            error: 'Datas inválidas',
            message: 'Formato de data deve ser YYYY-MM-DD',
          });
          return;
        }
        
        if (startDate >= endDate) {
          reply.code(400).send({
            success: false,
            error: 'Período inválido',
            message: 'Data de início deve ser anterior à data de fim',
          });
          return;
        }
        
        // Limita período máximo para relatórios
        const maxPeriodMs = 365 * 24 * 60 * 60 * 1000; // 1 ano
        if ((endDate.getTime() - startDate.getTime()) > maxPeriodMs) {
          reply.code(400).send({
            success: false,
            error: 'Período muito longo',
            message: 'Período máximo para relatórios é de 1 ano',
          });
          return;
        }
      }
    }
  });
}
