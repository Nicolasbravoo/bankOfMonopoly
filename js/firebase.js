// ==================== CONFIGURACIÓN DE FIREBASE ====================
// IMPORTANTE: Reemplaza con tus credenciales de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    databaseURL: "TU_DATABASE_URL",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==================== UTILIDADES ====================
const Utils = {
    // Generar código único de sala (6 caracteres alfanuméricos)
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    // Generar ID único para jugadores y transacciones
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Formatear dinero
    formatMoney(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    },

    // Formatear fecha/hora
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Justo ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} h`;
        
        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Obtener nombre de transacción según tipo
    getTransactionName(type) {
        const names = {
            salary: '💵 Cobrar Salida',
            property: '🏠 Compra de Propiedad',
            house: '🏡 Compra de Casa',
            hotel: '🏨 Compra de Hotel',
            tax_income: '💰 Impuesto sobre Ingresos',
            tax_luxury: '💎 Impuesto de Lujo',
            fine: '🚫 Multa',
            bank_error: '🏦 Error del Banco',
            rent: '🏠 Alquiler',
            other_income: '➕ Otro Ingreso',
            other_expense: '➖ Otro Gasto'
        };
        return names[type] || type;
    },

    // Mostrar notificación
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification show ${type}`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    },

    // Mostrar/ocultar loading
    toggleLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('show', show);
        }
    },

    // Validar que el monto sea válido
    validateAmount(amount) {
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0 && Number.isInteger(num);
    },

    // Obtener iniciales del nombre
    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substr(0, 2);
    }
};

// ==================== API DE BASE DE DATOS ====================
const DB = {
    // Verificar si una sala existe
    async roomExists(roomCode) {
        const snapshot = await database.ref(`rooms/${roomCode}`).once('value');
        return snapshot.exists();
    },

    // Crear nueva sala
    async createRoom(roomCode, bankId, bankName, initialMoney) {
        const roomData = {
            info: {
                bankId: bankId,
                bankName: bankName,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                status: 'active',
                initialMoney: initialMoney
            },
            players: {
                [bankId]: {
                    name: bankName,
                    money: 0, // El banco no tiene dinero propio
                    isBank: true,
                    color: '#2c3e50',
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                }
            }
        };

        await database.ref(`rooms/${roomCode}`).set(roomData);
        return roomCode;
    },

    // Unir jugador a sala
    async joinRoom(roomCode, playerId, playerName, color) {
        const roomRef = database.ref(`rooms/${roomCode}`);
        const snapshot = await roomRef.once('value');
        
        if (!snapshot.exists()) {
            throw new Error('La sala no existe');
        }

        const roomData = snapshot.val();
        if (roomData.info.status !== 'active') {
            throw new Error('La sala ya no está activa');
        }

        const initialMoney = roomData.info.initialMoney || 1500;

        const playerData = {
            name: playerName,
            money: initialMoney,
            isBank: false,
            color: color,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        };

        await roomRef.child(`players/${playerId}`).set(playerData);
        return playerId;
    },

    // Obtener información de la sala
    onRoomChange(roomCode, callback) {
        return database.ref(`rooms/${roomCode}`).on('value', (snapshot) => {
            callback(snapshot.val());
        });
    },

    // Detener escucha de cambios
    offRoomChange(roomCode) {
        database.ref(`rooms/${roomCode}`).off();
    },

    // Ejecutar transacción (CRÍTICO: usa transacciones de Firebase)
    async executeTransaction(roomCode, transactionData) {
        const { type, from, to, amount, concept } = transactionData;
        
        if (!Utils.validateAmount(amount)) {
            throw new Error('Monto inválido');
        }

        const transactionRef = database.ref(`rooms/${roomCode}`);
        
        try {
            await transactionRef.transaction((room) => {
                if (!room) return room;

                // Verificar que los jugadores existen
                if (!room.players[from] || !room.players[to]) {
                    throw new Error('Jugador no encontrado');
                }

                // Verificar saldo suficiente (solo si no es el banco quien paga)
                if (!room.players[from].isBank && room.players[from].money < amount) {
                    throw new Error('Saldo insuficiente');
                }

                // Ejecutar la transacción
                if (!room.players[from].isBank) {
                    room.players[from].money -= amount;
                }
                if (!room.players[to].isBank) {
                    room.players[to].money += amount;
                }

                // Registrar en historial
                const transactionId = Utils.generateId();
                if (!room.transactions) {
                    room.transactions = {};
                }

                room.transactions[transactionId] = {
                    type: type,
                    from: from,
                    fromName: room.players[from].name,
                    to: to,
                    toName: room.players[to].name,
                    amount: amount,
                    concept: concept || '',
                    timestamp: Date.now(),
                    status: 'completed'
                };

                return room;
            });

            return { success: true };
        } catch (error) {
            throw new Error(error.message || 'Error al ejecutar transacción');
        }
    },

    // Terminar juego
    async endGame(roomCode) {
        await database.ref(`rooms/${roomCode}/info/status`).set('finished');
    },

    // Eliminar jugador de sala
    async removePlayer(roomCode, playerId) {
        await database.ref(`rooms/${roomCode}/players/${playerId}`).remove();
    },

    // Limpiar historial
    async clearHistory(roomCode) {
        await database.ref(`rooms/${roomCode}/transactions`).remove();
    }
};

// Exportar para uso global
window.Utils = Utils;
window.DB = DB;
window.database = database;