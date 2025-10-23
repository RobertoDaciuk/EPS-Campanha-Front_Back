/**
 * @file pages/premios/PremioListPage.tsx
 * @version 2.0.0
 * @description Página de listagem de prêmios
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  PlusIcon, 
  FilterIcon, 
  GiftIcon, 
  StarIcon,
  PackageIcon,
  TrophyIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { premioService } from '@/services/premioService'
import { useAuth } from '@/hooks/useAuth'
import { Premio, UserRole } from '@/types'
import { formatNumber } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'

const PremioListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    search: '',
    category: '',
    sort: 'priority',
    order: 'desc' as 'asc' | 'desc',
  })

  const { data: premiosResponse, isLoading } = useQuery({
    queryKey: ['premios', filters],
    queryFn: () => premioService.getPremios(filters),
  })

  const { data: popularPremios } = useQuery({
    queryKey: ['popular-premios'],
    queryFn: () => premioService.getPopularPremios(5),
  })

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }))
  }

  if (isLoading) {
    return <LoadingScreen message="Carregando prêmios..." />
  }

  const premios = premiosResponse?.data || []
  const pagination = premiosResponse?.pagination

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Prêmios</h1>
          <p className="text-gray-600">
            {user?.role === UserRole.VENDEDOR
              ? `Você tem ${formatNumber(user.points)} pontos para resgatar`
              : 'Gerencie o catálogo de prêmios'
            }
          </p>
        </div>

        {user?.role === UserRole.ADMIN && (
          <Button asChild>
            <Link to="/app/premios/create">
              <PlusIcon className="w-4 h-4 mr-2" />
              Novo Prêmio
            </Link>
          </Button>
        )}
      </div>

      {/* Popular Prizes */}
      {popularPremios?.premios && popularPremios.premios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <StarIcon className="w-5 h-5 mr-2" />
              Mais Populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {popularPremios.premios.map((premio) => (
                <motion.div
                  key={premio.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-lg border border-yellow-200 cursor-pointer"
                  onClick={() => navigate(`/app/premios/${premio.id}`)}
                >
                  <img
                    src={premio.imageUrl}
                    alt={premio.title}
                    className="w-full h-20 object-cover rounded mb-2"
                  />
                  <h4 className="text-xs font-medium line-clamp-2 mb-1">{premio.title}</h4>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {formatNumber(premio.pointsRequired)} pts
                    </Badge>
                    <StarIcon className="w-3 h-3 text-yellow-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar prêmios..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-eps-500"
              >
                <option value="">Todas as categorias</option>
                <option value="Eletrônicos">Eletrônicos</option>
                <option value="Vale-compras">Vale-compras</option>
                <option value="Casa & Jardim">Casa & Jardim</option>
                <option value="Eletrodomésticos">Eletrodomésticos</option>
                <option value="Acessórios">Acessórios</option>
              </select>

              <Button variant="outline" size="sm">
                <FilterIcon className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prizes Grid */}
      {premios.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {premios.map((premio, index) => (
              <motion.div
                key={premio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PremioCard 
                  premio={premio}
                  userPoints={user?.points || 0}
                  onClick={() => navigate(`/app/premios/${premio.id}`)}
                />
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev}
                >
                  Anterior
                </Button>
                
                <span className="text-sm text-gray-600">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<GiftIcon className="w-16 h-16" />}
          title="Nenhum prêmio encontrado"
          description="Não foram encontrados prêmios com os filtros aplicados"
        />
      )}
    </motion.div>
  )
}

// Componente de card de prêmio
interface PremioCardProps {
  premio: Premio
  userPoints: number
  onClick: () => void
}

const PremioCard: React.FC<PremioCardProps> = ({ premio, userPoints, onClick }) => {
  const canRedeem = userPoints >= premio.pointsRequired && premio.stock > 0 && premio.isActive

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow group overflow-hidden" 
      onClick={onClick}
    >
      <div className="relative">
        <img
          src={premio.imageUrl}
          alt={premio.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Stock indicator */}
        <div className="absolute top-3 right-3">
          {premio.stock === 0 ? (
            <Badge variant="error">Esgotado</Badge>
          ) : premio.stock <= 5 ? (
            <Badge variant="warning">Últimas unidades</Badge>
          ) : (
            <Badge variant="success">Disponível</Badge>
          )}
        </div>

        {/* Category */}
        {premio.category && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="text-xs">
              {premio.category}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
            {premio.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {premio.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-1">
            <TrophyIcon className="w-4 h-4 text-yellow-500" />
            <span className="font-bold text-yellow-700">
              {formatNumber(premio.pointsRequired)}
            </span>
            <span className="text-xs text-gray-500">pts</span>
          </div>

          <div className="flex items-center text-xs text-gray-500">
            <PackageIcon className="w-3 h-3 mr-1" />
            <span>{premio.stock} em estoque</span>
          </div>
        </div>

        {/* User can redeem indicator */}
        {canRedeem && (
          <div className="bg-green-50 border border-green-200 rounded-md p-2 text-center">
            <p className="text-xs font-medium text-green-800">
              ✨ Você pode resgatar este prêmio!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PremioListPage
