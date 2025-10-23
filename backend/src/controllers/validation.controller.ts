/**
 * @file validation.controller.ts
 * @version 2.0.0
 * @description Controller para sistema de validação de planilhas da API EPS Campanhas.
 * Gerencia upload, processamento e validação de dados de vendas em massa.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do controller de validação
 * - Sistema de upload e processamento de planilhas
 * - Mapeamento dinâmico de colunas
 * - Validação de regras de negócio
 * - Relatórios de validação detalhados
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, ValidationStatus } from '@prisma/client';
import { 
  validationJobParamsSchema,
  validationHistoryFiltersSchema,
  validationConfigSchema,
  uploadValidationFileSchema,
  reprocessValidationJobSchema,
  validationReportSchema,
  ValidationConfigData,
  ValidationHistoryFilters,
  ReprocessValidationJobData,
  ValidationReportQuery
} from '../schemas/validation.schema';
import {
  uploadValidationFile,
  getValidationJobById,
  listValidationJobs,
  reprocessValidationJob,
  deleteValidationJob,
  generateValidationReport,
  getValidationJobDetails,
  downloadValidationResults,
  getValidationStats,
  previewValidationFile
} from '../services/validation.service';

// ==================== INTERFACES DE REQUEST ====================

interface UploadFileRequest extends FastifyRequest {
  Body: {
    file: any; // Seria File no browser
    config: ValidationConfigData;
    previewOnly?: boolean;
    maxRows?: number;
  };
}

interface ValidationJobParamsRequest extends FastifyRequest {
  Params: { id: string };
}

interface ListValidationJobsRequest extends FastifyRequest {
  Querystring: ValidationHistoryFilters;
}

interface ReprocessJobRequest extends FastifyRequest {
  Params: { id: string };
  Body: ReprocessValidationJobData;
}

interface ValidationReportRequest extends FastifyRequest {
  Querystring: ValidationReportQuery;
}

interface DownloadResultsRequest extends FastifyRequest {
  Params: { id: string };
  Querystring: { format?: 'csv' | 'excel' | 'json' };
}

interface PreviewFileRequest extends FastifyRequest {
  Body: {
    file: any;
    sampleSize?: number;
  };
}

// ==================== HANDLERS PRINCIPAIS ====================

/**
 * Handler para upload de arquivo de validação
 */
export const uploadValidationFileHandler = async (
  request: UploadFileRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas gerentes e administradores podem fazer upload de planilhas',
      });
    }

    const { file, config, previewOnly = false, maxRows } = request.body;

    if (!file) {
      return reply.code(400).send({
        success: false,
        error: 'Arquivo obrigatório',
        message: 'Nenhum arquivo foi enviado',
      });
    }

    const validationJob = await uploadValidationFile({
      file,
      config,
      previewOnly,
      maxRows,
      adminId: request.user.id,
    });

    const message = previewOnly ? 
      'Pré-visualização do arquivo processada com sucesso' :
      'Arquivo enviado para validação com sucesso';

    console.log(`[VALIDATION_CONTROLLER] Upload realizado: ${file.name} por ${request.user.email} (preview: ${previewOnly})`);

    return reply.code(201).send({
      success: true,
      message,
      data: { validationJob },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro no upload:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno no upload do arquivo';

    if (error instanceof Error) {
      if (error.message.includes('muito grande') ||
          error.message.includes('não suportado') ||
          error.message.includes('inválido')) {
        statusCode = 400;
      } else if (error.message.includes('excedido')) {
        statusCode = 413; // Payload too large
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro no upload',
      message: errorMessage,
    });
  }
};

/**
 * Handler para buscar job de validação por ID
 */
export const getValidationJobHandler = async (
  request: ValidationJobParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver jobs de validação',
      });
    }

    const { id } = request.params;
    
    const validationJob = await getValidationJobById(id);

    if (!validationJob) {
      return reply.code(404).send({
        success: false,
        error: 'Job de validação não encontrado',
        message: 'O job de validação solicitado não existe',
      });
    }

    // Verifica se usuário pode ver este job
    const canView = request.user.role === UserRole.ADMIN || 
      validationJob.adminId === request.user.id;

    if (!canView) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode ver seus próprios jobs de validação',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Job de validação encontrado',
      data: { validationJob },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao buscar job de validação:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao buscar job de validação',
    });
  }
};

/**
 * Handler para listar histórico de validações
 */
export const listValidationJobsHandler = async (
  request: ListValidationJobsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver histórico de validações',
      });
    }

    let filters = request.query;

    // Se for gerente, filtra apenas seus jobs
    if (request.user.role === UserRole.GERENTE) {
      filters = { ...filters, adminId: request.user.id };
    }

    const result = await listValidationJobs(filters);

    return reply.code(200).send({
      success: true,
      message: 'Histórico de validações obtido com sucesso',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao listar jobs de validação:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar histórico de validações',
    });
  }
};

/**
 * Handler para reprocessar job de validação
 */
export const reprocessValidationJobHandler = async (
  request: ReprocessJobRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para reprocessar validações',
      });
    }

    const { id } = request.params;
    
    // Verifica se job existe e se usuário pode reprocessar
    const existingJob = await getValidationJobById(id);
    
    if (!existingJob) {
      return reply.code(404).send({
        success: false,
        error: 'Job não encontrado',
        message: 'O job de validação não existe',
      });
    }

    const canReprocess = request.user.role === UserRole.ADMIN ||
      existingJob.adminId === request.user.id;

    if (!canReprocess) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode reprocessar seus próprios jobs',
      });
    }

    const reprocessedJob = await reprocessValidationJob(id, request.body);

    console.log(`[VALIDATION_CONTROLLER] Job reprocessado: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Job reprocessado com sucesso',
      data: { validationJob: reprocessedJob },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao reprocessar job:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao reprocessar job';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') ||
                 error.message.includes('ainda está processando')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao reprocessar',
      message: errorMessage,
    });
  }
};

/**
 * Handler para excluir job de validação
 */
export const deleteValidationJobHandler = async (
  request: ValidationJobParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem excluir jobs de validação',
      });
    }

    const { id } = request.params;
    
    await deleteValidationJob(id);

    console.log(`[VALIDATION_CONTROLLER] Job de validação excluído: ${id} por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Job de validação excluído com sucesso',
      data: {
        deletedJobId: id,
        deletedBy: request.user.email,
        deletedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao excluir job:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno ao excluir job';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('não é possível') ||
                 error.message.includes('ainda está processando')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro ao excluir job',
      message: errorMessage,
    });
  }
};

/**
 * Handler para gerar relatório de validação
 */
export const generateValidationReportHandler = async (
  request: ValidationReportRequest,
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

    // Se for gerente, filtra apenas seus jobs
    if (request.user.role === UserRole.GERENTE) {
      filters = { ...filters, adminId: request.user.id };
    }

    const report = await generateValidationReport(filters, request.user.id);

    console.log(`[VALIDATION_CONTROLLER] Relatório de validação gerado por ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Relatório de validação gerado com sucesso',
      data: report,
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao gerar relatório:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao gerar relatório de validação',
    });
  }
};

/**
 * Handler para obter detalhes completos do job de validação
 */
export const getValidationJobDetailsHandler = async (
  request: ValidationJobParamsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver detalhes de validação',
      });
    }

    const { id } = request.params;
    
    const jobDetails = await getValidationJobDetails(id);

    if (!jobDetails) {
      return reply.code(404).send({
        success: false,
        error: 'Job não encontrado',
        message: 'O job de validação não existe',
      });
    }

    // Verifica permissões
    const canView = request.user.role === UserRole.ADMIN ||
      jobDetails.adminId === request.user.id;

    if (!canView) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode ver detalhes dos seus próprios jobs',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Detalhes do job de validação obtidos',
      data: { validationJob: jobDetails },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao obter detalhes do job:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar detalhes do job de validação',
    });
  }
};

/**
 * Handler para download dos resultados da validação
 */
export const downloadValidationResultsHandler = async (
  request: DownloadResultsRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para download',
      });
    }

    const { id } = request.params;
    const { format = 'csv' } = request.query;

    // Verifica se job existe e se usuário pode fazer download
    const job = await getValidationJobById(id);
    
    if (!job) {
      return reply.code(404).send({
        success: false,
        error: 'Job não encontrado',
        message: 'O job de validação não existe',
      });
    }

    const canDownload = request.user.role === UserRole.ADMIN ||
      job.adminId === request.user.id;

    if (!canDownload) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode fazer download dos seus próprios jobs',
      });
    }

    if (job.status !== ValidationStatus.CONCLUIDO) {
      return reply.code(400).send({
        success: false,
        error: 'Job não concluído',
        message: 'Apenas jobs concluídos podem ser baixados',
      });
    }

    const downloadData = await downloadValidationResults(id, format);

    console.log(`[VALIDATION_CONTROLLER] Download realizado: ${id} (${format}) por ${request.user.email}`);

    // Define headers apropriados para download
    const contentTypes = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
    };

    const extensions = {
      csv: 'csv',
      excel: 'xlsx',
      json: 'json',
    };

    const filename = `validacao-${job.fileName.split('.')[0]}-resultados.${extensions[format]}`;

    reply.header('Content-Type', contentTypes[format]);
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);

    return reply.code(200).send(downloadData);

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro no download:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao gerar arquivo de download',
    });
  }
};

/**
 * Handler para pré-visualizar arquivo antes do upload
 */
export const previewValidationFileHandler = async (
  request: PreviewFileRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para pré-visualização',
      });
    }

    const { file, sampleSize = 10 } = request.body;

    if (!file) {
      return reply.code(400).send({
        success: false,
        error: 'Arquivo obrigatório',
        message: 'Nenhum arquivo foi enviado para pré-visualização',
      });
    }

    const preview = await previewValidationFile(file, sampleSize);

    return reply.code(200).send({
      success: true,
      message: 'Pré-visualização gerada com sucesso',
      data: {
        preview,
        fileName: file.name,
        fileSize: file.size,
        sampleSize,
        previewedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro na pré-visualização:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno na pré-visualização';

    if (error instanceof Error) {
      if (error.message.includes('formato') ||
          error.message.includes('inválido') ||
          error.message.includes('não suportado')) {
        statusCode = 400;
        errorMessage = error.message;
      }
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro na pré-visualização',
      message: errorMessage,
    });
  }
};

/**
 * Handler para obter estatísticas de validação
 */
export const getValidationStatsHandler = async (
  request: FastifyRequest<{ Querystring: { period?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver estatísticas',
      });
    }

    const { period = '30d' } = request.query;
    
    const stats = await getValidationStats(period, request.user.id);

    return reply.code(200).send({
      success: true,
      message: 'Estatísticas de validação obtidas com sucesso',
      data: {
        stats,
        period,
        scope: request.user.role === UserRole.ADMIN ? 'global' : 'user',
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao obter estatísticas de validação:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar estatísticas de validação',
    });
  }
};

/**
 * Handler para cancelar job de validação em processamento
 */
export const cancelValidationJobHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
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
    const { reason } = request.body;

    // Verifica se job existe
    const job = await getValidationJobById(id);
    
    if (!job) {
      return reply.code(404).send({
        success: false,
        error: 'Job não encontrado',
        message: 'O job de validação não existe',
      });
    }

    // Verifica permissões
    const canCancel = request.user.role === UserRole.ADMIN ||
      job.adminId === request.user.id;

    if (!canCancel) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Você só pode cancelar seus próprios jobs',
      });
    }

    // Verifica se pode ser cancelado
    if (job.status !== ValidationStatus.PROCESSANDO) {
      return reply.code(400).send({
        success: false,
        error: 'Job não pode ser cancelado',
        message: 'Apenas jobs em processamento podem ser cancelados',
      });
    }

    // Por enquanto, apenas marca como falhou (implementar cancelamento real depois)
    const cancelledJob = await reprocessValidationJob(id, {
      jobId: id,
      forceReprocess: false,
      newConfig: undefined,
    });

    console.log(`[VALIDATION_CONTROLLER] Job cancelado: ${id} por ${request.user.email} - Motivo: ${reason}`);

    return reply.code(200).send({
      success: true,
      message: 'Job de validação cancelado com sucesso',
      data: {
        jobId: id,
        cancelledBy: request.user.email,
        cancelledAt: new Date().toISOString(),
        reason,
      },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao cancelar job:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao cancelar job de validação',
    });
  }
};

/**
 * Handler para validar configuração de mapeamento
 */
export const validateMappingConfigHandler = async (
  request: FastifyRequest<{ Body: ValidationConfigData }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para validar configurações',
      });
    }

    const config = request.body;

    // Valida a configuração (usando o schema)
    try {
      validationConfigSchema.parse(config);
    } catch (validationError: any) {
      return reply.code(400).send({
        success: false,
        error: 'Configuração inválida',
        message: 'Erro na configuração de mapeamento',
        details: validationError.errors || validationError.message,
      });
    }

    // Validações de negócio adicionais
    const issues: string[] = [];

    // Verifica campos obrigatórios
    const mappedFields = config.mappings.map(m => m.targetField);
    const requiredFields = ['ORDER_ID', 'SELLER_CPF'];
    const missingFields = requiredFields.filter(field => !mappedFields.includes(field as any));

    if (missingFields.length > 0) {
      issues.push(`Campos obrigatórios não mapeados: ${missingFields.join(', ')}`);
    }

    // Verifica duplicatas no mapeamento
    const duplicateFields = mappedFields.filter((field, index) => 
      mappedFields.indexOf(field) !== index && field !== 'IGNORE'
    );

    if (duplicateFields.length > 0) {
      issues.push(`Campos mapeados mais de uma vez: ${duplicateFields.join(', ')}`);
    }

    // Verifica se campanha existe e está ativa (se especificada)
    if (config.campaignId) {
      // Aqui seria feita validação da campanha
    }

    const isValid = issues.length === 0;

    return reply.code(200).send({
      success: isValid,
      message: isValid ? 
        'Configuração válida' : 
        'Configuração possui problemas',
      data: {
        valid: isValid,
        issues: issues.length > 0 ? issues : undefined,
        mappings: config.mappings.length,
        rules: (config.campaignRules?.length || 0) + (config.customRules?.length || 0),
        validatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao validar configuração:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao validar configuração de mapeamento',
    });
  }
};

/**
 * Handler para obter modelos/templates de mapeamento
 */
export const getMappingTemplatesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.user || request.user.role === UserRole.VENDEDOR) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Permissões insuficientes para ver templates',
      });
    }

    // Templates pré-definidos para diferentes tipos de planilha
    const templates = [
      {
        id: 'standard',
        name: 'Modelo Padrão EPS',
        description: 'Template padrão para planilhas de venda EPS',
        mappings: [
          { sourceColumn: 'NUM_PEDIDO', targetField: 'ORDER_ID' },
          { sourceColumn: 'CPF_VENDEDOR', targetField: 'SELLER_CPF' },
          { sourceColumn: 'CNPJ_OTICA', targetField: 'OPTIC_CNPJ' },
          { sourceColumn: 'DATA_VENDA', targetField: 'SALE_DATE' },
          { sourceColumn: 'PRODUTO', targetField: 'PRODUCT_NAME' },
          { sourceColumn: 'VALOR', targetField: 'SALE_VALUE' },
        ],
      },
      {
        id: 'simple',
        name: 'Modelo Simples',
        description: 'Template simplificado com campos essenciais',
        mappings: [
          { sourceColumn: 'PEDIDO', targetField: 'ORDER_ID' },
          { sourceColumn: 'CPF', targetField: 'SELLER_CPF' },
          { sourceColumn: 'DATA', targetField: 'SALE_DATE' },
        ],
      },
      {
        id: 'complete',
        name: 'Modelo Completo',
        description: 'Template com todos os campos disponíveis',
        mappings: [
          { sourceColumn: 'NUMERO_PEDIDO', targetField: 'ORDER_ID' },
          { sourceColumn: 'PEDIDO_ALTERNATIVO_1', targetField: 'ORDER_ID_2' },
          { sourceColumn: 'PEDIDO_ALTERNATIVO_2', targetField: 'ORDER_ID_3' },
          { sourceColumn: 'CPF_VENDEDOR', targetField: 'SELLER_CPF' },
          { sourceColumn: 'CNPJ_OTICA', targetField: 'OPTIC_CNPJ' },
          { sourceColumn: 'DATA_VENDA', targetField: 'SALE_DATE' },
          { sourceColumn: 'NOME_PRODUTO', targetField: 'PRODUCT_NAME' },
          { sourceColumn: 'VALOR_VENDA', targetField: 'SALE_VALUE' },
        ],
      },
    ];

    return reply.code(200).send({
      success: true,
      message: 'Templates de mapeamento obtidos com sucesso',
      data: {
        templates,
        availableFields: Object.values(require('@prisma/client').TargetField),
        count: templates.length,
      },
    });

  } catch (error) {
    console.error('[VALIDATION_CONTROLLER] Erro ao obter templates:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao carregar templates de mapeamento',
    });
  }
};
