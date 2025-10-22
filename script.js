const csvUrl = 'https://docs.google.com/spreadsheets/d/1p19xNwYt3VAiFzsN0Sdn8bMALfKjRxCbKd3zTQvYDB4/export?format=csv&gid=463313799';

let currentPage = 1;
const itemsPerPage = 8;
let currentMarca = 'GERAL';
let rcas = [];
let headers = [];

// Mapeamento de colunas desejadas (chaves = marcas)
const COLUNAS_MARCA = {
  'GERAL': '% VENDA',
  'CERRADOFOODS': '% CERRADO',
  'FRIELLA': '% FRIELLA',
  'PERNODRICARD': '% PERNODRICARD',
  'PRATICLEVE': '% PRATICLEVE',
  'ZANLORENZI': '% ZANLORENZI'
};

// Função para limpar texto e padronizar comparação
function limparTexto(texto) {
  return texto.trim().toUpperCase();
}

// Normaliza a marca para chave correta do objeto COLUNAS_MARCA
function normalizarMarca(marca) {
  const mapa = {
    'GERAL': 'GERAL',
    'CERRADOFOODS': 'CERRADOFOODS',
    'FRIELLA': 'FRIELLA',
    'PERNOD': 'PERNODRICARD',        // abreviações que podem vir do botão
    'PERNODRICARD': 'PERNODRICARD',
    'PRACTLEVE': 'PRATICLEVE',      // corrigindo possível erro de digitação
    'PRATICLEVE': 'PRATICLEVE',
    'ZANLORENZI': 'ZANLORENZI',
  };
  return mapa[marca.toUpperCase()] || marca.toUpperCase();
}

// Detecta separador automático do CSV
function detectarSeparador(linha) {
  if (linha.includes('\t')) return '\t';
  if (linha.includes(';')) return ';';
  return ','; // padrão
}

// Busca os dados CSV
async function fetchCSV() {
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const data = await response.text();
    parseCSV(data);
  } catch (error) {
    console.error("Erro ao buscar o CSV:", error);
    alert("Erro ao carregar dados do ranking.");
  }
}

// Faz o parse do CSV e normaliza os dados
function parseCSV(data) {
  const lines = data.trim().split(/\r?\n/);
  const separador = detectarSeparador(lines[0]);

  headers = lines[0].split(separador).map(h => h.trim().toUpperCase());
  const rcaLines = lines.slice(1);

  rcas = rcaLines.map(line => {
    const values = line.split(separador);

    // Assume que o nome do RCA está na coluna 'RCA' (procurar o índice)
    const idxNome = headers.indexOf('RCA');
    let nomeRaw = values[idxNome] || '';
    nomeRaw = nomeRaw.replace(/(^"|"$)/g, '').replace(/\r/g, '').trim();

    const rcaData = {
      nome: nomeRaw || 'Sem Nome'
    };

    headers.forEach((header, index) => {
      if (header === 'RCA') return; // já pegamos nome
      const rawValue = values[index]?.replace(',', '.').trim() || '0';
      const valor = parseFloat(rawValue) || 0;
      rcaData[header] = valor;
      console.log(`Raw value para header "${header}" do RCA "${nomeRaw}": "${values[index]}"`);
    });

    return rcaData;
  });

  console.log("Primeiro RCA:", rcas[0]);
  renderPage();
  setupMarcaButtons();
}

// Encontra coluna alvo, usando normalização da marca
function encontrarColunaAlvo(marca) {
  const marcaChave = normalizarMarca(marca);
  const alvo = limparTexto(COLUNAS_MARCA[marcaChave] || '');
  console.log(`Buscando coluna para marca '${marca}' (normalizada: '${marcaChave}'): procurando por '${alvo}' entre os headers:`, headers);

  for (const header of headers) {
    if (limparTexto(header).includes(alvo)) {
      console.log('Coluna correspondente encontrada:', header);
      return header;
    }
  }

  console.warn('Coluna correspondente NÃO encontrada para marca:', marca);
  return null;
}

// Renderiza o ranking na página
function renderPage() {
  const container = document.getElementById('rca-container');
  container.innerHTML = '';

  const coluna = encontrarColunaAlvo(currentMarca);
  if (!coluna) {
    container.innerHTML = '<p>Marca não encontrada na planilha.</p>';
    return;
  }

  const ordenados = [...rcas].sort((a, b) => (b[coluna] || 0) - (a[coluna] || 0));

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = ordenados.slice(start, end);

  pageItems.forEach((rca, index) => {
    const progressoReal = rca[coluna] || 0;
    const progressoVisual = Math.min(progressoReal, 100);

    const div = document.createElement('div');
    div.className = 'linha-rca';

    div.innerHTML = `
      <span class="ranking-num">${start + index + 1}</span>
      <span class="nome-rca">${rca.nome}</span>
      <div class="barra-container">
        <div class="barra-progresso" style="width: ${progressoVisual}%;"></div>
        <img src="https://i.postimg.cc/vTsTGVYC/Adobe-Stock-824479434.png" class="soldado-img" style="left: calc(${progressoVisual}% - 18px);" />
        <div class="perc-venda" style="left: calc(${progressoVisual}% + 10px);">${progressoReal.toFixed(1)}%</div>
      </div>
    `;

    container.appendChild(div);
  });

  const totalPages = Math.ceil(rcas.length / itemsPerPage);
  document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
}

// Paginação
document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  const totalPages = Math.ceil(rcas.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
  }
});

// Configura botões de seleção de marca
function setupMarcaButtons() {
  document.querySelectorAll('.marca-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.marca-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentMarca = btn.getAttribute('data-marca').toUpperCase();
      currentPage = 1;
      renderPage();
    });
  });
}

// Inicializa a aplicação
fetchCSV();
