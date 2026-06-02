let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
let saidas = JSON.parse(localStorage.getItem('saidas')) || [];

/* ---- Migração de dados antigos (campo único "preco") ---- */
produtos = produtos.map(p => {
  if (p.precoVenda === undefined) {
    return { ...p, precoVenda: p.preco ?? 0, precoCusto: p.precoCusto ?? 0 };
  }
  return p;
});

const form = document.getElementById('formProduto');
const tabela = document.getElementById('tabelaProdutos');
const pesquisa = document.getElementById('pesquisa');
const btnLimpar = document.getElementById('btnLimpar');
const btnHistorico = document.getElementById('btnHistorico');
const tituloFormulario = document.getElementById('tituloFormulario');

const produtoIdEl = document.getElementById('produtoId');
const codigoEl = document.getElementById('codigo');
const categoriaEl = document.getElementById('categoria');
const precoCustoEl = document.getElementById('precoCusto');
const precoVendaEl = document.getElementById('precoVenda');
const margemEl = document.getElementById('margem');

document.getElementById('dataCadastro').valueAsDate = new Date();

function salvarLocalStorage() {
  localStorage.setItem('produtos', JSON.stringify(produtos));
  localStorage.setItem('saidas', JSON.stringify(saidas));
}

function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

/* Margem de lucro sobre o preço de venda: (venda - custo) / venda */
function calcularMargem(custo, venda) {
  if (!venda || venda <= 0) return null;
  return ((venda - custo) / venda) * 100;
}

/* ---- Geração automática de SKU (PREFIXO-0001) ---- */
function gerarSKU(categoria) {
  const prefixo = (categoria || 'GEN')
    .replace(/[^A-Za-zÀ-ÿ]/g, '')
    .substring(0, 3)
    .toUpperCase() || 'GEN';

  const regex = new RegExp('^' + prefixo + '-(\\d+)$');
  let maior = 0;
  produtos.forEach(p => {
    const m = p.codigo && p.codigo.match(regex);
    if (m) maior = Math.max(maior, Number(m[1]));
  });

  return `${prefixo}-${String(maior + 1).padStart(4, '0')}`;
}

/* ---- Margem editável: custo, margem e venda interligados ---- */
function recalcularVendaPelaMargem() {
  const custo = Number(precoCustoEl.value);
  const margem = Number(margemEl.value);
  if (custo > 0 && margem >= 0 && margem < 100) {
    const venda = custo / (1 - margem / 100);
    precoVendaEl.value = venda.toFixed(2);
  }
}

function recalcularMargemPelaVenda() {
  const custo = Number(precoCustoEl.value);
  const venda = Number(precoVendaEl.value);
  if (venda > 0) {
    margemEl.value = (((venda - custo) / venda) * 100).toFixed(1);
  } else {
    margemEl.value = '';
  }
}

precoCustoEl.addEventListener('input', () => {
  if (margemEl.value !== '') recalcularVendaPelaMargem();
  else recalcularMargemPelaVenda();
});
margemEl.addEventListener('input', recalcularVendaPelaMargem);
precoVendaEl.addEventListener('input', recalcularMargemPelaVenda);

/* Gera o SKU automaticamente ao escolher a categoria (somente em novo cadastro) */
categoriaEl.addEventListener('change', () => {
  if (!produtoIdEl.value && categoriaEl.value) {
    codigoEl.value = gerarSKU(categoriaEl.value);
  }
});

function aplicarFiltro() {
  const termo = pesquisa.value.toLowerCase();
  if (!termo) { renderizarProdutos(); return; }
  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(termo) ||
    p.codigo.toLowerCase().includes(termo)
  );
  renderizarProdutos(filtrados);
}

function renderizarProdutos(lista = produtos) {
  tabela.innerHTML = '';

  if (lista.length === 0) {
    tabela.innerHTML = '<tr><td colspan="9">Nenhum produto encontrado.</td></tr>';
    atualizarResumo();
    return;
  }

  lista.forEach((produto) => {
    const total = produto.quantidade * produto.precoVenda;
    const estoqueBaixo = produto.quantidade <= 5;
    const semEstoque = produto.quantidade <= 0;
    const margem = calcularMargem(produto.precoCusto, produto.precoVenda);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.codigo}</td>
      <td>${produto.categoria}</td>
      <td class="${estoqueBaixo ? 'baixo' : ''}">${produto.quantidade}</td>
      <td>${formatarMoeda(produto.precoCusto)}</td>
      <td>${formatarMoeda(produto.precoVenda)}</td>
      <td class="${margem !== null && margem < 0 ? 'baixo' : 'margem'}">${margem === null ? '—' : margem.toFixed(1) + '%'}</td>
      <td>${formatarMoeda(total)}</td>
      <td class="acoes">
        <button class="btn-saida" onclick="registrarSaida(${produto.id})" ${semEstoque ? 'disabled' : ''}>Saída</button>
        <button class="btn-editar" onclick="editarProduto(${produto.id})">Editar</button>
        <button class="btn-excluir" onclick="excluirProduto(${produto.id})">Excluir</button>
      </td>
    `;
    tabela.appendChild(tr);
  });

  atualizarResumo();
}

function atualizarResumo() {
  const totalProdutos = produtos.length;
  const totalItens = produtos.reduce((soma, p) => soma + p.quantidade, 0);
  const valorTotal = produtos.reduce((soma, p) => soma + (p.quantidade * p.precoVenda), 0);
  const estoqueBaixo = produtos.filter(p => p.quantidade <= 5).length;

  document.getElementById('totalProdutos').textContent = totalProdutos;
  document.getElementById('totalItens').textContent = totalItens;
  document.getElementById('valorTotal').textContent = formatarMoeda(valorTotal);
  document.getElementById('estoqueBaixo').textContent = estoqueBaixo;
}

function limparFormulario() {
  form.reset();
  produtoIdEl.value = '';
  codigoEl.value = '';
  margemEl.value = '';
  document.getElementById('dataCadastro').valueAsDate = new Date();
  tituloFormulario.textContent = 'Cadastrar Produto';
}

form.addEventListener('submit', function(event) {
  event.preventDefault();

  const id = produtoIdEl.value;
  const nome = document.getElementById('nome').value.trim();
  const categoria = categoriaEl.value;
  const quantidade = Number(document.getElementById('quantidade').value);
  const precoCusto = Number(precoCustoEl.value);
  const precoVenda = Number(precoVendaEl.value);
  const dataCadastro = document.getElementById('dataCadastro').value;

  if (!nome || !categoria || quantidade < 0 || precoCusto < 0 || precoVenda < 0 || !dataCadastro) {
    Swal.fire('Atenção!', 'Preencha todos os campos corretamente.', 'warning');
    return;
  }

  if (precoVenda < precoCusto) {
    Swal.fire('Verifique os preços', 'O preço de venda está menor que o preço de custo (prejuízo).', 'warning');
  }

  // Código: gerado automaticamente em novo cadastro; preservado na edição
  let codigo;
  if (id) {
    codigo = codigoEl.value.trim();
  } else {
    codigo = gerarSKU(categoria);
    codigoEl.value = codigo;
  }

  if (id) {
    const index = produtos.findIndex(p => p.id == id);
    produtos[index] = { id: Number(id), nome, codigo, categoria, quantidade, precoCusto, precoVenda, dataCadastro };
    Swal.fire('Atualizado!', 'Produto atualizado com sucesso.', 'success');
  } else {
    produtos.push({ id: Date.now(), nome, codigo, categoria, quantidade, precoCusto, precoVenda, dataCadastro });
    Swal.fire('Cadastrado!', `Produto cadastrado com sucesso. SKU: ${codigo}`, 'success');
  }

  salvarLocalStorage();
  aplicarFiltro();
  limparFormulario();
});

function editarProduto(id) {
  const produto = produtos.find(p => p.id === id);
  produtoIdEl.value = produto.id;
  document.getElementById('nome').value = produto.nome;
  codigoEl.value = produto.codigo;
  categoriaEl.value = produto.categoria;
  document.getElementById('quantidade').value = produto.quantidade;
  precoCustoEl.value = produto.precoCusto;
  precoVendaEl.value = produto.precoVenda;
  const margem = calcularMargem(produto.precoCusto, produto.precoVenda);
  margemEl.value = margem === null ? '' : margem.toFixed(1);
  document.getElementById('dataCadastro').value = produto.dataCadastro;
  tituloFormulario.textContent = 'Editar Produto';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirProduto(id) {
  Swal.fire({
    title: 'Excluir produto?',
    text: 'Essa ação removerá o produto do estoque.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar'
  }).then((resultado) => {
    if (resultado.isConfirmed) {
      produtos = produtos.filter(p => p.id !== id);
      salvarLocalStorage();
      aplicarFiltro();
      Swal.fire('Excluído!', 'Produto removido com sucesso.', 'success');
    }
  });
}

/* ---- Saída de mercadorias ---- */
async function registrarSaida(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto || produto.quantidade <= 0) {
    Swal.fire('Sem estoque', 'Este produto não possui quantidade disponível.', 'info');
    return;
  }

  const { value: qtd } = await Swal.fire({
    title: `Saída — ${produto.nome}`,
    input: 'number',
    inputLabel: `Disponível em estoque: ${produto.quantidade}`,
    inputPlaceholder: 'Quantidade que está saindo',
    inputAttributes: { min: 1, max: produto.quantidade, step: 1 },
    showCancelButton: true,
    confirmButtonText: 'Registrar saída',
    cancelButtonText: 'Cancelar',
    inputValidator: (valor) => {
      const n = Number(valor);
      if (!n || n <= 0) return 'Informe uma quantidade válida.';
      if (n > produto.quantidade) return 'Quantidade maior que o estoque disponível.';
      return null;
    }
  });

  if (!qtd) return;

  const saida = Number(qtd);
  produto.quantidade -= saida;

  const totalVenda = saida * produto.precoVenda;
  const lucro = saida * (produto.precoVenda - produto.precoCusto);

  saidas.unshift({
    id: Date.now(),
    produtoId: produto.id,
    nome: produto.nome,
    codigo: produto.codigo,
    quantidade: saida,
    precoVenda: produto.precoVenda,
    totalVenda,
    lucro,
    data: new Date().toISOString()
  });

  salvarLocalStorage();
  aplicarFiltro();

  Swal.fire({
    icon: 'success',
    title: 'Saída registrada!',
    html: `
      <p><strong>${saida}</strong> unidade(s) de <strong>${produto.nome}</strong></p>
      <p>Total da venda: <strong>${formatarMoeda(totalVenda)}</strong></p>
      <p>Lucro: <strong>${formatarMoeda(lucro)}</strong></p>
      <p>Estoque restante: <strong>${produto.quantidade}</strong></p>
    `
  });
}

/* ---- Histórico de saídas ---- */
function verHistorico() {
  if (saidas.length === 0) {
    Swal.fire('Sem registros', 'Nenhuma saída registrada ainda.', 'info');
    return;
  }

  const totalVendido = saidas.reduce((s, m) => s + m.totalVenda, 0);
  const totalLucro = saidas.reduce((s, m) => s + m.lucro, 0);

  const linhas = saidas.map(m => `
    <tr>
      <td style="padding:6px;border-bottom:1px solid #eee;text-align:left">${formatarData(m.data)}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;text-align:left">${m.nome}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${m.quantidade}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${formatarMoeda(m.totalVenda)}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${formatarMoeda(m.lucro)}</td>
    </tr>
  `).join('');

  Swal.fire({
    title: 'Histórico de Saídas',
    width: 760,
    html: `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f0fdfa;color:#134e4a">
              <th style="padding:8px;text-align:left">Data</th>
              <th style="padding:8px;text-align:left">Produto</th>
              <th style="padding:8px;text-align:center">Qtd</th>
              <th style="padding:8px;text-align:right">Total</th>
              <th style="padding:8px;text-align:right">Lucro</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
          <tfoot>
            <tr style="font-weight:bold;background:#f9fafb">
              <td colspan="3" style="padding:8px;text-align:right">Totais:</td>
              <td style="padding:8px;text-align:right">${formatarMoeda(totalVendido)}</td>
              <td style="padding:8px;text-align:right">${formatarMoeda(totalLucro)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Fechar',
    cancelButtonText: 'Limpar histórico',
    confirmButtonColor: '#0f766e'
  }).then((res) => {
    if (res.dismiss === Swal.DismissReason.cancel) {
      Swal.fire({
        title: 'Limpar histórico?',
        text: 'Os registros de saída serão apagados (o estoque não muda).',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, limpar',
        cancelButtonText: 'Cancelar'
      }).then(r => {
        if (r.isConfirmed) {
          saidas = [];
          salvarLocalStorage();
          Swal.fire('Pronto!', 'Histórico limpo.', 'success');
        }
      });
    }
  });
}

pesquisa.addEventListener('input', aplicarFiltro);
btnLimpar.addEventListener('click', limparFormulario);
if (btnHistorico) btnHistorico.addEventListener('click', verHistorico);

renderizarProdutos();
