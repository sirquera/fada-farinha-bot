// Central de Pedidos Fada Farinha
// Lê as mensagens que o cardápio digital gera ("✅ PEDIDO CONFIRMADO" / "🟡 SÓ ORÇAMENTO")
// e guarda numa lista única, com a loja, o cliente, os itens e a situação.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ARQ = path.join(DATA_DIR, 'pedidos.json');

// Situações possíveis de um pedido na central
const SITUACOES = ['orcamento', 'pedido', 'sinal_pago', 'comanda_criada', 'impresso', 'entregue', 'cancelado'];

function carregar() {
  try { return JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) { return []; }
}
function salvar(lista) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = ARQ + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(lista, null, 2));
  fs.renameSync(tmp, ARQ);
}

const limpa = (s) => String(s || '').replace(/\*/g, '').replace(/_/g, '').trim();
const reais = (s) => {
  const m = String(s || '').match(/R\$\s*([\d.]+,\d{2})/);
  return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : null;
};

// Reconhece uma mensagem do cardápio. Devolve null se não for uma.
function lerMensagemCardapio(texto) {
  const t = String(texto || '');
  const num = t.match(/(Pedido|Orçamento) Nº\s*(FF-[A-Z]+-\d{6}-[A-Z0-9-]+)/);
  if (!num) return null;
  // Só é pedido quando o cliente marcou "Pedido confirmado"; mensagens antigas sem a marca contam como orçamento
  const ehPedido = /PEDIDO CONFIRMADO/.test(t);
  const linhas = t.split('\n').map((l) => l.trim());
  const acha = (re) => { const l = linhas.find((x) => re.test(limpa(x))); return l ? limpa(l) : ''; };

  const cli = acha(/^Cliente:/);
  const cliM = cli.match(/^Cliente:\s*(.*?)(?:\s·\s(\(?\d[\d() -]+\d))?\s·\senviado em\s*(.*)$/);
  const loja = (acha(/^Loja:/).match(/Fada Farinha\s+(.*)$/) || [])[1] || '';
  const para = acha(/^Para:/).replace(/^Para:\s*/, '');
  const itens = linhas.filter((l) => /^•/.test(l)).map((l) => limpa(l.replace(/^•\s*/, '')));
  const total = reais(acha(/^Total estimado/));
  const entrega = /Entrega por Uber/.test(t);
  const end = entrega ? acha(/^Endereço:/).replace(/^Endereço:\s*/, '') : '';
  const obs = acha(/^Obs\.:/).replace(/^Obs\.:\s*/, '');
  const quem = acha(/^Quem vai (retirar|receber):/);

  return {
    numero: num[2],
    tipo: ehPedido ? 'pedido' : 'orcamento',
    loja: loja.trim(),
    cliente: cliM ? cliM[1].trim() : cli.replace(/^Cliente:\s*/, ''),
    telefone_informado: cliM && cliM[2] ? cliM[2].trim() : '',
    enviado_em: cliM ? cliM[3].trim() : '',
    para,
    retirada: entrega ? 'entrega' : 'retirada',
    endereco: end,
    quem,
    itens,
    total_estimado: total,
    sinal: reais((linhas.find((l) => /^Sinal:/.test(limpa(l))) || '')),
    obs,
  };
}

// Registra uma mensagem recebida. Devolve o pedido criado/atualizado, ou null.
function registrarMensagem({ loja_instancia, telefone, nome_whats, texto, imagem, quando }) {
  const lista = carregar();
  const agora = new Date(quando || Date.now()).toISOString();
  const lido = lerMensagemCardapio(texto);

  if (lido) {
    let p = lista.find((x) => x.numero === lido.numero);
    if (!p) {
      p = { id: lido.numero, criado_em: agora, historico: [] };
      lista.push(p);
    }
    Object.assign(p, lido, {
      loja: lido.loja || loja_instancia || '',
      loja_instancia: loja_instancia || '',
      telefone_whats: telefone,
      nome_whats: nome_whats || '',
      atualizado_em: agora,
      texto_original: texto,
    });
    if (!p.situacao || p.situacao === 'orcamento') p.situacao = lido.tipo;
    p.historico.push({ em: agora, evento: 'mensagem_cardapio', tipo: lido.tipo });
    salvar(lista);
    return p;
  }

  // Imagem de um cliente com pedido aberto: provável comprovante do Pix
  if (imagem) {
    const aberto = lista
      .filter((x) => x.telefone_whats === telefone && ['orcamento', 'pedido'].includes(x.situacao))
      .sort((a, b) => (a.atualizado_em < b.atualizado_em ? 1 : -1))[0];
    if (aberto) {
      aberto.anexos = aberto.anexos || [];
      aberto.anexos.push({ em: agora, url: imagem.url, legenda: imagem.legenda || '' });
      aberto.comprovante_a_conferir = true;
      aberto.atualizado_em = agora;
      aberto.historico.push({ em: agora, evento: 'imagem_recebida' });
      salvar(lista);
      return aberto;
    }
  }
  return null;
}

function listar({ loja, situacao, desde } = {}) {
  return carregar()
    .filter((p) => !loja || (p.loja || '').toLowerCase() === String(loja).toLowerCase())
    .filter((p) => !situacao || p.situacao === situacao)
    .filter((p) => !desde || (p.atualizado_em || '') >= desde)
    .sort((a, b) => (a.atualizado_em < b.atualizado_em ? 1 : -1));
}

function atualizar(id, mudancas) {
  const lista = carregar();
  const p = lista.find((x) => x.id === id);
  if (!p) return null;
  const permitidos = ['situacao', 'comanda', 'sinal_conferido', 'comprovante_a_conferir', 'observacao_loja', 'impresso_vias'];
  if (mudancas.situacao && !SITUACOES.includes(mudancas.situacao)) throw new Error('situacao invalida');
  const agora = new Date().toISOString();
  for (const k of permitidos) if (k in mudancas) p[k] = mudancas[k];
  p.atualizado_em = agora;
  p.historico.push({ em: agora, evento: 'atualizado', mudancas });
  salvar(lista);
  return p;
}

module.exports = { lerMensagemCardapio, registrarMensagem, listar, atualizar, SITUACOES };
