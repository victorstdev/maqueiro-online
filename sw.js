// Interceptador de eventos em segundo plano
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'NOVO_CHAMADO') {
        const pedido = event.data.pedido;
        const titulo = `🏥 Maca Urgente: ${pedido.prioridade}!`;
        const opcoes = {
            body: `📍 Origem: ${pedido.origem}\n🏁 Destino: ${pedido.destino}\n📝 Motivo: ${pedido.motivo}`,
            icon: 'https://cdn-icons-png.flaticon.com/512/4807/4807938.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/4807/4807938.png',
            vibrate: [300, 100, 300, 100, 500],
            data: { url: 'maqueiro.html' }
        };
        self.registration.showNotification(titulo, opcoes);
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes('maqueiro.html') && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('maqueiro.html');
        })
    );
});