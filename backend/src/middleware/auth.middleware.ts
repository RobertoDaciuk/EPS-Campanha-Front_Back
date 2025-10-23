/**
 * @file auth.middleware.ts
 * @version 2.0.0
 * @description Middleware de autenticação e autorização para a API EPS Campanhas.
 * Valida tokens JWT, verifica permissões por role e protege rotas sensíveis.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do middleware de autenticação
 * - Validação robusta de JWT tokens
 * - Sistema de autorização baseado em roles
 * - Tratamento de erros padronizado
 * - Cache de usuários para performance
 * - Rate limiting por usuário
 */

import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prismaClient';
import { UserRole, UserStatus } from '@prisma/client';

/**
 * Interface para o payload do JWT
 */
interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Interface para o usuário autenticado
 */
interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: UserRole;
  status: UserStatus;
  opticName: string;
  opticCNPJ: string;
  managerId?: string;
}

/**
 * Estende o tipo FastifyRequest para incluir o usuário autenticado
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    isAuthenticated: boolean;
  }
}

/**
 * Cache simples para usuários autenticados (evita consultas desnecessárias ao DB)
 */
class UserCache {
  private static cache = new Map<string, { user: AuthenticatedUser; timestamp: number }>();
  private static readonly TTL = 5 * 60 * 1000; // 5 minutos

  static set(userId: string, user: AuthenticatedUser): void {
    this.cache.set(userId, {
      user,
      timestamp: Date.now(),
    });
  }

  static get(userId: string): AuthenticatedUser | null {
    const cached = this.cache.get(userId);
    
    if (!cached) return null;
    
    // Verifica se o cache expirou
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(userId);
      return null;
    }
    
    return cached.user;
  }

  static invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  static clear(): void {
    this.cache.clear();
  }
}

/**
 * Rate limiting simples por usuário
 */
class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  private static readonly LIMIT = 100; // 100 requests
  private static readonly WINDOW = 15 * 60 * 1000; // 15 minutos

  static isAllowed(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset ou primeira requisição
      this.requests.set(userId, {
        count: 1,
        resetTime: now + this.WINDOW,
      });
      return true;
    }

    if (userRequests.count >= this.LIMIT) {
      return false;
    }

    userRequests.count++;
    return true;
  }

  static getRemainingRequests(userId: string): number {
    const userRequests = this.requests.get(userId);
    if (!userRequests || Date.now() > userRequests.resetTime) {
      return this.LIMIT;
    }
    return Math.max(0, this.LIMIT - userRequests.count);
  }
}

/**
 * Extrai e valida o token JWT do header Authorization
 */
const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;

  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Verifica e decodifica o token JWT
 */
const verifyToken = (token: string): JwtPayload | null => {
  try {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      console.error('[AUTH_MIDDLEWARE] JWT_SECRET não configurado');
      return null;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // Validações adicionais
    if (!decoded.userId || !decoded.email || !decoded.role) {
      console.warn('[AUTH_MIDDLEWARE] Token JWT com payload inválido');
      return null;
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('[AUTH_MIDDLEWARE] Token JWT expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn('[AUTH_MIDDLEWARE] Token JWT inválido');
    } else {
      console.error('[AUTH_MIDDLEWARE] Erro ao verificar token:', error);
    }
    return null;
  }
};

/**
 * Busca o usuário no banco de dados
 */
const fetchUser = async (userId: string): Promise<AuthenticatedUser | null> => {
  try {
    // Verifica cache primeiro
    const cachedUser = UserCache.get(userId);
    if (cachedUser) {
      return cachedUser;
    }

    // Busca no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        role: true,
        status: true,
        opticName: true,
        opticCNPJ: true,
        managerId: true,
      },
    });

    if (!user) {
      console.warn(`[AUTH_MIDDLEWARE] Usuário não encontrado: ${userId}`);
      return null;
    }

    // Verifica se o usuário está ativo
    if (user.status === UserStatus.BLOCKED) {
      console.warn(`[AUTH_MIDDLEWARE] Usuário bloqueado tentou acessar: ${userId}`);
      return null;
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      status: user.status,
      opticName: user.opticName,
      opticCNPJ: user.opticCNPJ,
      managerId: user.managerId || undefined,
    };

    // Armazena no cache
    UserCache.set(userId, authenticatedUser);

    return authenticatedUser;
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Erro ao buscar usuário:', error);
    return null;
  }
};

/**
 * Middleware principal de autenticação
 */
export const authenticate: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // Inicializa propriedade de autenticação
    request.isAuthenticated = false;

    // Extrai token do header
    const token = extractTokenFromHeader(request.headers.authorization);
    
    if (!token) {
      return reply.code(401).send({
        error: 'Token de acesso não fornecido',
        message: 'Inclua o token JWT no header Authorization como "Bearer <token>"',
      });
    }

    // Verifica e decodifica token
    const payload = verifyToken(token);
    
    if (!payload) {
      return reply.code(401).send({
        error: 'Token de acesso inválido',
        message: 'O token fornecido é inválido ou expirado',
      });
    }

    // Busca usuário
    const user = await fetchUser(payload.userId);
    
    if (!user) {
      return reply.code(401).send({
        error: 'Usuário não encontrado ou inativo',
        message: 'O usuário associado ao token não existe ou foi desativado',
      });
    }

    // Verifica rate limiting
    if (!RateLimiter.isAllowed(user.id)) {
      const remaining = RateLimiter.getRemainingRequests(user.id);
      return reply.code(429).send({
        error: 'Limite de requisições excedido',
        message: 'Muitas requisições. Tente novamente em alguns minutos',
        retryAfter: 900, // 15 minutos
        remainingRequests: remaining,
      });
    }

    // Define usuário na requisição
    request.user = user;
    request.isAuthenticated = true;

    // Log da requisição autenticada (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUTH] ${user.role} ${user.email} acessando ${request.method} ${request.url}`);
    }

  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Erro inesperado:', error);
    return reply.code(500).send({
      error: 'Erro interno de autenticação',
      message: 'Ocorreu um erro ao verificar suas credenciais',
    });
  }
};

/**
 * Factory para middleware de autorização baseado em roles
 */
export const authorize = (...allowedRoles: UserRole[]): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Verifica se o usuário está autenticado
    if (!request.isAuthenticated || !request.user) {
      return reply.code(401).send({
        error: 'Usuário não autenticado',
        message: 'Acesso negado. Faça login primeiro',
      });
    }

    // Verifica se o role do usuário está na lista de permitidos
    if (!allowedRoles.includes(request.user.role)) {
      console.warn(`[AUTH] Tentativa de acesso negada: ${request.user.role} tentou acessar rota que requer ${allowedRoles.join(', ')}`);
      
      return reply.code(403).send({
        error: 'Acesso não autorizado',
        message: `Esta operação requer permissões de: ${allowedRoles.join(', ')}`,
        userRole: request.user.role,
        requiredRoles: allowedRoles,
      });
    }
  };
};

/**
 * Middleware para verificar se o usuário pode acessar recursos de outro usuário
 */
export const authorizeOwnership: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.isAuthenticated || !request.user) {
    return reply.code(401).send({
      error: 'Usuário não autenticado',
      message: 'Acesso negado. Faça login primeiro',
    });
  }

  const { userId } = request.params as { userId?: string };
  
  // Admins podem acessar qualquer recurso
  if (request.user.role === UserRole.ADMIN) {
    return;
  }

  // Gerentes podem acessar recursos de seus vendedores
  if (request.user.role === UserRole.GERENTE && userId) {
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { managerId: true, role: true },
      });

      if (targetUser?.role === UserRole.VENDEDOR && targetUser.managerId === request.user.id) {
        return;
      }
    } catch (error) {
      console.error('[AUTH_MIDDLEWARE] Erro ao verificar propriedade:', error);
    }
  }

  // Usuários só podem acessar seus próprios recursos
  if (userId && userId !== request.user.id) {
    return reply.code(403).send({
      error: 'Acesso não autorizado',
      message: 'Você só pode acessar seus próprios dados',
    });
  }
};

/**
 * Middleware opcional que não falha se não houver token (para rotas públicas que podem ter comportamento diferente para usuários logados)
 */
export const optionalAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    request.isAuthenticated = false;

    const token = extractTokenFromHeader(request.headers.authorization);
    
    if (!token) return;

    const payload = verifyToken(token);
    if (!payload) return;

    const user = await fetchUser(payload.userId);
    if (!user) return;

    request.user = user;
    request.isAuthenticated = true;

  } catch (error) {
    // Em caso de erro, apenas não autentica (não falha a requisição)
    console.warn('[AUTH_MIDDLEWARE] Erro na autenticação opcional:', error);
    request.isAuthenticated = false;
  }
};

/**
 * Utilitários para gerenciamento de autenticação
 */
export const authUtils = {
  /**
   * Invalida cache do usuário (útil quando dados do usuário são atualizados)
   */
  invalidateUserCache: (userId: string): void => {
    UserCache.invalidate(userId);
  },

  /**
   * Limpa todo o cache (útil para manutenção)
   */
  clearCache: (): void => {
    UserCache.clear();
  },

  /**
   * Obtém estatísticas do rate limiter
   */
  getRateLimitStats: (userId: string) => ({
    remaining: RateLimiter.getRemainingRequests(userId),
    limit: 100,
    window: '15 minutes',
  }),

  /**
   * Verifica se um token é válido sem fazer requisição completa
   */
  isValidToken: (token: string): boolean => {
    return verifyToken(token) !== null;
  },

  /**
   * Extrai informações básicas do token sem validar completamente
   */
  decodeToken: (token: string): Partial<JwtPayload> | null => {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  },
};

/**
 * Middleware para log de auditoria (para operações sensíveis)
 */
export const auditLog: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.isAuthenticated || !request.user) return;

  // Log de auditoria para operações sensíveis
  const sensitiveOperations = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  if (sensitiveOperations.includes(request.method)) {
    console.log(`[AUDIT] ${request.user.role}:${request.user.email} executou ${request.method} ${request.url}`, {
      userId: request.user.id,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      timestamp: new Date().toISOString(),
    });
  }
};
