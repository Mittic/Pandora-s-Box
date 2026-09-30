// Modelos de plano de trabalho por norma/regulação.
// Cada item vira uma tarefa quando o projeto é criado.
const TEMPLATES = {
  LGPD: {
    nome: 'LGPD — Lei 13.709/2018',
    fases: [
      {
        fase: '1. Diagnóstico',
        tarefas: [
          'Kick-off e definição do escopo do projeto',
          'Nomeação do Encarregado (DPO) — art. 41',
          'Gap analysis de aderência à LGPD',
        ],
      },
      {
        fase: '2. Mapeamento',
        tarefas: [
          'Entrevistas com as áreas de negócio',
          'Registro das operações de tratamento (RoPA) — art. 37',
          'Inventário de sistemas e fluxos de dados pessoais',
          'Mapeamento de compartilhamentos e transferências internacionais',
        ],
      },
      {
        fase: '3. Bases legais e avaliações',
        tarefas: [
          'Revisão de bases legais (arts. 7º e 11)',
          'LIA — teste de legítimo interesse (art. 10)',
          'RIPD — relatório de impacto para tratamentos de alto risco (art. 38)',
          'Avaliação de riscos de privacidade',
        ],
      },
      {
        fase: '4. Documentação e contratos',
        tarefas: [
          'Política de privacidade externa (site/app)',
          'Política interna de proteção de dados',
          'Política de retenção e descarte',
          'Aviso de cookies e gestão de consentimento',
          'Revisão de contratos com operadores (cláusulas LGPD)',
        ],
      },
      {
        fase: '5. Direitos e incidentes',
        tarefas: [
          'Procedimento de atendimento aos titulares (art. 18)',
          'Plano de resposta a incidentes (art. 48 / Res. CD/ANPD nº 15/2024)',
        ],
      },
      {
        fase: '6. Segurança e cultura',
        tarefas: [
          'Medidas de segurança técnicas e administrativas (art. 46)',
          'Treinamento e conscientização dos colaboradores',
          'Monitoramento contínuo e auditoria de conformidade',
        ],
      },
    ],
  },

  ISO27001: {
    nome: 'ISO/IEC 27001:2022 — SGSI',
    fases: [
      {
        fase: '4. Contexto',
        tarefas: [
          'Contexto da organização e partes interessadas (4.1, 4.2)',
          'Definição do escopo do SGSI (4.3)',
        ],
      },
      {
        fase: '5. Liderança',
        tarefas: [
          'Política de segurança da informação (5.2)',
          'Papéis, responsabilidades e autoridades (5.3)',
        ],
      },
      {
        fase: '6. Planejamento',
        tarefas: [
          'Metodologia de avaliação de riscos (6.1.2)',
          'Avaliação de riscos de segurança da informação (8.2)',
          'Plano de tratamento de riscos (6.1.3)',
          'Declaração de Aplicabilidade — SoA (6.1.3 d)',
          'Objetivos de segurança da informação (6.2)',
        ],
      },
      {
        fase: '7. Apoio',
        tarefas: [
          'Competência e conscientização (7.2, 7.3)',
          'Plano de comunicação (7.4)',
          'Controle de informação documentada (7.5)',
        ],
      },
      {
        fase: '8. Operação — Anexo A',
        tarefas: [
          'Controles organizacionais (A.5)',
          'Controles de pessoas (A.6)',
          'Controles físicos (A.7)',
          'Controles tecnológicos (A.8)',
        ],
      },
      {
        fase: '9. Avaliação de desempenho',
        tarefas: [
          'Monitoramento, medição e indicadores (9.1)',
          'Auditoria interna (9.2)',
          'Análise crítica pela direção (9.3)',
        ],
      },
      {
        fase: '10. Melhoria',
        tarefas: ['Não conformidades e ações corretivas (10.2)'],
      },
      {
        fase: 'Certificação',
        tarefas: [
          'Auditoria de certificação — estágio 1',
          'Auditoria de certificação — estágio 2',
        ],
      },
    ],
  },

  ISO27701: {
    nome: 'ISO/IEC 27701 — Gestão da Privacidade (PIMS)',
    fases: [
      {
        fase: 'PIMS — Planejamento',
        tarefas: [
          'Extensão do escopo do SGSI para privacidade',
          'Definição do papel: controlador e/ou operador',
          'Avaliação de riscos de privacidade integrada ao SGSI',
        ],
      },
      {
        fase: 'PIMS — Controles',
        tarefas: [
          'Controles adicionais para controladores (Anexo A)',
          'Controles adicionais para operadores (Anexo B)',
          'Mapeamento de controles para a LGPD',
        ],
      },
      {
        fase: 'PIMS — Verificação',
        tarefas: [
          'Atualização da SoA com controles de privacidade',
          'Auditoria interna do PIMS',
        ],
      },
    ],
  },
};
