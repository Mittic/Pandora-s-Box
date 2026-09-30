# Gestão ISO & LGPD

Aplicação web simples para gerenciar projetos de adequação à **LGPD** e de implantação da **ISO/IEC 27001** e **ISO/IEC 27701**.

## Funcionalidades

- **Projetos**: cliente, responsável, período e normas envolvidas.
- **Plano de trabalho automático**: ao criar o projeto, as tarefas de cada norma são geradas a partir de modelos (`templates.js`), com prazos distribuídos entre o início e o término.
  - LGPD: diagnóstico, mapeamento (RoPA), bases legais, LIA, RIPD, políticas, contratos, direitos dos titulares, incidentes, treinamento.
  - ISO 27001:2022: cláusulas 4 a 10, controles do Anexo A (A.5 a A.8) e certificação.
  - ISO 27701: extensão do SGSI para privacidade (PIMS).
- **Tarefas**: status, prioridade, prazo, responsável, notas/evidências, filtros e busca; destaque para tarefas atrasadas.
- **Riscos**: registro com probabilidade × impacto, matriz 5×5, tratamento e plano de ação.
- **Resumo por fase** e **painel geral** com indicadores e próximos prazos.
- **Backup**: exportar/importar os dados em JSON.

Os dados ficam salvos no navegador (`localStorage`). Cada pessoa/navegador tem os seus próprios dados; use Exportar/Importar para levar os dados para outra máquina.

## Rodar localmente

Não há dependências nem build. Basta abrir o `index.html` no navegador, ou servir a pasta:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Publicar na Vercel

É um site estático, então a Vercel publica sem configuração de build.

**Pelo painel (recomendado)**

1. Acesse <https://vercel.com/new> e importe o repositório `mittic/pandora-s-box` do GitHub.
2. Em *Framework Preset*, escolha **Other**. Deixe *Build Command* e *Output Directory* vazios.
3. Clique em **Deploy**. A cada push na branch principal a Vercel publica de novo; outras branches geram URLs de preview.

**Pela linha de comando**

```bash
npm i -g vercel
vercel          # primeiro deploy (preview)
vercel --prod   # produção
```

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Página única da aplicação |
| `styles.css` | Estilos |
| `app.js` | Lógica: telas, formulários, persistência |
| `templates.js` | Modelos de tarefas por norma (edite para ajustar a metodologia) |
| `vercel.json` | Configuração de deploy na Vercel |
