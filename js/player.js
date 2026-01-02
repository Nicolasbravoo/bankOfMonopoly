// ==================== VARIABLES GLOBALES ====================
let roomCode = null;
let playerId = null;
let currentRoomData = null;
let playerData = null;

// ==================== ELEMENTOS DEL DOM ====================
const playerAvatar = document.getElementById('playerAvatar');
const playerInitial = document.getElementById('playerInitial');
const playerName = document.getElementById('playerName');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playerMoney = document.getElementById('playerMoney');
const playersGrid = document.getElementById('playersGrid');
const rentPlayerSelect = document.getElementById('rentPlayerSelect');
const rentAmount = document.getElementById('rentAmount');
const rentProperty = document.getElementById('rentProperty');
const payRentBtn = document.getElementById('payRentBtn');
const historyList = document.getElementById('historyList');
const totalReceived = document.getElementById('totalReceived');
const totalSpent = document.getElementById('totalSpent');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    roomCode = localStorage.getItem('monopoly_roomCode');
    playerId = localStorage.getItem('monopoly_playerId');
    const isBank = localStorage.getItem('monopoly_isBank') === 'true';

    if (!roomCode || !playerId || isBank) {
        Utils.showNotification('Sesión inválida', 'error');
        setTimeout(() => window.location.href = 'index.html', 1000);
        return;
    }

    // Verificar que la sala existe
    const exists = await DB.roomExists(roomCode);
    if (!exists) {
        Utils.showNotification('La sala ya no existe', 'error');
        localStorage.clear();
        setTimeout(() => window.location.href = 'index.html', 1000);
        return;
    }

    // Mostrar código de sala
    roomCodeDisplay.textContent = roomCode;

    // Configurar event listeners
    setupEventListeners();

    // Escuchar cambios en tiempo real
    DB.onRoomChange(roomCode, handleRoomUpdate);
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Pagar alquiler
    payRentBtn.addEventListener('click', handlePayRent);

    // Montos rápidos
    document.querySelectorAll('.btn-quick').forEach(btn => {
        btn.addEventListener('click', function() {
            rentAmount.value = this.getAttribute('data-amount');
        });
    });

    // Salir de la sala
    leaveRoomBtn.addEventListener('click', confirmLeaveRoom);

    // Modal de confirmación
    confirmNo.addEventListener('click', closeConfirmModal);

    // Permitir Enter para pagar
    rentAmount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePayRent();
    });
}

// ==================== MANEJO DE DATOS EN TIEMPO REAL ====================
function handleRoomUpdate(roomData) {
    if (!roomData) {
        Utils.showNotification('La sala ha sido eliminada', 'error');
        localStorage.clear();
        setTimeout(() => window.location.href = 'index.html', 1000);
        return;
    }

    if (roomData.info.status === 'finished') {
        Utils.showNotification('El juego ha terminado', 'warning');
        setTimeout(() => {
            localStorage.clear();
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Verificar que el jugador todavía existe
    if (!roomData.players[playerId]) {
        Utils.showNotification('Has sido eliminado de la sala', 'error');
        localStorage.clear();
        setTimeout(() => window.location.href = 'index.html', 1000);
        return;
    }

    currentRoomData = roomData;
    playerData = roomData.players[playerId];
    
    updatePlayerInfo();
    renderOtherPlayers();
    updateRentPlayerSelect();
    renderHistory();
    calculateStats();
}

// ==================== RENDERIZADO ====================
function updatePlayerInfo() {
    if (!playerData) return;

    playerName.textContent = playerData.name;
    playerMoney.textContent = Utils.formatMoney(playerData.money);
    playerInitial.textContent = Utils.getInitials(playerData.name);
    playerAvatar.style.background = playerData.color;

    // Cambiar color si está en negativo
    if (playerData.money < 0) {
        playerMoney.style.color = 'var(--danger)';
    } else {
        playerMoney.style.color = 'var(--success)';
    }
}

function renderOtherPlayers() {
    if (!currentRoomData || !currentRoomData.players) return;

    const otherPlayers = Object.entries(currentRoomData.players)
        .filter(([id, player]) => id !== playerId && !player.isBank);

    if (otherPlayers.length === 0) {
        playersGrid.innerHTML = '<p style="text-align: center; color: #95a5a6; padding: 40px; grid-column: 1/-1;">Esperando a otros jugadores...</p>';
        return;
    }

    playersGrid.innerHTML = otherPlayers.map(([id, player]) => `
        <div class="other-player-card" style="border-top-color: ${player.color}">
            <div class="other-player-avatar" style="background: ${player.color}">
                ${Utils.getInitials(player.name)}
            </div>
            <div class="other-player-name">${player.name}</div>
            <div class="other-player-money ${player.money < 0 ? 'negative' : ''}">
                ${Utils.formatMoney(player.money)}
            </div>
        </div>
    `).join('');
}

function updateRentPlayerSelect() {
    if (!currentRoomData || !currentRoomData.players) return;

    const otherPlayers = Object.entries(currentRoomData.players)
        .filter(([id, player]) => id !== playerId && !player.isBank);

    rentPlayerSelect.innerHTML = '<option value="">Seleccionar jugador...</option>' +
        otherPlayers.map(([id, player]) => 
            `<option value="${id}">${player.name} - ${Utils.formatMoney(player.money)}</option>`
        ).join('');
}

function renderHistory() {
    if (!currentRoomData || !currentRoomData.transactions) {
        historyList.innerHTML = '<p style="text-align: center; color: #95a5a6; padding: 20px;">No tienes transacciones aún</p>';
        return;
    }

    // Filtrar transacciones del jugador
    const playerTransactions = Object.entries(currentRoomData.transactions)
        .map(([id, tx]) => ({ id, ...tx }))
        .filter(tx => tx.from === playerId || tx.to === playerId)
        .sort((a, b) => b.timestamp - a.timestamp);

    if (playerTransactions.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #95a5a6; padding: 20px;">No tienes transacciones aún</p>';
        return;
    }

    historyList.innerHTML = playerTransactions.map(tx => {
        const isReceived = tx.to === playerId;
        const direction = isReceived ? 'positive' : 'negative';

        return `
            <div class="history-item ${direction}">
                <div class="history-item-header">
                    <span class="history-type">${Utils.getTransactionName(tx.type)}</span>
                    <span class="history-amount ${direction}">
                        ${isReceived ? '+' : '-'}${Utils.formatMoney(tx.amount)}
                    </span>
                </div>
                <div class="history-details">
                    ${isReceived 
                        ? `<strong>Recibido de:</strong> ${tx.fromName}` 
                        : `<strong>Pagado a:</strong> ${tx.toName}`}
                    ${tx.concept ? `<br><strong>Concepto:</strong> ${tx.concept}` : ''}
                </div>
                <div class="history-timestamp">${Utils.formatTimestamp(tx.timestamp)}</div>
            </div>
        `;
    }).join('');
}

function calculateStats() {
    if (!currentRoomData || !currentRoomData.transactions) {
        totalReceived.textContent = '$0';
        totalSpent.textContent = '$0';
        return;
    }

    let received = 0;
    let spent = 0;

    Object.values(currentRoomData.transactions).forEach(tx => {
        if (tx.to === playerId) {
            received += tx.amount;
        }
        if (tx.from === playerId) {
            spent += tx.amount;
        }
    });

    totalReceived.textContent = Utils.formatMoney(received);
    totalSpent.textContent = Utils.formatMoney(spent);
}

// ==================== PAGAR ALQUILER ====================
async function handlePayRent() {
    const selectedPlayer = rentPlayerSelect.value;
    const amount = parseInt(rentAmount.value);
    const property = rentProperty.value.trim();

    // Validaciones
    if (!selectedPlayer) {
        Utils.showNotification('Selecciona a quién pagar', 'error');
        return;
    }

    if (!Utils.validateAmount(amount)) {
        Utils.showNotification('Ingresa un monto válido (número entero positivo)', 'error');
        rentAmount.focus();
        return;
    }

    if (amount <= 0) {
        Utils.showNotification('El monto debe ser mayor a cero', 'error');
        rentAmount.focus();
        return;
    }

    if (playerData.money < amount) {
        Utils.showNotification('No tienes suficiente dinero para este pago', 'error');
        return;
    }

    if (!property) {
        Utils.showNotification('Ingresa el nombre de la propiedad', 'error');
        rentProperty.focus();
        return;
    }

    // Confirmar pago
    const targetPlayer = currentRoomData.players[selectedPlayer];
    confirmMessage.textContent = `¿Confirmas pagar ${Utils.formatMoney(amount)} a ${targetPlayer.name} por "${property}"?`;
    confirmModal.classList.add('active');

    confirmYes.onclick = async () => {
        closeConfirmModal();
        Utils.toggleLoading(true);

        const transactionData = {
            type: 'rent',
            from: playerId,
            to: selectedPlayer,
            amount: amount,
            concept: property
        };

        try {
            await DB.executeTransaction(roomCode, transactionData);
            Utils.showNotification('Alquiler pagado exitosamente', 'success');
            
            // Limpiar formulario
            rentAmount.value = '';
            rentProperty.value = '';
            rentPlayerSelect.value = '';
            
        } catch (error) {
            console.error('Error al pagar alquiler:', error);
            Utils.showNotification('Error: ' + error.message, 'error');
        } finally {
            Utils.toggleLoading(false);
        }
    };
}

// ==================== SALIR DE LA SALA ====================
function confirmLeaveRoom() {
    confirmMessage.textContent = '¿Estás seguro de salir de la sala? Perderás acceso a tus datos.';
    confirmModal.classList.add('active');
    
    confirmYes.onclick = async () => {
        closeConfirmModal();
        Utils.toggleLoading(true);
        
        try {
            await DB.removePlayer(roomCode, playerId);
            Utils.showNotification('Has salido de la sala', 'success');
            localStorage.clear();
            setTimeout(() => window.location.href = 'index.html', 1000);
        } catch (error) {
            Utils.showNotification('Error al salir de la sala', 'error');
        } finally {
            Utils.toggleLoading(false);
        }
    };
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
}

// ==================== LIMPIEZA ====================
window.addEventListener('beforeunload', () => {
    DB.offRoomChange(roomCode);
});