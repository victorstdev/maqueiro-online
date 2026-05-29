const SUPABASE_URL = 'https://wcccerxilknnbybmjvbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjY2NlcnhpbGtubmJ5Ym1qdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDYyODEsImV4cCI6MjA5NTM4MjI4MX0.42BLv5Dk1N-OMxv0_33LfX9MYXfOOD6h_mQS64M3gv0';

const MAQUEIRO_SIMULADO_ID = '99999999-9999-9999-9999-999999999999'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const filaElemento = document.getElementById('fila');

async function aceitarCorrida(pedidoId) {
    await supabaseClient.rpc('aceitar_pedido', { pedido_id: pedidoId, maqueiro_id: MAQUEIRO_SIMULADO_ID });
}

async function finalizarEntregaDireto(pedidoId) {
    let justificativa = null;
    const { error } = await supabaseClient.rpc('concluir_pedido_direto', { 
        pedido_id: pedidoId, maqueiro_id: MAQUEIRO_SIMULADO_ID, justificativa: justificativa
    });

    if (error && error.message.includes('PRAZO_ESTOURADO')) {
        justificativa = prompt("⚠️ O prazo acabou! Digite o motivo do atraso para conseguir fechar o chamado:");
        if (justificativa) {
            await supabaseClient.rpc('concluir_pedido_direto', { 
                pedido_id: pedidoId, maqueiro_id: MAQUEIRO_SIMULADO_ID, justificativa: justificativa
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
        </div>
        ${botaoHTML}
    `;
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

carregarPedidosAtivos();