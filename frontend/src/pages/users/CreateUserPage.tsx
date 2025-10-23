/**
 * @file pages/users/CreateUserPage.tsx
 * @version 2.0.0
 * @description Página para criar usuário
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UserForm from '@/components/forms/UserForm'
import { userService } from '@/services/userService'
import { useToast } from '@/hooks/useToast'
import { UserForm as UserFormType, UserRole } from '@/types'
import { getErrorMessage } from '@/lib/utils'

const CreateUserPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Get available managers for vendedor assignment
  const { data: managers } = useQuery({
    queryKey: ['managers'],
    queryFn: () => userService.getUsers({ role: UserRole.GERENTE, limit: 100 }),
  })

  const createUserMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: (data) => {
      toast.success('Usuário criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate(`/app/users/${data.user.id}`)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar usuário')
    },
  })

  const handleSubmit = async (data: UserFormType) => {
    await createUserMutation.mutateAsync(data)
  }

  const availableManagers = managers?.data?.map(manager => ({
    id: manager.id,
    name: manager.name
  })) || []

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
          <h1 className="text-2xl font-bold text-gray-900">Novo Usuário</h1>
          <p className="text-gray-600">Adicione um novo usuário ao sistema</p>
        </div>
      </div>

      {/* Form */}
      <UserForm
        mode="create"
        availableManagers={availableManagers}
        onSubmit={handleSubmit}
        loading={createUserMutation.isPending}
      />
    </motion.div>
  )
}

export default CreateUserPage
