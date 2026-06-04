import config from './config.js';

const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_KEY = config.SUPABASE_KEY;
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const prioridadeInput = document.getElementById('prioridade');
const btnBaixa = document.getElementById('btn-baixa');
const btnMedia = document.getElementById('btn-media');
const btnAlta = document.getElementById('btn-alta');

// função para logout
const btnLogout = document.getElementById('logout');
btnLogout.addEventListener('click', logout);
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// função para verificar se o usuário está logado e tem cargo MAQUEIRO
async function checkAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
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

    if (error || profile.cargo == 'MAQUEIRO') {
        alert('Acesso negado. Você não tem permissão para acessar esta página.');
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    } else {
        document.getElementById('usuario').textContent = `Bem-vindo, ${user.email}`;
    }
}

// Função para resetar os estilos dos botões de prioridade
function resetarBotoes() {
    const classesNeutras = "p-3 border-2 border-slate-200 bg-slate-50 text-slate-600 rounded-xl font-bold text-center transition-all";
    btnBaixa.className = classesNeutras;
    btnMedia.className = classesNeutras;
    btnAlta.className = classesNeutras;
}

// Configura os botões de prioridade para atualizar o campo oculto e destacar o botão selecionado
btnBaixa.addEventListener('click', () => { resetarBotoes(); prioridadeInput.value = 'BAIXA'; btnBaixa.className = "p-3 border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-xl font-bold text-center transition-all"; });
btnMedia.addEventListener('click', () => { resetarBotoes(); prioridadeInput.value = 'MEDIA'; btnMedia.className = "p-3 border-2 border-amber-500 bg-amber-50 text-amber-700 rounded-xl font-bold text-center transition-all"; });
btnAlta.addEventListener('click', () => { resetarBotoes(); prioridadeInput.value = 'ALTA'; btnAlta.className = "p-3 border-2 border-rose-500 bg-rose-50 text-rose-700 rounded-xl font-bold text-center transition-all"; });

// Função para enviar o formulário de solicitação de chamado
document.getElementById('form-solicitacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const origem = document.getElementById('origem').value;
    const destino = document.getElementById('destino').value;
    const prioridade = prioridadeInput.value;
    const motivo = document.getElementById('motivo').value;

    const { error } = await supabaseClient.from('chamado').insert([
        { origem, destino, prioridade, motivo, prazo_limite: new Date().toISOString() }
    ]);

    if (error) {
        alert(`Erro: ${error.message}`);
    } else {
        alert("🚨 Solicitação enviada com sucesso!");
        document.getElementById('form-solicitacao').reset();
        btnBaixa.click();
    }
});

checkAuth();