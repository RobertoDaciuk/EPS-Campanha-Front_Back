/**
 * @file pages/submissions/ValidationPage.tsx
 * @version 2.0.0
 * @description Página para validação de submissões
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  CheckIcon, 
  XIcon, 
  ClockIcon, 
  FilterIcon,
  EyeIcon,
  CheckCheckIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import DataTable from '@/components/ui/DataTable'
import ValidationModal from '@/components/modals/ValidationModal'
import ConfirmDialog from '@/components/modals/ConfirmDialog'
import { submissionService } from '@/services/submissionService'
import { useToast } from '@/hooks/useToast'
import { CampaignSubmission, CampaignSubmissionStatus, TableColumn } from '@/types'
import { formatDate, formatDateTime, getErrorMessage } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import StatusBadge from '@/components/ui/StatusBadge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const ValidationPage: React.FC = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    sort: 'submissionDate',
    order: 'desc' as 'asc' | 'desc',
    status: 'PENDING',
  })

  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([])
  const [validationModal, setValidationModal] = useState<{
    open: boolean
    submission: CampaignSubmission | null
  }>({ open: false, submission: null })
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean
    action: 'validate' | 'reject' | null
  }>({ open: false, action: null })

  // Queries
  const { data: submissionsResponse, isLoading } = useQuery({
    queryKey: ['pending-submissions', filters],
    queryFn: () => submissionService.getPendingSubmissions(filters),
  })

  // Mutations
  const validateSubmissionMutation = useMutation({
    mutationFn: submissionService.validateSubmission,
    onSuccess: (data) => {
      toast.success(
        data.submission.status === 'VALIDATED' 
          ? 'Submissão validada com sucesso!' 
          : 'Submissão rejeitada'
      )
      queryClient.invalidateQueries({ queryKey: ['pending-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro na validação')
    },
  })

  const bulkValidateMutation = useMutation({
    mutationFn: submissionService.bulkValidateSubmissions,
    onSuccess: (data) => {
      toast.success(`${data.successful} submissões processadas com sucesso!`)
      queryClient.invalidateQueries({ queryKey: ['pending-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      setSelectedSubmissions([])
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro na validação em lote')
    },
  })

  // Handlers
  const handleValidateSubmission = async (data: {
    status: CampaignSubmissionStatus.VALIDATED | CampaignSubmissionStatus.REJECTED
    message?: string
    internalNotes?: string
  }) => {
    if (!validationModal.submission) return

    await validateSubmissionMutation.mutateAsync(validationModal.submission.id, data)
    setValidationModal({ open: false, submission: null })
  }

  const handleBulkAction = async () => {
    if (!bulkActionDialog.action || selectedSubmissions.length === 0) return

    await bulkValidateMutation.mutateAsync({
      submissionIds: selectedSubmissions,
      action: bulkActionDialog.action,
      validationMessage: bulkActionDialog.action === 'reject' ? 'Rejeitado em lote' : undefined,
      applyToAll: true
    })

    setBulkActionDialog({ open: false, action: null })
  }

  const handleSelectionChange = (submissionId: string, checked: boolean) => {
    setSelectedSubmissions(prev => 
      checked 
        ? [...prev, submissionId]
        : prev.filter(id => id !== submissionId)
    )
  }

  const handleSelectAll = (checked: boolean) => {
    const submissions = submissionsResponse?.data || []
    setSelectedSubmissions(checked ? submissions.map(s => s.id) : [])
  }

  // Table columns
  const columns: TableColumn<CampaignSubmission>[] = [
    {
      key: 'select',
      label: (
        <Checkbox
          checked={selectedSubmissions.length === (submissionsResponse?.data?.length || 0)}
          onCheckedChange={handleSelectAll}
        />
      ),
      render: (submission) => (
        <Checkbox
          checked={selectedSubmissions.includes(submission.id)}
          onCheckedChange={(checked) => handleSelectionChange(submission.id, checked)}
        />
      ),
    },
    {
      key: 'orderNumber',
      label: 'Nº Pedido',
      sortable: true,
      render: (submission) => (
        <div className="font-mono text-sm">
          {submission.orderNumber}
        </div>
      ),
    },
    {
      key: 'user',
      label: 'Vendedor',
      render: (submission) => (
        <div className="flex items-center space-x-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={submission.user?.avatarUrl} />
            <AvatarFallback name={submission.user?.name} />
          </Avatar>
          <span className="text-sm">{submission.user?.name}</span>
        </div>
      ),
    },
    {
      key: 'campaign',
      label: 'Campanha',
      render: (submission) => (
        <div>
          <p className="font-medium text-sm">{submission.campaign?.title}</p>
          <p className="text-xs text-gray-500">{submission.requirement?.description}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Qtd',
      sortable: true,
      render: (submission) => (
        <span className="font-medium">{submission.quantity}</span>
      ),
    },
    {
      key: 'submissionDate',
      label: 'Data',
      sortable: true,
      render: (submission) => (
        <div>
          <p className="text-sm">{formatDate(submission.submissionDate)}</p>
          <p className="text-xs text-gray-500">{formatDateTime(submission.submissionDate).split(' ')[1]}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (submission) => (
        <StatusBadge status={submission.status} type="submission" />
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (submission) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setValidationModal({ open: true, submission })}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) {
    return <LoadingScreen message="Carregando submissões..." />
  }

  const submissions = submissionsResponse?.data || []
  const hasSelected = selectedSubmissions.length > 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Validação de Submissões</h1>
          <p className="text-gray-600">
            Analise e valide as submissões pendentes da sua equipe
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-xl font-bold text-yellow-600">
                  {submissions.filter(s => s.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Validadas Hoje</p>
                <p className="text-xl font-bold text-green-600">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Rejeitadas Hoje</p>
                <p className="text-xl font-bold text-red-600">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-4">
              <Input
                placeholder="Buscar por nº do pedido..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-64"
              />
              
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-eps-500"
              >
                <option value="PENDING">Pendentes</option>
                <option value="VALIDATED">Validadas</option>
                <option value="REJECTED">Rejeitadas</option>
                <option value="">Todas</option>
              </select>

              <Button variant="outline" size="sm">
                <FilterIcon className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>

            {/* Bulk Actions */}
            {hasSelected && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedSubmissions.length} selecionadas
                </span>
                
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => setBulkActionDialog({ open: true, action: 'validate' })}
                >
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Validar Todas
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkActionDialog({ open: true, action: 'reject' })}
                >
                  <XIcon className="w-4 h-4 mr-2" />
                  Rejeitar Todas
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={submissions}
            columns={columns}
            loading={isLoading}
            pagination={submissionsResponse?.pagination}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            onSort={(column, direction) => setFilters(prev => ({ ...prev, sort: column, order: direction }))}
            currentSort={{ column: filters.sort, direction: filters.order }}
            emptyMessage="Nenhuma submissão encontrada"
          />
        </CardContent>
      </Card>

      {/* Validation Modal */}
      <ValidationModal
        open={validationModal.open}
        onOpenChange={(open) => setValidationModal({ open, submission: null })}
        submission={validationModal.submission}
        onValidate={handleValidateSubmission}
        loading={validateSubmissionMutation.isPending}
      />

      {/* Bulk Action Confirmation */}
      <ConfirmDialog
        open={bulkActionDialog.open}
        onOpenChange={(open) => setBulkActionDialog({ open, action: null })}
        title={`${bulkActionDialog.action === 'validate' ? 'Validar' : 'Rejeitar'} submissões em lote`}
        description={`Você está prestes a ${bulkActionDialog.action === 'validate' ? 'validar' : 'rejeitar'} ${selectedSubmissions.length} submissões. Esta ação não pode ser desfeita.`}
        confirmLabel={bulkActionDialog.action === 'validate' ? 'Validar Todas' : 'Rejeitar Todas'}
        variant={bulkActionDialog.action === 'validate' ? 'success' : 'destructive'}
        loading={bulkValidateMutation.isPending}
        onConfirm={handleBulkAction}
      />
    </motion.div>
  )
}

export default ValidationPage
