/**
 * @file submission.service.ts
 * @version 1.1.0
 * @description Serviços robustos para a gestão completa de submissões de vendas.
 * @author DevEPS
 * @date 2023-10-22
 */

import { prisma, prismaUtils } from '../lib/prismaClient';
import {
  CampaignSubmissionStatus,
  CampaignKitStatus,
  UserRole,
  ActivityType,
  EarningType,
} from '@prisma/client';
import {
  CreateSubmissionData,
  UpdateSubmissionData,
  SubmissionFilters,
  ValidateSubmissionData,
  BulkValidateSubmissionsData,
} from '../schemas/submission.schema';
import { AuthenticatedUser } from '../middleware/auth.middleware';
import { createActivity } from './activity.service';
import { createEarning } from './earning.service';

// =================================================================
//                      FUNÇÕES AUXILIARES
// =================================================================

/**
 * Valida se um usuário tem permissão para visualizar ou modificar uma submissão.
 * @param submission - A submissão a ser verificada.
 * @param user - O usuário autenticado.
 * @throws Error se o usuário não tiver permissão.
 */
function authorizeSubmissionAccess(submission: { userId: string; user: { managerId?: string | null } }, user: AuthenticatedUser) {
  const isOwner = submission.userId === user.id;
  const isManager = user.role === UserRole.GERENTE && submission.user.managerId === user.id;
  const isAdmin = user.role === UserRole.ADMIN;

  if (!isOwner && !isManager && !isAdmin) {
    throw new Error('Acesso negado. Você não tem permissão para acessar esta submissão.');
  }
}

/**
 * Encontra ou cria um kit ativo para um usuário em uma campanha.
 * @param campaignId - ID da campanha.
 * @param userId - ID do usuário.
 * @param tx - Cliente Prisma transacional.
 * @returns O ID do kit ativo.
 */
async function getOrCreateActiveKit(campaignId: string, userId: string, tx: any) {
  const existingKit = await tx.campaignKit.findFirst({
    where: { campaignId, userId, status: CampaignKitStatus.IN_PROGRESS },
  });
  if (existingKit) {
    return existingKit.id;
  }
  const newKit = await tx.campaignKit.create({
    data: { campaignId, userId },
  });
  return newKit.id;
}

/**
 * Processa a conclusão de um kit, gerando ganhos e notificações.
 * @param kitId - ID do kit concluído.
 * @param tx - Cliente Prisma transacional.
 */
async function processKitCompletion(kitId: string, tx: any) {
  const kit = await tx.campaignKit.findUnique({
    where: { id: kitId },
    include: {
      campaign: true,
      user: { include: { manager: true } },
      submissions: { where: { status: CampaignSubmissionStatus.VALIDATED } },
    },
  });

  if (!kit || kit.status === CampaignKitStatus.COMPLETED) return;

  const allGoalsMet = kit.campaign.goalRequirements.every((req: any) => {
    const totalQuantity = kit.submissions
      .filter((sub: any) => sub.requirementId === req.id)
      .reduce((sum: any, sub: any) => sum + sub.quantity, 0);
    return totalQuantity >= req.quantity;
  });

  if (allGoalsMet) {
    await tx.campaignKit.update({
      where: { id: kitId },
      data: { status: CampaignKitStatus.COMPLETED },
    });

    // Cria ganhos para o vendedor e gerente pela conclusão do kit
    await createEarning(
      {
        type: EarningType.SELLER,
        userId: kit.userId,
        campaignId: kit.campaignId,
        kitId: kit.id,
        amount: kit.campaign.pointsOnCompletion || 0,
        description: `Parabéns! Você completou a cartela ${kit.campaign.title}.`,
      },
      tx
    );

    if (kit.user.manager && kit.campaign.managerPointsPercentage) {
      const managerAmount = (kit.campaign.pointsOnCompletion || 0) * (kit.campaign.managerPointsPercentage / 100);
      await createEarning(
        {
          type: EarningType.MANAGER,
          userId: kit.user.manager.id,
          campaignId: kit.campaignId,
          kitId: kit.id,
          amount: managerAmount,
          description: `Seu vendedor ${kit.user.name} completou a cartela ${kit.campaign.title}.`,
          sourceUserName: kit.user.name,
        },
        tx
      );
    }

    await createActivity({
      userId: kit.userId,
      type: ActivityType.CONQUISTA,
      description: `Cartela da campanha "${kit.campaign.title}" foi concluída!`,
      points: kit.campaign.pointsOnCompletion,
    });
  }
}

// =================================================================
//                      SERVIÇOS PRINCIPAIS
// =================================================================

export async function createSubmission(data: CreateSubmissionData, user: AuthenticatedUser) {
  const { campaignId, requirementId, orderNumber } = data;

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'ATIVA') {
      throw new Error('A campanha não está ativa ou não existe.');
    }
    const requirement = await tx.goalRequirement.findUnique({ where: { id: requirementId } });
    if (!requirement || requirement.campaignId !== campaignId) {
      throw new Error('Requisito inválido para esta campanha.');
    }
    const existingOrder = await tx.campaignSubmission.findUnique({ where: { orderNumber } });
    if (existingOrder) {
      throw new Error('Este número de pedido já foi submetido.');
    }

    const kitId = await getOrCreateActiveKit(campaignId, user.id, tx);

    const submission = await tx.campaignSubmission.create({
      data: {
        ...data,
        userId: user.id,
        kitId,
      },
    });

    await createActivity({
      userId: user.id,
      type: ActivityType.VENDA,
      description: `Nova venda submetida: ${orderNumber}.`,
    });

    return submission;
  });
}

export async function listSubmissions(filters: SubmissionFilters, user: AuthenticatedUser) {
  const { page = 1, limit = 10, sort = 'createdAt', order = 'desc', userId } = filters;
  const where: any = { ...filters };

  // Aplica regras de permissão
  if (user.role === UserRole.VENDEDOR) {
    where.userId = user.id;
  } else if (user.role === UserRole.GERENTE) {
    if (userId) {
      // Gerente pode ver um vendedor específico da sua equipe
      const seller = await prisma.user.findFirst({ where: { id: userId, managerId: user.id } });
      if (!seller) throw new Error('Vendedor não encontrado na sua equipe.');
      where.userId = userId;
    } else {
      // Ou todos os vendedores da sua equipe
      const sellerIds = (await prisma.user.findMany({ where: { managerId: user.id } })).map((s) => s.id);
      where.userId = { in: sellerIds };
    }
  }

  const [submissions, total] = await prisma.$transaction([
    prisma.campaignSubmission.findMany({
      where,
      include: { user: true, campaign: true, requirement: true },
      ...prismaUtils.getPagination(page, limit),
      orderBy: { [sort]: order },
    }),
    prisma.campaignSubmission.count({ where }),
  ]);

  return prismaUtils.formatPaginatedResult(submissions, total, page, limit);
}

export async function getSubmissionById(id: string, user: AuthenticatedUser) {
  const submission = await prisma.campaignSubmission.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!submission) throw new Error('Submissão não encontrada.');
  authorizeSubmissionAccess(submission, user);
  return submission;
}

export async function updateSubmission(id: string, data: UpdateSubmissionData, user: AuthenticatedUser) {
  const submission = await getSubmissionById(id, user); // Já faz a checagem de permissão
  if (submission.status !== CampaignSubmissionStatus.PENDING) {
    throw new Error('Apenas submissões pendentes podem ser alteradas.');
  }

  return prisma.campaignSubmission.update({
    where: { id },
    data,
  });
}

export async function deleteSubmission(id: string, user: AuthenticatedUser) {
  const submission = await getSubmissionById(id, user);
  if (submission.status !== CampaignSubmissionStatus.PENDING) {
    throw new Error('Apenas submissões pendentes podem ser deletadas.');
  }
  await prisma.campaignSubmission.delete({ where: { id } });
}

export async function validateSubmission(id: string, data: ValidateSubmissionData, validator: AuthenticatedUser) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.campaignSubmission.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!submission) throw new Error('Submissão não encontrada.');
    authorizeSubmissionAccess(submission, validator); // Garante que o gerente só valide sua equipe

    const updatedSubmission = await tx.campaignSubmission.update({
      where: { id },
      data: { status: data.status, validationMessage: data.validationMessage },
    });

    if (data.status === CampaignSubmissionStatus.VALIDATED) {
      await processKitCompletion(submission.kitId, tx);
    }

    await createActivity({
      userId: submission.userId,
      type: ActivityType.ADMIN_ACTION,
      description: `Sua submissão ${submission.orderNumber} foi ${data.status === 'VALIDATED' ? 'validada' : 'rejeitada'}.`,
    });

    return updatedSubmission;
  });
}

export async function bulkValidateSubmissions(data: BulkValidateSubmissionsData, validator: AuthenticatedUser) {
  const results = { validated: 0, rejected: 0, failed: 0 };
  for (const id of data.submissionIds) {
    try {
      await validateSubmission(id, { status: data.action === 'validate' ? 'VALIDATED' : 'REJECTED', validationMessage: data.validationMessage }, validator);
      if (data.action === 'validate') results.validated++;
      else results.rejected++;
    } catch {
      results.failed++;
    }
  }
  return results;
}

export async function getPendingSubmissions(filters: SubmissionFilters, user: AuthenticatedUser) {
  return listSubmissions({ ...filters, status: CampaignSubmissionStatus.PENDING }, user);
}

export async function getUserSubmissionStats(userId: string) {
  const [total, validated, rejected, pending] = await prisma.$transaction([
    prisma.campaignSubmission.count({ where: { userId } }),
    prisma.campaignSubmission.count({ where: { userId, status: 'VALIDATED' } }),
    prisma.campaignSubmission.count({ where: { userId, status: 'REJECTED' } }),
    prisma.campaignSubmission.count({ where: { userId, status: 'PENDING' } }),
  ]);
  return { total, validated, rejected, pending };
}

export async function getSubmissionsByKit(kitId: string, user: AuthenticatedUser) {
  const kit = await prisma.campaignKit.findUnique({ where: { id: kitId } });
  if (!kit) throw new Error('Kit não encontrado.');
  if (kit.userId !== user.id && user.role !== UserRole.ADMIN) {
    // Adicionar verificação de gerente
    throw new Error('Acesso negado.');
  }
  return prisma.campaignSubmission.findMany({ where: { kitId } });
}
