/**
 * @file auth.service.ts
 * @version 2.0.0
 * @description Serviços de autenticação e autorização para a aplicação EPS Campanhas.
 * Gerencia login, registro, tokens JWT e operações relacionadas à segurança.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa dos serviços de autenticação
 * - Sistema robusto de JWT com refresh tokens
 * - Validação e normalização de dados de usuário
 * - Auditoria de operações de segurança
 * - Rate limiting e proteção contra ataques
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma, PrismaTransactionClient } from '../../lib/prismaClient';
import { UserRole, UserStatus } from '@prisma/client';
import { 
  LoginData, 
  UserRegistrationData, 
  ChangePasswordData,
  UpdateProfileData 
} from '../schemas/auth.schema';
import { 
  normalizeCPF, 
  normalizeCNPJ, 
  normalizePhone, 
  normalizeEmail,
  normalizeName,
  isValidCPF,
  isValidCNPJ 
} from '../utils/normalizers';

// ==================== INTERFACES E TIPOS ====================

/**
 * Interface para resposta de login
 */
interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    opticName: string;
    avatarUrl: string;
    level: string;
    points: number;
  };
  token: string;
  refreshToken?: string;
  expiresAt: string;
}

/**
 * Interface para payload do JWT
 */
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Interface para usuário criado
 */
interface CreatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  opticName: string;
  status: UserStatus;
}

// ==================== CONFIGURAÇÕES ====================

/**
 * Configurações de JWT e segurança
 */
const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'super-secret-key-for-development-only',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_EXPIRES_IN: '30d',
  ALGORITHM: 'HS256' as const,
  ISSUER: 'eps-campanhas',
  AUDIENCE: 'eps-campanhas-users',
};

/**
 * Configurações de bcrypt
 */
const BCRYPT_CONFIG = {
  SALT_ROUNDS: 12,
};

/**
 * Configurações de rate limiting
 */
const RATE_LIMIT_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hora
};

// ==================== CACHE DE TENTATIVAS DE LOGIN ====================

/**
 * Cache para controle de tentativas de login
 */
class LoginAttemptsCache {
  private static attempts = new Map<string, { count: number; lockedUntil?: number }>();

  /**
   * Registra uma tentativa de login falhada
   */
  static recordFailedAttempt(email: string): void {
    const attempt = this.attempts.get(email) || { count: 0 };
    attempt.count++;
    
    if (attempt.count >= RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS) {
      attempt.lockedUntil = Date.now() + RATE_LIMIT_CONFIG.LOCKOUT_DURATION;
    }
    
    this.attempts.set(email, attempt);
  }

  /**
   * Limpa tentativas de login para um email
   */
  static clearAttempts(email: string): void {
    this.attempts.delete(email);
  }

  /**
   * Verifica se um email está bloqueado
   */
  static isLocked(email: string): boolean {
    const attempt = this.attempts.get(email);
    if (!attempt || !attempt.lockedUntil) return false;
    
    if (Date.now() > attempt.lockedUntil) {
      this.clearAttempts(email);
      return false;
    }
    
    return true;
  }

  /**
   * Obtém o tempo restante de bloqueio em segundos
   */
  static getLockTimeRemaining(email: string): number {
    const attempt = this.attempts.get(email);
    if (!attempt || !attempt.lockedUntil) return 0;
    
    const remaining = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Limpeza periódica do cache
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [email, attempt] of this.attempts.entries()) {
      if (attempt.lockedUntil && now > attempt.lockedUntil) {
        this.attempts.delete(email);
      }
    }
  }
}

// Executa limpeza periódica
setInterval(() => LoginAttemptsCache.cleanup(), RATE_LIMIT_CONFIG.CLEANUP_INTERVAL);

// ==================== UTILITÁRIOS DE JWT ====================

/**
 * Gera um token JWT
 */
const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(
    payload,
    JWT_CONFIG.SECRET,
    {
      expiresIn: JWT_CONFIG.EXPIRES_IN,
      algorithm: JWT_CONFIG.ALGORITHM,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    }
  );
};

/**
 * Gera um refresh token
 */
const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_CONFIG.SECRET,
    {
      expiresIn: JWT_CONFIG.REFRESH_EXPIRES_IN,
      algorithm: JWT_CONFIG.ALGORITHM,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    }
  );
};

/**
 * Verifica e decodifica um token JWT
 */
const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_CONFIG.SECRET, {
      algorithms: [JWT_CONFIG.ALGORITHM],
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    }) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    }
    throw new Error('Erro ao verificar token');
  }
};

/**
 * Calcula data de expiração do token
 */
const getTokenExpirationDate = (): string => {
  const expiresInMs = jwt.decode(
    jwt.sign({}, JWT_CONFIG.SECRET, { expiresIn: JWT_CONFIG.EXPIRES_IN })
  ) as any;
  
  return new Date((expiresInMs.exp || 0) * 1000).toISOString();
};

// ==================== UTILITÁRIOS DE SENHA ====================

/**
 * Hash de senha com bcrypt
 */
const hashPassword = async (password: string): Promise<string> => {
  try {
    return await bcrypt.hash(password, BCRYPT_CONFIG.SALT_ROUNDS);
  } catch (error) {
    console.error('[AUTH_SERVICE] Erro ao fazer hash da senha:', error);
    throw new Error('Erro interno ao processar senha');
  }
};

/**
 * Verifica senha com hash
 */
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('[AUTH_SERVICE] Erro ao verificar senha:', error);
    return false;
  }
};

// ==================== VALIDAÇÕES DE NEGÓCIO ====================

/**
 * Valida se email já existe
 */
const validateEmailAvailability = async (
  email: string, 
  excludeUserId?: string,
  tx?: PrismaTransactionClient
): Promise<void> => {
  const client = tx || prisma;
  
  const existingUser = await client.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== excludeUserId) {
    throw new Error('Este e-mail já está cadastrado');
  }
};

/**
 * Valida se CPF já existe
 */
const validateCPFAvailability = async (
  cpf: string, 
  excludeUserId?: string,
  tx?: PrismaTransactionClient
): Promise<void> => {
  const normalizedCPF = normalizeCPF(cpf);
  
  if (!isValidCPF(normalizedCPF)) {
    throw new Error('CPF inválido');
  }

  const client = tx || prisma;
  
  const existingUser = await client.user.findUnique({
    where: { cpf: normalizedCPF },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== excludeUserId) {
    throw new Error('Este CPF já está cadastrado');
  }
};

/**
 * Valida dados da ótica pelo CNPJ
 */
const validateOpticData = async (cnpj: string): Promise<{ name: string }> => {
  const normalizedCNPJ = normalizeCNPJ(cnpj);
  
  if (!isValidCNPJ(normalizedCNPJ)) {
    throw new Error('CNPJ inválido');
  }

  // Aqui poderia haver integração com API externa para validar CNPJ
  // Por enquanto, apenas validamos o formato e permitimos qualquer nome
  
  return {
    name: 'Ótica Validada', // Placeholder - seria obtido de API externa
  };
};

/**
 * Valida hierarquia de usuários
 */
const validateUserHierarchy = async (
  role: UserRole, 
  managerId?: string,
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
      throw new Error('Gerente associado não está ativo');
    }
  }

  if (role === UserRole.GERENTE || role === UserRole.ADMIN) {
    if (managerId) {
      throw new Error('Gerentes e administradores não podem ter gerente associado');
    }
  }
};

// ==================== AUDITORIA ====================

/**
 * Registra evento de auditoria de autenticação
 */
const logAuthEvent = async (
  event: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'REGISTER' | 'PASSWORD_CHANGE' | 'LOGOUT',
  userId?: string,
  email?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    // Implementar log de auditoria
    console.log(`[AUTH_AUDIT] ${event}`, {
      userId,
      email,
      timestamp: new Date().toISOString(),
      metadata,
    });
  } catch (error) {
    console.error('[AUTH_SERVICE] Erro ao registrar auditoria:', error);
    // Não quebra o fluxo se auditoria falhar
  }
};

// ==================== SERVIÇOS PRINCIPAIS ====================

/**
 * Realiza login do usuário
 */
export const loginUser = async (email: string, password: string): Promise<LoginResponse | null> => {
  const normalizedEmail = normalizeEmail(email);

  try {
    // Verifica rate limiting
    if (LoginAttemptsCache.isLocked(normalizedEmail)) {
      const remainingTime = LoginAttemptsCache.getLockTimeRemaining(normalizedEmail);
      throw new Error(`Muitas tentativas de login. Tente novamente em ${Math.ceil(remainingTime / 60)} minutos`);
    }

    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        opticName: true,
        avatarUrl: true,
        level: true,
        points: true,
      },
    });

    if (!user) {
      LoginAttemptsCache.recordFailedAttempt(normalizedEmail);
      await logAuthEvent('LOGIN_FAILED', undefined, normalizedEmail, { reason: 'user_not_found' });
      return null;
    }

    // Verifica se usuário está ativo
    if (user.status === UserStatus.BLOCKED) {
      LoginAttemptsCache.recordFailedAttempt(normalizedEmail);
      await logAuthEvent('LOGIN_FAILED', user.id, normalizedEmail, { reason: 'user_blocked' });
      throw new Error('Usuário bloqueado');
    }

    // Verifica senha
    const passwordValid = await verifyPassword(password, user.passwordHash);
    
    if (!passwordValid) {
      LoginAttemptsCache.recordFailedAttempt(normalizedEmail);
      await logAuthEvent('LOGIN_FAILED', user.id, normalizedEmail, { reason: 'invalid_password' });
      return null;
    }

    // Login bem-sucedido
    LoginAttemptsCache.clearAttempts(normalizedEmail);

    // Gera tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = getTokenExpirationDate();

    await logAuthEvent('LOGIN_SUCCESS', user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        opticName: user.opticName,
        avatarUrl: user.avatarUrl,
        level: user.level,
        points: user.points,
      },
      token,
      refreshToken,
      expiresAt,
    };

  } catch (error) {
    console.error('[AUTH_SERVICE] Erro no login:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno no processo de login');
  }
};

/**
 * Registra novo usuário
 */
export const registerUser = async (userData: UserRegistrationData): Promise<CreatedUser> => {
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
      await validateOpticData(normalizedData.opticCNPJ);
      await validateUserHierarchy(normalizedData.role, normalizedData.managerId, tx);

      // Hash da senha
      const passwordHash = await hashPassword(userData.password);

      // Determina nível e pontos iniciais baseado no role
      const initialLevel = normalizedData.role === UserRole.ADMIN ? 'Admin' : 'Bronze';
      const initialPoints = normalizedData.role === UserRole.ADMIN ? 99999 : 0;
      const pointsToNextLevel = normalizedData.role === UserRole.ADMIN ? 100000 : 1000;

      // Cria usuário
      const newUser = await tx.user.create({
        data: {
          name: normalizedData.name,
          email: normalizedData.email,
          cpf: normalizedData.cpf,
          whatsapp: normalizedData.whatsapp,
          passwordHash,
          role: normalizedData.role,
          status: UserStatus.ACTIVE,
          opticName: normalizedData.opticName,
          opticCNPJ: normalizedData.opticCNPJ,
          managerId: normalizedData.managerId,
          level: initialLevel,
          points: initialPoints,
          pointsToNextLevel,
          avatarUrl: `https://i.pravatar.cc/150?u=${normalizedData.email}`,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          opticName: true,
        },
      });

      await logAuthEvent('REGISTER', newUser.id, newUser.email, { 
        role: newUser.role,
        opticName: newUser.opticName 
      });

      return newUser;
    });

  } catch (error) {
    console.error('[AUTH_SERVICE] Erro no registro:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno no processo de registro');
  }
};

/**
 * Altera senha do usuário
 */
export const changeUserPassword = async (
  userId: string, 
  passwordData: ChangePasswordData
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new Error('Usuário bloqueado');
    }

    // Verifica senha atual
    const currentPasswordValid = await verifyPassword(
      passwordData.currentPassword, 
      user.passwordHash
    );

    if (!currentPasswordValid) {
      throw new Error('Senha atual incorreta');
    }

    // Hash da nova senha
    const newPasswordHash = await hashPassword(passwordData.newPassword);

    // Atualiza senha
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await logAuthEvent('PASSWORD_CHANGE', user.id, user.email);

  } catch (error) {
    console.error('[AUTH_SERVICE] Erro na alteração de senha:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno na alteração de senha');
  }
};

/**
 * Atualiza perfil do usuário
 */
export const updateUserProfile = async (
  userId: string, 
  profileData: UpdateProfileData
): Promise<{ id: string; name: string; email: string; avatarUrl?: string }> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, status: true },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      if (user.status === UserStatus.BLOCKED) {
        throw new Error('Usuário bloqueado');
      }

      // Normaliza dados se fornecidos
      const updateData: any = {};
      
      if (profileData.name) {
        updateData.name = normalizeName(profileData.name);
      }
      
      if (profileData.whatsapp) {
        updateData.whatsapp = normalizePhone(profileData.whatsapp);
      }
      
      if (profileData.opticName) {
        updateData.opticName = profileData.opticName.trim();
      }
      
      if (profileData.avatarUrl) {
        updateData.avatarUrl = profileData.avatarUrl;
      }

      // Atualiza usuário
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      return updatedUser;
    });

  } catch (error) {
    console.error('[AUTH_SERVICE] Erro na atualização de perfil:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno na atualização de perfil');
  }
};

/**
 * Verifica se token é válido
 */
export const verifyAuthToken = (token: string): JWTPayload => {
  return verifyToken(token);
};

/**
 * Renovar token usando refresh token
 */
export const refreshAuthToken = async (refreshToken: string): Promise<{ token: string; expiresAt: string }> => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_CONFIG.SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Token inválido');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new Error('Usuário bloqueado');
    }

    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const expiresAt = getTokenExpirationDate();

    return { token: newToken, expiresAt };

  } catch (error) {
    console.error('[AUTH_SERVICE] Erro ao renovar token:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erro interno na renovação de token');
  }
};

/**
 * Logout do usuário (invalidar refresh token se implementado)
 */
export const logoutUser = async (userId: string): Promise<void> => {
  try {
    // Por enquanto apenas log de auditoria
    // Em implementação futura, poderia invalidar refresh tokens em banco
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    await logAuthEvent('LOGOUT', userId, user?.email);

  } catch (error) {
    console.error('[AUTH_SERVICE] Erro no logout:', error);
    // Não quebra o fluxo se logout falhar
  }
};

// ==================== UTILITÁRIOS EXTRAS ====================

/**
 * Valida disponibilidade de email
 */
export const checkEmailAvailability = async (email: string, excludeUserId?: string): Promise<boolean> => {
  try {
    await validateEmailAvailability(email, excludeUserId);
    return true;
  } catch {
    return false;
  }
};

/**
 * Valida disponibilidade de CPF
 */
export const checkCPFAvailability = async (cpf: string, excludeUserId?: string): Promise<boolean> => {
  try {
    await validateCPFAvailability(cpf, excludeUserId);
    return true;
  } catch {
    return false;
  }
};

/**
 * Busca dados da ótica por CNPJ
 */
export const getOpticDataByCNPJ = async (cnpj: string): Promise<{ name: string }> => {
  return validateOpticData(cnpj);
};

/**
 * Obtém estatísticas de rate limiting para um email
 */
export const getLoginAttemptStats = (email: string): { 
  isLocked: boolean; 
  remainingTime: number;
  attemptsRemaining: number;
} => {
  const normalizedEmail = normalizeEmail(email);
  const isLocked = LoginAttemptsCache.isLocked(normalizedEmail);
  const remainingTime = LoginAttemptsCache.getLockTimeRemaining(normalizedEmail);
  
  const attempts = (LoginAttemptsCache as any).attempts.get(normalizedEmail);
  const attemptsUsed = attempts?.count || 0;
  const attemptsRemaining = Math.max(0, RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS - attemptsUsed);

  return {
    isLocked,
    remainingTime,
    attemptsRemaining,
  };
};
