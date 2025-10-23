/**
 * @file auth.routes.ts
 * @version 2.0.0
 * @description Rotas de autenticação da API EPS Campanhas.
 * Define endpoints para login, registro, verificação e operações de autenticação.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa das rotas de autenticação
 * - Schemas de validação Zod integrados
 * - Endpoints públicos e protegidos
 * - Rate limiting configurado
 * - Documentação OpenAPI automática
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';  // <---- IMPORTANTE!
import { 
  loginSchema,
  registerSchema,
  changePasswordSchema,
  updateProfileSchema,
  checkEmailSchema,
  checkCPFSchema,
  validateCNPJSchema
} from '../schemas/auth.schema';
import {
  loginHandler,
  registerHandler,
  changePasswordHandler,
  updateProfileHandler,
  checkEmailHandler,
  checkCPFHandler,
  validateCNPJHandler,
  refreshTokenHandler,
  logoutHandler,
  verifyAuthHandler,
  getMeHandler,
  checkEmailAvailabilityHandler,
  checkCPFAvailabilityHandler,
  getOpticByCNPJHandler,
  getLoginAttemptsHandler,
  authHealthCheckHandler,
  invalidateUserSessionsHandler
} from '../controllers/auth.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';

// ---- ADICIONE O SCHEMA ZOD DA RESPOSTA DO LOGIN --- //
const loginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: z.any(),
    token: z.string(),
    refreshToken: z.string(),
    expiresAt: z.string(),
  }),
});

export async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Registra provider de tipos Zod
  fastify.withTypeProvider<ZodTypeProvider>();

  // ==================== ROTAS PÚBLICAS ====================

  /**
   * POST /api/auth/login
   * Autenticação de usuário
   */
  fastify.post('/login', {
    schema: {
      description: 'Autenticação de usuário no sistema',
      tags: ['Autenticação'],
      body: loginSchema,
      response: {
        200: loginResponseSchema,          // AJUSTE AQUI!
        401: z.object({
          success: z.boolean(),
          error: z.string(),
          message: z.string(),
        }),
        429: z.object({
          success: z.boolean(),
          error: z.string(),
          message: z.string(),
          retryAfter: z.number(),
        }),
      },
    },
  }, loginHandler);


  /**
   * POST /api/auth/register
   * Registro de novo usuário
   */
  fastify.post('/register', {
    schema: {
      description: 'Registro de novo usuário no sistema',
      tags: ['Autenticação'],
      body: registerSchema,
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
  }, registerHandler);

  /**
   * POST /api/auth/check-email
   * Verificação de disponibilidade de e-mail via POST
   */
  fastify.post('/check-email', {
    schema: {
      description: 'Verifica disponibilidade de e-mail',
      tags: ['Validação'],
      body: checkEmailSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                available: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, checkEmailHandler);

  /**
   * POST /api/auth/check-cpf
   * Verificação de disponibilidade de CPF via POST
   */
  fastify.post('/check-cpf', {
    schema: {
      description: 'Verifica disponibilidade de CPF',
      tags: ['Validação'],
      body: checkCPFSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                cpf: { type: 'string' },
                available: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, checkCPFHandler);

  /**
   * POST /api/auth/validate-cnpj
   * Validação de CNPJ de ótica via POST
   */
  fastify.post('/validate-cnpj', {
    schema: {
      description: 'Valida CNPJ de ótica',
      tags: ['Validação'],
      body: validateCNPJSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
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
  }, validateCNPJHandler);

  /**
   * GET /api/auth/check-email
   * Verificação de disponibilidade de e-mail via GET
   */
  fastify.get('/check-email', {
    schema: {
      description: 'Verifica disponibilidade de e-mail (GET)',
      tags: ['Validação'],
      querystring: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          excludeUserId: { type: 'string', format: 'uuid' },
        },
        required: ['email'],
      },
    },
  }, checkEmailAvailabilityHandler);

  /**
   * GET /api/auth/check-cpf
   * Verificação de disponibilidade de CPF via GET
   */
  fastify.get('/check-cpf', {
    schema: {
      description: 'Verifica disponibilidade de CPF (GET)',
      tags: ['Validação'],
      querystring: {
        type: 'object',
        properties: {
          cpf: { type: 'string' },
          excludeUserId: { type: 'string', format: 'uuid' },
        },
        required: ['cpf'],
      },
    },
  }, checkCPFAvailabilityHandler);

  /**
   * GET /api/auth/optic/:cnpj
   * Busca dados da ótica por CNPJ
   */
  fastify.get('/optic/:cnpj', {
    schema: {
      description: 'Busca dados da ótica pelo CNPJ',
      tags: ['Validação'],
      params: {
        type: 'object',
        properties: {
          cnpj: { type: 'string' },
        },
        required: ['cnpj'],
      },
    },
  }, getOpticByCNPJHandler);

  /**
   * GET /api/auth/login-attempts
   * Estatísticas de tentativas de login
   */
  fastify.get('/login-attempts', {
    schema: {
      description: 'Obtém estatísticas de tentativas de login para rate limiting',
      tags: ['Autenticação'],
      querystring: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      },
    },
  }, getLoginAttemptsHandler);

  /**
   * POST /api/auth/refresh
   * Renovação de token usando refresh token
   */
  fastify.post('/refresh', {
    schema: {
      description: 'Renova token de autenticação',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
        },
        required: ['refreshToken'],
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
                token: { type: 'string' },
                expiresAt: { type: 'string' },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, refreshTokenHandler);

  /**
   * GET /api/auth/health
   * Health check do serviço de autenticação
   */
  fastify.get('/health', {
    schema: {
      description: 'Verifica saúde do serviço de autenticação',
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
                userCount: { type: 'number' },
                jwtConfigured: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, authHealthCheckHandler);

  // ==================== ROTAS PROTEGIDAS ====================

  fastify.register(async function protectedAuthRoutes(fastify) {
    // Middleware de autenticação obrigatório para todas as rotas deste grupo
    fastify.addHook('preHandler', authenticate);

    /**
     * POST /api/auth/change-password
     * Alteração de senha do usuário autenticado
     */
    fastify.post('/change-password', {
      schema: {
        description: 'Altera senha do usuário autenticado',
        tags: ['Perfil'],
        body: changePasswordSchema,
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
    }, changePasswordHandler);

    /**
     * PUT /api/auth/profile
     * Atualização do perfil do usuário autenticado
     */
    fastify.put('/profile', {
      schema: {
        description: 'Atualiza perfil do usuário autenticado',
        tags: ['Perfil'],
        body: updateProfileSchema,
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
        },
      },
    }, updateProfileHandler);

    /**
     * POST /api/auth/logout
     * Logout do usuário (invalida refresh token)
     */
    fastify.post('/logout', {
      schema: {
        description: 'Realiza logout do usuário',
        tags: ['Autenticação'],
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
    }, logoutHandler);

    /**
     * GET /api/auth/verify
     * Verificação de token de autenticação
     */
    fastify.get('/verify', {
      schema: {
        description: 'Verifica se token de autenticação é válido',
        tags: ['Autenticação'],
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
                  authenticated: { type: 'boolean' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    }, verifyAuthHandler);

    /**
     * GET /api/auth/me
     * Dados completos do usuário autenticado
     */
    fastify.get('/me', {
      schema: {
        description: 'Obtém dados completos do usuário autenticado',
        tags: ['Perfil'],
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
        },
      },
    }, getMeHandler);

  });

  // ==================== ROTAS ADMINISTRATIVAS ====================

  fastify.register(async function adminAuthRoutes(fastify) {
    fastify.addHook('preHandler', authenticate);

    /**
     * POST /api/auth/admin/invalidate-sessions/:userId
     * Invalida sessões de um usuário (apenas admin)
     */
    fastify.post('/admin/invalidate-sessions/:userId', {
      schema: {
        description: 'Invalida todas as sessões de um usuário específico',
        tags: ['Administração'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
          required: ['userId'],
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
    }, invalidateUserSessionsHandler);

  });

  // ==================== HOOKS E CONFIGURAÇÕES ====================

  // Hook para log de todas as requisições de autenticação
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/auth/login')) {
      console.log(`[AUTH_ROUTES] Tentativa de login de IP: ${request.ip}`);
    }
  });

  // Hook para headers de segurança
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Headers de segurança para rotas de autenticação
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    
    // Rate limiting headers para login
    if (request.url.includes('/login')) {
      reply.header('X-RateLimit-Limit', '5');
      reply.header('X-RateLimit-Window', '900'); // 15 minutes
    }

    return payload;
  });

  // Registra middleware opcional de autenticação para algumas rotas
  fastify.register(async function optionalAuthRoutes(fastify) {
    fastify.addHook('preHandler', optionalAuth);

    /**
     * GET /api/auth/check-email
     * Verificação de disponibilidade de e-mail via GET (com auth opcional)
     */
    fastify.get('/check-email-get', {
      schema: {
        description: 'Verifica disponibilidade de e-mail via GET',
        tags: ['Validação'],
        querystring: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            excludeUserId: { type: 'string', format: 'uuid' },
          },
          required: ['email'],
        },
      },
    }, checkEmailAvailabilityHandler);

    /**
     * GET /api/auth/check-cpf-get
     * Verificação de disponibilidade de CPF via GET (com auth opcional)
     */
    fastify.get('/check-cpf-get', {
      schema: {
        description: 'Verifica disponibilidade de CPF via GET',
        tags: ['Validação'],
        querystring: {
          type: 'object',
          properties: {
            cpf: { type: 'string' },
            excludeUserId: { type: 'string', format: 'uuid' },
          },
          required: ['cpf'],
        },
      },
    }, checkCPFAvailabilityHandler);
  });
}
