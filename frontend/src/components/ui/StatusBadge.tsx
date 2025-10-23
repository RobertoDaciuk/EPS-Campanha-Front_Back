/**
 * @file components/ui/StatusBadge.tsx
 * @version 2.0.0
 * @description Componente para badges de status específicos
 * @author DevEPS
 * @since 2025-10-21
 */

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CampaignStatus, CampaignSubmissionStatus, EarningStatus, UserStatus } from '@/types'

interface StatusBadgeProps {
  status: CampaignStatus | CampaignSubmissionStatus | EarningStatus | UserStatus | string
  type?: 'campaign' | 'submission' | 'earning' | 'user'
  className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, className }) => {
  const getStatusConfig = () => {
    switch (type) {
      case 'campaign':
        switch (status as CampaignStatus) {
          case CampaignStatus.ATIVA:
            return { variant: 'success' as const, label: 'Ativa', icon: '🟢' }
          case CampaignStatus.CONCLUIDA:
            return { variant: 'default' as const, label: 'Concluída', icon: '✅' }
          case CampaignStatus.EXPIRADA:
            return { variant: 'secondary' as const, label: 'Expirada', icon: '⏰' }
          default:
            return { variant: 'outline' as const, label: status, icon: '❓' }
        }

      case 'submission':
        switch (status as CampaignSubmissionStatus) {
          case CampaignSubmissionStatus.PENDING:
            return { variant: 'warning' as const, label: 'Pendente', icon: '⏳' }
          case CampaignSubmissionStatus.VALIDATED:
            return { variant: 'success' as const, label: 'Validada', icon: '✅' }
          case CampaignSubmissionStatus.REJECTED:
            return { variant: 'error' as const, label: 'Rejeitada', icon: '❌' }
          default:
            return { variant: 'outline' as const, label: status, icon: '❓' }
        }

      case 'earning':
        switch (status as EarningStatus) {
          case EarningStatus.PENDENTE:
            return { variant: 'warning' as const, label: 'Pendente', icon: '⏳' }
          case EarningStatus.PAGO:
            return { variant: 'success' as const, label: 'Pago', icon: '💰' }
          default:
            return { variant: 'outline' as const, label: status, icon: '❓' }
        }

      case 'user':
        switch (status as UserStatus) {
          case UserStatus.ACTIVE:
            return { variant: 'success' as const, label: 'Ativo', icon: '🟢' }
          case UserStatus.BLOCKED:
            return { variant: 'error' as const, label: 'Bloqueado', icon: '🔒' }
          default:
            return { variant: 'outline' as const, label: status, icon: '❓' }
        }

      default:
        return { variant: 'outline' as const, label: status, icon: '' }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge variant={config.variant} className={className}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  )
}

export default StatusBadge
