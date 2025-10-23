/**
 * @file components/charts/RankingChart.tsx
 * @version 2.0.0
 * @description Gráfico de ranking de vendedores
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TrophyIcon } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface RankingItem {
  position: number
  userId: string
  userName: string
  userAvatar?: string
  points: number
  level: string
  isCurrentUser?: boolean
}

interface RankingChartProps {
  data: RankingItem[]
  title?: string
  showAvatar?: boolean
  maxItems?: number
  height?: number
  className?: string
}

const RankingChart: React.FC<RankingChartProps> = ({
  data,
  title = 'Ranking de Vendedores',
  showAvatar = true,
  maxItems = 10,
  height = 400,
  className = ''
}) => {
  const displayData = data.slice(0, maxItems)
  
  const colors = [
    '#FFD700', // Gold for 1st
    '#C0C0C0', // Silver for 2nd
    '#CD7F32', // Bronze for 3rd
    '#0ea5e9', // Blue for others
    '#0ea5e9',
    '#0ea5e9',
    '#0ea5e9',
    '#0ea5e9',
    '#0ea5e9',
    '#0ea5e9',
  ]

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2 mb-2">
            {showAvatar && (
              <Avatar className="w-6 h-6">
                <AvatarImage src={data.userAvatar} />
                <AvatarFallback name={data.userName} />
              </Avatar>
            )}
            <span className="font-medium">{data.userName}</span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{formatNumber(data.points)}</span> pontos
          </p>
          <p className="text-xs text-gray-500">
            {data.position}º lugar • Nível {data.level}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrophyIcon className="w-5 h-5 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Top 3 Podium */}
          {displayData.length >= 3 && (
            <div className="flex items-end justify-center space-x-4 pb-6 border-b">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-12 bg-gray-300 rounded-t-lg flex items-center justify-center mb-2">
                  <span className="text-white font-bold">2º</span>
                </div>
                <Avatar className="w-12 h-12 mx-auto mb-2 ring-2 ring-gray-300">
                  <AvatarImage src={displayData[1].userAvatar} />
                  <AvatarFallback name={displayData[1].userName} />
                </Avatar>
                <p className="text-sm font-medium truncate max-w-16">
                  {displayData[1].userName.split(' ')[0]}
                </p>
                <p className="text-xs text-gray-600">
                  {formatNumber(displayData[1].points)}
                </p>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-yellow-400 rounded-t-lg flex items-center justify-center mb-2 relative">
                  <span className="text-white font-bold">1º</span>
                  <div className="absolute -top-3 -right-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <TrophyIcon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
                <Avatar className="w-14 h-14 mx-auto mb-2 ring-2 ring-yellow-400">
                  <AvatarImage src={displayData[0].userAvatar} />
                  <AvatarFallback name={displayData[0].userName} />
                </Avatar>
                <p className="text-sm font-bold truncate max-w-16">
                  {displayData[0].userName.split(' ')[0]}
                </p>
                <p className="text-xs text-yellow-600 font-medium">
                  {formatNumber(displayData[0].points)}
                </p>
                <Badge variant="success" className="text-xs mt-1">
                  Líder
                </Badge>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <div className="w-16 h-8 bg-amber-600 rounded-t-lg flex items-center justify-center mb-2">
                  <span className="text-white font-bold">3º</span>
                </div>
                <Avatar className="w-12 h-12 mx-auto mb-2 ring-2 ring-amber-600">
                  <AvatarImage src={displayData[2].userAvatar} />
                  <AvatarFallback name={displayData[2].userName} />
                </Avatar>
                <p className="text-sm font-medium truncate max-w-16">
                  {displayData[2].userName.split(' ')[0]}
                </p>
                <p className="text-xs text-gray-600">
                  {formatNumber(displayData[2].points)}
                </p>
              </motion.div>
            </div>
          )}

          {/* Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayData}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="userName" 
                  type="category" 
                  width={100}
                  fontSize={12}
                  tickFormatter={(value) => 
                    value.length > 12 ? `${value.substring(0, 12)}...` : value
                  }
                />
                <Tooltip content={customTooltip} />
                <Bar dataKey="points" radius={[0, 4, 4, 0]}>
                  {displayData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isCurrentUser ? '#ef4444' : colors[index]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Complete List */}
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {displayData.map((item, index) => (
              <motion.div
                key={item.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  item.isCurrentUser 
                    ? 'bg-red-50 border border-red-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                  <span className="text-sm font-bold text-gray-700">
                    {item.position}
                  </span>
                </div>
                
                {showAvatar && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={item.userAvatar} />
                    <AvatarFallback name={item.userName} />
                  </Avatar>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    item.isCurrentUser ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {item.userName}
                    {item.isCurrentUser && (
                      <span className="ml-2 text-xs text-red-600">(Você)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatNumber(item.points)} pontos
                  </p>
                </div>
                
                <div className="text-right">
                  <Badge 
                    variant={item.level.toLowerCase() as any}
                    className="text-xs"
                  >
                    {item.level}
                  </Badge>
                  {index < 3 && (
                    <div className="flex items-center justify-center mt-1">
                      {index === 0 && <span className="text-yellow-500">🥇</span>}
                      {index === 1 && <span className="text-gray-400">🥈</span>}
                      {index === 2 && <span className="text-amber-600">🥉</span>}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RankingChart
