// Gestão de projetos ISO & LGPD — aplicação estática, dados salvos no localStorage.
(function () {
  'use strict';

  const CHAVE = 'gestao-iso-lgpd:v1';
  const STATUS_TAREFA = ['A fazer', 'Em andamento', 'Concluída'];
  const PRIORIDADES = ['Alta', 'Média', 'Baixa'];
  const STATUS_RISCO = ['Aberto', 'Em tratamento', 'Mitigado', 'Aceito'];
  const TRATAMENTOS = ['Mitigar', 'Transferir', 'Evitar', 'Aceitar'];

  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const modalForm = document.getElementById('modal-form');
  let aoSalvarModal = null;
  const filtros = { status: '', norma: '', busca: '' };

  // ---------- Persistência ----------

  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) return JSON.parse(bruto);
    } catch (e) {
      console.warn('Não foi possível ler os dados salvos', e);
    }
    return { projetos: [] };
  }

  let estado = carregar();

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (e) {
      alert('Não foi possível salvar os dados no navegador. Exporte um backup.');
    }
  }

  // ---------- Utilidades ----------

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hojeISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function formatarData(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  function opcoes(lista, selecionado, vazio) {
    const base = vazio != null ? `<option value="">${esc(vazio)}</option>` : '';
    return base + lista.map((v) => {
      const valor = typeof v === 'object' ? v.valor : v;
      const rotulo = typeof v === 'object' ? v.rotulo : v;
      return `<option value="${esc(valor)}"${valor === selecionado ? ' selected' : ''}>${esc(rotulo)}</option>`;
    }).join('');
  }

  function nomeNorma(chave) {
    return { LGPD: 'LGPD', ISO27001: 'ISO 27001', ISO27701: 'ISO 27701' }[chave] || chave;
  }

  function tagsNormas(normas) {
    return `<div class="tags">${normas.map((n) => `<span class="tag ${esc(n)}">${esc(nomeNorma(n))}</span>`).join('')}</div>`;
  }

  function atrasada(t) {
    return t.status !== 'Concluída' && t.prazo && t.prazo < hojeISO();
  }

  function progresso(p) {
    if (!p.tarefas.length) return 0;
    const feitas = p.tarefas.filter((t) => t.status === 'Concluída').length;
    return Math.round((feitas / p.tarefas.length) * 100);
  }

  function nivelRisco(r) {
    const v = Number(r.probabilidade) * Number(r.impacto);
    if (v >= 10) return { valor: v, classe: 'alto', rotulo: 'Alto' };
    if (v >= 5) return { valor: v, classe: 'medio', rotulo: 'Médio' };
    return { valor: v, classe: 'baixo', rotulo: 'Baixo' };
  }

  function riscoAtivo(r) {
    return r.status === 'Aberto' || r.status === 'Em tratamento';
  }

  function buscarProjeto(id) {
    return estado.projetos.find((p) => p.id === id);
  }

  // Distribui os prazos das tarefas do modelo ao longo do período do projeto.
  function gerarTarefas(normas, inicio, fim, responsavel) {
    const tarefas = [];
    const t0 = inicio ? new Date(inicio + 'T00:00:00').getTime() : null;
    const t1 = fim ? new Date(fim + 'T00:00:00').getTime() : null;
    normas.forEach((norma) => {
      const modelo = TEMPLATES[norma];
      if (!modelo) return;
      const itens = [];
      modelo.fases.forEach((f) => f.tarefas.forEach((titulo) => itens.push({ fase: f.fase, titulo })));
      itens.forEach((item, i) => {
        let prazo = '';
        if (t0 != null && t1 != null && t1 >= t0) {
          const t = t0 + ((t1 - t0) * (i + 1)) / itens.length;
          prazo = new Date(t).toISOString().slice(0, 10);
        }
        tarefas.push({
          id: uid(),
          norma,
          fase: item.fase,
          titulo: item.titulo,
          responsavel: responsavel || '',
          prazo,
          status: 'A fazer',
          prioridade: 'Média',
          notas: '',
        });
      });
    });
    return tarefas;
  }

  // ---------- Modal ----------

  function abrirModal(titulo, corpo, aoSalvar) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-corpo').innerHTML = corpo;
    aoSalvarModal = aoSalvar;
    modal.showModal();
    const primeiro = modal.querySelector('input, select, textarea');
    if (primeiro) primeiro.focus();
  }

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = new FormData(modalForm);
    if (aoSalvarModal && aoSalvarModal(dados) === false) return;
    modal.close();
    render();
  });

  function campo(rotulo, html) {
    return `<div class="campo"><label>${esc(rotulo)}</label>${html}</div>`;
  }

  // ---------- Formulários ----------

  function formProjeto(p) {
    const edicao = !!p;
    p = p || { nome: '', cliente: '', responsavel: '', inicio: hojeISO(), fim: '', normas: ['LGPD'], descricao: '' };
    const checks = Object.keys(TEMPLATES).map((k) => `
      <label><input type="checkbox" name="normas" value="${k}"${p.normas.includes(k) ? ' checked' : ''}${edicao ? ' disabled' : ''}>
      ${esc(TEMPLATES[k].nome)}</label>`).join('');
    const corpo =
      campo('Nome do projeto *', `<input name="nome" required value="${esc(p.nome)}">`) +
      `<div class="linha">` +
      campo('Cliente / Organização', `<input name="cliente" value="${esc(p.cliente)}">`) +
      campo('Responsável', `<input name="responsavel" value="${esc(p.responsavel)}">`) +
      `</div><div class="linha">` +
      campo('Início', `<input type="date" name="inicio" value="${esc(p.inicio)}">`) +
      campo('Término previsto', `<input type="date" name="fim" value="${esc(p.fim)}">`) +
      `</div>` +
      campo(edicao ? 'Normas (definidas na criação)' : 'Normas / regulações *', `<div class="checks">${checks}</div>`) +
      campo('Descrição', `<textarea name="descricao" rows="2">${esc(p.descricao)}</textarea>`) +
      (edicao ? '' : '<p class="muted">As tarefas de cada norma serão geradas automaticamente, com prazos distribuídos entre o início e o término.</p>');

    abrirModal(edicao ? 'Editar projeto' : 'Novo projeto', corpo, (d) => {
      const base = {
        nome: d.get('nome').trim(),
        cliente: d.get('cliente').trim(),
        responsavel: d.get('responsavel').trim(),
        inicio: d.get('inicio'),
        fim: d.get('fim'),
        descricao: d.get('descricao').trim(),
      };
      if (base.inicio && base.fim && base.fim < base.inicio) {
        alert('O término não pode ser anterior ao início.');
        return false;
      }
      if (edicao) {
        Object.assign(p, base);
      } else {
        const normas = d.getAll('normas');
        if (!normas.length) {
          alert('Selecione ao menos uma norma.');
          return false;
        }
        const novo = Object.assign({ id: uid(), normas, criadoEm: hojeISO(), riscos: [] }, base);
        novo.tarefas = gerarTarefas(normas, base.inicio, base.fim, base.responsavel);
        estado.projetos.push(novo);
        location.hash = `#/projeto/${novo.id}`;
      }
      salvar();
    });
  }

  function formTarefa(projeto, t) {
    const edicao = !!t;
    t = t || { titulo: '', norma: projeto.normas[0], fase: '', responsavel: projeto.responsavel, prazo: '', status: 'A fazer', prioridade: 'Média', notas: '' };
    const fases = [...new Set(projeto.tarefas.map((x) => x.fase))];
    const corpo =
      campo('Tarefa *', `<input name="titulo" required value="${esc(t.titulo)}">`) +
      `<div class="linha">` +
      campo('Norma', `<select name="norma">${opcoes(projeto.normas.map((n) => ({ valor: n, rotulo: nomeNorma(n) })), t.norma)}</select>`) +
      campo('Fase', `<input name="fase" list="lista-fases" value="${esc(t.fase)}"><datalist id="lista-fases">${fases.map((f) => `<option value="${esc(f)}">`).join('')}</datalist>`) +
      `</div><div class="linha">` +
      campo('Responsável', `<input name="responsavel" value="${esc(t.responsavel)}">`) +
      campo('Prazo', `<input type="date" name="prazo" value="${esc(t.prazo)}">`) +
      `</div><div class="linha">` +
      campo('Status', `<select name="status">${opcoes(STATUS_TAREFA, t.status)}</select>`) +
      campo('Prioridade', `<select name="prioridade">${opcoes(PRIORIDADES, t.prioridade)}</select>`) +
      `</div>` +
      campo('Notas / evidências', `<textarea name="notas" rows="3">${esc(t.notas)}</textarea>`);

    abrirModal(edicao ? 'Editar tarefa' : 'Nova tarefa', corpo, (d) => {
      const dados = {
        titulo: d.get('titulo').trim(),
        norma: d.get('norma'),
        fase: d.get('fase').trim() || 'Outras',
        responsavel: d.get('responsavel').trim(),
        prazo: d.get('prazo'),
        status: d.get('status'),
        prioridade: d.get('prioridade'),
        notas: d.get('notas').trim(),
      };
      if (edicao) Object.assign(t, dados);
      else projeto.tarefas.push(Object.assign({ id: uid() }, dados));
      salvar();
    });
  }

  function formRisco(projeto, r) {
    const edicao = !!r;
    r = r || { descricao: '', categoria: '', probabilidade: 3, impacto: 3, tratamento: 'Mitigar', acao: '', responsavel: '', status: 'Aberto' };
    const escala = [1, 2, 3, 4, 5].map((n) => ({ valor: String(n), rotulo: `${n} — ${['Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto'][n - 1]}` }));
    const corpo =
      campo('Descrição do risco *', `<textarea name="descricao" rows="2" required>${esc(r.descricao)}</textarea>`) +
      `<div class="linha">` +
      campo('Categoria', `<input name="categoria" list="lista-cat" value="${esc(r.categoria)}" placeholder="ex.: Privacidade, Segurança"><datalist id="lista-cat"><option value="Privacidade"><option value="Segurança da informação"><option value="Legal / regulatório"><option value="Terceiros"><option value="Operacional"></datalist>`) +
      campo('Responsável', `<input name="responsavel" value="${esc(r.responsavel)}">`) +
      `</div><div class="linha">` +
      campo('Probabilidade', `<select name="probabilidade">${opcoes(escala, String(r.probabilidade))}</select>`) +
      campo('Impacto', `<select name="impacto">${opcoes(escala, String(r.impacto))}</select>`) +
      `</div><div class="linha">` +
      campo('Tratamento', `<select name="tratamento">${opcoes(TRATAMENTOS, r.tratamento)}</select>`) +
      campo('Status', `<select name="status">${opcoes(STATUS_RISCO, r.status)}</select>`) +
      `</div>` +
      campo('Plano de ação', `<textarea name="acao" rows="2">${esc(r.acao)}</textarea>`);

    abrirModal(edicao ? 'Editar risco' : 'Novo risco', corpo, (d) => {
      const dados = {
        descricao: d.get('descricao').trim(),
        categoria: d.get('categoria').trim(),
        responsavel: d.get('responsavel').trim(),
        probabilidade: Number(d.get('probabilidade')),
        impacto: Number(d.get('impacto')),
        tratamento: d.get('tratamento'),
        status: d.get('status'),
        acao: d.get('acao').trim(),
      };
      if (edicao) Object.assign(r, dados);
      else projeto.riscos.push(Object.assign({ id: uid() }, dados));
      salvar();
    });
  }

  // ---------- Telas ----------

  function telaPainel() {
    const projetos = estado.projetos;
    if (!projetos.length) {
      return `<div class="vazio card">
        <h1>Nenhum projeto ainda</h1>
        <p>Crie um projeto de adequação à LGPD, implantação da ISO 27001 ou ISO 27701.<br>
        O plano de trabalho é gerado automaticamente a partir do modelo da norma.</p>
        <p><button class="btn" data-action="novo-projeto">+ Novo projeto</button>
        <button class="btn ghost" data-action="exemplo">Carregar exemplo</button></p>
      </div>`;
    }

    const todas = projetos.flatMap((p) => p.tarefas.map((t) => ({ t, p })));
    const abertas = todas.filter(({ t }) => t.status !== 'Concluída');
    const atrasadas = abertas.filter(({ t }) => atrasada(t));
    const riscosAltos = projetos.flatMap((p) => p.riscos).filter((r) => riscoAtivo(r) && nivelRisco(r).classe === 'alto');
    const proximas = abertas
      .filter(({ t }) => t.prazo)
      .sort((a, b) => a.t.prazo.localeCompare(b.t.prazo))
      .slice(0, 10);

    const cards = projetos.map((p) => {
      const pct = progresso(p);
      const atr = p.tarefas.filter(atrasada).length;
      return `<a class="card projeto-card" href="#/projeto/${esc(p.id)}">
        <h2>${esc(p.nome)}</h2>
        <div class="muted">${esc(p.cliente || 'Sem cliente')} · ${esc(p.responsavel || 'Sem responsável')}</div>
        ${tagsNormas(p.normas)}
        <div class="progresso"><span style="width:${pct}%"></span></div>
        <div class="muted">${pct}% concluído · ${p.tarefas.length} tarefas${atr ? ` · <span class="atrasada">${atr} atrasada(s)</span>` : ''}</div>
        <div class="muted">Prazo: ${formatarData(p.fim)}</div>
      </a>`;
    }).join('');

    const linhas = proximas.map(({ t, p }) => `<tr>
        <td class="${atrasada(t) ? 'atrasada' : ''}">${formatarData(t.prazo)}</td>
        <td>${esc(t.titulo)}</td>
        <td><a href="#/projeto/${esc(p.id)}">${esc(p.nome)}</a></td>
        <td>${esc(t.responsavel || '—')}</td>
        <td>${esc(t.status)}</td>
      </tr>`).join('');

    return `
      <h1>Painel</h1>
      <p class="muted">Visão geral dos projetos de conformidade</p>
      <div class="grid stats">
        <div class="card stat"><div class="valor">${projetos.length}</div><div class="rotulo">Projetos</div></div>
        <div class="card stat"><div class="valor">${abertas.length}</div><div class="rotulo">Tarefas em aberto</div></div>
        <div class="card stat ${atrasadas.length ? 'alerta' : ''}"><div class="valor">${atrasadas.length}</div><div class="rotulo">Tarefas atrasadas</div></div>
        <div class="card stat ${riscosAltos.length ? 'alerta' : ''}"><div class="valor">${riscosAltos.length}</div><div class="rotulo">Riscos altos em aberto</div></div>
      </div>
      <div class="grid projetos">${cards}</div>
      <h3>Próximos prazos</h3>
      ${proximas.length ? `<div class="tabela-wrap"><table>
        <thead><tr><th>Prazo</th><th>Tarefa</th><th>Projeto</th><th>Responsável</th><th>Status</th></tr></thead>
        <tbody>${linhas}</tbody></table></div>` : '<p class="muted">Nenhuma tarefa com prazo em aberto.</p>'}`;
  }

  function cabecalhoProjeto(p, aba) {
    const pct = progresso(p);
    return `
      <p><a href="#/">← Painel</a></p>
      <div class="cabecalho-projeto">
        <div>
          <h1>${esc(p.nome)}</h1>
          <div class="muted">${esc(p.cliente || 'Sem cliente')} · Responsável: ${esc(p.responsavel || '—')} · ${formatarData(p.inicio)} a ${formatarData(p.fim)}</div>
          ${tagsNormas(p.normas)}
          ${p.descricao ? `<p>${esc(p.descricao)}</p>` : ''}
        </div>
        <div class="botoes">
          <button class="btn ghost small" data-action="editar-projeto" data-id="${esc(p.id)}">Editar</button>
          <button class="btn danger small" data-action="excluir-projeto" data-id="${esc(p.id)}">Excluir</button>
        </div>
      </div>
      <div class="progresso"><span style="width:${pct}%"></span></div>
      <div class="muted">${pct}% concluído</div>
      <nav class="abas">
        <a href="#/projeto/${esc(p.id)}" class="${aba === 'tarefas' ? 'ativa' : ''}">Tarefas (${p.tarefas.length})</a>
        <a href="#/projeto/${esc(p.id)}/riscos" class="${aba === 'riscos' ? 'ativa' : ''}">Riscos (${p.riscos.length})</a>
        <a href="#/projeto/${esc(p.id)}/resumo" class="${aba === 'resumo' ? 'ativa' : ''}">Resumo por fase</a>
      </nav>`;
  }

  function tabelaTarefas(p) {
    const busca = filtros.busca.toLowerCase();
    const lista = p.tarefas.filter((t) =>
      (!filtros.status || t.status === filtros.status || (filtros.status === 'Atrasada' && atrasada(t))) &&
      (!filtros.norma || t.norma === filtros.norma) &&
      (!busca || [t.titulo, t.responsavel, t.fase, t.notas].join(' ').toLowerCase().includes(busca)));

    if (!lista.length) return '<p class="muted">Nenhuma tarefa encontrada.</p>';

    // Agrupa por norma + fase, mantendo a ordem de criação.
    const grupos = new Map();
    lista.forEach((t) => {
      const chave = `${nomeNorma(t.norma)} · ${t.fase}`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(t);
    });

    return [...grupos].map(([grupo, tarefas]) => `
      <h3>${esc(grupo)}</h3>
      <div class="tabela-wrap"><table>
        <thead><tr><th>Tarefa</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th></th></tr></thead>
        <tbody>${tarefas.map((t) => `
          <tr class="${t.status === 'Concluída' ? 'concluida' : ''}">
            <td class="titulo">${esc(t.titulo)}${t.notas ? ` <span class="muted" title="${esc(t.notas)}">📝</span>` : ''}</td>
            <td>${esc(t.responsavel || '—')}</td>
            <td class="${atrasada(t) ? 'atrasada' : ''}">${formatarData(t.prazo)}</td>
            <td><span class="prio ${esc(t.prioridade)}">${esc(t.prioridade)}</span></td>
            <td><select class="status-select" data-change="status-tarefa" data-id="${esc(t.id)}">${opcoes(STATUS_TAREFA, t.status)}</select></td>
            <td class="acoes">
              <button class="btn ghost small" data-action="editar-tarefa" data-id="${esc(t.id)}">Editar</button>
              <button class="btn danger small" data-action="excluir-tarefa" data-id="${esc(t.id)}">✕</button>
            </td>
          </tr>`).join('')}
        </tbody></table></div>`).join('');
  }

  function telaTarefas(p) {
    return cabecalhoProjeto(p, 'tarefas') + `
      <div class="filtros">
        <select data-filtro="status">${opcoes([...STATUS_TAREFA, 'Atrasada'], filtros.status, 'Todos os status')}</select>
        ${p.normas.length > 1 ? `<select data-filtro="norma">${opcoes(p.normas.map((n) => ({ valor: n, rotulo: nomeNorma(n) })), filtros.norma, 'Todas as normas')}</select>` : ''}
        <input type="search" data-filtro="busca" placeholder="Buscar tarefa, responsável…" value="${esc(filtros.busca)}">
        <span style="flex:1"></span>
        <button class="btn" data-action="nova-tarefa" data-id="${esc(p.id)}">+ Nova tarefa</button>
      </div>
      <div id="lista-tarefas">${tabelaTarefas(p)}</div>`;
  }

  function telaRiscos(p) {
    const ordenados = [...p.riscos].sort((a, b) => nivelRisco(b).valor - nivelRisco(a).valor);

    // Matriz 5x5: linhas = probabilidade (5 → 1), colunas = impacto (1 → 5).
    let matriz = '<div class="eixo">P \\ I</div>' + [1, 2, 3, 4, 5].map((i) => `<div class="eixo">${i}</div>`).join('');
    for (let prob = 5; prob >= 1; prob--) {
      matriz += `<div class="eixo">${prob}</div>`;
      for (let imp = 1; imp <= 5; imp++) {
        const qtd = p.riscos.filter((r) => riscoAtivo(r) && r.probabilidade === prob && r.impacto === imp).length;
        matriz += `<div class="celula ${nivelRisco({ probabilidade: prob, impacto: imp }).classe}">${qtd || ''}</div>`;
      }
    }

    const linhas = ordenados.map((r) => {
      const n = nivelRisco(r);
      return `<tr>
        <td><span class="nivel ${n.classe}" title="${n.rotulo}">${n.valor}</span></td>
        <td>${esc(r.descricao)}${r.acao ? `<div class="muted">Ação: ${esc(r.acao)}</div>` : ''}</td>
        <td>${esc(r.categoria || '—')}</td>
        <td style="white-space:nowrap">${r.probabilidade} × ${r.impacto}</td>
        <td>${esc(r.tratamento)}</td>
        <td>${esc(r.responsavel || '—')}</td>
        <td>${esc(r.status)}</td>
        <td class="acoes">
          <button class="btn ghost small" data-action="editar-risco" data-id="${esc(r.id)}">Editar</button>
          <button class="btn danger small" data-action="excluir-risco" data-id="${esc(r.id)}">✕</button>
        </td>
      </tr>`;
    }).join('');

    return cabecalhoProjeto(p, 'riscos') + `
      <div class="filtros"><span style="flex:1"></span>
        <button class="btn" data-action="novo-risco" data-id="${esc(p.id)}">+ Novo risco</button>
      </div>
      <div class="grid" style="grid-template-columns: minmax(0, 420px) 1fr; align-items:start">
        <div class="card"><h2>Matriz de riscos em aberto</h2><div class="matriz">${matriz}</div>
          <p class="muted">Nível = probabilidade × impacto. Baixo 1–4 · Médio 5–9 · Alto 10–25.</p></div>
      </div>
      <h3>Registro de riscos</h3>
      ${ordenados.length ? `<div class="tabela-wrap"><table>
        <thead><tr><th>Nível</th><th>Risco</th><th>Categoria</th><th>P × I</th><th>Tratamento</th><th>Responsável</th><th>Status</th><th></th></tr></thead>
        <tbody>${linhas}</tbody></table></div>` : '<p class="muted">Nenhum risco registrado.</p>'}`;
  }

  function telaResumo(p) {
    const grupos = new Map();
    p.tarefas.forEach((t) => {
      const chave = `${nomeNorma(t.norma)} · ${t.fase}`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(t);
    });
    const linhas = [...grupos].map(([fase, ts]) => {
      const feitas = ts.filter((t) => t.status === 'Concluída').length;
      const andamento = ts.filter((t) => t.status === 'Em andamento').length;
      const atr = ts.filter(atrasada).length;
      const pct = Math.round((feitas / ts.length) * 100);
      return `<tr>
        <td>${esc(fase)}</td>
        <td>${ts.length}</td><td>${andamento}</td><td>${feitas}</td>
        <td class="${atr ? 'atrasada' : ''}">${atr}</td>
        <td style="min-width:140px"><div class="progresso"><span style="width:${pct}%"></span></div>${pct}%</td>
      </tr>`;
    }).join('');
    return cabecalhoProjeto(p, 'resumo') + (grupos.size ? `<div class="tabela-wrap"><table>
      <thead><tr><th>Fase</th><th>Tarefas</th><th>Em andamento</th><th>Concluídas</th><th>Atrasadas</th><th>Progresso</th></tr></thead>
      <tbody>${linhas}</tbody></table></div>` : '<p class="muted">Sem tarefas.</p>');
  }

  // ---------- Roteamento ----------

  function rota() {
    const partes = location.hash.replace(/^#\/?/, '').split('/');
    return { tela: partes[0] || 'painel', id: partes[1], aba: partes[2] || 'tarefas' };
  }

  function render() {
    const r = rota();
    if (r.tela === 'projeto') {
      const p = buscarProjeto(r.id);
      if (!p) { location.hash = '#/'; return; }
      document.title = `${p.nome} — Gestão ISO & LGPD`;
      if (r.aba === 'riscos') app.innerHTML = telaRiscos(p);
      else if (r.aba === 'resumo') app.innerHTML = telaResumo(p);
      else app.innerHTML = telaTarefas(p);
    } else {
      document.title = 'Gestão ISO & LGPD';
      app.innerHTML = telaPainel();
    }
  }

  let projetoAnterior = null;
  window.addEventListener('hashchange', () => {
    // Limpa os filtros ao trocar de projeto.
    const id = rota().id;
    if (id !== projetoAnterior) {
      filtros.status = filtros.norma = filtros.busca = '';
      projetoAnterior = id;
    }
    render();
    window.scrollTo(0, 0);
  });

  // ---------- Eventos ----------

  function projetoAtual() {
    return buscarProjeto(rota().id);
  }

  function acharTarefa(id) {
    const p = projetoAtual();
    return p && p.tarefas.find((t) => t.id === id);
  }

  function acharRisco(id) {
    const p = projetoAtual();
    return p && p.riscos.find((r) => r.id === id);
  }

  const acoes = {
    'novo-projeto': () => formProjeto(),
    'editar-projeto': (id) => formProjeto(buscarProjeto(id)),
    'excluir-projeto': (id) => {
      const p = buscarProjeto(id);
      if (!p || !confirm(`Excluir o projeto "${p.nome}" e todas as suas tarefas e riscos?`)) return;
      estado.projetos = estado.projetos.filter((x) => x.id !== id);
      salvar();
      location.hash = '#/';
      render();
    },
    'nova-tarefa': (id) => formTarefa(buscarProjeto(id)),
    'editar-tarefa': (id) => formTarefa(projetoAtual(), acharTarefa(id)),
    'excluir-tarefa': (id) => {
      const p = projetoAtual();
      const t = acharTarefa(id);
      if (!t || !confirm(`Excluir a tarefa "${t.titulo}"?`)) return;
      p.tarefas = p.tarefas.filter((x) => x.id !== id);
      salvar();
      render();
    },
    'novo-risco': (id) => formRisco(buscarProjeto(id)),
    'editar-risco': (id) => formRisco(projetoAtual(), acharRisco(id)),
    'excluir-risco': (id) => {
      const p = projetoAtual();
      const r = acharRisco(id);
      if (!r || !confirm('Excluir este risco?')) return;
      p.riscos = p.riscos.filter((x) => x.id !== id);
      salvar();
      render();
    },
    'fechar-modal': () => modal.close(),
    exportar: exportar,
    exemplo: carregarExemplo,
  };

  document.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-action]');
    if (!alvo) return;
    const acao = acoes[alvo.dataset.action];
    if (acao) {
      e.preventDefault();
      acao(alvo.dataset.id);
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.change === 'status-tarefa') {
      const t = acharTarefa(el.dataset.id);
      if (t) {
        t.status = el.value;
        salvar();
        render();
      }
    } else if (el.dataset.filtro && el.dataset.filtro !== 'busca') {
      filtros[el.dataset.filtro] = el.value;
      atualizarLista();
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.dataset.filtro === 'busca') {
      filtros.busca = e.target.value;
      atualizarLista();
    }
  });

  // Re-renderiza só a lista, para não perder o foco do campo de busca.
  function atualizarLista() {
    const p = projetoAtual();
    const lista = document.getElementById('lista-tarefas');
    if (p && lista) lista.innerHTML = tabelaTarefas(p);
  }

  // ---------- Backup ----------

  function exportar() {
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestao-iso-lgpd-${hojeISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById('importar').addEventListener('change', (e) => {
    const arquivo = e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const dados = JSON.parse(leitor.result);
        if (!dados || !Array.isArray(dados.projetos)) throw new Error('formato inválido');
        dados.projetos.forEach((p) => {
          p.tarefas = Array.isArray(p.tarefas) ? p.tarefas : [];
          p.riscos = Array.isArray(p.riscos) ? p.riscos : [];
          p.normas = Array.isArray(p.normas) ? p.normas : [];
        });
        if (!confirm(`Importar ${dados.projetos.length} projeto(s)? Os dados atuais serão substituídos.`)) return;
        estado = dados;
        salvar();
        location.hash = '#/';
        render();
      } catch (err) {
        alert('Arquivo inválido: ' + err.message);
      }
    };
    leitor.readAsText(arquivo);
  });

  // ---------- Exemplo ----------

  function carregarExemplo() {
    const hoje = new Date();
    const deslocar = (dias) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + dias);
      return d.toISOString().slice(0, 10);
    };
    const inicio = deslocar(-60);
    const fim = deslocar(120);
    const p = {
      id: uid(),
      nome: 'Adequação LGPD + ISO 27001',
      cliente: 'Empresa Exemplo Ltda.',
      responsavel: 'Consultoria',
      inicio,
      fim,
      descricao: 'Projeto de demonstração: adequação à LGPD integrada à implantação do SGSI.',
      normas: ['LGPD', 'ISO27001'],
      criadoEm: hojeISO(),
      riscos: [
        { id: uid(), descricao: 'Compartilhamento de dados de clientes com fornecedor sem contrato com cláusulas LGPD', categoria: 'Terceiros', probabilidade: 4, impacto: 4, tratamento: 'Mitigar', acao: 'Aditivo contratual com cláusulas de proteção de dados', responsavel: 'Jurídico', status: 'Em tratamento' },
        { id: uid(), descricao: 'Ausência de controle de acesso por perfil no ERP', categoria: 'Segurança da informação', probabilidade: 3, impacto: 4, tratamento: 'Mitigar', acao: 'Revisão de perfis e implantação de MFA', responsavel: 'TI', status: 'Aberto' },
        { id: uid(), descricao: 'Retenção de currículos por prazo indeterminado', categoria: 'Privacidade', probabilidade: 3, impacto: 2, tratamento: 'Mitigar', acao: 'Definir prazo na política de retenção', responsavel: 'RH', status: 'Aberto' },
      ],
    };
    p.tarefas = gerarTarefas(p.normas, inicio, fim, p.responsavel);
    // Marca as primeiras tarefas de cada norma como concluídas / em andamento.
    ['LGPD', 'ISO27001'].forEach((n) => {
      const ts = p.tarefas.filter((t) => t.norma === n);
      ts.slice(0, 4).forEach((t) => { t.status = 'Concluída'; });
      ts.slice(4, 6).forEach((t) => { t.status = 'Em andamento'; });
    });
    estado.projetos.push(p);
    salvar();
    location.hash = `#/projeto/${p.id}`;
    render();
  }

  render();
})();
