/**
 * @file user.routes.ts
 * @version 2.0.0
 * @description Rotas para gestão de usuários da API EPS Campanhas.
 * Define endpoints para CRUD de usuários, hierarquias e administração.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa das rotas de usuários
 * - Autorização granular por perfil
 * - Schemas de validação completos
 * - Endpoints administrativos especializados
 * - Documentação OpenAPI detalhada
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { 
  userParamsSchema,
  userFiltersSchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  resetUserPasswordSchema,
  associateSellerToManagerSchema,
  updateUserPointsSchema,
  checkAvailabilitySchema,
  bulkUserImportSchema
} from '../schemas/user.schema';
import {
  createUserHandler,
  updateUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserStatusHandler,
  resetUserPasswordHandler,
  associateSellerToManagerHandler,
  getManagerSellersHandler,
  updateUserPointsHandler,
  getUserStatsHandler,
  checkFieldAvailabilityHandler,
  deleteUserHandler,
  bulkImportUsersHandler,
  getUsersByOpticHandler,
  getMySellersHandler
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

// ==================== PLUGIN DE ROTAS DE USUÁRIOS ====================

export async function userRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Registra provider de tipos Zod
  fastify.withTypeProvider<ZodTypeProvider>();

  // ==================== MIDDLEWARE GLOBAL ====================
  // Todas as rotas de usuário requerem autenticação
  fastify.addHook('preHandler', authenticate);

  // ==================== ROTAS PRINCIPAIS ====================

  /**
   * GET /api/users
   * Lista usuários com filtros (gerentes veem equipe, admins veem todos)
   */
  fastify.get('/', {
    schema: {
      description: 'Lista usuários com filtros e paginação',
      tags: ['Usuários'],
      querystring: userFiltersSchema,
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
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, listUsersHandler);

  /**
   * POST /api/users
   * Cria novo usuário (apenas admin)
   */
  fastify.post('/', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Cria novo usuário no sistema',
      tags: ['Usuários', 'Administração'],
      body: createUserSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
              },
            },
          },
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, createUserHandler);

  /**
   * GET /api/users/stats
   * Estatísticas gerais de usuários (apenas admin)
   */
  fastify.get('/stats', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Obtém estatísticas gerais de usuários',
      tags: ['Usuários', 'Estatísticas'],
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
  }, getUserStatsHandler);

  /**
   * POST /api/users/check-availability
   * Verifica disponibilidade de campo
   */
  fastify.post('/check-availability', {
    schema: {
      description: 'Verifica disponibilidade de email, CPF ou CNPJ',
      tags: ['Validação'],
      body: checkAvailabilitySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                value: { type: 'string' },
                available: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, checkFieldAvailabilityHandler);

  /**
   * GET /api/users/my-sellers
   * Vendedores do gerente autenticado
   */
  fastify.get('/my-sellers', {
    preHandler: [authorize(UserRole.GERENTE)],
    schema: {
      description: 'Lista vendedores do gerente autenticado',
      tags: ['Usuários', 'Gerentes'],
      querystring: {
        type: 'object',
        properties: {
          includeInactive: { type: 'string', enum: ['true', 'false'] },
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
                sellers: { type: 'array' },
                managerId: { type: 'string' },
                totalSellers: { type: 'number' },
                activeSellers: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, getMySellersHandler);

  /**
   * GET /api/users/:id
   * Busca usuário específico por ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Busca usuário por ID',
      tags: ['Usuários'],
      params: userParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
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
  }, getUserHandler);

  /**
   * PUT /api/users/:id
   * Atualiza usuário específico
   */
  fastify.put('/:id', {
    schema: {
      description: 'Atualiza dados do usuário',
      tags: ['Usuários'],
      params: userParamsSchema,
      body: updateUserSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
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
      },
    },
  }, updateUserHandler);

  /**
   * DELETE /api/users/:id
   * Exclui usuário (apenas admin)
   */
  fastify.delete('/:id', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Exclui usuário do sistema',
      tags: ['Usuários', 'Administração'],
      params: userParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
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
  }, deleteUserHandler);

  // ==================== ROTAS ADMINISTRATIVAS ====================

  /**
   * PATCH /api/users/:id/status
   * Atualiza status do usuário (apenas admin)
   */
  fastify.patch('/:id/status', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Atualiza status do usuário (ativo/bloqueado)',
      tags: ['Usuários', 'Administração'],
      params: userParamsSchema,
      body: updateUserStatusSchema,
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
  }, updateUserStatusHandler);

  /**
   * POST /api/users/:id/reset-password
   * Redefine senha do usuário (apenas admin)
   */
  fastify.post('/:id/reset-password', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Redefine senha do usuário',
      tags: ['Usuários', 'Administração'],
      params: userParamsSchema,
      body: resetUserPasswordSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                newPassword: { type: 'string' },
                resetBy: { type: 'string' },
                resetAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, resetUserPasswordHandler);

  /**
   * PATCH /api/users/:id/points
   * Atualiza pontos do usuário (apenas admin)
   */
  fastify.patch('/:id/points', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Atualiza pontos do usuário',
      tags: ['Usuários', 'Pontuação'],
      params: userParamsSchema,
      body: updateUserPointsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                newPoints: { type: 'number' },
                newLevel: { type: 'string' },
                operation: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, updateUserPointsHandler);

  /**
   * GET /api/users/:managerId/sellers
   * Lista vendedores de um gerente específico
   */
  fastify.get('/:managerId/sellers', {
    schema: {
      description: 'Lista vendedores de um gerente específico',
      tags: ['Usuários', 'Hierarquia'],
      params: {
        type: 'object',
        properties: {
          managerId: { type: 'string', format: 'uuid' },
        },
        required: ['managerId'],
      },
      querystring: {
        type: 'object',
        properties: {
          includeInactive: { type: 'boolean' },
        },
      },
    },
  }, getManagerSellersHandler);

  /**
   * POST /api/users/associate-seller
   * Associa vendedor a gerente (apenas admin)
   */
  fastify.post('/associate-seller', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Associa vendedor a um gerente',
      tags: ['Usuários', 'Hierarquia'],
      body: associateSellerToManagerSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                seller: { type: 'object' },
                associatedBy: { type: 'string' },
                associatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, associateSellerToManagerHandler);

  // ==================== ROTAS ESPECIALIZADAS ====================

  /**
   * GET /api/users/by-optic/:cnpj
   * Lista usuários por CNPJ da ótica
   */
  fastify.get('/by-optic/:cnpj', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Lista usuários por CNPJ da ótica',
      tags: ['Usuários', 'Óticas'],
      params: {
        type: 'object',
        properties: {
          cnpj: { type: 'string' },
        },
        required: ['cnpj'],
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
                users: { type: 'array' },
                opticCNPJ: { type: 'string' },
                count: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, getUsersByOpticHandler);

  /**
   * POST /api/users/bulk-import
   * Importação em lote de usuários (apenas admin)
   */
  fastify.post('/bulk-import', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Importa múltiplos usuários em lote',
      tags: ['Usuários', 'Administração'],
      body: bulkUserImportSchema,
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
  }, bulkImportUsersHandler);

  // ==================== HOOKS ESPECÍFICOS ====================

  // Hook para log de operações administrativas
  fastify.addHook('onRequest', async (request, reply) => {
    const adminRoutes = ['/status', '/reset-password', '/points', '/associate-seller', '/bulk-import'];
    const isAdminRoute = adminRoutes.some(route => request.url.includes(route));
    
    if (isAdminRoute && request.method !== 'GET') {
      console.log(`[USER_ROUTES] Operação administrativa: ${request.method} ${request.url} por ${request.user?.email || 'desconhecido'}`);
    }
  });

  // Hook para validação extra de hierarquia
  fastify.addHook('onRequest', async (request, reply) => {
    // Para rotas que envolvem hierarquia, adiciona validações extras
    if (request.url.includes('/sellers') || request.url.includes('/associate-seller')) {
      if (request.user && request.user.role === UserRole.VENDEDOR) {
        reply.code(403).send({
          success: false,
          error: 'Acesso negado',
          message: 'Vendedores não podem acessar funcionalidades de hierarquia',
        });
        return;
      }
    }
  });

  // Hook para headers de cache específicos
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Rotas de listagem podem ser cacheadas por pouco tempo
    if (request.method === 'GET' && !request.url.includes('/stats')) {
      reply.header('Cache-Control', 'private, max-age=60'); // 1 minuto
    }

    // Rotas de estatísticas podem ser cacheadas por mais tempo
    if (request.url.includes('/stats')) {
      reply.header('Cache-Control', 'private, max-age=300'); // 5 minutos
    }

    // Operações de modificação não devem ser cacheadas
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    return payload;
  });
}
