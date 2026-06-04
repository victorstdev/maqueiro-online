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

document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const senha = document.getElementById('senha').value;

    if (senha.length < 6) {
        mostrarNotificacao("A senha deve ter no mínimo 6 caracteres.", "erro");
        return;
    }

    mostrarNotificacao("Criando conta no hospital...", "sucesso");

    const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });

    if (error) {
        mostrarNotificacao(`Erro ao cadastrar: ${error.message}`, "erro");
    } else {
        mostrarNotificacao("🎉 Conta criada! Redirecionando para o login...", "sucesso");
        await supabaseClient.auth.signOut(); // Limpa tokens residuais
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    }
});