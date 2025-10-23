/**
 * @file validation.routes.ts
 * @version 2.0.0
 * @description Rotas para sistema de validação de planilhas da API EPS Campanhas.
 * Define endpoints para upload, processamento e validação de dados em massa.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa das rotas de validação
 * - Sistema de upload com pré-visualização
 * - Mapeamento dinâmico de colunas
 * - Processamento em lote otimizado
 * - Templates e configurações pré-definidas
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { 
  validationJobParamsSchema,
  validationHistoryFiltersSchema,
  validationConfigSchema,
  reprocessValidationJobSchema,
  validationReportSchema
} from '../schemas/validation.schema';
import {
  uploadValidationFileHandler,
  getValidationJobHandler,
  listValidationJobsHandler,
  reprocessValidationJobHandler,
  deleteValidationJobHandler,
  generateValidationReportHandler,
  getValidationJobDetailsHandler,
  downloadValidationResultsHandler,
  previewValidationFileHandler,
  getValidationStatsHandler,
  cancelValidationJobHandler,
  validateMappingConfigHandler,
  getMappingTemplatesHandler
} from '../controllers/validation.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

// ==================== PLUGIN DE ROTAS DE VALIDAÇÃO ====================

export async function validationRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Registra provider de tipos Zod
  fastify.withTypeProvider<ZodTypeProvider>();

  // ==================== MIDDLEWARE GLOBAL ====================
  // Todas as rotas de validação requerem autenticação
  fastify.addHook('preHandler', authenticate);

  // Apenas gerentes e admins podem acessar validação
  fastify.addHook('preHandler', authorize(UserRole.ADMIN, UserRole.GERENTE));

  // ==================== ROTAS PRINCIPAIS ====================

  /**
   * POST /api/validation/upload
   * Upload de arquivo para validação
   */
  fastify.post('/upload', {
    schema: {
      description: 'Upload de arquivo para processamento e validação',
      tags: ['Validação'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          file: { 
            type: 'string', 
            format: 'binary',
            description: 'Arquivo Excel ou CSV com dados de vendas' 
          },
          config: {
            type: 'string',
            description: 'Configuração de validação em formato JSON'
          },
          previewOnly: { 
            type: 'boolean',
            description: 'Se true, apenas gera pré-visualização sem processar' 
          },
          maxRows: { 
            type: 'number',
            minimum: 1,
            maximum: 100000,
            description: 'Número máximo de linhas a processar' 
          },
        },
        required: ['file', 'config'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                validationJob: { type: 'object' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        413: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, uploadValidationFileHandler);

  /**
   * POST /api/validation/preview
   * Pré-visualização de arquivo antes do upload
   */
  fastify.post('/preview', {
    schema: {
      description: 'Pré-visualização de arquivo para configurar mapeamento',
      tags: ['Validação'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          file: { 
            type: 'string', 
            format: 'binary',
            description: 'Arquivo para pré-visualização' 
          },
          sampleSize: { 
            type: 'number',
            minimum: 1,
            maximum: 50,
            default: 10,
            description: 'Número de linhas de amostra' 
          },
        },
        required: ['file'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                preview: { type: 'object' },
                fileName: { type: 'string' },
                fileSize: { type: 'number' },
                sampleSize: { type: 'number' },
                previewedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, previewValidationFileHandler);

  /**
   * GET /api/validation/jobs
   * Lista histórico de jobs de validação
   */
  fastify.get('/jobs', {
    schema: {
      description: 'Lista histórico de jobs de validação',
      tags: ['Validação'],
      querystring: validationHistoryFiltersSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'array' },
            pagination: { type: 'object' },
            summary: { type: 'object' },
          },
        },
      },
    },
  }, listValidationJobsHandler);

  /**
   * GET /api/validation/jobs/:id
   * Busca job de validação específico
   */
  fastify.get('/jobs/:id', {
    schema: {
      description: 'Busca job de validação por ID',
      tags: ['Validação'],
      params: validationJobParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                validationJob: { type: 'object' },
              },
            },
          },
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, getValidationJobHandler);

  /**
   * GET /api/validation/jobs/:id/details
   * Detalhes completos do job de validação
   */
  fastify.get('/jobs/:id/details', {
    schema: {
      description: 'Obtém detalhes completos do job de validação',
      tags: ['Validação'],
      params: validationJobParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                validationJob: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, getValidationJobDetailsHandler);

  /**
   * GET /api/validation/jobs/:id/download
   * Download dos resultados da validação
   */
  fastify.get('/jobs/:id/download', {
    schema: {
      description: 'Download dos resultados da validação',
      tags: ['Validação'],
      params: validationJobParamsSchema,
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'excel', 'json'], default: 'csv' },
        },
      },
      response: {
        200: {
          description: 'Arquivo de resultados',
          type: 'string',
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, downloadValidationResultsHandler);

  /**
   * POST /api/validation/jobs/:id/reprocess
   * Reprocessa job de validação
   */
  fastify.post('/jobs/:id/reprocess', {
    schema: {
      description: 'Reprocessa job de validação com nova configuração',
      tags: ['Validação'],
      params: validationJobParamsSchema,
      body: reprocessValidationJobSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                validationJob: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, reprocessValidationJobHandler);

  /**
   * DELETE /api/validation/jobs/:id
   * Exclui job de validação (apenas admin)
   */
  fastify.delete('/jobs/:id', {
    preHandler: [authorize(UserRole.ADMIN)],
    schema: {
      description: 'Exclui job de validação',
      tags: ['Validação', 'Administração'],
      params: validationJobParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                deletedJobId: { type: 'string' },
                deletedBy: { type: 'string' },
                deletedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, deleteValidationJobHandler);

  /**
   * POST /api/validation/jobs/:id/cancel
   * Cancela job em processamento
   */
  fastify.post('/jobs/:id/cancel', {
    schema: {
      description: 'Cancela job de validação em processamento',
      tags: ['Validação'],
      params: validationJobParamsSchema,
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string', minLength: 5, maxLength: 200 },
        },
        required: ['reason'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                jobId: { type: 'string' },
                cancelledBy: { type: 'string' },
                cancelledAt: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, cancelValidationJobHandler);

  // ==================== ROTAS DE CONFIGURAÇÃO ====================

  /**
   * POST /api/validation/validate-config
   * Valida configuração de mapeamento
   */
  fastify.post('/validate-config', {
    schema: {
      description: 'Valida configuração de mapeamento de colunas',
      tags: ['Validação', 'Configuração'],
      body: validationConfigSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                issues: { type: 'array' },
                mappings: { type: 'number' },
                rules: { type: 'number' },
                validatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, validateMappingConfigHandler);

  /**
   * GET /api/validation/templates
   * Obtém templates de mapeamento pré-definidos
   */
  fastify.get('/templates', {
    schema: {
      description: 'Lista templates de mapeamento disponíveis',
      tags: ['Validação', 'Templates'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                templates: { type: 'array' },
                availableFields: { type: 'array' },
                count: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, getMappingTemplatesHandler);

  // ==================== ROTAS DE RELATÓRIOS ====================

  /**
   * GET /api/validation/report
   * Gera relatório de validações
   */
  fastify.get('/report', {
    schema: {
      description: 'Gera relatório detalhado de validações',
      tags: ['Validação', 'Relatórios'],
      querystring: validationReportSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, generateValidationReportHandler);

  /**
   * GET /api/validation/stats
   * Estatísticas do sistema de validação
   */
  fastify.get('/stats', {
    schema: {
      description: 'Estatísticas do sistema de validação',
      tags: ['Validação', 'Estatísticas'],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['7d', '30d', '90d', 'all'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                stats: { type: 'object' },
                period: { type: 'string' },
                scope: { type: 'string' },
                generatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, getValidationStatsHandler);

  // ==================== HOOKS ESPECÍFICOS ====================

  // Hook para log de uploads e operações críticas
  fastify.addHook('onRequest', async (request, reply) => {
    const criticalOperations = ['/upload', '/reprocess', '/cancel', 'DELETE /'];
    const isCritical = criticalOperations.some(op => 
      request.url.includes('/upload') ||
      request.url.includes('/reprocess') ||
      request.url.includes('/cancel') ||
      request.method === 'DELETE'
    );
    
    if (isCritical) {
      console.log(`[VALIDATION_ROUTES] Operação crítica de validação: ${request.method} ${request.url} por ${request.user?.email || 'não autenticado'}`);
    }
  });

  // Hook para validação de tamanho de arquivo
  fastify.addHook('preHandler', async (request, reply) => {
    // Para uploads, verifica se há limitações de tamanho
    if (request.url.includes('/upload') || request.url.includes('/preview')) {
      // O Fastify já lida com limites de payload, mas podemos adicionar validações específicas
      
      const contentLength = request.headers['content-length'];
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        
        // Limite de 50MB para uploads
        if (sizeInMB > 50) {
          reply.code(413).send({
            success: false,
            error: 'Arquivo muito grande',
            message: 'Tamanho máximo permitido: 50MB',
          });
          return;
        }

        // Aviso para arquivos grandes
        if (sizeInMB > 10) {
          console.warn(`[VALIDATION_ROUTES] Upload de arquivo grande: ${sizeInMB.toFixed(2)}MB por ${request.user?.email}`);
        }
      }
    }
  });

  // Hook para headers de segurança em uploads
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Headers específicos para upload
    if (request.url.includes('/upload') || request.url.includes('/preview')) {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
    }

    // Headers para downloads
    if (request.url.includes('/download')) {
      reply.header('X-Content-Type-Options', 'nosniff');
      // Content-Type e Content-Disposition são definidos no controller
    }

    // Cache específico para templates (podem ser cacheados por mais tempo)
    if (request.url.includes('/templates')) {
      reply.header('Cache-Control', 'private, max-age=3600'); // 1 hora
    }

    // Estatísticas podem ter cache médio
    if (request.url.includes('/stats') || request.url.includes('/report')) {
      reply.header('Cache-Control', 'private, max-age=600'); // 10 minutos
    }

    // Jobs de validação têm cache curto (dados dinâmicos)
    if (request.url.includes('/jobs') && request.method === 'GET') {
      reply.header('Cache-Control', 'private, max-age=30'); // 30 segundos
    }

    // Operações de modificação não devem ser cacheadas
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    return payload;
  });

  // Hook para monitoramento de performance de processamento
  fastify.addHook('onResponse', async (request, reply) => {
    const responseTime = reply.elapsedTime;
    
    // Monitora uploads que demoram muito
    if (request.url.includes('/upload') && responseTime > 30000) { // 30 segundos
      console.warn(`[VALIDATION_ROUTES] Upload muito lento: ${responseTime}ms por ${request.user?.email}`);
    }
    
    // Monitora downloads
    if (request.url.includes('/download') && reply.statusCode >= 200 && reply.statusCode < 300) {
      console.log(`[VALIDATION_ROUTES] Download realizado: ${request.url} em ${responseTime}ms`);
    }

    // Log de jobs processados com sucesso
    if ((request.url.includes('/upload') || request.url.includes('/reprocess')) &&
        reply.statusCode >= 200 && reply.statusCode < 300) {
      
      console.log(`[VALIDATION_ROUTES] Processamento concluído: ${request.method} ${request.url} por ${request.user?.email} em ${responseTime}ms`);
    }
  });

  // Hook para validação de tipos de arquivo
  fastify.addHook('preHandler', async (request, reply) => {
    // Para uploads, valida tipo de arquivo no header Content-Type
    if ((request.url.includes('/upload') || request.url.includes('/preview')) && 
        request.method === 'POST') {
      
      const contentType = request.headers['content-type'] || '';
      
      // Aceita multipart/form-data e alguns tipos específicos
      const acceptedTypes = [
        'multipart/form-data',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
        'application/vnd.ms-excel', // Excel antigo
        'text/csv', // CSV
        'application/csv'
      ];

      const isValidType = acceptedTypes.some(type => contentType.includes(type));
      
      if (!isValidType) {
        reply.code(400).send({
          success: false,
          error: 'Tipo de arquivo não suportado',
          message: 'Apenas arquivos Excel (.xlsx, .xls) e CSV (.csv) são aceitos',
        });
        return;
      }
    }
  });

  // Hook para validação de configuração JSON
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/validate-config') && request.body) {
      const body = request.body as any;
      
      // Validações básicas de configuração
      if (!body.mappings || !Array.isArray(body.mappings)) {
        reply.code(400).send({
          success: false,
          error: 'Configuração inválida',
          message: 'Mappings é obrigatório e deve ser um array',
        });
        return;
      }
      
      if (body.mappings.length === 0) {
        reply.code(400).send({
          success: false,
          error: 'Configuração inválida',
          message: 'Pelo menos um mapeamento deve ser fornecido',
        });
        return;
      }
    }
  });
}
