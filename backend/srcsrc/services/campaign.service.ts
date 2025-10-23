
/**
 * Deleta uma campanha.
 * @param campaignId ID da campanha a ser deletada
 * @param- The ID of the user performing the action.
 */
export const deleteCampaign = async (campaignId: string, userId: string): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
      include: { _count: { select: { submissions: true } } },
    });

    if (!campaign) {
      throw new AppError('Campanha não encontrada.', 404);
    }

    if (campaign._count.submissions > 0) {
      throw new AppError('Não é possível excluir campanhas com submissões ativas.', 400);
    }

    await tx.campaign.delete({ where: { id: campaignId } });

  });
};
