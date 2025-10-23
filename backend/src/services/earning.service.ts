/**
 * @file earning.service.ts
 * @version 1.0.0
 * @description Camada de serviço para a lógica de negócio relacionada a ganhos (Earnings).
 * @author Jules
 */

import { prisma } from '../../lib/prismaClient';
import { Earning, EarningStatus } from '@prisma/client';

/**
 * @function getAllEarnings
 * @description Busca todos os ganhos registrados, com filtros opcionais.
 * @param {object} filters - Opções de filtro.
 * @param {EarningStatus} [filters.status] - Filtra por status do ganho.
 * @returns {Promise<Earning[]>} Uma lista de ganhos.
 */
export async function getAllEarnings(filters: { status?: EarningStatus }): Promise<Earning[]> {
  return prisma.earning.findMany({
    where: {
      status: filters.status,
    },
    orderBy: {
      earningDate: 'desc',
    },
  });
}

/**
 * @function updateEarningStatus
 * @description Atualiza o status de um ganho específico.
 * @param {string} earningId - O ID do ganho a ser atualizado.
 * @param {EarningStatus} status - O novo status do ganho.
 * @returns {Promise<Earning>} O ganho atualizado.
 */
export async function updateEarningStatus(earningId: string, status: EarningStatus): Promise<Earning> {
  return prisma.earning.update({
    where: { id: earningId },
    data: { status },
  });
}
