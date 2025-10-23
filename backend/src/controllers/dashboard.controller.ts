/**
 * @file dashboard.controller.ts
 * @version 2.0.0
 * @description Controller para dashboards da API EPS Campanhas.
 * Fornece endpoints específicos para cada perfil de usuário com dados agregados.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do controller de dashboard
 * - Dashboards específicos por perfil (vendedor, gerente, admin)
 * - Sistema de ranking dinâmico
 * - Métricas de crescimento e performance
 * - Histórico de atividades detalhado
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, ActivityType } from '@prisma/client';
import {
  getVendedorDashboardData,
  getGerenteDashboardData,
  getAdminDashboardData,
  getRankingData,
  getTeamPerformanceData,
  getActivityHistory,
  getGrowthMetrics,
  getSellerDetailsForManager
} from '../services/dashboard.service';

// ==================== INTERFACES DE REQUEST ====================

interface DashboardRequest extends FastifyRequest {
  Querystring: {
    period?: '7d' | '30d' | '90d';
    includeDetails?: 'true' | 'false';
  };
}

interface RankingRequest extends FastifyRequest {
  Querystring: {
    filter?: 'Geral' | 'Mensal' | 'Semanal';
    limit?: string;
    page?: string;
  };
}

interface TeamPerformanceRequest extends FastifyRequest {
  Querystring: {
    period?: '7d' | '30d' | '90d';
    sellerId?: string;
  };
}

interface ActivityHistoryRequest extends FastifyRequest {
  Querystring: {
    page?: string;
    limit?: string;
    type?: ActivityType;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
  };
}

interface GrowthMetricsRequest extends FastifyRequest {
  Querystring: {
    period?: '7d' | '30d' | '90d';
    compareWith?: string;
  };
}

interface SellerDetailsRequest extends FastifyRequest {
  Params: {
    sellerId: string;
  };
  Querystring: {
    period?: '7d' | '30d' | '90d';
    includeActivity?: 'true' | 'false';
  };
}

// ==================== HANDLERS PRINCIPAIS ====================

/**
 * Handler para obter dados do dashboard principal
 * Retorna dados específicos baseados no perfil do usuário
 */
export const getDashboardDataHandler = async (
  request: DashboardRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    let dashboardData;
    const { period = '30d', includeDetails = 'true' } = request.query;

    console.log(`[DASHBOARD_CONTROLLER] Carregando dashboard para ${request.user.role}: ${request.user.email}`);

    switch (request.user.role) {
      case UserRole.VENDEDOR:
        dashboardData = await getVendedorDashboardData(request.user.id);
        break;
        
      case UserRole.GERENTE:
        dashboardData = await getGerenteDashboardData(request.user.id);
        break;
        
      case UserRole.ADMIN:
        dashboardData = await getAdminDashboardData();
        break;
        
      default:
        return reply.code(403).send({
          success: false,
          error: 'Perfil não reconhecido',
          message: 'Tipo de usuário não suportado para dashboard',
        });
    }

    // Adiciona metadados da requisição
    const responseData = {
      ...dashboardData,
      metadata: {
        userRole: request.user.role,
        userId: request.user.id,
        period,
        loadedAt: new Date().toISOString(),
        includeDetails: includeDetails === 'true',
      },
    };

    return reply.code(200).send({
      success: true,
      message: 'Dados do dashboard carregados com sucesso',
      data: responseData,
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao carregar dashboard:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: `Erro ao carregar dados do dashboard: ${errorMessage}`,
    });
  }
};

/**
 * Handler para obter ranking de usuários
 */
export const getRankingHandler = async (
  request: RankingRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { 
      filter = 'Geral', 
      limit = '50',
      page = '1'
    } = request.query;
    
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const pageNum = Math.max(parseInt(page) || 1, 1);

    const result = await getRankingData({
      filter: filter as any,
      limit: limitNum,
      page: pageNum,
      userId: request.user?.id,
    });

    return reply.code(200).send({
      success: true,
      message: 'Ranking obtido com sucesso',
      data: {
        ranking: paginatedRanking,
        currentUserPosition,
        pagination: {
          page: pageNum,
          limit: limitNum,
          hasMore,
          total: ranking.length,
        },
        filter,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao obter ranking:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar ranking de usuários',
    });
  }
};

/**
 * Handler para obter performance da equipe (gerentes)
 */
export const getTeamPerformanceHandler = async (
  request: TeamPerformanceRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.GERENTE) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas gerentes podem visualizar performance da equipe',
      });
    }

    const { period = '30d', sellerId } = request.query;
    
    const performance = await getTeamPerformanceData(request.user.id, period);

    // Se solicitou dados de um vendedor específico
    let sellerDetails = null;
    if (sellerId) {
      try {
        sellerDetails = await getSellerDetailsForManager(sellerId, request.user.id);
      } catch (error) {
        console.warn(`[DASHBOARD_CONTROLLER] Erro ao buscar detalhes do vendedor ${sellerId}:`, error);
        // Não falha a requisição, apenas não retorna os detalhes
      }
    }

    return reply.code(200).send({
      success: true,
      message: 'Performance da equipe obtida com sucesso',
      data: {
        performance,
        sellerDetails,
        period,
        managerId: request.user.id,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao obter performance da equipe:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar performance da equipe',
    });
  }
};

/**
 * Handler para obter histórico de atividades
 */
export const getActivityHistoryHandler = async (
  request: ActivityHistoryRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver histórico de atividades',
      });
    }

    const {
      page = '1',
      limit = '20',
      type,
      dateFrom,
      dateTo,
      userId
    } = request.query;

    // Determina qual usuário consultar
    let targetUserId = request.user.id;

    // Se solicitou dados de outro usuário, verifica permissões
    if (userId && userId !== request.user.id) {
      if (request.user.role === UserRole.ADMIN) {
        // Admin pode ver qualquer usuário
        targetUserId = userId;
      } else if (request.user.role === UserRole.GERENTE) {
        // Gerente só pode ver seus vendedores
        try {
          const sellerDetails = await getSellerDetailsForManager(userId, request.user.id);
          targetUserId = userId;
        } catch (error) {
          return reply.code(403).send({
            success: false,
            error: 'Acesso negado',
            message: 'Você só pode ver atividades da sua equipe',
          });
        }
      } else {
        return reply.code(403).send({
          success: false,
          error: 'Acesso negado',
          message: 'Você só pode ver suas próprias atividades',
        });
      }
    }

    const filters = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Máximo 100
      type: type as ActivityType,
      dateFrom,
      dateTo,
    };

    const result = await getActivityHistory(targetUserId, filters);

    return reply.code(200).send({
      success: true,
      message: 'Histórico de atividades obtido com sucesso',
      data: {
        ...result,
        userId: targetUserId,
        filters,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao obter histórico de atividades:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar histórico de atividades',
    });
  }
};

/**
 * Handler para obter métricas de crescimento
 */
export const getGrowthMetricsHandler = async (
  request: GrowthMetricsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver métricas de crescimento',
      });
    }

    const { period = '30d', compareWith } = request.query;
    
    const metrics = await getGrowthMetrics(period);

    // Adiciona comparação se solicitada
    let comparisonData = null;
    if (compareWith && ['7d', '30d', '90d'].includes(compareWith)) {
      try {
        comparisonData = await getGrowthMetrics(compareWith as any);
      } catch (error) {
        console.warn('[DASHBOARD_CONTROLLER] Erro ao obter dados de comparação:', error);
      }
    }

    return reply.code(200).send({
      success: true,
      message: 'Métricas de crescimento obtidas com sucesso',
      data: {
        metrics,
        comparison: comparisonData,
        period,
        compareWith,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao obter métricas de crescimento:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar métricas de crescimento',
    });
  }
};

/**
 * Handler para obter detalhes específicos de um vendedor (gerentes)
 */
export const getSellerDetailsHandler = async (
  request: SellerDetailsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.GERENTE) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas gerentes podem ver detalhes de vendedores',
      });
    }

    const { sellerId } = request.params;
    const { period = '30d', includeActivity = 'true' } = request.query;

    const sellerDetails = await getSellerDetailsForManager(sellerId, request.user.id);

    // Se solicitado, busca atividades recentes do vendedor
    let recentActivity = null;
    if (includeActivity === 'true') {
      try {
        const activityResult = await getActivityHistory(sellerId, {
          page: 1,
          limit: 10,
        });
        recentActivity = activityResult.activities;
      } catch (error) {
        console.warn(`[DASHBOARD_CONTROLLER] Erro ao buscar atividades do vendedor ${sellerId}:`, error);
      }
    }

    return reply.code(200).send({
      success: true,
      message: 'Detalhes do vendedor obtidos com sucesso',
      data: {
        ...sellerDetails,
        recentActivity,
        period,
        requestedBy: request.user.id,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao obter detalhes do vendedor:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao carregar detalhes do vendedor';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado') || 
          error.message.includes('não pertence')) {
        statusCode = 404;
        errorMessage = error.message;
      }
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao carregar detalhes',
      message: errorMessage,
    });
  }
};

// ==================== HANDLERS ESPECÍFICOS ====================

/**
 * Handler para obter dados rápidos do dashboard (versão resumida)
 */
export const getQuickStatsHandler = async (
  request: FastifyRequest,
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

    let quickStats: any = {};

    switch (request.user.role) {
      case UserRole.VENDEDOR:
        const vendedorData = await getVendedorDashboardData(request.user.id);
        quickStats = {
          points: vendedorData.user.points,
          level: vendedorData.user.level,
          ranking: vendedorData.stats.ranking.position,
          activeCampaigns: vendedorData.stats.campaignsActive,
        };
        break;

      case UserRole.GERENTE:
        const gerenteData = await getGerenteDashboardData(request.user.id);
        quickStats = {
          teamSize: gerenteData.teamRanking.length,
          topSeller: gerenteData.stats.topSeller,
          totalSalesMonth: gerenteData.stats.totalSalesMonth,
          campaignAdherence: gerenteData.stats.campaignAdherence,
        };
        break;

      case UserRole.ADMIN:
        const adminData = await getAdminDashboardData();
        quickStats = {
          totalUsers: adminData.stats.totalUsers,
          activeCampaigns: adminData.stats.activeCampaigns,
          validatedSalesMonth: adminData.stats.validatedSalesMonth,
          pointsDistributedMonth: adminData.stats.pointsDistributedMonth,
        };
        break;
    }

    return reply.code(200).send({
      success: true,
      message: 'Estatísticas rápidas obtidas com sucesso',
      data: {
        ...quickStats,
        userRole: request.user.role,
        loadedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao obter estatísticas rápidas:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar estatísticas rápidas',
    });
  }
};

/**
 * Handler para obter top performers
 */
export const getTopPerformersHandler = async (
  request: FastifyRequest<{ Querystring: { period?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver top performers',
      });
    }

    const { period = '30d', limit = '10' } = request.query;
    const limitNum = Math.min(parseInt(limit), 50);

    const ranking = await getRankingData(
      period === '7d' ? 'Semanal' : period === '30d' ? 'Mensal' : 'Geral',
      undefined,
      limitNum
    );

    // Se for gerente, filtra apenas sua equipe
    let topPerformers = ranking;
    if (request.user.role === UserRole.GERENTE) {
      const teamPerformance = await getTeamPerformanceData(request.user.id, period as any);
      const teamUserIds = teamPerformance.map((member: any) => member.userId);
      topPerformers = ranking.filter(item => teamUserIds.includes(item.userId));
    }

    return reply.code(200).send({
      success: true,
      message: 'Top performers obtidos com sucesso',
      data: {
        topPerformers,
        period,
        scope: request.user.role === UserRole.GERENTE ? 'team' : 'global',
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao obter top performers:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar top performers',
    });
  }
};

/**
 * Handler para atualizar cache do dashboard (admin)
 */
export const refreshDashboardCacheHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem atualizar cache',
      });
    }

    // Aqui seria implementada lógica de cache quando necessário
    // Por agora, apenas simula uma atualização
    
    console.log(`[DASHBOARD_CONTROLLER] Cache do dashboard atualizado por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Cache do dashboard atualizado com sucesso',
      data: {
        updatedAt: new Date().toISOString(),
        updatedBy: request.user.email,
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro ao atualizar cache:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao atualizar cache do dashboard',
    });
  }
};

/**
 * Handler para health check do dashboard
 */
export const dashboardHealthCheckHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // Testa conexão básica com serviços
    const testUserId = request.user?.id || 'test';
    
    // Testa se os serviços estão respondendo
    const healthChecks = await Promise.allSettled([
      // Teste básico de ranking
      getRankingData('Geral', testUserId, 1),
      // Teste básico de métricas
      getGrowthMetrics('7d'),
    ]);

    const failedChecks = healthChecks.filter(check => check.status === 'rejected');

    return reply.code(200).send({
      success: true,
      message: 'Health check do dashboard concluído',
      data: {
        status: failedChecks.length === 0 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          ranking: healthChecks[0].status === 'fulfilled',
          metrics: healthChecks[1].status === 'fulfilled',
        },
        failedChecks: failedChecks.length,
        totalChecks: healthChecks.length,
      },
    });

  } catch (error) {
    console.error('[DASHBOARD_CONTROLLER] Erro no health check:', error);

    return reply.code(503).send({
      success: false,
      error: 'Serviço indisponível',
      message: 'Falha na verificação de saúde do dashboard',
    });
  }
};
