/**
 * @file notification.service.ts
 * @version 1.0.0
 * @description Serviço para gerenciar notificações dos usuários.
 * @author DevEPS
 * @date 2023-10-22
 */

import { prisma, prismaUtils } from '../lib/prismaClient';
import { AuthenticatedUser } from '../middleware/auth.middleware';

// Interface para dados de criação de notificação
export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type?: string; // Ex: 'SUCCESS', 'ERROR', 'INFO'
  metadata?: any; // Ex: { link: '/submission/xyz' }
}

/**
 * Cria uma nova notificação para um usuário.
 * @param data - Os dados da notificação.
 * @param tx - Opcional. Cliente Prisma transacional.
 * @returns A notificação criada.
 */
export async function createNotification(data: CreateNotificationData, tx?: any) {
  const prismaClient = tx || prisma;
  try {
    return await prismaClient.notification.create({
      data,
    });
  } catch (error) {
    console.error(`[NotificationService] Falha ao criar notificação para o usuário ${data.userId}:`, error);
    return null;
  }
}

/**
 * Busca as notificações de um usuário, com opção de filtrar por lidas/não lidas.
 * @param user - O usuário autenticado.
 * @param filters - Filtros de paginação e status de leitura.
 * @returns Uma lista paginada de notificações.
 */
export async function getUserNotifications(user: AuthenticatedUser, filters: { page?: number; limit?: number; isRead?: boolean }) {
  const { page = 1, limit = 10, isRead } = filters;
  const where: any = { userId: user.id };

  if (typeof isRead === 'boolean') {
    where.isRead = isRead;
  }

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      ...prismaUtils.getPagination(page, limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);

  return prismaUtils.formatPaginatedResult(notifications, total, page, limit);
}

/**
 * Marca uma notificação específica como lida.
 * @param notificationId - O ID da notificação.
 * @param user - O usuário autenticado (para garantir que só o dono possa marcar).
 * @returns A notificação atualizada.
 * @throws Error se a notificação não pertencer ao usuário.
 */
export async function markNotificationAsRead(notificationId: string, user: AuthenticatedUser) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== user.id) {
    throw new Error('Notificação não encontrada ou acesso negado.');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Marca todas as notificações não lidas de um usuário como lidas.
 * @param user - O usuário autenticado.
 * @returns O resultado da operação em lote (batch).
 */
export async function markAllNotificationsAsRead(user: AuthenticatedUser) {
  return prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}
