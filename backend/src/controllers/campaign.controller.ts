/**
 * @file campaign.controller.ts
 * @version 2.0.0
 * @description Controller para gestão de campanhas da API EPS Campanhas.
 * Gerencia CRUD de campanhas, kits, progresso e estatísticas detalhadas.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do controller de campanhas
 * - Gestão de kits e progresso de usuários
 * - Estatísticas detalhadas por perfil
 * - Sistema de validação robusto
 * - Logs de auditoria completos
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { 
  campaignParamsSchema,
  campaignFiltersSchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignDetailsSchema,
  campaignStatsSchema,
  duplicateCampaignSchema,
  toggleCampaignStatusSchema,
  campaignPerformanceSchema,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters,
  CampaignDetailsQuery,
  CampaignStatsQuery,
  DuplicateCampaignData,
  ToggleCampaignStatusData,
  CampaignPerformanceQuery
} from '../schemas/campaign.schema';
import {
  createCampaign,
  updateCampaign,
  getCampaignById,
  listCampaigns,
  getCampaignDetailsWithUserProgress,
  getActiveCampaignsForUser,
  getCampaignStats,
  toggleCampaignStatus,
  deleteCampaign,
  getCampaignsForManager,
  canUserParticipateInCampaign,
  updateExpiredCampaigns
} from '../services/campaign.service';

// ==================== INTERFACES DE REQUEST ====================

interface CreateCampaignRequest extends FastifyRequest {
  Body: CreateCampaignData;
}

interface UpdateCampaignRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateCampaignData;
}

interface CampaignParamsRequest extends FastifyRequest {
  Params: { id: string };
}

interface ListCampaignsRequest extends FastifyRequest {
  Querystring: CampaignFilters;
}

interface CampaignDetailsRequest extends FastifyRequest {
  Params: { id: string };
  Querystring: CampaignDetailsQuery;
}

interface CampaignStatsRequest extends FastifyRequest {
  Params: { id: string };
  Querystring: CampaignStatsQuery;
}

interface DuplicateCampaignRequest extends FastifyRequest {
  Body: DuplicateCampaignData;
}

interface ToggleStatusRequest extends FastifyRequest {
  Params: { id: string };
  Body: ToggleCampaignStatusData;
}

interface PerformanceRequest extends FastifyRequest {
  Params: { id: string };
  Querystring: CampaignPerformanceQuery;
}

// ==================== HANDLERS PRINCIPAIS ====================

/**
 * Handler para criar nova campanha
 */
export const createCampaignHandler = async (
  request: CreateCampaignRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const campaign = await createCampaign(request.body, request.user!.id);

    console.log(`[CAMPAIGN_CONTROLLER] Campanha criada: ${campaign.title} por ${request.user.email}`);

    return reply.code(201).send({
      success: true,
      message: 'Campanha criada com sucesso',
      data: { campaign },
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao criar campanha:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao criar campanha';

    if (error instanceof Error) {
      if (error.message.includes('Data de início') || 
          error.message.includes('inválidas') ||
          error.message.includes('anterior')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao criar campanha',
      message: errorMessage,
    });
  }
};

/**
 * Handler para buscar campanha por ID
 */
export const getCampaignHandler = async (
  request: CampaignParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    
    const campaign = await getCampaignById(id);

    if (!campaign) {
      return reply.code(404).send({
        success: false,
        error: 'Campanha não encontrada',
        message: 'A campanha solicitada não existe',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Campanha encontrada com sucesso',
      data: { campaign },
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao buscar campanha:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao buscar dados da campanha',
    });
  }
};

/**
 * Handler para listar campanhas com filtros
 */
export const listCampaignsHandler = async (
  request: ListCampaignsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    let filters = request.query;
    
    // Se for vendedor, filtra campanhas que participa
    if (request.user?.role === UserRole.VENDEDOR) {
      filters = { ...filters, userId: request.user.id };
    }
    
    // Se for gerente, pode ver todas mas com foco na sua equipe
    if (request.user?.role === UserRole.GERENTE && !filters.userId) {
      // Gerente pode ver todas as campanhas disponíveis
    }

    const result = await listCampaigns(filters);

    return reply.code(200).send({
      success: true,
      message: 'Campanhas listadas com sucesso',
      data: result.data,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao listar campanhas:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao listar campanhas',
    });
  }
};

/**
 * Handler para obter detalhes da campanha com progresso do usuário
 */
export const getCampaignDetailsHandler = async (
  request: CampaignDetailsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver detalhes da campanha',
      });
    }

    const { id } = request.params;
    
    if (request.user.role === UserRole.VENDEDOR) {
      // Vendedor vê seus próprios dados na campanha
      const result = await getCampaignDetailsWithUserProgress(id, request.user.id);
      
      return reply.code(200).send({
        success: true,
        message: 'Detalhes da campanha obtidos com sucesso',
        data: result,
      });
      
    } else if (request.user.role === UserRole.GERENTE) {
      // Gerente vê dados da sua equipe na campanha
      const campaigns = await getCampaignsForManager(request.user.id);
      const targetCampaign = campaigns.find(c => c.id === id);
      
      if (!targetCampaign) {
        // Se não encontrou na lista da equipe, busca campanha geral
        const campaign = await getCampaignById(id);
        
        return reply.code(200).send({
          success: true,
          message: 'Detalhes da campanha obtidos',
          data: { campaign, teamParticipation: null },
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Detalhes da campanha com dados da equipe',
        data: { 
          campaign: targetCampaign,
          teamProgress: targetCampaign.teamProgress,
          participants: targetCampaign.participants
        },
      });
      
    } else if (request.user.role === UserRole.ADMIN) {
      // Admin vê todos os dados e estatísticas completas
      const campaign = await getCampaignById(id);
      
      if (!campaign) {
        return reply.code(404).send({
          success: false,
          error: 'Campanha não encontrada',
          message: 'A campanha solicitada não existe',
        });
      }
      
      const stats = await getCampaignStats(id);
      
      return reply.code(200).send({
        success: true,
        message: 'Detalhes administrativos da campanha obtidos',
        data: { 
          campaign, 
          stats,
          adminView: true
        },
      });
    }

    return reply.code(403).send({
      success: false,
      error: 'Acesso negado',
      message: 'Tipo de usuário não reconhecido',
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao obter detalhes da campanha:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: errorMessage,
    });
  }
};

/**
 * Handler para atualizar campanha
 */
export const updateCampaignHandler = async (
  request: UpdateCampaignRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem editar campanhas',
      });
    }

    const { id } = request.params;
    
    const updatedCampaign = await updateCampaign(id, request.body);

    console.log(`[CAMPAIGN_CONTROLLER] Campanha atualizada: ${updatedCampaign.title} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Campanha atualizada com sucesso',
      data: { campaign: updatedCampaign },
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao atualizar campanha:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao atualizar campanha';

    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') || 
                 error.message.includes('já foi iniciada') ||
                 error.message.includes('já terminou')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao atualizar campanha',
      message: errorMessage,
    });
  }
};

/**
 * Handler para excluir campanha
 */
export const deleteCampaignHandler = async (
  request: CampaignParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem excluir campanhas',
      });
    }

    const { id } = request.params;
    
    await deleteCampaign(id);

    console.log(`[CAMPAIGN_CONTROLLER] Campanha excluída: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Campanha excluída com sucesso',
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao excluir campanha:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao excluir campanha';

    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') || 
                 error.message.includes('com participantes')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao excluir campanha',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter estatísticas da campanha
 */
export const getCampaignStatsHandler = async (
  request: CampaignStatsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Vendedores não podem acessar estatísticas detalhadas',
      });
    }

    const { id } = request.params;
    
    const stats = await getCampaignStats(id);

    return reply.code(200).send({
      success: true,
      message: 'Estatísticas da campanha obtidas com sucesso',
      data: { stats },
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao obter estatísticas:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao obter estatísticas da campanha',
    });
  }
};

/**
 * Handler para obter campanhas ativas para usuário
 */
export const getActiveCampaignsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver campanhas ativas',
      });
    }

    let campaigns;

    if (request.user.role === UserRole.VENDEDOR) {
      campaigns = await getActiveCampaignsForUser(request.user.id);
    } else if (request.user.role === UserRole.GERENTE) {
      campaigns = await getCampaignsForManager(request.user.id);
    } else {
      // Admin vê todas as campanhas ativas
      campaigns = await listCampaigns({ 
        activeOnly: true, 
        page: 1, 
        limit: 50,
        sort: 'startDate',
        order: 'desc'
      });
      campaigns = campaigns.data;
    }

    return reply.code(200).send({
      success: true,
      message: 'Campanhas ativas obtidas com sucesso',
      data: { campaigns },
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao obter campanhas ativas:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao obter campanhas ativas',
    });
  }
};

/**
 * Handler para duplicar campanha
 */
export const duplicateCampaignHandler = async (
  request: DuplicateCampaignRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const newCampaign = await duplicateCampaign(request.body, request.user!.id);

    console.log(`[CAMPAIGN_CONTROLLER] Campanha duplicada: ${originalCampaign.title} → ${newTitle} por ${request.user.email}`);

    return reply.code(201).send({
      success: true,
      message: 'Campanha duplicada com sucesso',
      data: { 
        campaign: newCampaign,
        originalCampaignId: campaignId
      },
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao duplicar campanha:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';

    return reply.code(400).send({
      success: false,
      error: 'Erro ao duplicar campanha',
      message: errorMessage,
    });
  }
};

/**
 * Handler para alterar status da campanha
 */
export const toggleCampaignStatusHandler = async (
  request: ToggleStatusRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem alterar status de campanhas',
      });
    }

    const { id } = request.params;
    
    await toggleCampaignStatus(id, request.body);

    console.log(`[CAMPAIGN_CONTROLLER] Status da campanha alterado: ${id} → ${request.body.status} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Status da campanha alterado com sucesso',
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao alterar status:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao alterar status';

    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao alterar status',
      message: errorMessage,
    });
  }
};

/**
 * Handler para verificar se usuário pode participar da campanha
 */
export const checkParticipationHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
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
    
    const result = await canUserParticipateInCampaign(id, request.user.id);

    return reply.code(200).send({
      success: result.canParticipate,
      message: result.canParticipate ? 
        'Usuário pode participar da campanha' : 
        result.reason || 'Não é possível participar',
      data: {
        campaignId: id,
        userId: request.user.id,
        canParticipate: result.canParticipate,
        reason: result.reason,
      },
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao verificar participação:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao verificar possibilidade de participação',
    });
  }
};

/**
 * Handler para obter relatório de performance da campanha
 */
export const getCampaignPerformanceHandler = async (
  request: PerformanceRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver relatório de performance',
      });
    }

    const { id } = request.params;
    const { groupBy, includeDetails, format } = request.query;

    // Busca estatísticas básicas
    const stats = await getCampaignStats(id);
    
    // Aqui seria implementado o sistema completo de relatórios
    // Por agora, retorna as estatísticas disponíveis
    const performanceData = {
      campaignId: id,
      groupBy: groupBy || 'day',
      period: {
        generated: new Date().toISOString(),
        requestedBy: request.user.email,
      },
      summary: {
        totalParticipants: stats.totalParticipants,
        activeKits: stats.activeKits,
        completedKits: stats.completedKits,
        totalSubmissions: stats.totalSubmissions,
        validatedSubmissions: stats.validatedSubmissions,
        averageProgress: stats.averageProgress,
        completionRate: stats.totalParticipants > 0 ? 
          Math.round((stats.completedKits / stats.totalParticipants) * 100) : 0,
      },
      topPerformers: stats.topPerformers,
    };

    const responseFormat = format || 'json';

    if (responseFormat === 'csv' || responseFormat === 'excel') {
      // Implementar exportação para CSV/Excel quando necessário
      return reply.code(501).send({
        success: false,
        error: 'Formato não implementado',
        message: `Exportação em ${responseFormat} será implementada em versão futura`,
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Relatório de performance gerado com sucesso',
      data: performanceData,
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro ao gerar relatório:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao gerar relatório de performance',
    });
  }
};

/**
 * Handler para atualizar campanhas expiradas (manutenção)
 */
export const updateExpiredCampaignsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem executar manutenção',
      });
    }

    const updatedCount = await updateExpiredCampaigns();

    console.log(`[CAMPAIGN_CONTROLLER] Manutenção executada: ${updatedCount} campanhas expiradas por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Manutenção executada com sucesso',
      data: {
        updatedCampaigns: updatedCount,
        executedAt: new Date().toISOString(),
        executedBy: request.user.email,
      },
    });

  } catch (error) {
    console.error('[CAMPAIGN_CONTROLLER] Erro na manutenção:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao executar manutenção de campanhas',
    });
  }
};
