const SUPABASE_URL = 'https://wcccerxilknnbybmjvbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjY2NlcnhpbGtubmJ5Ym1qdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDYyODEsImV4cCI6MjA5NTM4MjI4MX0.42BLv5Dk1N-OMxv0_33LfX9MYXfOOD6h_mQS64M3gv0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const colPendentes = document.getElementById('coluna-pendentes');
const colAndamento = document.getElementById('coluna-andamento');
const tabJustificativas = document.getElementById('tabela-justificativas');
const txtPendentes = document.getElementById('qtd-pendentes');
const txtAndamento = document.getElementById('qtd-andamento');
const txtJustificativas = document.getElementById('qtd-justificativas');

// 🌟 TRAVA DE SEGURANÇA REVISADA: Proteção da Tela da Central
async function protegerTelaCentral() {
    // 1. Verifica se o usuário está logado
    const { data: { user }, error: errorAuth } = await supabaseClient.auth.getUser();
    
    if (errorAuth || !user) {
        window.location.href = 'index.html';
        return;
    }

    // 2. Busca o cargo do usuário para validar o acesso
    const { data: perfil, error: errorPerfil } = await supabaseClient
        .from('perfis_usuarios')
        .select('cargo')
        .eq('id', user.id)
        .single();

    if (errorPerfil || !perfil) {
        window.location.href = 'index.html';
        return;
    }

    // 3. Se NÃO for ADMIN, bloqueia a tela e redireciona de acordo com o cargo
    if (perfil.cargo !== 'ADMIN') {
        alert("Acesso Negado: Esta tela é exclusiva para administradores da central.");
        
        if (perfil.cargo === 'SOLICITANTE') {
            window.location.href = 'solicitante.html';
        } else {
            window.location.href = 'maqueiro.html';
        }
        return;
    }

    console.log(`Central autorizada para o administrador: ${user.email}`);
    
    // 🌟 Só inicializa os dados e os canais em tempo real após garantir que é um ADMIN
    iniciarPainel();
}

function renderizarCardPainel(pedido) {
    const cardExistente = document.getElementById(`painel-pedido-${pedido.id}`);
    if (cardExistente) cardExistente.remove();
    if (pedido.status === 'CONCLUIDO') { atualizarContadores(); return; }

    const card = document.createElement('div');
    card.id = `painel-pedido-${pedido.id}`;
    card.className = `p-4 rounded-xl border-l-4 bg-slate-800 border-slate-700 shadow-sm flex flex-col gap-2`;
    
    if(pedido.prioridade === 'ALTA') card.classList.add('border-l-rose-500');
    if(pedido.prioridade === 'MEDIA') card.classList.add('border-l-amber-500');
    if(pedido.prioridade === 'BAIXA') card.classList.add('border-l-sky-500');

    const prazo = pedido.prazo_limite ? new Date(pedido.prazo_limite).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
    card.innerHTML = `<div class="flex justify-between items-center text-xs"><span class="font-bold uppercase text-slate-400">${pedido.prioridade}</span><span class="text-slate-400 font-semibold">⏱️ Limite: ${prazo}</span></div>
        <p class="text-sm font-medium text-slate-200">${pedido.origem} ➔ ${pedido.destino}</p>
        <p class="text-xs text-slate-400 italic">M: ${pedido.motivo}</p>`;

    if (pedido.status === 'PENDENTE') colPendentes.insertBefore(card, colPendentes.firstChild);
    else if (pedido.status === 'A_CAMINHO') colAndamento.insertBefore(card, colAndamento.firstChild);
    atualizarContadores();
}

function adicionarLinhaJustificativa(just) {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800/60 text-xs hover:bg-slate-800/20";
    const hora = new Date(just.criado_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    tr.innerHTML = `<td class="py-3 text-slate-500">...${just.pedido_id.substring(0,6)}</td><td class="py-3 font-semibold text-slate-300">Maqueiro Plantonista</td><td class="py-3 text-rose-400 font-medium">${just.motivo_atraso}</td><td class="py-3 text-right text-slate-500">${hora}</td>`;
    tabJustificativas.insertBefore(tr, tabJustificativas.firstChild);
}

function atualizarContadores() {
    txtPendentes.textContent = colPendentes.children.length;
    txtAndamento.textContent = colAndamento.children.length;
}

async function iniciarPainel() {
    const { data: pedidos } = await supabaseClient.from('pedidos_maca').select('*').neq('status', 'CONCLUIDO');
    if (pedidos) pedidos.forEach(p => renderizarCardPainel(p));

    const { data: justs } = await supabaseClient.from('justificativas_atraso').select('*').order('criado_em', { ascending: true });
    if (justs) { justs.forEach(j => adicionarLinhaJustificativa(j)); txtJustificativas.textContent = justs.length; }
}

supabaseClient.channel('painel_central')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_maca' }, payload => {
        if (payload.eventType === 'DELETE') {
            const card = document.getElementById(`painel-pedido-${payload.old.id}`);
            if (card) card.remove();
            atualizarContadores();
        } else { renderizarCardPainel(payload.new); }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'justificativas_atraso' }, payload => {
        adicionarLinhaJustificativa(payload.new);
        txtJustificativas.textContent = parseInt(txtJustificativas.textContent) + 1;
    }).subscribe();

protetelaCentral();