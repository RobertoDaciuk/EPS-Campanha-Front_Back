/**
 * types.ts - Definições de Tipos Globais da Aplicação
 *
 * @description Centraliza todas as interfaces e tipos TypeScript
 * utilizados em múltiplos locais da aplicação para garantir consistência.
 *
 * @module Types
 * @version 1.7.0
 * @since 2024-07-28
 *
 * @changelog
 * 2024-08-24: Adicionado `managerPointsPercentage` em Campaign e `managerPoints` em ManagerDashboardStats. Atualizado `Earning` para suportar ganhos de gerentes.
 * 2024-08-22: Adicionados `EarningStatus`, `Earning` e `FinancialReportData` para o relatório financeiro.
 * 2024-08-21: Adicionado `CampaignKit` e `kitId` em `CampaignSubmission` para o sistema de "cartelas".
 * 2024-08-20: Adicionado `unitType` a `GoalRequirement` e `CampaignFormData`. Adicionados tipos `CampaignSubmission`.
 * 2024-08-19: Adicionado `GoalRequirement` e atualizado `Campaign` e `CampaignFormData` para suportar regras de campanha complexas.
 */

// Enum para os perfis de usuário
export enum UserRole {
    VENDEDOR = 'Vendedor',
    GERENTE = 'Gerente',
    ADMIN = 'Admin',
}

// Enum para o status do usuário
export enum UserStatus {
    ACTIVE = 'active',
    BLOCKED = 'blocked',
}

// Interface para o objeto de usuário
export interface User {
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
    managerId?: string; // ID do gerente do vendedor
    // Gamification
    level: string;
    points: number;
    pointsToNextLevel: number;
}

// Enum para o status da campanha
export enum CampaignStatus {
    Active = 'Ativa',
    Completed = 'Concluída',
    Expired = 'Expirada',
}

// Tipos para as Regras de Negócio das Campanhas
export type RuleOperator = 'CONTAINS' | 'NOT_CONTAINS' | 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN';

export interface RuleCondition {
  id: string;
  field: TargetField; // Ex: 'PRODUCT_NAME', 'SALE_VALUE'
  operator: RuleOperator;
  value: string | number;
}

export interface RuleSet {
  id: string;
  name: string;
  points: number;
  conditions: RuleCondition[];
}

export type CampaignRule = RuleSet;

export interface GoalRequirement {
  id: string;
  description: string;
  quantity: number;
  unitType: 'UNIT' | 'PAIR';
  conditions: RuleCondition[];
}

export interface Campaign {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    
    // Novos campos para metas complexas (kits)
    pointsOnCompletion?: number;
    goalRequirements?: GoalRequirement[];
    managerPointsPercentage?: number; // NOVO: % de pontos para o gerente

    // Campos antigos para campanhas simples (mantidos para retrocompatibilidade)
    points?: number;
    goal?: number;
    progress?: number;

    // Campos comuns
    startDate: string;
    endDate: string;
    status: CampaignStatus;
    
    // Mantido por enquanto para não quebrar o mock do motor de validação antigo
    ruleSets?: CampaignRule[];
}


// Enum para os tipos de atividade
export enum ActivityType {
    Sale = 'Venda',
    Achievement = 'Conquista',
    LevelUp = 'Nível Acima',
    CampaignJoin = 'Entrou na Campanha',
    RewardRedeemed = 'Prêmio Resgatado',
    Notification = 'Notificação',
    AdminCampaignCreated = 'AdminCampaignCreated',
    AdminValidationProcessed = 'AdminValidationProcessed',
    AdminUserBlocked = 'AdminUserBlocked',
}

// Interface para um item de atividade
export interface ActivityItem {
    id: string;
    type: ActivityType;
    description: string;
    timestamp: string;
    points?: number;
    value?: number; // Para prêmios
}

// Interface para um item no ranking
export interface RankItem {
    userId: string;
    rank: number;
    name: string;
    avatarUrl: string;
    opticName: string;
    points: number;
    isCurrentUser: boolean;
}

// Dados para o dashboard do vendedor
export interface DashboardData {
    user: User;
    stats: {
        points: {
            value: number;
            change: number;
            period: string;
        };
        ranking: {
            position: number;
            change: number;
        };
        campaignsActive: number;
    };
    activeCampaigns: Campaign[];
    ranking: RankItem[];
    recentActivity: ActivityItem[];
}

// Notificações
export interface Notification {
    id: string;
    type: ActivityType;
    message: string;
    timestamp: string;
    isRead: boolean;
}

// Prêmios
export interface Premio {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    pointsRequired: number;
    stock: number;
}

// Tipos para Admin
export interface UserFilters {
    searchTerm: string;
    role: UserRole | 'all';
    status: UserStatus | 'all';
}

export interface AdminDashboardStats {
    totalUsers: number;
    activeCampaigns: number;
    validatedSalesMonth: number;
    pointsDistributedMonth: number;
}

export interface DailyPerformance {
    day: string;
    points: number;
}

export interface AdminDashboardData {
    stats: AdminDashboardStats;
    performanceLast7Days: DailyPerformance[];
    topCampaigns: Campaign[];
    recentAdminActivity: ActivityItem[];
}

export interface CampaignFilters {
    searchTerm: string;
    status: CampaignStatus | 'all';
}

export interface CampaignFormData {
    title: string;
    description: string;
    imageUrl: string;
    startDate: string;
    endDate: string;
    pointsOnCompletion: number;
    goalRequirements: GoalRequirement[];
    managerPointsPercentage: number; // NOVO
}


export interface PremioFormData {
    title: string;
    description: string;
    imageUrl: string;
    pointsRequired: number;
    stock: number;
}

// Tipos para Gerente
export interface ManagerTeamMember {
    id: string;
    name: string;
    avatarUrl: string;
    level: string;
    points: number;
    pointsToNextLevel: number;
    salesMonth: number;
    activeCampaignsCount: number;
}

export interface ManagerDashboardStats {
    totalSalesMonth: number;
    topSeller: {
        name: string;
        avatarUrl: string;
    } | null;
    campaignAdherence: number;
    totalTeamPointsMonth: number;
    managerPendingPoints: number; // NOVO: Pontos/valor pendente para o gerente
}

export interface ManagerDashboardData {
    stats: ManagerDashboardStats;
    teamRanking: RankItem[];
    teamCampaignPerformance: TeamCampaignPerformance[];
}

export interface TeamCampaignPerformance {
    id: string;
    title: string;
    participants: number;
    teamProgress: number;
    teamGoal: number;
}

export interface SellerDetails {
    user: User;
    stats: {
        salesMonth: { current: number; change: number };
        pointsMonth: { current: number; change: number };
        ranking: { current: number; change: number };
        activeCampaigns: number;
    };
    activeCampaigns: Campaign[];
    recentActivity: ActivityItem[];
}

// Tipos para Validação de Vendas
export enum ValidationStatus {
  Processing = 'Processando',
  Completed = 'Concluído',
  Failed = 'Falhou',
}

export enum ResultRowStatus {
    SUCCESS = 'Sucesso',
    ERROR = 'Erro',
    WARNING = 'Aviso',
}

export interface ValidationResultRow {
  lineNumber: number;
  status: ResultRowStatus;
  data: Record<string, any>; // Dados originais da linha
  message: string;
  points?: number;
  ruleTriggered?: string;
}

export interface ValidationConfig {
  campaignId: string | null;
  isDryRun: boolean;
  duplicateHandling: DuplicateHandlingStrategy;
  gracePeriodDays: number;
  mappings: ColumnMapping[];
  campaignRules: CampaignRule[];
  customRules: CampaignRule[];
}

export interface ValidationJob {
  id: string;
  fileName: string;
  uploadDate: string;
  status: ValidationStatus;
  campaignTitle: string;
  isDryRun: boolean;
  config: Partial<ValidationConfig>;
  summary: {
    totalRows: number;
    validatedSales: number;
    errors: number;
    warnings: number;
    pointsDistributed: number;
  };
  details?: ValidationResultRow[];
}

export enum DuplicateHandlingStrategy {
  IGNORE = 'Ignorar duplicadas',
  OVERWRITE = 'Sobrescrever com novos dados',
  REJECT_ROW = 'Rejeitar linha duplicada',
}

// Tipos para Mapeamento de Colunas
export const TARGET_FIELD_LABELS = {
    IGNORE: 'Ignorar esta coluna',
    ORDER_ID: 'Nº Pedido (Principal)',
    ORDER_ID_2: 'Nº Pedido (Alternativo 1)',
    ORDER_ID_3: 'Nº Pedido (Alternativo 2)',
    SALE_DATE: 'Data da Venda (DD/MM/AAAA)',
    SELLER_CPF: 'CPF do Vendedor',
    OPTIC_CNPJ: 'CNPJ da Ótica',
    PRODUCT_NAME: 'Nome do Produto',
    SALE_VALUE: 'Valor da Venda (numérico)',
};

export type TargetField = keyof typeof TARGET_FIELD_LABELS;

export interface ColumnMapping {
    sourceColumn: string;
    targetField: TargetField;
}

// NOVO: Tipos para Submissão de Vendas em Campanhas
export enum CampaignSubmissionStatus {
    PENDING = 'PENDING',
    VALIDATED = 'VALIDATED',
    REJECTED = 'REJECTED'
}

export interface CampaignSubmission {
    id: string;
    campaignId: string;
    userId: string;
    requirementId: string;
    kitId: string; // NOVO: ID da "cartela" a que pertence
    orderNumber: string;
    quantity: number;
    status: CampaignSubmissionStatus;
    submissionDate: string;
    validationMessage?: string;
}

// NOVO: Interface para uma "cartela" de campanha
export interface CampaignKit {
    id: string;
    campaignId: string;
    userId: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    submissions: CampaignSubmission[];
}

// NOVO: Tipos para Relatório Financeiro
export enum EarningStatus {
    PENDING = 'Pendente',
    PAID = 'Pago',
}

export interface Earning {
    id: string;
    type: 'SELLER' | 'MANAGER'; // NOVO: Tipo de ganho
    userId: string; // ID de quem recebe (vendedor ou gerente)
    userName: string;
    userAvatarUrl: string;
    campaignId: string;
    campaignTitle: string;
    kitId: string; // ID da cartela que gerou o ganho
    sourceUserName?: string; // NOVO: Nome do vendedor que gerou o ganho para o gerente
    amount: number; // Valor em R$
    earningDate: string;
    status: EarningStatus;
}

export interface FinancialReportData {
    earnings: Earning[];
    summary: {
        totalPending: number;
        totalPaid: number;
    };
}
