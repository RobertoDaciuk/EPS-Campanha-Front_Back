/**
 * @file components/charts/PerformanceChart.tsx
 * @version 2.0.0
 * @description Componente de gráfico de performance
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ChartDataPoint } from '@/types'

interface PerformanceChartProps {
  data: ChartDataPoint[]
  title?: string
  type?: 'line' | 'bar'
  height?: number
  showGrid?: boolean
  color?: string
  className?: string
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title = 'Performance',
  type = 'line',
  height = 300,
  showGrid = true,
  color = '#0ea5e9',
  className = ''
}) => {
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium" style={{ color }}>
              {payload[0].value}
            </span>
            {' '}pontos
          </p>
        </div>
      )
    }
    return null
  }

  const ChartComponent = type === 'line' ? LineChart : BarChart

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis 
              dataKey="name" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={customTooltip} />
            
            {type === 'line' ? (
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              />
            ) : (
              <Bar 
                dataKey="value" 
                fill={color}
                radius={[4, 4, 0, 0]}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default PerformanceChart
