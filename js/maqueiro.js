const SUPABASE_URL = 'https://wcccerxilknnbybmjvbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjY2NlcnhpbGtubmJ5Ym1qdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDYyODEsImV4cCI6MjA5NTM4MjI4MX0.42BLv5Dk1N-OMxv0_33LfX9MYXfOOD6h_mQS64M3gv0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const filaElemento = document.getElementById('fila');
const modalJustificativa = document.getElementById('modal-justificativa');
const modalConteudo = document.getElementById('modal-conteudo');

let idMaqueiroLogado = null;
let nomeMaqueiroLogado = null;
let pedidoAguardandoJustificativa = null;
let listaPedidosAtivos = [];
let intervalosCronometros = {}; // Guarda as referências para não duplicar loops de segundos

function logout() {
    supabaseClient.auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

async function verificarSessao() {
    const { data: { user }, error: errorAuth } = await supabaseClient.auth.getUser();
    if (errorAuth || !user) { window.location.href = 'index.html'; return; }

    const { data: perfil } = await supabaseClient.from('perfis_usuarios').select('cargo').eq('id', user.id).single();
    if (perfil && perfil.cargo === 'SOLICITANTE') {
        alert("Acesso Negado: Esta tela é exclusiva para maqueiros.");
        window.location.href = 'solicitante.html';
        return;
    }

    idMaqueiroLogado = user.id;
    nomeMaqueiroLogado = user.email;
    const maqueiroElemento = document.getElementById('maqueiro');
    if (maqueiroElemento) {
        maqueiroElemento.textContent = nomeMaqueiroLogado;
    }
    carregarPedidosAtivos();
}

async function aceitarCorrida(pedidoId) {
    if (!idMaqueiroLogado) return;
    const { error } = await supabaseClient.rpc('aceitar_pedido', { pedido_id: pedidoId, maqueiro_id: idMaqueiroLogado });
    if (error) console.error("Erro ao aceitar corrida:", error.message);
}

async function finalizarEntregaDireto(pedidoId) {
    if (!idMaqueiroLogado) return;
    
    const { error } = await supabaseClient.rpc('concluir_pedido_direto', { 
        pedido_id: pedidoId, maqueiro_id: idMaqueiroLogado, justificativa: null
    });

    if (error) {
        if (error.message.includes('PRAZO_ESTOURADO')) {
            abrirModalJustificativa(pedidoId);
        } else {
            alert("Erro ao finalizar chamado: " + error.message);
        }
    }
}

function calcularPesoPedido(pedido) {
    const tempoCriacao = new Date(pedido.criado_em).getTime();
    let minutosLimite = 30;
    let peso = 1;
    if (pedido.prioridade === 'MEDIA') { minutosLimite = 20; peso = 10; }
    if (pedido.prioridade === 'ALTA') { minutosLimite = 10; peso = 100; }
    
    // Usa o prazo_limite do banco se disponível; caso contrário, calcula dinamicamente
    const tempoLimiteMaximo = pedido.prazo_limite ? new Date(pedido.prazo_limite).getTime() : tempoCriacao + (minutosLimite * 60 * 1000);
    const agora = new Date().getTime();
    const tempoRestante = tempoLimiteMaximo - agora;
    
    if (tempoRestante <= 0) return peso * 2; 
    return (100000000 / (tempoRestante / 1000)) * peso;
}

function ordenarPedidosPorPeso() {
    listaPedidosAtivos.sort((a, b) => calcularPesoPedido(b) - calcularPesoPedido(a));
    listaPedidosAtivos.forEach(pedido => {
        const card = document.getElementById(`pedido-${pedido.id}`);
        if (card) filaElemento.appendChild(card);
    });
}

function renderizarOuAtualizarCard(pedido) {
    if (!pedido || !pedido.id) return;
    
    if (pedido.status === 'CONCLUIDO') {
        listaPedidosAtivos = listaPedidosAtivos.filter(p => p.id !== pedido.id);
        const cardExistente = document.getElementById(`pedido-${pedido.id}`);
        if (cardExistente) {
            cardExistente.remove();
            if (intervalosCronometros[pedido.id]) {
                clearInterval(intervalosCronometros[pedido.id]);
                delete intervalosCronometros[pedido.id];
            }
        }
        return;
    }

    const index = listaPedidosAtivos.findIndex(p => p.id === pedido.id);
    if (index !== -1) {
        listaPedidosAtivos[index] = pedido;
    } else {
        listaPedidosAtivos.push(pedido);
    }

    let card = document.getElementById(`pedido-${pedido.id}`);
    const ehNovoCard = !card;

    if (ehNovoCard) {
        card = document.createElement('div');
        card.id = `pedido-${pedido.id}`;
        filaElemento.appendChild(card);
    }

    card.className = `card-maca prioridade-${pedido.prioridade}`;

    let botaoHTML = '';
    // Só exibe botão de conclusão se o chamado foi aceito por ESTE maqueiro logado
    if (pedido.status === 'PENDENTE') {
        botaoHTML = `<button class="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md active:scale-[0.98]" onclick="aceitarCorrida('${pedido.id}')">Aceitar Chamado</button>`;
    } else if (pedido.status === 'A_CAMINHO') {
        if (pedido.maqueiro_id === idMaqueiroLogado) {
            botaoHTML = `<button class="w-full mt-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md active:scale-[0.98]" onclick="finalizarEntregaDireto('${pedido.id}')">Concluir Entrega</button>`;
        } else {
            botaoHTML = `<div class="w-full mt-4 py-2 bg-slate-700 text-slate-400 text-center font-medium rounded-xl text-xs">Atendido por outro profissional</div>`;
        }
    }

    card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-extrabold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">${pedido.status === 'A_CAMINHO' ? '🏃 EM TRÂNSITO' : '⏳ PENDENTE'}</span>
            <div class="badge-tempo flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">
                ⏱️ <span class="cronometro-timer">Calculando...</span>
            </div>
        </div>
        <div class="text-slate-800 space-y-1.5">
            <p><span class="font-bold text-slate-400 text-[11px] tracking-wide uppercase block">Origem</span><span class="text-base font-semibold text-slate-800">${pedido.origem}</span></p>
            <p><span class="font-bold text-slate-400 text-[11px] tracking-wide uppercase block">Destino</span><span class="text-base font-semibold text-slate-800">${pedido.destino}</span></p>
            <p class="text-sm text-slate-600 pt-2 border-t border-slate-100 mt-2"><strong>Motivo:</strong> ${pedido.motivo}</p>
        </div>
        ${botaoHTML}
    `;

    // Passa o parâmetro prazo_limite correto vindo do banco
    iniciarCronometroRegressivo(card, pedido.criado_em, pedido.prioridade, pedido.prazo_limite);
    ordenarPedidosPorPeso();
}

function abrirModalJustificativa(pedidoId) {
    pedidoAguardandoJustificativa = pedidoId;
    modalJustificativa.classList.remove('hidden');
    setTimeout(() => {
        modalJustificativa.classList.remove('opacity-0');
        modalConteudo.classList.remove('translate-y-full');
    }, 10);
}

function fecharModalJustificativa() {
    modalJustificativa.classList.add('opacity-0');
    modalConteudo.classList.add('translate-y-full');
    setTimeout(() => {
        modalJustificativa.classList.add('hidden');
        pedidoAguardandoJustificativa = null;
    }, 300);
}

async function enviarJustificativa(motivo) {
    if (!pedidoAguardandoJustificativa || !idMaqueiroLogado) return;

    const { error } = await supabaseClient.rpc('concluir_pedido_direto', {
        pedido_id: pedidoAguardandoJustificativa,
        maqueiro_id: idMaqueiroLogado,
        justificativa: motivo
    });
    
    if (!error) {
        fecharModalJustificativa();
    } else {
        alert("Erro ao enviar justificativa: " + error.message);
    }
}

function iniciarCronometroRegressivo(cardElemento, dataCriacao, prioridade, dataPrazoLimite) {
    const idPedido = cardElemento.id.replace('pedido-', '');
    const elementoTimer = cardElemento.querySelector('.cronometro-timer');
    const containerBadge = cardElemento.querySelector('.badge-tempo');
    if (!elementoTimer) return;

    // Se já havia um cronômetro rodando para este card específico, derruba ele para não acumular consumo
    if (intervalosCronometros[idPedido]) {
        clearInterval(intervalosCronometros[idPedido]);
    }

    let minutosLimite = 30;
    if (prioridade === 'MEDIA') minutosLimite = 20;
    if (prioridade === 'ALTA') minutosLimite = 10;

    const tempoCriacao = new Date(dataCriacao).getTime();
    const tempoLimiteMaximo = dataPrazoLimite ? new Date(dataPrazoLimite).getTime() : tempoCriacao + (minutosLimite * 60 * 1000);

    function atualizarLoop() {
        const agora = new Date().getTime();
        const diferenca = tempoLimiteMaximo - agora;

        if (diferenca <= 0) {
            elementoTimer.textContent = "PRAZO ESGOTADO";
            containerBadge.className = "badge-tempo flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500 text-white animate-pulse";
            return;
        }

        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
        const formatoSegundos = segundos < 10 ? '0' + segundos : segundos;
        
        elementoTimer.textContent = `${minutos}:${formatoSegundos} min`;

        if (minutos >= 5) {
            containerBadge.className = "badge-tempo flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200";
        } else {
            containerBadge.className = "badge-tempo flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-bounce";
        }
    }

    atualizarLoop();
    intervalosCronometros[idPedido] = setInterval(atualizarLoop, 1000);
}

async function carregarPedidosAtivos() {
    const { data, error } = await supabaseClient.from('pedidos_maca').select('*').neq('status', 'CONCLUIDO');
    if (error) { console.error(error); return; }
    
    filaElemento.innerHTML = '';
    listaPedidosAtivos = [];
    if (data) {
        data.forEach(pedido => renderizarOuAtualizarCard(pedido));
    }
}

// 🌟 CONFIGURAÇÃO REALTIME CORRIGIDA: Força o resgate seguro e limpo dos dados
supabaseClient.channel('fila_hospitalar')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_maca' }, async (payload) => {
        if (payload.eventType === 'DELETE') {
            const idAntigo = payload.old.id;
            listaPedidosAtivos = listaPedidosAtivos.filter(p => p.id !== idAntigo);
            const card = document.getElementById(`pedido-${idAntigo}`);
            if (card) card.remove();
        } else {
            // Em vez de confiar no payload bruto incompleto, faz uma checagem síncrona direto na linha do banco
            const { data: chamadoAtualizado } = await supabaseClient
                .from('pedidos_maca')
                .select('*')
                .eq('id', payload.new.id)
                .single();
                
            if (chamadoAtualizado) {
                renderizarOuAtualizarCard(chamadoAtualizado);
            }
        }
    }).subscribe();

setInterval(ordenarPedidosPorPeso, 7000);
verificarSessao();