/**
 * @file components/modals/ValidationModal.tsx
 * @version 2.0.0
 * @description Modal para validação de submissões
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, XIcon, FileTextIcon, AlertTriangleIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CampaignSubmission, CampaignSubmissionStatus } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'

interface ValidationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: CampaignSubmission | null
  onValidate: (data: {
    status: CampaignSubmissionStatus.VALIDATED | CampaignSubmissionStatus.REJECTED
    message?: string
    internalNotes?: string
  }) => Promise<void>
  loading?: boolean
}

const ValidationModal: React.FC<ValidationModalProps> = ({
  open,
  onOpenChange,
  submission,
  onValidate,
  loading = false
}) => {
  const [selectedAction, setSelectedAction] = useState<'validate' | 'reject' | null>(null)
  const [validationMessage, setValidationMessage] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const handleValidate = async () => {
    if (!selectedAction || !submission) return

    const status = selectedAction === 'validate' 
      ? CampaignSubmissionStatus.VALIDATED 
      : CampaignSubmissionStatus.REJECTED

    await onValidate({
      status,
      message: validationMessage,
      internalNotes
    })

    // Reset form
    setSelectedAction(null)
    setValidationMessage('')
    setInternalNotes('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedAction(null)
    setValidationMessage('')
    setInternalNotes('')
    onOpenChange(false)
  }

  if (!submission) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileTextIcon className="w-5 h-5 mr-2" />
            Validar Submissão
          </DialogTitle>
          <DialogDescription>
            Analise os detalhes da submissão e tome uma decisão sobre sua validação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Submission Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Detalhes da Submissão</h3>
              <Badge variant={submission.status === 'PENDING' ? 'warning' : 'default'}>
                {submission.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Vendedor</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={submission.user?.avatarUrl} />
                    <AvatarFallback name={submission.user?.name} />
                  </Avatar>
                  <span className="font-medium">{submission.user?.name}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Data da Submissão</p>
                <p className="font-medium">{formatDate(submission.submissionDate)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Campanha</p>
                <p className="font-medium">{submission.campaign?.title}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Nº do Pedido</p>
                <p className="font-medium font-mono">{submission.orderNumber}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Quantidade</p>
                <p className="font-medium">{submission.quantity}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Requisito</p>
                <p className="font-medium">{submission.requirement?.description}</p>
              </div>
            </div>

            {submission.notes && (
              <div>
                <p className="text-sm text-gray-600">Observações do Vendedor</p>
                <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{submission.notes}</p>
              </div>
            )}

            {/* Expected Points/Earnings */}
            {submission.campaign && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 mb-2">Pontos/Ganhos Esperados</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Pontos do Vendedor:</span>
                    <span className="font-bold ml-2">{submission.campaign.pointsOnCompletion}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Pontos do Gerente:</span>
                    <span className="font-bold ml-2">
                      {Math.round((submission.campaign.pointsOnCompletion * (submission.campaign.managerPointsPercentage || 0)) / 100)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Decisão de Validação</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedAction('validate')}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  selectedAction === 'validate'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-center">
                  <CheckIcon className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="font-medium text-green-900">Validar</p>
                  <p className="text-sm text-green-700">Aprovar a submissão</p>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedAction('reject')}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  selectedAction === 'reject'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="text-center">
                  <XIcon className="w-8 h-8 mx-auto text-red-600 mb-2" />
                  <p className="font-medium text-red-900">Rejeitar</p>
                  <p className="text-sm text-red-700">Reprovar a submissão</p>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Messages */}
          {selectedAction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Tabs defaultValue="message" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="message">Mensagem para Vendedor</TabsTrigger>
                  <TabsTrigger value="internal">Notas Internas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="message" className="space-y-2">
                  <Label htmlFor="validationMessage">
                    Mensagem que será enviada ao vendedor
                    {selectedAction === 'reject' && (
                      <span className="text-red-600 ml-1">(obrigatória para rejeição)</span>
                    )}
                  </Label>
                  <Textarea
                    id="validationMessage"
                    placeholder={
                      selectedAction === 'validate'
                        ? 'Parabéns! Sua venda foi validada com sucesso...'
                        : 'Sua submissão foi rejeitada pelos seguintes motivos...'
                    }
                    value={validationMessage}
                    onChange={(e) => setValidationMessage(e.target.value)}
                    rows={3}
                  />
                </TabsContent>

                <TabsContent value="internal" className="space-y-2">
                  <Label htmlFor="internalNotes">
                    Notas internas (não visível para o vendedor)
                  </Label>
                  <Textarea
                    id="internalNotes"
                    placeholder="Observações internas sobre a validação..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={3}
                  />
                </TabsContent>
              </Tabs>

              {selectedAction === 'reject' && !validationMessage.trim() && (
                <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="text-sm">
                    Uma mensagem explicativa é obrigatória ao rejeitar uma submissão.
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          
          <Button
            onClick={handleValidate}
            disabled={
              !selectedAction || 
              (selectedAction === 'reject' && !validationMessage.trim()) ||
              loading
            }
            loading={loading}
            variant={selectedAction === 'validate' ? 'success' : 'destructive'}
          >
            {selectedAction === 'validate' ? (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Validar Submissão
              </>
            ) : (
              <>
                <XIcon className="w-4 h-4 mr-2" />
                Rejeitar Submissão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ValidationModal
