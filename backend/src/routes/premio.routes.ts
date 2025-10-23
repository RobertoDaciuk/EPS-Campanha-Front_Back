/**
 * @file premio.routes.ts
 * @version 2.0.0
 * @description Rotas para gestão de prêmios da API EPS Campanhas.
 * Define endpoints para catálogo de prêmios, sistema de resgate e administração.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa das rotas de prêmios
 * - Sistema de resgate com validações
 * - Catálogo público e personalizado
 * - Controle de estoque administrativo
 * - Relatórios e estatísticas detalhadas
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { 
  premioParamsSchema,
  premioFiltersSchema,
  createPremioSchema,
  updatePremioSchema,
  updateStockSchema,
  bulkPremioImportSchema
} from '../schemas/premio.schema';
import {
  createPremioHandler,
  getPremioHandler,
  listPremiosHandler,
  updatePremioHandler,
  deletePremioHandler,
  redeemPremioHandler,
  getAvailablePremiosHandler,
  checkRedeemHandler,
  updateStockHandler,
  getPremioStatsHandler,
  getPopularPremiosHandler,
  restockPremioHandler,
  getLowStockHandler,
  getOutOfStockHandler,
  getPublicCatalogHandler,
  bulkImportPremiosHandler,
  getRedemptionHistoryHandler
} from '../controllers/premio.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

// ==================== PLUGIN DE ROTAS DE PRÊMIOS ====================

export async function premioRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Registra provider de tipos Zod
  fastify.withTypeProvider<ZodTypeProvider>();

  // ==================== ROTAS PÚBLICAS ====================

  /**
   * GET /api/premios/catalog
   * Catálogo público de prêmios (sem autenticação)
   */
  fastify.get('/catalog', {
    preHandler: [optionalAuth], // Autenticação opcional
    schema: {
      description: 'Catálogo público de prêmios disponíveis',
      tags: ['Prêmios', 'Público'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' },
          search: { type: 'string' },
          category: { type: 'string' },
          maxPoints: { type: 'number' },
          sort: { type: 'string', enum: ['title', 'pointsRequired', 'popularity'] },
          order: { type: 'string', enum: ['asc', 'desc'] },
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
          },
        },
      },
    },
  }, getPublicCatalogHandler);

  /**
   * GET /api/premios/popular
   * Prêmios mais populares (público)
   */
  fastify.get('/popular', {
    schema: {
      description: 'Lista prêmios mais populares',
      tags: ['Prêmios', 'Público'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
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
                premios: { type: 'array' },
                limit: { type: 'number' },
                generatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, getPopularPremiosHandler);

  // ==================== ROTAS AUTENTICADAS ====================

  fastify.register(async function authenticatedPremioRoutes(fastify) {
    // Middleware de autenticação obrigatório
    fastify.addHook('preHandler', authenticate);

    /**
     * GET /api/premios
     * Lista prêmios com dados personalizados para o usuário
     */
    fastify.get('/', {
      schema: {
        description: 'Lista prêmios com informações personalizadas',
        tags: ['Prêmios'],
        querystring: premioFiltersSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'array' },
              pagination: { type: 'object' },
              userContext: { type: 'object' },
            },
          },
        },
      },
    }, listPremiosHandler);

    /**
     * POST /api/premios
     * Cria novo prêmio (apenas admin)
     */
    fastify.post('/', {
      preHandler: [authorize(UserRole.ADMIN)],
      schema: {
        description: 'Cria novo prêmio no catálogo',
        tags: ['Prêmios', 'Administração'],
        body: createPremioSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  premio: { type: 'object' },
                },
              },
            },
          },
        },
      },
    }, createPremioHandler);

    /**
     * GET /api/premios/available
     * Prêmios disponíveis para o usuário autenticado
     */
    fastify.get('/available', {
      schema: {
        description: 'Lista prêmios disponíveis para resgate pelo usuário',
        tags: ['Prêmios'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  premios: { type: 'array' },
                  user: { type: 'object' },
                },
              },
            },
          },
        },
      },
    }, getAvailablePremiosHandler);

    /**
     * GET /api/premios/my-redemptions
     * Histórico de resgates do usuário
     */
    fastify.get('/my-redemptions', {
      schema: {
        description: 'Histórico de resgates do usuário autenticado',
        tags: ['Prêmios'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string' },
            limit: { type: 'string' },
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
                  redemptions: { type: 'array' },
                  pagination: { type: 'object' },
                  userId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }, getRedemptionHistoryHandler);

    /**
     * GET /api/premios/:id
     * Busca prêmio específico com dados do usuário
     */
    fastify.get('/:id', {
      schema: {
        description: 'Busca prêmio por ID com dados de disponibilidade',
        tags: ['Prêmios'],
        params: premioParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  premio: { type: 'object' },
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
    }, getPremioHandler);

    /**
     * PUT /api/premios/:id
     * Atualiza prêmio (apenas admin)
     */
    fastify.put('/:id', {
      preHandler: [authorize(UserRole.ADMIN)],
      schema: {
        description: 'Atualiza dados do prêmio',
        tags: ['Prêmios', 'Administração'],
        params: premioParamsSchema,
        body: updatePremioSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  premio: { type: 'object' },
                },
              },
            },
          },
        },
      },
    }, updatePremioHandler);

    /**
     * DELETE /api/premios/:id
     * Exclui prêmio (apenas admin)
     */
    fastify.delete('/:id', {
      preHandler: [authorize(UserRole.ADMIN)],
      schema: {
        description: 'Exclui prêmio do catálogo',
        tags: ['Prêmios', 'Administração'],
        params: premioParamsSchema,
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
    }, deletePremioHandler);

    /**
     * POST /api/premios/:id/redeem
     * Resgata prêmio
     */
    fastify.post('/:id/redeem', {
      schema: {
        description: 'Resgata prêmio usando pontos do usuário',
        tags: ['Prêmios'],
        params: premioParamsSchema,
        body: {
          type: 'object',
          properties: {
            deliveryAddress: { type: 'object' },
            notes: { type: 'string' },
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
                  premioId: { type: 'string' },
                  userId: { type: 'string' },
                  redeemedAt: { type: 'string' },
                  pointsDeducted: { type: 'number' },
                  newUserPoints: { type: 'number' },
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
              data: { type: 'object' },
            },
          },
        },
      },
    }, redeemPremioHandler);

    /**
     * GET /api/premios/:id/check-redeem
     * Verifica se usuário pode resgatar prêmio específico
     */
    fastify.get('/:id/check-redeem', {
      schema: {
        description: 'Verifica se usuário pode resgatar o prêmio',
        tags: ['Prêmios'],
        params: premioParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  canRedeem: { type: 'boolean' },
                  reason: { type: 'string' },
                  userPoints: { type: 'number' },
                  requiredPoints: { type: 'number' },
                },
              },
            },
          },
        },
      },
    }, checkRedeemHandler);

    // ==================== ROTAS ADMINISTRATIVAS ====================

    /**
     * PATCH /api/premios/:id/stock
     * Atualiza estoque do prêmio (apenas admin)
     */
    fastify.patch('/:id/stock', {
      preHandler: [authorize(UserRole.ADMIN)],
      schema: {
        description: 'Atualiza estoque do prêmio',
        tags: ['Prêmios', 'Estoque'],
        params: premioParamsSchema,
        body: updateStockSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  premioId: { type: 'string' },
                  newStock: { type: 'number' },
                  operation: { type: 'string' },
                  quantity: { type: 'number' },
                  updatedBy: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }, updateStockHandler);

    /**
     * POST /api/premios/:id/restock
     * Repõe estoque do prêmio (apenas admin)
     */
    fastify.post('/:id/restock', {
      preHandler: [authorize(UserRole.ADMIN)],
      schema: {
        description: 'Repõe estoque do prêmio',
        tags: ['Prêmios', 'Estoque'],
        params: premioParamsSchema,
        body: {
          type: 'object',
          properties: {
            quantity: { type: 'number', minimum: 1, maximum: 10000 },
            reason: { type: 'string', minLength: 5, maxLength: 200 },
          },
          required: ['quantity', 'reason'],
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
                  premioId: { type: 'string' },
                  quantityAdded: { type: 'number' },
                  newStock: { type: 'number' },
                  reason: { type: 'string' },
                  restockedBy: { type: 'string' },
                  restockedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }, restockPremioHandler);

    /**
     * GET /api/premios/stats
     * Estatísticas de prêmios (gerentes e admins)
     */
    fastify.get('/stats', {
      preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
      schema: {
        description: 'Estatísticas do sistema de prêmios',
        tags: ['Prêmios', 'Estatísticas'],
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
                  generatedAt: { type: 'string' },
                  generatedBy: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }, getPremioStatsHandler);

    /**
     * GET /api/premios/low-stock
     * Prêmios com baixo estoque (apenas admin)
     */
    fastify.get('/low-stock', {
      preHandler: [authorize(UserRole.ADMIN)],
      schema: {
        description: 'Lista prêmios com baixo estoque',
        tags: ['Prêmios', 'Estoque'],
        querystring: {
          type: 'object',
          properties: {
            threshold: { type: 'string', pattern: '^[1-9][0-9]*$' },
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
                  premios: { type: 'array' },
                  threshold: { type: 'number' },
                  count: { type: 'number' },
                  generatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }, getLowStockHandler);

    /**
     * GET /api/premios/out-of-stock
     * Prêmios esgotados (apenas admin)
     */
    fastify.get('/out-of-stock', {
      preHandler: [authorize(UserRole.ADMIN)],
      schema: {
        description: 'Lista prêmios esgotados',
        tags: ['Prêmios', 'Estoque'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  premios: { type: 'array' },
                  count: { type: 'number' },
                  generatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }, getOutOfStockHandler);

    /**
     * POST /api/premios/bulk-import
     * Importação em lote de prêmios (apenas admin)
     */
    fastify.post('/bulk-import', {
      preHandler: [authorize(UserRole.ADMIN)],
      schema: {
        description: 'Importa múltiplos prêmios em lote',
        tags: ['Prêmios', 'Administração'],
        body: bulkPremioImportSchema,
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
                  results: { type: 'array' },
                },
              },
            },
          },
        },
      },
    }, bulkImportPremiosHandler);

  });

  // ==================== HOOKS ESPECÍFICOS ====================

  // Hook para log de operações críticas de prêmios
  fastify.addHook('onRequest', async (request, reply) => {
    const criticalOperations = ['/redeem', '/restock', '/stock', 'DELETE /'];
    const isCritical = criticalOperations.some(op => 
      request.url.includes('/redeem') ||
      request.url.includes('/restock') ||
      request.url.includes('/stock') ||
      request.method === 'DELETE'
    );
    
    if (isCritical) {
      console.log(`[PREMIO_ROUTES] Operação crítica de prêmios: ${request.method} ${request.url} por ${request.user?.email || 'não autenticado'}`);
    }
  });

  // Hook para validação de pontos em resgates
  fastify.addHook('preHandler', async (request, reply) => {
    // Para rotas de resgate, verifica se usuário tem pontos mínimos
    if (request.url.includes('/redeem') && request.user) {
      // A validação detalhada é feita no service, mas podemos fazer verificação básica
      if (request.user.points === 0) {
        reply.code(400).send({
          success: false,
          error: 'Pontos insuficientes',
          message: 'Você não possui pontos para resgatar prêmios',
        });
        return;
      }
    }
  });

  // Hook para headers de cache específicos
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Catálogo público pode ter cache longo
    if (request.url.includes('/catalog')) {
      reply.header('Cache-Control', 'public, max-age=3600'); // 1 hora
    }

    // Prêmios populares podem ter cache médio
    if (request.url.includes('/popular')) {
      reply.header('Cache-Control', 'public, max-age=1800'); // 30 minutos
    }

    // Dados personalizados de usuário têm cache curto
    if (request.url.includes('/available') || request.url.includes('/my-redemptions')) {
      reply.header('Cache-Control', 'private, max-age=300'); // 5 minutos
    }

    // Estatísticas administrativas têm cache médio
    if (request.url.includes('/stats') || 
        request.url.includes('/low-stock') || 
        request.url.includes('/out-of-stock')) {
      reply.header('Cache-Control', 'private, max-age=600'); // 10 minutos
    }

    // Operações de resgate e modificação não devem ser cacheadas
    if (request.url.includes('/redeem') || 
        request.url.includes('/restock') || 
        request.url.includes('/stock') ||
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    return payload;
  });

  // Hook para auditoria de resgates
  fastify.addHook('onResponse', async (request, reply) => {
    // Log detalhado para resgates bem-sucedidos
    if (request.url.includes('/redeem') && 
        request.method === 'POST' && 
        reply.statusCode >= 200 && reply.statusCode < 300) {
      
      const premioId = request.url.split('/')[3]; // Extrai ID da URL
      console.log(`[PREMIO_ROUTES] Resgate realizado: prêmio ${premioId} por ${request.user?.email} - Status: ${reply.statusCode}`);
    }

    // Log para operações de estoque
    if ((request.url.includes('/stock') || request.url.includes('/restock')) &&
        reply.statusCode >= 200 && reply.statusCode < 300) {
      
      console.log(`[PREMIO_ROUTES] Operação de estoque: ${request.method} ${request.url} por ${request.user?.email}`);
    }
  });

  // Hook para validação de limite de resgates por usuário
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/redeem') && request.user) {
      // Implementaria verificação de limite diário de resgates
      // Por agora, apenas placeholder
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Aqui verificaria resgates do usuário hoje
      // const redeemedToday = await prisma.premioRedemption.count({
      //   where: {
      //     userId: request.user.id,
      //     redemptionDate: { gte: today }
      //   }
      // });
      
      // if (redeemedToday >= MAX_REDEMPTIONS_PER_DAY) {
      //   reply.code(429).send({
      //     success: false,
      //     error: 'Limite diário atingido',
      //     message: 'Você atingiu o limite de resgates por dia'
      //   });
      //   return;
      // }
    }
  });

  // Hook para validação de estoque em tempo real
  fastify.addHook('preHandler', async (request, reply) => {
    // Para resgates, verifica estoque em tempo real
    if (request.url.includes('/redeem') && request.method === 'POST') {
      const premioId = request.url.split('/')[3];
      
      if (premioId) {
        try {
          const premio = await prisma.premio.findUnique({
            where: { id: premioId },
            select: { stock: true, title: true },
          });

          if (!premio) {
            reply.code(404).send({
              success: false,
              error: 'Prêmio não encontrado',
              message: 'O prêmio solicitado não existe',
            });
            return;
          }

          if (premio.stock <= 0) {
            reply.code(400).send({
              success: false,
              error: 'Fora de estoque',
              message: `Prêmio "${premio.title}" está fora de estoque`,
            });
            return;
          }
        } catch (error) {
          console.error('[PREMIO_ROUTES] Erro ao verificar estoque:', error);
        }
      }
    }
  });
}
