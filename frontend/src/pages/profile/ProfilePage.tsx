/**
 * @file pages/profile/ProfilePage.tsx
 * @version 2.0.0
 * @description Página de perfil do usuário
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { 
  UserIcon, 
  EditIcon, 
  SaveIcon, 
  CameraIcon,
  TrophyIcon,
  CalendarIcon,
  MailIcon,
  PhoneIcon,
  BuildingIcon,
  CreditCardIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { UserRole } from '@/types'
import { formatPhone, formatCPF, formatCNPJ, formatDate, formatNumber, getErrorMessage } from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  whatsapp: z.string().min(10, 'WhatsApp inválido'),
  opticName: z.string().min(2, 'Nome da ótica é obrigatório'),
  avatarUrl: z.string().url('URL inválida').optional().or(z.literal('')),
})

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      whatsapp: user?.whatsapp || '',
      opticName: user?.opticName || '',
      avatarUrl: user?.avatarUrl || '',
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success('Perfil atualizado com sucesso!')
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao atualizar perfil')
    },
  })

  const onSubmit = (data: any) => {
    updateProfileMutation.mutate(data)
  }

  if (!user) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600">Gerencie suas informações pessoais</p>
        </div>
        
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <EditIcon className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback name={user.name} />
                      </Avatar>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 p-1 bg-eps-600 text-white rounded-full hover:bg-eps-700 transition-colors"
                      >
                        <CameraIcon className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="avatarUrl">URL do Avatar</Label>
                      <Input
                        id="avatarUrl"
                        placeholder="https://exemplo.com/avatar.jpg"
                        {...form.register('avatarUrl')}
                        error={!!form.formState.errors.avatarUrl}
                        helperText={form.formState.errors.avatarUrl?.message}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" required>Nome Completo</Label>
                      <Input
                        id="name"
                        {...form.register('name')}
                        error={!!form.formState.errors.name}
                        helperText={form.formState.errors.name?.message}
                      />
                    </div>
                    <div>
                      <Label htmlFor="whatsapp" required>WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        placeholder="(11) 99999-9999"
                        {...form.register('whatsapp')}
                        error={!!form.formState.errors.whatsapp}
                        helperText={form.formState.errors.whatsapp?.message}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value)
                          form.setValue('whatsapp', formatted)
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="opticName" required>Nome da Ótica</Label>
                    <Input
                      id="opticName"
                      {...form.register('opticName')}
                      error={!!form.formState.errors.opticName}
                      helperText={form.formState.errors.opticName?.message}
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      loading={updateProfileMutation.isPending}
                    >
                      <SaveIcon className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback name={user.name} />
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-semibold">{user.name}</h2>
                      <p className="text-gray-600">
                        {user.role === UserRole.ADMIN && 'Administrador'}
                        {user.role === UserRole.GERENTE && 'Gerente'}
                        {user.role === UserRole.VENDEDOR && 'Vendedor'}
                      </p>
                      <Badge variant={user.level.toLowerCase() as any} className="mt-1">
                        Nível {user.level}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <MailIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <PhoneIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">WhatsApp</p>
                          <p className="font-medium">{user.whatsapp}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <CreditCardIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">CPF</p>
                          <p className="font-medium font-mono">{formatCPF(user.cpf)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <BuildingIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Ótica</p>
                          <p className="font-medium">{user.opticName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <CreditCardIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">CNPJ</p>
                          <p className="font-medium font-mono">{formatCNPJ(user.opticCNPJ)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Membro desde</p>
                          <p className="font-medium">{formatDate(user.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs adicionais */}
          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList>
              <TabsTrigger value="activity">Atividades Recentes</TabsTrigger>
              <TabsTrigger value="achievements">Conquistas</TabsTrigger>
              <TabsTrigger value="preferences">Preferências</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Atividades Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Placeholder - integrar com API futuramente */}
                    {[1, 2, 3, 4, 5].map((item) => (
                      <div key={item} className="flex items-center space-x-3 py-2">
                        <div className="w-2 h-2 bg-eps-600 rounded-full" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Venda submetida: PED-{String(item).padStart(3, '0')}-2025
                          </p>
                          <p className="text-xs text-gray-500">Há 2 horas</p>
                        </div>
                        <Badge variant="success">+50 pts</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <CardTitle>Conquistas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: 'Primeira Venda', icon: '🎯', achieved: true },
                      { name: '10 Vendas', icon: '🔟', achieved: true },
                      { name: '100 Vendas', icon: '💯', achieved: false },
                      { name: 'Top 10', icon: '🏆', achieved: true },
                    ].map((achievement) => (
                      <div
                        key={achievement.name}
                        className={`p-4 rounded-lg border text-center ${
                          achievement.achieved 
                            ? 'bg-yellow-50 border-yellow-200' 
                            : 'bg-gray-50 border-gray-200 opacity-50'
                        }`}
                      >
                        <div className="text-2xl mb-2">{achievement.icon}</div>
                        <p className="text-sm font-medium">{achievement.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Preferências</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações por email</p>
                        <p className="text-sm text-gray-500">Receber atualizações por email</p>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações push</p>
                        <p className="text-sm text-gray-500">Receber notificações no navegador</p>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Level Progress */}
          {user.role !== UserRole.ADMIN && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrophyIcon className="w-5 h-5 mr-2" />
                  Progresso do Nível
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-eps rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl font-bold">
                        {user.points >= 10000 ? '💎' : 
                         user.points >= 5000 ? '🏆' : 
                         user.points >= 2500 ? '🥇' : 
                         user.points >= 1000 ? '🥈' : '🥉'}
                      </span>
                    </div>
                    <p className="font-semibold text-lg">Nível {user.level}</p>
                    <p className="text-sm text-gray-600">{formatNumber(user.points)} pontos</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progresso</span>
                      <span>{formatNumber(user.pointsToNextLevel - user.points)} restantes</span>
                    </div>
                    <Progress 
                      value={(user.points / user.pointsToNextLevel) * 100}
                      variant="success"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Campanhas participadas</span>
                  <span className="font-bold">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Vendas validadas</span>
                  <span className="font-bold">45</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Taxa de validação</span>
                  <span className="font-bold">89%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Prêmios resgatados</span>
                  <span className="font-bold">3</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

export default ProfilePage
