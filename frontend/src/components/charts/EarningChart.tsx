/**
 * @file components/charts/EarningChart.tsx
 * @version 2.0.0
 * @description Gráfico de earnings/ganhos
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSignIcon, TrendingUpIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface EarningDataPoint {
  period: string
  total: number
  pending: number
  paid: number
  seller?: number
  manager?: number
}

interface EarningChartProps {
  data: EarningDataPoint[]
  title?: string
  type?: 'line' | 'area' | 'bar' | 'pie'
  height?: number
  showPeriodSelector?: boolean
  onPeriodChange?: (period: string) => void
  className?: string
}

const EarningChart: React.FC<EarningChartProps> = ({
  data,
  title = 'Earnings',
  type = 'area',
  height = 300,
  showPeriodSelector = false,
  onPeriodChange,
  className = ''
}) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState('30d')

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    onPeriodChange?.(period)
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              <span className="font-medium">{entry.name}:</span> {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip content={customTooltip} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#0ea5e9" 
              strokeWidth={2}
              name="Total"
            />
            <Line 
              type="monotone" 
              dataKey="paid" 
              stroke="#22c55e" 
              strokeWidth={2}
              name="Pago"
            />
            <Line 
              type="monotone" 
              dataKey="pending" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Pendente"
            />
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip content={customTooltip} />
            <Legend />
            <Area
              type="monotone"
              dataKey="total"
              stackId="1"
              stroke="#0ea5e9"
              fill="url(#totalGradient)"
              name="Total"
            />
            <Area
              type="monotone"
              dataKey="paid"
              stackId="2"
              stroke="#22c55e"
              fill="url(#paidGradient)"
              name="Pago"
            />
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip content={customTooltip} />
            <Legend />
            <Bar dataKey="seller" fill="#0ea5e9" name="Vendedor" />
            <Bar dataKey="manager" fill="#8b5cf6" name="Gerente" />
          </BarChart>
        )

      case 'pie':
        const pieData = [
          { name: 'Pago', value: data.reduce((sum, item) => sum + item.paid, 0), fill: '#22c55e' },
          { name: 'Pendente', value: data.reduce((sum, item) => sum + item.pending, 0), fill: '#f59e0b' },
        ]

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), '']}
            />
          </PieChart>
        )

      default:
        return null
    }
  }

  // Calculate summary stats
  const totalEarnings = data.reduce((sum, item) => sum + item.total, 0)
  const totalPaid = data.reduce((sum, item) => sum + item.paid, 0)
  const totalPending = data.reduce((sum, item) => sum + item.pending, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <DollarSignIcon className="w-5 h-5 mr-2" />
            {title}
          </CardTitle>
          
          {showPeriodSelector && (
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total</p>
            <p className="text-lg font-bold text-blue-900">
              {formatCurrency(totalEarnings)}
            </p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Pago</p>
            <p className="text-lg font-bold text-green-900">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Pendente</p>
            <p className="text-lg font-bold text-yellow-900">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Performance indicator */}
        {data.length > 1 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tendência:</span>
              <div className="flex items-center space-x-1">
                {data[data.length - 1].total > data[data.length - 2].total ? (
                  <>
                    <TrendingUpIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Em crescimento</span>
                  </>
                ) : (
                  <>
                    <TrendingDownIcon className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600 font-medium">Em declínio</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EarningChart
