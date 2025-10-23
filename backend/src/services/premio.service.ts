/**
 * @file premio.service.ts
 * @version 1.0.0
 * @description Serviços para a gestão de prêmios, resgates e estoque.
 * @author DevEPS
 * @date 2023-10-21
 */

import { prisma, prismaUtils } from '../lib/prismaClient';
import {
  CreatePremioData,
  UpdatePremioData,
  PremioFilters,
  UpdateStockData,
  BulkPremioImportData,
} from '../schemas/premio.schema';
import { createActivity } from './activity.service';
import { ActivityType } from '@prisma/client';

/**
 * Cria um novo prêmio no catálogo.
 * @param premioData - Dados do prêmio a ser criado.
 * @param adminId - ID do administrador que está criando o prêmio.
 * @returns O prêmio recém-criado.
 */
export async function createPremio(premioData: CreatePremioData, adminId: string) {
  const premio = await prisma.premio.create({
    data: premioData,
  });
  await createActivity({
    userId: adminId,
    type: ActivityType.ADMIN_ACTION,
    description: `Criou o prêmio: ${premio.title}`,
  });
  return premio;
}

/**
 * Lista todos os prêmios com base em filtros, paginação e contexto do usuário.
 * @param filters - Critérios de filtro e paginação.
 * @param userId - ID do usuário para contextualizar a disponibilidade.
 * @returns Uma lista paginada de prêmios.
 */
export async function listPremios(filters: PremioFilters, userId: string) {
  const { page = 1, limit = 10, sort = 'createdAt', order = 'desc', search } = filters;
  const where: any = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [premios, total] = await prisma.$transaction([
    prisma.premio.findMany({
      where,
      ...prismaUtils.getPagination(page, limit),
      orderBy: { [sort]: order },
    }),
    prisma.premio.count({ where }),
  ]);

  return prismaUtils.formatPaginatedResult(premios, total, page, limit);
}

/**
 * Busca um prêmio específico pelo seu ID.
 * @param premioId - ID do prêmio.
 * @returns O prêmio encontrado ou nulo.
 */
export async function getPremioById(premioId: string) {
  return prisma.premio.findUnique({ where: { id: premioId } });
}

/**
 * Atualiza os dados de um prêmio existente.
 * @param premioId - ID do prêmio a ser atualizado.
 * @param premioData - Dados a serem atualizados.
 * @param adminId - ID do administrador que realiza a operação.
 * @returns O prêmio atualizado.
 */
export async function updatePremio(
  premioId: string,
  premioData: UpdatePremioData,
  adminId: string
) {
  const premio = await prisma.premio.update({
    where: { id: premioId },
    data: premioData,
  });
  await createActivity({
    userId: adminId,
    type: ActivityType.ADMIN_ACTION,
    description: `Atualizou o prêmio: ${premio.title}`,
  });
  return premio;
}

/**
 * Deleta um prêmio do catálogo.
 * @param premioId - ID do prêmio a ser deletado.
 * @param adminId - ID do administrador que realiza a operação.
 */
export async function deletePremio(premioId: string, adminId: string) {
  // Verifica se existem resgates associados antes de deletar.
  const redemptionCount = await prisma.premioRedemption.count({
    where: { premioId },
  });
  if (redemptionCount > 0) {
    throw new Error('Não é possível deletar prêmios que já foram resgatados.');
  }

  const premio = await prisma.premio.delete({ where: { id: premioId } });
  await createActivity({
    userId: adminId,
    type: ActivityType.ADMIN_ACTION,
    description: `Deletou o prêmio: ${premio.title}`,
  });
}

/**
 * Executa o resgate de um prêmio para um usuário.
 * A operação é transacional para garantir a consistência dos dados.
 * @param premioId - ID do prêmio a ser resgatado.
 * @param userId - ID do usuário que está resgatando.
 * @returns O registro do resgate.
 */
export async function redeemPremio(premioId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const premio = await tx.premio.findUnique({ where: { id: premioId } });
    const user = await tx.user.findUnique({ where: { id: userId } });

    if (!premio) throw new Error('Prêmio não encontrado.');
    if (!user) throw new Error('Usuário não encontrado.');
    if (premio.stock <= 0) throw new Error('Prêmio fora de estoque.');
    if (user.points < premio.pointsRequired) throw new Error('Pontos insuficientes.');

    // 1. Deduz o estoque do prêmio
    await tx.premio.update({
      where: { id: premioId },
      data: { stock: { decrement: 1 } },
    });

    // 2. Deduz os pontos do usuário
    await tx.user.update({
      where: { id: userId },
      data: { points: { decrement: premio.pointsRequired } },
    });

    // 3. Cria o registro do resgate
    const redemption = await tx.premioRedemption.create({
      data: {
        premioId,
        userId,
        pointsRedeemed: premio.pointsRequired,
        status: 'COMPLETED', // Simplificado por enquanto
      },
    });

    // 4. Cria um registro de atividade
    await createActivity({
      userId,
      type: ActivityType.PREMIO_RESGATADO,
      description: `Resgatou o prêmio: ${premio.title}`,
      points: -premio.pointsRequired,
    });

    return redemption;
  });
}

/**
 * Retorna os prêmios disponíveis para um usuário, considerando seus pontos e o estoque.
 * @param userId - ID do usuário.
 * @returns Lista de prêmios disponíveis.
 */
export async function getAvailablePremiosForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  if (!user) throw new Error('Usuário não encontrado.');

  return prisma.premio.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      pointsRequired: { lte: user.points },
    },
    orderBy: {
      pointsRequired: 'asc',
    },
  });
}

/**
 * Verifica se um usuário pode resgatar um prêmio específico.
 * @param premioId - ID do prêmio.
 * @param userId - ID do usuário.
 * @returns Objeto indicando se o resgate é possível e o motivo.
 */
export async function canUserRedeemPremio(premioId: string, userId: string) {
  const [premio, user] = await Promise.all([
    prisma.premio.findUnique({ where: { id: premioId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!premio) return { canRedeem: false, reason: 'Prêmio não encontrado.' };
  if (!user) return { canRedeem: false, reason: 'Usuário não encontrado.' };
  if (premio.stock <= 0) return { canRedeem: false, reason: 'Fora de estoque.' };
  if (user.points < premio.pointsRequired)
    return { canRedeem: false, reason: 'Pontos insuficientes.' };

  return {
    canRedeem: true,
    details: { userPoints: user.points, requiredPoints: premio.pointsRequired },
  };
}

/**
 * Atualiza o estoque de um prêmio.
 * @param premioId - ID do prêmio.
 * @param stockData - Dados da atualização de estoque.
 * @param adminId - ID do administrador que realiza a operação.
 * @returns O prêmio com o estoque atualizado.
 */
export async function updatePremioStock(
  premioId: string,
  stockData: UpdateStockData,
  adminId: string
) {
  const { operation, quantity, reason } = stockData;
  const updateOperation =
    operation === 'add' ? { increment: quantity } : { decrement: quantity };

  const premio = await prisma.premio.update({
    where: { id: premioId },
    data: { stock: updateOperation },
  });

  await createActivity({
    userId: adminId,
    type: ActivityType.ADMIN_ACTION,
    description: `Ajuste de estoque para ${premio.title}: ${operation} ${quantity}. Motivo: ${reason}`,
  });

  return premio;
}

/**
 * Repõe o estoque de um prêmio.
 * @param premioId - ID do prêmio.
 * @param quantity - Quantidade a ser adicionada.
 * @param adminId - ID do administrador.
 * @returns O prêmio com o estoque atualizado.
 */
export async function restockPremio(premioId: string, quantity: number, adminId: string) {
  return updatePremioStock(
    premioId,
    { operation: 'add', quantity, reason: 'Reposição de estoque' },
    adminId
  );
}

/**
 * Retorna estatísticas gerais sobre os prêmios.
 * @returns Objeto com as estatísticas.
 */
export async function getPremioStats() {
  const [totalPremios, totalRedemptions, totalPointsRedeemed] = await prisma.$transaction([
    prisma.premio.count(),
    prisma.premioRedemption.count(),
    prisma.premioRedemption.aggregate({ _sum: { pointsRedeemed: true } }),
  ]);

  return {
    totalPremios,
    totalRedemptions,
    totalPointsRedeemed: totalPointsRedeemed._sum.pointsRedeemed || 0,
  };
}

/**
 * Retorna o catálogo público de prêmios.
 * @param filters - Critérios de filtro.
 * @returns Lista paginada de prêmios.
 */
export async function getPublicCatalog(filters: PremioFilters) {
  const { page = 1, limit = 10, sort = 'priority', order = 'desc' } = filters;
  const where = { isActive: true, stock: { gt: 0 } };

  const [premios, total] = await prisma.$transaction([
    prisma.premio.findMany({
      where,
      ...prismaUtils.getPagination(page, limit),
      orderBy: { [sort]: order },
    }),
    prisma.premio.count({ where }),
  ]);

  return prismaUtils.formatPaginatedResult(premios, total, page, limit);
}

/**
 * Retorna os prêmios mais populares com base no número de resgates.
 * @param limit - Número de prêmios a serem retornados.
 * @returns Lista de prêmios populares.
 */
export async function getPopularPremios(limit: number) {
  const popular = await prisma.premioRedemption.groupBy({
    by: ['premioId'],
    _count: { premioId: true },
    orderBy: { _count: { premioId: 'desc' } },
    take: limit,
  });

  const premioIds = popular.map((p) => p.premioId);
  return prisma.premio.findMany({ where: { id: { in: premioIds } } });
}

/**
 * Retorna o histórico de resgates de um usuário.
 * @param userId - ID do usuário.
 * @param page - Página da consulta.
 * @param limit - Limite de itens por página.
 * @returns Histórico paginado de resgates.
 */
export async function getUserRedemptionHistory(userId: string, page: number, limit: number) {
  const where = { userId };
  const [redemptions, total] = await prisma.$transaction([
    prisma.premioRedemption.findMany({
      where,
      include: { premio: true },
      ...prismaUtils.getPagination(page, limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.premioRedemption.count({ where }),
  ]);

  return prismaUtils.formatPaginatedResult(redemptions, total, page, limit);
}

/**
 * Lista prêmios com estoque abaixo de um determinado limite.
 * @param threshold - Limite de estoque.
 * @returns Lista de prêmios com baixo estoque.
 */
export async function getLowStockPremios(threshold: number) {
  return prisma.premio.findMany({
    where: { isActive: true, stock: { lte: threshold, gt: 0 } },
    orderBy: { stock: 'asc' },
  });
}

/**
 * Lista prêmios com estoque esgotado.
 * @returns Lista de prêmios esgotados.
 */
export async function getOutOfStockPremios() {
  return prisma.premio.findMany({
    where: { stock: { lte: 0 } },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Importa uma lista de prêmios em lote.
 * @param importData - Dados da importação.
 * @param adminId - ID do administrador.
 * @returns Resultado da importação.
 */
export async function bulkImportPremios(
  importData: BulkPremioImportData,
  adminId: string
) {
  const { premios } = importData;
  const result = await prisma.premio.createMany({
    data: premios,
    skipDuplicates: true,
  });

  await createActivity({
    userId: adminId,
    type: ActivityType.ADMIN_ACTION,
    description: `Importou em lote ${result.count} prêmios.`,
  });

  return {
    success: true,
    message: `${result.count} prêmios importados com sucesso.`,
    count: result.count,
  };
}
