/**
 * @file components/ui/DataTable.tsx
 * @version 2.0.0
 * @description Componente de tabela de dados reutilizável
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/types'
import { ChevronLeftIcon, ChevronRightIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/ui/EmptyState'

interface DataTableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  onPageChange?: (page: number) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  currentSort?: { column: string; direction: 'asc' | 'desc' }
  emptyMessage?: string
  className?: string
}

function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  pagination,
  onPageChange,
  onSort,
  currentSort,
  emptyMessage = 'Nenhum item encontrado',
  className = ''
}: DataTableProps<T>) {
  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable || !onSort) return

    const newDirection = 
      currentSort?.column === column.key && currentSort.direction === 'asc' 
        ? 'desc' 
        : 'asc'
    
    onSort(column.key, newDirection)
  }

  const getSortIcon = (column: TableColumn<T>) => {
    if (!column.sortable) return null

    if (currentSort?.column !== column.key) {
      return <ArrowUpIcon className="w-4 h-4 opacity-50" />
    }

    return currentSort.direction === 'asc' 
      ? <ArrowUpIcon className="w-4 h-4" />
      : <ArrowDownIcon className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {/* Header skeleton */}
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <div className="flex space-x-4">
              {columns.map((column) => (
                <Skeleton key={column.key} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          
          {/* Rows skeleton */}
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="p-4 border-b last:border-b-0">
              <div className="flex space-x-4">
                {columns.map((column) => (
                  <Skeleton key={column.key} className="h-4 flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!loading && data.length === 0) {
    return (
      <div className="border rounded-lg p-8">
        <EmptyState
          title="Nenhum item encontrado"
          description={emptyMessage}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`${column.className || ''} ${
                    column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''
                  }`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.label}</span>
                    {getSortIcon(column)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {data.map((item, index) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className="hover:bg-muted/50 transition-colors"
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={column.className}
                  >
                    {column.render
                      ? column.render(item)
                      : (item as any)[column.key]
                    }
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} resultados
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPrev}
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            
            <span className="text-sm font-medium">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              Próxima
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
