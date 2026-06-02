const SUPABASE_URL = 'https://wcccerxilknnbybmjvbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjY2NlcnhpbGtubmJ5Ym1qdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDYyODEsImV4cCI6MjA5NTM4MjI4MX0.42BLv5Dk1N-OMxv0_33LfX9MYXfOOD6h_mQS64M3gv0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const filaElemento = document.getElementById('fila');

let maqueiro_id = null;
let maqueiro_nome = null;
const countdownIntervals = {};

function formatarTempoRestante(prazoLimite) {
    if (!prazoLimite) return '--:--';
    const now = new Date();
    const prazo = new Date(prazoLimite);
    const diffMs = prazo - now;
    if (diffMs <= 0) return '00:00';
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function atualizarContador(pedidoId, prazoLimite) {
    const countdownSpan = document.getElementById(`countdown-${pedidoId}`);
    if (!countdownSpan) return;
    const novoTexto = formatarTempoRestante(prazoLimite);
    countdownSpan.textContent = novoTexto;
    countdownSpan.style.transition = 'transform 0.2s ease';
    countdownSpan.style.transform = 'scale(1.05)';
    setTimeout(() => {
        countdownSpan.style.transform = 'scale(1)';
    }, 180);
    if (novoTexto === '00:00') {
        countdownSpan.style.color = '#dc2626';
    }
}

function iniciarContador(pedidoId, prazoLimite) {
    if (countdownIntervals[pedidoId]) return;
    const prazo = new Date(prazoLimite);
    if (isNaN(prazo.getTime())) return;
    atualizarContador(pedidoId, prazoLimite);
    countdownIntervals[pedidoId] = setInterval(() => {
        const agora = new Date();
        if (prazo - agora <= 0) {
            atualizarContador(pedidoId, prazoLimite);
            clearInterval(countdownIntervals[pedidoId]);
            delete countdownIntervals[pedidoId];
            return;
        }
        atualizarContador(pedidoId, prazoLimite);
    }, 1000);
}

function limparContador(pedidoId) {
    if (countdownIntervals[pedidoId]) {
        clearInterval(countdownIntervals[pedidoId]);
        delete countdownIntervals[pedidoId];
    }
}

async function verificarAutenticacao() {
    const {data:{user}, error} = await supabaseClient.auth.getUser();
    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }
    console.log("Usuário autenticado:", user.email);
    const {data: perfil, error: perfilError} = await supabaseClient
        .from('perfis_usuarios')
        .select('cargo')
        .eq('id', user.id)
        .single();
    if (perfilError || !perfil) {
        window.location.href = 'index.html';
        return;
    }
    if (perfil.cargo === 'SOLICITANTE') {
        alert("⚠️ Acesso restrito: Solicitantes devem usar o aplicativo específico para solicitantes.");
        window.location.href = 'solicitante.html';
        return;
    }
    maqueiro_id = user.id;
    maqueiro_nome = user.email;
    const maqueiroSpan = document.getElementById('maqueiro');
    if (maqueiroSpan) {
        maqueiroSpan.textContent = maqueiro_nome;
    }
    carregarPedidosAtivos();
}

async function aceitarCorrida(pedidoId) {
    if (!maqueiro_id) return;
    await supabaseClient.rpc('aceitar_pedido', { pedido_id: pedidoId, maqueiro_id: maqueiro_id });
}

async function finalizarEntregaDireto(pedidoId) {
    let justificativa = null;
    const { error } = await supabaseClient.rpc('concluir_pedido_direto', { 
        pedido_id: pedidoId, maqueiro_id: maqueiro_id, justificativa: justificativa
    });

    if (error && error.message.includes('PRAZO_ESTOURADO')) {
        justificativa = prompt("⚠️ O prazo acabou! Digite o motivo do atraso para conseguir fechar o chamado:");
        if (justificativa) {
            await supabaseClient.rpc('concluir_pedido_direto', { 
                pedido_id: pedidoId, maqueiro_id: maqueiro_id, justificativa: justificativa
            });
        } else {
            alert("A justificativa é obrigatória para encerrar chamados atrasados.");
        }
    }
}

function renderizarOuAtualizarCard(pedido) {
    if (!pedido || !pedido.id) return;

    if (pedido.status === 'CONCLUIDO') {
        const cardExistente = document.getElementById(`pedido-${pedido.id}`);
        if (cardExistente) cardExistente.remove();
        limparContador(pedido.id);
        return;
    }

    let card = document.getElementById(`pedido-${pedido.id}`);
    if (!card) {
        card = document.createElement('div');
        card.id = `pedido-${pedido.id}`;
        filaElemento.insertBefore(card, filaElemento.firstChild);
    }

    card.className = `card-maca prioridade-${pedido.prioridade}`;
    const prazo = pedido.prazo_limite ? new Date(pedido.prazo_limite).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
    const countdownHTML = pedido.prazo_limite ? `
            <p class="text-sm font-semibold text-slate-700 mt-2">
                <span id="countdown-${pedido.id}" style="display:inline-block; min-width:56px; transition: transform 0.2s ease;">${formatarTempoRestante(pedido.prazo_limite)}</span>
            </p>
        ` : '';

    let botaoHTML = '';
    if (pedido.status === 'PENDENTE') {
        botaoHTML = `<button class="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md" onclick="aceitarCorrida('${pedido.id}')">Aceitar Chamado</button>`;
    } else if (pedido.status === 'A_CAMINHO') {
        botaoHTML = `<button class="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md" onclick="finalizarEntregaDireto('${pedido.id}')">Concluir Entrega</button>`;
    }

    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">${pedido.status}</span>
            <span class="text-sm font-bold text-slate-500">⏱️ Limite: ${prazo}</span>
        </div>
        <div class="text-slate-800 space-y-1">
            <p><span class="font-bold text-slate-400 text-xs uppercase block">Origem</span> <span class="text-base font-semibold">${pedido.origem}</span></p>
            <p><span class="font-bold text-slate-400 text-xs uppercase block">Destino</span> <span class="text-base font-semibold">${pedido.destino}</span></p>
            <p class="text-sm text-slate-600 pt-1 border-t border-slate-100 mt-2"><strong>Motivo:</strong> ${pedido.motivo}</p>
            ${countdownHTML}
        </div>
        ${botaoHTML}
    `;

    if (pedido.prazo_limite) {
        iniciarContador(pedido.id, pedido.prazo_limite);
    } else {
        limparContador(pedido.id);
    }
}

async function carregarPedidosAtivos() {
    const { data } = await supabaseClient.from('pedidos_maca').select('*').neq('status', 'CONCLUIDO').order('criado_em', { ascending: true });
    if (data) data.forEach(pedido => renderizarOuAtualizarCard(pedido));
}

supabaseClient
    .channel('fila_hospitalar')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_maca' }, payload => {
        if (payload.eventType === 'DELETE') {
            const card = document.getElementById(`pedido-${payload.old.id}`);
            if (card) card.remove();
        } else {
            renderizarOuAtualizarCard(payload.new);
        }
    })
    .subscribe();

verificarAutenticacao();
