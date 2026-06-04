SUPABASE_URL = 'https://kospkdzovtsudwxppseg.supabase.co';
SUPABASE_KEY ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvc3BrZHpvdnRzdWR3eHBwc2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzQzMDQsImV4cCI6MjA5NjE1MDMwNH0.raojiD9xNGkWwfAZbpkXk2R57bANPkKfWDfd39tJeY8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const filaContainer = document.getElementById('fila');
let listaPedidosAtivos = [];
let idPerfil = null;
let emailPerfil = null;

// função para logout
const btnLogout = document.getElementById('logout');
btnLogout.addEventListener('click', logout);
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// função para verificar se o usuário está logado e tem cargo MAQUEIRO
async function checkAuth() {
    const { data: { user }, error: errorAuth } = await supabaseClient.auth.getUser();
    if (errorAuth || !user) {
        alert('Acesso negado. Por favor, faça login para acessar esta página.');
        window.location.href = 'index.html';
        return;
    }

    // Verificar se o usuário tem cargo de maqueiro
    const { data: profile, error } = await supabaseClient
        .from('perfis_usuarios')
        .select('cargo')
        .eq('id', user.id)
        .single();

    if (error || profile.cargo !== 'MAQUEIRO') {
        alert('Acesso negado. Você não tem permissão para acessar esta página.');
        logout();
    } else {
        idPerfil = user.id;
        emailPerfil = user.email;
        document.getElementById('usuario').textContent = `Bem-vindo, ${emailPerfil}`;
        loadChamados();
    }
}

// Função para carregar ou atualizar os chamados da fila
async function loadChamados() {
    const { data: chamados, error } = await supabaseClient
        .from('chamado')
        .select('*')
        .neq('status', 'CONCLUIDO')
        .order('criado_em', { ascending: true });

    if (error) {
        console.error('Erro ao carregar chamados:', error);
        return;
    }

    filaContainer.innerHTML = '';
    listaPedidosAtivos = [];

    if(chamados){
        chamados.forEach(chamado => renderizarChamado(chamado));
    }
}

// Função para renderizar um chamado na fila
function renderizarChamado(chamado) {
    if(!chamado || !chamado.id) return;

    if(chamado.status === 'CONCLUIDO'){
        listaPedidosAtivos = listaPedidosAtivos.filter(c => c.id !== chamado.id);
        const cardExistente = document.getElementById(`chamado-${chamado.id}`);
        if(cardExistente) cardExistente.remove();
        return;
    };

    const index = listaPedidosAtivos.findIndex(c => c.id === chamado.id);
    if(index === -1){
        listaPedidosAtivos.push(chamado);
    } else {
        listaPedidosAtivos[index] = chamado;
    }

    let card = document.getElementById(`chamado-${chamado.id}`);
    if (!card) {
        card = document.createElement('div');
        card.id = `chamado-${chamado.id}`;
        card.className = `card-maca prioridade-${chamado.prioridade}`;
        filaContainer.appendChild(card);
    }

    let btnHTML = '';
    if (chamado.status === 'PENDENTE') {
        btnHTML = `<button class="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md active:scale-[0.98]" onclick="aceitarChamado('${chamado.id}')">Aceitar Chamado</button>`;
    }else if (chamado.status === 'EM_ANDAMENTO') {
        if(chamado.maqueiro_id === supabaseClient.auth.getUser().data.user.id){
            btnHTML = `<button class="w-full mt-4 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-md active:scale-[0.98]" onclick="concluirChamado('${chamado.id}')">Concluir Chamado</button>`;
        } else {
            btnHTML = `<span class="text-sm text-gray-500 mt-2 block">Em andamento por outro maqueiro</span>`;
        }
    }

    card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-extrabold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">${chamado.status === 'EM ANDAMENTO' ? '🏃 EM TRÂNSITO' : '⏳ PENDENTE'}</span>
            <div class="badge-tempo flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">
                ⏱️ <span class="cronometro-timer">Calculando...</span>
            </div>
        </div>
        <div class="text-slate-800 space-y-1.5">
            <p><span class="font-bold text-slate-400 text-[11px] tracking-wide uppercase block">Origem</span><span class="text-base font-semibold text-slate-800">${chamado.origem}</span></p>
            <p><span class="font-bold text-slate-400 text-[11px] tracking-wide uppercase block">Destino</span><span class="text-base font-semibold text-slate-800">${chamado.destino}</span></p>
            <p class="text-sm text-slate-600 pt-2 border-t border-slate-100 mt-2"><strong>Motivo:</strong> ${chamado.motivo}</p>
        </div>
        ${btnHTML}
    `;
}

// Função para aceitar um chamado
async function aceitarChamado(chamadoId) {
    if (!idPerfil) return;
    const { error } = await supabaseClient.rpc('aceitar_chamado', { pedido_id: chamadoId,  maqueiro_id: idPerfil });
    if (error) {
        console.error('Erro ao aceitar chamado:', error);
        alert('Ocorreu um erro ao aceitar o chamado. Tente novamente.');
    }
}

// Chama a função de verificação de autenticação ao carregar a página
checkAuth();