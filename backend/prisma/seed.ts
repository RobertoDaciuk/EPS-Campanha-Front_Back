/**
 * @file seed.ts
 * @version 2.0.0
 * @description Script de seeding para popular o banco de dados com dados iniciais.
 * Cria usuários, campanhas, prêmios e dados de exemplo para desenvolvimento.
 * @author DevEPS
 * @since 2025-10-21
 * 
 * @changelog
 * - Implementação completa do sistema de seeding
 * - Criação de usuários de todos os perfis
 * - Campanhas com metas e regras complexas
 * - Catálogo de prêmios diversificado
 * - Dados de exemplo realistas
 */

import { PrismaClient, UserRole, UserStatus, CampaignStatus, GoalUnitType, RuleOperator, TargetField, EarningType, EarningStatus, ActivityType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando o processo de seeding...');

  // Limpa as tabelas na ordem correta para evitar erros de chave estrangeira
  console.log('🧹 Limpando dados antigos...');
  
  await prisma.activityItem.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.earning.deleteMany({});
  await prisma.premio.deleteMany({});
  await prisma.validationJob.deleteMany({});
  await prisma.campaignSubmission.deleteMany({});
  await prisma.campaignKit.deleteMany({});
  await prisma.ruleCondition.deleteMany({});
  await prisma.goalRequirement.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Dados antigos limpos com sucesso.');

  // --- CRIAÇÃO DE USUÁRIOS ---
  console.log('👥 Criando usuários...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin principal
  const admin = await prisma.user.create({
    data: {
      email: 'admin@eps.com',
      name: 'Carlos Administrador',
      passwordHash,
      cpf: '333.333.333-33',
      whatsapp: '(11) 93333-3333',
      avatarUrl: 'https://i.pravatar.cc/150?u=admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      opticName: 'EPS Matriz',
      opticCNPJ: '00.000.000/0001-00',
      level: 'Admin',
      points: 0,
      pointsToNextLevel: 0,
    },
  });
  console.log(`✓ Admin "${admin.name}" criado com sucesso.`);

  // Gerente 1
  const gerente1 = await prisma.user.create({
    data: {
      email: 'maria.gerente@eps.com',
      name: 'Maria Santos',
      passwordHash,
      cpf: '222.222.222-22',
      whatsapp: '(11) 92222-2222',
      avatarUrl: 'https://i.pravatar.cc/150?u=gerente1',
      role: UserRole.GERENTE,
      status: UserStatus.ACTIVE,
      opticName: 'Ótica Visão Clara',
      opticCNPJ: '11.111.111/0001-11',
      level: 'Platina',
      points: 7200,
      pointsToNextLevel: 10000,
    },
  });
  console.log(`✓ Gerente "${gerente1.name}" criado com sucesso.`);

  // Gerente 2
  const gerente2 = await prisma.user.create({
    data: {
      email: 'pedro.gerente@eps.com',
      name: 'Pedro Oliveira',
      passwordHash,
      cpf: '444.444.444-44',
      whatsapp: '(11) 94444-4444',
      avatarUrl: 'https://i.pravatar.cc/150?u=gerente2',
      role: UserRole.GERENTE,
      status: UserStatus.ACTIVE,
      opticName: 'Ótica Premium',
      opticCNPJ: '22.222.222/0002-22',
      level: 'Ouro',
      points: 5800,
      pointsToNextLevel: 7500,
    },
  });
  console.log(`✓ Gerente "${gerente2.name}" criado com sucesso.`);

  // Vendedores da equipe de Maria
  const vendedor1 = await prisma.user.create({
    data: {
      email: 'joao.vendedor@eps.com',
      name: 'João Silva',
      passwordHash,
      cpf: '111.111.111-11',
      whatsapp: '(11) 91111-1111',
      avatarUrl: 'https://i.pravatar.cc/150?u=vendedor1',
      role: UserRole.VENDEDOR,
      status: UserStatus.ACTIVE,
      opticName: 'Ótica Visão Clara',
      opticCNPJ: '11.111.111/0001-11',
      managerId: gerente1.id,
      level: 'Ouro',
      points: 4850,
      pointsToNextLevel: 5000,
    },
  });
  console.log(`✓ Vendedor "${vendedor1.name}" criado com sucesso.`);

  const vendedor2 = await prisma.user.create({
    data: {
      email: 'ana.vendedora@eps.com',
      name: 'Ana Costa',
      passwordHash,
      cpf: '555.555.555-55',
      whatsapp: '(11) 95555-5555',
      avatarUrl: 'https://i.pravatar.cc/150?u=vendedor2',
      role: UserRole.VENDEDOR,
      status: UserStatus.ACTIVE,
      opticName: 'Ótica Visão Clara',
      opticCNPJ: '11.111.111/0001-11',
      managerId: gerente1.id,
      level: 'Prata',
      points: 2300,
      pointsToNextLevel: 2500,
    },
  });
  console.log(`✓ Vendedora "${vendedor2.name}" criada com sucesso.`);

  // Vendedores da equipe de Pedro
  const vendedor3 = await prisma.user.create({
    data: {
      email: 'lucas.vendedor@eps.com',
      name: 'Lucas Ferreira',
      passwordHash,
      cpf: '666.666.666-66',
      whatsapp: '(11) 96666-6666',
      avatarUrl: 'https://i.pravatar.cc/150?u=vendedor3',
      role: UserRole.VENDEDOR,
      status: UserStatus.ACTIVE,
      opticName: 'Ótica Premium',
      opticCNPJ: '22.222.222/0002-22',
      managerId: gerente2.id,
      level: 'Bronze',
      points: 850,
      pointsToNextLevel: 1000,
    },
  });
  console.log(`✓ Vendedor "${vendedor3.name}" criado com sucesso.`);

  const vendedor4 = await prisma.user.create({
    data: {
      email: 'carla.vendedora@eps.com',
      name: 'Carla Mendes',
      passwordHash,
      cpf: '777.777.777-77',
      whatsapp: '(11) 97777-7777',
      avatarUrl: 'https://i.pravatar.cc/150?u=vendedor4',
      role: UserRole.VENDEDOR,
      status: UserStatus.ACTIVE,
      opticName: 'Ótica Premium',
      opticCNPJ: '22.222.222/0002-22',
      managerId: gerente2.id,
      level: 'Diamante',
      points: 9200,
      pointsToNextLevel: 15000,
    },
  });
  console.log(`✓ Vendedora "${vendedor4.name}" criada com sucesso.`);


// Campanha ativa 1 - Kit Lentes Super-foco
  const campanhaAtiva = await prisma.campaign.create({
    data: {
      title: 'Kit Lentes Super-foco',
      description: 'Venda 2 pares de Lentes Super-foco e 1 Lente Normal para completar o kit e ganhar 500 pontos!',
      imageUrl: 'https://picsum.photos/seed/camp1/400/200',
      pointsOnCompletion: 500,
      managerPointsPercentage: 10,
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Termina em 30 dias
      status: CampaignStatus.ATIVA,
      goalRequirements: {
        create: [
          {
            description: 'Lente Super-Foco',
            quantity: 2,
            unitType: GoalUnitType.PAIR,
            conditions: {
              create: {
                field: TargetField.PRODUCT_NAME,
                operator: RuleOperator.CONTAINS,
                value: 'Super-foco',
              },
            },
          },
          {
            description: 'Lente Normal',
            quantity: 1,
            unitType: GoalUnitType.UNIT,
            conditions: {
              create: {
                field: TargetField.PRODUCT_NAME,
                operator: RuleOperator.CONTAINS,
                value: 'Normal',
              },
            },
          },
        ],
      },
    },
    include: { goalRequirements: true }, // AJUSTE PRINCIPAL
  });
  console.log(`✓ Campanha ativa "${campanhaAtiva.title}" criada com sucesso.`);

  // Campanha ativa 2 - Especial Armações
  const campanhaArmacoes = await prisma.campaign.create({
    data: {
      title: 'Especial Armações Premium',
      description: 'Venda 5 armações premium e ganhe pontos incríveis! Cada venda conta para sua meta.',
      imageUrl: 'https://picsum.photos/seed/camp2/400/200',
      pointsOnCompletion: 750,
      managerPointsPercentage: 15,
      startDate: new Date(new Date().setDate(new Date().getDate() - 5)), // Começou há 5 dias
      endDate: new Date(new Date().setDate(new Date().getDate() + 25)), // Termina em 25 dias
      status: CampaignStatus.ATIVA,
      goalRequirements: {
        create: [
          {
            description: 'Armações Premium',
            quantity: 5,
            unitType: GoalUnitType.UNIT,
            conditions: {
              create: {
                field: TargetField.PRODUCT_NAME,
                operator: RuleOperator.CONTAINS,
                value: 'Premium',
              },
            },
          },
        ],
      },
    },
    include: { goalRequirements: true }, // AJUSTE PRINCIPAL
  });
  console.log(`✓ Campanha ativa "${campanhaArmacoes.title}" criada com sucesso.`);

  // Campanha concluída
  const campanhaConcluida = await prisma.campaign.create({
    data: {
      title: 'Especial Mês das Crianças',
      description: 'Campanha especial para armações infantis. Meta: 10 armações infantis.',
      imageUrl: 'https://picsum.photos/seed/camp3/400/200',
      pointsOnCompletion: 1000,
      managerPointsPercentage: 20,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 2)),
      endDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      status: CampaignStatus.CONCLUIDA,
      goalRequirements: {
        create: [
          {
            description: 'Armações Infantis',
            quantity: 10,
            unitType: GoalUnitType.UNIT,
            conditions: {
              create: {
                field: TargetField.PRODUCT_NAME,
                operator: RuleOperator.CONTAINS,
                value: 'Infantil',
              },
            },
          },
        ],
      },
    },
    include: { goalRequirements: true }, // AJUSTE PRINCIPAL
  });
  console.log(`✓ Campanha concluída "${campanhaConcluida.title}" criada com sucesso.`);

  // Campanha expirada
  const campanhaExpirada = await prisma.campaign.create({
    data: {
      title: 'Verão em Alta Definição',
      description: 'Campanha de lentes solares com proteção UV máxima.',
      imageUrl: 'https://picsum.photos/seed/camp4/400/200',
      pointsOnCompletion: 300,
      managerPointsPercentage: 8,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 4)),
      endDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
      status: CampaignStatus.EXPIRADA,
      goalRequirements: {
        create: [
          {
            description: 'Lentes Solares',
            quantity: 3,
            unitType: GoalUnitType.PAIR,
            conditions: {
              create: {
                field: TargetField.PRODUCT_NAME,
                operator: RuleOperator.CONTAINS,
                value: 'Solar',
              },
            },
          },
        ],
      },
    },
    include: { goalRequirements: true }, // AJUSTE PRINCIPAL
  });
  console.log(`✓ Campanha expirada "${campanhaExpirada.title}" criada com sucesso.`);


  // --- CRIAÇÃO DE PRÊMIOS ---
  console.log('🎁 Criando catálogo de prêmios...');

  const premios = [
    {
      title: 'Smartwatch Galaxy',
      description: 'Smartwatch Samsung Galaxy com GPS, monitor cardíaco e resistente à água.',
      imageUrl: 'https://picsum.photos/seed/premio1/300/300',
      pointsRequired: 5000,
      stock: 15,
      category: 'Eletrônicos',
      priority: 10,
    },
    {
      title: 'Fone AirPods Pro',
      description: 'Fones de ouvido sem fio com cancelamento ativo de ruído.',
      imageUrl: 'https://picsum.photos/seed/premio2/300/300',
      pointsRequired: 3500,
      stock: 25,
      category: 'Eletrônicos',
      priority: 9,
    },
    {
      title: 'Vale-compras R$ 500',
      description: 'Vale-compras de R$ 500 para usar em diversas lojas parceiras.',
      imageUrl: 'https://picsum.photos/seed/premio3/300/300',
      pointsRequired: 2500,
      stock: 50,
      category: 'Vale-compras',
      priority: 8,
    },
    {
      title: 'Tablet Samsung 10"',
      description: 'Tablet Samsung de 10 polegadas com 64GB de armazenamento.',
      imageUrl: 'https://picsum.photos/seed/premio4/300/300',
      pointsRequired: 4500,
      stock: 8,
      category: 'Eletrônicos',
      priority: 7,
    },
    {
      title: 'Kit Churrasco Premium',
      description: 'Kit completo para churrasco com espetos, tábua e temperos especiais.',
      imageUrl: 'https://picsum.photos/seed/premio5/300/300',
      pointsRequired: 1500,
      stock: 30,
      category: 'Casa & Jardim',
      priority: 6,
    },
    {
      title: 'Cafeteira Nespresso',
      description: 'Cafeteira automática Nespresso com sistema de cápsulas.',
      imageUrl: 'https://picsum.photos/seed/premio6/300/300',
      pointsRequired: 2000,
      stock: 20,
      category: 'Eletrodomésticos',
      priority: 5,
    },
    {
      title: 'Mochila Executiva',
      description: 'Mochila para notebook com compartimentos organizadores e design moderno.',
      imageUrl: 'https://picsum.photos/seed/premio7/300/300',
      pointsRequired: 800,
      stock: 40,
      category: 'Acessórios',
      priority: 4,
    },
    {
      title: 'Jogo de Panelas Antiaderente',
      description: 'Conjunto com 5 panelas antiaderente de alta qualidade.',
      imageUrl: 'https://picsum.photos/seed/premio8/300/300',
      pointsRequired: 1200,
      stock: 25,
      category: 'Casa & Cozinha',
      priority: 3,
    },
    {
      title: 'Perfume Importado 100ml',
      description: 'Fragrância masculina ou feminina importada de 100ml.',
      imageUrl: 'https://picsum.photos/seed/premio9/300/300',
      pointsRequired: 900,
      stock: 35,
      category: 'Perfumaria',
      priority: 2,
    },
    {
      title: 'Caixa de Som Bluetooth',
      description: 'Caixa de som portátil com Bluetooth 5.0 e bateria de longa duração.',
      imageUrl: 'https://picsum.photos/seed/premio10/300/300',
      pointsRequired: 600,
      stock: 45,
      category: 'Eletrônicos',
      priority: 1,
    },
  ];

  for (const premioData of premios) {
    const premio = await prisma.premio.create({
      data: premioData,
    });
    console.log(`✓ Prêmio "${premio.title}" criado com sucesso.`);
  }

  // --- CRIAÇÃO DE KITS E SUBMISSÕES DE EXEMPLO ---
  console.log('📦 Criando kits e submissões de exemplo...');

  // Cria kit para João (vendedor1) na campanha ativa
  const kitJoao = await prisma.campaignKit.create({
    data: {
      campaignId: campanhaAtiva.id,
      userId: vendedor1.id,
      status: 'IN_PROGRESS',
    },
  });

  // Cria algumas submissões para João
  await prisma.campaignSubmission.create({
    data: {
      orderNumber: 'PED-001-2025',
      quantity: 1,
      status: 'VALIDATED',
      submissionDate: new Date(new Date().setDate(new Date().getDate() - 2)),
      campaignId: campanhaAtiva.id,
      userId: vendedor1.id,
      requirementId: campanhaAtiva.goalRequirements[0].id,
      kitId: kitJoao.id,
      notes: 'Cliente muito satisfeito com a qualidade das lentes.',
    },
  });

  await prisma.campaignSubmission.create({
    data: {
      orderNumber: 'PED-002-2025',
      quantity: 1,
      status: 'PENDING',
      submissionDate: new Date(new Date().setDate(new Date().getDate() - 1)),
      campaignId: campanhaAtiva.id,
      userId: vendedor1.id,
      requirementId: campanhaAtiva.goalRequirements[0].id,
      kitId: kitJoao.id,
    },
  });

  console.log(`✓ Kit e submissões criadas para ${vendedor1.name}.`);

  // --- CRIAÇÃO DE EARNINGS ---
  console.log('💰 Criando earnings de exemplo...');

  // Earning para João (vendedor)
  await prisma.earning.create({
    data: {
      type: EarningType.SELLER,
      userId: vendedor1.id,
      userName: vendedor1.name,
      userAvatarUrl: vendedor1.avatarUrl,
      campaignId: campanhaAtiva.id,
      campaignTitle: campanhaAtiva.title,
      kitId: kitJoao.id,
      amount: 50.0,
      earningDate: new Date(new Date().setDate(new Date().getDate() - 1)),
      status: EarningStatus.PENDENTE,
      description: 'Venda validada: PED-001-2025',
    },
  });

  // Earning para Maria (gerente - percentual)
  await prisma.earning.create({
    data: {
      type: EarningType.MANAGER,
      userId: gerente1.id,
      userName: gerente1.name,
      userAvatarUrl: gerente1.avatarUrl,
      campaignId: campanhaAtiva.id,
      campaignTitle: campanhaAtiva.title,
      kitId: kitJoao.id,
      sourceUserName: vendedor1.name,
      amount: 5.0,
      earningDate: new Date(new Date().setDate(new Date().getDate() - 1)),
      status: EarningStatus.PENDENTE,
      description: `Venda da equipe validada: PED-001-2025 (vendedor: ${vendedor1.name})`,
    },
  });

  console.log('✓ Earnings de exemplo criados.');

  // --- CRIAÇÃO DE ATIVIDADES ---
  console.log('📊 Criando atividades de exemplo...');

  const atividades = [
    {
      userId: vendedor1.id,
      type: ActivityType.VENDA,
      description: 'Venda submetida: PED-001-2025 (1 par de Lentes Super-foco)',
      points: 50,
      timestamp: new Date(new Date().setDate(new Date().getDate() - 2)),
    },
    {
      userId: vendedor1.id,
      type: ActivityType.VENDA,
      description: 'Venda submetida: PED-002-2025 (1 par de Lentes Super-foco)',
      timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
    },
    {
      userId: vendedor2.id,
      type: ActivityType.VENDA,
      description: 'Venda submetida: PED-003-2025 (1 Armação Premium)',
      timestamp: new Date(new Date().setHours(new Date().getHours() - 3)),
    },
    {
      userId: admin.id,
      type: ActivityType.ADMIN_CAMPAIGN_CREATED,
      description: `Campanha criada: ${campanhaAtiva.title}`,
      timestamp: new Date(new Date().setDate(new Date().getDate() - 30)),
    },
    {
      userId: gerente1.id,
      type: ActivityType.CONQUISTA,
      description: 'Meta mensal atingida: 15 vendas validadas',
      points: 200,
      timestamp: new Date(new Date().setDate(new Date().getDate() - 5)),
    },
  ];

  for (const atividade of atividades) {
    await prisma.activityItem.create({
      data: atividade,
    });
  }

  console.log('✓ Atividades de exemplo criadas.');

  // --- CRIAÇÃO DE NOTIFICAÇÕES ---
  console.log('🔔 Criando notificações de exemplo...');

  const notificacoes = [
    {
      userId: vendedor1.id,
      title: 'Venda Validada! 🎉',
      message: 'Sua venda PED-001-2025 foi validada e você ganhou 50 pontos!',
      type: 'success',
      isRead: false,
    },
    {
      userId: vendedor1.id,
      title: 'Nova Campanha Disponível',
      message: `A campanha "${campanhaArmacoes.title}" está ativa. Participe e ganhe ainda mais pontos!`,
      type: 'info',
      isRead: true,
    },
    {
      userId: gerente1.id,
      title: 'Equipe em Destaque! 🏆',
      message: 'Sua equipe está em 2º lugar no ranking mensal. Continue assim!',
      type: 'achievement',
      isRead: false,
    },
    {
      userId: vendedor2.id,
      title: 'Prêmio Disponível',
      message: 'Você tem pontos suficientes para resgatar a Caixa de Som Bluetooth!',
      type: 'premio',
      isRead: false,
    },
    {
      userId: admin.id,
      title: 'Relatório Mensal',
      message: '15 vendas foram validadas este mês. Sistema funcionando perfeitamente.',
      type: 'report',
      isRead: true,
    },
  ];

  for (const notificacao of notificacoes) {
    await prisma.notification.create({
      data: notificacao,
    });
  }

  console.log('✓ Notificações de exemplo criadas.');

  console.log('🎉 Seeding finalizado com sucesso!');
  console.log('');
  console.log('📋 RESUMO DO SEEDING:');
  console.log('👥 Usuários criados:');
  console.log('   - 1 Admin: admin@eps.com (senha: password123)');
  console.log('   - 2 Gerentes: maria.gerente@eps.com, pedro.gerente@eps.com');
  console.log('   - 4 Vendedores: joao.vendedor@eps.com, ana.vendedora@eps.com, etc.');
  console.log('🎯 Campanhas criadas:');
  console.log('   - 2 Campanhas ativas');
  console.log('   - 1 Campanha concluída');
  console.log('   - 1 Campanha expirada');
  console.log('🎁 Prêmios criados:');
  console.log('   - 10 prêmios diversificados no catálogo');
  console.log('💰 Dados de exemplo:');
  console.log('   - Kits, submissões, earnings, atividades e notificações');
  console.log('');
  console.log('✅ O sistema está pronto para uso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
