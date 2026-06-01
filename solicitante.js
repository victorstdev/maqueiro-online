const SUPABASE_URL = 'https://wcccerxilknnbybmjvbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjY2NlcnhpbGtubmJ5Ym1qdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDYyODEsImV4cCI6MjA5NTM4MjI4MX0.42BLv5Dk1N-OMxv0_33LfX9MYXfOOD6h_mQS64M3gv0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    if (perfil.cargo === 'MAQUEIRO') {
        alert("⚠️ Acesso restrito: Maqueiros devem usar o aplicativo específico para maqueiros.");
        window.location.href = 'index.html';
        return;
    }
}

verificarAutenticacao();

const prioridadeInput = document.getElementById('prioridade');
const btnBaixa = document.getElementById('btn-baixa');
const btnMedia = document.getElementById('btn-media');
const btnAlta = document.getElementById('btn-alta');

// Gerenciamento dos botões de prioridade
function resetarBotoes() {
    const classesNeutras = "p-3 border-2 border-slate-200 bg-slate-50 text-slate-600 rounded-xl font-bold text-center transition-all";
    btnBaixa.className = classesNeutras;
    btnMedia.className = classesNeutras;
    btnAlta.className = classesNeutras;
}

btnBaixa.addEventListener('click', () => {
    resetarBotoes();
    prioridadeInput.value = 'BAIXA';
    btnBaixa.className = "p-3 border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-xl font-bold text-center transition-all";
});

btnMedia.addEventListener('click', () => {
    resetarBotoes();
    prioridadeInput.value = 'MEDIA';
    btnMedia.className = "p-3 border-2 border-amber-500 bg-amber-50 text-amber-700 rounded-xl font-bold text-center transition-all";
});

btnAlta.addEventListener('click', () => {
    resetarBotoes();
    prioridadeInput.value = 'ALTA';
    btnAlta.className = "p-3 border-2 border-rose-500 bg-rose-50 text-rose-700 rounded-xl font-bold text-center transition-all";
});

// Envio do formulário
document.getElementById('form-solicitacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dados = {
        origem: document.getElementById('origem').value,
        destino: document.getElementById('destino').value,
        prioridade: prioridadeInput.value,
        motivo: document.getElementById('motivo').value,
        prazo_limite: new Date().toISOString()
    };

    const { error } = await supabaseClient.from('pedidos_maca').insert([dados]);

    if (error) {
        alert(`Erro: ${error.message}`);
    } else {
        alert("🚨 Solicitação enviada com sucesso!");
        document.getElementById('form-solicitacao').reset();
        btnBaixa.click(); // Volta para o padrão
    }
});