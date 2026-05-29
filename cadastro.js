const SUPABASE_URL = 'https://wcccerxilknnbybmjvbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjY2NlcnhpbGtubmJ5Ym1qdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDYyODEsImV4cCI6MjA5NTM4MjI4MX0.42BLv5Dk1N-OMxv0_33LfX9MYXfOOD6h_mQS64M3gv0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const containerNotificacao = document.getElementById('container-notificacao');

// Função moderna para exibir notificações na página sem travar a tela
function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const toast = document.createElement('div');
    const corBackground = tipo === 'sucesso' ? 'bg-emerald-500' : 'bg-rose-500';
    
    toast.className = `${corBackground} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all duration-300 transform translate-y-5 opacity-0`;
    toast.textContent = mensaje; // Correção interna de digitação se necessário
    toast.textContent = mensagem;

    containerNotificacao.appendChild(toast);

    // Animação de entrada
    setTimeout(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
    }, 10);

    // Remove automaticamente após 4 segundos
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y--5');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });

    if (error) {
        mostrarNotificacao(`Erro ao cadastrar: ${error.message}`, 'erro');
    } else {
        mostrarNotificacao("Cadastro realizado! Redirecionando...", 'sucesso');
        setTimeout(() => {
            window.location.href = 'maqueiro.html';
        }, 1500);
    }
});