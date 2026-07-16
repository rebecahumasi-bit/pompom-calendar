const wrapper = document.querySelector('.canvas-wrapper');
const sceneEl = document.querySelector('.canvas');
const BASE_WIDTH = 1440;
const BASE_HEIGHT = 1024;

function fit() {
  const scale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT);
  wrapper.style.width = `${BASE_WIDTH * scale}px`;
  wrapper.style.height = `${BASE_HEIGHT * scale}px`;
  sceneEl.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fit);
fit();

// ---------- Armazenamento local (persistência por mês/ano) ----------

let anoAtual = null;
let mesAtual = null;
let diaSelecionadoNota = null;

// limpeza única de tudo que foi salvo antes desta versão — a partir daqui,
// só conta o que os usuários registrarem dora em diante
const VERSAO_RESET_DADOS = 'pompompurin-reset-v1';
try {
  if (!localStorage.getItem(VERSAO_RESET_DADOS)) {
    Object.keys(localStorage)
      .filter((chave) => chave.startsWith('pompompurin-calendario-'))
      .forEach((chave) => localStorage.removeItem(chave));
    localStorage.setItem(VERSAO_RESET_DADOS, 'true');
  }
} catch (e) {
  // localStorage indisponível — nada a limpar
}

function chaveArmazenamento(ano, mes) {
  return `pompompurin-calendario-${ano}-${mes}`;
}

function carregarDadosSalvos(ano, mes) {
  try {
    const bruto = localStorage.getItem(chaveArmazenamento(ano, mes));
    return bruto ? JSON.parse(bruto) : {};
  } catch (e) {
    return {};
  }
}

function atualizarDadosSalvos(ano, mes, atualizador) {
  const dados = carregarDadosSalvos(ano, mes);
  atualizador(dados);
  try {
    localStorage.setItem(chaveArmazenamento(ano, mes), JSON.stringify(dados));
  } catch (e) {
    // localStorage indisponível ou cheio — ignora silenciosamente
  }
}

// ---------- Calendário dinâmico (data real do computador) ----------

const MESES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const ALTURA_TOTAL_GRADE = 427.985;

function diasNoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

function construirLinhasMiniCalendario(ano, mes) {
  const total = diasNoMes(ano, mes);
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= total; d++) celulas.push(d);

  const linhas = ['S M T W T F S'];
  for (let i = 0; i < celulas.length; i += 7) {
    const semana = celulas.slice(i, i + 7);
    while (semana.length && semana[semana.length - 1] === null) semana.pop();
    linhas.push(semana.map((v) => (v === null ? '·' : String(v))).join(' '));
  }
  return linhas;
}

function preencherMiniCalendario(container, ano, mes) {
  container.querySelector('.mini-mes').textContent = String(mes + 1);
  const diasEl = container.querySelector('.mini-dias');
  diasEl.innerHTML = '';
  construirLinhasMiniCalendario(ano, mes).forEach((linha) => {
    const p = document.createElement('p');
    p.textContent = linha;
    diasEl.appendChild(p);
  });
}

function criarCelulaDia(dia, ehDomingo, ehPassado, valorSalvo, ehHoje) {
  const celula = document.createElement('div');
  celula.className = 'celula';
  if (dia !== null) {
    const spanDia = document.createElement('span');
    spanDia.className = ehDomingo ? 'dia sun' : 'dia';
    if (ehPassado) spanDia.classList.add('passado');
    if (ehHoje) spanDia.classList.add('hoje');
    spanDia.textContent = String(dia);
    spanDia.dataset.dia = String(dia);
    spanDia.addEventListener('click', () => mostrarNotaNoPin(dia));

    const inputNota = document.createElement('input');
    inputNota.type = 'text';
    inputNota.className = 'nota-dia';
    inputNota.maxLength = 60;
    inputNota.dataset.dia = String(dia);
    if (valorSalvo) inputNota.value = valorSalvo;
    inputNota.addEventListener('input', () => {
      atualizarDadosSalvos(anoAtual, mesAtual, (dados) => {
        dados.notas = dados.notas || {};
        dados.notas[dia] = inputNota.value;
      });
    });

    celula.appendChild(spanDia);
    celula.appendChild(inputNota);
  }
  return celula;
}

function criarLinhaLateral(dia, ehHoje, valorSalvo) {
  const linhaDia = document.createElement('div');
  linhaDia.className = 'linha-dia';
  linhaDia.dataset.dia = String(dia);

  const numDia = document.createElement('span');
  numDia.className = ehHoje ? 'dia-num hoje' : 'dia-num';
  numDia.textContent = String(dia);

  const linhaInput = document.createElement('input');
  linhaInput.type = 'text';
  linhaInput.className = 'linha';
  linhaInput.maxLength = 120;
  if (valorSalvo) linhaInput.value = valorSalvo;
  linhaInput.addEventListener('input', () => {
    atualizarDadosSalvos(anoAtual, mesAtual, (dados) => {
      dados.linhas = dados.linhas || {};
      dados.linhas[dia] = linhaInput.value;
    });
  });

  linhaDia.appendChild(numDia);
  linhaDia.appendChild(linhaInput);
  return linhaDia;
}

function construirCalendario(anoParam, mesParam) {
  const hojeReal = new Date();
  const ano = anoParam !== undefined ? anoParam : hojeReal.getFullYear();
  const mes = mesParam !== undefined ? mesParam : hojeReal.getMonth();
  const ehMesReal = ano === hojeReal.getFullYear() && mes === hojeReal.getMonth();
  const diaHojeReal = hojeReal.getDate();
  // número em destaque no cabeçalho: dia real de hoje quando o mês exibido é o atual, senão dia 1
  const diaHoje = ehMesReal ? diaHojeReal : 1;

  anoAtual = ano;
  mesAtual = mes;
  const dadosSalvos = carregarDadosSalvos(ano, mes);

  document.getElementById('mes-atual').textContent = MESES[mes];
  document.getElementById('dia-atual').textContent = String(diaHoje);
  document.getElementById('ano-atual').textContent = String(ano);

  const nomeMesCapitalizado = MESES[mes].charAt(0) + MESES[mes].slice(1).toLowerCase();
  document.title = `Calendário Pompompurin – ${nomeMesCapitalizado} ${ano}`;

  const mesAnterior = mes === 0 ? 11 : mes - 1;
  const anoMesAnterior = mes === 0 ? ano - 1 : ano;
  const mesProximo = mes === 11 ? 0 : mes + 1;
  const anoMesProximo = mes === 11 ? ano + 1 : ano;
  preencherMiniCalendario(document.getElementById('mini-anterior'), anoMesAnterior, mesAnterior);
  preencherMiniCalendario(document.getElementById('mini-proximo'), anoMesProximo, mesProximo);

  const totalDias = diasNoMes(ano, mes);
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalCelulas = primeiroDiaSemana + totalDias;
  const numLinhas = Math.ceil(totalCelulas / 7);

  // mês exibido inteiramente antes do mês real de hoje: todos os dias já passaram
  const mesExibidoEhAnterior = ano < hojeReal.getFullYear()
    || (ano === hojeReal.getFullYear() && mes < hojeReal.getMonth());

  const gradeMes = document.getElementById('grade-mes');
  gradeMes.innerHTML = '';
  gradeMes.style.gridTemplateRows = `repeat(${numLinhas}, ${ALTURA_TOTAL_GRADE / numLinhas}px)`;

  for (let i = 0; i < numLinhas * 7; i++) {
    const dia = i - primeiroDiaSemana + 1;
    const valido = dia >= 1 && dia <= totalDias;
    const ehDomingo = i % 7 === 0;
    const ehPassado = valido && (ehMesReal ? dia < diaHojeReal : mesExibidoEhAnterior);
    const ehHojeCelula = valido && ehMesReal && dia === diaHojeReal;
    const valorSalvo = valido && dadosSalvos.notas ? dadosSalvos.notas[dia] : '';
    gradeMes.appendChild(criarCelulaDia(valido ? dia : null, ehDomingo, ehPassado, valorSalvo, ehHojeCelula));
  }

  const listaDiaria = document.getElementById('lista-diaria');
  listaDiaria.innerHTML = '';
  for (let d = 1; d <= totalDias; d++) {
    const valorSalvo = dadosSalvos.linhas ? dadosSalvos.linhas[d] : '';
    listaDiaria.appendChild(criarLinhaLateral(d, ehMesReal && d === diaHojeReal, valorSalvo));
  }

  if (ehMesReal) {
    const linhaHoje = listaDiaria.querySelector(`[data-dia="${diaHojeReal}"]`);
    if (linhaHoje) {
      linhaHoje.scrollIntoView({ block: 'nearest' });
      atualizarMarcadorLateral();
    }
  }

  diaSelecionadoNota = null;
  const textoNota = document.getElementById('texto-nota');
  textoNota.value = dadosSalvos.memo || '';
}

// mostra a anotação (texto e desenho) do dia clicado no bloco com o pin — são campos
// próprios por dia, independentes do texto fixo da caixinha do dia no calendário
function mostrarNotaNoPin(dia) {
  diaSelecionadoNota = dia;
  const dadosSalvos = carregarDadosSalvos(anoAtual, mesAtual);
  const textoNota = document.getElementById('texto-nota');
  textoNota.value = (dadosSalvos.anotacoesDia && dadosSalvos.anotacoesDia[dia]) || '';

  historicoDesfazer.length = 0; // evita desfazer traço de outro dia
  const canvasNota = document.getElementById('canvas-nota');
  if (canvasNota) carregarDesenho(canvasNota);
}

// ---------- Marcador lateral animado (acompanha o scroll da lista) ----------

const listaDiariaScroll = document.querySelector('.lista-diaria-scroll');
const marcadorSuperior = document.querySelector('.marcador-lateral-superior');
const ALTURA_MARCADOR_MIN = 47.313;
const ALTURA_MARCADOR_TOTAL = 549.469;

function atualizarMarcadorLateral() {
  const maxScroll = listaDiariaScroll.scrollHeight - listaDiariaScroll.clientHeight;
  const fracao = maxScroll > 0 ? listaDiariaScroll.scrollTop / maxScroll : 0;
  const altura = ALTURA_MARCADOR_MIN + fracao * (ALTURA_MARCADOR_TOTAL - ALTURA_MARCADOR_MIN);
  marcadorSuperior.style.height = `${altura}px`;
}

listaDiariaScroll.addEventListener('scroll', atualizarMarcadorLateral);
window.addEventListener('resize', atualizarMarcadorLateral);

construirCalendario();
atualizarMarcadorLateral();

document.getElementById('texto-nota').addEventListener('input', (evt) => {
  const valor = evt.target.value;
  if (diaSelecionadoNota !== null) {
    atualizarDadosSalvos(anoAtual, mesAtual, (dados) => {
      dados.anotacoesDia = dados.anotacoesDia || {};
      dados.anotacoesDia[diaSelecionadoNota] = valor;
    });
  } else {
    atualizarDadosSalvos(anoAtual, mesAtual, (dados) => {
      dados.memo = valor;
    });
  }
});

// ---------- Ferramentas de desenho (caneta / marcador) ----------

const TOOLS = {
  caneta: { color: '#2d3561', width: 2.4, alpha: 1 },
  marcador: { color: '#ff6fa8', width: 16, alpha: 0.32 },
};

const NOME_ARMAZENAMENTO_DESENHO = {
  'canvas-dias': 'desenhoDias',
  'canvas-nota': 'desenhoNota',
};

let activeTool = null;
let corSelecionada = '#66a828';
const HISTORICO_MAX = 50;
const historicoDesfazer = [];

const toolCaneta = document.getElementById('tool-caneta');
const toolMarcador = document.getElementById('tool-marcador');
const toolPaleta = document.getElementById('tool-paleta');
const paletaCores = document.getElementById('paleta-cores');

function squish(el) {
  el.classList.remove('squish');
  void el.offsetWidth; // força reflow para permitir reiniciar a animação
  el.classList.add('squish');
}

function salvarDesenho(canvasEl) {
  const dataURL = canvasEl.toDataURL('image/png');
  // desenho do bloco com o pin: quando um dia está selecionado, fica vinculado só àquele dia
  if (canvasEl.id === 'canvas-nota' && diaSelecionadoNota !== null) {
    const dia = diaSelecionadoNota;
    atualizarDadosSalvos(anoAtual, mesAtual, (dados) => {
      dados.desenhosNotaPorDia = dados.desenhosNotaPorDia || {};
      dados.desenhosNotaPorDia[dia] = dataURL;
    });
    return;
  }
  const campo = NOME_ARMAZENAMENTO_DESENHO[canvasEl.id];
  if (!campo) return;
  atualizarDadosSalvos(anoAtual, mesAtual, (dados) => {
    dados[campo] = dataURL;
  });
}

function carregarDesenho(canvasEl) {
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  const dados = carregarDadosSalvos(anoAtual, mesAtual);

  let dataURL;
  if (canvasEl.id === 'canvas-nota' && diaSelecionadoNota !== null) {
    dataURL = dados.desenhosNotaPorDia && dados.desenhosNotaPorDia[diaSelecionadoNota];
  } else {
    const campo = NOME_ARMAZENAMENTO_DESENHO[canvasEl.id];
    if (!campo) return;
    dataURL = dados[campo];
  }
  if (!dataURL) return;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
  };
  img.src = dataURL;
}

function registrarEstadoAnterior(canvasEl) {
  historicoDesfazer.push({ canvas: canvasEl, dataURL: canvasEl.toDataURL('image/png') });
  if (historicoDesfazer.length > HISTORICO_MAX) historicoDesfazer.shift();
}

function desfazerUltimoTraco() {
  const anterior = historicoDesfazer.pop();
  if (!anterior) return;
  const { canvas: canvasEl, dataURL } = anterior;
  const ctx = canvasEl.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
    salvarDesenho(canvasEl);
  };
  img.src = dataURL;
}

window.addEventListener('keydown', (evt) => {
  const teclaZ = evt.key === 'z' || evt.key === 'Z';
  const comandoDesfazer = (evt.ctrlKey || evt.metaKey) && teclaZ && !evt.shiftKey;
  if (!comandoDesfazer) return;
  const tagAtiva = document.activeElement && document.activeElement.tagName;
  if (tagAtiva === 'INPUT' || tagAtiva === 'TEXTAREA') return; // preserva o desfazer nativo do campo de texto
  evt.preventDefault();
  desfazerUltimoTraco();
});

function setupDrawingCanvas(canvasEl) {
  canvasEl.width = canvasEl.offsetWidth;
  canvasEl.height = canvasEl.offsetHeight;
  const ctx = canvasEl.getContext('2d');
  let drawing = false;
  let last = null;

  function toLocalPoint(evt) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (canvasEl.width / rect.width),
      y: (evt.clientY - rect.top) * (canvasEl.height / rect.height),
    };
  }

  function pointerDown(evt) {
    if (!activeTool) return;
    registrarEstadoAnterior(canvasEl);
    drawing = true;
    last = toLocalPoint(evt);
    // sem setPointerCapture: assim, ao sair da área desenhável durante o arrasto,
    // o cursor volta ao normal (o pointerleave abaixo já encerra o traço corretamente)
    drawSegment(last, last);
  }

  function pointerMove(evt) {
    if (!drawing || !activeTool) return;
    const point = toLocalPoint(evt);
    drawSegment(last, point);
    last = point;
  }

  function pointerUp() {
    if (drawing) salvarDesenho(canvasEl);
    drawing = false;
    last = null;
  }

  function drawSegment(from, to) {
    const tool = TOOLS[activeTool];
    if (!tool) return;
    ctx.strokeStyle = corSelecionada;
    ctx.lineWidth = tool.width;
    ctx.globalAlpha = tool.alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  canvasEl.addEventListener('pointerdown', pointerDown);
  canvasEl.addEventListener('pointermove', pointerMove);
  canvasEl.addEventListener('pointerup', pointerUp);
  canvasEl.addEventListener('pointerleave', pointerUp);
  canvasEl.addEventListener('pointercancel', pointerUp);

  carregarDesenho(canvasEl);
}

const drawingCanvases = Array.from(document.querySelectorAll('.canvas-desenho'));
drawingCanvases.forEach(setupDrawingCanvas);

function setActiveTool(name) {
  activeTool = activeTool === name ? null : name;
  toolCaneta.classList.toggle('ativo', activeTool === 'caneta');
  toolMarcador.classList.toggle('ativo', activeTool === 'marcador');
  drawingCanvases.forEach((c) => c.classList.toggle('ativo', !!activeTool));
}

toolCaneta.addEventListener('click', () => {
  squish(toolCaneta);
  setActiveTool('caneta');
});
toolMarcador.addEventListener('click', () => {
  squish(toolMarcador);
  setActiveTool('marcador');
});

toolPaleta.addEventListener('click', () => {
  squish(toolPaleta);
  paletaCores.classList.toggle('aberta');
});

Array.from(paletaCores.querySelectorAll('.swatch')).forEach((botao) => {
  botao.addEventListener('click', () => {
    squish(botao);
    corSelecionada = botao.dataset.cor;
    paletaCores.querySelectorAll('.swatch').forEach((b) => b.classList.remove('selecionada'));
    botao.classList.add('selecionada');
  });
});

// ---------- Navegação entre meses (setinhas) ----------

function irParaMes(novoAno, novoMes) {
  construirCalendario(novoAno, novoMes);
  historicoDesfazer.length = 0;
  drawingCanvases.forEach(carregarDesenho);
}

function irParaMesAnterior() {
  const novoMes = mesAtual === 0 ? 11 : mesAtual - 1;
  const novoAno = mesAtual === 0 ? anoAtual - 1 : anoAtual;
  irParaMes(novoAno, novoMes);
}

function irParaProximoMes() {
  const novoMes = mesAtual === 11 ? 0 : mesAtual + 1;
  const novoAno = mesAtual === 11 ? anoAtual + 1 : anoAtual;
  irParaMes(novoAno, novoMes);
}

const setasEl = document.querySelector('.setas');
setasEl.addEventListener('click', (evt) => {
  const rect = setasEl.getBoundingClientRect();
  const cliqueX = evt.clientX - rect.left;
  if (cliqueX < rect.width / 2) {
    irParaMesAnterior();
  } else {
    irParaProximoMes();
  }
});

// ---------- Mantém tudo atualizado para o dia real ao entrar/voltar à página ----------

let ultimoAnoRealVisto = new Date().getFullYear();
let ultimoMesRealVisto = new Date().getMonth();

function sincronizarComDiaAtual() {
  const hojeReal = new Date();
  const anoReal = hojeReal.getFullYear();
  const mesReal = hojeReal.getMonth();

  // o usuário estava vendo o mês que era "hoje" da última vez? então acompanha a mudança de dia/mês real
  const estavaNoMesReal = anoAtual === ultimoAnoRealVisto && mesAtual === ultimoMesRealVisto;

  ultimoAnoRealVisto = anoReal;
  ultimoMesRealVisto = mesReal;

  if (estavaNoMesReal) {
    irParaMes(anoReal, mesReal);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') sincronizarComDiaAtual();
});
window.addEventListener('focus', sincronizarComDiaAtual);
