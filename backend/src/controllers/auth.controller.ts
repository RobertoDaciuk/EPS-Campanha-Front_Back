/**
 * @file auth.controller.ts
 * @version 2.0.0
 * @description Controller para operações de autenticação da API EPS Campanhas.
 * Gerencia login, registro, alteração de senha e operações relacionadas à autenticação.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do controller de autenticação
 * - Validação robusta de entrada com Zod
 * - Tratamento de erros padronizado
 * - Rate limiting integrado
 * - Logs de auditoria
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { 
  loginSchema, 
  registerSchema, 
  changePasswordSchema,
  updateProfileSchema,
  checkEmailSchema,
  checkCPFSchema,
  validateCNPJSchema,
  LoginData,
  UserRegistrationData,
  ChangePasswordData,
  UpdateProfileData,
  CheckEmailData,
  CheckCPFData,
  ValidateCNPJData
} from '../schemas/auth.schema';
import { 
  loginUser, 
  registerUser, 
  changeUserPassword,
  updateUserProfile,
  refreshAuthToken,
  logoutUser,
  checkEmailAvailability,
  checkCPFAvailability,
  getOpticDataByCNPJ,
  getLoginAttemptStats
} from '../services/auth.service';

// ==================== INTERFACES DE REQUEST ====================

interface LoginRequest extends FastifyRequest {
  Body: LoginData;
}

interface RegisterRequest extends FastifyRequest {
  Body: UserRegistrationData;
}

interface ChangePasswordRequest extends FastifyRequest {
  Body: ChangePasswordData;
}

interface UpdateProfileRequest extends FastifyRequest {
  Body: UpdateProfileData;
}

interface CheckEmailRequest extends FastifyRequest {
  Body: CheckEmailData;
}

interface CheckCPFRequest extends FastifyRequest {
  Body: CheckCPFData;
}

interface ValidateCNPJRequest extends FastifyRequest {
  Body: ValidateCNPJData;
}

interface RefreshTokenRequest extends FastifyRequest {
  Body: { refreshToken: string };
}

// ==================== HANDLERS PRINCIPAIS ====================

/**
 * Handler para login de usuário
 */
export const loginHandler = async (
  request: LoginRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { email, password } = request.body;

    // Verifica rate limiting antes de tentar login
    const attemptStats = getLoginAttemptStats(email);
    
    if (attemptStats.isLocked) {
      const remainingMinutes = Math.ceil(attemptStats.remainingTime / 60);
      return reply.code(429).send({
        success: false,
        error: 'Muitas tentativas de login',
        message: `Conta temporariamente bloqueada. Tente novamente em ${remainingMinutes} minutos`,
        retryAfter: attemptStats.remainingTime,
      });
    }

    console.log(`[AUTH_CONTROLLER] Tentativa de login para: ${email}`);

    const result = await loginUser(email, password);

    if (!result) {
      return reply.code(401).send({
        success: false,
        error: 'Credenciais inválidas',
        message: 'E-mail ou senha incorretos',
        attemptsRemaining: attemptStats.attemptsRemaining - 1,
      });
    }

    console.log(`[AUTH_CONTROLLER] Login bem-sucedido: ${result.user.role} - ${email}`);

    return reply.code(200).send({
      success: true,
      message: 'Login realizado com sucesso',
      data: result,
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro no login:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno no login';
    
    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: errorMessage,
    });
  }
};

/**
 * Handler para registro de novo usuário
 */
export const registerHandler = async (
  request: RegisterRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    console.log(`[AUTH_CONTROLLER] Registro de novo usuário: ${request.body.email} (${request.body.role})`);

    const newUser = await registerUser(request.body);

    console.log(`[AUTH_CONTROLLER] Usuário registrado com sucesso: ${newUser.email}`);

    return reply.code(201).send({
      success: true,
      message: 'Usuário registrado com sucesso',
      data: { user: newUser },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro no registro:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno no registro';

    if (error instanceof Error) {
      if (error.message.includes('e-mail já está cadastrado') || 
          error.message.includes('CPF já está cadastrado')) {
        statusCode = 409; // Conflict
      } else if (error.message.includes('inválido') || 
                 error.message.includes('não encontrado')) {
        statusCode = 400; // Bad Request
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro no registro',
      message: errorMessage,
    });
  }
};

/**
 * Handler para alteração de senha
 */
export const changePasswordHandler = async (
  request: ChangePasswordRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.isAuthenticated || !request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autorizado',
        message: 'Usuário não autenticado',
      });
    }

    await changeUserPassword(request.user.id, request.body);

    console.log(`[AUTH_CONTROLLER] Senha alterada com sucesso: ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Senha alterada com sucesso',
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro na alteração de senha:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno na alteração de senha';

    if (error instanceof Error) {
      if (error.message.includes('atual incorreta')) {
        statusCode = 400;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro na alteração de senha',
      message: errorMessage,
    });
  }
};

/**
 * Handler para atualização de perfil
 */
export const updateProfileHandler = async (
  request: UpdateProfileRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.isAuthenticated || !request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autorizado',
        message: 'Usuário não autenticado',
      });
    }

    const updatedUser = await updateUserProfile(request.user.id, request.body);

    console.log(`[AUTH_CONTROLLER] Perfil atualizado: ${request.user.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: { user: updatedUser },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro na atualização de perfil:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno na atualização';

    return reply.code(500).send({
      success: false,
      error: 'Erro na atualização',
      message: errorMessage,
    });
  }
};

/**
 * Handler para verificar disponibilidade de email
 */
export const checkEmailHandler = async (
  request: CheckEmailRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { email } = request.body;
    const excludeUserId = request.user?.id; // Se autenticado, exclui próprio usuário

    const isAvailable = await checkEmailAvailability(email, excludeUserId);

    return reply.code(200).send({
      success: true,
      data: {
        email,
        available: isAvailable,
        message: isAvailable ? 'E-mail disponível' : 'E-mail já está em uso',
      },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao verificar email:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao verificar disponibilidade do e-mail',
    });
  }
};

/**
 * Handler para verificar disponibilidade de CPF
 */
export const checkCPFHandler = async (
  request: CheckCPFRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { cpf } = request.body;
    const excludeUserId = request.user?.id;

    const isAvailable = await checkCPFAvailability(cpf, excludeUserId);

    return reply.code(200).send({
      success: true,
      data: {
        cpf,
        available: isAvailable,
        message: isAvailable ? 'CPF disponível' : 'CPF já está cadastrado',
      },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao verificar CPF:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao verificar disponibilidade do CPF',
    });
  }
};

/**
 * Handler para validar CNPJ de ótica
 */
export const validateCNPJHandler = async (
  request: ValidateCNPJRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { cnpj } = request.body;

    const opticData = await getOpticDataByCNPJ(cnpj);

    if (!opticData) {
      return reply.code(404).send({
        success: false,
        error: 'CNPJ não encontrado',
        message: 'CNPJ inválido ou não cadastrado no sistema',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'CNPJ válido',
      data: opticData,
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao validar CNPJ:', error);

    return reply.code(400).send({
      success: false,
      error: 'CNPJ inválido',
      message: 'Formato de CNPJ inválido',
    });
  }
};

/**
 * Handler para refresh token
 */
export const refreshTokenHandler = async (
  request: RefreshTokenRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.code(400).send({
        success: false,
        error: 'Refresh token obrigatório',
        message: 'Refresh token deve ser fornecido',
      });
    }

    const result = await refreshAuthToken(refreshToken);

    return reply.code(200).send({
      success: true,
      message: 'Token renovado com sucesso',
      data: result,
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao renovar token:', error);
    
    let statusCode = 500;
    let errorMessage = 'Erro interno na renovação de token';

    if (error instanceof Error) {
      if (error.message.includes('inválido') || error.message.includes('expirado')) {
        statusCode = 401;
      }
      errorMessage = error.message;
    }

    return reply.code(statusCode).send({
      success: false,
      error: 'Erro na renovação',
      message: errorMessage,
    });
  }
};

/**
 * Handler para logout
 */
export const logoutHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (request.isAuthenticated && request.user) {
      await logoutUser(request.user.id);
      console.log(`[AUTH_CONTROLLER] Logout realizado: ${request.user.email}`);
    }

    return reply.code(200).send({
      success: true,
      message: 'Logout realizado com sucesso',
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro no logout:', error);

    return reply.code(200).send({
      success: true,
      message: 'Logout realizado (com avisos)',
    });
  }
};

/**
 * Handler para verificar status de autenticação
 */
export const verifyAuthHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.isAuthenticated || !request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Token inválido ou expirado',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Autenticação válida',
      data: {
        user: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          role: request.user.role,
          status: request.user.status,
          opticName: request.user.opticName,
        },
        authenticated: true,
      },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro na verificação de auth:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao verificar autenticação',
    });
  }
};

/**
 * Handler para obter informações do usuário atual
 */
export const getMeHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.isAuthenticated || !request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Não autenticado',
        message: 'Token inválido ou expirado',
      });
    }

    // Busca dados completos do usuário
    const fullUser = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        whatsapp: true,
        avatarUrl: true,
        role: true,
        status: true,
        opticName: true,
        opticCNPJ: true,
        level: true,
        points: true,
        pointsToNextLevel: true,
        managerId: true,
        createdAt: true,
        updatedAt: true,
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
    });

    if (!fullUser) {
      return reply.code(404).send({
        success: false,
        error: 'Usuário não encontrado',
        message: 'Dados do usuário não foram encontrados',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Dados do usuário obtidos com sucesso',
      data: { user: fullUser },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao obter dados do usuário:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao obter dados do usuário',
    });
  }
};

// ==================== HANDLERS DE VALIDAÇÃO ====================

/**
 * Handler para verificar disponibilidade de email (GET)
 */
export const checkEmailAvailabilityHandler = async (
  request: FastifyRequest<{ Querystring: { email: string; excludeUserId?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { email, excludeUserId } = request.query;

    if (!email) {
      return reply.code(400).send({
        success: false,
        error: 'Email obrigatório',
        message: 'Parâmetro email é obrigatório',
      });
    }

    const isAvailable = await checkEmailAvailability(email, excludeUserId);

    return reply.code(200).send({
      success: true,
      data: {
        email,
        available: isAvailable,
        message: isAvailable ? 'E-mail disponível' : 'E-mail já está em uso',
      },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao verificar disponibilidade do email:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao verificar disponibilidade do e-mail',
    });
  }
};

/**
 * Handler para verificar disponibilidade de CPF (GET)
 */
export const checkCPFAvailabilityHandler = async (
  request: FastifyRequest<{ Querystring: { cpf: string; excludeUserId?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { cpf, excludeUserId } = request.query;

    if (!cpf) {
      return reply.code(400).send({
        success: false,
        error: 'CPF obrigatório',
        message: 'Parâmetro cpf é obrigatório',
      });
    }

    const isAvailable = await checkCPFAvailability(cpf, excludeUserId);

    return reply.code(200).send({
      success: true,
      data: {
        cpf,
        available: isAvailable,
        message: isAvailable ? 'CPF disponível' : 'CPF já está cadastrado',
      },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao verificar disponibilidade do CPF:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao verificar disponibilidade do CPF',
    });
  }
};

/**
 * Handler para buscar dados da ótica por CNPJ
 */
export const getOpticByCNPJHandler = async (
  request: FastifyRequest<{ Params: { cnpj: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { cnpj } = request.params;

    const opticData = await getOpticDataByCNPJ(cnpj);

    if (!opticData) {
      return reply.code(404).send({
        success: false,
        error: 'CNPJ não encontrado',
        message: 'CNPJ inválido ou não encontrado',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Dados da ótica obtidos com sucesso',
      data: opticData,
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao buscar dados da ótica:', error);

    return reply.code(400).send({
      success: false,
      error: 'CNPJ inválido',
      message: 'Formato de CNPJ inválido ou erro na consulta',
    });
  }
};

/**
 * Handler para obter estatísticas de rate limiting
 */
export const getLoginAttemptsHandler = async (
  request: FastifyRequest<{ Querystring: { email: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { email } = request.query;

    if (!email) {
      return reply.code(400).send({
        success: false,
        error: 'Email obrigatório',
        message: 'Parâmetro email é obrigatório',
      });
    }

    const stats = getLoginAttemptStats(email);

    return reply.code(200).send({
      success: true,
      message: 'Estatísticas de tentativas de login',
      data: stats,
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao obter estatísticas de login:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao obter estatísticas de login',
    });
  }
};

// ==================== HANDLERS DE UTILIDADE ====================

/**
 * Handler para health check de autenticação
 */
export const authHealthCheckHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // Testa conexão com banco de dados
    const userCount = await prisma.user.count();
    
    return reply.code(200).send({
      success: true,
      message: 'Serviço de autenticação funcionando',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        userCount,
        jwtConfigured: !!process.env.JWT_SECRET,
      },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro no health check:', error);

    return reply.code(503).send({
      success: false,
      error: 'Serviço indisponível',
      message: 'Erro na verificação de saúde do serviço de autenticação',
    });
  }
};

/**
 * Handler para invalidar sessões de um usuário (admin)
 */
export const invalidateUserSessionsHandler = async (
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    if (!request.isAuthenticated || !request.user || request.user.role !== UserRole.ADMIN) {
      return reply.code(403).send({
        success: false,
        error: 'Acesso negado',
        message: 'Apenas administradores podem invalidar sessões',
      });
    }

    const { userId } = request.params;

    // Busca usuário alvo
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return reply.code(404).send({
        success: false,
        error: 'Usuário não encontrado',
        message: 'Usuário não encontrado no sistema',
      });
    }

    // Por enquanto apenas logout
    await logoutUser(userId);

    console.log(`[AUTH_CONTROLLER] Sessões invalidadas pelo admin ${request.user.email} para usuário ${targetUser.email}`);

    return reply.code(200).send({
      success: true,
      message: 'Sessões do usuário invalidadas com sucesso',
      data: {
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
        },
        invalidatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[AUTH_CONTROLLER] Erro ao invalidar sessões:', error);

    return reply.code(500).send({
      success: false,
      error: 'Erro interno',
      message: 'Erro ao invalidar sessões do usuário',
    });
  }
};
