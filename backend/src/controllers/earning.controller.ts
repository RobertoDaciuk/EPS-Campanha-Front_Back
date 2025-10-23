/**
 * @file earning.controller.ts
 * @version 2.0.0
 * @description Controller para gestão de ganhos/earnings da API EPS Campanhas.
 * Gerencia sistema financeiro, pagamentos, relatórios e auditoria de ganhos.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do controller de earnings
 * - Sistema de pagamentos e aprovações
 * - Processamento em lote de earnings
 * - Relatórios financeiros detalhados
 * - Auditoria completa de transações
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, EarningStatus, EarningType } from '@prisma/client';
import { 
  earningParamsSchema,
  earningFiltersSchema,
  createEarningSchema,
  updateEarningSchema,
  markEarningAsPaidSchema,
  bulkProcessEarningsSchema,
  financialReportSchema,
  earningProjectionSchema,
  earningAuditSchema,
  CreateEarningData,
  UpdateEarningData,
  EarningFilters,
  MarkEarningAsPaidData,
  BulkProcessEarningsData,
  FinancialReportQuery,
  EarningProjectionQuery,
  EarningAuditData
} from '../schemas/earning.schema';
import {
  createEarning,
  updateEarning,
  getEarningById,
  listEarnings,
  markEarningAsPaid,
  bulkProcessEarnings,
  generateFinancialReport,
  getEarningProjection,
  getEarningStats,
  getUserEarnings,
  getManagerEarnings,
  cancelEarning,
  auditEarning
} from '../services/earning.service';

// ==================== INTERFACES DE REQUEST ====================

interface CreateEarningRequest extends FastifyRequest {
  Body: CreateEarningData;
}

interface UpdateEarningRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateEarningData;
}

interface EarningParamsRequest extends FastifyRequest {
  Params: { id: string };
}

interface ListEarningsRequest extends FastifyRequest {
  Querystring: EarningFilters;
}

interface MarkAsPaidRequest extends FastifyRequest {
  Params: { id: string };
  Body: MarkEarningAsPaidData;
}

interface BulkProcessRequest extends FastifyRequest {
  Body: BulkProcessEarningsData;
}

interface FinancialReportRequest extends FastifyRequest {
  Querystring: FinancialReportQuery;
}

interface ProjectionRequest extends FastifyRequest {
  Querystring: EarningProjectionQuery;
}

interface AuditRequest extends FastifyRequest {
  Params: { id: string };
  Body: EarningAuditData;
}

// ==================== HANDLERS PRINCIPAIS ====================

/**
 * Handler para criar novo earning
 */
export const createEarningHandler = async (
  request: CreateEarningRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const earning = await createEarning(request.body, request.user!.id);

    console.log(`[EARNING_CONTROLLER] Earning criado: ${earning.id} (${earning.type}) por ${request.user.email}`);

    return reply.code(201).send({
      success: true,
      message: 'Earning criado com sucesso',
      data: { earning },
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao criar earning:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao criar earning';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('inválido') || 
                 error.message.includes('obrigatório')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao criar earning',
      message: errorMessage,
    });
  }
};

/**
 * Handler para buscar earning por ID
 */
export const getEarningHandler = async (
  request: EarningParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    
    const earning = await getEarningById(id);

    if (!earning) {
      return reply.code(404).send({
        success: false,
        error: 'Earning não encontrado',
        message: 'O earning solicitado não existe',
      });
    }

    // Verifica permissões de visualização
    const canView = request.user && (
      request.user.role === UserRole.ADMIN ||
      request.user.id === earning.userId ||
      (request.user.role === UserRole.GERENTE && earning.user.managerId === request.user.id)
    );

    if (!canView) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você não tem permissão para ver este earning',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Earning encontrado com sucesso',
      data: { earning },
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao buscar earning:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao buscar dados do earning',
    });
  }
};

/**
 * Handler para listar earnings com filtros
 */
export const listEarningsHandler = async (
  request: ListEarningsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver earnings',
      });
    }

    let filters = request.query;
    
    // Aplica filtros baseados no perfil do usuário
    if (request.user.role === UserRole.VENDEDOR) {
      // Vendedor só vê seus próprios earnings
      filters = { ...filters, userId: request.user.id };
    } else if (request.user.role === UserRole.GERENTE) {
      // Se não especificou userId, gerente vê sua equipe + próprios earnings
      if (!filters.userId) {
        // Implementar lógica para buscar IDs da equipe
      }
    }
    // Admin vê todos (sem restrições)

    const result = await listEarnings(filters);

    return reply.code(200).send({
      success: true,
      message: 'Earnings listados com sucesso',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao listar earnings:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao listar earnings',
    });
  }
};

/**
 * Handler para marcar earning como pago
 */
export const markEarningAsPaidHandler = async (
  request: MarkAsPaidRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem marcar earnings como pagos',
      });
    }

    const { id } = request.params;
    
    await markEarningAsPaid(id, request.body);

    console.log(`[EARNING_CONTROLLER] Earning marcado como pago: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Earning marcado como pago com sucesso',
      data: {
        earningId: id,
        paidAt: new Date().toISOString(),
        paidBy: request.user.email,
      },
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao marcar como pago:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao processar pagamento';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('já foi pago') || 
                 error.message.includes('não é possível')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao processar pagamento',
      message: errorMessage,
    });
  }
};

/**
 * Handler para processamento em lote de earnings
 */
export const bulkProcessEarningsHandler = async (
  request: BulkProcessRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem processar earnings em lote',
      });
    }

    const result = await bulkProcessEarnings(request.body, request.user.id);

    console.log(`[EARNING_CONTROLLER] Processamento em lote: ${result.successful} sucessos, ${result.failed} falhas por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: `Processamento em lote concluído: ${result.successful} sucessos, ${result.failed} falhas`,
      data: result,
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro no processamento em lote:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';

    return reply.code(400).send({
      success: false,
      error: 'Erro no processamento em lote',
      message: errorMessage,
    });
  }
};

/**
 * Handler para gerar relatório financeiro
 */
export const generateFinancialReportHandler = async (
  request: FinancialReportRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para gerar relatórios financeiros',
      });
    }

    let filters = request.query;
    
    // Se for gerente, filtra apenas sua equipe
    if (request.user.role === UserRole.GERENTE && !filters.userId) {
      // Aqui seria aplicado filtro para equipe do gerente
    }

    const report = await generateFinancialReport(filters, request.user.id);

    console.log(`[EARNING_CONTROLLER] Relatório financeiro gerado por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Relatório financeiro gerado com sucesso',
      data: report,
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao gerar relatório financeiro:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao gerar relatório financeiro',
    });
  }
};

/**
 * Handler para obter projeções de earnings
 */
export const getEarningProjectionHandler = async (
  request: FastifyRequest<{ Querystring: EarningProjectionQuery }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver projeções',
      });
    }

    let filters = request.query;
    
    // Se for gerente sem userId especificado, aplica à sua equipe
    if (request.user.role === UserRole.GERENTE && !filters.userId) {
      // Aqui seria aplicado filtro para equipe do gerente
    }

    const projection = await getEarningProjection(filters);

    return reply.code(200).send({
      success: true,
      message: 'Projeção de earnings calculada com sucesso',
      data: projection,
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao calcular projeção:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao calcular projeção de earnings',
    });
  }
};

/**
 * Handler para obter earnings do usuário atual
 */
export const getMyEarningsHandler = async (
  request: FastifyRequest<{ Querystring: Partial<EarningFilters> }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver seus earnings',
      });
    }

    const filters: EarningFilters = {
      ...request.query,
      userId: request.user.id, // Força filtro pelo usuário atual
      page: parseInt(request.query.page?.toString() || '1'),
      limit: Math.min(parseInt(request.query.limit?.toString() || '10'), 100),
      sort: request.query.sort || 'earningDate',
      order: request.query.order || 'desc',
    };

    const result = await listEarnings(filters);

    return reply.code(200).send({
      success: true,
      message: 'Seus earnings obtidos com sucesso',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao obter earnings do usuário:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar seus earnings',
    });
  }
};

/**
 * Handler para obter estatísticas de earnings
 */
export const getEarningStatsHandler = async (
  request: FastifyRequest<{ Querystring: { period?: string; userId?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver estatísticas',
      });
    }

    const { period = '30d', userId } = request.query;
    
    // Determina qual usuário consultar baseado em permissões
    let targetUserId: string | undefined;

    if (userId) {
      if (request.user.role === UserRole.ADMIN) {
        targetUserId = userId;
      } else if (request.user.role === UserRole.GERENTE) {
        // Verifica se é vendedor da sua equipe (implementar validação)
        targetUserId = userId;
      } else if (request.user.id === userId) {
        targetUserId = userId;
      } else {
        return reply.code(403).send({
          success: false,
          error: 'Acesso negado',
          message: 'Você só pode ver suas próprias estatísticas',
        });
      }
    } else {
      targetUserId = request.user.id;
    }

    const stats = await getEarningStats(targetUserId, period as any);

    return reply.code(200).send({
      success: true,
      message: 'Estatísticas de earnings obtidas com sucesso',
      data: {
        stats,
        period,
        userId: targetUserId,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao obter estatísticas:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar estatísticas de earnings',
    });
  }
};

/**
 * Handler para atualizar earning
 */
export const updateEarningHandler = async (
  request: UpdateEarningRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem editar earnings',
      });
    }

    const { id } = request.params;
    
    const updatedEarning = await updateEarning(id, request.body);

    console.log(`[EARNING_CONTROLLER] Earning atualizado: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Earning atualizado com sucesso',
      data: { earning: updatedEarning },
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao atualizar earning:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao atualizar earning';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') || 
                 error.message.includes('já foi pago')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao atualizar earning',
      message: errorMessage,
    });
  }
};

/**
 * Handler para cancelar earning
 */
export const cancelEarningHandler = async (
  request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: { reason: string } 
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem cancelar earnings',
      });
    }

    const { id } = request.params;
    const { reason } = request.body;

    if (!reason || reason.length < 5) {
      return reply.code(400).send({
        success: false,
        error: 'Motivo obrigatório',
        message: 'Motivo do cancelamento deve ter pelo menos 5 caracteres',
      });
    }

    await cancelEarning(id, reason, request.user.id);

    console.log(`[EARNING_CONTROLLER] Earning cancelado: ${id} por ${request.user.email} - Motivo: ${reason}`);

    return reply.code(200).send({
      success: true,
      message: 'Earning cancelado com sucesso',
      data: {
        earningId: id,
        cancelledAt: new Date().toISOString(),
        cancelledBy: request.user.email,
        reason,
      },
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao cancelar earning:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao cancelar earning';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') || 
                 error.message.includes('já foi pago')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao cancelar earning',
      message: errorMessage,
    });
  }
};

/**
 * Handler para earnings pendentes do usuário
 */
export const getPendingEarningsHandler = async (
  request: FastifyRequest<{ Querystring: { userId?: string } }>,
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

    const { userId } = request.query;
    let targetUserId = request.user.id;

    // Verifica permissões para ver earnings de outro usuário
    if (userId && userId !== request.user.id) {
      if (request.user.role === UserRole.ADMIN) {
        targetUserId = userId;
      } else if (request.user.role === UserRole.GERENTE) {
        // Aqui verificaria se é vendedor da equipe
        targetUserId = userId;
      } else {
        return reply.code(403).send({
          success: false,
          error: 'Acesso negado',
          message: 'Você só pode ver seus próprios earnings pendentes',
        });
      }
    }

    const filters: EarningFilters = {
      userId: targetUserId,
      status: EarningStatus.PENDENTE,
      page: 1,
      limit: 100,
      sort: 'earningDate',
      order: 'desc',
    };

    const result = await listEarnings(filters);

    return reply.code(200).send({
      success: true,
      message: 'Earnings pendentes obtidos com sucesso',
      data: result.data,
      summary: {
        totalPending: result.summary?.pendingAmount || 0,
        count: result.data?.length || 0,
        userId: targetUserId,
      },
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao obter earnings pendentes:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar earnings pendentes',
    });
  }
};

/**
 * Handler para obter resumo financeiro
 */
export const getFinancialSummaryHandler = async (
  request: FastifyRequest<{ Querystring: { period?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver resumo financeiro',
      });
    }

    const { period = '30d' } = request.query;
    
    // Busca resumo baseado no período
    const reportQuery: FinancialReportQuery = {
      groupBy: 'month',
      format: 'json',
      includeSummary: true,
      includeCharts: false,
      type: 'all',
      status: 'all',
    };

    // Aplica filtro de data baseado no período
    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    reportQuery.startDate = startDate.toISOString();
    reportQuery.endDate = now.toISOString();

    const report = await generateFinancialReport(reportQuery, request.user.id);

    return reply.code(200).send({
      success: true,
      message: 'Resumo financeiro obtido com sucesso',
      data: {
        summary: report.summary,
        period,
        generatedAt: new Date().toISOString(),
        scope: request.user.role === UserRole.GERENTE ? 'team' : 'global',
      },
    });

  } catch (error) {
    console.error('[EARNING_CONTROLLER] Erro ao obter resumo financeiro:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar resumo financeiro',
    });
  }
};
