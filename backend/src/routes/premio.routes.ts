/**
 * @file premio.routes.ts
 * @version 1.0.0
 * @description Rotas para a gestão de prêmios.
 * @author DevEPS
 * @date 2023-10-21
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { UserRole } from '@prisma/client';
import {
  premioParamsSchema,
  premioFiltersSchema,
  createPremioSchema,
  updatePremioSchema,
  updateStockSchema,
  bulkPremioImportSchema,
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
  getRedemptionHistoryHandler,
} from '../controllers/premio.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';

export async function premioRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  fastify.withTypeProvider<ZodTypeProvider>();

  // =================================================================
  //                       ROTAS PÚBLICAS
  // =================================================================

  fastify.get(
    '/catalog',
    {
      preHandler: [optionalAuth],
      schema: {
        description: 'Catálogo público de prêmios disponíveis',
        tags: ['Prêmios', 'Público'],
        querystring: premioFiltersSchema, // Reutilizando schema de filtros
        response: {
          200: {
            description: 'Sucesso',
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object' } },
              pagination: { type: 'object' },
            },
          },
        },
      },
    },
    getPublicCatalogHandler
  );

  fastify.get(
    '/popular',
    {
      schema: {
        description: 'Lista os prêmios mais populares (público)',
        tags: ['Prêmios', 'Público'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
          },
        },
        response: {
          200: {
            description: 'Sucesso',
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    getPopularPremiosHandler
  );

  // =================================================================
  //                     ROTAS AUTENTICADAS
  // =================================================================

  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authenticate);

    // CRUD BÁSICO
    fastify.get(
      '/',
      {
        schema: {
          description: 'Lista todos os prêmios com filtros e paginação',
          tags: ['Prêmios'],
          querystring: premioFiltersSchema,
          response: {
            200: {
              description: 'Sucesso',
              type: 'object',
              properties: {
                data: { type: 'array', items: { type: 'object' } },
                pagination: { type: 'object' },
              },
            },
          },
        },
      },
      listPremiosHandler
    );

    fastify.get(
      '/:id',
      {
        schema: {
          description: 'Busca um prêmio específico pelo ID',
          tags: ['Prêmios'],
          params: premioParamsSchema,
          response: {
            200: {
              description: 'Sucesso',
              type: 'object',
            },
            404: {
              description: 'Prêmio não encontrado',
              type: 'object',
            },
          },
        },
      },
      getPremioHandler
    );

    fastify.post(
      '/',
      {
        preHandler: [authorize(UserRole.ADMIN)],
        schema: {
          description: 'Cria um novo prêmio (apenas Admin)',
          tags: ['Prêmios', 'Administração'],
          body: createPremioSchema,
          response: {
            201: {
              description: 'Prêmio criado',
              type: 'object',
            },
          },
        },
      },
      createPremioHandler
    );

    fastify.put(
      '/:id',
      {
        preHandler: [authorize(UserRole.ADMIN)],
        schema: {
          description: 'Atualiza um prêmio existente (apenas Admin)',
          tags: ['Prêmios', 'Administração'],
          params: premioParamsSchema,
          body: updatePremioSchema,
          response: {
            200: {
              description: 'Prêmio atualizado',
              type: 'object',
            },
          },
        },
      },
      updatePremioHandler
    );

    fastify.delete(
      '/:id',
      {
        preHandler: [authorize(UserRole.ADMIN)],
        schema: {
          description: 'Deleta um prêmio (apenas Admin)',
          tags: ['Prêmios', 'Administração'],
          params: premioParamsSchema,
          response: {
            204: {
              description: 'Sem conteúdo',
              type: 'null',
            },
          },
        },
      },
      deletePremioHandler
    );

    // ROTAS DE RESGATE
    fastify.get(
      '/available',
      {
        schema: {
          description: 'Lista prêmios disponíveis para o usuário logado',
          tags: ['Prêmios', 'Resgate'],
          response: {
            200: {
              description: 'Sucesso',
              type: 'object',
              properties: {
                data: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      getAvailablePremiosHandler
    );

    fastify.get(
      '/:id/check-redeem',
      {
        schema: {
          description: 'Verifica se o usuário pode resgatar um prêmio',
          tags: ['Prêmios', 'Resgate'],
          params: premioParamsSchema,
          response: {
            200: {
              description: 'Sucesso',
              type: 'object',
              properties: {
                canRedeem: { type: 'boolean' },
                reason: { type: 'string', nullable: true },
                details: { type: 'object' },
              },
            },
          },
        },
      },
      checkRedeemHandler
    );

    fastify.post(
      '/:id/redeem',
      {
        schema: {
          description: 'Resgata um prêmio para o usuário logado',
          tags: ['Prêmios', 'Resgate'],
          params: premioParamsSchema,
          response: {
            200: {
              description: 'Resgate bem-sucedido',
              type: 'object',
            },
            400: {
              description: 'Falha no resgate (pontos, estoque, etc.)',
              type: 'object',
            },
          },
        },
      },
      redeemPremioHandler
    );

    fastify.get(
      '/my-redemptions',
      {
        schema: {
          description: 'Retorna o histórico de resgates do usuário',
          tags: ['Prêmios', 'Resgate'],
          querystring: {
            type: 'object',
            properties: {
              page: { type: 'number', default: 1 },
              limit: { type: 'number', default: 10 },
            },
          },
          response: {
            200: {
              description: 'Sucesso',
              type: 'object',
              properties: {
                data: { type: 'array', items: { type: 'object' } },
                pagination: { type: 'object' },
              },
            },
          },
        },
      },
      getRedemptionHistoryHandler
    );

    // ROTAS DE GESTÃO DE ESTOQUE (Admin)
    fastify.patch(
      '/:id/stock',
      {
        preHandler: [authorize(UserRole.ADMIN)],
        schema: {
          description: 'Atualiza o estoque de um prêmio (apenas Admin)',
          tags: ['Prêmios', 'Administração'],
          params: premioParamsSchema,
          body: updateStockSchema,
          response: {
            200: {
              description: 'Estoque atualizado',
              type: 'object',
            },
          },
        },
      },
      updateStockHandler
    );

    fastify.post(
      '/:id/restock',
      {
        preHandler: [authorize(UserRole.ADMIN)],
        schema: {
          description: 'Repõe o estoque de um prêmio (apenas Admin)',
          tags: ['Prêmios', 'Administração'],
          params: premioParamsSchema,
          body: {
            type: 'object',
            required: ['quantity'],
            properties: {
              quantity: { type: 'number', minimum: 1 },
            },
          },
          response: {
            200: {
              description: 'Estoque reposto',
              type: 'object',
            },
          },
        },
      },
      restockPremioHandler
    );

    // ROTAS DE RELATÓRIOS E ESTATÍSTICAS
    fastify.get(
      '/stats',
      {
        preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
        schema: {
          description: 'Retorna estatísticas sobre os prêmios',
          tags: ['Prêmios', 'Estatísticas'],
          response: {
            200: {
              description: 'Sucesso',
              type: 'object',
            },
          },
        },
      },
      getPremioStatsHandler
    );

    fastify.get(
      '/low-stock',
      {
        preHandler: [authorize(UserRole.ADMIN)],
        schema: {
          description: 'Lista prêmios com baixo estoque',
          tags: ['Prêmios', 'Estatísticas'],
          querystring: {
            type: 'object',
            properties: {
              threshold: { type: 'number', default: 10 },
            },
          },
          response: {
            200: {
              description: 'Sucesso',
              type: 'object',
            },
          },
        },
      },
      getLowStockHandler
    );

    fastify.get(
      '/out-of-stock',
      {
        preHandler: [authorize(UserRole.ADMIN)],
        schema: {
          description: 'Lista prêmios com estoque esgotado',
          tags: ['Prêmios', 'Estatísticas'],
          response: {
            200: {
              description: 'Sucesso',
              type: 'object',
            },
          },
        },
      },
      getOutOfStockHandler
    );

    // ROTAS DE IMPORTAÇÃO
    fastify.post(
      '/bulk-import',
      {
        preHandler: [authorize(UserRole.ADMIN)],
        schema: {
          description: 'Importa prêmios em lote a partir de um arquivo',
          tags: ['Prêmios', 'Administração'],
          body: bulkPremioImportSchema,
          response: {
            200: {
              description: 'Importação concluída',
              type: 'object',
            },
          },
        },
      },
      bulkImportPremiosHandler
    );
  });
}
