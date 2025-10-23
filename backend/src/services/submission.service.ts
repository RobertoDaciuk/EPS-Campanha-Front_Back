/**
 * @file submission.service.ts
 * @version 2.0.0
 * @description Serviços para gestão de submissões de vendas no sistema EPS Campanhas.
 * Gerencia submissões, kits, validação e relatórios detalhados.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos serviços de submissão
 * - Sistema de kits (cartelas) automatizado
 * - Validação de submissões com regras de negócio
 * - Processamento em lote otimizado
 * - Sistema de pontuação automática
 */

import { prisma, PrismaTransactionClient, prismaUtils } from '../../lib/prismaClient';
import { 
  CampaignSubmissionStatus, 
  CampaignKitStatus, 
  CampaignStatus,
  ActivityType,
  EarningType,
  EarningStatus,
  UserRole
} from '@prisma/client';
import { 
  CreateSubmissionData, 
  UpdateSubmissionData, 
  SubmissionFilters,
  ValidateSubmissionData,
  BulkValidateSubmissionsData,
  SubmissionReportQuery,
  DuplicateSubmissionData,
  TransferSubmissionData,
  UserSubmissionStatsQuery
} from '../schemas/submission.schema';

// ==================== INTERFACES E TIPOS ====================

/**
 * Interface para submissão completa
 */
interface FullSubmission {
  id: string;
  orderNumber: string;
  quantity: number;
  status: CampaignSubmissionStatus;
  submissionDate: Date;
  validationMessage?: string;
  notes?: string;
  campaignId: string;
  userId: string;
  requirementId: string;
  kitId: string;
  user: {
    id: string;
    name: string;
    email: string;
    cpf: string;
    avatarUrl: string;
    opticName: string;
    managerId?: string;
  };
  campaign: {
    id: string;
    title: string;
    status: CampaignStatus;
  };
  requirement: {
    id: string;
    description: string;
    quantity: number;
    unitType: 'UNIT' | 'PAIR';
  };
  kit: {
    id: string;
    status: CampaignKitStatus;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para resultado de validação
 */
interface ValidationResult {
  submission: FullSubmission;
  pointsAwarded?: {
    seller: number;
    manager?: number;
  };
  earningsCreated?: string[];
  kitStatusChanged?: boolean;
}

/**
 * Interface para estatísticas de usuário
 */
interface UserSubmissionStats {
  userId: string;
  period: string;
  totalSubmissions: number;
  validatedSubmissions: number;
  rejectedSubmissions: number;
  pendingSubmissions: number;
  totalQuantity: number;
  averageQuantityPerSubmission: number;
  submissionsByStatus: Record<CampaignSubmissionStatus, number>;
  campaignBreakdown?: Array<{
    campaignId: string;
    campaignTitle: string;
    submissions: number;
    validated: number;
  }>;
}

// ==================== UTILITÁRIOS INTERNOS ====================

/**
 * Verifica se número de pedido já foi usado
 */
const checkOrderNumberUniqueness = async (
  orderNumber: string,
  excludeSubmissionId?: string,
  tx?: PrismaTransactionClient
): Promise<void> => {
  const client = tx || prisma;
  
  const existing = await client.campaignSubmission.findUnique({
    where: { orderNumber },
    select: { id: true },
  });

  if (existing && existing.id !== excludeSubmissionId) {
    throw new Error('Número de pedido já foi utilizado em outra submissão');
  }
};

/**
 * Cria ou obtém kit ativo para usuário em campanha
 */
const getOrCreateActiveKit = async (
  campaignId: string,
  userId: string,
  tx?: PrismaTransactionClient
): Promise<string> => {
  const client = tx || prisma;

  // Busca kit ativo existente
  let activeKit = await client.campaignKit.findFirst({
    where: {
      campaignId,
      userId,
      status: CampaignKitStatus.IN_PROGRESS,
    },
    select: { id: true },
  });

  // Se não tem kit ativo, cria um novo
  if (!activeKit) {
    activeKit = await client.campaignKit.create({
      data: {
        campaignId,
        userId,
        status: CampaignKitStatus.IN_PROGRESS,
      },
      select: { id: true },
    });
  }

  return activeKit.id;
};

/**
 * Verifica se kit foi completado e atualiza status
 */
const checkAndUpdateKitCompletion = async (
  kitId: string,
  tx?: PrismaTransactionClient
): Promise<boolean> => {
  const client = tx || prisma;

  // Busca kit com dados da campanha e submissões
  const kit = await client.campaignKit.findUnique({
    where: { id: kitId },
    include: {
      campaign: {
        include: {
          goalRequirements: true,
        },
      },
      submissions: {
        where: { status: CampaignSubmissionStatus.VALIDATED },
      },
    },
  });

  if (!kit) return false;

  // Verifica se todas as metas foram atingidas
  const isCompleted = kit.campaign.goalRequirements.every(requirement => {
    const completedQuantity = kit.submissions
      .filter(sub => sub.requirementId === requirement.id)
      .reduce((sum, sub) => sum + sub.quantity, 0);
    
    return completedQuantity >= requirement.quantity;
  });

  // Atualiza status do kit se necessário
  if (isCompleted && kit.status !== CampaignKitStatus.COMPLETED) {
    await client.campaignKit.update({
      where: { id: kitId },
      data: { status: CampaignKitStatus.COMPLETED },
    });

    return true; // Kit foi completado agora
  }

  return false;
};

/**
 * Calcula e cria earnings para submissão validada
 */
const createEarningsForValidatedSubmission = async (
  submission: FullSubmission,
  tx?: PrismaTransactionClient
): Promise<string[]> => {
  const client = tx || prisma;
  const earningsCreated: string[] = [];

  // Busca dados da campanha para calcular pontos
  const campaign = await client.campaign.findUnique({
    where: { id: submission.campaignId },
    select: {
      pointsOnCompletion: true,
      managerPointsPercentage: true,
    },
  });

  if (!campaign || !campaign.pointsOnCompletion) {
    return earningsCreated;
  }

  // Calcula pontos para o vendedor
  const sellerPoints = campaign.pointsOnCompletion * submission.quantity;

  // Cria earning para o vendedor
  const sellerEarning = await client.earning.create({
    data: {
      type: EarningType.SELLER,
      userId: submission.userId,
      userName: submission.user.name,
      userAvatarUrl: submission.user.avatarUrl,
      campaignId: submission.campaignId,
      campaignTitle: submission.campaign.title,
      kitId: submission.kitId,
      amount: sellerPoints,
      earningDate: new Date(),
      status: EarningStatus.PENDENTE,
      description: `Venda validada: ${submission.orderNumber}`,
    },
  });

  earningsCreated.push(sellerEarning.id);

  // Se há percentual para gerente e vendedor tem gerente
  if (campaign.managerPointsPercentage && submission.user.managerId) {
    const managerPoints = sellerPoints * (campaign.managerPointsPercentage / 100);

    // Busca dados do gerente
    const manager = await client.user.findUnique({
      where: { id: submission.user.managerId },
      select: { name: true, avatarUrl: true },
    });

    if (manager) {
      const managerEarning = await client.earning.create({
        data: {
          type: EarningType.MANAGER,
          userId: submission.user.managerId,
          userName: manager.name,
          userAvatarUrl: manager.avatarUrl,
          campaignId: submission.campaignId,
          campaignTitle: submission.campaign.title,
          kitId: submission.kitId,
          sourceUserName: submission.user.name,
          amount: managerPoints,
          earningDate: new Date(),
          status: EarningStatus.PENDENTE,
          description: `Venda da equipe validada: ${submission.orderNumber} (vendedor: ${submission.user.name})`,
        },
      });

      earningsCreated.push(managerEarning.id);
    }
  }

  return earningsCreated;
};

/**
 * Registra atividade de submissão
 */
const logSubmissionActivity = async (
  userId: string,
  type: ActivityType,
  description: string,
  points?: number,
  value?: number,
  tx?: PrismaTransactionClient
): Promise<void> => {
  try {
    const client = tx || prisma;
    
    await client.activityItem.create({
      data: {
        userId,
        type,
        description,
        points,
        value,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao registrar atividade:', error);
    // Não quebra o fluxo se atividade falhar
  }
};

// ==================== SERVIÇOS PRINCIPAIS ====================

/**
 * Cria nova submissão
 */
export const createSubmission = async (submissionData: CreateSubmissionData & { userId: string }): Promise<FullSubmission> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const { campaignId, requirementId, orderNumber, quantity, notes, userId } = submissionData;

      // Verifica se campanha está ativa
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, title: true, status: true, startDate: true, endDate: true },
      });

      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }

      if (campaign.status !== CampaignStatus.ATIVA) {
        throw new Error('Campanha não está ativa');
      }

      const now = new Date();
      if (now < campaign.startDate || now > campaign.endDate) {
        throw new Error('Campanha fora do período ativo');
      }

      // Verifica se meta existe
      const requirement = await tx.goalRequirement.findUnique({
        where: { id: requirementId },
        select: { id: true, description: true, quantity: true, unitType: true, campaignId: true },
      });

      if (!requirement) {
        throw new Error('Meta da campanha não encontrada');
      }

      if (requirement.campaignId !== campaignId) {
        throw new Error('Meta não pertence à campanha especificada');
      }

      // Verifica unicidade do número do pedido
      await checkOrderNumberUniqueness(orderNumber, undefined, tx);

      // Obtém ou cria kit ativo
      const kitId = submissionData.kitId || await getOrCreateActiveKit(campaignId, userId, tx);

      // Cria submissão
      const submission = await tx.campaignSubmission.create({
        data: {
          orderNumber,
          quantity: quantity || 1,
          status: CampaignSubmissionStatus.PENDING,
          submissionDate: new Date(),
          notes,
          campaignId,
          userId,
          requirementId,
          kitId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true,
              avatarUrl: true,
              opticName: true,
              managerId: true,
            },
          },
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          requirement: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitType: true,
            },
          },
          kit: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      // Registra atividade
      await logSubmissionActivity(
        userId,
        ActivityType.VENDA,
        `Venda submetida: ${orderNumber} (${quantity} ${requirement.unitType === 'PAIR' ? 'pares' : 'unidades'})`,
        undefined,
        undefined,
        tx
      );

      return submission as FullSubmission;
    });

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao criar submissão:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao criar submissão');
  }
};

/**
 * Atualiza submissão existente
 */
export const updateSubmission = async (
  submissionId: string,
  submissionData: UpdateSubmissionData
): Promise<FullSubmission> => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Verifica se submissão existe
      const existingSubmission = await tx.campaignSubmission.findUnique({
        where: { id: submissionId },
        select: { 
          id: true, 
          status: true, 
          orderNumber: true,
          userId: true,
        },
      });

      if (!existingSubmission) {
        throw new Error('Submissão não encontrada');
      }

      // Verifica se pode ser alterada
      if (existingSubmission.status !== CampaignSubmissionStatus.PENDING) {
        throw new Error('Apenas submissões pendentes podem ser alteradas');
      }

      // Prepara dados de atualização
      const updateData: any = {};

      if (submissionData.orderNumber) {
        await checkOrderNumberUniqueness(submissionData.orderNumber, submissionId, tx);
        updateData.orderNumber = submissionData.orderNumber;
      }

      if (submissionData.quantity) updateData.quantity = submissionData.quantity;
      if (submissionData.notes !== undefined) updateData.notes = submissionData.notes;
      if (submissionData.status) updateData.status = submissionData.status;
      if (submissionData.validationMessage !== undefined) {
        updateData.validationMessage = submissionData.validationMessage;
      }

      // Atualiza submissão
      const updatedSubmission = await tx.campaignSubmission.update({
        where: { id: submissionId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true,
              avatarUrl: true,
              opticName: true,
              managerId: true,
            },
          },
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          requirement: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitType: true,
            },
          },
          kit: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      // Registra atividade de atualização
      await logSubmissionActivity(
        existingSubmission.userId,
        ActivityType.VENDA,
        `Venda atualizada: ${updateData.orderNumber || existingSubmission.orderNumber}`,
        undefined,
        undefined,
        tx
      );

      return updatedSubmission as FullSubmission;
    });

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao atualizar submissão:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao atualizar submissão');
  }
};

/**
 * Busca submissão por ID
 */
export const getSubmissionById = async (submissionId: string): Promise<FullSubmission | null> => {
  try {
    const submission = await prisma.campaignSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            avatarUrl: true,
            opticName: true,
            managerId: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        requirement: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitType: true,
          },
        },
        kit: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return submission as FullSubmission | null;

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao buscar submissão:', error);
    throw new Error('Erro interno ao buscar submissão');
  }
};

/**
 * Lista submissões com filtros
 */
export const listSubmissions = async (filters: SubmissionFilters) => {
  try {
    const { 
      page, limit, sort, order, search, status, 
      campaignId, userId, requirementId, kitId,
      submittedAfter, submittedBefore, minQuantity, maxQuantity,
      hasAttachments, hasNotes, opticCNPJ
    } = filters;

    // Constrói filtros where
    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { opticName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status as CampaignSubmissionStatus;
    }

    if (campaignId) where.campaignId = campaignId;
    if (userId) where.userId = userId;
    if (requirementId) where.requirementId = requirementId;
    if (kitId) where.kitId = kitId;

    if (submittedAfter) {
      where.submissionDate = { gte: new Date(submittedAfter) };
    }

    if (submittedBefore) {
      where.submissionDate = { 
        ...where.submissionDate, 
        lte: new Date(submittedBefore) 
      };
    }

    if (minQuantity !== undefined || maxQuantity !== undefined) {
      where.quantity = {};
      if (minQuantity !== undefined) where.quantity.gte = minQuantity;
      if (maxQuantity !== undefined) where.quantity.lte = maxQuantity;
    }

    if (hasNotes !== undefined) {
      if (hasNotes) {
        where.notes = { not: null };
      } else {
        where.OR = [
          { notes: null },
          { notes: '' },
        ];
      }
    }

    if (opticCNPJ) {
      where.user = { opticCNPJ };
    }

    // Paginação
    const { skip, take } = prismaUtils.buildPagination(page, limit);

    // Executa consulta
    const [submissions, total] = await Promise.all([
      prisma.campaignSubmission.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: order },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true,
              avatarUrl: true,
              opticName: true,
              managerId: true,
            },
          },
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          requirement: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitType: true,
            },
          },
          kit: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.campaignSubmission.count({ where }),
    ]);

    // Calcula estatísticas de resumo
    const summary = {
      totalSubmissions: total,
      pendingSubmissions: await prisma.campaignSubmission.count({
        where: { ...where, status: CampaignSubmissionStatus.PENDING },
      }),
      validatedSubmissions: await prisma.campaignSubmission.count({
        where: { ...where, status: CampaignSubmissionStatus.VALIDATED },
      }),
      rejectedSubmissions: await prisma.campaignSubmission.count({
        where: { ...where, status: CampaignSubmissionStatus.REJECTED },
      }),
      totalQuantity: await prisma.campaignSubmission.aggregate({
        where,
        _sum: { quantity: true },
      }).then(result => result._sum.quantity || 0),
    };

    return prismaUtils.formatPaginatedResult(submissions, total, page, limit, summary);

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao listar submissões:', error);
    throw new Error('Erro interno ao listar submissões');
  }
};

/**
 * Valida submissão (aprovação/rejeição)
 */
export const validateSubmission = async (
  submissionId: string,
  validationData: ValidateSubmissionData,
  validatorId: string
): Promise<ValidationResult> => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Busca submissão completa
      const submission = await getSubmissionById(submissionId);
      
      if (!submission) {
        throw new Error('Submissão não encontrada');
      }

      if (submission.status !== CampaignSubmissionStatus.PENDING) {
        throw new Error('Apenas submissões pendentes podem ser validadas');
      }

      // Atualiza submissão
      const updatedSubmission = await tx.campaignSubmission.update({
        where: { id: submissionId },
        data: {
          status: validationData.status,
          validationMessage: validationData.validationMessage,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true,
              avatarUrl: true,
              opticName: true,
              managerId: true,
            },
          },
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          requirement: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitType: true,
            },
          },
          kit: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      const result: ValidationResult = {
        submission: updatedSubmission as FullSubmission,
      };

      // Se foi validada, processa earnings e verifica conclusão do kit
      if (validationData.status === CampaignSubmissionStatus.VALIDATED) {
        // Cria earnings
        const earningsCreated = await createEarningsForValidatedSubmission(
          updatedSubmission as FullSubmission, 
          tx
        );
        result.earningsCreated = earningsCreated;

        // Verifica se kit foi completado
        const kitCompleted = await checkAndUpdateKitCompletion(submission.kitId, tx);
        result.kitStatusChanged = kitCompleted;

        // Registra atividade de validação
        await logSubmissionActivity(
          submission.userId,
          ActivityType.VENDA,
          `Venda validada: ${submission.orderNumber}`,
          undefined,
          undefined,
          tx
        );

        console.log(`[SUBMISSION_SERVICE] Submissão validada: ${submissionId} - earnings criados: ${earningsCreated.length}`);
      } else {
        // Registra rejeição
        await logSubmissionActivity(
          submission.userId,
          ActivityType.VENDA,
          `Venda rejeitada: ${submission.orderNumber} - ${validationData.validationMessage}`,
          undefined,
          undefined,
          tx
        );

        console.log(`[SUBMISSION_SERVICE] Submissão rejeitada: ${submissionId}`);
      }

      return result;
    });

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao validar submissão:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao validar submissão');
  }
};

/**
 * Validação em lote de submissões
 */
export const bulkValidateSubmissions = async (
  bulkData: BulkValidateSubmissionsData,
  validatorId: string
): Promise<{ processed: number; successful: number; failed: number; details: any[] }> => {
  try {
    const { submissionIds, action, validationMessage, applyToAll } = bulkData;

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      details: [] as any[],
    };

    // Converte action para status
    const statusMap = {
      validate: CampaignSubmissionStatus.VALIDATED,
      reject: CampaignSubmissionStatus.REJECTED,
      pending: CampaignSubmissionStatus.PENDING,
    };

    const targetStatus = statusMap[action];

    // Processa cada submissão
    for (const submissionId of submissionIds) {
      results.processed++;
      
      try {
        const validationData: ValidateSubmissionData = {
          status: targetStatus,
          validationMessage,
          internalNotes: `Processamento em lote por ${validatorId}`,
        };

        const result = await validateSubmission(submissionId, validationData, validatorId);

        results.successful++;
        results.details.push({
          submissionId,
          success: true,
          message: `Submissão ${action === 'validate' ? 'validada' : 'rejeitada'} com sucesso`,
          earningsCreated: result.earningsCreated?.length || 0,
        });

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        results.details.push({
          submissionId,
          success: false,
          message: errorMessage,
        });

        console.error(`[SUBMISSION_SERVICE] Erro na validação em lote ${submissionId}:`, error);
      }
    }

    console.log(`[SUBMISSION_SERVICE] Validação em lote concluída: ${results.successful} sucessos, ${results.failed} falhas`);

    return results;

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro na validação em lote:', error);
    throw new Error('Erro interno na validação em lote');
  }
};

/**
 * Exclui submissão
 */
export const deleteSubmission = async (
  submissionId: string,
  userId: string
): Promise<void> => {
  try {
    await prisma.$transaction(async (tx) => {
      const submission = await tx.campaignSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true, status: true, orderNumber: true, userId: true },
      });

      if (!submission) {
        throw new Error('Submissão não encontrada');
      }

      if (submission.status !== CampaignSubmissionStatus.PENDING) {
        throw new Error('Apenas submissões pendentes podem ser excluídas');
      }

      await tx.campaignSubmission.delete({
        where: { id: submissionId },
      });

      // Registra atividade
      await logSubmissionActivity(
        submission.userId,
        ActivityType.VENDA,
        `Venda removida: ${submission.orderNumber}`,
        undefined,
        undefined,
        tx
      );
    });

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao excluir submissão:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao excluir submissão');
  }
};

/**
 * Duplica submissão
 */
export const duplicateSubmission = async (
  duplicateData: DuplicateSubmissionData,
  userId: string
): Promise<FullSubmission> => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Busca submissão original
      const originalSubmission = await tx.campaignSubmission.findUnique({
        where: { id: duplicateData.submissionId },
        select: {
          campaignId: true,
          requirementId: true,
          quantity: true,
          notes: true,
          userId: true,
        },
      });

      if (!originalSubmission) {
        throw new Error('Submissão original não encontrada');
      }

      // Cria nova submissão baseada na original
      const newSubmissionData: CreateSubmissionData & { userId: string } = {
        campaignId: originalSubmission.campaignId,
        requirementId: originalSubmission.requirementId,
        orderNumber: duplicateData.newOrderNumber,
        quantity: duplicateData.newQuantity || originalSubmission.quantity,
        notes: originalSubmission.notes,
        kitId: duplicateData.newKitId,
        userId: originalSubmission.userId,
      };

      const newSubmission = await createSubmission(newSubmissionData);

      return newSubmission;
    });

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao duplicar submissão:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao duplicar submissão');
  }
};

/**
 * Transfere submissão entre kits
 */
export const transferSubmission = async (
  transferData: TransferSubmissionData,
  adminId: string
): Promise<{ submission: FullSubmission; originalKit: string; newKit: string }> => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Busca submissão
      const submission = await tx.campaignSubmission.findUnique({
        where: { id: transferData.submissionId },
        select: { id: true, kitId: true, orderNumber: true, userId: true },
      });

      if (!submission) {
        throw new Error('Submissão não encontrada');
      }

      // Verifica se kit de destino existe
      const targetKit = await tx.campaignKit.findUnique({
        where: { id: transferData.targetKitId },
        select: { id: true, userId: true, campaignId: true },
      });

      if (!targetKit) {
        throw new Error('Kit de destino não encontrado');
      }

      // Atualiza submissão
      const updatedSubmission = await tx.campaignSubmission.update({
        where: { id: transferData.submissionId },
        data: { kitId: transferData.targetKitId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true,
              avatarUrl: true,
              opticName: true,
              managerId: true,
            },
          },
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          requirement: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitType: true,
            },
          },
          kit: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      // Registra atividade
      await logSubmissionActivity(
        submission.userId,
        ActivityType.VENDA,
        `Venda transferida: ${submission.orderNumber} - ${transferData.reason}`,
        undefined,
        undefined,
        tx
      );

      // Verifica se kits tiveram status alterado
      await Promise.all([
        checkAndUpdateKitCompletion(submission.kitId, tx), // Kit original
        checkAndUpdateKitCompletion(transferData.targetKitId, tx), // Kit destino
      ]);

      return {
        submission: updatedSubmission as FullSubmission,
        originalKit: submission.kitId,
        newKit: transferData.targetKitId,
      };
    });

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao transferir submissão:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao transferir submissão');
  }
};

/**
 * Obtém estatísticas de submissões do usuário
 */
export const getUserSubmissionStats = async (query: UserSubmissionStatsQuery): Promise<UserSubmissionStats> => {
  try {
    const { userId, period, campaignId, includeBreakdown } = query;

    // Define período de consulta
    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0); // Desde o início
      }

      if (period !== 'all') {
        dateFilter = {
          submissionDate: { gte: startDate },
        };
      }
    }

    // Constrói where
    const where: any = {
      userId,
      ...dateFilter,
    };

    if (campaignId) {
      where.campaignId = campaignId;
    }

    // Busca estatísticas básicas
    const [
      totalSubmissions,
      submissionsByStatus,
      quantitySum,
      campaignBreakdown
    ] = await Promise.all([
      prisma.campaignSubmission.count({ where }),
      
      prisma.campaignSubmission.groupBy({
        where,
        by: ['status'],
        _count: true,
      }),
      
      prisma.campaignSubmission.aggregate({
        where,
        _sum: { quantity: true },
        _avg: { quantity: true },
      }),
      
      includeBreakdown ? prisma.campaignSubmission.groupBy({
        where,
        by: ['campaignId'],
        _count: true,
        include: {
          campaign: {
            select: { title: true },
          },
        },
      }) : Promise.resolve([]),
    ]);

    // Formata estatísticas por status
    const statusCounts = {
      [CampaignSubmissionStatus.PENDING]: 0,
      [CampaignSubmissionStatus.VALIDATED]: 0,
      [CampaignSubmissionStatus.REJECTED]: 0,
    };

    submissionsByStatus.forEach(stat => {
      statusCounts[stat.status] = stat._count;
    });

    return {
      userId,
      period,
      totalSubmissions,
      validatedSubmissions: statusCounts.VALIDATED,
      rejectedSubmissions: statusCounts.REJECTED,
      pendingSubmissions: statusCounts.PENDING,
      totalQuantity: quantitySum._sum.quantity || 0,
      averageQuantityPerSubmission: Math.round(quantitySum._avg.quantity || 0),
      submissionsByStatus: statusCounts,
      campaignBreakdown: includeBreakdown ? campaignBreakdown.map((cb: any) => ({
        campaignId: cb.campaignId,
        campaignTitle: cb.campaign?.title || 'Campanha Desconhecida',
        submissions: cb._count,
        validated: 0, // Seria calculado com query adicional
      })) : undefined,
    };

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao obter estatísticas de submissões:', error);
    throw new Error('Erro interno ao obter estatísticas');
  }
};

/**
 * Obtém submissões por kit
 */
export const getSubmissionsByKit = async (
  kitId: string,
  pagination?: { page: number; limit: number }
) => {
  try {
    const { page = 1, limit = 20 } = pagination || {};
    const { skip, take } = prismaUtils.buildPagination(page, limit);

    const submissions = await prisma.campaignSubmission.findMany({
      where: { kitId },
      skip,
      take,
      orderBy: { submissionDate: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            managerId: true,
          },
        },
        requirement: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitType: true,
          },
        },
      },
    });

    return submissions;

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao buscar submissões do kit:', error);
    throw new Error('Erro interno ao buscar submissões do kit');
  }
};

/**
 * Obtém submissões por requisito
 */
export const getSubmissionsByRequirement = async (
  requirementId: string,
  options?: { 
    page?: number; 
    limit?: number; 
    status?: CampaignSubmissionStatus 
  }
) => {
  try {
    const { page = 1, limit = 20, status } = options || {};
    const { skip, take } = prismaUtils.buildPagination(page, limit);

    const where: any = { requirementId };
    if (status) {
      where.status = status;
    }

    const submissions = await prisma.campaignSubmission.findMany({
      where,
      skip,
      take,
      orderBy: { submissionDate: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            opticName: true,
          },
        },
      },
    });

    return submissions;

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao buscar submissões por requisito:', error);
    throw new Error('Erro interno ao buscar submissões por requisito');
  }
};

/**
 * Gera relatório de submissões
 */
export const generateSubmissionReport = async (
  query: SubmissionReportQuery,
  generatedBy: string
) => {
  try {
    const {
      startDate,
      endDate,
      campaignId,
      userId,
      groupBy,
      includeDetails,
      format,
      status
    } = query;

    // Constrói filtros
    const where: any = {};

    if (startDate) where.submissionDate = { gte: new Date(startDate) };
    if (endDate) where.submissionDate = { ...where.submissionDate, lte: new Date(endDate) };
    if (campaignId) where.campaignId = campaignId;
    if (userId) where.userId = userId;
    if (status && status !== 'all') where.status = status as CampaignSubmissionStatus;

    // Busca dados agregados
    const [
      totalSubmissions,
      submissionsByStatus,
      submissionsByPeriod
    ] = await Promise.all([
      prisma.campaignSubmission.count({ where }),
      
      prisma.campaignSubmission.groupBy({
        where,
        by: ['status'],
        _count: true,
        _sum: { quantity: true },
      }),
      
      // Agrupamento por período seria implementado baseado no groupBy
      Promise.resolve([]), // Placeholder
    ]);

    const summary = {
      totalSubmissions,
      byStatus: submissionsByStatus.reduce((acc, stat) => {
        acc[stat.status] = {
          count: stat._count,
          quantity: stat._sum.quantity || 0,
        };
        return acc;
      }, {} as any),
    };

    // Busca detalhes se solicitado
    let details: any[] = [];
    if (includeDetails) {
      details = await prisma.campaignSubmission.findMany({
        where,
        take: 1000, // Limita para evitar sobrecarga
        include: {
          user: { select: { name: true, email: true, opticName: true } },
          campaign: { select: { title: true } },
          requirement: { select: { description: true } },
        },
        orderBy: { submissionDate: 'desc' },
      });
    }

    return {
      summary,
      details: includeDetails ? details : undefined,
      query,
      generatedBy,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[SUBMISSION_SERVICE] Erro ao gerar relatório:', error);
    throw new Error('Erro interno ao gerar relatório de submissões');
  }
};
