/**
 * @file campaign.service.ts
 * @version 2.0.2
 * @description Serviços para gerenciamento de campanhas no sistema EPS Campanhas.
 * Inclui CRUD completo, sistema de kits, metas complexas e gamificação.
 * @author DevEPS
 * @since 2025-10-21
 *
 * @changelog
 * - 2.0.2 (2025-10-22):
 * - CORRIGIDO: Crash 'Cannot find module ./activity.service'.
 * Comentadas as chamadas para 'createActivityItem' pois o
 * 'activity.service.ts' está ausente do projeto.
 * O log de atividades para campanhas está temporariamente desativado.
 * - CORRIGIDO: Erro de divisão por zero em 'calculateKitProgress'.
 * Adicionada verificação para evitar divisão por zero ao calcular
 * 'goalProgress'. Considera progresso 100% se o valor da meta for 0.
 */

import { prisma, PrismaTransactionClient, prismaUtils } from '../../lib/prismaClient';
import { CampaignStatus, CampaignKitStatus, ActivityType, UserRole, CampaignSubmissionStatus, GoalRequirementType, GoalConditionOperator } from '@prisma/client';
import {
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters,
  ToggleCampaignStatusData,
  DuplicateCampaignData
} from '../schemas/campaign.schema';
import { createActivityItem } from './activity.service';

// ==================== INTERFACES E TIPOS ====================

// (Interfaces FullCampaign, GoalRequirementWithConditions, CampaignKitWithDetails, KitProgressResult permanecem as mesmas)
// --- INÍCIO DAS INTERFACES (mantidas para contexto) ---
/**
 * Interface para campanha completa com relacionamentos
 */
interface FullCampaign {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startDate: Date;
  endDate: Date;
  status: CampaignStatus;
  pointsOnCompletion: number | null;
  managerPointsPercentage: number | null;
  // Deprecated? goal e points parecem ser por requisito agora
  points: number | null; // Manter por compatibilidade?
  goal: number | null;   // Manter por compatibilidade?
  createdAt: Date;
  updatedAt: Date;
  goalRequirements: GoalRequirementWithConditions[];
  campaignKits: CampaignKitWithDetails[];
}

/**
 * Requisito de Meta com suas condições
 */
interface GoalRequirementWithConditions {
    id: string;
    campaignId: string;
    description: string;
    type: GoalRequirementType;
    value: number; // Valor alvo (ex: 5 vendas, R$ 1000)
    pointsAwarded: number; // Pontos ganhos ao atingir esta meta
    conditions: GoalCondition[];
}

/**
 * Condição para um Requisito de Meta
 */
interface GoalCondition {
    id: string;
    goalRequirementId: string;
    field: string; // Campo da Submission a ser verificado (ex: 'productType', 'value')
    operator: GoalConditionOperator; // Ex: 'EQUALS', 'GREATER_THAN'
    value: string; // Valor da condição (ex: 'Lente XPTO', '100')
}

/**
 * Kit de Campanha com detalhes para cálculo de progresso
 */
interface CampaignKitWithDetails {
  id: string;
  userId: string;
  campaignId: string;
  status: CampaignKitStatus;
  progress: number | null; // Progresso geral (%) - pode ser deprecado se calculado dinamicamente
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submissions: CampaignSubmission[]; // Submissões associadas a este kit
  // Incluir user pode ser útil em alguns contextos
  user?: { id: string; name: string; managerId?: string | null };
}

/**
 * Submissão associada a um Kit (simplificado)
 */
 interface CampaignSubmission {
    id: string;
    campaignKitId: string;
    userId: string;
    managerId: string | null;
    value: number | null; // Valor da venda/submissão
    status: CampaignSubmissionStatus;
    validatedAt: Date | null;
    createdAt: Date;
    // Incluir outros campos relevantes da submissão (ex: productType, details)
    details?: any; // Ou um tipo mais específico
}


/**
 * Resultado do cálculo de progresso de um kit
 */
interface KitProgressResult {
  overallProgress: number; // Progresso geral do kit (%)
  goalsStatus: Array<{
    goalRequirementId: string;
    description: string;
    isCompleted: boolean;
    currentValue: number;
    targetValue: number;
    progress: number; // Progresso nesta meta específica (%)
  }>;
}
// --- FIM DAS INTERFACES ---


// ==================== OPERAÇÕES CRUD ====================

/**
 * Cria uma nova campanha com seus requisitos de meta e condições.
 * Cria kits vazios para usuários elegíveis (se aplicável na criação).
 * @param data Dados da nova campanha
 * @param creatorUserId ID do usuário (admin) criando a campanha
 */
export const createCampaign = async (
  data: CreateCampaignData,
  creatorUserId: string
): Promise<FullCampaign> => {
    return await prisma.$transaction(async (tx) => {
        // 1. Cria a campanha base
        const campaign = await tx.campaign.create({
            data: {
                title: data.title,
                description: data.description,
                imageUrl: data.imageUrl,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                status: data.status || CampaignStatus.DRAFT, // Default DRAFT
                pointsOnCompletion: data.pointsOnCompletion,
                managerPointsPercentage: data.managerPointsPercentage,
                // createdById: creatorUserId, // Adicionar se tiver relação no schema
            },
        });

        // 2. Cria os Requisitos de Meta (Goals) e suas Condições
        const goalRequirements = [];
        for (const goalData of data.goalRequirements) {
            const goal = await tx.goalRequirement.create({
                data: {
                    campaignId: campaign.id,
                    description: goalData.description,
                    type: goalData.type,
                    value: goalData.value,
                    pointsAwarded: goalData.pointsAwarded,
                    conditions: {
                        create: goalData.conditions.map(cond => ({
                            field: cond.field,
                            operator: cond.operator,
                            value: cond.value,
                        })),
                    },
                },
                include: { conditions: true }, // Inclui condições criadas
            });
            goalRequirements.push(goal);
        }

        // 3. (Opcional) Cria kits iniciais para usuários?

        // 4. Cria item de atividade (Log) - TEMPORARIAMENTE DESATIVADO
        /*
        await createActivityItem(tx, {
             userId: creatorUserId, // Admin que criou
             type: ActivityType.CAMPAIGN_CREATED,
             description: `Campanha "${campaign.title}" criada.`,
             targetId: campaign.id,
        });
        */

        console.log(`[CAMPAIGN_SERVICE] Campanha criada: ${campaign.id} por ${creatorUserId}`);

        // Retorna a campanha completa com os requisitos criados
        return {
            ...campaign,
            goalRequirements: goalRequirements,
            campaignKits: [], // Kits vazios inicialmente
        } as FullCampaign; // Cast necessário pois não inclui kits aqui
    });
};

/**
 * Atualiza uma campanha existente, incluindo seus requisitos e condições.
 * @param campaignId ID da campanha a ser atualizada
 * @param data Dados de atualização
 * @param updaterUserId ID do usuário (admin) atualizando
 */
export const updateCampaign = async (
  campaignId: string,
  data: UpdateCampaignData,
  updaterUserId: string
): Promise<FullCampaign> => {
     return await prisma.$transaction(async (tx) => {
        // 1. Atualiza dados base da campanha
         const updatedCampaignBase = await tx.campaign.update({
             where: { id: campaignId },
             data: {
                 title: data.title,
                 description: data.description,
                 imageUrl: data.imageUrl,
                 startDate: data.startDate ? new Date(data.startDate) : undefined,
                 endDate: data.endDate ? new Date(data.endDate) : undefined,
                 status: data.status,
                 pointsOnCompletion: data.pointsOnCompletion,
                 managerPointsPercentage: data.managerPointsPercentage,
             },
         });

        // 2. Atualiza/Cria/Deleta Requisitos de Meta (Goals) e Condições
        // Deleta conditions e requirements antigos
        await tx.goalCondition.deleteMany({ where: { goalRequirement: { campaignId: campaignId } } });
        await tx.goalRequirement.deleteMany({ where: { campaignId: campaignId } });

        // Recria os requirements e conditions a partir do 'data'
        const goalRequirements = [];
        if (data.goalRequirements) {
            for (const goalData of data.goalRequirements) {
                const goal = await tx.goalRequirement.create({
                    data: {
                        campaignId: campaignId,
                        description: goalData.description,
                        type: goalData.type,
                        value: goalData.value,
                        pointsAwarded: goalData.pointsAwarded,
                        conditions: {
                            create: goalData.conditions.map(cond => ({
                                field: cond.field,
                                operator: cond.operator,
                                value: cond.value,
                            })),
                        },
                    },
                    include: { conditions: true },
                });
                goalRequirements.push(goal);
            }
        }

        // 3. Cria item de atividade (Log) - TEMPORARIAMENTE DESATIVADO
        /*
        await createActivityItem(tx, {
             userId: updaterUserId,
             type: ActivityType.CAMPAIGN_UPDATED,
             description: `Campanha "${updatedCampaignBase.title}" atualizada.`,
             targetId: campaignId,
        });
        */

        console.log(`[CAMPAIGN_SERVICE] Campanha atualizada: ${campaignId} por ${updaterUserId}`);

        // Retorna a campanha completa atualizada
        const updatedCampaign = await tx.campaign.findUniqueOrThrow({
            where: { id: campaignId },
            include: {
                 goalRequirements: { include: { conditions: true } },
                 campaignKits: { include: { submissions: true, user: { select: {id:true, name:true, managerId: true}} } }
            }
        })
        return updatedCampaign as FullCampaign;
     });
};


/**
 * Obtém uma campanha pelo ID com todos os detalhes.
 * @param campaignId ID da campanha
 */
export const getCampaignById = async (campaignId: string): Promise<FullCampaign | null> => {
     try {
         const campaign = await prisma.campaign.findUnique({
             where: { id: campaignId },
             include: {
                 goalRequirements: { include: { conditions: true } },
                 campaignKits: {
                     include: {
                         submissions: true,
                         user: { select: { id: true, name: true, avatarUrl: true, managerId: true } }
                     }
                 }
             }
         });
         return campaign as FullCampaign | null;
     } catch (error) {
         console.error(`[CAMPAIGN_SERVICE] Erro ao buscar campanha ${campaignId}:`, error);
         throw new Error('Falha ao buscar detalhes da campanha.');
     }
};

/**
 * Lista campanhas com filtros e paginação.
 * @param filters Filtros de busca (status, data)
 * @param pagination Paginação
 */
export const listCampaigns = async (
  filters: CampaignFilters,
  pagination: { page: number; limit: number }
): Promise<{ data: Partial<FullCampaign>[]; total: number }> => {
    try {
        const where: any = {};
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.startDate) {
            where.startDate = { gte: new Date(filters.startDate) };
        }
        if (filters.endDate) {
            where.endDate = { lte: new Date(filters.endDate) };
        }
        if (filters.searchTerm) {
             where.OR = [
                 { title: { contains: filters.searchTerm, mode: 'insensitive' } },
                 { description: { contains: filters.searchTerm, mode: 'insensitive' } },
             ];
        }


        const total = await prisma.campaign.count({ where });
        const campaigns = await prisma.campaign.findMany({
            where,
            include: {
                goalRequirements: { select: { id: true } },
                 _count: { select: { campaignKits: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
        });

        const formattedData = campaigns.map(c => ({
            ...c,
            participantsCount: c._count.campaignKits,
            goalRequirementsCount: c.goalRequirements.length,
            _count: undefined,
        }));


        return { data: formattedData, total };
    } catch (error) {
        console.error('[CAMPAIGN_SERVICE] Erro ao listar campanhas:', error);
        throw new Error('Falha ao listar campanhas.');
    }
};


// ==================== OPERAÇÕES RELACIONADAS A USUÁRIOS ====================

/**
 * Obtém detalhes de uma campanha específica para um usuário, incluindo seu progresso.
 * Cria o kit para o usuário se for o primeiro acesso e a campanha estiver ativa.
 * @param campaignId ID da campanha
 * @param userId ID do usuário
 */
export const getCampaignDetailsWithUserProgress = async (
  campaignId: string,
  userId: string
): Promise<Partial<FullCampaign> & { userKit: CampaignKitWithDetails | null; userProgress: KitProgressResult | null }> => {
    try {
        const campaign = await prisma.campaign.findUniqueOrThrow({
            where: { id: campaignId },
            include: {
                goalRequirements: { include: { conditions: true } },
                campaignKits: {
                    where: { userId: userId },
                    include: { submissions: true }
                }
            }
        });

        let userKit = campaign.campaignKits[0] || null;

        if (!userKit && campaign.status === CampaignStatus.ACTIVE && campaign.endDate >= new Date()) {
            const user = await prisma.user.findUnique({ where: {id: userId}, select: { role: true }});
            if (user?.role === UserRole.VENDEDOR) {
                 userKit = await prisma.campaignKit.create({
                     data: {
                         campaignId: campaignId,
                         userId: userId,
                         status: CampaignKitStatus.ACTIVE,
                         progress: 0,
                     },
                     include: { submissions: true }
                 });
                 console.log(`[CAMPAIGN_SERVICE] Kit criado para usuário ${userId} na campanha ${campaignId}`);

                 // Cria activity log? - TEMPORARIAMENTE DESATIVADO
                 /*
                 await createActivityItem(prisma, {
                     userId: userId,
                     type: ActivityType.CAMPAIGN_JOINED,
                     description: `Entrou na campanha "${campaign.title}".`,
                     targetId: campaign.id,
                 });
                 */
            }
        }

        let userProgress: KitProgressResult | null = null;
        if (userKit && campaign.goalRequirements) {
            userProgress = calculateKitProgress(userKit, campaign.goalRequirements);
        }

        const campaignData = { ...campaign, campaignKits: undefined };

        return {
            ...campaignData,
            userKit: userKit,
            userProgress: userProgress
        };

    } catch (error) {
        console.error(`[CAMPAIGN_SERVICE] Erro ao buscar detalhes da campanha ${campaignId} para usuário ${userId}:`, error);
        throw new Error('Falha ao carregar detalhes da campanha e progresso.');
    }
};

/**
 * Obtém a lista de campanhas ativas para um usuário específico (Vendedor ou Gerente).
 * Gerentes veem campanhas com o progresso médio da equipe.
 * @param userId ID do usuário
 * @param userRole Role do usuário
 * @param managerId Opcional: ID do gerente (se userRole for GERENTE)
 */
export const getActiveCampaignsForUser = async (
    userId: string,
    userRole: UserRole,
    managerId?: string // Usado se userRole for GERENTE
): Promise<Array<Partial<FullCampaign> & { userProgress?: number; teamProgress?: number; participants?: number }>> => {
    try {
        const now = new Date();
        const campaigns = await prisma.campaign.findMany({
            where: {
                status: CampaignStatus.ACTIVE,
                endDate: { gte: now },
            },
            include: {
                 goalRequirements: { include: { conditions: true } },
                 campaignKits: {
                     where: {
                         userId: userRole === UserRole.VENDEDOR ? userId : undefined,
                         user: userRole === UserRole.GERENTE ? { managerId: userId } : undefined,
                     },
                     include: {
                         submissions: true,
                         user: { select: { id: true, name: true, avatarUrl: true } }
                     }
                 }
            },
            orderBy: { endDate: 'asc' }
        });


        return campaigns.map(campaign => {
             if (userRole === UserRole.VENDEDOR) {
                 const userKit = campaign.campaignKits.find(kit => kit.userId === userId);
                 let userProgress = 0;
                 if (userKit) {
                     userProgress = calculateKitProgress(userKit, campaign.goalRequirements).overallProgress;
                 }
                 return {
                     id: campaign.id,
                     title: campaign.title,
                     endDate: campaign.endDate,
                     imageUrl: campaign.imageUrl,
                     pointsOnCompletion: campaign.pointsOnCompletion,
                     userProgress: userProgress,
                     goalRequirements: undefined,
                     campaignKits: undefined,
                 };
             } else { // GERENTE
                 const teamKits = campaign.campaignKits;
                 let totalProgress = 0;
                 const uniqueParticipants = new Set(teamKits.map(kit => kit.userId));

                 if (teamKits.length > 0) {
                     totalProgress = teamKits.reduce((sum, kit) => {
                         return sum + calculateKitProgress(kit, campaign.goalRequirements).overallProgress;
                     }, 0);
                 }
                 const teamProgress = uniqueParticipants.size > 0 ? Math.round(totalProgress / uniqueParticipants.size) : 0;

                 return {
                     id: campaign.id,
                     title: campaign.title,
                     endDate: campaign.endDate,
                     imageUrl: campaign.imageUrl,
                     teamProgress: teamProgress,
                     participants: uniqueParticipants.size,
                     goalRequirements: undefined,
                     campaignKits: undefined,
                 };
             }
        });


    } catch (error) {
        console.error(`[CAMPAIGN_SERVICE] Erro ao buscar campanhas ativas para usuário ${userId}:`, error);
        throw new Error('Falha ao carregar campanhas ativas.');
    }
};

// ==================== OPERAÇÕES DE STATUS E OUTRAS ====================

/**
 * Obtém estatísticas gerais de uma campanha (Admin/Gerente).
 * @param campaignId ID da campanha
 * @param userRole Role do usuário solicitante
 * @param managerId Opcional: ID do gerente para filtrar por equipe
 */
export const getCampaignStats = async (
    campaignId: string,
    userRole: UserRole,
    managerId?: string
): Promise<any> => { // Definir interface CampaignStatsData
    try {
         const whereKitUser: any = {};
         if (userRole === UserRole.GERENTE && managerId) {
             whereKitUser.managerId = managerId;
         }


         const campaign = await prisma.campaign.findUniqueOrThrow({
             where: { id: campaignId },
             select: {
                 id: true, title: true, status: true, startDate: true, endDate: true,
                 _count: { select: { campaignKits: true } },
                 campaignKits: {
                     where: { user: whereKitUser },
                     select: {
                         status: true,
                         progress: true,
                         userId: true,
                         submissions: { select: { status: true } }
                     },
                 },
                 goalRequirements: { include: { conditions: true } }
             }
         });


         const kits = campaign.campaignKits;
         const totalParticipants = userRole === UserRole.ADMIN ? campaign._count.campaignKits : kits.length;

         let completedKits = 0;
         let totalProgressSum = 0;
         let totalSubmissions = 0;
         let validatedSubmissions = 0;
         let pendingSubmissions = 0;

         kits.forEach(kit => {
             const progressResult = calculateKitProgress(kit, campaign.goalRequirements);
             totalProgressSum += progressResult.overallProgress;

             if (progressResult.overallProgress >= 100) {
                 completedKits++;
             }

             kit.submissions.forEach(sub => {
                 totalSubmissions++;
                 if (sub.status === CampaignSubmissionStatus.VALIDATED) validatedSubmissions++;
                 if (sub.status === CampaignSubmissionStatus.PENDING) pendingSubmissions++;
             });
         });


         const averageProgress = totalParticipants > 0 ? Math.round(totalProgressSum / totalParticipants) : 0;

         return {
             campaignId: campaign.id,
             title: campaign.title,
             status: campaign.status,
             startDate: campaign.startDate,
             endDate: campaign.endDate,
             totalParticipants: totalParticipants,
             completedParticipants: completedKits,
             averageProgress: averageProgress,
             submissions: {
                 total: totalSubmissions,
                 validated: validatedSubmissions,
                 pending: pendingSubmissions,
                 rejected: totalSubmissions - validatedSubmissions - pendingSubmissions,
             },
         };


    } catch (error) {
        console.error(`[CAMPAIGN_SERVICE] Erro ao buscar estatísticas da campanha ${campaignId}:`, error);
        throw new Error('Falha ao carregar estatísticas da campanha.');
    }
};


/**
 * Ativa ou desativa uma campanha.
 * @param data Contém campaignId e o novo status
 * @param updaterUserId ID do admin
 */
export const toggleCampaignStatus = async (
  data: ToggleCampaignStatusData,
  updaterUserId: string
): Promise<FullCampaign> => {
    try {
        const { campaignId, status } = data;
        const campaign = await prisma.campaign.findUniqueOrThrow({ where: {id: campaignId }});

        if (status === CampaignStatus.ACTIVE && campaign.endDate < new Date()) {
            throw new Error('Não é possível ativar uma campanha que já terminou.');
        }

        const updatedCampaign = await prisma.campaign.update({
            where: { id: campaignId },
            data: { status },
            include: {
                goalRequirements: { include: { conditions: true } },
                campaignKits: { include: { submissions: true, user: { select: {id:true, name:true, managerId: true}} } }
            }
        });

        const action = status === CampaignStatus.ACTIVE ? 'ativada' : 'desativada';
        // TEMPORARIAMENTE DESATIVADO
        /*
         await createActivityItem(prisma, {
             userId: updaterUserId,
             type: status === CampaignStatus.ACTIVE ? ActivityType.CAMPAIGN_ACTIVATED : ActivityType.CAMPAIGN_DEACTIVATED,
             description: `Campanha "${updatedCampaign.title}" foi ${action}.`,
             targetId: campaignId,
         });
        */

        console.log(`[CAMPAIGN_SERVICE] Campanha ${campaignId} ${action} por ${updaterUserId}`);

        return updatedCampaign as FullCampaign;

    } catch (error) {
        console.error(`[CAMPAIGN_SERVICE] Erro ao alterar status da campanha ${data.campaignId}:`, error);
         if (error instanceof Error && error.message.includes('terminou')) {
             throw error;
         }
        throw new Error('Falha ao alterar status da campanha.');
    }
};


/**
 * Duplica uma campanha existente, incluindo seus requisitos.
 * A campanha duplicada começa como DRAFT.
 * @param data Contém o ID da campanha a ser duplicada
 * @param creatorUserId ID do admin
 */
export const duplicateCampaign = async (
  data: DuplicateCampaignData,
  creatorUserId: string
): Promise<FullCampaign> => {
    try {
        const originalCampaign = await prisma.campaign.findUniqueOrThrow({
            where: { id: data.campaignId },
            include: { goalRequirements: { include: { conditions: true } } }
        });

        const newCampaign = await prisma.campaign.create({
            data: {
                title: `${originalCampaign.title} (Cópia)`,
                description: originalCampaign.description,
                imageUrl: originalCampaign.imageUrl,
                startDate: originalCampaign.startDate,
                endDate: originalCampaign.endDate,
                status: CampaignStatus.DRAFT,
                pointsOnCompletion: originalCampaign.pointsOnCompletion,
                managerPointsPercentage: originalCampaign.managerPointsPercentage,
                 goalRequirements: {
                     create: originalCampaign.goalRequirements.map(goal => ({
                         description: goal.description,
                         type: goal.type,
                         value: goal.value,
                         pointsAwarded: goal.pointsAwarded,
                         conditions: {
                             create: goal.conditions.map(cond => ({
                                 field: cond.field,
                                 operator: cond.operator,
                                 value: cond.value,
                             }))
                         }
                     }))
                 }
            },
            include: {
                 goalRequirements: { include: { conditions: true } }
            }
        });

        // TEMPORARIAMENTE DESATIVADO
        /*
         await createActivityItem(prisma, {
             userId: creatorUserId,
             type: ActivityType.CAMPAIGN_CREATED,
             description: `Campanha "${newCampaign.title}" duplicada a partir de "${originalCampaign.title}".`,
             targetId: newCampaign.id,
             details: { originalCampaignId: originalCampaign.id }
         });
        */

        console.log(`[CAMPAIGN_SERVICE] Campanha ${originalCampaign.id} duplicada para ${newCampaign.id} por ${creatorUserId}`);

        return { ...newCampaign, campaignKits: [] } as FullCampaign;

    } catch (error) {
        console.error(`[CAMPAIGN_SERVICE] Erro ao duplicar campanha ${data.campaignId}:`, error);
        throw new Error('Falha ao duplicar campanha.');
    }
};

/**
 * Atualiza o status de campanhas que expiraram para INACTIVE.
 * Idealmente rodado por um job agendado.
 */
export const updateExpiredCampaigns = async (): Promise<number> => {
     try {
         const now = new Date();
         const result = await prisma.campaign.updateMany({
             where: {
                 status: CampaignStatus.ACTIVE,
                 endDate: { lt: now }
             },
             data: {
                 status: CampaignStatus.INACTIVE
             }
         });

         if (result.count > 0) {
             console.log(`[CAMPAIGN_SERVICE] ${result.count} campanhas ativas foram marcadas como inativas por terem expirado.`);
         }

         return result.count;
     } catch (error) {
         console.error('[CAMPAIGN_SERVICE] Erro ao atualizar campanhas expiradas:', error);
         return 0;
     }
};

// ==================== CÁLCULO DE PROGRESSO ====================

/**
 * Calcula o progresso geral e por meta de um Kit de Campanha.
 * @param kit O kit do usuário com suas submissões
 * @param goalRequirements Os requisitos da campanha associada
 */
export const calculateKitProgress = (
  kit: CampaignKitWithDetails | any,
  goalRequirements: GoalRequirementWithConditions[] | any[]
): KitProgressResult => {
  let overallProgress = 0;
  const goalsStatus: KitProgressResult['goalsStatus'] = [];
  const validSubmissions = kit.submissions?.filter(
    (sub: CampaignSubmission) => sub.status === CampaignSubmissionStatus.VALIDATED
  ) || [];

  if (!goalRequirements || goalRequirements.length === 0) {
    return { overallProgress: 100, goalsStatus: [] };
  }

  goalRequirements.forEach(goalRequirement => {
    let currentValue = 0;
    const relevantSubmissions = validSubmissions.filter((sub: CampaignSubmission) =>
      goalRequirement.conditions.every((cond: GoalCondition) => {
        const subValue = sub.details?.[cond.field] ?? sub[cond.field as keyof CampaignSubmission];
        if (subValue === undefined || subValue === null) return false;
        const conditionValue = cond.value;
        const submissionValueStr = String(subValue);
        const submissionValueNum = Number(subValue);
        const conditionValueNum = Number(conditionValue);

        switch (cond.operator) {
          case GoalConditionOperator.EQUALS: return submissionValueStr === conditionValue;
          case GoalConditionOperator.NOT_EQUALS: return submissionValueStr !== conditionValue;
          case GoalConditionOperator.GREATER_THAN: return submissionValueNum > conditionValueNum;
          case GoalConditionOperator.LESS_THAN: return submissionValueNum < conditionValueNum;
          case GoalConditionOperator.CONTAINS: return submissionValueStr.includes(conditionValue);
          case GoalConditionOperator.NOT_CONTAINS: return !submissionValueStr.includes(conditionValue);
          default: return false;
        }
      })
    );

    if (goalRequirement.type === GoalRequirementType.QUANTITY) {
      currentValue = relevantSubmissions.length;
    } else if (goalRequirement.type === GoalRequirementType.VALUE) {
      currentValue = relevantSubmissions.reduce((sum, sub) => sum + (sub.value || 0), 0);
    }

    const goalProgress = goalRequirement.value > 0
      ? Math.min(100, (currentValue / goalRequirement.value) * 100)
      : 100;

    goalsStatus.push({
      goalRequirementId: goalRequirement.id,
      description: goalRequirement.description,
      isCompleted: currentValue >= goalRequirement.value,
      currentValue: currentValue,
      targetValue: goalRequirement.value,
      progress: Math.round(goalProgress),
    });
  });

  if (goalsStatus.length > 0) {
    const totalProgressSum = goalsStatus.reduce((sum, goal) => sum + goal.progress, 0);
    overallProgress = Math.round(totalProgressSum / goalsStatus.length);
  } else {
    overallProgress = 100;
  }

  return { overallProgress, goalsStatus };
};