/**
 * @file pages/earnings/FinancialReportPage.tsx
 * @version 2.0.0
 * @description Página de relatórios financeiros
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  DownloadIcon, 
  CalendarIcon, 
  DollarSignIcon,
  TrendingUpIcon,
  FileSpreadsheetIcon,
  BarChartIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import EarningChart from '@/components/charts/EarningChart'
import { earningService } from '@/services/earningService'
import { useToast } from '@/hooks/useToast'
import { formatCurrency, formatDateForInput, downloadAsCsv, downloadAsJson } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'

const FinancialReportPage: React.FC = () => {
  const { toast } = useToast()
  const [filters, setFilters] = useState({
    startDate: formatDateForInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    endDate: formatDateForInput(new Date()),
    groupBy: 'day' as 'day' | 'week' | 'month' | 'campaign' | 'user',
    includeDetails: true,
  })

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['financial-report', filters],
    queryFn: () => earningService.generateFinancialReport(filters),
  })

  const { data: financialSummary } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: () => earningService.getFinancialSummary('30d'),
  })

  const handleDownload = (format: 'csv' | 'json' | 'excel') => {
    if (!reportData) return

    switch (format) {
      case 'csv':
        downloadAsCsv(reportData.details || [], `relatorio-financeiro-${Date.now()}`)
        toast.success('Relatório CSV baixado com sucesso!')
        break
      case 'json':
        downloadAsJson(reportData, `relatorio-financeiro-${Date.now()}`)
        toast.success('Relatório JSON baixado com sucesso!')
        break
      case 'excel':
        toast.info('Download de Excel será implementado em breve')
        break
    }
  }

  const generateReport = () => {
    // Trigger refetch
    window.location.reload()
  }

  if (isLoading) {
    return <LoadingScreen message="Gerando relatório financeiro..." />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios Financeiros</h1>
          <p className="text-gray-600">
            Análise completa de earnings, pagamentos e projeções
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {financialSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSignIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Acumulado</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(financialSummary.summary.totalAccumulated)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUpIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pago Este Mês</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(financialSummary.summary.paidThisMonth)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendente</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatCurrency(financialSummary.summary.totalPending)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChartIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Média Mensal</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(financialSummary.summary.monthlyAverage)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters - 1/4 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Filtros do Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Agrupar Por</Label>
              <Select
                value={filters.groupBy}
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, groupBy: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dia</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="campaign">Campanha</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeDetails"
                checked={filters.includeDetails}
                onChange={(e) => setFilters(prev => ({ ...prev, includeDetails: e.target.checked }))}
                className="rounded border-gray-300 text-eps-600 focus:ring-eps-500"
              />
              <Label htmlFor="includeDetails" className="text-sm cursor-pointer">
                Incluir detalhes
              </Label>
            </div>

            <Button onClick={generateReport} className="w-full">
              <BarChartIcon className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>

            <div className="pt-4 border-t space-y-2">
              <p className="text-sm font-medium text-gray-700">Exportar:</p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleDownload('csv')}
                >
                  <FileSpreadsheetIcon className="w-4 h-4 mr-2" />
                  Baixar CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleDownload('json')}
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Baixar JSON
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleDownload('excel')}
                >
                  <FileSpreadsheetIcon className="w-4 h-4 mr-2" />
                  Baixar Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts and Data - 3/4 */}
        <div className="lg:col-span-3 space-y-6">
          {/* Earnings Over Time Chart */}
          {reportData?.chartData && (
            <EarningChart
              data={reportData.chartData}
              title="Earnings ao Longo do Tempo"
              type="area"
              height={350}
              showPeriodSelector={false}
            />
          )}

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EarningChart
              data={reportData?.breakdownData || []}
              title="Breakdown por Tipo"
              type="pie"
              height={250}
            />

            <EarningChart
              data={reportData?.trendData || []}
              title="Tendência Mensal"
              type="bar"
              height={250}
            />
          </div>

          {/* Detailed Table */}
          {reportData?.details && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Relatório</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Período</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">Pago</th>
                        <th className="text-right p-2">Pendente</th>
                        <th className="text-right p-2">Vendedor</th>
                        <th className="text-right p-2">Gerente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.details.slice(0, 10).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2">{item.period}</td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="p-2 text-right text-green-600">
                            {formatCurrency(item.paid)}
                          </td>
                          <td className="p-2 text-right text-yellow-600">
                            {formatCurrency(item.pending)}
                          </td>
                          <td className="p-2 text-right text-blue-600">
                            {formatCurrency(item.seller || 0)}
                          </td>
                          <td className="p-2 text-right text-purple-600">
                            {formatCurrency(item.manager || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {reportData.details.length > 10 && (
                  <div className="mt-4 text-center text-sm text-gray-500">
                    Mostrando 10 de {reportData.details.length} registros.
                    Use a exportação para ver todos os dados.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default FinancialReportPage
