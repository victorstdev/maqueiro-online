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

const CHAVE_PUBLICA_VAPID = 'BEZf-0jWrqbmH1PtUy5fVeAsONyvnIiVIU0gQFWCkxW0ePRSIkPT8pAwN2f18MW2wGN7A-XGTF0ZX_MdZfgNo1E';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
}

// Configuração do Service Worker e das Notificações Push em Segundo Plano
async function inicializarNotificacoesPush() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const registro = await navigator.serviceWorker.register('sw.js');
            const permissao = await Notification.requestPermission();
            if (permissao !== 'granted') return;

            const opcoesInscricao = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(CHAVE_PUBLICA_VAPID) };
            const inscricao = await registro.pushManager.subscribe(opcoesInscricao);
            const chaves = JSON.parse(JSON.stringify(inscricao));
            
            const dadosSalvar = {
                maqueiro_id: idMaqueiroLogado, endpoint: chaves.endpoint,
                p256dh: chaves.keys.p256dh, auth_token: chaves.keys.auth
            };

            await supabaseClient.from('inscricoes_push').upsert([dadosSalvar], { onConflict: 'maqueiro_id,endpoint' });
            console.log('🎉 Push ativado no bolso do maqueiro!');
        } catch (err) { console.error('Erro ao registrar Web Push:', err); }
    }
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
    nomeMaqueiroLogado = user.email; // Ou obtenha do perfil se disponível
    const maqueiroElemento = document.getElementById('maqueiro');
    if (maqueiroElemento) {
        maqueiroElemento.textContent = nomeMaqueiroLogado;
    }
    inicializarNotificacoesPush();
    carregarPedidosAtivos();
}

async function aceitarCorrida(pedidoId) {
    if (!idMaqueiroLogado) return;
    await supabaseClient.rpc('aceitar_pedido', { pedido_id: pedidoId, maqueiro_id: idMaqueiroLogado });
}

async function finalizarEntregaDireto(pedidoId) {
    if (!idMaqueiroLogado) return;
    let justificativa = null;
    
    const { error } = await supabaseClient.rpc('concluir_pedido_direto', { 
        pedido_id: pedidoId, maqueiro_id: idMaqueiroLogado, justificativa: justificativa
    });

    if (error && error.message.includes('PRAZO_ESTOURADO')) {
        abrirModalJustificativa(pedidoId);
    }
}

function calcularPesoPedido(pedido) {
    const tempoCriacao = new Date(pedido.criado_em).getTime();
    let minutosLimite = 30; // Baixa
    let peso = 1;
    if (pedido.prioridade === 'MEDIA') { minutosLimite = 20; peso = 10; }
    if (pedido.prioridade === 'ALTA') { minutosLimite = 10; peso = 100; }
    const tempoLimiteMaximo = tempoCriacao + (minutosLimite * 60 * 1000);
    const agora = new Date().getTime();
    const tempoRestante = tempoLimiteMaximo - agora;
    if (tempoRestante <= 0) return peso * 2; // Dobra o peso se o prazo já estourou
    const inversaoTempo = 100000000 / (tempoRestante/1000); // Quanto mais próximo do limite, maior o peso
    return inversaoTempo * peso; // Peso base + fator de urgência
}

function ordenarPedidosPorPeso() {
    listaPedidosAtivos.sort((a, b) => calcularPesoPedido(b) - calcularPesoPedido(a));
    listaPedidosAtivos.forEach(pedido => {
        const card = document.getElementById(`pedido-${pedido.id}`);
        if (card) filaElemento.appendChild(card); // Reanexa o card para reordenar visualmente
    });
}

function renderizarOuAtualizarCard(pedido) {
    if (!pedido || !pedido.id) return;
    
    // Se o chamado foi concluído, remove da memória e da tela
    if (pedido.status === 'CONCLUIDO') {
        listaPedidosAtivos = listaPedidosAtivos.filter(p => p.id !== pedido.id);
        const cardExistente = document.getElementById(`pedido-${pedido.id}`);
        if (cardExistente) cardExistente.remove();
        return;
    }

    // Atualiza ou insere o pedido na nossa lista na memória
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
    if (pedido.status === 'PENDENTE') {
        botaoHTML = `<button class="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md active:scale-[0.98]" onclick="aceitarCorrida('${pedido.id}')">Aceitar Chamado</button>`;
    } else if (pedido.status === 'A_CAMINHO') {
        botaoHTML = `<button class="w-full mt-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md active:scale-[0.98]" onclick="finalizarEntregaDireto('${pedido.id}')">Concluir Entrega</button>`;
    }

    card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-extrabold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">${pedido.status}</span>
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

    iniciarCronometroRegressivo(card, pedido.criado_em, pedido.prioridade);
    
    // 🌟 Executa a ordenação imediatamente após renderizar/atualizar o card
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

    try {
        const { error } = await supabaseClient.rpc('concluir_pedido_direto', {
            pedido_id: pedidoAguardandoJustificativa,
            maqueiro_id: idMaqueiroLogado,
            justificativa: motivo
        });
        if (error) throw error;
        fecharModalJustificativa();
    } catch (err) {
        console.error('Erro ao enviar justificativa:', err);
    }
}

function iniciarCronometroRegressivo(cardElemento, dataCriacao, prioridade) {
    const elementoTimer = cardElemento.querySelector('.cronometro-timer');
    const containerBadge = cardElemento.querySelector('.badge-tempo');
    if (!elementoTimer) return;

    // Prazos em minutos definidos pela regra do hospital
    let minutosLimite = 30; // Baixa
    if (prioridade === 'MEDIA') minutosLimite = 20;
    if (prioridade === 'ALTA') minutosLimite = 10;

    const tempoCriacao = new Date(dataCriacao).getTime();
    const tempoLimiteMaximo = tempoCriacao + (minutosLimite * 60 * 1000);

    function atualizarLoop() {
        const agora = new Date().getTime();
        const diferenca = tempoLimiteMaximo - agora;

        if (diferenca <= 0) {
            // O prazo acabou! Interface entra em Alerta Crítico
            elementoTimer.textContent = "PRAZO ESGOTADO";
            containerBadge.className = "badge-tempo flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500 text-white animate-pulse";
            return;
        }

        // Divide o tempo em minutos e segundos reais restantes
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
        
        const formatoSegundos = segundos < 10 ? '0' + segundos : segundos;
        elementoTimer.textContent = `${minutos}:${formatoSegundos} min`;

        // UX Reativo: Muda a cor do contador conforme o tempo vai morrendo
        if (minutos >= 5) {
            containerBadge.className = "badge-tempo flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200";
        } else {
            // Faltam menos de 5 minutos: Alerta Laranja de atenção
            containerBadge.className = "badge-tempo flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-bounce";
        }
    }

    // Executa imediatamente e deixa rodando em background
    atualizarLoop();
    setInterval(atualizarLoop, 1000);
}

async function carregarPedidosAtivos() {
    const { data } = await supabaseClient.from('pedidos_maca').select('*').neq('status', 'CONCLUIDO');
    if (data) {
        data.forEach(pedido => renderizarOuAtualizarCard(pedido));
    }
}

supabaseClient.channel('fila_hospitalar')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_maca' }, payload => {
        if (payload.eventType === 'DELETE') {
            listaPedidosAtivos = listaPedidosAtivos.filter(p => p.id !== payload.old.id);
            const card = document.getElementById(`pedido-${payload.old.id}`);
            if (card) card.remove();
        } else {
            renderizarOuAtualizarCard(payload.new);
        }
    }).subscribe();

setInterval(ordenarPedidosPorPeso, 5000);
verificarSessao();