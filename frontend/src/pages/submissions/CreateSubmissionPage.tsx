/**
 * @file pages/submissions/CreateSubmissionPage.tsx
 * @version 2.0.0
 * @description Página para criar nova submissão
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeftIcon, 
  SaveIcon, 
  TargetIcon,
  InfoIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { campaignService } from '@/services/campaignService'
import { submissionService } from '@/services/submissionService'
import { useToast } from '@/hooks/useToast'
import { SubmissionForm } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'

const submissionSchema = z.object({
  campaignId: z.string().min(1, 'Selecione uma campanha'),
  requirementId: z.string().min(1, 'Selecione um requisito'),
  orderNumber: z.string().min(3, 'Número do pedido deve ter pelo menos 3 caracteres'),
  quantity: z.number().min(1, 'Quantidade deve ser maior que zero'),
  notes: z.string().optional(),
})

const CreateSubmissionPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')

  const form = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      quantity: 1,
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

  // Mutation para criar submissão
  const createSubmissionMutation = useMutation({
    mutationFn: submissionService.createSubmission,
    onSuccess: () => {
      toast.success('Submissão criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      navigate('/app/submissions')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar submissão')
    },
  })

  const onSubmit = (data: SubmissionForm) => {
    createSubmissionMutation.mutate(data)
  }

  if (loadingCampaigns) {
    return <LoadingScreen message="Carregando campanhas..." />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Submissão</h1>
          <p className="text-gray-600">Registre uma nova venda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário - 2/3 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Venda</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Campanha */}
                  <FormField
                    control={form.control}
                    name="campaignId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Campanha</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            setSelectedCampaign(value)
                            form.setValue('requirementId', '') // Reset requirement
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma campanha" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {campaigns?.map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                <div className="flex items-center space-x-2">
                                  <StatusBadge status={campaign.status} type="campaign" />
                                  <span>{campaign.title}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Requisito */}
                  {selectedCampaign && campaignDetails?.goalRequirements && (
                    <FormField
                      control={form.control}
                      name="requirementId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Requisito da Campanha</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o requisito" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {campaignDetails.goalRequirements.map((requirement) => (
                                <SelectItem key={requirement.id} value={requirement.id}>
                                  <div className="space-y-1">
                                    <div>{requirement.description}</div>
                                    <div className="text-xs text-gray-500">
                                      Meta: {requirement.quantity} {requirement.unitType === 'PAIR' ? 'pares' : 'unidades'}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Número do Pedido */}
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Número do Pedido</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: PED-001-2025"
                            {...field}
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quantidade */}
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Quantidade</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="1000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Observações */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observações sobre a venda (opcional)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Actions */}
                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/app/submissions')}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      loading={createSubmissionMutation.isPending}
                    >
                      <SaveIcon className="w-4 h-4 mr-2" />
                      Salvar Submissão
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar informativa - 1/3 */}
        <div className="space-y-4">
          {/* Informações da campanha selecionada */}
          {campaignDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campanha Selecionada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <img
                  src={campaignDetails.imageUrl}
                  alt={campaignDetails.title}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <h3 className="font-medium">{campaignDetails.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {campaignDetails.description}
                </p>
                
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pontos:</span>
                    <span className="font-medium">{campaignDetails.pointsOnCompletion || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Requisitos:</span>
                    <span className="font-medium">{campaignDetails.goalRequirements?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <InfoIcon className="w-5 h-5 mr-2" />
                Dicas
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

export default CreateSubmissionPage
