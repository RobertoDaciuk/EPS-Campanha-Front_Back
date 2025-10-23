/**
 * @file submission.routes.ts
 * @version 1.0.0
 * @description Rotas para a gestão de submissões de vendas.
 * @author DevEPS
 * @date 2023-10-21
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { UserRole } from '@prisma/client';
import {
  submissionParamsSchema,
  submissionFiltersSchema,
  createSubmissionSchema,
  updateSubmissionSchema,
  validateSubmissionSchema,
  bulkValidateSubmissionsSchema,
} from '../schemas/submission.schema';
import * as SubmissionController from '../controllers/submission.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export async function submissionRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  fastify.withTypeProvider<ZodTypeProvider>();

  // Aplica autenticação a todas as rotas deste plugin
  fastify.addHook('preHandler', authenticate);

  // =================================================================
  //                       ROTAS PRINCIPAIS
  // =================================================================

  fastify.get(
    '/',
    {
      schema: {
        description: 'Lista submissões com filtros e paginação',
        tags: ['Submissões'],
        querystring: submissionFiltersSchema,
      },
    },
    SubmissionController.listSubmissionsHandler
  );

  fastify.post(
    '/',
    {
      schema: {
        description: 'Cria uma nova submissão de venda',
        tags: ['Submissões'],
        body: createSubmissionSchema,
      },
    },
    SubmissionController.createSubmissionHandler
  );

  fastify.get(
    '/my-submissions',
    {
      schema: {
        description: 'Lista as submissões do usuário autenticado',
        tags: ['Submissões'],
        querystring: submissionFiltersSchema, // Reutilizável
      },
    },
    SubmissionController.getMySubmissionsHandler
  );

  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Busca uma submissão específica pelo ID',
        tags: ['Submissões'],
        params: submissionParamsSchema,
      },
    },
    SubmissionController.getSubmissionHandler
  );

  fastify.put(
    '/:id',
    {
      schema: {
        description: 'Atualiza uma submissão (se pendente)',
        tags: ['Submissões'],
        params: submissionParamsSchema,
        body: updateSubmissionSchema,
      },
    },
    SubmissionController.updateSubmissionHandler
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Deleta uma submissão (se pendente)',
        tags: ['Submissões'],
        params: submissionParamsSchema,
      },
    },
    SubmissionController.deleteSubmissionHandler
  );

  // =================================================================
  //                       ROTAS DE VALIDAÇÃO
  // =================================================================

  fastify.get(
    '/pending',
    {
      preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
      schema: {
        description: 'Lista submissões pendentes de validação',
        tags: ['Submissões', 'Validação'],
        querystring: submissionFiltersSchema,
      },
    },
    SubmissionController.getPendingSubmissionsHandler
  );

  fastify.post(
    '/:id/validate',
    {
      preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
      schema: {
        description: 'Valida ou rejeita uma submissão',
        tags: ['Submissões', 'Validação'],
        params: submissionParamsSchema,
        body: validateSubmissionSchema,
      },
    },
    SubmissionController.validateSubmissionHandler
  );

  fastify.post(
    '/bulk-validate',
    {
      preHandler: [authorize(UserRole.ADMIN, UserRole.GERENTE)],
      schema: {
        description: 'Valida ou rejeita múltiplas submissões em lote',
        tags: ['Submissões', 'Validação'],
        body: bulkValidateSubmissionsSchema,
      },
    },
    SubmissionController.bulkValidateSubmissionsHandler
  );

  // =================================================================
  //                   ROTAS DE ESTATÍSTICAS E KITS
  // =================================================================

  fastify.get(
    '/stats',
    {
      schema: {
        description: 'Retorna estatísticas de submissões para o usuário',
        tags: ['Submissões', 'Estatísticas'],
      },
    },
    SubmissionController.getUserSubmissionStatsHandler
  );

  fastify.get(
    '/by-kit/:kitId',
    {
      schema: {
        description: 'Lista todas as submissões associadas a um kit específico',
        tags: ['Submissões', 'Kits'],
        params: {
          type: 'object',
          properties: { kitId: { type: 'string' } },
        },
      },
    },
    SubmissionController.getSubmissionsByKitHandler
  );
}
