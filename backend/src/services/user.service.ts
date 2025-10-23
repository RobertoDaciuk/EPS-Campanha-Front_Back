/**
 * @file user.service.ts
 * @version 2.0.0
 * @description Serviços para gerenciamento de usuários no sistema EPS Campanhas.
 * Inclui CRUD completo, gestão de hierarquias, pontuação e relatórios.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos serviços de usuário
 * - Sistema de hierarquia gerente-vendedor
 * - Gestão de pontuação e níveis
 * - Relatórios e estatísticas detalhadas
 * - Operações em lote para administradores
 */

import bcrypt from 'bcrypt';
import { prisma, PrismaTransactionClient, prismaUtils } from '../../lib/prismaClient';
import { UserRole, UserStatus, ActivityType } from '@prisma/client';
import { 
  CreateUserData, 
  UpdateUserData, 
  UserFilters, 
  UpdateUserStatusData,
  ResetUserPasswordData,
  UpdateUserPointsData,
  UserStatsQuery,
  CheckAvailabilityData,
  BulkUserImportData 
} from '../schemas/user.schema';
import { 
  normalizeCPF, 
  normalizeCNPJ, 
  normalizePhone, 
  normalizeEmail,
  normalizeName,
  isValidCPF,
  isValidCNPJ,
  USER_LEVELS,
  LEVEL_POINTS 
} from '../utils/normalizers';

// ==================== INTERFACES E TIPOS ====================

/**
 * Interface para usuário completo
 */
interface FullUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  whatsapp: string;
  avatarUrl: string;
  role: UserRole;
  status: UserStatus;
  opticName: string;
  opticCNPJ: string;
  level: string;
  points: number;
  pointsToNextLevel: number;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  sellers?: {
    id: string;
    name: string;
    email: string;
    status: UserStatus;
  }[];
}

/**
 * Interface para estatísticas de usuário
 */
interface UserStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  byRole: Record<UserRole, number>;
  byLevel: Record<string, number>;
  avgPoints: number;
  topPerformers: Array<{
    id: string;
    name: string;
    points: number;
    level: string;
  }>;
  recentRegistrations: Array<{
    id: string;
    name: string;
    role: UserRole;
    createdAt: Date;
  }>;
}

/**
 * Interface para resultado de importação em lote
 */
interface BulkImportResult {
  successful: number;
  failed: number;
  details: Array<{
    email: string;
    success: boolean;
    message: string;
    userId?: string;
  }>;
}

// ==================== CONFIGURAÇÕES ====================

/**
 * Configurações de bcrypt para senhas
 */
const BCRYPT_CONFIG = {
  SALT_ROUNDS: 12,
};

/**
 * Configurações de pontuação
 */
const POINTS_CONFIG = {
  DEFAULT_INITIAL: 0,
  ADMIN_INITIAL: 99999,
  MAX_POINTS: 1000000,
  LEVEL_THRESHOLDS: LEVEL_POINTS,
};

// ==================== UTILITÁRIOS INTERNOS ====================

/**
 * Calcula o nível baseado nos pontos
 */
const calculateLevelFromPoints = (points: number): { level: string; pointsToNext: number } => {
  const levels = Object.entries(POINTS_CONFIG.LEVEL_THRESHOLDS).reverse();
  
  for (const [level, threshold] of levels) {
    if (points >= threshold) {
      // Encontra o próximo nível
      const currentIndex = USER_LEVELS.indexOf(level as any);
      const nextLevel = USER_LEVELS[currentIndex + 1];
      const nextThreshold = nextLevel ? POINTS_CONFIG.LEVEL_THRESHOLDS[nextLevel] : POINTS_CONFIG.MAX_POINTS;
      
      return {
        level,
        pointsToNext: nextThreshold - points,
      };
    }
  }
  
  return {
    level: 'Bronze',
    pointsToNext: POINTS_CONFIG.LEVEL_THRESHOLDS.Prata,
  };
};

/**
 * Gera senha aleatória para reset
 */
const generateRandomPassword = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Registra atividade do usuário
 */
const logUserActivity = async (
  userId: string,
  type: ActivityType,
  description: string,
  points?: number,
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
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('[USER_SERVICE] Erro ao registrar atividade:', error);
    // Não quebra o fluxo se atividade falhar
  }
};

// ==================== VALIDAÇÕES ====================

/**
 * Valida disponibilidade de email
 */
const validateEmailAvailability = async (
  email: string, 
  excludeUserId?: string,
  tx?: PrismaTransactionClient
): Promise<void> => {
  const client = tx || prisma;
  const normalizedEmail = normalizeEmail(email);
  
  const existing = await client.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing && existing.id !== excludeUserId) {
    throw new Error('Este e-mail já está em uso');
  }
};

/**
 * Valida disponibilidade de CPF
 */
const validateCPFAvailability = async (
  cpf: string, 
  excludeUserId?: string,
  tx?: PrismaTransactionClient
): Promise<void> => {
  const client = tx || prisma;
  const normalizedCPF = normalizeCPF(cpf);
  
  if (!isValidCPF(normalizedCPF)) {
    throw new Error('CPF inválido');
  }

  const existing = await client.user.findUnique({
    where: { cpf: normalizedCPF },
    select: { id: true },
  });

  if (existing && existing.id !== excludeUserId) {
    throw new Error('Este CPF já está cadastrado');
  }
};

/**
 * Valida hierarquia de usuários
 */
const validateUserHierarchy = async (
  role: UserRole,
  managerId?: string | null,
  tx?: PrismaTransactionClient
): Promise<void> => {
  if (role === UserRole.VENDEDOR) {
    if (!managerId) {
      throw new Error('Vendedores devem ter um gerente associado');
    }

    const client = tx || prisma;
    
    const manager = await client.user.findUnique({
      where: { id: managerId },
      select: { role: true, status: true },
    });

    if (!manager) {
      throw new Error('Gerente não encontrado');
    }

    if (manager.role !== UserRole.GERENTE) {
      throw new Error('Usuário associado não é um gerente');
    }

    if (manager.status !== UserStatus.ACTIVE) {
      throw new Error('Gerente não está ativo');
    }
  }

  if ((role === UserRole.GERENTE || role === UserRole.ADMIN) && managerId) {
    throw new Error('Gerentes e administradores não podem ter gerente associado');
  }
};

/**
 * Valida se gerente pode ser excluído
 */
const validateManagerDeletion = async (
  userId: string,
  tx?: PrismaTransactionClient
): Promise<void> => {
  const client = tx || prisma;
  
  const sellersCount = await client.user.count({
    where: { managerId: userId },
  });

  if (sellersCount > 0) {
    throw new Error('Não é possível excluir gerente que possui vendedores associados');
  }
};

// ==================== SERVIÇOS PRINCIPAIS ====================

/**
 * Cria novo usuário
 */
export const createUser = async (userData: CreateUserData): Promise<FullUser> => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Normaliza dados
      const normalizedData = {
        ...userData,
        name: normalizeName(userData.name),
        email: normalizeEmail(userData.email),
        cpf: normalizeCPF(userData.cpf),
        whatsapp: normalizePhone(userData.whatsapp),
        opticCNPJ: normalizeCNPJ(userData.opticCNPJ),
      };

      // Validações
      await validateEmailAvailability(normalizedData.email, undefined, tx);
      await validateCPFAvailability(normalizedData.cpf, undefined, tx);
      await validateUserHierarchy(normalizedData.role, normalizedData.managerId, tx);

      if (!isValidCNPJ(normalizedData.opticCNPJ)) {
        throw new Error('CNPJ da ótica inválido');
      }

      // Gera senha temporária
      const tempPassword = generateRandomPassword();
      const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_CONFIG.SALT_ROUNDS);

      // Determina configurações iniciais baseado no role
      const initialPoints = normalizedData.role === UserRole.ADMIN 
        ? POINTS_CONFIG.ADMIN_INITIAL 
        : userData.points || POINTS_CONFIG.DEFAULT_INITIAL;
      
      const { level, pointsToNext } = calculateLevelFromPoints(initialPoints);

      // Cria usuário
      const newUser = await tx.user.create({
        data: {
          name: normalizedData.name,
          email: normalizedData.email,
          cpf: normalizedData.cpf,
          whatsapp: normalizedData.whatsapp,
          avatarUrl: userData.avatarUrl || `https://i.pravatar.cc/150?u=${normalizedData.email}`,
          role: normalizedData.role,
          status: userData.status || UserStatus.ACTIVE,
          opticName: normalizedData.opticName,
          opticCNPJ: normalizedData.opticCNPJ,
          level,
          points: initialPoints,
          pointsToNextLevel: pointsToNext,
          managerId: normalizedData.managerId,
          passwordHash,
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Registra atividade
      await logUserActivity(
        newUser.id,
        ActivityType.ADMIN_USER_BLOCKED, // Reutilizando enum existente
        `Usuário criado: ${newUser.name} (${newUser.role})`,
        undefined,
        tx
      );

      return newUser as FullUser;
    });

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao criar usuário:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao criar usuário');
  }
};

/**
 * Atualiza usuário existente
 */
export const updateUser = async (userId: string, userData: UpdateUserData): Promise<FullUser> => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Verifica se usuário existe
      const existingUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, points: true },
      });

      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Prepara dados normalizados
      const updateData: any = {};

      if (userData.name) {
        updateData.name = normalizeName(userData.name);
      }

      if (userData.email) {
        updateData.email = normalizeEmail(userData.email);
        await validateEmailAvailability(updateData.email, userId, tx);
      }

      if (userData.cpf) {
        updateData.cpf = normalizeCPF(userData.cpf);
        await validateCPFAvailability(updateData.cpf, userId, tx);
      }

      if (userData.whatsapp) {
        updateData.whatsapp = normalizePhone(userData.whatsapp);
      }

      if (userData.opticCNPJ) {
        updateData.opticCNPJ = normalizeCNPJ(userData.opticCNPJ);
        if (!isValidCNPJ(updateData.opticCNPJ)) {
          throw new Error('CNPJ da ótica inválido');
        }
      }

      if (userData.role !== undefined || userData.managerId !== undefined) {
        const newRole = userData.role || existingUser.role;
        const newManagerId = userData.managerId;
        await validateUserHierarchy(newRole, newManagerId, tx);
        
        if (userData.role) updateData.role = userData.role;
        if (userData.managerId !== undefined) updateData.managerId = userData.managerId;
      }

      // Atualiza outros campos simples
      if (userData.avatarUrl) updateData.avatarUrl = userData.avatarUrl;
      if (userData.status) updateData.status = userData.status;
      if (userData.opticName) updateData.opticName = userData.opticName.trim();
      if (userData.level) updateData.level = userData.level;

      // Recalcula nível se pontos foram alterados
      if (userData.points !== undefined) {
        const { level, pointsToNext } = calculateLevelFromPoints(userData.points);
        updateData.points = userData.points;
        updateData.level = level;
        updateData.pointsToNextLevel = pointsToNext;
      } else if (userData.pointsToNextLevel !== undefined) {
        updateData.pointsToNextLevel = userData.pointsToNextLevel;
      }

      // Atualiza usuário
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sellers: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            },
          },
        },
      });

      return updatedUser as FullUser;
    });

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao atualizar usuário:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao atualizar usuário');
  }
};

/**
 * Busca usuário por ID
 */
export const getUserById = async (userId: string): Promise<FullUser | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sellers: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    return user as FullUser | null;

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao buscar usuário:', error);
    throw new Error('Erro interno ao buscar usuário');
  }
};

/**
 * Lista usuários com filtros e paginação
 */
export const listUsers = async (filters: UserFilters) => {
  try {
    const { page, limit, sort, order, search, role, status, managerId, opticCNPJ, createdAfter, createdBefore, minPoints, maxPoints, level } = filters;

    // Constrói filtros where
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search.replace(/\D/g, '') } },
        { opticName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && role !== 'all') {
      where.role = role as UserRole;
    }

    if (status && status !== 'all') {
      where.status = status as UserStatus;
    }

    if (managerId) {
      where.managerId = managerId;
    }

    if (opticCNPJ) {
      where.opticCNPJ = opticCNPJ;
    }

    if (level) {
      where.level = level;
    }

    if (createdAfter) {
      where.createdAt = { gte: new Date(createdAfter) };
    }

    if (createdBefore) {
      where.createdAt = { ...where.createdAt, lte: new Date(createdBefore) };
    }

    if (minPoints !== undefined || maxPoints !== undefined) {
      where.points = {};
      if (minPoints !== undefined) where.points.gte = minPoints;
      if (maxPoints !== undefined) where.points.lte = maxPoints;
    }

    // Paginação
    const { skip, take } = prismaUtils.buildPagination(page, limit);

    // Executa consulta
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: order },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              sellers: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return prismaUtils.formatPaginatedResult(users, total, page, limit);

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao listar usuários:', error);
    throw new Error('Erro interno ao listar usuários');
  }
};

/**
 * Atualiza status do usuário
 */
export const updateUserStatus = async (
  userId: string, 
  statusData: UpdateUserStatusData
): Promise<void> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true, status: true },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Se está bloqueando um gerente, valida se não tem vendedores
      if (statusData.status === UserStatus.BLOCKED && user.role === UserRole.GERENTE) {
        await validateManagerDeletion(userId, tx);
      }

      await tx.user.update({
        where: { id: userId },
        data: { status: statusData.status },
      });

      // Registra atividade
      const action = statusData.status === UserStatus.BLOCKED ? 'bloqueado' : 'ativado';
      await logUserActivity(
        userId,
        ActivityType.ADMIN_USER_BLOCKED,
        `Usuário ${action}: ${statusData.reason}`,
        undefined,
        tx
      );
    });

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao atualizar status:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao atualizar status');
  }
};

/**
 * Redefine senha do usuário
 */
export const resetUserPassword = async (
  userId: string, 
  resetData: ResetUserPasswordData
): Promise<{ newPassword: string }> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const passwordHash = await bcrypt.hash(resetData.newPassword, BCRYPT_CONFIG.SALT_ROUNDS);

      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Registra atividade
      await logUserActivity(
        userId,
        ActivityType.ADMIN_USER_BLOCKED,
        `Senha redefinida: ${resetData.reason}`,
        undefined,
        tx
      );

      return { newPassword: resetData.newPassword };
    });

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao redefinir senha:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao redefinir senha');
  }
};

/**
 * Atualiza pontos do usuário
 */
export const updateUserPoints = async (
  userId: string, 
  pointsData: UpdateUserPointsData
): Promise<{ newPoints: number; newLevel: string }> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, points: true },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      let newPoints = pointsData.points;

      // Calcula pontos baseado na operação
      if (pointsData.operation === 'add') {
        newPoints = user.points + pointsData.points;
      } else if (pointsData.operation === 'subtract') {
        newPoints = Math.max(0, user.points - pointsData.points);
      }

      // Calcula novo nível
      const { level, pointsToNext } = calculateLevelFromPoints(newPoints);

      await tx.user.update({
        where: { id: userId },
        data: {
          points: newPoints,
          level,
          pointsToNextLevel: pointsToNext,
        },
      });

      // Registra atividade
      const pointsDiff = newPoints - user.points;
      const actionDesc = pointsDiff > 0 ? `+${pointsDiff}` : `${pointsDiff}`;
      
      await logUserActivity(
        userId,
        ActivityType.ADMIN_USER_BLOCKED,
        `Pontos ajustados: ${actionDesc} pontos. Motivo: ${pointsData.reason}`,
        pointsDiff > 0 ? pointsDiff : undefined,
        tx
      );

      return { newPoints, newLevel: level };
    });

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao atualizar pontos:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao atualizar pontos');
  }
};

/**
 * Verifica disponibilidade de campo
 */
export const checkFieldAvailability = async (data: CheckAvailabilityData): Promise<boolean> => {
  try {
    if (data.field === 'email') {
      const existing = await prisma.user.findUnique({
        where: { email: normalizeEmail(data.value) },
        select: { id: true },
      });
      return !existing || existing.id === data.excludeUserId;
    }

    if (data.field === 'cpf') {
      const normalizedCPF = normalizeCPF(data.value);
      if (!isValidCPF(normalizedCPF)) return false;
      
      const existing = await prisma.user.findUnique({
        where: { cpf: normalizedCPF },
        select: { id: true },
      });
      return !existing || existing.id === data.excludeUserId;
    }

    if (data.field === 'cnpj') {
      const normalizedCNPJ = normalizeCNPJ(data.value);
      return isValidCNPJ(normalizedCNPJ);
    }

    return false;

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao verificar disponibilidade:', error);
    return false;
  }
};

/**
 * Obtém estatísticas gerais de usuários
 */
export const getUserStats = async (): Promise<UserStats> => {
  try {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      roleStats,
      levelStats,
      avgPointsResult,
      topPerformers,
      recentRegistrations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.BLOCKED } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.user.groupBy({
        by: ['level'],
        _count: true,
      }),
      prisma.user.aggregate({
        _avg: { points: true },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { points: 'desc' },
        select: {
          id: true,
          name: true,
          points: true,
          level: true,
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    // Formata estatísticas por role
    const byRole = {} as Record<UserRole, number>;
    Object.values(UserRole).forEach(role => {
      byRole[role] = 0;
    });
    roleStats.forEach(stat => {
      byRole[stat.role] = stat._count;
    });

    // Formata estatísticas por nível
    const byLevel = {} as Record<string, number>;
    levelStats.forEach(stat => {
      byLevel[stat.level] = stat._count;
    });

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      byRole,
      byLevel,
      avgPoints: Math.round(avgPointsResult._avg.points || 0),
      topPerformers,
      recentRegistrations,
    };

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao obter estatísticas:', error);
    throw new Error('Erro interno ao obter estatísticas');
  }
};

/**
 * Obtém vendedores de um gerente
 */
export const getManagerSellers = async (managerId: string, includeInactive = false) => {
  try {
    const where: any = { managerId };
    
    if (!includeInactive) {
      where.status = UserStatus.ACTIVE;
    }

    const sellers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        whatsapp: true,
        avatarUrl: true,
        status: true,
        opticName: true,
        level: true,
        points: true,
        pointsToNextLevel: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return sellers;

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao buscar vendedores:', error);
    throw new Error('Erro interno ao buscar vendedores');
  }
};

/**
 * Exclui usuário (soft delete na verdade apenas bloqueia)
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, name: true },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Se é gerente, valida se pode ser excluído
      if (user.role === UserRole.GERENTE) {
        await validateManagerDeletion(userId, tx);
      }

      // Bloqueia ao invés de excluir para manter integridade referencial
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.BLOCKED },
      });

      await logUserActivity(
        userId,
        ActivityType.ADMIN_USER_BLOCKED,
        `Usuário removido: ${user.name}`,
        undefined,
        tx
      );
    });

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao excluir usuário:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno ao excluir usuário');
  }
};

// ==================== UTILITÁRIOS EXTRAS ====================

/**
 * Busca usuários por CNPJ da ótica
 */
export const getUsersByOpticCNPJ = async (cnpj: string) => {
  try {
    const normalizedCNPJ = normalizeCNPJ(cnpj);
    
    if (!isValidCNPJ(normalizedCNPJ)) {
      throw new Error('CNPJ inválido');
    }

    const users = await prisma.user.findMany({
      where: { 
        opticCNPJ: normalizedCNPJ,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        opticName: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });

    return users;

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao buscar usuários por CNPJ:', error);
    throw new Error('Erro interno ao buscar usuários');
  }
};

/**
 * Obtém dados da ótica por CNPJ
 */
export const getOpticDataByCNPJ = async (cnpj: string): Promise<{ name: string } | null> => {
  try {
    const normalizedCNPJ = normalizeCNPJ(cnpj);
    
    if (!isValidCNPJ(normalizedCNPJ)) {
      return null;
    }

    const user = await prisma.user.findFirst({
      where: { opticCNPJ: normalizedCNPJ },
      select: { opticName: true },
    });

    return user ? { name: user.opticName } : null;

  } catch (error) {
    console.error('[USER_SERVICE] Erro ao buscar dados da ótica:', error);
    return null;
  }
};
