/**
 * @file pages/validation/ValidationSpreadsheetPage.tsx
 * @version 2.0.0
 * @description Página para upload e validação de planilhas
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { 
  UploadIcon, 
  FileSpreadsheetIcon, 
  CheckIcon,
  AlertTriangleIcon,
  XIcon,
  DownloadIcon,
  EyeIcon,
  RefreshCwIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/ui/DataTable'
import { validationService } from '@/services/validationService'
import { campaignService } from '@/services/campaignService'
import { useToast } from '@/hooks/useToast'
import { TableColumn } from '@/types'
import { formatDate, formatFileSize, getErrorMessage } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'

const ValidationSpreadsheetPage: React.FC = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [isDryRun, setIsDryRun] = useState(true)
  const [mappingConfig, setMappingConfig] = useState({
    orderNumberColumn: 'A',
    quantityColumn: 'B',
    dateColumn: 'C',
    hasHeaders: true,
    startRow: 2,
  })

  // Queries
  const { data: campaigns } = useQuery({
    queryKey: ['active-campaigns'],
    queryFn: () => campaignService.getActiveCampaigns(),
  })

  const { data: validationJobs, isLoading: loadingJobs, refetch } = useQuery({
    queryKey: ['validation-jobs'],
    queryFn: () => validationService.getValidationJobs({}),
  })

  const { data: templates } = useQuery({
    queryKey: ['mapping-templates'],
    queryFn: () => validationService.getMappingTemplates(),
  })

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: ({ file, config }: { file: File; config: any }) =>
      validationService.uploadValidationFile(file, config, {
        onProgress: setUploadProgress,
      }),
    onSuccess: (data) => {
      toast.success('Arquivo enviado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['validation-jobs'] })
      setUploadProgress(0)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro no upload')
      setUploadProgress(0)
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: validationService.reprocessValidationJob,
    onSuccess: () => {
      toast.success('Job reprocessado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['validation-jobs'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao reprocessar')
    },
  })

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!selectedCampaign) {
      toast.error('Selecione uma campanha antes de fazer upload')
      return
    }

    const config = {
      campaignId: selectedCampaign,
      isDryRun,
      mapping: mappingConfig,
    }

    uploadMutation.mutate({ file, config })
  }, [selectedCampaign, isDryRun, mappingConfig, uploadMutation, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
  })

  // Table columns for validation jobs
  const jobColumns: TableColumn<any>[] = [
    {
      key: 'fileName',
      label: 'Arquivo',
      render: (job) => (
        <div className="flex items-center space-x-2">
          <FileSpreadsheetIcon className="w-4 h-4 text-green-600" />
          <div>
            <p className="font-medium text-sm">{job.fileName}</p>
            <p className="text-xs text-gray-500">
              {formatFileSize(job.fileSize || 0)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (job) => (
        <Badge 
          variant={
            job.status === 'CONCLUIDO' ? 'success' :
            job.status === 'FALHOU' ? 'error' : 'warning'
          }
        >
          {job.status === 'PROCESSANDO' && '⏳ Processando'}
          {job.status === 'CONCLUIDO' && '✅ Concluído'}
          {job.status === 'FALHOU' && '❌ Falhou'}
        </Badge>
      ),
    },
    {
      key: 'campaignTitle',
      label: 'Campanha',
      render: (job) => (
        <span className="text-sm">{job.campaignTitle}</span>
      ),
    },
    {
      key: 'results',
      label: 'Resultados',
      render: (job) => (
        <div className="text-sm">
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-medium">{job.totalRows}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600">Validadas:</span>
            <span className="font-medium">{job.validatedSales}</span>
          </div>
          {job.errors > 0 && (
            <div className="flex justify-between">
              <span className="text-red-600">Erros:</span>
              <span className="font-medium">{job.errors}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'uploadDate',
      label: 'Data',
      render: (job) => (
        <span className="text-sm">{formatDate(job.uploadDate)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (job) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" title="Ver detalhes">
            <EyeIcon className="w-4 h-4" />
          </Button>
          
          {job.status === 'CONCLUIDO' && (
            <Button 
              variant="ghost" 
              size="sm" 
              title="Download resultados"
              onClick={() => validationService.downloadValidationResults(job.id)}
            >
              <DownloadIcon className="w-4 h-4" />
            </Button>
          )}
          
          {job.status === 'FALHOU' && (
            <Button 
              variant="ghost" 
              size="sm" 
              title="Reprocessar"
              onClick={() => reprocessMutation.mutate(job.id, {})}
            >
              <RefreshCwIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Validação de Planilhas</h1>
          <p className="text-gray-600">
            Faça upload de planilhas para validação automática de vendas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label required>Campanha</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns?.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 mt-6">
                  <input
                    type="checkbox"
                    id="isDryRun"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="rounded border-gray-300 text-eps-600 focus:ring-eps-500"
                  />
                  <Label htmlFor="isDryRun" className="cursor-pointer">
                    Modo de teste (não salva dados)
                  </Label>
                </div>
              </div>

              {/* Mapping Configuration */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Mapeamento de Colunas</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Coluna Nº Pedido</Label>
                    <Input
                      value={mappingConfig.orderNumberColumn}
                      onChange={(e) => setMappingConfig(prev => ({ 
                        ...prev, 
                        orderNumberColumn: e.target.value.toUpperCase() 
                      }))}
                      placeholder="A"
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coluna Quantidade</Label>
                    <Input
                      value={mappingConfig.quantityColumn}
                      onChange={(e) => setMappingConfig(prev => ({ 
                        ...prev, 
                        quantityColumn: e.target.value.toUpperCase() 
                      }))}
                      placeholder="B"
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coluna Data</Label>
                    <Input
                      value={mappingConfig.dateColumn}
                      onChange={(e) => setMappingConfig(prev => ({ 
                        ...prev, 
                        dateColumn: e.target.value.toUpperCase() 
                      }))}
                      placeholder="C"
                      className="text-center"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Upload de Arquivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-eps-500 bg-eps-50'
                    : 'border-gray-300 hover:border-eps-400 hover:bg-eps-50'
                }`}
              >
                <input {...getInputProps()} />
                
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-eps-100 rounded-lg flex items-center justify-center mx-auto">
                    <UploadIcon className="w-8 h-8 text-eps-600" />
                  </div>
                  
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive
                        ? 'Solte o arquivo aqui...'
                        : 'Arraste um arquivo ou clique para selecionar'
                      }
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Suporta .xlsx, .xls e .csv (máx. 50MB)
                    </p>
                  </div>

                  {!selectedCampaign && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Selecione uma campanha antes de fazer upload
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploadMutation.isPending && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Enviando arquivo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-4">
          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Template Excel
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Template CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instruções</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                  <p>Use o template fornecido para melhor compatibilidade</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                  <p>Configure o mapeamento das colunas corretamente</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                  <p>Use modo de teste primeira para verificar os dados</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                  <p>Arquivos grandes podem demorar para processar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Jobs hoje:</span>
                  <span className="font-medium">5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendas processadas:</span>
                  <span className="font-medium">1.234</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxa de sucesso:</span>
                  <span className="font-medium text-green-600">94%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tempo médio:</span>
                  <span className="font-medium">2min 30s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Validation Jobs History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Histórico de Validações</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <LoadingScreen message="Carregando histórico..." />
          ) : (
            <DataTable
              data={validationJobs?.data || []}
              columns={jobColumns}
              pagination={validationJobs?.pagination}
              emptyMessage="Nenhuma validação encontrada"
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ValidationSpreadsheetPage
