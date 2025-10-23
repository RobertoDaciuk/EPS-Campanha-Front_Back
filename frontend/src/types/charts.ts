/**
 * @file types/charts.ts
 * @version 2.0.0
 * @description Tipos para gráficos e visualizações
 * @author DevEPS
 * @since 2025-10-21
 */

// ==================== CHART DATA TYPES ====================

export interface ChartDataPoint {
  name: string
  value: number
  label?: string
  color?: string
  metadata?: Record<string, any>
}

export interface TimeSeriesDataPoint {
  date: string
  value: number
  category?: string
  metadata?: Record<string, any>
}

export interface MultiSeriesDataPoint {
  name: string
  [key: string]: string | number
}

// ==================== PERFORMANCE CHARTS ====================

export interface PerformanceData {
  period: string
  sales: number
  points: number
  earnings: number
  validationRate: number
}

export interface UserPerformanceData {
  userId: string
  userName: string
  totalSales: number
  totalPoints: number
  totalEarnings: number
  validationRate: number
  level: string
  ranking: number
}

export interface TeamPerformanceData {
  sellerId: string
  sellerName: string
  managerName: string
  sales: number
  points: number
  earnings: number
  campaigns: number
  lastActivity: string
}

// ==================== EARNING CHARTS ====================

export interface EarningChartData {
  period: string
  total: number
  pending: number
  paid: number
  seller?: number
  manager?: number
}

export interface EarningBreakdownData {
  type: 'seller' | 'manager'
  amount: number
  count: number
  percentage: number
}

export interface EarningTrendData {
  month: string
  current: number
  previous: number
  growth: number
}

// ==================== RANKING CHARTS ====================

export interface RankingChartData {
  position: number
  userId: string
  userName: string
  userAvatar?: string
  points: number
  level: string
  isCurrentUser?: boolean
}

export interface LevelDistributionData {
  level: string
  count: number
  percentage: number
  color: string
}

// ==================== CAMPAIGN CHARTS ====================

export interface CampaignProgressData {
  campaignId: string
  campaignTitle: string
  totalRequirements: number
  completedRequirements: number
  participants: number
  completionRate: number
  averageProgress: number
}

export interface CampaignComparisonData {
  campaignId: string
  campaignTitle: string
  participants: number
  submissions: number
  validatedSales: number
  pointsDistributed: number
  completionRate: number
}

// ==================== SUBMISSION CHARTS ====================

export interface SubmissionStatsData {
  period: string
  total: number
  validated: number
  rejected: number
  pending: number
  validationRate: number
}

export interface SubmissionTrendData {
  date: string
  submissions: number
  validations: number
  rejections: number
}

// ==================== DASHBOARD CHARTS ====================

export interface DashboardChartData {
  overview: {
    totalUsers: number
    activeCampaigns: number
    totalSubmissions: number
    totalEarnings: number
  }
  trends: {
    userGrowth: TimeSeriesDataPoint[]
    submissionTrends: TimeSeriesDataPoint[]
    earningTrends: TimeSeriesDataPoint[]
  }
  distributions: {
    usersByLevel: LevelDistributionData[]
    submissionsByStatus: ChartDataPoint[]
    earningsByType: ChartDataPoint[]
  }
}

// ==================== CHART CONFIGURATION TYPES ====================

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie' | 'doughnut' | 'scatter'
  title?: string
  subtitle?: string
  height?: number
  responsive?: boolean
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  colors?: string[]
  animation?: boolean
  stacked?: boolean
}

export interface AxisConfig {
  show?: boolean
  type?: 'category' | 'value' | 'time'
  position?: 'top' | 'bottom' | 'left' | 'right'
  min?: number
  max?: number
  formatter?: (value: any) => string
  tickCount?: number
}

export interface TooltipConfig {
  show?: boolean
  trigger?: 'hover' | 'click'
  formatter?: (data: any) => string
  backgroundColor?: string
  borderColor?: string
}

export interface LegendConfig {
  show?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}

// ==================== CHART COMPONENT PROPS ====================

export interface ChartComponentProps {
  data: any[]
  config?: ChartConfig
  loading?: boolean
  error?: string
  className?: string
  onDataPointClick?: (data: any) => void
  onLegendClick?: (dataKey: string) => void
}

export interface ResponsiveChartProps extends ChartComponentProps {
  minHeight?: number
  maxHeight?: number
  aspectRatio?: number
}

// ==================== CHART EXPORT TYPES ====================

export interface ChartExportOptions {
  format: 'png' | 'jpeg' | 'svg' | 'pdf'
  quality?: number
  width?: number
  height?: number
  backgroundColor?: string
}

export interface ChartExportData {
  chartData: any[]
  chartConfig: ChartConfig
  metadata: {
    title: string
    generatedAt: string
    generatedBy: string
    filters?: Record<string, any>
  }
}

// ==================== ADVANCED CHART TYPES ====================

export interface HeatmapData {
  x: string
  y: string
  value: number
  label?: string
}

export interface GaugeData {
  value: number
  min: number
  max: number
  target?: number
  thresholds?: Array<{
    value: number
    color: string
    label: string
  }>
}

export interface TreemapData {
  name: string
  value: number
  children?: TreemapData[]
  color?: string
}

export interface SankeyData {
  nodes: Array<{
    id: string
    name: string
  }>
  links: Array<{
    source: string
    target: string
    value: number
  }>
}

// ==================== CHART FILTER TYPES ====================

export interface ChartFilters {
  dateRange?: {
    start: string
    end: string
  }
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'year'
  groupBy?: string[]
  filterBy?: Record<string, any>
  limit?: number
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface ChartQuery {
  filters: ChartFilters
  chartType: string
  dataSource: string
  refreshInterval?: number
}

// ==================== CHART INTERACTION TYPES ====================

export interface ChartInteraction {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'brush'
  data: any
  metadata?: Record<string, any>
}

export interface ChartZoom {
  startIndex: number
  endIndex: number
  domain?: [number, number]
}

export interface ChartBrush {
  startIndex: number
  endIndex: number
  selection: any[]
}
