const SUPABASE_URL = 'https://wcccerxilknnbybmjvbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjY2NlcnhpbGtubmJ5Ym1qdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDYyODEsImV4cCI6MjA5NTM4MjI4MX0.42BLv5Dk1N-OMxv0_33LfX9MYXfOOD6h_mQS64M3gv0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function verificarAcesso() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    const { data: perfil } = await supabaseClient.from('perfis_usuarios').select('cargo').eq('id', user.id).single();
    if (!perfil || perfil.cargo !== 'ADMIN') {
        alert("Acesso negado: Tela restrita ao Administrador.");
        window.location.href = 'index.html';
        return;
    }
    carregarDadosPainel();
    carregarTabelaEquipe();
}

async function carregarDadosPainel() {
    const colPendentes = document.getElementById('coluna-pendentes');
    const colAndamento = document.getElementById('coluna-andamento');
    colPendentes.innerHTML = ''; colAndamento.innerHTML = '';

    const { data: pedidos } = await supabaseClient.from('pedidos_maca').select('*').neq('status', 'CONCLUIDO');
    
    if (pedidos) {
        pedidos.forEach(p => {
            const div = document.createElement('div');
            div.className = "p-3 bg-slate-800 rounded-lg border border-slate-700 text-xs";
            div.innerHTML = `<strong>${p.origem} ➔ ${p.destino}</strong><p class="text-slate-400 mt-1">Motivo: ${p.motivo} | [${p.prioridade}]</p>`;
            if (p.status === 'PENDENTE') colPendentes.appendChild(div);
            else colAndamento.appendChild(div);
        });
    }
}

async function carregarTabelaEquipe() {
    const tbody = document.getElementById('tabela-cargos');
    tbody.innerHTML = '';
    const { data: usuarios } = await supabaseClient.from('perfis_usuarios').select('*').order('email');

    if (usuarios) {
        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-slate-800/50";
            tr.innerHTML = `
                <td class="py-2">${u.email}</td>
                <td class="py-2">
                    <select id="sel-${u.id}" class="bg-slate-800 text-slate-200 p-1 rounded text-xs">
                        <option value="MAQUEIRO" ${u.cargo === 'MAQUEIRO' ? 'selected' : ''}>🏃 MAQUEIRO</option>
                        <option value="SOLICITANTE" ${u.cargo === 'SOLICITANTE' ? 'selected' : ''}>🩺 SOLICITANTE</option>
                        <option value="ADMIN" ${u.cargo === 'ADMIN' ? 'selected' : ''}>📊 ADMIN</option>
                    </select>
                </td>
                <td class="py-2 text-right"><button onclick="atualizarCargo('${u.id}')" class="bg-blue-600 px-2 py-1 rounded font-bold text-[10px]">Salvar</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function atualizarCargo(userId) {
    const novoCargo = document.getElementById(`sel-${userId}`).value;
    await supabaseClient.from('perfis_usuarios').update({ cargo: novoCargo }).eq('id', userId);
    alert("Cargo modificado com sucesso!");
    carregarTabelaEquipe();
}

window.atualizarCargo = atualizarCargo;
verificarAcesso();