/**
 * @file user.service.ts
 * @version 1.0.0
 * @description Serviço para a gestão de usuários e permissões.
 * @author DevEPS
 * @date 2023-10-22
 */

import { prisma, prismaUtils } from '../lib/prismaClient';
import { User, UserRole, UserStatus } from '@prisma/client';
import { AuthenticatedUser } from '../middleware/auth.middleware';
import { createActivity } from './activity.service'; // Será criado na próxima etapa
import { ActivityType } from '@prisma/client';

// Interface para dados de atualização de usuário
interface UpdateUserData {
  name?: string;
  whatsapp?: string;
  avatarUrl?: string;
  opticName?: string;
  opticCNPJ?: string;
  // Campos que só o admin pode mudar
  role?: UserRole;
  status?: UserStatus;
  managerId?: string | null;
}

/**
 * Lista usuários com base em filtros e nas permissões do requisitante.
 * @param filters - Filtros para a consulta (nome, email, role, etc.).
 * @param currentUser - O usuário autenticado que está fazendo a requisição.
 * @returns Uma lista paginada de usuários.
 */
export async function listUsers(filters: any, currentUser: AuthenticatedUser) {
  const { page = 1, limit = 10, sort = 'name', order = 'asc' } = filters;
  const where: any = {};

  // Regras de Acesso
  if (currentUser.role === UserRole.GERENTE) {
    // Gerente só pode listar os vendedores da sua equipe.
    where.managerId = currentUser.id;
  } else if (currentUser.role !== UserRole.ADMIN) {
    // Vendedores não podem listar outros usuários. Retorna lista vazia.
    return prismaUtils.formatPaginatedResult([], 0, page, limit);
  }

  // Aplica filtros de busca se for Admin
  if (currentUser.role === UserRole.ADMIN) {
    if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' };
    if (filters.email) where.email = { contains: filters.email, mode: 'insensitive' };
    if (filters.cpf) where.cpf = { equals: filters.cpf };
    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        opticName: true,
        createdAt: true,
      }, // Evita expor o hash da senha
      ...prismaUtils.getPagination(page, limit),
      orderBy: { [sort]: order },
    }),
    prisma.user.count({ where }),
  ]);

  return prismaUtils.formatPaginatedResult(users, total, page, limit);
}

/**
 * Busca um usuário pelo ID, verificando as permissões de acesso.
 * @param userId - O ID do usuário a ser buscado.
 * @param currentUser - O usuário autenticado.
 * @returns O objeto do usuário (sem dados sensíveis) ou nulo se não encontrado.
 * @throws Error se o acesso for negado.
 */
export async function getUserById(userId: string, currentUser: AuthenticatedUser) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, cpf: true, whatsapp: true, avatarUrl: true, role: true, status: true,
      opticName: true, opticCNPJ: true, level: true, points: true, managerId: true,
      manager: { select: { id: true, name: true } },
      sellers: { select: { id: true, name: true, avatarUrl: true } }
    },
  });

  if (!user) return null;

  // Regras de Acesso
  const isSelf = user.id === currentUser.id;
  const isManagerViewingSeller = currentUser.role === UserRole.GERENTE && user.managerId === currentUser.id;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  if (!isSelf && !isManagerViewingSeller && !isAdmin) {
    throw new Error('Acesso negado.');
  }

  return user;
}

/**
 * Atualiza os dados de um usuário.
 * @param userId - O ID do usuário a ser atualizado.
 * @param data - Os dados a serem atualizados.
 * @param currentUser - O usuário autenticado que realiza a operação.
 * @returns O usuário atualizado.
 * @throws Error se a operação for não autorizada.
 */
export async function updateUser(userId: string, data: UpdateUserData, currentUser: AuthenticatedUser) {
  const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
  if (!userToUpdate) throw new Error('Usuário não encontrado.');

  const isSelf = userId === currentUser.id;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  const allowedData: UpdateUserData = {};

  // Usuário comum só pode alterar seus próprios dados não-críticos
  if (isSelf) {
    if (data.name) allowedData.name = data.name;
    if (data.whatsapp) allowedData.whatsapp = data.whatsapp;
    if (data.avatarUrl) allowedData.avatarUrl = data.avatarUrl;
  }

  // Admin pode alterar dados críticos
  if (isAdmin) {
    Object.assign(allowedData, data);
    // Garante que um gerente não possa ser seu próprio gerente
    if (allowedData.managerId && allowedData.managerId === userId) {
      delete allowedData.managerId;
    }
  } else {
    // Ninguém além do admin pode mudar role, status ou manager
    delete data.role;
    delete data.status;
    delete data.managerId;
  }

  if (Object.keys(allowedData).length === 0) {
    throw new Error('Nenhuma alteração permitida.');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: allowedData,
  });

  await createActivity({
    userId: currentUser.id,
    type: ActivityType.ADMIN_ACTION,
    description: `Dados do usuário ${userToUpdate.name} (ID: ${userId}) foram atualizados.`,
  });

  return updatedUser;
}

/**
 * Altera o status de um usuário (ex: para BLOQUEADO).
 * Apenas administradores podem realizar esta ação.
 * @param userId - ID do usuário a ter o status alterado.
 * @param newStatus - O novo status do usuário.
 * @param adminUser - O administrador que realiza a operação.
 * @returns O usuário com o status atualizado.
 */
export async function setUserStatus(userId: string, newStatus: UserStatus, adminUser: AuthenticatedUser) {
  if (adminUser.role !== UserRole.ADMIN) {
    throw new Error('Apenas administradores podem alterar o status de um usuário.');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });

  await createActivity({
    userId: adminUser.id,
    type: newStatus === 'BLOCKED' ? ActivityType.ADMIN_USER_BLOCKED : ActivityType.ADMIN_ACTION,
    description: `O status do usuário ${user.name} foi alterado para ${newStatus}.`,
  });

  return user;
}
