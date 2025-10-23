/**
 * @file user.controller.ts
 * @version 2.0.0
 * @description Controller para gestão de usuários da API EPS Campanhas.
 * Gerencia CRUD de usuários, hierarquias, pontuação e relatórios administrativos.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do controller de usuários
 * - Gestão de hierarquia gerente-vendedor
 * - Sistema de pontuação e níveis
 * - Operações administrativas em lote
 * - Relatórios e estatísticas detalhadas
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, UserStatus } from '@prisma/client';
import { 
  userParamsSchema,
  userFiltersSchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  resetUserPasswordSchema,
  associateSellerToManagerSchema,
  managerSellersSchema,
  updateUserPointsSchema,
  userStatsSchema,
  checkAvailabilitySchema,
  bulkUserImportSchema,
  CreateUserData,
  UpdateUserData,
  UserFilters,
  UpdateUserStatusData,
  ResetUserPasswordData,
  AssociateSellerToManagerData,
  ManagerSellersQuery,
  UpdateUserPointsData,
  UserStatsQuery,
  CheckAvailabilityData,
  BulkUserImportData
} from '../schemas/user.schema';
import {
  createUser,
  updateUser,
  getUserById,
  listUsers,
  updateUserStatus,
  resetUserPassword,
  updateUserPoints,
  checkFieldAvailability,
  getUserStats,
  getManagerSellers,
  deleteUser,
  getUsersByOpticCNPJ,
  getOpticDataByCNPJ
} from '../services/user.service';

// ==================== INTERFACES DE REQUEST ====================

interface CreateUserRequest extends FastifyRequest {
  Body: CreateUserData;
}

interface UpdateUserRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateUserData;
}

interface UserParamsRequest extends FastifyRequest {
  Params: { id: string };
}

interface ListUsersRequest extends FastifyRequest {
  Querystring: UserFilters;
}

interface UpdateUserStatusRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateUserStatusData;
}

interface ResetPasswordRequest extends FastifyRequest {
  Params: { id: string };
  Body: ResetUserPasswordData;
}

interface AssociateSellerRequest extends FastifyRequest {
  Body: AssociateSellerToManagerData;
}

interface ManagerSellersRequest extends FastifyRequest {
  Params: { managerId: string };
  Querystring: Partial<ManagerSellersQuery>;
}

interface UpdatePointsRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateUserPointsData;
}

interface UserStatsRequest extends FastifyRequest {
  Querystring: UserStatsQuery;
}

interface CheckAvailabilityRequest extends FastifyRequest {
  Body: CheckAvailabilityData;
}

interface BulkImportRequest extends FastifyRequest {
  Body: BulkUserImportData;
}

// ==================== HANDLERS PRINCIPAIS ====================

/**
 * Handler para criar novo usuário
 */
export const createUserHandler = async (
  request: CreateUserRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem criar usuários',
      });
    }

    const newUser = await createUser(request.body);

    console.log(`[USER_CONTROLLER] Usuário criado: ${newUser.email} (${newUser.role}) por ${request.user.email}`);

    return reply.code(201).send({
      success: true,
      message: 'Usuário criado com sucesso',
      data: { user: newUser },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao criar usuário:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao criar usuário';

    if (error instanceof Error) {
      if (error.message.includes('já está em uso') || 
          error.message.includes('já está cadastrado')) {
        statusCode = 409; // Conflict
      } else if (error.message.includes('inválido') || 
                 error.message.includes('obrigatório') ||
                 error.message.includes('deve ter') ||
                 error.message.includes('não encontrado')) {
        statusCode = 400; // Bad Request
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao criar usuário',
      message: errorMessage,
    });
  }
};

/**
 * Handler para buscar usuário por ID
 */
export const getUserHandler = async (
  request: UserParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    
    const user = await getUserById(id);

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: 'Usuário não encontrado',
        message: 'O usuário solicitado não existe',
      });
    }

    // Verifica permissão para ver dados completos
    const canViewFullData = request.user && (
      request.user.role === UserRole.ADMIN ||
      request.user.id === id ||
      (request.user.role === UserRole.GERENTE && user.managerId === request.user.id)
    );

    if (!canViewFullData) {
      // Remove dados sensíveis se não tem permissão total
      const publicData = {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        opticName: user.opticName,
        level: user.level,
        points: user.points,
        createdAt: user.createdAt,
        // Remove: cpf, whatsapp, email, opticCNPJ
      };

      return reply.code(200).send({
        success: true,
        message: 'Dados públicos do usuário obtidos',
        data: { user: publicData },
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Usuário encontrado com sucesso',
      data: { user },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao buscar usuário:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao buscar dados do usuário',
    });
  }
};

/**
 * Handler para listar usuários com filtros
 */
export const listUsersHandler = async (
  request: ListUsersRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para listar usuários',
      });
    }

    // Vendedores não podem listar outros usuários
    if (request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Vendedores não podem listar outros usuários',
      });
    }

    let filters = request.query;

    // Se for gerente, filtra apenas seus vendedores
    if (request.user.role === UserRole.GERENTE) {
      filters = { 
        ...filters, 
        managerId: request.user.id,
        role: 'VENDEDOR' // Gerente só vê vendedores
      };
    }

    const result = await listUsers(filters);

    // Se não for admin, remove dados sensíveis
    let responseData = result.data;
    if (request.user.role !== UserRole.ADMIN) {
      responseData = result.data?.map((user: any) => ({
        ...user,
        cpf: undefined,
        whatsapp: undefined,
        opticCNPJ: undefined,
      }));
    }

    return reply.code(200).send({
      success: true,
      message: 'Usuários listados com sucesso',
      data: responseData,
      pagination: result.pagination,
      scope: request.user.role === UserRole.GERENTE ? 'team' : 'global',
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao listar usuários:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao listar usuários',
    });
  }
};

/**
 * Handler para atualizar usuário
 */
export const updateUserHandler = async (
  request: UpdateUserRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    
    // Verifica permissões de edição
    const canEdit = request.user && (
      request.user.role === UserRole.ADMIN ||
      request.user.id === id // Usuário pode editar próprio perfil
    );

    if (!canEdit) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode editar seu próprio perfil',
      });
    }

    // Se não for admin, remove campos que não pode alterar
    let updateData = request.body;
    if (request.user.role !== UserRole.ADMIN && request.user.id === id) {
      // Usuário comum só pode alterar dados pessoais básicos
      const allowedFields = ['name', 'whatsapp', 'avatarUrl', 'opticName'];
      updateData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = (updateData as any)[key];
          return obj;
        }, {});
    }

    const updatedUser = await updateUser(id, updateData);

    console.log(`[USER_CONTROLLER] Usuário atualizado: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: { user: updatedUser },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao atualizar usuário:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao atualizar usuário';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('já está em uso') || 
                 error.message.includes('já está cadastrado')) {
        statusCode = 409;
      } else if (error.message.includes('inválido')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao atualizar usuário',
      message: errorMessage,
    });
  }
};

/**
 * Handler para atualizar status do usuário
 */
export const updateUserStatusHandler = async (
  request: UpdateUserStatusRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem alterar status de usuários',
      });
    }

    const { id } = request.params;
    
    // Não permite bloquear a si mesmo
    if (request.user.id === id && request.body.status === UserStatus.BLOCKED) {
      return reply.code(400).send({
        success: false,
        error: 'Operação não permitida',
        message: 'Você não pode bloquear sua própria conta',
      });
    }

    await updateUserStatus(id, request.body);

    const statusLabel = request.body.status === UserStatus.ACTIVE ? 'ativado' : 'bloqueado';
    console.log(`[USER_CONTROLLER] Usuário ${statusLabel}: ${id} por ${request.user.email} - Motivo: ${request.body.reason}`);

    return reply.code(200).send({
      success: true,
      message: `Usuário ${statusLabel} com sucesso`,
      data: {
        userId: id,
        newStatus: request.body.status,
        reason: request.body.reason,
        changedBy: request.user.email,
        changedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao atualizar status:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao atualizar status';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') ||
                 error.message.includes('possui vendedores')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao atualizar status',
      message: errorMessage,
    });
  }
};

/**
 * Handler para redefinir senha de usuário
 */
export const resetUserPasswordHandler = async (
  request: ResetPasswordRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem redefinir senhas',
      });
    }

    const { id } = request.params;
    
    const result = await resetUserPassword(id, request.body);

    console.log(`[USER_CONTROLLER] Senha redefinida: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Senha redefinida com sucesso',
      data: {
        userId: id,
        newPassword: result.newPassword,
        resetBy: request.user.email,
        resetAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao redefinir senha:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao redefinir senha';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao redefinir senha',
      message: errorMessage,
    });
  }
};

/**
 * Handler para associar vendedor a gerente
 */
export const associateSellerToManagerHandler = async (
  request: AssociateSellerRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem alterar hierarquias',
      });
    }

    const { sellerId, managerId } = request.body;

    // Usa o updateUser para fazer a associação
    const updatedSeller = await updateUser(sellerId, { managerId });

    console.log(`[USER_CONTROLLER] Vendedor associado: ${sellerId} → gerente ${managerId} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Vendedor associado ao gerente com sucesso',
      data: {
        seller: updatedSeller,
        associatedBy: request.user.email,
        associatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao associar vendedor:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao associar vendedor';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('não é um gerente') ||
                 error.message.includes('não está ativo')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao associar vendedor',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter vendedores de um gerente
 */
export const getManagerSellersHandler = async (
  request: ManagerSellersRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário',
      });
    }

    const { managerId } = request.params;
    const { includeInactive = false } = request.query;

    // Verifica permissões
    const canView = request.user.role === UserRole.ADMIN || 
      request.user.id === managerId;

    if (!canView) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode ver sua própria equipe',
      });
    }

    const sellers = await getManagerSellers(managerId, includeInactive);

    return reply.code(200).send({
      success: true,
      message: 'Vendedores do gerente obtidos com sucesso',
      data: {
        sellers,
        managerId,
        includeInactive,
        count: sellers.length,
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao obter vendedores do gerente:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar vendedores do gerente',
    });
  }
};

/**
 * Handler para atualizar pontos do usuário
 */
export const updateUserPointsHandler = async (
  request: UpdatePointsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem alterar pontos',
      });
    }

    const { id } = request.params;
    
    const result = await updateUserPoints(id, request.body);

    console.log(`[USER_CONTROLLER] Pontos atualizados: ${id} → ${result.newPoints} (${result.newLevel}) por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Pontos atualizados com sucesso',
      data: {
        userId: id,
        newPoints: result.newPoints,
        newLevel: result.newLevel,
        operation: request.body.operation,
        reason: request.body.reason,
        updatedBy: request.user.email,
        updatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao atualizar pontos:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao atualizar pontos';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao atualizar pontos',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter estatísticas gerais de usuários
 */
export const getUserStatsHandler = async (
  request: UserStatsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem ver estatísticas gerais',
      });
    }

    const stats = await getUserStats();

    return reply.code(200).send({
      success: true,
      message: 'Estatísticas de usuários obtidas com sucesso',
      data: {
        stats,
        generatedAt: new Date().toISOString(),
        generatedBy: request.user.email,
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao obter estatísticas:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar estatísticas de usuários',
    });
  }
};

/**
 * Handler para verificar disponibilidade de campo
 */
export const checkFieldAvailabilityHandler = async (
  request: CheckAvailabilityRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const isAvailable = await checkFieldAvailability(request.body);

    const fieldLabels = {
      email: 'E-mail',
      cpf: 'CPF',
      cnpj: 'CNPJ',
    };

    const fieldLabel = fieldLabels[request.body.field] || request.body.field;

    return reply.code(200).send({
      success: true,
      message: `Verificação de ${fieldLabel} concluída`,
      data: {
        field: request.body.field,
        value: request.body.value,
        available: isAvailable,
        message: isAvailable ? 
          `${fieldLabel} disponível` : 
          `${fieldLabel} já está em uso ou é inválido`,
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao verificar disponibilidade:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao verificar disponibilidade do campo',
    });
  }
};

/**
 * Handler para excluir usuário
 */
export const deleteUserHandler = async (
  request: UserParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem excluir usuários',
      });
    }

    const { id } = request.params;
    
    // Não permite excluir a si mesmo
    if (request.user.id === id) {
      return reply.code(400).send({
        success: false,
        error: 'Operação não permitida',
        message: 'Você não pode excluir sua própria conta',
      });
    }

    await deleteUser(id);

    console.log(`[USER_CONTROLLER] Usuário excluído: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Usuário excluído com sucesso',
      data: {
        deletedUserId: id,
        deletedBy: request.user.email,
        deletedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao excluir usuário:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao excluir usuário';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') ||
                 error.message.includes('possui vendedores')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao excluir usuário',
      message: errorMessage,
    });
  }
};

/**
 * Handler para importação em lote de usuários
 */
export const bulkImportUsersHandler = async (
  request: BulkImportRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem importar usuários em lote',
      });
    }

    const { users, validateOnly, skipDuplicates } = request.body;

    // Por enquanto, implementação simples - criar um por um
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    for (const userData of users) {
      try {
        if (validateOnly) {
          // Apenas valida sem criar
          results.push({
            email: userData.email,
            success: true,
            message: 'Validação bem-sucedida',
          });
          successful++;
        } else {
          const createdUser = await createUser(userData);
          results.push({
            email: userData.email,
            success: true,
            message: 'Usuário criado com sucesso',
            userId: createdUser.id,
          });
          successful++;
        }
      } catch (error) {
        if (skipDuplicates && error instanceof Error && 
            (error.message.includes('já está em uso') || 
             error.message.includes('já está cadastrado'))) {
          results.push({
            email: userData.email,
            success: true,
            message: 'Usuário já existe - ignorado conforme solicitado',
            skipped: true,
          });
          successful++;
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          results.push({
            email: userData.email,
            success: false,
            message: errorMessage,
          });
          failed++;
        }
      }
    }

    const message = validateOnly ? 
      `Validação concluída: ${successful} válidos, ${failed} inválidos` :
      `Importação concluída: ${successful} criados, ${failed} falharam`;

    console.log(`[USER_CONTROLLER] ${message} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message,
      data: {
        summary: {
          total: users.length,
          successful,
          failed,
          validateOnly,
          skipDuplicates,
        },
        results,
        processedBy: request.user.email,
        processedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro na importação em lote:', error);

    return reply.code(400).send({
      success: false,
      error: 'Erro na importação',
      message: 'Erro ao processar importação em lote de usuários',
    });
  }
};

/**
 * Handler para obter usuários por CNPJ da ótica
 */
export const getUsersByOpticHandler = async (
  request: FastifyRequest<{ Params: { cnpj: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para listar usuários por ótica',
      });
    }

    const { cnpj } = request.params;
    
    const users = await getUsersByOpticCNPJ(cnpj);

    return reply.code(200).send({
      success: true,
      message: 'Usuários da ótica obtidos com sucesso',
      data: {
        users,
        opticCNPJ: cnpj,
        count: users.length,
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao obter usuários por CNPJ:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao buscar usuários da ótica';

    if (error instanceof Error) {
      if (error.message.includes('CNPJ inválido')) {
        statusCode = 400;
        errorMessage = error.message;
      }
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao buscar usuários',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter meus vendedores (gerente)
 */
export const getMySellersHandler = async (
  request: FastifyRequest<{ Querystring: { includeInactive?: 'true' | 'false' } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.GERENTE) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas gerentes podem ver sua equipe de vendedores',
      });
    }

    const { includeInactive = 'false' } = request.query;
    
    const sellers = await getManagerSellers(request.user.id, includeInactive === 'true');

    return reply.code(200).send({
      success: true,
      message: 'Sua equipe de vendedores obtida com sucesso',
      data: {
        sellers,
        managerId: request.user.id,
        includeInactive: includeInactive === 'true',
        totalSellers: sellers.length,
        activeSellers: sellers.filter((s: any) => s.status === UserStatus.ACTIVE).length,
      },
    });

  } catch (error) {
    console.error('[USER_CONTROLLER] Erro ao obter equipe de vendedores:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar sua equipe de vendedores',
    });
  }
};
