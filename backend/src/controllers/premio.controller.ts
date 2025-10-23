/**
 * @file premio.controller.ts
 * @version 1.0.0
 * @description Controller para a gestão de prêmios.
 * @author DevEPS
 * @date 2023-10-21
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as PremioService from '../services/premio.service';
import {
  CreatePremioData,
  UpdatePremioData,
  PremioFilters,
  UpdateStockData,
  BulkPremioImportData,
} from '../schemas/premio.schema';

// Tipagem para requisições com tipos específicos
type PremioRequest<TParams = unknown, TQuery = unknown, TBody = unknown> = FastifyRequest<{
  Params: TParams;
  Querystring: TQuery;
  Body: TBody;
}>;

/**
 * Cria um novo prêmio.
 * @access ADMIN
 */
export async function createPremioHandler(
  request: PremioRequest<unknown, unknown, CreatePremioData>,
  reply: FastifyReply
) {
  try {
    const premio = await PremioService.createPremio(request.body, request.user!.id);
    return reply.code(201).send(premio);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao criar prêmio: ${error}`);
    return reply.code(400).send(error);
  }
}

/**
 * Lista todos os prêmios com base em filtros.
 * @access Autenticado
 */
export async function listPremiosHandler(
  request: PremioRequest<unknown, PremioFilters, unknown>,
  reply: FastifyReply
) {
  try {
    const result = await PremioService.listPremios(request.query, request.user!.id);
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao listar prêmios: ${error}`);
    return reply.code(500).send({ message: 'Erro interno ao buscar prêmios' });
  }
}

/**
 * Busca um prêmio pelo ID.
 * @access Autenticado
 */
export async function getPremioHandler(
  request: PremioRequest<{ id: string }>,
  reply: FastifyReply
) {
  try {
    const premio = await PremioService.getPremioById(request.params.id, request.user!.id);
    if (!premio) {
      return reply.code(404).send({ message: 'Prêmio não encontrado' });
    }
    return reply.code(200).send(premio);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar prêmio ${request.params.id}: ${error}`);
    return reply.code(500).send({ message: 'Erro interno ao buscar o prêmio' });
  }
}

/**
 * Atualiza um prêmio existente.
 * @access ADMIN
 */
export async function updatePremioHandler(
  request: PremioRequest<{ id: string }, unknown, UpdatePremioData>,
  reply: FastifyReply
) {
  try {
    const premio = await PremioService.updatePremio(
      request.params.id,
      request.body,
      request.user!.id
    );
    return reply.code(200).send(premio);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao atualizar prêmio ${request.params.id}: ${error}`);
    return reply.code(400).send(error);
  }
}

/**
 * Deleta um prêmio.
 * @access ADMIN
 */
export async function deletePremioHandler(
  request: PremioRequest<{ id: string }>,
  reply: FastifyReply
) {
  try {
    await PremioService.deletePremio(request.params.id, request.user!.id);
    return reply.code(204).send();
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao deletar prêmio ${request.params.id}: ${error}`);
    return reply.code(400).send(error);
  }
}

/**
 * Resgata um prêmio para o usuário logado.
 * @access Autenticado
 */
export async function redeemPremioHandler(
  request: PremioRequest<{ id: string }>,
  reply: FastifyReply
) {
  try {
    const result = await PremioService.redeemPremio(request.params.id, request.user!.id);
    return reply.code(200).send(result);
  } catch (error) {
    console.error(
      `[CONTROLLER] Erro no resgate do prêmio ${request.params.id} por ${request.user!.email}: ${error}`
    );
    return reply.code(400).send({ message: (error as Error).message });
  }
}

/**
 * Lista os prêmios disponíveis para o usuário logado.
 * @access Autenticado
 */
export async function getAvailablePremiosHandler(
  request: PremioRequest,
  reply: FastifyReply
) {
  try {
    const premios = await PremioService.getAvailablePremiosForUser(request.user!.id);
    return reply.code(200).send(premios);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar prêmios disponíveis: ${error}`);
    return reply.code(500).send({ message: 'Erro ao buscar prêmios disponíveis' });
  }
}

/**
 * Verifica se o usuário pode resgatar um prêmio.
 * @access Autenticado
 */
export async function checkRedeemHandler(
  request: PremioRequest<{ id: string }>,
  reply: FastifyReply
) {
  try {
    const result = await PremioService.canUserRedeemPremio(
      request.params.id,
      request.user!.id
    );
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao verificar resgate: ${error}`);
    return reply.code(500).send({ message: 'Erro ao verificar possibilidade de resgate' });
  }
}

/**
 * Atualiza o estoque de um prêmio.
 * @access ADMIN
 */
export async function updateStockHandler(
  request: PremioRequest<{ id: string }, unknown, UpdateStockData>,
  reply: FastifyReply
) {
  try {
    const result = await PremioService.updatePremioStock(
      request.params.id,
      request.body,
      request.user!.id
    );
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao atualizar estoque do prêmio ${request.params.id}: ${error}`);
    return reply.code(400).send(error);
  }
}

/**
 * Repõe o estoque de um prêmio.
 * @access ADMIN
 */
export async function restockPremioHandler(
  request: PremioRequest<{ id: string }, unknown, { quantity: number }>,
  reply: FastifyReply
) {
  try {
    const result = await PremioService.restockPremio(
      request.params.id,
      request.body.quantity,
      request.user!.id
    );
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao repor estoque do prêmio ${request.params.id}: ${error}`);
    return reply.code(400).send(error);
  }
}

/**
 * Retorna estatísticas sobre os prêmios.
 * @access ADMIN, GERENTE
 */
export async function getPremioStatsHandler(request: PremioRequest, reply: FastifyReply) {
  try {
    const stats = await PremioService.getPremioStats();
    return reply.code(200).send(stats);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar estatísticas de prêmios: ${error}`);
    return reply.code(500).send({ message: 'Erro ao buscar estatísticas' });
  }
}

/**
 * Retorna o catálogo público de prêmios.
 * @access Público
 */
export async function getPublicCatalogHandler(
  request: PremioRequest<unknown, PremioFilters, unknown>,
  reply: FastifyReply
) {
  try {
    const result = await PremioService.getPublicCatalog(request.query);
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar catálogo público: ${error}`);
    return reply.code(500).send({ message: 'Erro ao buscar catálogo' });
  }
}

/**
 * Retorna os prêmios mais populares.
 * @access Público
 */
export async function getPopularPremiosHandler(
  request: PremioRequest<unknown, { limit?: number }, unknown>,
  reply: FastifyReply
) {
  try {
    const limit = request.query.limit || 10;
    const premios = await PremioService.getPopularPremios(limit);
    return reply.code(200).send(premios);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar prêmios populares: ${error}`);
    return reply.code(500).send({ message: 'Erro ao buscar prêmios populares' });
  }
}

/**
 * Retorna o histórico de resgates do usuário.
 * @access Autenticado
 */
export async function getRedemptionHistoryHandler(
  request: PremioRequest<unknown, { page?: number; limit?: number }>,
  reply: FastifyReply
) {
  try {
    const { page = 1, limit = 10 } = request.query;
    const result = await PremioService.getUserRedemptionHistory(
      request.user!.id,
      page,
      limit
    );
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar histórico de resgates: ${error}`);
    return reply.code(500).send({ message: 'Erro ao buscar histórico de resgates' });
  }
}

/**
 * Lista prêmios com baixo estoque.
 * @access ADMIN
 */
export async function getLowStockHandler(
  request: PremioRequest<unknown, { threshold?: number }>,
  reply: FastifyReply
) {
  try {
    const threshold = request.query.threshold || 10;
    const premios = await PremioService.getLowStockPremios(threshold);
    return reply.code(200).send(premios);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar prêmios com baixo estoque: ${error}`);
    return reply.code(500).send({ message: 'Erro ao buscar prêmios com baixo estoque' });
  }
}

/**
 * Lista prêmios com estoque esgotado.
 * @access ADMIN
 */
export async function getOutOfStockHandler(request: PremioRequest, reply: FastifyReply) {
  try {
    const premios = await PremioService.getOutOfStockPremios();
    return reply.code(200).send(premios);
  } catch (error) {
    console.error(`[CONTROLLER] Erro ao buscar prêmios esgotados: ${error}`);
    return reply.code(500).send({ message: 'Erro ao buscar prêmios esgotados' });
  }
}

/**
 * Importa prêmios em lote.
 * @access ADMIN
 */
export async function bulkImportPremiosHandler(
  request: PremioRequest<unknown, unknown, BulkPremioImportData>,
  reply: FastifyReply
) {
  try {
    const result = await PremioService.bulkImportPremios(request.body, request.user!.id);
    return reply.code(200).send(result);
  } catch (error) {
    console.error(`[CONTROLLER] Erro na importação em lote: ${error}`);
    return reply.code(400).send(error);
  }
}
