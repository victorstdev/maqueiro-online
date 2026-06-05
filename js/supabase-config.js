// supabase-config.js
const SUPABASE_URL = "https://bjbfhuoqafsmzxxjxjfp.supabase.co";
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYmZodW9xYWZzbXp4eGp4amZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDIzMjcsImV4cCI6MjA5NjE3ODMyN30.1FM05kRXZysXGjA-_rBHAuOhR8rHkgdNy-EaEiUayTs';

// Inicializa o cliente globalmente se a biblioteca CDN já estiver carregada
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Função utilitária para buscar o perfil do usuário logado
async function obterPerfilUsuario(userId) {
    const { data, error } = await supabaseClient
        .from('perfil_acesso')
        .select('perfil')
        .eq('usuario_id', userId)
        .single();
    
    if (error || !data) return null;
    return data.perfil;
}

// Sistema de Notificações Toast Reaproveitável
function mostrarNotificacao(mensagem, tipo = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerText = mensagem;

    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}