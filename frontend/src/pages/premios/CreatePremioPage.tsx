/**
 * @file pages/premios/CreatePremioPage.tsx
 * @version 2.0.0
 * @description Página para criar prêmio
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PremioForm from '@/components/forms/PremioForm'
import { premioService } from '@/services/premioService'
import { useToast } from '@/hooks/useToast'
import { PremioForm as PremioFormType } from '@/types'
import { getErrorMessage } from '@/lib/utils'

const CreatePremioPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createPremioMutation = useMutation({
    mutationFn: premioService.createPremio,
    onSuccess: (data) => {
      toast.success('Prêmio criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['premios'] })
      navigate(`/app/premios/${data.premio.id}`)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), 'Erro ao criar prêmio')
    },
  })

  const handleSubmit = async (data: PremioFormType) => {
    await createPremioMutation.mutateAsync(data)
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
          <h1 className="text-2xl font-bold text-gray-900">Novo Prêmio</h1>
          <p className="text-gray-600">Adicione um novo prêmio ao catálogo</p>
        </div>
      </div>

      {/* Form */}
      <PremioForm
        mode="create"
        onSubmit={handleSubmit}
        loading={createPremioMutation.isPending}
      />
    </motion.div>
  )
}

export default CreatePremioPage
