/**
 * @file components/forms/UserForm.tsx
 * @version 2.0.0
 * @description Formulário para criar/editar usuários
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  SaveIcon, 
  UserIcon, 
  EyeIcon, 
  EyeOffIcon,
  InfoIcon,
  BuildingIcon,
  PhoneIcon,
  MailIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { UserForm as UserFormType, UserRole, UserStatus } from '@/types'
import { formatCPF, formatCNPJ, formatPhone, isValidCPF, isValidCNPJ } from '@/lib/utils'

const userSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  cpf: z.string().refine(isValidCPF, 'CPF inválido'),
  whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos'),
  opticName: z.string().min(2, 'Nome da ótica é obrigatório'),
  opticCNPJ: z.string().refine(isValidCNPJ, 'CNPJ inválido'),
  role: z.enum(['ADMIN', 'GERENTE', 'VENDEDOR']),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
  avatarUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  managerId: z.string().optional(),
})

interface UserFormProps {
  initialData?: Partial<UserFormType>
  onSubmit: (data: UserFormType) => Promise<void>
  loading?: boolean
  mode?: 'create' | 'edit'
  availableManagers?: Array<{ id: string; name: string }>
}

const UserForm: React.FC<UserFormProps> = ({
  initialData,
  onSubmit,
  loading = false,
  mode = 'create',
  availableManagers = []
}) => {
  const [showPassword, setShowPassword] = React.useState(false)

  const form = useForm<UserFormType>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      cpf: initialData?.cpf || '',
      whatsapp: initialData?.whatsapp || '',
      opticName: initialData?.opticName || '',
      opticCNPJ: initialData?.opticCNPJ || '',
      role: initialData?.role || UserRole.VENDEDOR,
      status: initialData?.status || UserStatus.ACTIVE,
      avatarUrl: initialData?.avatarUrl || '',
      managerId: initialData?.managerId || '',
    },
  })

  const watchCPF = form.watch('cpf')
  const watchCNPJ = form.watch('opticCNPJ')
  const watchWhatsApp = form.watch('whatsapp')
  const watchRole = form.watch('role')

  // Auto-format fields
  useEffect(() => {
    if (watchCPF) {
      form.setValue('cpf', formatCPF(watchCPF), { shouldValidate: true })
    }
  }, [watchCPF, form])

  useEffect(() => {
    if (watchCNPJ) {
      form.setValue('opticCNPJ', formatCNPJ(watchCNPJ), { shouldValidate: true })
    }
  }, [watchCNPJ, form])

  useEffect(() => {
    if (watchWhatsApp) {
      form.setValue('whatsapp', formatPhone(watchWhatsApp), { shouldValidate: true })
    }
  }, [watchWhatsApp, form])

  const handleSubmit = async (data: UserFormType) => {
    // Remove password se estiver vazio no modo edit
    if (mode === 'edit' && !data.password) {
      delete data.password
    }
    await onSubmit(data)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário - 2/3 */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="w-5 h-5 mr-2" />
              {mode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Dados pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <UserIcon className="w-5 h-5 mr-2" />
                  Dados Pessoais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" required>Nome Completo</Label>
                    <Input
                      id="name"
                      placeholder="Nome completo do usuário"
                      {...form.register('name')}
                      error={!!form.formState.errors.name}
                      helperText={form.formState.errors.name?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" required>Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      {...form.register('email')}
                      error={!!form.formState.errors.email}
                      helperText={form.formState.errors.email?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf" required>CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      {...form.register('cpf')}
                      error={!!form.formState.errors.cpf}
                      helperText={form.formState.errors.cpf?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" required>WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      {...form.register('whatsapp')}
                      error={!!form.formState.errors.whatsapp}
                      helperText={form.formState.errors.whatsapp?.message}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" required={mode === 'create'}>
                    {mode === 'create' ? 'Senha' : 'Nova Senha (deixe vazio para manter atual)'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite a senha"
                      {...form.register('password')}
                      error={!!form.formState.errors.password}
                      helperText={form.formState.errors.password?.message}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOffIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dados da ótica */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <BuildingIcon className="w-5 h-5 mr-2" />
                  Dados da Ótica
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="opticName" required>Nome da Ótica</Label>
                    <Input
                      id="opticName"
                      placeholder="Nome da ótica"
                      {...form.register('opticName')}
                      error={!!form.formState.errors.opticName}
                      helperText={form.formState.errors.opticName?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opticCNPJ" required>CNPJ da Ótica</Label>
                    <Input
                      id="opticCNPJ"
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      {...form.register('opticCNPJ')}
                      error={!!form.formState.errors.opticCNPJ}
                      helperText={form.formState.errors.opticCNPJ?.message}
                    />
                  </div>
                </div>
              </div>

              {/* Configurações do sistema */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações do Sistema</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role" required>Perfil</Label>
                    <Select
                      value={form.watch('role')}
                      onValueChange={(value) => form.setValue('role', value as UserRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">👑 Administrador</SelectItem>
                        <SelectItem value="GERENTE">👔 Gerente</SelectItem>
                        <SelectItem value="VENDEDOR">👤 Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" required>Status</Label>
                    <Select
                      value={form.watch('status')}
                      onValueChange={(value) => form.setValue('status', value as UserStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">🟢 Ativo</SelectItem>
                        <SelectItem value="BLOCKED">🔒 Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gerente responsável (apenas para vendedores) */}
                  {watchRole === UserRole.VENDEDOR && availableManagers.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="managerId">Gerente Responsável</Label>
                      <Select
                        value={form.watch('managerId')}
                        onValueChange={(value) => form.setValue('managerId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar gerente" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableManagers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
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
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" loading={loading}>
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - 1/3 */}
      <div className="space-y-6">
        {/* Preview do avatar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview do Avatar</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src={form.watch('avatarUrl')} />
              <AvatarFallback name={form.watch('name')} />
            </Avatar>
            <p className="text-sm text-gray-600">
              {form.watch('name') || 'Nome do usuário'}
            </p>
          </CardContent>
        </Card>

        {/* Informações importantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <InfoIcon className="w-5 h-5 mr-2" />
              Informações Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>CPF e CNPJ serão validados automaticamente</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>WhatsApp é usado para notificações importantes</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Vendedores podem ter um gerente responsável</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-eps-600 rounded-full mt-2 flex-shrink-0" />
                <p>Avatar é opcional mas recomendado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo das permissões */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Permissões do Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {watchRole === UserRole.ADMIN && (
                <>
                  <div className="flex items-center text-green-600">
                    ✓ Acesso total ao sistema
                  </div>
                  <div className="flex items-center text-green-600">
                    ✓ Gerenciar campanhas e prêmios
                  </div>
                  <div className="flex items-center text-green-600">
                    ✓ Gerenciar usuários
                  </div>
                  <div className="flex items-center text-green-600">
                    ✓ Relatórios financeiros
                  </div>
                </>
              )}

              {watchRole === UserRole.GERENTE && (
                <>
                  <div className="flex items-center text-blue-600">
                    ✓ Gerenciar equipe de vendedores
                  </div>
                  <div className="flex items-center text-blue-600">
                    ✓ Validar submissões
                  </div>
                  <div className="flex items-center text-blue-600">
                    ✓ Ver relatórios da equipe
                  </div>
                  <div className="flex items-center text-gray-500">
                    ✗ Criar campanhas ou prêmios
                  </div>
                </>
              )}

              {watchRole === UserRole.VENDEDOR && (
                <>
                  <div className="flex items-center text-purple-600">
                    ✓ Participar de campanhas
                  </div>
                  <div className="flex items-center text-purple-600">
                    ✓ Submeter vendas
                  </div>
                  <div className="flex items-center text-purple-600">
                    ✓ Resgatar prêmios
                  </div>
                  <div className="flex items-center text-gray-500">
                    ✗ Acesso administrativo
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default UserForm
