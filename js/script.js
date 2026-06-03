if (!localStorage.getItem('produtos')) {
    const produtosIniciais = [
        {
            id: 1,
            nome: 'Arroz',
            codigo: 'P001',
            categoria: 'Alimentos',
            quantidade: 20,
            preco: 6.50,
            dataCadastro: '2026-06-02'
        },
        {
            id: 2,
            nome: 'Feijão',
            codigo: 'P002',
            categoria: 'Alimentos',
            quantidade: 3,
            preco: 8.90,
            dataCadastro: '2026-06-02'
        },
        {
            id: 3,
            nome: 'Refrigerante',
            codigo: 'P003',
            categoria: 'Bebidas',
            quantidade: 10,
            preco: 7.50,
            dataCadastro: '2026-06-02'
        }
    ];

    localStorage.setItem('produtos', JSON.stringify(produtosIniciais));
}
let produtos = JSON.parse(localStorage.getItem('produtos')) || [];

const form = document.getElementById('formProduto');
const tabela = document.getElementById('tabelaProdutos');
const pesquisa = document.getElementById('pesquisa');
const btnLimpar = document.getElementById('btnLimpar');
const tituloFormulario = document.getElementById('tituloFormulario');

document.getElementById('dataCadastro').valueAsDate = new Date();

function salvarLocalStorage() {
  localStorage.setItem('produtos', JSON.stringify(produtos));
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderizarProdutos(lista = produtos) {
  tabela.innerHTML = '';

  if (lista.length === 0) {
    tabela.innerHTML = '<tr><td colspan="7">Nenhum produto encontrado.</td></tr>';
    atualizarResumo();
    return;
  }

  lista.forEach((produto) => {
    const total = produto.quantidade * produto.preco;
    const estoqueBaixo = produto.quantidade <= 5;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.codigo}</td>
      <td>${produto.categoria}</td>
      <td class="${estoqueBaixo ? 'baixo' : ''}">${produto.quantidade}</td>
      <td>${formatarMoeda(produto.preco)}</td>
      <td>${formatarMoeda(total)}</td>
      <td class="acoes">
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
  const valorTotal = produtos.reduce((soma, p) => soma + (p.quantidade * p.preco), 0);
  const estoqueBaixo = produtos.filter(p => p.quantidade <= 5).length;

  document.getElementById('totalProdutos').textContent = totalProdutos;
  document.getElementById('totalItens').textContent = totalItens;
  document.getElementById('valorTotal').textContent = formatarMoeda(valorTotal);
  document.getElementById('estoqueBaixo').textContent = estoqueBaixo;
}

function limparFormulario() {
  form.reset();
  document.getElementById('produtoId').value = '';
  document.getElementById('dataCadastro').valueAsDate = new Date();
  tituloFormulario.textContent = 'Cadastrar Produto';
}

form.addEventListener('submit', function(event) {
  event.preventDefault();

  const id = document.getElementById('produtoId').value;
  const nome = document.getElementById('nome').value.trim();
  const codigo = document.getElementById('codigo').value.trim();
  const categoria = document.getElementById('categoria').value;
  const quantidade = Number(document.getElementById('quantidade').value);
  const preco = Number(document.getElementById('preco').value);
  const dataCadastro = document.getElementById('dataCadastro').value;

  if (!nome || !codigo || !categoria || quantidade < 0 || preco < 0 || !dataCadastro) {
    Swal.fire('Atenção!', 'Preencha todos os campos corretamente.', 'warning');
    return;
  }

  const codigoExiste = produtos.some(p => p.codigo.toLowerCase() === codigo.toLowerCase() && p.id != id);
  if (codigoExiste) {
    Swal.fire('Código já cadastrado!', 'Informe um código diferente para o produto.', 'error');
    return;
  }

  if (id) {
    const index = produtos.findIndex(p => p.id == id);
    produtos[index] = { id: Number(id), nome, codigo, categoria, quantidade, preco, dataCadastro };
    Swal.fire('Atualizado!', 'Produto atualizado com sucesso.', 'success');
  } else {
    produtos.push({ id: Date.now(), nome, codigo, categoria, quantidade, preco, dataCadastro });
    Swal.fire('Cadastrado!', 'Produto cadastrado com sucesso.', 'success');
  }

  salvarLocalStorage();
  renderizarProdutos();
  limparFormulario();
});

function editarProduto(id) {
  const produto = produtos.find(p => p.id === id);
  document.getElementById('produtoId').value = produto.id;
  document.getElementById('nome').value = produto.nome;
  document.getElementById('codigo').value = produto.codigo;
  document.getElementById('categoria').value = produto.categoria;
  document.getElementById('quantidade').value = produto.quantidade;
  document.getElementById('preco').value = produto.preco;
  document.getElementById('dataCadastro').value = produto.dataCadastro;
  tituloFormulario.textContent = 'Editar Produto';
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
      renderizarProdutos();
      Swal.fire('Excluído!', 'Produto removido com sucesso.', 'success');
    }
  });
}

pesquisa.addEventListener('input', function() {
  const termo = pesquisa.value.toLowerCase();
  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(termo) ||
    p.codigo.toLowerCase().includes(termo)
  );
  renderizarProdutos(filtrados);
});

btnLimpar.addEventListener('click', limparFormulario);
renderizarProdutos();
