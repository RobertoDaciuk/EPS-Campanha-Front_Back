/**
 * @file components/forms/SubmissionForm.tsx
 * @version 2.0.0
 * @description Formulário para criar/editar submissões
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { SaveIcon, TargetIcon, InfoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { campaignService } from '@/services/campaignService'
import { SubmissionForm as SubmissionFormType } from '@/types'
import { formatNumber } from '@/lib/utils'

const submissionSchema = z.object({
  campaignId: z.string().min(1, 'Selecione uma campanha'),
  requirementId: z.string().min(1, 'Selecione um requisito'),
  orderNumber: z.string().min(3, 'Número do pedido deve ter pelo menos 3 caracteres'),
  quantity: z.number().min(1, 'Quantidade deve ser maior que zero'),
  notes: z.string().optional(),
})

interface SubmissionFormProps {
  initialData?: Partial<SubmissionFormType>
  onSubmit: (data: SubmissionFormType) => Promise<void>
  loading?: boolean
  mode?: 'create' | 'edit'
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({
  initialData,
  onSubmit,
  loading = false,
  mode = 'create'
}) => {
  const [selectedCampaign, setSelectedCampaign] = useState<string>(initialData?.campaignId || '')

  const form = useForm<SubmissionFormType>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      campaignId: initialData?.campaignId || '',
      requirementId: initialData?.requirementId || '',
      orderNumber: initialData?.orderNumber || '',
      quantity: initialData?.quantity || 1,
      notes: initialData?.notes || '',
    },
  })

  // Query para campanhas ativas
  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['active-campaigns'],
    queryFn: () => campaignService.getActiveCampaigns(),
  })

  // Query para detalhes da campanha selecionada
  const { data: campaignDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['campaign-details', selectedCampaign],
    queryFn: () => campaignService.getCampaignDetails(selectedCampaign),
    enabled: !!selectedCampaign,
  })

  useEffect(() => {
    if (selectedCampaign && selectedCampaign !== form.getValues('campaignId')) {
      form.setValue('campaignId', selectedCampaign)
      form.setValue('requirementId', '') // Reset requirement when campaign changes
    }
  }, [selectedCampaign, form])

  const handleSubmit = async (data: SubmissionFormType) => {
    await onSubmit(data)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form - 2/3 */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === 'create' ? 'Nova Submissão' : 'Editar Submissão'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Campaign Selection */}
              <div className="space-y-2">
                <Label required>Campanha</Label>
                <Select
                  onValueChange={setSelectedCampaign}
                  value={selectedCampaign}
                  disabled={loadingCampaigns}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center space-x-2">
                          <Badge variant="success">Ativa</Badge>
                          <span>{campaign.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.campaignId && (
                  <p className="text-xs text-red-500">{form.formState.errors.campaignId.message}</p>
                )}
              </div>

              {/* Requirement Selection */}
              {selectedCampaign && campaignDetails?.goalRequirements && (
                <div className="space-y-2">
                  <Label required>Requisito da Campanha</Label>
                  <Select
                    onValueChange={(value) => form.setValue('requirementId', value)}
                    value={form.watch('requirementId')}
                    disabled={loadingDetails}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o requisito" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignDetails.goalRequirements.map((requirement) => (
                        <SelectItem key={requirement.id} value={requirement.id}>
                          <div className="space-y-1">
                            <div className="font-medium">{requirement.description}</div>
                            <div className="text-xs text-gray-500">
                              Meta: {requirement.quantity} {requirement.unitType === 'PAIR' ? 'pares' : 'unidades'}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.requirementId && (
                    <p className="text-xs text-red-500">{form.formState.errors.requirementId.message}</p>
                  )}
                </div>
              )}

              {/* Order Number */}
              <div className="space-y-2">
                <Label htmlFor="orderNumber" required>Número do Pedido</Label>
                <Input
                  id="orderNumber"
                  placeholder="Ex: PED-001-2025"
                  {...form.register('orderNumber')}
                  error={!!form.formState.errors.orderNumber}
                  helperText={form.formState.errors.orderNumber?.message}
                  className="font-mono"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity" required>Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="1000"
                  {...form.register('quantity', { valueAsNumber: true })}
                  error={!!form.formState.errors.quantity}
                  helperText={form.formState.errors.quantity?.message}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre a venda (opcional)"
                  rows={3}
                  {...form.register('notes')}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={loading}
                  disabled={!selectedCampaign || !form.watch('requirementId')}
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Criar Submissão' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - 1/3 */}
      <div className="space-y-4">
        {/* Selected Campaign Info */}
        {campaignDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TargetIcon className="w-5 h-5 mr-2" />
                Campanha Selecionada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <img
                src={campaignDetails.imageUrl}
                alt={campaignDetails.title}
                className="w-full h-32 object-cover rounded-lg"
              />
              
              <div>
                <h3 className="font-medium">{campaignDetails.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-3 mt-1">
                  {campaignDetails.description}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pontos na conclusão:</span>
                  <span className="font-medium text-yellow-600">
                    {formatNumber(campaignDetails.pointsOnCompletion || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Requisitos:</span>
                  <span className="font-medium">
                    {campaignDetails.goalRequirements?.length || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <InfoIcon className="w-5 h-5 mr-2" />
              Dicas Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Use números únicos para cada pedido</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Submissões serão validadas pelo seu gerente</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Adicione observações relevantes para facilitar a validação</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Verifique todas as informações antes de submeter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SubmissionForm
