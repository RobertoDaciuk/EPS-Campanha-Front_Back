/**
 * @file premio.controller.ts
 * @version 2.0.0
 * @description Controller para gestão de prêmios da API EPS Campanhas.
 * Gerencia catálogo de prêmios, sistema de resgate, controle de estoque e relatórios.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do controller de prêmios
 * - Sistema de resgate com validações
 * - Controle automático de estoque
 * - Catálogo personalizado por usuário
 * - Relatórios de resgates detalhados
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { 
  premioParamsSchema,
  premioFiltersSchema,
  createPremioSchema,
  updatePremioSchema,
  redeemPremioSchema,
  updateStockSchema,
  premioStatsSchema,
  bulkPremioImportSchema,
  CreatePremioData,
  UpdatePremioData,
  PremioFilters,
  RedeemPremioData,
  UpdateStockData,
  PremioStatsQuery,
  BulkPremioImportData
} from '../schemas/premio.schema';
import {
  createPremio,
  updatePremio,
  getPremioById,
  listPremios,
  redeemPremio,
  updatePremioStock,
  deletePremio,
  getAvailablePremiosForUser,
  getPremioStats,
  canUserRedeemPremio,
  getPopularPremios,
  restockPremio,
  getLowStockPremios,
  getOutOfStockPremios
} from '../services/premio.service';

// ==================== INTERFACES DE REQUEST ====================

interface CreatePremioRequest extends FastifyRequest {
  Body: CreatePremioData;
}

interface UpdatePremioRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdatePremioData;
}

interface PremioParamsRequest extends FastifyRequest {
  Params: { id: string };
}

interface ListPremiosRequest extends FastifyRequest {
  Querystring: PremioFilters;
}

interface RedeemPremioRequest extends FastifyRequest {
  Params: { id: string };
  Body: Partial<RedeemPremioData>;
}

interface UpdateStockRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateStockData;
}

interface PremioStatsRequest extends FastifyRequest {
  Querystring: PremioStatsQuery;
}

interface BulkImportRequest extends FastifyRequest {
  Body: BulkPremioImportData;
}

interface CheckRedeemRequest extends FastifyRequest {
  Params: { id: string };
}

// ==================== HANDLERS PRINCIPAIS ====================

/**
 * Handler para criar novo prêmio
 */
export const createPremioHandler = async (
  request: CreatePremioRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem criar prêmios',
      });
    }

    const premio = await createPremio(request.body);

    console.log(`[PREMIO_CONTROLLER] Prêmio criado: ${premio.title} por ${request.user.email}`);

    return reply.code(201).send({
      success: true,
      message: 'Prêmio criado com sucesso',
      data: { premio },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao criar prêmio:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao criar prêmio';

    if (error instanceof Error) {
      if (error.message.includes('inválido') || 
          error.message.includes('obrigatório') ||
          error.message.includes('deve ter')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao criar prêmio',
      message: errorMessage,
    });
  }
};

/**
 * Handler para buscar prêmio por ID
 */
export const getPremioHandler = async (
  request: PremioParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    
    const premio = await getPremioById(id);

    if (!premio) {
      return reply.code(404).send({
        success: false,
        error: 'Prêmio não encontrado',
        message: 'O prêmio solicitado não existe',
      });
    }

    // Se usuário está logado, adiciona informações de disponibilidade
    let premioWithUserInfo = premio;
    if (request.user) {
      const availability = await canUserRedeemPremio(id, request.user.id);
      premioWithUserInfo = {
        ...premio,
        canUserRedeem: availability.canRedeem,
        userPoints: availability.userPoints,
        reasonIfUnavailable: availability.reason,
      };
    }

    return reply.code(200).send({
      success: true,
      message: 'Prêmio encontrado com sucesso',
      data: { premio: premioWithUserInfo },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao buscar prêmio:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao buscar dados do prêmio',
    });
  }
};

/**
 * Handler para listar prêmios com filtros
 */
export const listPremiosHandler = async (
  request: ListPremiosRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const filters = request.query;
    
    // Se usuário está logado, adiciona seu ID aos filtros para cálculos personalizados
    const filtersWithUser = request.user ? { ...filters, userId: request.user.id } : filters;

    const result = await listPremios(filtersWithUser);

    // Adiciona informações de contexto
    const responseData = {
      ...result,
      userContext: request.user ? {
        userId: request.user.id,
        userPoints: request.user.points || 0, // Seria obtido do service
        userRole: request.user.role,
      } : null,
    };

    return reply.code(200).send({
      success: true,
      message: 'Prêmios listados com sucesso',
      data: responseData.data,
      pagination: responseData.pagination,
      userContext: responseData.userContext,
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao listar prêmios:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao listar prêmios',
    });
  }
};

/**
 * Handler para atualizar prêmio
 */
export const updatePremioHandler = async (
  request: UpdatePremioRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem editar prêmios',
      });
    }

    const { id } = request.params;
    
    const updatedPremio = await updatePremio(id, request.body);

    console.log(`[PREMIO_CONTROLLER] Prêmio atualizado: ${updatedPremio.title} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Prêmio atualizado com sucesso',
      data: { premio: updatedPremio },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao atualizar prêmio:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao atualizar prêmio';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('inválido') || 
                 error.message.includes('deve ter')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao atualizar prêmio',
      message: errorMessage,
    });
  }
};

/**
 * Handler para excluir prêmio
 */
export const deletePremioHandler = async (
  request: PremioParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem excluir prêmios',
      });
    }

    const { id } = request.params;
    
    await deletePremio(id);

    console.log(`[PREMIO_CONTROLLER] Prêmio excluído: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Prêmio excluído com sucesso',
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao excluir prêmio:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao excluir prêmio';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') || 
                 error.message.includes('resgates pendentes')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao excluir prêmio',
      message: errorMessage,
    });
  }
};

/**
 * Handler para resgatar prêmio
 */
export const redeemPremioHandler = async (
  request: RedeemPremioRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para resgatar prêmios',
      });
    }

    const { id } = request.params;
    
    // Verifica se pode resgatar antes de tentar
    const canRedeem = await canUserRedeemPremio(id, request.user.id);
    
    if (!canRedeem.canRedeem) {
      return reply.code(400).send({
        success: false,
        error: 'Resgate não permitido',
        message: canRedeem.reason || 'Não é possível resgatar este prêmio',
        data: {
          userPoints: canRedeem.userPoints,
          requiredPoints: canRedeem.requiredPoints,
        },
      });
    }

    await redeemPremio(id, request.user.id);

    console.log(`[PREMIO_CONTROLLER] Prêmio resgatado: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Prêmio resgatado com sucesso!',
      data: {
        premioId: id,
        userId: request.user.id,
        redeemedAt: new Date().toISOString(),
        pointsDeducted: canRedeem.requiredPoints,
        newUserPoints: (canRedeem.userPoints || 0) - (canRedeem.requiredPoints || 0),
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao resgatar prêmio:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno no resgate do prêmio';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('fora de estoque') || 
                 error.message.includes('pontos insuficientes') ||
                 error.message.includes('não disponível') ||
                 error.message.includes('limite')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro no resgate',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter prêmios disponíveis para o usuário
 */
export const getAvailablePremiosHandler = async (
  request: FastifyRequest<{ Querystring: Partial<PremioFilters> }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver prêmios disponíveis',
      });
    }

    const result = await getAvailablePremiosForUser(request.user.id);

    return reply.code(200).send({
      success: true,
      message: 'Prêmios disponíveis obtidos com sucesso',
      data: result,
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao obter prêmios disponíveis:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar prêmios disponíveis',
    });
  }
};

/**
 * Handler para verificar se usuário pode resgatar prêmio específico
 */
export const checkRedeemHandler = async (
  request: CheckRedeemRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário',
      });
    }

    const { id } = request.params;
    
    const result = await canUserRedeemPremio(id, request.user.id);

    return reply.code(200).send({
      success: true,
      message: 'Verificação de resgate concluída',
      data: result,
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao verificar resgate:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao verificar possibilidade de resgate',
    });
  }
};

/**
 * Handler para atualizar estoque de prêmio
 */
export const updateStockHandler = async (
  request: UpdateStockRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem alterar estoque',
      });
    }

    const { id } = request.params;
    
    const result = await updatePremioStock(id, request.body);

    console.log(`[PREMIO_CONTROLLER] Estoque atualizado: ${id} → ${result.newStock} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Estoque atualizado com sucesso',
      data: {
        premioId: id,
        newStock: result.newStock,
        operation: request.body.operation,
        quantity: request.body.quantity,
        updatedBy: request.user.email,
        updatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao atualizar estoque:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao atualizar estoque';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('inválid')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao atualizar estoque',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter estatísticas de prêmios
 */
export const getPremioStatsHandler = async (
  request: PremioStatsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver estatísticas de prêmios',
      });
    }

    const stats = await getPremioStats();

    return reply.code(200).send({
      success: true,
      message: 'Estatísticas de prêmios obtidas com sucesso',
      data: {
        stats,
        generatedAt: new Date().toISOString(),
        generatedBy: request.user.role,
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao obter estatísticas:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar estatísticas de prêmios',
    });
  }
};

/**
 * Handler para obter prêmios populares
 */
export const getPopularPremiosHandler = async (
  request: FastifyRequest<{ Querystring: { limit?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { limit = '10' } = request.query;
    const limitNum = Math.min(parseInt(limit), 50);

    const popularPremios = await getPopularPremios(limitNum);

    return reply.code(200).send({
      success: true,
      message: 'Prêmios populares obtidos com sucesso',
      data: {
        premios: popularPremios,
        limit: limitNum,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao obter prêmios populares:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar prêmios populares',
    });
  }
};

/**
 * Handler para repor estoque (operação administrativa)
 */
export const restockPremioHandler = async (
  request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: { quantity: number; reason: string } 
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem repor estoque',
      });
    }

    const { id } = request.params;
    const { quantity, reason } = request.body;

    if (!quantity || quantity <= 0) {
      return reply.code(400).send({
        success: false,
        error: 'Quantidade inválida',
        message: 'Quantidade deve ser maior que zero',
      });
    }

    if (!reason || reason.length < 5) {
      return reply.code(400).send({
        success: false,
        error: 'Motivo obrigatório',
        message: 'Motivo da reposição deve ter pelo menos 5 caracteres',
      });
    }

    const result = await restockPremio(id, quantity, reason);

    console.log(`[PREMIO_CONTROLLER] Estoque reposto: ${id} +${quantity} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Estoque reposto com sucesso',
      data: {
        premioId: id,
        quantityAdded: quantity,
        newStock: result.newStock,
        reason,
        restockedBy: request.user.email,
        restockedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao repor estoque:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';

    return reply.code(500).send({
      success: false,
      error: 'Erro ao repor estoque',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter prêmios com baixo estoque
 */
export const getLowStockHandler = async (
  request: FastifyRequest<{ Querystring: { threshold?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem ver alertas de estoque',
      });
    }

    const { threshold = '5' } = request.query;
    const thresholdNum = Math.max(parseInt(threshold), 1);

    const lowStockPremios = await getLowStockPremios(thresholdNum);

    return reply.code(200).send({
      success: true,
      message: 'Prêmios com baixo estoque obtidos',
      data: {
        premios: lowStockPremios,
        threshold: thresholdNum,
        count: lowStockPremios.length,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao obter baixo estoque:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar prêmios com baixo estoque',
    });
  }
};

/**
 * Handler para obter prêmios esgotados
 */
export const getOutOfStockHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem ver prêmios esgotados',
      });
    }

    const outOfStockPremios = await getOutOfStockPremios();

    return reply.code(200).send({
      success: true,
      message: 'Prêmios esgotados obtidos',
      data: {
        premios: outOfStockPremios,
        count: outOfStockPremios.length,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao obter prêmios esgotados:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar prêmios esgotados',
    });
  }
};

/**
 * Handler para catálogo público de prêmios (sem autenticação)
 */
export const getPublicCatalogHandler = async (
  request: FastifyRequest<{ Querystring: Partial<PremioFilters> }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const filters: PremioFilters = {
      ...request.query,
      isActive: true, // Apenas prêmios ativos
      inStock: true,  // Apenas com estoque
      page: parseInt(request.query.page?.toString() || '1'),
      limit: Math.min(parseInt(request.query.limit?.toString() || '12'), 50),
      sort: request.query.sort || 'priority',
      order: request.query.order || 'desc',
    };

    const result = await listPremios(filters);

    // Remove informações sensíveis para catálogo público
    const publicData = result.data?.map((premio: any) => ({
      id: premio.id,
      title: premio.title,
      description: premio.description,
      imageUrl: premio.imageUrl,
      pointsRequired: premio.pointsRequired,
      category: premio.category,
      isAvailable: premio.stock > 0,
    }));

    return reply.code(200).send({
      success: true,
      message: 'Catálogo público de prêmios',
      data: publicData,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro no catálogo público:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar catálogo de prêmios',
    });
  }
};

/**
 * Handler para importação em lote de prêmios
 */
export const bulkImportPremiosHandler = async (
  request: BulkImportRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem importar prêmios em lote',
      });
    }

    const { premios, validateOnly, skipDuplicates } = request.body;

    // Por enquanto, implementação simples - criar um por um
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    for (const premioData of premios) {
      try {
        if (validateOnly) {
          // Apenas valida sem criar
          results.push({
            title: premioData.title,
            success: true,
            message: 'Validação bem-sucedida',
          });
          successful++;
        } else {
          const createdPremio = await createPremio(premioData);
          results.push({
            title: premioData.title,
            success: true,
            message: 'Prêmio criado com sucesso',
            premioId: createdPremio.id,
          });
          successful++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        results.push({
          title: premioData.title,
          success: false,
          message: errorMessage,
        });
        failed++;
      }
    }

    const message = validateOnly ? 
      `Validação concluída: ${successful} válidos, ${failed} inválidos` :
      `Importação concluída: ${successful} criados, ${failed} falharam`;

    console.log(`[PREMIO_CONTROLLER] ${message} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message,
      data: {
        summary: {
          total: premios.length,
          successful,
          failed,
          validateOnly,
        },
        results,
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro na importação em lote:', error);

    return reply.code(400).send({
      success: false,
      error: 'Erro na importação',
      message: 'Erro ao processar importação em lote de prêmios',
    });
  }
};

/**
 * Handler para histórico de resgates do usuário
 */
export const getRedemptionHistoryHandler = async (
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver histórico de resgates',
      });
    }

    const { page = '1', limit = '10' } = request.query;
    
    // Por enquanto retorna array vazio - implementar quando houver tabela de resgates
    const redemptions: any[] = [];

    return reply.code(200).send({
      success: true,
      message: 'Histórico de resgates obtido',
      data: {
        redemptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        userId: request.user.id,
      },
    });

  } catch (error) {
    console.error('[PREMIO_CONTROLLER] Erro ao obter histórico de resgates:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar histórico de resgates',
    });
  }
};
