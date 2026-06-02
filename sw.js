// Ouvinte de eventos de Push do Sistema Operacional (Android/iOS)
self.addEventListener('push', function(event) {
    console.log('Notificação Push recebida em segundo plano!');

    let dados = {
        titulo: '🏥 Novo Chamado de Maca!',
        corpo: 'Há uma nova solicitação aguardando atendimento.',
        url: 'maqueiro.html'
    };

    // Se o backend enviou dados formatados em JSON, nós lemos aqui
    if (event.data) {
        try {
            dados = event.data.json();
        } catch (e) {
            dados.corpo = event.data.text();
        }
    }

    const opcoes = {
        body: dados.corpo,
        icon: 'https://cdn-icons-png.flaticon.com/512/4807/4807938.png', // Ícone genérico de maca/médico
        badge: 'https://cdn-icons-png.flaticon.com/512/4807/4807938.png',
        vibrate: [200, 100, 200, 100, 400], // Faz o celular vibrar em padrão de alerta
        data: {
            url: dados.url
        },
        actions: [
            { action: 'abrir', title: '👁️ Ver Fila' }
        ]
    };

    // Exibe a notificação nativa na tela do aparelho
    event.waitUntil(
        self.registration.showNotification(dados.titulo, opcoes)
    );
});

// Ação de clicar na notificação (Abre o aplicativo direto na fila)
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Fecha o card da notificação

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Se o app já estiver aberto em alguma aba, foca nela
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes('maqueiro.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Se o app estiver fechado, abre uma nova janela na tela do maqueiro
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url || 'maqueiro.html');
            }
        })
    );
});