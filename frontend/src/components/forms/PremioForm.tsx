/**
 * @file components/forms/PremioForm.tsx
 * @version 2.0.0
 * @description Formulário para criar/editar prêmios
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  SaveIcon, 
  GiftIcon, 
  ImageIcon,
  InfoIcon,
  TrophyIcon,
  PackageIcon,
  StarIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PremioForm as PremioFormType } from '@/types'
import { formatNumber } from '@/lib/utils'

const premioSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  imageUrl: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  pointsRequired: z.number().min(1, 'Pontos requeridos devem ser maior que 0'),
  stock: z.number().min(0, 'Estoque deve ser maior ou igual a 0'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  priority: z.number().min(0).max(100, 'Prioridade deve ser entre 0 e 100').optional(),
  isActive: z.boolean().optional(),
})

const categories = [
  'Eletrônicos',
  'Eletrodomésticos',
  'Casa & Jardim',
  'Esporte & Lazer',
  'Moda & Beleza',
  'Vale-compras',
  'Experiências',
  'Outros',
]

interface PremioFormProps {
  initialData?: Partial<PremioFormType>
  onSubmit: (data: PremioFormType) => Promise<void>
  loading?: boolean
  mode?: 'create' | 'edit'
}

const PremioForm: React.FC<PremioFormProps> = ({
  initialData,
  onSubmit,
  loading = false,
  mode = 'create'
}) => {
  const [previewImage, setPreviewImage] = useState<string>(initialData?.imageUrl || '')

  const form = useForm<PremioFormType>({
    resolver: zodResolver(premioSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      imageUrl: initialData?.imageUrl || '',
      pointsRequired: initialData?.pointsRequired || 100,
      stock: initialData?.stock || 10,
      category: initialData?.category || '',
      priority: initialData?.priority || 50,
      isActive: initialData?.isActive ?? true,
    },
  })

  const handleSubmit = async (data: PremioFormType) => {
    await onSubmit(data)
  }

  const handleImageUrlChange = (url: string) => {
    setPreviewImage(url)
    form.setValue('imageUrl', url)
  }

  const watchPointsRequired = form.watch('pointsRequired')
  const watchStock = form.watch('stock')
  const watchCategory = form.watch('category')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário - 2/3 */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GiftIcon className="w-5 h-5 mr-2" />
              {mode === 'create' ? 'Novo Prêmio' : 'Editar Prêmio'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Informações básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informações Básicas</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title" required>Título do Prêmio</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Smartphone Samsung Galaxy"
                    {...form.register('title')}
                    error={!!form.formState.errors.title}
                    helperText={form.formState.errors.title?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" required>Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva detalhes do prêmio, especificações, etc..."
                    rows={4}
                    {...form.register('description')}
                    error={!!form.formState.errors.description}
                    helperText={form.formState.errors.description?.message}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" required>Categoria</Label>
                    <Select
                      value={form.watch('category')}
                      onValueChange={(value) => form.setValue('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category && (
                      <p className="text-xs text-red-500">{form.formState.errors.category.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade (0-100)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="50"
                      {...form.register('priority', { valueAsNumber: true })}
                      error={!!form.formState.errors.priority}
                      helperText={form.formState.errors.priority?.message || 'Maior número = maior prioridade na listagem'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://exemplo.com/imagem-premio.jpg"
                    {...form.register('imageUrl')}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    error={!!form.formState.errors.imageUrl}
                    helperText={form.formState.errors.imageUrl?.message}
                  />
                </div>
              </div>

              {/* Pontos e estoque */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <TrophyIcon className="w-5 h-5 mr-2" />
                  Pontos e Estoque
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pointsRequired" required>Pontos Requeridos</Label>
                    <Input
                      id="pointsRequired"
                      type="number"
                      min="1"
                      max="100000"
                      {...form.register('pointsRequired', { valueAsNumber: true })}
                      error={!!form.formState.errors.pointsRequired}
                      helperText={form.formState.errors.pointsRequired?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock" required>Estoque Disponível</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      max="9999"
                      {...form.register('stock', { valueAsNumber: true })}
                      error={!!form.formState.errors.stock}
                      helperText={form.formState.errors.stock?.message}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Status</h3>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...form.register('isActive')}
                    className="rounded border-gray-300 text-eps-600 focus:ring-eps-500"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Prêmio ativo (disponível para resgate)
                  </Label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" loading={loading}>
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Criar Prêmio' : 'Salvar Alterações'}
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
              Preview do Prêmio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewImage ? (
              <div className="space-y-3">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg"
                  onError={() => setPreviewImage('')}
                />
                <div className="text-center">
                  <h4 className="font-medium">{form.watch('title') || 'Título do Prêmio'}</h4>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <TrophyIcon className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-yellow-600">
                      {formatNumber(watchPointsRequired)} pontos
                    </span>
                  </div>
                  {watchCategory && (
                    <Badge variant="secondary" className="mt-2">
                      {watchCategory}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <GiftIcon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Preview do prêmio</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações do estoque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <PackageIcon className="w-5 h-5 mr-2" />
              Status do Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estoque atual:</span>
                <span className="font-bold">
                  {watchStock} {watchStock === 1 ? 'unidade' : 'unidades'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge 
                  variant={
                    watchStock === 0 ? 'error' : 
                    watchStock <= 5 ? 'warning' : 'success'
                  }
                >
                  {watchStock === 0 ? 'Esgotado' : 
                   watchStock <= 5 ? 'Baixo estoque' : 'Disponível'}
                </Badge>
              </div>

              {watchStock <= 5 && watchStock > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Estoque baixo! Considere repor em breve.
                  </p>
                </div>
              )}

              {watchStock === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-800">
                    🚫 Prêmio esgotado! Não será exibido para resgate.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Valor em pontos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <StarIcon className="w-5 h-5 mr-2" />
              Valor do Prêmio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {formatNumber(watchPointsRequired)}
              </div>
              <p className="text-sm text-gray-600 mb-3">pontos necessários</p>
              
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Nível Bronze:</span>
                  <span>{watchPointsRequired <= 500 ? '✅ Acessível' : '❌ Inacessível'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nível Prata:</span>
                  <span>{watchPointsRequired <= 1500 ? '✅ Acessível' : '❌ Inacessível'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nível Ouro:</span>
                  <span>{watchPointsRequired <= 5000 ? '✅ Acessível' : '❌ Inacessível'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <p>Use imagens de alta qualidade para atrair mais interesse</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Ajuste a prioridade para destacar prêmios especiais</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Monitore o estoque regularmente</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Descrições detalhadas aumentam o interesse</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PremioForm
