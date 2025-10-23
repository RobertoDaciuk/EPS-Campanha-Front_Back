/**
 * @file components/modals/ConfirmDialog.tsx
 * @version 2.0.0
 * @description Modal de confirmação
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { AlertTriangleIcon, CheckIcon, XIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'success'
  loading?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <AlertTriangleIcon className="w-6 h-6 text-red-600" />
      case 'success':
        return <CheckIcon className="w-6 h-6 text-green-600" />
      default:
        return <AlertTriangleIcon className="w-6 h-6 text-yellow-600" />
    }
  }

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive' as const
      case 'success':
        return 'success' as const
      default:
        return 'default' as const
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {getIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-start">
          <div className="flex w-full space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              <XIcon className="w-4 h-4 mr-2" />
              {cancelLabel}
            </Button>
            
            <Button
              variant={getConfirmButtonVariant()}
              onClick={onConfirm}
              loading={loading}
              className="flex-1"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              {confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
