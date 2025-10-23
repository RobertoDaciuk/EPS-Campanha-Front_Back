/**
 * @file earning.service.ts
 * @version 1.0.0
 * @description Serviço para gestão de ganhos e distribuição de pontos.
 * @author DevEPS
 * @date 2023-10-22
 */

import { prisma, prismaUtils } from '../lib/prismaClient';
import { Earning, EarningType, UserRole, ActivityType } from '@prisma/client';
import { AuthenticatedUser } from '../middleware/auth.middleware';
import { createActivity } from './activity.service'; // Será criado na próxima etapa

// Interface para dados de criação de Earning
interface CreateEarningData {
  type: EarningType;
  userId: string;
  campaignId: string;
  kitId: string;
  amount: number;
  description: string;
  sourceUserName?: string;
}

/**
 * Cria um novo registro de ganho e atualiza os pontos do usuário de forma transacional.
 * @param data - Os dados para a criação do ganho.
 * @param tx - Opcional. Um cliente Prisma transacional.
 * @returns O registro de ganho criado.
 */
export async function createEarning(data: CreateEarningData, tx?: any) {
  const prismaClient = tx || prisma;

  return prismaClient.$transaction(async (transactionClient: any) => {
    // 1. Cria o registro do ganho
    const earning = await transactionClient.earning.create({
      data: {
        ...data,
        // Dados adicionais para denormalização e auditoria
        user: { connect: { id: data.userId } },
        campaign: { connect: { id: data.campaignId } },
        userName: (await transactionClient.user.findUnique({ where: { id: data.userId } }))?.name || '',
        campaignTitle: (await transactionClient.campaign.findUnique({ where: { id: data.campaignId } }))?.title || '',
        userAvatarUrl: (await transactionClient.user.findUnique({ where: { id: data.userId } }))?.avatarUrl || '',
      },
    });

    // 2. Adiciona os pontos ao usuário
    await transactionClient.user.update({
      where: { id: data.userId },
      data: {
        points: {
          increment: data.amount,
        },
      },
    });

    // 3. (Opcional, mas recomendado) Registra uma atividade
    // Nota: O serviço de atividade não pode ser transacional da mesma forma se for em outro escopo.
    // Por simplicidade, chamamos fora da transação ou passamos a `transactionClient` para ele.
    // A implementação atual assume que `createActivity` pode aceitar um `tx`.
    await createActivity(
      {
        userId: data.userId,
        type: ActivityType.CONQUISTA,
        description: data.description,
        points: data.amount,
      },
      transactionClient
    );

    return earning;
  });
}

/**
 * Lista os ganhos com base em filtros e permissões do usuário.
 * @param filters - Filtros para a consulta.
 * @param user - O usuário autenticado que faz a requisição.
 * @returns Uma lista paginada de ganhos.
 */
export async function listEarnings(filters: any, user: AuthenticatedUser) {
  const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = filters;
  const where: any = {};

  // Regras de Acesso
  if (user.role === UserRole.VENDEDOR) {
    // Vendedor só pode ver seus próprios ganhos
    where.userId = user.id;
  } else if (user.role === UserRole.GERENTE) {
    // Gerente vê os seus ganhos e os de sua equipe
    const sellerIds = (await prisma.user.findMany({ where: { managerId: user.id } })).map((s) => s.id);
    where.OR = [{ userId: user.id }, { userId: { in: sellerIds } }];
  }
  // ADMIN pode ver tudo (nenhum filtro de permissão adicional)

  // Aplica outros filtros da query
  if (filters.userId && user.role === UserRole.ADMIN) {
    where.userId = filters.userId;
  }
  if (filters.campaignId) {
    where.campaignId = filters.campaignId;
  }
  if (filters.type) {
    where.type = filters.type;
  }

  const [earnings, total] = await prisma.$transaction([
    prisma.earning.findMany({
      where,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        campaign: { select: { title: true } },
      },
      ...prismaUtils.getPagination(page, limit),
      orderBy: { [sort]: order },
    }),
    prisma.earning.count({ where }),
  ]);

  return prismaUtils.formatPaginatedResult(earnings, total, page, limit);
}
