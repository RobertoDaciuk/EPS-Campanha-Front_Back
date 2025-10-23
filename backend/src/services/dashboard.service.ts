/**
 * @file dashboard.service.ts
 * @version 2.0.1
 * @description Serviços para dados dos dashboards do sistema EPS Campanhas.
 * Fornece dados agregados e estatísticas para vendedores, gerentes e administradores.
 * @author DevEPS
 * @since 2025-10-21
 *
 * @changelog
 * - 2.0.1 (2025-10-22):
 * - CORRIGIDO: Erro de divisão por zero em 'getGrowthMetrics'.
 * Adicionada verificação para evitar divisão por zero ao calcular
 * 'usersChange', 'campaignsChange', 'submissionsChange'. Retorna 'null' se o valor anterior for 0.
 */

import { prisma, prismaUtils } from '../../lib/prismaClient';
import {
  UserRole,
  UserStatus,
  CampaignStatus,
  CampaignKitStatus,
  CampaignSubmissionStatus,
  ActivityType,
  EarningStatus
} from '@prisma/client';
import { calculateKitProgress } from './campaign.service'; // Importa se necessário

// ==================== INTERFACES PARA DASHBOARDS ====================

// (Interfaces VendedorDashboardData, GerenteDashboardData, AdminDashboardData, RankingEntry, TeamPerformanceData, ActivityHistoryItem, GrowthMetricsData permanecem as mesmas)
// --- INÍCIO DAS INTERFACES (mantidas para contexto) ---
/**
 * Interface para dados do dashboard do vendedor
 */
interface VendedorDashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    level: string; // Ex: 'Bronze', 'Prata', 'Ouro'
    points: number;
    pointsToNextLevel: number; // Pontos faltando para o próximo nível
    opticName: string;
  };
  stats: {
    points: { // Pontos acumulados no período
      value: number;
      change: number; // Variação % vs período anterior
      period: string; // '7d', '30d', '90d'
    };
    sales: { // Vendas validadas no período
      value: number;
      change: number;
      period: string;
    };
    ranking: { // Posição no ranking geral
      position: number;
      total: number;
    };
    kitsCompleted: { // Kits completados no período
      value: number;
      change: number;
      period: string;
    };
  };
  activeCampaigns: Array<{
    id: string;
    title: string;
    endDate: string;
    progress: number; // Progresso do vendedor nesta campanha (%)
    imageUrl: string;
    pointsOnCompletion: number | null;
  }>;
  recentActivity: Array<{
    id: string;
    type: ActivityType;
    description: string;
    timestamp: string;
    points?: number;
    value?: number; // Para vendas
  }>;
}

/**
 * Interface para dados do dashboard do gerente
 */
interface GerenteDashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    opticName: string;
  };
  stats: {
    teamSize: number;
    activeSellers: number; // Vendedores com atividade recente
    teamSales: { // Vendas totais da equipe no período
      value: number;
      change: number;
      period: string;
    };
    teamPoints: { // Pontos totais da equipe no período
      value: number;
      change: number;
      period: string;
    };
    pendingSubmissions: number; // Submissões aguardando validação do gerente
    activeCampaigns: number; // Campanhas ativas para a equipe
  };
  teamPerformance: Array<{ // Top/Bottom vendedores
    id: string;
    name: string;
    avatarUrl: string;
    sales: number;
    points: number;
    progress: number; // Média de progresso em campanhas ativas
  }>;
  campaignProgress: Array<{ // Progresso médio da equipe nas campanhas ativas
    id: string;
    title: string;
    endDate: string;
    teamProgress: number; // Média de progresso da equipe (%)
    participants: number; // Quantos vendedores da equipe estão participando
  }>;
  recentActivity: Array<{ // Atividades relevantes da equipe
    id: string;
    type: ActivityType;
    description: string; // Ex: 'Vendedor X completou Kit Y'
    timestamp: string;
    userId?: string; // ID do vendedor relacionado
    userName?: string; // Nome do vendedor
  }>;
}

/**
 * Interface para dados do dashboard do administrador
 */
interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalOptics: number;
    totalCampaigns: {
      active: number;
      inactive: number;
    };
    totalSubmissions: { // No período
      pending: number;
      validated: number;
      rejected: number;
      period: string;
    };
    totalEarnings: { // No período
      paid: number; // Valor em R$
      pending: number; // Valor em R$
      period: string;
    };
    systemHealth: { // Simplificado
      database: 'connected' | 'disconnected';
      // Outros serviços?
    };
  };
  growthMetrics: { // No período vs período anterior
    users: { current: number; change: number | null }; // Variação %
    campaigns: { current: number; change: number | null };
    submissions: { current: number; change: number | null };
    period: string;
  };
  recentActivities: Array<{ // Atividades importantes do sistema
    id: string;
    type: ActivityType;
    description: string; // Ex: 'Campanha X iniciada', 'Usuário Y criado'
    timestamp: string;
    targetId?: string; // ID do objeto relacionado (campanha, usuário)
  }>;
  pendingActions: { // Ações que requerem atenção do admin
    campaignsToReview: number; // Campanhas próximas do fim ou com problemas
    highValueEarningsPending: number; // Ganhos > X aguardando pagamento
    systemAlerts: number; // Ex: falha em job, etc.
  };
}

/**
 * Interface para entrada no ranking
 */
interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string;
  opticName: string;
  points: number;
  sales: number; // Vendas no período do filtro
  progress?: number; // Progresso médio em campanhas
}

/**
 * Interface para performance da equipe (visão do gerente)
 */
interface TeamPerformanceData {
  sellerId: string;
  name: string;
  avatarUrl: string;
  sales: number;
  points: number;
  kitsCompleted: number;
  averageProgress: number; // Média de progresso nas campanhas ativas (%)
}

/**
 * Interface para item de histórico de atividades
 */
interface ActivityHistoryItem {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  points?: number;
  value?: number;
  relatedUser?: { id: string; name: string };
  relatedCampaign?: { id: string; title: string };
}

/**
 * Interface para métricas de crescimento (visão do admin)
 */
interface GrowthMetricsData {
  period: string;
  users: { current: number; previous: number; change: number | null };
  campaigns: { current: number; previous: number; change: number | null };
  submissions: { current: number; previous: number; change: number | null };
}

// --- FIM DAS INTERFACES ---

// ==================== FUNÇÕES PRINCIPAIS POR PERFIL ====================

/**
 * Obtém dados para o dashboard do Vendedor
 * @param sellerId ID do vendedor logado
 * @param period Período para estatísticas ('7d', '30d', '90d')
 */
export const getVendedorDashboardData = async (
  sellerId: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<VendedorDashboardData> => {
  try {
    const { startDate, endDate, previousStartDate, previousEndDate } = prismaUtils.calculateDateRanges(period);

    // Busca dados do vendedor e estatísticas concorrentemente
    const [
      seller,
      statsCurrent,
      statsPrevious,
      activeCampaignsRaw,
      recentActivity
    ] = await prisma.$transaction([
      // Dados do usuário
      prisma.user.findUniqueOrThrow({
        where: { id: sellerId },
        select: {
          id: true, name: true, email: true, avatarUrl: true, level: true, points: true, opticName: true
        }
      }),
      // Estatísticas do período atual
      prisma.campaignSubmission.aggregate({
        where: { userId: sellerId, status: CampaignSubmissionStatus.VALIDATED, validatedAt: { gte: startDate, lte: endDate } },
        _count: { id: true },
        _sum: { value: true }
      }),
      // Estatísticas do período anterior
      prisma.campaignSubmission.aggregate({
        where: { userId: sellerId, status: CampaignSubmissionStatus.VALIDATED, validatedAt: { gte: previousStartDate, lte: previousEndDate } },
        _count: { id: true },
        _sum: { value: true }
      }),
      // Campanhas ativas com progresso
      prisma.campaign.findMany({
        where: { status: CampaignStatus.ACTIVE, endDate: { gte: new Date() } },
        select: {
          id: true, title: true, endDate: true, imageUrl: true, pointsOnCompletion: true,
          goalRequirements: true, // Necessário para calcular progresso
          campaignKits: {
            where: { userId: sellerId },
            select: { status: true, progress: true, submissions: true } // Submissions para cálculo preciso
          }
        }
      }),
      // Atividades recentes
      prisma.activityItem.findMany({
        where: { userId: sellerId },
        take: 10,
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Calcula progresso nas campanhas ativas
    const activeCampaigns = activeCampaignsRaw.map(campaign => {
      const kit = campaign.campaignKits[0]; // Vendedor só tem 1 kit por campanha
      let progress = 0;
      if (kit) {
        // Usa a função de cálculo de progresso do campaign.service
        // (Certifique-se que ela está disponível aqui ou mova/importe)
        const progressResult = calculateKitProgress(kit, campaign.goalRequirements);
        progress = progressResult.overallProgress;
      }
      return {
        id: campaign.id,
        title: campaign.title,
        endDate: campaign.endDate.toISOString(),
        progress: progress,
        imageUrl: campaign.imageUrl,
        pointsOnCompletion: campaign.pointsOnCompletion
      };
    });

    // Calcula variações percentuais
    const salesChange = prismaUtils.calculatePercentageChange(statsCurrent._sum.value, statsPrevious._sum.value);
    const pointsChange = 0; // Precisa buscar pontos de ActivityItem ou recalcular
    const kitsCompletedChange = 0; // Precisa buscar kits completados

    // Ranking (simplificado, idealmente uma query separada e otimizada)
    const allSellersPoints = await prisma.user.findMany({
        where: { role: UserRole.VENDEDOR, status: UserStatus.ACTIVE },
        select: { id: true, points: true },
        orderBy: { points: 'desc' }
    });
    const rank = allSellersPoints.findIndex(u => u.id === sellerId) + 1;

    return {
      user: {
        ...seller,
        avatarUrl: seller.avatarUrl || '', // Garante que não seja null
        pointsToNextLevel: 500 // Exemplo, lógica de níveis precisa ser implementada
      },
      stats: {
        points: { value: seller.points, change: pointsChange, period },
        sales: { value: statsCurrent._sum.value || 0, change: salesChange, period },
        ranking: { position: rank > 0 ? rank : 0, total: allSellersPoints.length },
        kitsCompleted: { value: 0, change: kitsCompletedChange, period } // Precisa implementar
      },
      activeCampaigns,
      recentActivity: recentActivity.map(act => ({
        id: act.id,
        type: act.type,
        description: act.description,
        timestamp: act.timestamp.toISOString(),
        points: act.points || undefined,
        value: act.value || undefined
      }))
    };

  } catch (error) {
    console.error(`[DASHBOARD_SERVICE] Erro ao buscar dados do vendedor ${sellerId}:`, error);
    throw new Error('Falha ao carregar dados do dashboard do vendedor.');
  }
};


/**
 * Obtém dados para o dashboard do Gerente
 * @param managerId ID do gerente logado
 * @param period Período para estatísticas ('7d', '30d', '90d')
 */
export const getGerenteDashboardData = async (
    managerId: string,
    period: '7d' | '30d' | '90d' = '30d'
): Promise<GerenteDashboardData> => {
    try {
        const { startDate, endDate, previousStartDate, previousEndDate } = prismaUtils.calculateDateRanges(period);

        // Busca dados do gerente e da equipe
        const manager = await prisma.user.findUniqueOrThrow({
            where: { id: managerId },
            select: {
                id: true, name: true, email: true, avatarUrl: true, opticName: true,
                managedUsers: { // Busca vendedores gerenciados
                    where: { status: UserStatus.ACTIVE },
                    select: { id: true, name: true, avatarUrl: true }
                }
            }
        });

        const sellerIds = manager.managedUsers.map(seller => seller.id);

        // Busca estatísticas agregadas da equipe e ações pendentes
        const [
            teamStatsCurrent,
            teamStatsPrevious,
            pendingSubmissions,
            activeCampaignsRaw,
            recentTeamActivity
        ] = await prisma.$transaction([
            // Vendas e Pontos (período atual)
            prisma.campaignSubmission.aggregate({
                where: { userId: { in: sellerIds }, status: CampaignSubmissionStatus.VALIDATED, validatedAt: { gte: startDate, lte: endDate } },
                _count: { id: true },
                _sum: { value: true }
            }),
            // Vendas e Pontos (período anterior)
            prisma.campaignSubmission.aggregate({
                where: { userId: { in: sellerIds }, status: CampaignSubmissionStatus.VALIDATED, validatedAt: { gte: previousStartDate, lte: previousEndDate } },
                _sum: { value: true }
            }),
            // Submissões pendentes de validação
            prisma.campaignSubmission.count({
                where: { managerId: managerId, status: CampaignSubmissionStatus.PENDING }
            }),
            // Campanhas ativas (para calcular progresso médio)
            prisma.campaign.findMany({
                where: { status: CampaignStatus.ACTIVE, endDate: { gte: new Date() } },
                select: {
                    id: true, title: true, endDate: true, goalRequirements: true,
                    campaignKits: { // Kits apenas dos vendedores da equipe
                        where: { userId: { in: sellerIds } },
                        select: { userId: true, progress: true, submissions: true, user: { select: { id: true, name: true} } } // Inclui user para atividades
                    }
                }
            }),
            // Atividades recentes da equipe
             prisma.activityItem.findMany({
                where: { userId: { in: sellerIds } }, // Atividades dos vendedores
                take: 15,
                orderBy: { timestamp: 'desc' },
                include: { user: { select: { name: true } } } // Inclui nome do usuário
            })
        ]);

        // Calcula performance individual para ranking interno da equipe
        const teamPerformance = await getTeamPerformanceData(sellerIds, period);

        // Calcula progresso médio da equipe por campanha
        const campaignProgress = activeCampaignsRaw.map(campaign => {
            const teamKits = campaign.campaignKits;
            let totalProgress = 0;
            let participantCount = 0;
            const uniqueParticipants = new Set<string>();

             teamKits.forEach(kit => {
                 const { overallProgress } = calculateKitProgress(kit, campaign.goalRequirements);
                 totalProgress += overallProgress;
                 uniqueParticipants.add(kit.userId);
             });
             participantCount = uniqueParticipants.size;


            return {
                id: campaign.id,
                title: campaign.title,
                endDate: campaign.endDate.toISOString(),
                teamProgress: participantCount > 0 ? Math.round(totalProgress / participantCount) : 0,
                participants: participantCount
            };
        });

        // Calcula variações
        const teamSalesChange = prismaUtils.calculatePercentageChange(teamStatsCurrent._sum.value, teamStatsPrevious._sum.value);
        const teamPointsChange = 0; // Precisa implementar busca de pontos da equipe

        return {
            user: {
                id: manager.id,
                name: manager.name,
                email: manager.email,
                avatarUrl: manager.avatarUrl || '',
                opticName: manager.opticName
            },
            stats: {
                teamSize: sellerIds.length,
                activeSellers: teamPerformance.length, // Assumindo que getTeamPerformance só retorna ativos
                teamSales: { value: teamStatsCurrent._sum.value || 0, change: teamSalesChange, period },
                teamPoints: { value: 0, change: teamPointsChange, period }, // Implementar
                pendingSubmissions: pendingSubmissions,
                activeCampaigns: activeCampaignsRaw.length
            },
            teamPerformance: teamPerformance.slice(0, 5), // Top 5
            campaignProgress,
            recentActivity: recentTeamActivity.map(act => ({
                 id: act.id,
                 type: act.type,
                 description: act.description,
                 timestamp: act.timestamp.toISOString(),
                 userId: act.userId || undefined,
                 userName: act.user?.name || undefined
            }))
        };

    } catch (error) {
        console.error(`[DASHBOARD_SERVICE] Erro ao buscar dados do gerente ${managerId}:`, error);
        throw new Error('Falha ao carregar dados do dashboard do gerente.');
    }
};

/**
 * Obtém dados para o dashboard do Administrador
 * @param period Período para estatísticas ('7d', '30d', '90d')
 */
export const getAdminDashboardData = async (
  period: '7d' | '30d' | '90d' = '30d'
): Promise<AdminDashboardData> => {
  try {
    const { startDate, endDate } = prismaUtils.calculateDateRange(period);

    // Busca estatísticas gerais do sistema
    const [
      userCounts,
      opticCount,
      campaignCounts,
      submissionCounts,
      earningSums,
      recentActivitiesRaw,
      // Adicionar query para pendingActions se necessário
    ] = await prisma.$transaction([
      // Contagem de usuários por status
      prisma.user.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      // Contagem de óticas únicas
      prisma.user.count({
        where: { opticCNPJ: { not: null } },
        // distinct: ['opticCNPJ'] // Prisma não suporta distinct em count diretamente assim
      }), // Simplificado: conta usuários com CNPJ. Ideal: Tabela separada de Óticas.
      // Contagem de campanhas por status
      prisma.campaign.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      // Contagem de submissões no período por status
      prisma.campaignSubmission.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: { id: true }
      }),
      // Soma de ganhos no período por status
      prisma.earning.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _sum: { value: true }
      }),
      // Atividades recentes do sistema (ex: criação de campanha, usuário)
      prisma.activityItem.findMany({
        where: {
          // Filtrar por tipos de atividade relevantes para admin?
          type: { in: [ActivityType.CAMPAIGN_CREATED, ActivityType.USER_CREATED, ActivityType.SYSTEM_ALERT] }
        },
        take: 15,
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Calcula métricas de crescimento
    const growthMetrics = await getGrowthMetrics(period);

    // Formata os resultados das queries
    const totalUsers = userCounts.reduce((sum, group) => sum + group._count.id, 0);
    const activeCampaigns = campaignCounts.find(c => c.status === CampaignStatus.ACTIVE)?._count.id || 0;
    const inactiveCampaigns = campaignCounts.find(c => c.status === CampaignStatus.INACTIVE)?._count.id || 0;

    const pendingSubmissions = submissionCounts.find(s => s.status === CampaignSubmissionStatus.PENDING)?._count.id || 0;
    const validatedSubmissions = submissionCounts.find(s => s.status === CampaignSubmissionStatus.VALIDATED)?._count.id || 0;
    const rejectedSubmissions = submissionCounts.find(s => s.status === CampaignSubmissionStatus.REJECTED)?._count.id || 0;

    const paidEarnings = earningSums.find(e => e.status === EarningStatus.PAID)?._sum.value || 0;
    const pendingEarnings = earningSums.find(e => e.status === EarningStatus.PENDING)?._sum.value || 0;


    // Simula health check DB (idealmente feito em rota /health)
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        dbStatus = 'disconnected';
    }

    return {
      stats: {
        totalUsers,
        totalOptics: opticCount, // Ajustar se tiver tabela de óticas
        totalCampaigns: { active: activeCampaigns, inactive: inactiveCampaigns },
        totalSubmissions: { pending: pendingSubmissions, validated: validatedSubmissions, rejected: rejectedSubmissions, period },
        totalEarnings: { paid: paidEarnings, pending: pendingEarnings, period },
        systemHealth: { database: dbStatus }
      },
      growthMetrics: {
        users: { current: growthMetrics.users.current, change: growthMetrics.users.change },
        campaigns: { current: growthMetrics.campaigns.current, change: growthMetrics.campaigns.change },
        submissions: { current: growthMetrics.submissions.current, change: growthMetrics.submissions.change },
        period
      },
      recentActivities: recentActivitiesRaw.map(act => ({
        id: act.id,
        type: act.type,
        description: act.description,
        timestamp: act.timestamp.toISOString(),
        targetId: act.targetId || undefined
      })),
      pendingActions: { // Exemplo, necessita queries específicas
        campaignsToReview: 0,
        highValueEarningsPending: 0,
        systemAlerts: 0
      }
    };

  } catch (error) {
    console.error('[DASHBOARD_SERVICE] Erro ao buscar dados do admin:', error);
    throw new Error('Falha ao carregar dados do dashboard do administrador.');
  }
};


// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Obtém dados de ranking
 * @param filter 'Geral', 'Mensal', 'Semanal'
 * @param userId Opcional: ID do usuário para destacar no ranking
 * @param limit Opcional: Número de entradas a retornar
 */
export const getRankingData = async (
    filter: 'Geral' | 'Mensal' | 'Semanal' = 'Geral',
    userId?: string,
    limit: number = 10
): Promise<RankingEntry[]> => {
    try {
        let dateFilter = {};
        if (filter === 'Mensal') {
            const { startDate } = prismaUtils.calculateDateRange('30d'); // Aproximação mensal
            dateFilter = { gte: startDate };
        } else if (filter === 'Semanal') {
            const { startDate } = prismaUtils.calculateDateRange('7d');
            dateFilter = { gte: startDate };
        }

        // Query base para vendedores ativos
         const baseQuery = {
             where: { role: UserRole.VENDEDOR, status: UserStatus.ACTIVE },
             select: {
                 id: true, name: true, avatarUrl: true, opticName: true, points: true,
             },
             orderBy: { points: 'desc' as const }, // Ordena por pontos gerais sempre
             take: filter === 'Geral' ? limit : undefined // Limita apenas no geral por enquanto
         };

        // Busca vendedores ordenados por pontos gerais
        let rankedSellers = await prisma.user.findMany(baseQuery);

        // Se o filtro não for 'Geral', busca pontos/vendas do período
        if (filter !== 'Geral') {
             const sellerIds = rankedSellers.map(s => s.id);

            // Busca pontos ganhos no período
             const pointsPeriod = await prisma.activityItem.groupBy({
                 by: ['userId'],
                 where: { userId: { in: sellerIds }, timestamp: dateFilter, points: { gt: 0 } },
                 _sum: { points: true },
             });

            // Busca vendas validadas no período
             const salesPeriod = await prisma.campaignSubmission.groupBy({
                 by: ['userId'],
                 where: { userId: { in: sellerIds }, status: CampaignSubmissionStatus.VALIDATED, validatedAt: dateFilter },
                 _sum: { value: true },
                 _count: { id: true } // Contagem de vendas
             });

            // Mapeia os dados do período para os vendedores
             const pointsMap = new Map(pointsPeriod.map(p => [p.userId, p._sum.points || 0]));
             const salesMap = new Map(salesPeriod.map(s => [s.userId, { value: s._sum.value || 0, count: s._count.id || 0 }]));


            // Atualiza vendedores com dados do período e reordena
            rankedSellers = rankedSellers.map(seller => ({
                ...seller,
                pointsPeriod: pointsMap.get(seller.id) || 0,
                salesPeriodValue: salesMap.get(seller.id)?.value || 0,
                salesPeriodCount: salesMap.get(seller.id)?.count || 0,
            })).sort((a, b) => (b.pointsPeriod) - (a.pointsPeriod)); // Reordena por pontos do período

            // Aplica limite após reordenar
            rankedSellers = rankedSellers.slice(0, limit);
        }


        // Formata o resultado final
        return rankedSellers.map((seller, index) => ({
            rank: index + 1,
            userId: seller.id,
            name: seller.name,
            avatarUrl: seller.avatarUrl || '',
            opticName: seller.opticName,
            points: filter === 'Geral' ? seller.points : (seller as any).pointsPeriod, // Mostra pontos gerais ou do período
            sales: filter === 'Geral' ? 0 : (seller as any).salesPeriodValue, // Mostra vendas do período
            // progress: 0 // Progresso médio precisaria de outra query complexa
        }));

    } catch (error) {
        console.error(`[DASHBOARD_SERVICE] Erro ao buscar ranking (${filter}):`, error);
        throw new Error('Falha ao carregar dados do ranking.');
    }
};

/**
 * Obtém dados de performance da equipe para o Gerente
 * @param sellerIds Lista de IDs dos vendedores da equipe
 * @param period Período para agregação
 */
export const getTeamPerformanceData = async (
    sellerIds: string[],
    period: '7d' | '30d' | '90d' = '30d'
): Promise<TeamPerformanceData[]> => {
    try {
         if (sellerIds.length === 0) return [];

         const { startDate, endDate } = prismaUtils.calculateDateRange(period);

        // Busca dados agregados por vendedor
         const performanceResults = await prisma.user.findMany({
             where: { id: { in: sellerIds }, status: UserStatus.ACTIVE },
             select: {
                 id: true, name: true, avatarUrl: true, points: true, // Pontos gerais
                 // Agregações de submissões no período
                 campaignSubmissions: {
                     where: { status: CampaignSubmissionStatus.VALIDATED, validatedAt: { gte: startDate, lte: endDate } },
                     select: { value: true }
                 },
                 // Agregações de kits completados no período
                 campaignKits: {
                     where: { status: CampaignKitStatus.COMPLETED, completedAt: { gte: startDate, lte: endDate } },
                     select: { id: true, progress: true } // Inclui progress para média
                 }
             }
         });


        // Calcula totais e médias
        return performanceResults.map(seller => {
            const sales = seller.campaignSubmissions.reduce((sum, sub) => sum + (sub.value || 0), 0);
            const kitsCompleted = seller.campaignKits.length;
            // Média de progresso apenas de kits ativos (simplificado)
            // Idealmente buscaria kits ativos separadamente
            const activeKitsProgress = seller.campaignKits
                .filter(kit => kit.progress !== undefined && kit.progress < 100) // Exemplo simplificado
                .map(kit => kit.progress || 0);
            const averageProgress = activeKitsProgress.length > 0
                ? activeKitsProgress.reduce((sum, p) => sum + p, 0) / activeKitsProgress.length
                : 0;


            return {
                sellerId: seller.id,
                name: seller.name,
                avatarUrl: seller.avatarUrl || '',
                sales: sales,
                points: seller.points, // Pontos gerais
                kitsCompleted: kitsCompleted,
                averageProgress: Math.round(averageProgress)
            };
        }).sort((a, b) => b.points - a.points); // Ordena por pontos gerais

    } catch (error) {
        console.error('[DASHBOARD_SERVICE] Erro ao buscar performance da equipe:', error);
        throw new Error('Falha ao carregar performance da equipe.');
    }
};


/**
 * Obtém histórico de atividades (paginado)
 * @param userId Opcional: Filtra por usuário específico
 * @param filters Filtros adicionais (tipo, período)
 * @param pagination Opções de paginação
 */
export const getActivityHistory = async (
    userId?: string,
    filters: { type?: ActivityType; period?: '7d' | '30d' } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
): Promise<{ data: ActivityHistoryItem[]; total: number }> => {
     try {
         const where: any = {};
         if (userId) {
             where.userId = userId;
         }
         if (filters.type) {
             where.type = filters.type;
         }
         if (filters.period) {
             const { startDate } = prismaUtils.calculateDateRange(filters.period);
             where.timestamp = { gte: startDate };
         }

         const total = await prisma.activityItem.count({ where });
         const activities = await prisma.activityItem.findMany({
             where,
             include: {
                 user: { select: { id: true, name: true } }, // Inclui usuário relacionado
                 // Incluir campanha relacionada se o targetId for de campanha
                 // campaign: { where: { id: targetId }, select { ... }} // Complexo
             },
             orderBy: { timestamp: 'desc' },
             skip: (pagination.page - 1) * pagination.limit,
             take: pagination.limit,
         });


        return {
            data: activities.map(act => ({
                id: act.id,
                type: act.type,
                description: act.description,
                timestamp: act.timestamp.toISOString(),
                points: act.points || undefined,
                value: act.value || undefined,
                relatedUser: act.user ? { id: act.user.id, name: act.user.name } : undefined,
                // relatedCampaign: // Mapear se incluído acima
            })),
            total,
        };
    } catch (error) {
        console.error('[DASHBOARD_SERVICE] Erro ao buscar histórico de atividades:', error);
        throw new Error('Falha ao carregar histórico de atividades.');
    }
};

/**
 * Calcula métricas de crescimento (Usuários, Campanhas, Submissões)
 * @param period Período de comparação ('7d', '30d', '90d')
 */
export const getGrowthMetrics = async (
  period: '7d' | '30d' | '90d'
): Promise<GrowthMetricsData> => {
  try {
    const { startDate, endDate, previousStartDate, previousEndDate } = prismaUtils.calculateDateRanges(period);

    // Busca contagens do período atual e anterior
    const [
      currentUsers, previousUsers,
      currentCampaigns, previousCampaigns,
      currentSubmissions, previousSubmissions
    ] = await prisma.$transaction([
      // Usuários criados
      prisma.user.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.user.count({ where: { createdAt: { gte: previousStartDate, lte: previousEndDate } } }),
      // Campanhas criadas
      prisma.campaign.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.campaign.count({ where: { createdAt: { gte: previousStartDate, lte: previousEndDate } } }),
      // Submissões criadas
      prisma.campaignSubmission.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.campaignSubmission.count({ where: { createdAt: { gte: previousStartDate, lte: previousEndDate } } })
    ]);

    // ==================== CORREÇÃO AQUI ====================
    // Calcula variações percentuais com segurança contra divisão por zero

    const calculateChange = (current: number, previous: number): number | null => {
        if (previous === 0) {
            // Se anterior é 0 e atual > 0, pode ser infinito ou 100%. Null é mais seguro.
            // Se anterior é 0 e atual é 0, a variação é 0%.
            return current > 0 ? null : 0;
        }
        return ((current - previous) / previous) * 100;
    };

    const usersChange = calculateChange(currentUsers, previousUsers);
    const campaignsChange = calculateChange(currentCampaigns, previousCampaigns);
    const submissionsChange = calculateChange(currentSubmissions, previousSubmissions);
    // ==================== FIM DA CORREÇÃO ====================


    return {
      period,
      users: { current: currentUsers, previous: previousUsers, change: usersChange },
      campaigns: { current: currentCampaigns, previous: previousCampaigns, change: campaignsChange },
      submissions: { current: currentSubmissions, previous: previousSubmissions, change: submissionsChange },
    };

  } catch (error) {
    console.error('[DASHBOARD_SERVICE] Erro ao calcular métricas de crescimento:', error);
    throw new Error('Falha ao calcular métricas de crescimento.');
  }
};


/**
 * Obtém detalhes de um vendedor específico para o gerente
 * @param sellerId ID do vendedor
 * @param managerId ID do gerente (para validação de acesso)
 * @param period Período para estatísticas
 */
export const getSellerDetailsForManager = async (
    sellerId: string,
    managerId: string,
    period: '7d' | '30d' | '90d' = '30d'
): Promise<any> => { // Definir uma interface específica para SellerDetails
     try {
         // Valida se o gerente pode ver este vendedor
         const seller = await prisma.user.findUniqueOrThrow({
             where: { id: sellerId, managerId: managerId },
             select: { id: true, name: true, email: true, avatarUrl: true, level: true, points: true, opticName: true, status: true }
         });

         if(seller.status !== UserStatus.ACTIVE) {
             throw new Error('Vendedor não está ativo.');
         }

        // Reutiliza a lógica do dashboard do vendedor, mas pode adicionar mais detalhes
         const sellerDashboardData = await getVendedorDashboardData(sellerId, period);

        // Poderia adicionar mais informações específicas que o gerente precisa ver
        // Ex: histórico detalhado de submissões, ganhos pendentes, etc.

        return {
            ...sellerDashboardData,
            // Adicionar mais campos aqui se necessário
             status: seller.status // Inclui o status
        };

    } catch (error) {
        console.error(`[DASHBOARD_SERVICE] Erro ao buscar detalhes do vendedor ${sellerId} para gerente ${managerId}:`, error);
        if (error instanceof Error && error.message.includes('found')) {
             throw new Error('Vendedor não encontrado ou não pertence à sua equipe.');
        }
        throw new Error('Falha ao carregar detalhes do vendedor.');
    }
};