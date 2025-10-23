/**
 * @file activity.service.ts
 * @version 1.0.0
 * @description Serviço para registrar atividades importantes dos usuários.
 * @author DevEPS
 * @date 2023-10-22
 */

import { prisma } from '../lib/prismaClient';
import { ActivityType } from '@prisma/client';

// Interface para os dados de uma atividade
export interface ActivityData {
  userId: string;
  type: ActivityType;
  description: string;
  points?: number;
  value?: number;
  metadata?: any;
}

/**
 * Cria e salva um novo item de atividade no banco de dados.
 * Esta função é projetada para ser chamada por outros serviços para auditoria e histórico.
 * @param data - Os dados da atividade a ser registrada.
 * @param tx - Opcional. Um cliente Prisma transacional para garantir a atomicidade.
 * @returns O item de atividade criado.
 */
export async function createActivity(data: ActivityData, tx?: any) {
  const prismaClient = tx || prisma;

  try {
    const activityItem = await prismaClient.activityItem.create({
      data: {
        userId: data.userId,
        type: data.type,
        description: data.description,
        points: data.points,
        value: data.value,
        metadata: data.metadata,
      },
    });
    return activityItem;
  } catch (error) {
    // A falha no registro de atividade não deve quebrar a operação principal.
    // Apenas logamos o erro para futura investigação.
    console.error(`[ActivityService] Falha ao registrar atividade para o usuário ${data.userId}:`, error);
    // Retornamos null para indicar que a criação da atividade falhou, mas sem lançar exceção.
    return null;
  }
}

/**
 * Lista as atividades de um usuário específico com paginação.
 * @param userId - O ID do usuário cujo histórico de atividades será buscado.
 * @param filters - Opções de paginação (page, limit).
 * @returns Uma lista paginada de atividades.
 */
export async function listUserActivities(userId: string, filters: { page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = filters;

  const where = { userId };

  const [activities, total] = await prisma.$transaction([
    prisma.activityItem.findMany({
      where,
      ...prismaUtils.getPagination(page, limit),
      orderBy: {
        timestamp: 'desc',
      },
    }),
    prisma.activityItem.count({ where }),
  ]);

  return prismaUtils.formatPaginatedResult(activities, total, page, limit);
}
