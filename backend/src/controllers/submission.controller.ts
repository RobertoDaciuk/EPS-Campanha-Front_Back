/**
 * @file submission.controller.ts
 * @version 2.0.0
 * @description Controller para gestão de submissões de vendas da API EPS Campanhas.
 * Gerencia submissões de vendas em campanhas, validação e sistema de kits.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do controller de submissões
 * - Sistema de kits (cartelas) automatizado
 * - Validação de submissões por gerentes/admins
 * - Processamento em lote
 * - Relatórios de submissões detalhados
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, CampaignSubmissionStatus } from '@prisma/client';
import { 
  submissionParamsSchema,
  submissionFiltersSchema,
  createSubmissionSchema,
  updateSubmissionSchema,
  validateSubmissionSchema,
  bulkValidateSubmissionsSchema,
  submissionReportSchema,
  duplicateSubmissionSchema,
  transferSubmissionSchema,
  userSubmissionStatsSchema,
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
import {
  createSubmission,
  updateSubmission,
  getSubmissionById,
  listSubmissions,
  validateSubmission,
  bulkValidateSubmissions,
  generateSubmissionReport,
  duplicateSubmission,
  transferSubmission,
  getUserSubmissionStats,
  deleteSubmission,
  getSubmissionsByKit,
  getSubmissionsByRequirement
} from '../services/submission.service';

// ==================== INTERFACES DE REQUEST ====================

interface CreateSubmissionRequest extends FastifyRequest {
  Body: CreateSubmissionData;
}

interface UpdateSubmissionRequest extends FastifyRequest {
  Params: { id: string };
  Body: UpdateSubmissionData;
}

interface SubmissionParamsRequest extends FastifyRequest {
  Params: { id: string };
}

interface ListSubmissionsRequest extends FastifyRequest {
  Querystring: SubmissionFilters;
}

interface ValidateSubmissionRequest extends FastifyRequest {
  Params: { id: string };
  Body: ValidateSubmissionData;
}

interface BulkValidateRequest extends FastifyRequest {
  Body: BulkValidateSubmissionsData;
}

interface SubmissionReportRequest extends FastifyRequest {
  Querystring: SubmissionReportQuery;
}

interface DuplicateSubmissionRequest extends FastifyRequest {
  Body: DuplicateSubmissionData;
}

interface TransferSubmissionRequest extends FastifyRequest {
  Body: TransferSubmissionData;
}

interface UserStatsRequest extends FastifyRequest {
  Querystring: UserSubmissionStatsQuery;
}

// ==================== HANDLERS PRINCIPAIS ====================

/**
 * Handler para criar nova submissão
 */
export const createSubmissionHandler = async (
  request: CreateSubmissionRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para submeter vendas',
      });
    }

    // Adiciona ID do usuário à submissão
    const submissionData = {
      ...request.body,
      userId: request.user.id,
    };

    const submission = await createSubmission(submissionData);

    console.log(`[SUBMISSION_CONTROLLER] Submissão criada: ${submission.orderNumber} por ${request.user.email}`);

    return reply.code(201).send({
      success: true,
      message: 'Submissão criada com sucesso',
      data: { submission },
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao criar submissão:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao criar submissão';

    if (error instanceof Error) {
      if (error.message.includes('não encontrada') || 
          error.message.includes('não existe')) {
        statusCode = 404;
      } else if (error.message.includes('já foi utilizado') ||
                 error.message.includes('não está ativa') ||
                 error.message.includes('inválida')) {
        statusCode = 400;
      } else if (error.message.includes('não pode participar')) {
        statusCode = 403;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao criar submissão',
      message: errorMessage,
    });
  }
};

/**
 * Handler para buscar submissão por ID
 */
export const getSubmissionHandler = async (
  request: SubmissionParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    
    const submission = await getSubmissionById(id);

    if (!submission) {
      return reply.code(404).send({
        success: false,
        error: 'Submissão não encontrada',
        message: 'A submissão solicitada não existe',
      });
    }

    // Verifica permissões de visualização
    const canView = request.user && (
      request.user.role === UserRole.ADMIN ||
      request.user.id === submission.userId ||
      (request.user.role === UserRole.GERENTE && submission.user.managerId === request.user.id)
    );

    if (!canView) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você não tem permissão para ver esta submissão',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Submissão encontrada com sucesso',
      data: { submission },
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao buscar submissão:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao buscar dados da submissão',
    });
  }
};

/**
 * Handler para listar submissões com filtros
 */
export const listSubmissionsHandler = async (
  request: ListSubmissionsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver submissões',
      });
    }

    let filters = request.query;
    
    // Aplica filtros baseados no perfil do usuário
    if (request.user.role === UserRole.VENDEDOR) {
      // Vendedor só vê suas próprias submissões
      filters = { ...filters, userId: request.user.id };
    } else if (request.user.role === UserRole.GERENTE) {
      // Se não especificou userId, gerente vê submissões da sua equipe
      if (!filters.userId) {
        // Aqui seria aplicado filtro para equipe do gerente
        // Por agora, permite ver todas as submissões
      }
    }
    // Admin vê todas (sem restrições)

    const result = await listSubmissions(filters);

    return reply.code(200).send({
      success: true,
      message: 'Submissões listadas com sucesso',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao listar submissões:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao listar submissões',
    });
  }
};

/**
 * Handler para atualizar submissão
 */
export const updateSubmissionHandler = async (
  request: UpdateSubmissionRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para editar submissões',
      });
    }

    const { id } = request.params;
    
    // Busca submissão para verificar permissões
    const existingSubmission = await getSubmissionById(id);
    
    if (!existingSubmission) {
      return reply.code(404).send({
        success: false,
        error: 'Submissão não encontrada',
        message: 'A submissão solicitada não existe',
      });
    }

    // Verifica permissões de edição
    const canEdit = request.user.role === UserRole.ADMIN ||
      (request.user.id === existingSubmission.userId && 
       existingSubmission.status === CampaignSubmissionStatus.PENDING);

    if (!canEdit) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode editar suas próprias submissões pendentes',
      });
    }

    const updatedSubmission = await updateSubmission(id, request.body);

    console.log(`[SUBMISSION_CONTROLLER] Submissão atualizada: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Submissão atualizada com sucesso',
      data: { submission: updatedSubmission },
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao atualizar submissão:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao atualizar submissão';

    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') ||
                 error.message.includes('já validada') ||
                 error.message.includes('número de pedido já foi utilizado')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao atualizar submissão',
      message: errorMessage,
    });
  }
};

/**
 * Handler para validar submissão (gerentes/admins)
 */
export const validateSubmissionHandler = async (
  request: ValidateSubmissionRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas gerentes e administradores podem validar submissões',
      });
    }

    const { id } = request.params;
    
    const result = await validateSubmission(id, request.body, request.user.id);

    const actionLabel = request.body.status === CampaignSubmissionStatus.VALIDATED ? 'validada' : 'rejeitada';
    
    console.log(`[SUBMISSION_CONTROLLER] Submissão ${actionLabel}: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: `Submissão ${actionLabel} com sucesso`,
      data: result,
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao validar submissão:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao validar submissão';

    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') ||
                 error.message.includes('já foi validada')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao validar submissão',
      message: errorMessage,
    });
  }
};

/**
 * Handler para validação em lote de submissões
 */
export const bulkValidateSubmissionsHandler = async (
  request: BulkValidateRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas gerentes e administradores podem validar submissões em lote',
      });
    }

    const result = await bulkValidateSubmissions(request.body, request.user.id);

    console.log(`[SUBMISSION_CONTROLLER] Validação em lote: ${result.successful} sucessos, ${result.failed} falhas por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: `Validação em lote concluída: ${result.successful} sucessos, ${result.failed} falhas`,
      data: result,
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro na validação em lote:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';

    return reply.code(400).send({
      success: false,
      error: 'Erro na validação em lote',
      message: errorMessage,
    });
  }
};

/**
 * Handler para excluir submissão
 */
export const deleteSubmissionHandler = async (
  request: SubmissionParamsRequest,
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

    const { id } = request.params;
    
    // Busca submissão para verificar permissões
    const submission = await getSubmissionById(id);
    
    if (!submission) {
      return reply.code(404).send({
        success: false,
        error: 'Submissão não encontrada',
        message: 'A submissão solicitada não existe',
      });
    }

    // Verifica permissões de exclusão
    const canDelete = request.user.role === UserRole.ADMIN ||
      (request.user.id === submission.userId && 
       submission.status === CampaignSubmissionStatus.PENDING);

    if (!canDelete) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode excluir suas próprias submissões pendentes',
      });
    }

    await deleteSubmission(id, request.user.id);

    console.log(`[SUBMISSION_CONTROLLER] Submissão excluída: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Submissão excluída com sucesso',
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao excluir submissão:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao excluir submissão';

    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') ||
                 error.message.includes('já validada')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao excluir submissão',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter submissões do usuário atual
 */
export const getMySubmissionsHandler = async (
  request: FastifyRequest<{ Querystring: Partial<SubmissionFilters> }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver suas submissões',
      });
    }

    const filters: SubmissionFilters = {
      ...request.query,
      userId: request.user.id, // Força filtro pelo usuário atual
      page: parseInt(request.query.page?.toString() || '1'),
      limit: Math.min(parseInt(request.query.limit?.toString() || '20'), 100),
      sort: request.query.sort || 'submissionDate',
      order: request.query.order || 'desc',
    };

    const result = await listSubmissions(filters);

    return reply.code(200).send({
      success: true,
      message: 'Suas submissões obtidas com sucesso',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao obter submissões do usuário:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar suas submissões',
    });
  }
};

/**
 * Handler para obter submissões por kit
 */
export const getSubmissionsByKitHandler = async (
  request: FastifyRequest<{ Params: { kitId: string }; Querystring: { page?: string; limit?: string } }>,
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

    const { kitId } = request.params;
    const { page = '1', limit = '20' } = request.query;

    const submissions = await getSubmissionsByKit(kitId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    // Verifica se usuário pode ver este kit
    if (submissions.length > 0) {
      const firstSubmission = submissions[0];
      const canView = request.user.role === UserRole.ADMIN ||
        request.user.id === firstSubmission.userId ||
        (request.user.role === UserRole.GERENTE && 
         firstSubmission.user.managerId === request.user.id);

      if (!canView) {
        return reply.code(403).send({
          success: false,
          error: 'Acesso negado',
          message: 'Você não tem permissão para ver este kit',
        });
      }
    }

    return reply.code(200).send({
      success: true,
      message: 'Submissões do kit obtidas com sucesso',
      data: {
        submissions,
        kitId,
        count: submissions.length,
      },
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao obter submissões do kit:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar submissões do kit',
    });
  }
};

/**
 * Handler para gerar relatório de submissões
 */
export const generateSubmissionReportHandler = async (
  request: SubmissionReportRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para gerar relatórios',
      });
    }

    let filters = request.query;
    
    // Se for gerente, filtra apenas sua equipe
    if (request.user.role === UserRole.GERENTE && !filters.userId) {
      // Aqui seria aplicado filtro para equipe do gerente
    }

    const report = await generateSubmissionReport(filters, request.user.id);

    console.log(`[SUBMISSION_CONTROLLER] Relatório de submissões gerado por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Relatório de submissões gerado com sucesso',
      data: report,
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao gerar relatório:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao gerar relatório de submissões',
    });
  }
};

/**
 * Handler para duplicar submissão
 */
export const duplicateSubmissionHandler = async (
  request: DuplicateSubmissionRequest,
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

    const { submissionId, newOrderNumber } = request.body;
    
    // Verifica se usuário pode duplicar
    const originalSubmission = await getSubmissionById(submissionId);
    
    if (!originalSubmission) {
      return reply.code(404).send({
        success: false,
        error: 'Submissão original não encontrada',
        message: 'A submissão a ser duplicada não existe',
      });
    }

    const canDuplicate = request.user.role === UserRole.ADMIN ||
      request.user.id === originalSubmission.userId;

    if (!canDuplicate) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode duplicar suas próprias submissões',
      });
    }

    const duplicatedSubmission = await duplicateSubmission(request.body, request.user.id);

    console.log(`[SUBMISSION_CONTROLLER] Submissão duplicada: ${submissionId} → ${duplicatedSubmission.id} por ${request.user.email}`);

    return reply.code(201).send({
      success: true,
      message: 'Submissão duplicada com sucesso',
      data: { 
        originalSubmissionId: submissionId,
        duplicatedSubmission,
      },
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao duplicar submissão:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';

    return reply.code(400).send({
      success: false,
      error: 'Erro ao duplicar submissão',
      message: errorMessage,
    });
  }
};

/**
 * Handler para transferir submissão entre kits
 */
export const transferSubmissionHandler = async (
  request: TransferSubmissionRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas gerentes e administradores podem transferir submissões',
      });
    }

    const result = await transferSubmission(request.body, request.user.id);

    console.log(`[SUBMISSION_CONTROLLER] Submissão transferida: ${request.body.submissionId} → kit ${request.body.targetKitId} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Submissão transferida com sucesso',
      data: result,
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao transferir submissão:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao transferir submissão';

    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') ||
                 error.message.includes('inválida')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao transferir submissão',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter estatísticas de submissões do usuário
 */
export const getUserSubmissionStatsHandler = async (
  request: UserStatsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Login necessário para ver estatísticas',
      });
    }

    const { userId, period, campaignId, includeBreakdown } = request.query;
    
    // Determina usuário alvo baseado em permissões
    let targetUserId = request.user.id;

    if (userId && userId !== request.user.id) {
      if (request.user.role === UserRole.ADMIN) {
        targetUserId = userId;
      } else if (request.user.role === UserRole.GERENTE) {
        // Aqui verificaria se é vendedor da equipe
        targetUserId = userId;
      } else {
        return reply.code(403).send({
          success: false,
          error: 'Acesso negado',
          message: 'Você só pode ver suas próprias estatísticas',
        });
      }
    }

    const statsQuery: UserSubmissionStatsQuery = {
      userId: targetUserId,
      period: period || 'month',
      campaignId,
      includeBreakdown: includeBreakdown || false,
    };

    const stats = await getUserSubmissionStats(statsQuery);

    return reply.code(200).send({
      success: true,
      message: 'Estatísticas de submissões obtidas com sucesso',
      data: {
        stats,
        userId: targetUserId,
        period: period || 'month',
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao obter estatísticas de submissões:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar estatísticas de submissões',
    });
  }
};

/**
 * Handler para obter submissões pendentes de validação
 */
export const getPendingSubmissionsHandler = async (
  request: FastifyRequest<{ Querystring: { campaignId?: string; page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas gerentes e administradores podem ver submissões pendentes',
      });
    }

    const { campaignId, page = '1', limit = '20' } = request.query;

    const filters: SubmissionFilters = {
      status: CampaignSubmissionStatus.PENDING,
      campaignId,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      sort: 'submissionDate',
      order: 'asc', // Mais antigas primeiro para validação
    };

    // Se for gerente, filtra apenas submissões da sua equipe
    if (request.user.role === UserRole.GERENTE) {
      // Aqui seria aplicado filtro para equipe do gerente
    }

    const result = await listSubmissions(filters);

    return reply.code(200).send({
      success: true,
      message: 'Submissões pendentes obtidas com sucesso',
      data: result.data,
      pagination: result.pagination,
      summary: {
        ...result.summary,
        validatorRole: request.user.role,
      },
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao obter submissões pendentes:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar submissões pendentes',
    });
  }
};

/**
 * Handler para obter submissões por campanha e requisito
 */
export const getSubmissionsByRequirementHandler = async (
  request: FastifyRequest<{ 
    Params: { campaignId: string; requirementId: string }; 
    Querystring: { page?: string; limit?: string; status?: string } 
  }>,
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

    const { campaignId, requirementId } = request.params;
    const { page = '1', limit = '20', status } = request.query;

    const submissions = await getSubmissionsByRequirement(requirementId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status: status as any,
    });

    return reply.code(200).send({
      success: true,
      message: 'Submissões por requisito obtidas com sucesso',
      data: {
        submissions,
        campaignId,
        requirementId,
        count: submissions.length,
      },
    });

  } catch (error) {
    console.error('[SUBMISSION_CONTROLLER] Erro ao obter submissões por requisito:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar submissões por requisito',
    });
  }
};
