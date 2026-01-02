// ==================== VARIABLES GLOBALES ====================
let selectedColor = '#e74c3c';

// ==================== ELEMENTOS DEL DOM ====================
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createRoomModal = document.getElementById('createRoomModal');
const joinRoomModal = document.getElementById('joinRoomModal');
const confirmCreateBtn = document.getElementById('confirmCreateBtn');
const confirmJoinBtn = document.getElementById('confirmJoinBtn');
const bankNameInput = document.getElementById('bankNameInput');
const initialMoneySelect = document.getElementById('initialMoneySelect');
const roomCodeInput = document.getElementById('roomCodeInput');
const playerNameInput = document.getElementById('playerNameInput');
const colorPicker = document.getElementById('colorPicker');

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Abrir modales
    createRoomBtn.addEventListener('click', () => openModal(createRoomModal));
    joinRoomBtn.addEventListener('click', () => openModal(joinRoomModal));

    // Cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    document.querySelectorAll('.cancel-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Clicks fuera del modal
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Confirmar creación de sala
    confirmCreateBtn.addEventListener('click', handleCreateRoom);

    // Confirmar unirse a sala
    confirmJoinBtn.addEventListener('click', handleJoinRoom);

    // Selector de colores
    colorPicker.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            colorPicker.querySelectorAll('.color-option').forEach(o => {
                o.classList.remove('selected');
            });
            this.classList.add('selected');
            selectedColor = this.getAttribute('data-color');
        });
    });

    // Seleccionar primer color por defecto
    colorPicker.querySelector('.color-option').classList.add('selected');

    // Permitir Enter en inputs
    bankNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCreateRoom();
    });

    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleJoinRoom();
    });

    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleJoinRoom();
    });

    // Convertir código de sala a mayúsculas automáticamente
    roomCodeInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });
});

// ==================== FUNCIONES ====================
function openModal(modal) {
    closeAllModals(); // Cerrar cualquier modal abierto primero
    modal.classList.add('active');
    
    // Focus en el primer input
    const firstInput = modal.querySelector('input[type="text"]');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

async function handleCreateRoom() {
    const bankName = bankNameInput.value.trim();
    const initialMoney = parseInt(initialMoneySelect.value);

    // Validaciones
    if (!bankName) {
        Utils.showNotification('Por favor ingresa un nombre para el banco', 'error');
        bankNameInput.focus();
        return;
    }

    if (bankName.length < 2) {
        Utils.showNotification('El nombre debe tener al menos 2 caracteres', 'error');
        bankNameInput.focus();
        return;
    }

    Utils.toggleLoading(true);

    try {
        // Generar código único de sala
        let roomCode;
        let exists = true;
        
        while (exists) {
            roomCode = Utils.generateRoomCode();
            exists = await DB.roomExists(roomCode);
        }

        // Generar ID del banco
        const bankId = Utils.generateId();

        // Crear sala
        await DB.createRoom(roomCode, bankId, bankName, initialMoney);

        // Guardar en localStorage
        localStorage.setItem('monopoly_roomCode', roomCode);
        localStorage.setItem('monopoly_playerId', bankId);
        localStorage.setItem('monopoly_isBank', 'true');

        Utils.showNotification('¡Sala creada exitosamente!', 'success');

        // Redirigir a panel del banco
        setTimeout(() => {
            window.location.href = 'bank.html';
        }, 500);

    } catch (error) {
        console.error('Error al crear sala:', error);
        Utils.showNotification('Error al crear la sala: ' + error.message, 'error');
    } finally {
        Utils.toggleLoading(false);
    }
}

async function handleJoinRoom() {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    const playerName = playerNameInput.value.trim();

    // Validaciones
    if (!roomCode) {
        Utils.showNotification('Por favor ingresa el código de sala', 'error');
        roomCodeInput.focus();
        return;
    }

    if (roomCode.length !== 6) {
        Utils.showNotification('El código debe tener 6 caracteres', 'error');
        roomCodeInput.focus();
        return;
    }

    if (!playerName) {
        Utils.showNotification('Por favor ingresa tu nombre', 'error');
        playerNameInput.focus();
        return;
    }

    if (playerName.length < 2) {
        Utils.showNotification('El nombre debe tener al menos 2 caracteres', 'error');
        playerNameInput.focus();
        return;
    }

    Utils.toggleLoading(true);

    try {
        // Verificar que la sala existe
        const exists = await DB.roomExists(roomCode);
        if (!exists) {
            throw new Error('La sala no existe. Verifica el código.');
        }

        // Generar ID del jugador
        const playerId = Utils.generateId();

        // Unirse a la sala
        await DB.joinRoom(roomCode, playerId, playerName, selectedColor);

        // Guardar en localStorage
        localStorage.setItem('monopoly_roomCode', roomCode);
        localStorage.setItem('monopoly_playerId', playerId);
        localStorage.setItem('monopoly_isBank', 'false');

        Utils.showNotification('¡Te has unido a la sala!', 'success');

        // Redirigir a panel del jugador
        setTimeout(() => {
            window.location.href = 'player.html';
        }, 500);

    } catch (error) {
        console.error('Error al unirse a sala:', error);
        Utils.showNotification('Error: ' + error.message, 'error');
    } finally {
        Utils.toggleLoading(false);
    }
}

// ==================== VERIFICAR SESIÓN ACTIVA ====================
// Si ya hay una sesión activa, redirigir automáticamente
window.addEventListener('load', () => {
    const roomCode = localStorage.getItem('monopoly_roomCode');
    const playerId = localStorage.getItem('monopoly_playerId');
    const isBank = localStorage.getItem('monopoly_isBank') === 'true';

    if (roomCode && playerId) {
        // Verificar que la sala todavía existe
        DB.roomExists(roomCode).then(exists => {
            if (exists) {
                if (isBank) {
                    window.location.href = 'bank.html';
                } else {
                    window.location.href = 'player.html';
                }
            } else {
                // Limpiar localStorage si la sala ya no existe
                localStorage.removeItem('monopoly_roomCode');
                localStorage.removeItem('monopoly_playerId');
                localStorage.removeItem('monopoly_isBank');
            }
        });
    }
});