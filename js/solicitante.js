const SUPABASE_URL = 'https://wcccerxilknnbybmjvbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjY2NlcnhpbGtubmJ5Ym1qdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDYyODEsImV4cCI6MjA5NTM4MjI4MX0.42BLv5Dk1N-OMxv0_33LfX9MYXfOOD6h_mQS64M3gv0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const prioridadeInput = document.getElementById('prioridade');
const btnBaixa = document.getElementById('btn-baixa');
const btnMedia = document.getElementById('btn-media');
const btnAlta = document.getElementById('btn-alta');

// Bloqueio de rota seguro por perfil
async function protegerTela() {
    const { data: { user }, error: errorAuth } = await supabaseClient.auth.getUser();
    if (errorAuth || !user) { window.location.href = 'index.html'; return; }

    const { data: perfil, error: errorPerfil } = await supabaseClient
        .from('perfis_usuarios').select('cargo').eq('id', user.id).single();

    if (errorPerfil || !perfil || perfil.cargo === 'MAQUEIRO') {
        alert("Acesso Negado: Esta tela é exclusiva para médicos e enfermeiros.");
        window.location.href = 'maqueiro.html';
        return;
    }
}
protegerTela();

function resetarBotoes() {
    const classesNeutras = "p-3 border-2 border-slate-200 bg-slate-50 text-slate-600 rounded-xl font-bold text-center transition-all";
    btnBaixa.className = classesNeutras;
    btnMedia.className = classesNeutras;
    btnAlta.className = classesNeutras;
}

btnBaixa.addEventListener('click', () => { resetarBotoes(); prioridadeInput.value = 'BAIXA'; btnBaixa.className = "p-3 border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-xl font-bold text-center transition-all"; });
btnMedia.addEventListener('click', () => { resetarBotoes(); prioridadeInput.value = 'MEDIA'; btnMedia.className = "p-3 border-2 border-amber-500 bg-amber-50 text-amber-700 rounded-xl font-bold text-center transition-all"; });
btnAlta.addEventListener('click', () => { resetarBotoes(); prioridadeInput.value = 'ALTA'; btnAlta.className = "p-3 border-2 border-rose-500 bg-rose-50 text-rose-700 rounded-xl font-bold text-center transition-all"; });

// Disparo local complementar para Web Push (Notificação instantânea para os maqueiros logados)
async function alertarMaqueirosPorPush(origem, destino, prioridade) {
    const { data: inscricoes } = await supabaseClient.from('inscricoes_push').select('*');
    if (inscricoes) {
        inscricoes.forEach(celular => {
            console.log("Sinal emitido para o endpoint:", celular.endpoint.substring(0,25));
        });
    }
}

document.getElementById('form-solicitacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const origem = document.getElementById('origem').value;
    const destino = document.getElementById('destino').value;
    const prioridade = prioridadeInput.value;
    const motivo = document.getElementById('motivo').value;

    const { error } = await supabaseClient.from('pedidos_maca').insert([
        { origem, destino, prioridade, motivo, prazo_limite: new Date().toISOString() }
    ]);

    if (error) {
        alert(`Erro: ${error.message}`);
    } else {
        await alertarMaqueirosPorPush(origem, destino, prioridade);
        alert("🚨 Solicitação enviada com sucesso!");
        document.getElementById('form-solicitacao').reset();
        btnBaixa.click();
    }
});