/**
 * @file components/forms/CampaignForm.tsx
 * @version 2.0.0
 * @description Formulário para criar/editar campanhas
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  SaveIcon, 
  PlusIcon, 
  TrashIcon, 
  ImageIcon,
  InfoIcon,
  CalendarIcon,
  TrophyIcon,
  TargetIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CampaignForm as CampaignFormType, CampaignStatus, UnitType } from '@/types'
import { formatDateForInput } from '@/lib/utils'

const campaignSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  imageUrl: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().min(1, 'Data de término é obrigatória'),
  pointsOnCompletion: z.number().min(0, 'Pontos devem ser maior ou igual a 0'),
  managerPointsPercentage: z.number().min(0).max(100, 'Percentual deve ser entre 0 e 100'),
  goalRequirements: z.array(z.object({
    description: z.string().min(3, 'Descrição é obrigatória'),
    quantity: z.number().min(1, 'Quantidade deve ser maior que 0'),
    unitType: z.enum(['UNIT', 'PAIR']),
  })).min(1, 'Pelo menos um requisito é obrigatório'),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'Data de término deve ser posterior à data de início',
  path: ['endDate'],
})

interface CampaignFormProps {
  initialData?: Partial<CampaignFormType>
  onSubmit: (data: CampaignFormType) => Promise<void>
  loading?: boolean
  mode?: 'create' | 'edit'
}

const CampaignForm: React.FC<CampaignFormProps> = ({
  initialData,
  onSubmit,
  loading = false,
  mode = 'create'
}) => {
  const [previewImage, setPreviewImage] = useState<string>(initialData?.imageUrl || '')

  const form = useForm<CampaignFormType>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      imageUrl: initialData?.imageUrl || '',
      startDate: initialData?.startDate ? formatDateForInput(initialData.startDate) : '',
      endDate: initialData?.endDate ? formatDateForInput(initialData.endDate) : '',
      pointsOnCompletion: initialData?.pointsOnCompletion || 0,
      managerPointsPercentage: initialData?.managerPointsPercentage || 10,
      goalRequirements: initialData?.goalRequirements || [
        { description: '', quantity: 1, unitType: UnitType.UNIT }
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'goalRequirements',
  })

  const handleSubmit = async (data: CampaignFormType) => {
    await onSubmit(data)
  }

  const handleImageUrlChange = (url: string) => {
    setPreviewImage(url)
    form.setValue('imageUrl', url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário - 2/3 */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TargetIcon className="w-5 h-5 mr-2" />
              {mode === 'create' ? 'Nova Campanha' : 'Editar Campanha'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Informações básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informações Básicas</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title" required>Título da Campanha</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Especial Armações Premium"
                    {...form.register('title')}
                    error={!!form.formState.errors.title}
                    helperText={form.formState.errors.title?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" required>Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva os objetivos e detalhes da campanha..."
                    rows={4}
                    {...form.register('description')}
                    error={!!form.formState.errors.description}
                    helperText={form.formState.errors.description?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://exemplo.com/imagem.jpg"
                    {...form.register('imageUrl')}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    error={!!form.formState.errors.imageUrl}
                    helperText={form.formState.errors.imageUrl?.message}
                  />
                </div>
              </div>

              {/* Datas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Período da Campanha
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" required>Data de Início</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...form.register('startDate')}
                      error={!!form.formState.errors.startDate}
                      helperText={form.formState.errors.startDate?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" required>Data de Término</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...form.register('endDate')}
                      error={!!form.formState.errors.endDate}
                      helperText={form.formState.errors.endDate?.message}
                    />
                  </div>
                </div>
              </div>

              {/* Pontuação */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <TrophyIcon className="w-5 h-5 mr-2" />
                  Sistema de Pontos
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pointsOnCompletion" required>Pontos na Conclusão</Label>
                    <Input
                      id="pointsOnCompletion"
                      type="number"
                      min="0"
                      max="10000"
                      {...form.register('pointsOnCompletion', { valueAsNumber: true })}
                      error={!!form.formState.errors.pointsOnCompletion}
                      helperText={form.formState.errors.pointsOnCompletion?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="managerPointsPercentage" required>% Pontos do Gerente</Label>
                    <Input
                      id="managerPointsPercentage"
                      type="number"
                      min="0"
                      max="100"
                      {...form.register('managerPointsPercentage', { valueAsNumber: true })}
                      error={!!form.formState.errors.managerPointsPercentage}
                      helperText={form.formState.errors.managerPointsPercentage?.message}
                    />
                  </div>
                </div>
              </div>

              {/* Requisitos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Requisitos da Campanha</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: '', quantity: 1, unitType: UnitType.UNIT })}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Adicionar Requisito
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 border rounded-lg space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Requisito {index + 1}</h4>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 space-y-2">
                          <Label required>Descrição</Label>
                          <Input
                            placeholder="Ex: Venda de armações premium"
                            {...form.register(`goalRequirements.${index}.description`)}
                            error={!!form.formState.errors.goalRequirements?.[index]?.description}
                          />
                          {form.formState.errors.goalRequirements?.[index]?.description && (
                            <p className="text-xs text-red-500">
                              {form.formState.errors.goalRequirements[index]?.description?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label required>Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            {...form.register(`goalRequirements.${index}.quantity`, { valueAsNumber: true })}
                            error={!!form.formState.errors.goalRequirements?.[index]?.quantity}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label required>Unidade</Label>
                          <Select
                            value={form.watch(`goalRequirements.${index}.unitType`)}
                            onValueChange={(value) => 
                              form.setValue(`goalRequirements.${index}.unitType`, value as UnitType)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNIT">Unidades</SelectItem>
                              <SelectItem value="PAIR">Pares</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" loading={loading}>
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Criar Campanha' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - 1/3 */}
      <div className="space-y-6">
        {/* Preview da imagem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <ImageIcon className="w-5 h-5 mr-2" />
              Preview da Imagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewImage ? (
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-32 object-cover rounded-lg"
                onError={() => setPreviewImage('')}
              />
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Nenhuma imagem</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações */}
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
                <p>Use títulos claros e motivadores</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Defina metas alcançáveis mas desafiadoras</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Imagens chamativas aumentam o engajamento</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Configure percentual de pontos para gerentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview dos requisitos */}
        {fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo dos Requisitos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const description = form.watch(`goalRequirements.${index}.description`)
                  const quantity = form.watch(`goalRequirements.${index}.quantity`)
                  const unitType = form.watch(`goalRequirements.${index}.unitType`)
                  
                  return (
                    <div key={field.id} className="flex items-center justify-between text-sm">
                      <span className="flex-1 truncate">
                        {description || `Requisito ${index + 1}`}
                      </span>
                      <Badge variant="outline">
                        {quantity} {unitType === 'PAIR' ? 'pares' : 'unid.'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default CampaignForm
