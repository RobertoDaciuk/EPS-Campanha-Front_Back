/**
 * @file components/modals/PremioRedeemModal.tsx
 * @version 2.0.0
 * @description Modal para resgate de prêmios
 * @author DevEPS
 * @since 2025-10-21
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { GiftIcon, TrophyIcon, AlertTriangleIcon, CheckIcon } from 'lucide-react'
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
import { Premio } from '@/types'
import { formatNumber } from '@/lib/utils'

interface PremioRedeemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  premio: Premio | null
  userPoints: number
  onRedeem: (data: {
    premioId: string
    notes?: string
  }) => Promise<void>
  loading?: boolean
}

const PremioRedeemModal: React.FC<PremioRedeemModalProps> = ({
  open,
  onOpenChange,
  premio,
  userPoints,
  onRedeem,
  loading = false
}) => {
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const canRedeem = premio && userPoints >= premio.pointsRequired && premio.stock > 0 && premio.isActive
  const pointsAfterRedeem = userPoints - (premio?.pointsRequired || 0)

  const handleRedeem = async () => {
    if (!premio || !canRedeem) return

    await onRedeem({
      premioId: premio.id,
      notes: notes.trim() || undefined
    })

    // Reset form
    setNotes('')
    setConfirmed(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setNotes('')
    setConfirmed(false)
    onOpenChange(false)
  }

  if (!premio) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <GiftIcon className="w-5 h-5 mr-2" />
            Resgatar Prêmio
          </DialogTitle>
          <DialogDescription>
            Confirme o resgate do prêmio usando seus pontos acumulados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Premio Info */}
          <div className="text-center space-y-4">
            <img
              src={premio.imageUrl}
              alt={premio.title}
              className="w-32 h-32 object-cover rounded-lg mx-auto"
            />
            
            <div>
              <h3 className="text-lg font-semibold">{premio.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{premio.description}</p>
              <Badge variant="outline" className="mt-2">
                {premio.category}
              </Badge>
            </div>

            <div className="flex items-center justify-center space-x-2 text-2xl font-bold text-yellow-600">
              <TrophyIcon className="w-6 h-6" />
              <span>{formatNumber(premio.pointsRequired)} pontos</span>
            </div>
          </div>

          {/* Points Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Seus pontos atuais:</span>
              <span className="font-bold">{formatNumber(userPoints)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pontos necessários:</span>
              <span className="font-bold text-yellow-600">
                -{formatNumber(premio.pointsRequired)}
              </span>
            </div>
            
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pontos restantes:</span>
                <span className={`font-bold ${pointsAfterRedeem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(pointsAfterRedeem)}
                </span>
              </div>
            </div>
          </div>

          {/* Stock Warning */}
          {premio.stock <= 5 && premio.stock > 0 && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangleIcon className="w-4 h-4" />
              <span className="text-sm">
                Apenas {premio.stock} {premio.stock === 1 ? 'unidade restante' : 'unidades restantes'}!
              </span>
            </div>
          )}

          {/* Error States */}
          {!canRedeem && (
            <div className="space-y-2">
              {userPoints < premio.pointsRequired && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="text-sm">
                    Você precisa de {formatNumber(premio.pointsRequired - userPoints)} pontos adicionais.
                  </span>
                </div>
              )}
              
              {premio.stock === 0 && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="text-sm">Este prêmio está esgotado.</span>
                </div>
              )}
              
              {!premio.isActive && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="text-sm">Este prêmio não está mais disponível.</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {canRedeem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="notes">
                Observações (opcional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Endereço de entrega, preferências, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </motion.div>
          )}

          {/* Confirmation */}
          {canRedeem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="confirm"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="confirm" className="text-sm cursor-pointer">
                  <span className="font-medium text-blue-900">Confirmo o resgate</span>
                  <br />
                  <span className="text-blue-700">
                    Entendo que {formatNumber(premio.pointsRequired)} pontos serão descontados 
                    da minha conta e que o resgate não pode ser desfeito.
                  </span>
                </label>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          
          {canRedeem && (
            <Button
              onClick={handleRedeem}
              disabled={!confirmed || loading}
              loading={loading}
              variant="success"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              Confirmar Resgate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PremioRedeemModal
