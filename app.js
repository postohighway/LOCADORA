(function () {
  'use strict';

  const STORAGE_KEY = 'highway_locacao_db';
  const DEP_KEY = 'highway_depreciacao';

  const MESES_DEP = 48;
  const RESIDUAL = 0.15;

  function loadDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(window.HIGHWAY_SEED));
  }

  function saveDb(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function depMensal(v) {
    const valor = v.valorAquisicao || 0;
    if (valor <= 0) return 0;
    return (valor * (1 - RESIDUAL)) / MESES_DEP;
  }

  function depMesTotal(veiculos, m, y) {
    return (veiculos || []).reduce((t, v) => {
      const da = v.dataAquisicao ? new Date(v.dataAquisicao) : new Date();
      const ini = new Date(da.getFullYear(), da.getMonth(), 1);
      const fim = new Date(ini);
      fim.setMonth(fim.getMonth() + MESES_DEP);
      const ref = new Date(y, m - 1, 1);
      if (ref >= ini && ref < fim) return t + depMensal(v);
      return t;
    }, 0);
  }

  function depTotalVeiculo(v) {
    const valor = v.valorAquisicao || 0;
    if (valor <= 0) return 0;
    const vd = (valor * (1 - RESIDUAL)) / MESES_DEP;
    const da = v.dataAquisicao ? new Date(v.dataAquisicao) : new Date();
    const hoje = new Date();
    let meses = (hoje.getFullYear() - da.getFullYear()) * 12 + (hoje.getMonth() - da.getMonth());
    meses = Math.max(0, Math.min(meses, MESES_DEP));
    return vd * meses;
  }

  function fmtMoney(n) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
  }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  function uid(p) {
    return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  let db = loadDb();
  let depOn = localStorage.getItem(DEP_KEY) === 'true';

  function getDb() {
    return db;
  }

  function persist() {
    saveDb(db);
    renderAll();
  }

  // ---------- Modal ----------
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.classList.add('open');
    modal.style.display = 'flex';
    const mc = document.getElementById('modal-close');
    if (mc) mc.onclick = closeModal;
    modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
  }

  function closeModal() {
    modal.style.display = 'none';
    modal.classList.remove('open');
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // ---------- Nav ----------
  function showPage(id) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    const el = document.getElementById('page-' + id);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.page === id);
    });
    renderAll();
  }

  document.querySelectorAll('.nav a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(a.dataset.page);
    });
  });

  // ---------- Dep toggle ----------
  const toggleBtn = document.getElementById('dep-toggle');
  const toggleLabel = document.getElementById('dep-label');

  function syncDepToggle() {
    toggleBtn.classList.toggle('on', depOn);
    toggleLabel.textContent = depOn ? 'Incluída' : 'Oculta';
  }

  toggleBtn.addEventListener('click', () => {
    depOn = !depOn;
    localStorage.setItem(DEP_KEY, depOn ? 'true' : 'false');
    syncDepToggle();
    renderAll();
  });
  syncDepToggle();

  // ---------- Export / Import ----------
  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'highway-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });

  document.getElementById('file-import').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        if (!j.veiculos || !Array.isArray(j.veiculos)) throw new Error('JSON inválido');
        db = {
          veiculos: j.veiculos || [],
          clientes: j.clientes || [],
          motoristas: j.motoristas || [],
          contratos: j.contratos || [],
          manutencoes: j.manutencoes || [],
          acidentes: j.acidentes || [],
          pagamentos: j.pagamentos || [],
        };
        persist();
        alert('Backup importado com sucesso!');
      } catch (err) {
        alert('Erro: ' + err.message);
      }
      e.target.value = '';
    };
    r.readAsText(f);
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('Restaurar dados de exemplo? Seus dados atuais serão perdidos.')) return;
    db = JSON.parse(JSON.stringify(window.HIGHWAY_SEED));
    persist();
  });

  // ---------- Dashboard ----------
  function renderDashboard() {
    const v = db.veiculos || [];
    const c = db.contratos || [];
    const m = db.manutencoes || [];
    const p = db.pagamentos || [];
    const hoje = new Date();
    const receitaMes = p
      .filter((x) => {
        if (x.status !== 'pago' || !x.dataPagamento) return false;
        const d = new Date(x.dataPagamento);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      })
      .reduce((s, x) => s + (x.valor || 0), 0);
    const custoMan = m
      .filter((x) => {
        if (!x.dataRealizada) return false;
        const d = new Date(x.dataRealizada);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      })
      .reduce((s, x) => s + (x.custoReal || x.custoEstimado || 0), 0);
    const custoDep = depOn ? depMesTotal(v, hoje.getMonth() + 1, hoje.getFullYear()) : 0;
    const resultado = receitaMes - custoMan - custoDep;

    const cards = document.getElementById('dash-cards');
    let html = '';
    const items = [
      ['🚗', 'Total Veículos', v.length],
      ['✅', 'Disponíveis', v.filter((x) => x.status === 'disponivel').length],
      ['📋', 'Em Locação', v.filter((x) => x.status === 'em_locacao').length],
      ['🔧', 'Em Manutenção', v.filter((x) => x.status === 'manutencao').length],
      ['📊', 'Taxa Ocupação %', v.length ? ((v.filter((x) => x.status === 'em_locacao').length / v.length) * 100).toFixed(1) : '0'],
      ['📄', 'Contratos Ativos', c.filter((x) => x.status === 'ativo').length],
      ['💰', 'Receita Mês', fmtMoney(receitaMes)],
      ['💸', 'Custo Manutenção', fmtMoney(custoMan)],
    ];
    if (depOn && custoDep > 0) items.push(['📉', 'Custo Depreciação', fmtMoney(custoDep)]);
    items.push(['📈', 'Resultado Mês', fmtMoney(resultado)]);

    items.forEach(([ico, lbl, val]) => {
      const cls = lbl === 'Resultado Mês' ? (resultado >= 0 ? 'pos' : 'neg') : '';
      html += `<div class="card ${cls}"><span class="ico">${ico}</span><div><div class="val">${val}</div><div class="lbl">${lbl}</div></div></div>`;
    });
    cards.innerHTML = html;
  }

  // ---------- Tables ----------
  function renderVeiculos() {
    const tb = document.querySelector('#tbl-veiculos tbody');
    tb.innerHTML = (db.veiculos || [])
      .map(
        (x) => `
      <tr>
        <td><strong>${x.placa}</strong></td>
        <td>${x.marca} ${x.modelo}</td>
        <td>${x.ano}</td>
        <td>${x.autonomiaKm} km</td>
        <td>${(x.quilometragem || 0).toLocaleString('pt-BR')}</td>
        <td><span class="badge badge-${x.status === 'disponivel' ? 'ok' : x.status === 'manutencao' ? 'warn' : 'ok'}">${x.status}</span></td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" data-edit-v="${x.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-del-v="${x.id}">Excluir</button>
        </td>
      </tr>`
      )
      .join('');

    tb.querySelectorAll('[data-edit-v]').forEach((b) =>
      b.addEventListener('click', () => editVeiculo(b.dataset.editV))
    );
    tb.querySelectorAll('[data-del-v]').forEach((b) =>
      b.addEventListener('click', () => delVeiculo(b.dataset.delV))
    );
  }

  document.getElementById('btn-novo-veiculo').addEventListener('click', () => editVeiculo(null));

  function editVeiculo(id) {
    const x = id ? db.veiculos.find((v) => v.id === id) : {};
    openModal(id ? 'Editar Veículo' : 'Novo Veículo', formVeiculo(x, id));
    modalBody.querySelector('#f-veiculo').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const o = {
        placa: fd.get('placa'),
        marca: fd.get('marca'),
        modelo: fd.get('modelo'),
        ano: +fd.get('ano'),
        cor: fd.get('cor'),
        categoria: fd.get('categoria'),
        autonomiaKm: +fd.get('autonomiaKm'),
        quilometragem: +fd.get('quilometragem'),
        valorAquisicao: +fd.get('valorAquisicao'),
        dataAquisicao: fd.get('dataAquisicao'),
        status: fd.get('status'),
        tipo: 'elétrico',
      };
      if (id) {
        const i = db.veiculos.findIndex((v) => v.id === id);
        db.veiculos[i] = { ...db.veiculos[i], ...o };
      } else {
        o.id = uid('v');
        db.veiculos.push(o);
      }
      closeModal();
      persist();
    });
  }

  function formVeiculo(x, id) {
    return `
      <form id="f-veiculo">
        <div class="form-group"><label>Placa</label><input name="placa" required value="${x.placa || ''}" /></div>
        <div class="form-row">
          <div class="form-group"><label>Marca</label><input name="marca" required value="${x.marca || ''}" /></div>
          <div class="form-group"><label>Modelo</label><input name="modelo" required value="${x.modelo || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Ano</label><input type="number" name="ano" value="${x.ano || new Date().getFullYear()}" /></div>
          <div class="form-group"><label>Cor</label><input name="cor" value="${x.cor || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Autonomia (km)</label><input type="number" name="autonomiaKm" value="${x.autonomiaKm || 400}" /></div>
          <div class="form-group"><label>Quilometragem</label><input type="number" name="quilometragem" value="${x.quilometragem || 0}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Valor aquisição (R$)</label><input type="number" step="0.01" name="valorAquisicao" value="${x.valorAquisicao || 0}" /></div>
          <div class="form-group"><label>Data aquisição</label><input type="date" name="dataAquisicao" value="${x.dataAquisicao || new Date().toISOString().slice(0, 10)}" /></div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="disponivel" ${x.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
            <option value="em_locacao" ${x.status === 'em_locacao' ? 'selected' : ''}>Em Locação</option>
            <option value="manutencao" ${x.status === 'manutencao' ? 'selected' : ''}>Manutenção</option>
          </select>
        </div>
        <div class="form-group"><label>Categoria</label><input name="categoria" value="${x.categoria || 'compacto'}" /></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>`;
  }

  function delVeiculo(id) {
    if (!confirm('Excluir veículo?')) return;
    db.veiculos = db.veiculos.filter((v) => v.id !== id);
    persist();
  }

  function renderClientes() {
    const tb = document.querySelector('#tbl-clientes tbody');
    tb.innerHTML = (db.clientes || [])
      .map(
        (x) => `
      <tr>
        <td><strong>${x.nome || x.razaoSocial}</strong></td>
        <td>${x.tipo === 'pf' ? 'PF' : 'PJ'}</td>
        <td>${x.cpf || x.cnpj || '—'}</td>
        <td>${x.telefone || x.email || '—'}</td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" data-edit-c="${x.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-del-c="${x.id}">Excluir</button>
        </td>
      </tr>`
      )
      .join('');
    tb.querySelectorAll('[data-edit-c]').forEach((b) => b.addEventListener('click', () => editCliente(b.dataset.editC)));
    tb.querySelectorAll('[data-del-c]').forEach((b) => b.addEventListener('click', () => delCliente(b.dataset.delC)));
  }

  document.getElementById('btn-novo-cliente').addEventListener('click', () => editCliente(null));

  function editCliente(id) {
    const x = id ? db.clientes.find((c) => c.id === id) : { tipo: 'pf', endereco: {} };
    openModal(id ? 'Editar Cliente' : 'Novo Cliente', formCliente(x, id));
    modalBody.querySelector('#f-cliente').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const o = {
        tipo: fd.get('tipo'),
        nome: fd.get('nome'),
        razaoSocial: fd.get('razaoSocial'),
        cpf: fd.get('cpf'),
        cnpj: fd.get('cnpj'),
        email: fd.get('email'),
        telefone: fd.get('telefone'),
        scoreCredito: +fd.get('scoreCredito'),
        limiteCredito: +fd.get('limiteCredito'),
        status: 'ativo',
        endereco: { cidade: fd.get('cidade'), uf: fd.get('uf') },
      };
      if (id) {
        const i = db.clientes.findIndex((c) => c.id === id);
        db.clientes[i] = { ...db.clientes[i], ...o };
      } else {
        o.id = uid('c');
        db.clientes.push(o);
      }
      closeModal();
      persist();
    });
  }

  function formCliente(x, id) {
    return `
      <form id="f-cliente">
        <div class="form-group">
          <label>Tipo</label>
          <select name="tipo" id="tipo-cli">
            <option value="pf" ${x.tipo === 'pf' ? 'selected' : ''}>Pessoa Física</option>
            <option value="pj" ${x.tipo === 'pj' ? 'selected' : ''}>Pessoa Jurídica</option>
          </select>
        </div>
        <div class="form-group"><label>Nome / Razão Social</label><input name="nome" value="${x.nome || ''}" /></div>
        <div class="form-group"><label>Razão Social (PJ)</label><input name="razaoSocial" value="${x.razaoSocial || ''}" /></div>
        <div class="form-row">
          <div class="form-group"><label>CPF</label><input name="cpf" value="${x.cpf || ''}" /></div>
          <div class="form-group"><label>CNPJ</label><input name="cnpj" value="${x.cnpj || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Email</label><input name="email" type="email" value="${x.email || ''}" /></div>
          <div class="form-group"><label>Telefone</label><input name="telefone" value="${x.telefone || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Score</label><input type="number" name="scoreCredito" value="${x.scoreCredito || 0}" /></div>
          <div class="form-group"><label>Limite crédito</label><input type="number" name="limiteCredito" value="${x.limiteCredito || 0}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Cidade</label><input name="cidade" value="${(x.endereco && x.endereco.cidade) || ''}" /></div>
          <div class="form-group"><label>UF</label><input name="uf" maxlength="2" value="${(x.endereco && x.endereco.uf) || ''}" /></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>`;
  }

  function delCliente(id) {
    if (!confirm('Excluir cliente?')) return;
    db.clientes = db.clientes.filter((c) => c.id !== id);
    persist();
  }

  function renderMotoristas() {
    const tb = document.querySelector('#tbl-motoristas tbody');
    tb.innerHTML = (db.motoristas || [])
      .map(
        (x) => `
      <tr>
        <td><strong>${x.nome}</strong></td>
        <td>${x.cnh || '—'}</td>
        <td>${x.totalViagens || 0}</td>
        <td>${((x.indiceAcidentes || 0) * 100).toFixed(2)}%</td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" data-edit-m="${x.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-del-m="${x.id}">Excluir</button>
        </td>
      </tr>`
      )
      .join('');
    tb.querySelectorAll('[data-edit-m]').forEach((b) => b.addEventListener('click', () => editMotorista(b.dataset.editM)));
    tb.querySelectorAll('[data-del-m]').forEach((b) => b.addEventListener('click', () => delMotorista(b.dataset.delM)));
  }

  document.getElementById('btn-novo-motorista').addEventListener('click', () => editMotorista(null));

  function editMotorista(id) {
    const x = id ? db.motoristas.find((m) => m.id === id) : {};
    const opts = (db.clientes || []).map((c) => `<option value="${c.id}" ${x.clienteId === c.id ? 'selected' : ''}>${c.nome || c.razaoSocial}</option>`).join('');
    openModal(id ? 'Editar Motorista' : 'Novo Motorista', `
      <form id="f-mot">
        <div class="form-group"><label>Nome</label><input name="nome" required value="${x.nome || ''}" /></div>
        <div class="form-row">
          <div class="form-group"><label>CNH</label><input name="cnh" value="${x.cnh || ''}" /></div>
          <div class="form-group"><label>Telefone</label><input name="telefone" value="${x.telefone || ''}" /></div>
        </div>
        <div class="form-group"><label>Cliente</label><select name="clienteId"><option value="">—</option>${opts}</select></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>`);
    modalBody.querySelector('#f-mot').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const o = {
        nome: fd.get('nome'),
        cnh: fd.get('cnh'),
        telefone: fd.get('telefone'),
        clienteId: fd.get('clienteId') || '',
        status: 'ativo',
        totalViagens: x.totalViagens || 0,
        totalAcidentes: x.totalAcidentes || 0,
        indiceAcidentes: x.indiceAcidentes || 0,
        avaliacaoMedia: x.avaliacaoMedia || 0,
      };
      if (id) {
        const i = db.motoristas.findIndex((m) => m.id === id);
        db.motoristas[i] = { ...db.motoristas[i], ...o };
      } else {
        o.id = uid('m');
        db.motoristas.push(o);
      }
      closeModal();
      persist();
    });
  }

  function delMotorista(id) {
    if (!confirm('Excluir motorista?')) return;
    db.motoristas = db.motoristas.filter((m) => m.id !== id);
    persist();
  }

  function renderContratos() {
    const tb = document.querySelector('#tbl-contratos tbody');
    const nomeC = (id) => (db.clientes || []).find((c) => c.id === id)?.nome || id;
    const placaV = (id) => (db.veiculos || []).find((v) => v.id === id)?.placa || id;
    tb.innerHTML = (db.contratos || [])
      .map(
        (x) => `
      <tr>
        <td><strong>${x.numero || x.id}</strong></td>
        <td>${nomeC(x.clienteId)}</td>
        <td>${placaV(x.veiculoId)}</td>
        <td>${fmtMoney(x.valorMensal || x.valorDiario)}</td>
        <td><span class="badge badge-ok">${x.status}</span></td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" data-edit-ct="${x.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-del-ct="${x.id}">Excluir</button>
        </td>
      </tr>`
      )
      .join('');
    tb.querySelectorAll('[data-edit-ct]').forEach((b) => b.addEventListener('click', () => editContrato(b.dataset.editCt)));
    tb.querySelectorAll('[data-del-ct]').forEach((b) => b.addEventListener('click', () => delContrato(b.dataset.delCt)));
  }

  document.getElementById('btn-novo-contrato').addEventListener('click', () => editContrato(null));

  function editContrato(id) {
    const x = id ? db.contratos.find((c) => c.id === id) : {};
    const oc = (db.clientes || []).map((c) => `<option value="${c.id}" ${x.clienteId === c.id ? 'selected' : ''}>${c.nome || c.razaoSocial}</option>`).join('');
    const ov = (db.veiculos || []).map((v) => `<option value="${v.id}" ${x.veiculoId === v.id ? 'selected' : ''}>${v.placa}</option>`).join('');
    const om = (db.motoristas || []).map((m) => `<option value="${m.id}" ${x.motoristaId === m.id ? 'selected' : ''}>${m.nome}</option>`).join('');
    openModal(id ? 'Editar Contrato' : 'Novo Contrato', `
      <form id="f-ct">
        <div class="form-group"><label>Cliente</label><select name="clienteId" required><option value="">—</option>${oc}</select></div>
        <div class="form-group"><label>Veículo</label><select name="veiculoId" required><option value="">—</option>${ov}</select></div>
        <div class="form-group"><label>Motorista</label><select name="motoristaId"><option value="">—</option>${om}</select></div>
        <div class="form-row">
          <div class="form-group"><label>Valor mensal</label><input type="number" step="0.01" name="valorMensal" value="${x.valorMensal || 0}" /></div>
          <div class="form-group"><label>Data início</label><input type="date" name="dataInicio" value="${x.dataInicio || ''}" /></div>
        </div>
        <div class="form-group"><label>Status</label><select name="status"><option value="ativo" ${x.status === 'ativo' ? 'selected' : ''}>Ativo</option><option value="finalizado">Finalizado</option></select></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>`);
    modalBody.querySelector('#f-ct').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const o = {
        clienteId: fd.get('clienteId'),
        veiculoId: fd.get('veiculoId'),
        motoristaId: fd.get('motoristaId') || '',
        valorMensal: +fd.get('valorMensal'),
        dataInicio: fd.get('dataInicio'),
        status: fd.get('status'),
        tipoContrato: 'mensal',
        plano: 'km_livre',
      };
      if (id) {
        const i = db.contratos.findIndex((c) => c.id === id);
        db.contratos[i] = { ...db.contratos[i], ...o };
      } else {
        o.id = 'C' + Date.now().toString(36);
        o.numero = new Date().getFullYear() + '/' + String((db.contratos || []).length + 1).padStart(3, '0');
        db.contratos.push(o);
      }
      closeModal();
      persist();
    });
  }

  function delContrato(id) {
    if (!confirm('Excluir contrato?')) return;
    db.contratos = db.contratos.filter((c) => c.id !== id);
    persist();
  }

  function renderManutencoes() {
    const tb = document.querySelector('#tbl-manutencoes tbody');
    const placa = (id) => (db.veiculos || []).find((v) => v.id === id)?.placa || id;
    tb.innerHTML = (db.manutencoes || [])
      .map(
        (x) => `
      <tr>
        <td>${placa(x.veiculoId)}</td>
        <td>${x.descricao}</td>
        <td>${fmtDate(x.dataAgendada)}</td>
        <td>${fmtMoney(x.custoReal || x.custoEstimado)}</td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" data-edit-man="${x.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-del-man="${x.id}">Excluir</button>
        </td>
      </tr>`
      )
      .join('');
    tb.querySelectorAll('[data-edit-man]').forEach((b) => b.addEventListener('click', () => editManut(b.dataset.editMan)));
    tb.querySelectorAll('[data-del-man]').forEach((b) => b.addEventListener('click', () => delManut(b.dataset.delMan)));
  }

  document.getElementById('btn-nova-manut').addEventListener('click', () => editManut(null));

  function editManut(id) {
    const x = id ? db.manutencoes.find((m) => m.id === id) : {};
    const ov = (db.veiculos || []).map((v) => `<option value="${v.id}" ${x.veiculoId === v.id ? 'selected' : ''}>${v.placa}</option>`).join('');
    openModal(id ? 'Editar Manutenção' : 'Nova Manutenção', `
      <form id="f-man">
        <div class="form-group"><label>Veículo</label><select name="veiculoId" required><option value="">—</option>${ov}</select></div>
        <div class="form-group"><label>Descrição</label><input name="descricao" required value="${x.descricao || ''}" /></div>
        <div class="form-row">
          <div class="form-group"><label>Data agendada</label><input type="date" name="dataAgendada" value="${x.dataAgendada || ''}" /></div>
          <div class="form-group"><label>Custo estimado</label><input type="number" step="0.01" name="custoEstimado" value="${x.custoEstimado || 0}" /></div>
        </div>
        <div class="form-group"><label>Status</label><select name="status"><option value="agendada">Agendada</option><option value="concluida">Concluída</option></select></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>`);
    if (x.status) modalBody.querySelector('select[name="status"]').value = x.status;
    modalBody.querySelector('#f-man').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const o = {
        veiculoId: fd.get('veiculoId'),
        descricao: fd.get('descricao'),
        dataAgendada: fd.get('dataAgendada'),
        custoEstimado: +fd.get('custoEstimado'),
        status: fd.get('status'),
        tipo: 'preventiva',
      };
      if (id) {
        const i = db.manutencoes.findIndex((m) => m.id === id);
        db.manutencoes[i] = { ...db.manutencoes[i], ...o };
      } else {
        o.id = uid('man');
        db.manutencoes.push(o);
      }
      closeModal();
      persist();
    });
  }

  function delManut(id) {
    if (!confirm('Excluir?')) return;
    db.manutencoes = db.manutencoes.filter((m) => m.id !== id);
    persist();
  }

  function renderAcidentes() {
    const tb = document.querySelector('#tbl-acidentes tbody');
    const placa = (id) => (db.veiculos || []).find((v) => v.id === id)?.placa || id;
    tb.innerHTML = (db.acidentes || [])
      .map(
        (x) => `
      <tr>
        <td>${fmtDate(x.dataOcorrencia)}</td>
        <td>${placa(x.veiculoId)}</td>
        <td>${x.descricao?.slice(0, 40) || '—'}...</td>
        <td>${fmtMoney(x.custoEstimado)}</td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" data-edit-a="${x.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-del-a="${x.id}">Excluir</button>
        </td>
      </tr>`
      )
      .join('');
    tb.querySelectorAll('[data-edit-a]').forEach((b) => b.addEventListener('click', () => editAcidente(b.dataset.editA)));
    tb.querySelectorAll('[data-del-a]').forEach((b) => b.addEventListener('click', () => delAcidente(b.dataset.delA)));
  }

  document.getElementById('btn-novo-acidente').addEventListener('click', () => editAcidente(null));

  function editAcidente(id) {
    const x = id ? db.acidentes.find((a) => a.id === id) : {};
    const ov = (db.veiculos || []).map((v) => `<option value="${v.id}" ${x.veiculoId === v.id ? 'selected' : ''}>${v.placa}</option>`).join('');
    const om = (db.motoristas || []).map((m) => `<option value="${m.id}" ${x.motoristaId === m.id ? 'selected' : ''}>${m.nome}</option>`).join('');
    openModal(id ? 'Editar Acidente' : 'Registrar Acidente', `
      <form id="f-ac">
        <div class="form-group"><label>Veículo</label><select name="veiculoId" required><option value="">—</option>${ov}</select></div>
        <div class="form-group"><label>Motorista</label><select name="motoristaId"><option value="">—</option>${om}</select></div>
        <div class="form-group"><label>Data</label><input type="date" name="dataOcorrencia" value="${x.dataOcorrencia || new Date().toISOString().slice(0, 10)}" /></div>
        <div class="form-group"><label>Descrição</label><textarea name="descricao" rows="3">${x.descricao || ''}</textarea></div>
        <div class="form-group"><label>Custo estimado</label><input type="number" step="0.01" name="custoEstimado" value="${x.custoEstimado || 0}" /></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>`);
    modalBody.querySelector('#f-ac').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const o = {
        veiculoId: fd.get('veiculoId'),
        motoristaId: fd.get('motoristaId') || '',
        dataOcorrencia: fd.get('dataOcorrencia'),
        descricao: fd.get('descricao'),
        custoEstimado: +fd.get('custoEstimado'),
        gravidade: 'leve',
        status: 'aberto',
      };
      if (id) {
        const i = db.acidentes.findIndex((a) => a.id === id);
        db.acidentes[i] = { ...db.acidentes[i], ...o };
      } else {
        o.id = uid('acc');
        db.acidentes.push(o);
      }
      closeModal();
      persist();
    });
  }

  function delAcidente(id) {
    if (!confirm('Excluir?')) return;
    db.acidentes = db.acidentes.filter((a) => a.id !== id);
    persist();
  }

  function renderPagamentos() {
    const tb = document.querySelector('#tbl-pagamentos tbody');
    tb.innerHTML = (db.pagamentos || [])
      .map(
        (x) => `
      <tr>
        <td>${x.contratoId}</td>
        <td>${fmtMoney(x.valor)}</td>
        <td>${fmtDate(x.dataVencimento)}</td>
        <td><span class="badge ${x.status === 'pago' ? 'badge-ok' : 'badge-warn'}">${x.status}</span></td>
        <td class="actions">
          ${x.status !== 'pago' ? `<button class="btn btn-sm btn-primary" data-pago="${x.id}">Pago</button>` : ''}
          <button class="btn btn-sm btn-secondary" data-edit-p="${x.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-del-p="${x.id}">Excluir</button>
        </td>
      </tr>`
      )
      .join('');
    tb.querySelectorAll('[data-pago]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = db.pagamentos.find((x) => x.id === b.dataset.pago);
        if (p) {
          p.status = 'pago';
          p.dataPagamento = new Date().toISOString().slice(0, 10);
          persist();
        }
      })
    );
    tb.querySelectorAll('[data-edit-p]').forEach((b) => b.addEventListener('click', () => editPagamento(b.dataset.editP)));
    tb.querySelectorAll('[data-del-p]').forEach((b) => b.addEventListener('click', () => delPagamento(b.dataset.delP)));
  }

  document.getElementById('btn-novo-pagamento').addEventListener('click', () => editPagamento(null));

  function editPagamento(id) {
    const x = id ? db.pagamentos.find((p) => p.id === id) : {};
    const oc = (db.contratos || []).map((c) => `<option value="${c.id}" ${x.contratoId === c.id ? 'selected' : ''}>${c.numero || c.id}</option>`).join('');
    openModal(id ? 'Editar Pagamento' : 'Novo Pagamento', `
      <form id="f-pg">
        <div class="form-group"><label>Contrato</label><select name="contratoId" required><option value="">—</option>${oc}</select></div>
        <div class="form-row">
          <div class="form-group"><label>Valor</label><input type="number" step="0.01" name="valor" required value="${x.valor || 0}" /></div>
          <div class="form-group"><label>Vencimento</label><input type="date" name="dataVencimento" value="${x.dataVencimento || ''}" /></div>
        </div>
        <div class="form-group"><label>Status</label><select name="status"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>`);
    if (x.status) modalBody.querySelector('select[name="status"]').value = x.status;
    modalBody.querySelector('#f-pg').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const o = {
        contratoId: fd.get('contratoId'),
        valor: +fd.get('valor'),
        dataVencimento: fd.get('dataVencimento'),
        status: fd.get('status'),
        tipo: 'mensalidade',
        formaPagamento: 'pix',
      };
      if (id) {
        const i = db.pagamentos.findIndex((p) => p.id === id);
        db.pagamentos[i] = { ...db.pagamentos[i], ...o };
      } else {
        o.id = uid('pag');
        db.pagamentos.push(o);
      }
      closeModal();
      persist();
    });
  }

  function delPagamento(id) {
    if (!confirm('Excluir?')) return;
    db.pagamentos = db.pagamentos.filter((p) => p.id !== id);
    persist();
  }

  // ---------- Relatórios ----------
  let relTab = 'rent';

  function renderRelatorios() {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('on', t.dataset.rel === relTab);
      t.onclick = () => {
        relTab = t.dataset.rel;
        renderRelatorios();
      };
    });

    const box = document.getElementById('rel-content');
    const v = db.veiculos || [];
    const p = db.pagamentos || [];
    const m = db.manutencoes || [];
    const a = db.acidentes || [];
    const c = db.contratos || [];

    if (relTab === 'rent') {
      let rows = '';
      v.forEach((ve) => {
        const contr = c.filter((x) => x.veiculoId === ve.id);
        const receita = p
          .filter((x) => contr.some((ct) => ct.id === x.contratoId) && x.status === 'pago')
          .reduce((s, x) => s + (x.valor || 0), 0);
        const custoMan = m.filter((x) => x.veiculoId === ve.id).reduce((s, x) => s + (x.custoReal || x.custoEstimado || 0), 0);
        const custoDep = depOn ? depTotalVeiculo(ve) : 0;
        const res = receita - custoMan - custoDep;
        rows += `<tr>
          <td>${ve.marca} ${ve.modelo}</td>
          <td><strong>${ve.placa}</strong></td>
          <td>${fmtMoney(receita)}</td>
          <td>${fmtMoney(custoMan)}</td>
          ${depOn ? `<td>${fmtMoney(custoDep)}</td>` : ''}
          <td class="${res >= 0 ? 'pos' : 'neg'}">${fmtMoney(res)}</td>
        </tr>`;
      });
      box.innerHTML = `
        ${depOn ? '<p class="hint">Depreciação linear 4 anos, 15% residual (acumulada desde aquisição)</p>' : ''}
        <div class="table-wrap"><table class="data"><thead><tr>
          <th>Veículo</th><th>Placa</th><th>Receita</th><th>Manutenção</th>${depOn ? '<th>Depreciação</th>' : ''}<th>Resultado</th>
        </tr></thead><tbody>${rows}</tbody></table></div>`;
      return;
    }

    if (relTab === 'dre') {
      const hoje = new Date();
      const mes = hoje.getMonth() + 1;
      const ano = hoje.getFullYear();
      const receita = p
        .filter((x) => {
          if (x.status !== 'pago' || !x.dataPagamento) return false;
          const d = new Date(x.dataPagamento);
          return d.getMonth() + 1 === mes && d.getFullYear() === ano;
        })
        .reduce((s, x) => s + (x.valor || 0), 0);
      const custoMan = m
        .filter((x) => {
          if (!x.dataRealizada) return false;
          const d = new Date(x.dataRealizada);
          return d.getMonth() + 1 === mes && d.getFullYear() === ano;
        })
        .reduce((s, x) => s + (x.custoReal || x.custoEstimado || 0), 0);
      const custoAcc = a
        .filter((x) => {
          const d = new Date(x.dataOcorrencia);
          return d.getMonth() + 1 === mes && d.getFullYear() === ano;
        })
        .reduce((s, x) => s + (x.custoEstimado || 0), 0);
      const custoDep = depOn ? depMesTotal(v, mes, ano) : 0;
      const total = custoMan + custoAcc + custoDep;
      const resultado = receita - total;
      box.innerHTML = `
        <div class="dre-block">
          ${depOn ? '<p class="hint">Inclui depreciação do mês (4 anos, 15% residual)</p>' : ''}
          <div class="dre-row"><span>Receita</span><span class="pos">${fmtMoney(receita)}</span></div>
          <div class="dre-row"><span>Manutenção</span><span class="neg">(${fmtMoney(custoMan)})</span></div>
          <div class="dre-row"><span>Acidentes</span><span class="neg">(${fmtMoney(custoAcc)})</span></div>
          ${depOn ? `<div class="dre-row"><span>Depreciação</span><span class="neg">(${fmtMoney(custoDep)})</span></div>` : ''}
          <div class="dre-row total"><span>Resultado</span><span class="${resultado >= 0 ? 'pos' : 'neg'}">${fmtMoney(resultado)}</span></div>
          <p style="color:var(--muted);font-size:0.85rem;margin-top:0.75rem">Mês ${mes}/${ano}</p>
        </div>`;
      return;
    }

    box.innerHTML = '<p class="hint">Use as abas Rentabilidade ou DRE para análise com/sem depreciação.</p>';
  }

  function renderAll() {
    const active = document.querySelector('.page.active');
    if (!active) return;
    const id = active.id.replace('page-', '');
    if (id === 'dashboard') renderDashboard();
    if (id === 'veiculos') renderVeiculos();
    if (id === 'clientes') renderClientes();
    if (id === 'motoristas') renderMotoristas();
    if (id === 'contratos') renderContratos();
    if (id === 'manutencoes') renderManutencoes();
    if (id === 'acidentes') renderAcidentes();
    if (id === 'pagamentos') renderPagamentos();
    if (id === 'relatorios') renderRelatorios();
  }

  showPage('dashboard');
  renderAll();
})();
