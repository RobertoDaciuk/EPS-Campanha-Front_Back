/**
 * @file submission.controller.ts
 * @version 1.0.0
 * @description Controller para a gestão de submissões de vendas.
 * @author DevEPS
 * @date 2023-10-21
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as SubmissionService from '../services/submission.service';
import {
  CreateSubmissionData,
  UpdateSubmissionData,
  SubmissionFilters,
  ValidateSubmissionData,
  BulkValidateSubmissionsData,
} from '../schemas/submission.schema';

// Tipagem genérica para requisições
type SubmissionRequest<TParams = unknown, TQuery = unknown, TBody = unknown> = FastifyRequest<{
  Params: TParams;
  Querystring: TQuery;
  Body: TBody;
}>;

/**
 * Cria uma nova submissão de venda.
 * @access Autenticado
 */
export async function createSubmissionHandler(
  request: SubmissionRequest<unknown, unknown, CreateSubmissionData>,
  reply: FastifyReply
) {
  try {
    const submission = await SubmissionService.createSubmission(request.body, request.user!);
    return reply.code(201).send(submission);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao criar submissão: ${(error as Error).message}`);
    return reply.code(400).send({ message: (error as Error).message });
  }
}

/**
 * Lista submissões com base em filtros e permissões do usuário.
 * @access Autenticado
 */
export async function listSubmissionsHandler(
  request: SubmissionRequest<unknown, SubmissionFilters, unknown>,
  reply: FastifyReply
) {
  try {
    const result = await SubmissionService.listSubmissions(request.query, request.user!);
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao listar submissões: ${(error as Error).message}`);
    return reply.code(500).send({ message: 'Erro interno ao buscar submissões' });
  }
}

/**
 * Busca uma submissão específica pelo ID.
 * @access Autenticado
 */
export async function getSubmissionHandler(
  request: SubmissionRequest<{ id: string }>,
  reply: FastifyReply
) {
  try {
    const submission = await SubmissionService.getSubmissionById(request.params.id, request.user!);
    if (!submission) {
      return reply.code(404).send({ message: 'Submissão não encontrada' });
    }
    return reply.code(200).send(submission);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar submissão ${request.params.id}: ${(error as Error).message}`);
    return reply.code(403).send({ message: (error as Error).message });
  }
}

/**
 * Atualiza uma submissão, se o usuário tiver permissão.
 * @access Dono da submissão (se pendente) ou Admin
 */
export async function updateSubmissionHandler(
  request: SubmissionRequest<{ id: string }, unknown, UpdateSubmissionData>,
  reply: FastifyReply
) {
  try {
    const submission = await SubmissionService.updateSubmission(
      request.params.id,
      request.body,
      request.user!
    );
    return reply.code(200).send(submission);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao atualizar submissão ${request.params.id}: ${(error as Error).message}`);
    return reply.code(400).send({ message: (error as Error).message });
  }
}

/**
 * Deleta uma submissão, se o usuário tiver permissão.
 * @access Dono da submissão (se pendente) ou Admin
 */
export async function deleteSubmissionHandler(
  request: SubmissionRequest<{ id: string }>,
  reply: FastifyReply
) {
  try {
    await SubmissionService.deleteSubmission(request.params.id, request.user!);
    return reply.code(204).send();
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao deletar submissão ${request.params.id}: ${(error as Error).message}`);
    return reply.code(400).send({ message: (error as Error).message });
  }
}

/**
 * Retorna as submissões do usuário autenticado.
 * @access Autenticado
 */
export async function getMySubmissionsHandler(
  request: SubmissionRequest<unknown, SubmissionFilters, unknown>,
  reply: FastifyReply
) {
  try {
    const result = await SubmissionService.listSubmissions(
      { ...request.query, userId: request.user!.id },
      request.user!
    );
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar "minhas submissões": ${(error as Error).message}`);
    return reply.code(500).send({ message: 'Erro ao buscar suas submissões' });
  }
}

/**
 * Lista submissões pendentes de validação para Gerentes e Admins.
 * @access GERENTE, ADMIN
 */
export async function getPendingSubmissionsHandler(
  request: SubmissionRequest<unknown, SubmissionFilters, unknown>,
  reply: FastifyReply
) {
  try {
    const result = await SubmissionService.getPendingSubmissions(request.query, request.user!);
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar submissões pendentes: ${(error as Error).message}`);
    return reply.code(500).send({ message: 'Erro ao buscar submissões pendentes' });
  }
}

/**
 * Valida ou rejeita uma submissão.
 * @access GERENTE, ADMIN
 */
export async function validateSubmissionHandler(
  request: SubmissionRequest<{ id: string }, unknown, ValidateSubmissionData>,
  reply: FastifyReply
) {
  try {
    const result = await SubmissionService.validateSubmission(
      request.params.id,
      request.body,
      request.user!
    );
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao validar submissão ${request.params.id}: ${(error as Error).message}`);
    return reply.code(400).send({ message: (error as Error).message });
  }
}

/**
 * Valida ou rejeita múltiplas submissões em lote.
 * @access GERENTE, ADMIN
 */
export async function bulkValidateSubmissionsHandler(
  request: SubmissionRequest<unknown, unknown, BulkValidateSubmissionsData>,
  reply: FastifyReply
) {
  try {
    const result = await SubmissionService.bulkValidateSubmissions(request.body, request.user!);
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro na validação em lote: ${(error as Error).message}`);
    return reply.code(400).send({ message: (error as Error).message });
  }
}

/**
 * Retorna estatísticas de submissões para o usuário.
 * @access Autenticado
 */
export async function getUserSubmissionStatsHandler(
  request: SubmissionRequest,
  reply: FastifyReply
) {
  try {
    const stats = await SubmissionService.getUserSubmissionStats(request.user!.id);
    return reply.code(200).send(stats);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar estatísticas: ${(error as Error).message}`);
    return reply.code(500).send({ message: 'Erro ao buscar estatísticas' });
  }
}

/**
 * Lista submissões de um kit específico.
 * @access Autenticado (com verificação de permissão no serviço)
 */
export async function getSubmissionsByKitHandler(
  request: SubmissionRequest<{ kitId: string }>,
  reply: FastifyReply
) {
  try {
    const submissions = await SubmissionService.getSubmissionsByKit(
      request.params.kitId,
      request.user!
    );
    return reply.code(200).send(submissions);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar submissões do kit ${request.params.kitId}: ${(error as Error).message}`);
    return reply.code(403).send({ message: (error as Error).message });
  }
}
