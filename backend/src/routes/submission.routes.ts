/**
 * @file submission.routes.ts
 * @version 2.0.0
 * @description Rotas para gestão de submissões de vendas da API EPS Campanhas.
 * Define endpoints para submissões, kits, validação e relatórios.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa das rotas de submissões
 * - Sistema de kits (cartelas) integrado
 * - Validação por gerentes e admins
 * - Processamento em lote otimizado
 * - Relatórios detalhados por perfil
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { 
  submissionParamsSchema,
  submissionFiltersSchema,
  createSubmissionSchema,
  updateSubmissionSchema,
  validateSubmissionSchema,
  bulkValidateSubmissionsSchema,
  submissionReportSchema,
  duplicateSubmissionSchema,
  transferSubmissionSchema,
  userSubmissionStatsSchema
} from '../schemas/submission.schema';
import {
  createSubmissionHandler,
  getSubmissionHandler,
  listSubmissionsHandler,
  updateSubmissionHandler,
  deleteSubmissionHandler,
  validateSubmissionHandler,
  bulkValidateSubmissionsHandler,
  generateSubmissionReportHandler,
  duplicateSubmissionHandler,
  transferSubmissionHandler,
  getUserSubmissionStatsHandler,
  getMySubmissionsHandler,
  getSubmissionsByKitHandler,
  getSubmissionsByRequirementHandler,
  getPendingSubmissionsHandler
} from '../controllers/submission.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

// ==================== PLUGIN DE ROTAS DE SUBMISSÕES ====================

export async function submissionRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Registra provider de tipos Zod
  fastify.withTypeProvider<ZodTypeProvider>();

  // ==================== MIDDLEWARE GLOBAL ====================
  // Todas as rotas de submissão requerem autenticação
  fastify.addHook('preHandler', authenticate);

  // ==================== ROTAS PRINCIPAIS ====================

  /**
   * GET /api/submissions
   * Lista submissões com filtros (dados específicos por perfil)
   */
  fastify.get('/', {
    schema: {
      description: 'Lista submissões com filtros e paginação',
      tags: ['Submissões'],
      querystring: submissionFiltersSchema,
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
  }, listSubmissionsHandler);

  /**
   * POST /api/submissions
   * Cria nova submissão de venda
   */
  fastify.post('/', {
    schema: {
      description: 'Cria nova submissão de venda',
      tags: ['Submissões'],
      body: createSubmissionSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                submission: { type: 'object' },
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
  }, createSubmissionHandler);

  /**
   * GET /api/submissions/my-submissions
   * Submissões do usuário autenticado
   */
  fastify.get('/my-submissions', {
    schema: {
      description: 'Lista submissões do usuário autenticado',
      tags: ['Submissões'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'VALIDATED', 'REJECTED', 'all'] },
          campaignId: { type: 'string', format: 'uuid' },
          sort: { type: 'string', enum: ['submissionDate', 'orderNumber', 'status'] },
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
            summary: { type: 'object' },
          },
        },
      },
    },
  }, getMySubmissionsHandler);

  /**
   * GET /api/submissions/pending
   * Submissões pendentes de validação (gerentes e admins)
   */
  fastify.get('/pending', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Lista submissões pendentes de validação',
      tags: ['Submissões', 'Validação'],
      querystring: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', format: 'uuid' },
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
            data: { type: 'array' },
            pagination: { type: 'object' },
            summary: { type: 'object' },
          },
        },
      },
    },
  }, getPendingSubmissionsHandler);

  /**
   * GET /api/submissions/stats
   * Estatísticas de submissões do usuário
   */
  fastify.get('/stats', {
    schema: {
      description: 'Estatísticas de submissões do usuário',
      tags: ['Submissões', 'Estatísticas'],
      querystring: userSubmissionStatsSchema,
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
                userId: { type: 'string' },
                period: { type: 'string' },
                generatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, getUserSubmissionStatsHandler);

  /**
   * GET /api/submissions/:id
   * Busca submissão específica por ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Busca submissão por ID',
      tags: ['Submissões'],
      params: submissionParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                submission: { type: 'object' },
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
  }, getSubmissionHandler);

  /**
   * PUT /api/submissions/:id
   * Atualiza submissão
   */
  fastify.put('/:id', {
    schema: {
      description: 'Atualiza dados da submissão',
      tags: ['Submissões'],
      params: submissionParamsSchema,
      body: updateSubmissionSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                submission: { type: 'object' },
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
  }, updateSubmissionHandler);

  /**
   * DELETE /api/submissions/:id
   * Exclui submissão
   */
  fastify.delete('/:id', {
    schema: {
      description: 'Exclui submissão (apenas se pendente)',
      tags: ['Submissões'],
      params: submissionParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
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
  }, deleteSubmissionHandler);

  // ==================== ROTAS DE VALIDAÇÃO ====================

  /**
   * POST /api/submissions/:id/validate
   * Valida submissão (gerentes e admins)
   */
  fastify.post('/:id/validate', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Valida ou rejeita submissão',
      tags: ['Submissões', 'Validação'],
      params: submissionParamsSchema,
      body: validateSubmissionSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                submission: { type: 'object' },
                pointsAwarded: { type: 'object' },
                earningsCreated: { type: 'array' },
                kitStatusChanged: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, validateSubmissionHandler);

  /**
   * POST /api/submissions/bulk-validate
   * Validação em lote de submissões (gerentes e admins)
   */
  fastify.post('/bulk-validate', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Valida múltiplas submissões em lote',
      tags: ['Submissões', 'Validação'],
      body: bulkValidateSubmissionsSchema,
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
  }, bulkValidateSubmissionsHandler);

  // ==================== ROTAS DE RELATÓRIOS ====================

  /**
   * GET /api/submissions/report
   * Gera relatório de submissões (gerentes e admins)
   */
  fastify.get('/report', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Gera relatório detalhado de submissões',
      tags: ['Submissões', 'Relatórios'],
      querystring: submissionReportSchema,
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
  }, generateSubmissionReportHandler);

  // ==================== ROTAS ESPECIALIZADAS ====================

  /**
   * POST /api/submissions/duplicate
   * Duplica submissão existente
   */
  fastify.post('/duplicate', {
    schema: {
      description: 'Duplica submissão existente com novo número de pedido',
      tags: ['Submissões'],
      body: duplicateSubmissionSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                originalSubmissionId: { type: 'string' },
                duplicatedSubmission: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, duplicateSubmissionHandler);

  /**
   * POST /api/submissions/transfer
   * Transfere submissão entre kits (gerentes e admins)
   */
  fastify.post('/transfer', {
    preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
    schema: {
      description: 'Transfere submissão entre kits',
      tags: ['Submissões', 'Kits'],
      body: transferSubmissionSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                submission: { type: 'object' },
                originalKit: { type: 'string' },
                newKit: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, transferSubmissionHandler);

  /**
   * GET /api/submissions/by-kit/:kitId
   * Lista submissões de um kit específico
   */
  fastify.get('/by-kit/:kitId', {
    schema: {
      description: 'Lista submissões de um kit específico',
      tags: ['Submissões', 'Kits'],
      params: {
        type: 'object',
        properties: {
          kitId: { type: 'string', format: 'uuid' },
        },
        required: ['kitId'],
      },
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
                submissions: { type: 'array' },
                kitId: { type: 'string' },
                count: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, getSubmissionsByKitHandler);

  /**
   * GET /api/submissions/by-requirement/:campaignId/:requirementId
   * Lista submissões por requisito específico
   */
  fastify.get('/by-requirement/:campaignId/:requirementId', {
    schema: {
      description: 'Lista submissões por requisito de campanha',
      tags: ['Submissões', 'Campanhas'],
      params: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', format: 'uuid' },
          requirementId: { type: 'string', format: 'uuid' },
        },
        required: ['campaignId', 'requirementId'],
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'VALIDATED', 'REJECTED'] },
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
                submissions: { type: 'array' },
                campaignId: { type: 'string' },
                requirementId: { type: 'string' },
                count: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, getSubmissionsByRequirementHandler);

  // ==================== HOOKS ESPECÍFICOS ====================

  // Hook para log de operações críticas
  fastify.addHook('onRequest', async (request, reply) => {
    const criticalOperations = ['/validate', '/bulk-validate', '/transfer', 'DELETE /'];
    const isCritical = criticalOperations.some(op => 
      request.url.includes('/validate') ||
      request.url.includes('/transfer') ||
      request.method === 'DELETE'
    );
    
    if (isCritical) {
      console.log(`[SUBMISSION_ROUTES] Operação crítica: ${request.method} ${request.url} por ${request.user?.email || 'não autenticado'}`);
    }
  });

  // Hook para validação de número de pedido
  fastify.addHook('preHandler', async (request, reply) => {
    if ((request.method === 'POST' || request.method === 'PUT') && request.body) {
      const body = request.body as any;
      
      if (body.orderNumber) {
        // Valida formato do número do pedido
        const orderNumber = String(body.orderNumber).trim();
        
        if (orderNumber.length < 3) {
          reply.code(400).send({
            success: false,
            error: 'Número de pedido inválido',
            message: 'Número do pedido deve ter pelo menos 3 caracteres',
          });
          return;
        }
        
        if (orderNumber.length > 50) {
          reply.code(400).send({
            success: false,
            error: 'Número de pedido muito longo',
            message: 'Número do pedido deve ter no máximo 50 caracteres',
          });
          return;
        }

        // Normaliza número do pedido (remove espaços extras, etc.)
        body.orderNumber = orderNumber.toUpperCase();
      }

      // Valida quantidade
      if (body.quantity !== undefined) {
        const quantity = parseInt(body.quantity);
        
        if (isNaN(quantity) || quantity < 1) {
          reply.code(400).send({
            success: false,
            error: 'Quantidade inválida',
            message: 'Quantidade deve ser um número maior que zero',
          });
          return;
        }
        
        if (quantity > 1000) {
          reply.code(400).send({
            success: false,
            error: 'Quantidade muito alta',
            message: 'Quantidade máxima por submissão é 1000',
          });
          return;
        }
      }
    }
  });

  // Hook para headers de cache específicos
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Submissões próprias do usuário podem ter cache curto
    if (request.url.includes('/my-submissions')) {
      reply.header('Cache-Control', 'private, max-age=60'); // 1 minuto
    }

    // Submissões pendentes para validação não devem ser cacheadas (dados dinâmicos)
    if (request.url.includes('/pending')) {
      reply.header('Cache-Control', 'private, max-age=30'); // 30 segundos
    }

    // Estatísticas podem ter cache médio
    if (request.url.includes('/stats') || request.url.includes('/report')) {
      reply.header('Cache-Control', 'private, max-age=300'); // 5 minutos
    }

    // Operações de modificação não devem ser cacheadas
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    return payload;
  });

  // Hook para auditoria de validações
  fastify.addHook('onResponse', async (request, reply) => {
    // Log detalhado para validações bem-sucedidas
    if (request.url.includes('/validate') && 
        reply.statusCode >= 200 && reply.statusCode < 300) {
      
      console.log(`[SUBMISSION_ROUTES] Validação processada: ${request.url} por ${request.user?.email} - Status: ${reply.statusCode}`);
    }

    // Log para operações em lote
    if (request.url.includes('/bulk-validate') && 
        reply.statusCode >= 200 && reply.statusCode < 300) {
      
      console.log(`[SUBMISSION_ROUTES] Validação em lote: ${request.url} por ${request.user?.email}`);
    }
  });

  // Hook para validação de permissões específicas por kit/campanha
  fastify.addHook('preHandler', async (request, reply) => {
    // Para rotas que envolvem kits específicos, valida se usuário pode acessar
    if (request.url.includes('/by-kit/') || request.url.includes('/by-requirement/')) {
      // Vendedores só podem ver seus próprios kits/submissões
      if (request.user?.role === UserRole.VENDEDOR) {
        // A validação detalhada é feita no controller
      }
    }
  });

  // Hook para validação de datas em filtros
  fastify.addHook('preHandler', async (request, reply) => {
    const query = request.query as any;
    
    // Valida filtros de data
    if (query.submittedAfter || query.submittedBefore) {
      if (query.submittedAfter && isNaN(new Date(query.submittedAfter).getTime())) {
        reply.code(400).send({
          success: false,
          error: 'Data inválida',
          message: 'Formato de submittedAfter deve ser uma data válida',
        });
        return;
      }
      
      if (query.submittedBefore && isNaN(new Date(query.submittedBefore).getTime())) {
        reply.code(400).send({
          success: false,
          error: 'Data inválida',
          message: 'Formato de submittedBefore deve ser uma data válida',
        });
        return;
      }

      // Verifica ordem das datas
      if (query.submittedAfter && query.submittedBefore) {
        const after = new Date(query.submittedAfter);
        const before = new Date(query.submittedBefore);
        
        if (after >= before) {
          reply.code(400).send({
            success: false,
            error: 'Período inválido',
            message: 'Data inicial deve ser anterior à data final',
          });
          return;
        }
      }
    }
  });

  // Hook para rate limiting em operações de criação
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method === 'POST' && request.url === '/api/submissions') {
      // Implementaria rate limiting para criação de submissões
      // Por exemplo: máximo 50 submissões por usuário por hora
      
      // Placeholder para rate limiting
      if (request.user) {
        // const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        // const recentSubmissions = await prisma.campaignSubmission.count({
        //   where: {
        //     userId: request.user.id,
        //     submissionDate: { gte: oneHourAgo }
        //   }
        // });
        
        // if (recentSubmissions >= 50) {
        //   reply.code(429).send({
        //     success: false,
        //     error: 'Limite de submissões atingido',
        //     message: 'Máximo de 50 submissões por hora'
        //   });
        //   return;
        // }
      }
    }
  });
}
