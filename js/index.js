import config from './config.js';

const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_KEY = config.SUPABASE_KEY;
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const containerNotificacao = document.getElementById('container-notificacao');

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const toast = document.createElement('div');
    const corBg = tipo === 'sucesso' ? 'bg-emerald-500' : 'bg-rose-500';
    toast.className = `${corBg} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all duration-300`;
    toast.textContent = mensagem;
    containerNotificacao.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

async function redirecionarLogin(userUuid) {
    const { data, error } = await supabaseClient
        .from('perfis_usuarios')
        .select('cargo')
        .eq('id', userUuid)
        .single();

    if (error || !data) {
        mostrarNotificacao("Erro ao identificar perfil de acesso.", 'erro');
        return;
    }

    if (data.cargo === 'SOLICITANTE') window.location.href = 'solicitante.html';
    else if (data.cargo === 'MAQUEIRO') window.location.href = 'maqueiro.html';
    else if (data.cargo === 'ADMIN') window.location.href = 'central.html';
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

    if (error) {
        mostrarNotificacao(`Erro no login: ${error.message}`, 'erro');
    } else {
        mostrarNotificacao("Login efetuado! Carregando perfil...", 'sucesso');
        setTimeout(() => redirecionarLogin(data.user.id), 1000);
    }
});