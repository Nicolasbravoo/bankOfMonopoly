# 🏦 Monopoly Bank Manager

Sistema completo de gestión de dinero para el juego Monopoly con sincronización en tiempo real usando Firebase.

## 📋 Características Principales

### ✅ Funcionalidades Implementadas

- **Gestión de Salas**: Crear y unirse a salas mediante códigos únicos
- **Roles Diferenciados**: 
  - Banco: Controla todas las transacciones del juego
  - Jugadores: Pagan alquileres entre sí
- **Transacciones en Tiempo Real**: Todos los cambios se reflejan instantáneamente
- **Historial Completo**: Registro detallado de todas las transacciones
- **Validaciones Robustas**: Prevención de estados inconsistentes
- **Persistencia de Sesión**: Los usuarios pueden reconectarse

## 🎯 Reglas de Negocio del Monopoly

### Dinero Inicial
- **Clásico**: $1,500 por jugador
- **Generoso**: $2,000 por jugador
- **Difícil**: $1,000 por jugador

### Transacciones del Banco

#### Ingresos para Jugadores (Banco → Jugador)
- **Cobrar Salida**: $200 (cada vez que pasan por GO)
- **Error del Banco a favor**: Monto variable
- **Otros ingresos**: Cartas de comunidad/suerte

#### Pagos al Banco (Jugador → Banco)
- **Compra de Propiedad**: Según precio en tablero
- **Compra de Casa**: $50-200 según color
- **Compra de Hotel**: $50-200 según color + 4 casas
- **Impuesto sobre Ingresos**: $200
- **Impuesto de Lujo**: $100
- **Multas**: Variable (cárcel, etc.)

### Pagos entre Jugadores
- **Alquileres**: Según propiedad y desarrollo
- Los jugadores pagan directamente entre sí
- El banco registra pero no interviene en el flujo de dinero

## 🔒 Seguridad y Validaciones

### Validaciones Críticas Implementadas

1. **Validación de Saldo**
   ```javascript
   if (!room.players[from].isBank && room.players[from].money < amount) {
       throw new Error('Saldo insuficiente');
   }
   ```

2. **Transacciones Atómicas**
   - Se usa `transaction()` de Firebase para garantizar atomicidad
   - Si falla alguna parte, toda la transacción se revierte

3. **Validación de Monto**
   - Solo números enteros positivos
   - No permite valores negativos o decimales
   - Mínimo: $1

4. **Prevención de Duplicados**
   - Cada transacción tiene un ID único basado en timestamp + random
   - No se pueden repetir transacciones accidentalmente

5. **Verificación de Jugadores**
   - Se verifica que ambos jugadores existan antes de ejecutar
   - Se valida que la sala esté activa

### Estados Inconsistentes Prevenidos

❌ **Doble Pago**: Imposible debido a transacciones atómicas de Firebase
❌ **Valores Negativos no autorizados**: Validación antes de débito
❌ **Jugadores fantasma**: Verificación en tiempo real
❌ **Salas duplicadas**: Generación de códigos únicos verificados

## 🏗️ Arquitectura de Base de Datos

### Estructura Optimizada

```
rooms/
  {roomCode}/           // Código único de 6 caracteres
    info/
      bankId: string
      bankName: string
      createdAt: timestamp
      status: "active" | "finished"
      initialMoney: number
    
    players/
      {playerId}/
        name: string
        money: number
        isBank: boolean
        color: string
        joinedAt: timestamp
    
    transactions/
      {transactionId}/
        type: string
        from: playerId
        fromName: string
        to: playerId
        toName: string
        amount: number
        concept: string
        timestamp: number
        status: "completed"
```

### Reglas de Firebase (Ejemplo)

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": "auth != null || 
                   data.child('info/status').val() == 'active'",
        
        "players": {
          "$playerId": {
            ".validate": "newData.hasChildren(['name', 'money', 'isBank', 'color'])"
          }
        },
        
        "transactions": {
          "$transactionId": {
            ".validate": "newData.hasChildren(['type', 'from', 'to', 'amount', 'timestamp'])"
          }
        }
      }
    }
  }
}
```

## 🚀 Buenas Prácticas Implementadas

### 1. Código Modular
- Separación clara de responsabilidades
- Utils para funciones reutilizables
- DB API para operaciones de base de datos

### 2. Manejo de Errores
```javascript
try {
    await DB.executeTransaction(roomCode, data);
    Utils.showNotification('Éxito', 'success');
} catch (error) {
    console.error('Error:', error);
    Utils.showNotification('Error: ' + error.message, 'error');
} finally {
    Utils.toggleLoading(false);
}
```

### 3. UX Optimizada
- Feedback visual inmediato
- Loading states
- Confirmaciones para acciones destructivas
- Mensajes de error claros y accionables

### 4. Tiempo Real Eficiente
- Listeners con cleanup apropiado
- Renderizado selectivo (solo lo que cambia)
- Prevención de memory leaks

### 5. Persistencia de Estado
- localStorage para reconexión automática
- Verificación de sesión al cargar
- Limpieza de datos obsoletos

## 📱 Responsive Design

- Grid adaptativo para jugadores
- Modales centrados y escalables
- Diseño mobile-first
- Touch-friendly para dispositivos móviles

## ⚡ Optimizaciones de Rendimiento

### 1. Renderizado Eficiente
- Solo se actualiza cuando hay cambios reales
- innerHTML batch updates
- Filtros aplicados en cliente para reducir carga

### 2. Queries Optimizadas
- `.once()` para lecturas únicas
- `.on()` solo para datos que cambian frecuentemente
- `.off()` para limpiar listeners

### 3. Validaciones en Cliente
- Reducción de llamadas innecesarias al servidor
- Feedback inmediato al usuario

## 🔧 Configuración Inicial

### 1. Crear Proyecto en Firebase
```
1. Ir a https://console.firebase.google.com/
2. Crear nuevo proyecto
3. Agregar aplicación web
4. Copiar credenciales
```

### 2. Configurar `js/firebase.js`
```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    databaseURL: "https://tu-proyecto.firebaseio.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

### 3. Activar Realtime Database
```
1. En Firebase Console → Build → Realtime Database
2. Crear base de datos
3. Configurar reglas (modo test para desarrollo)
```

### 4. Reglas de Seguridad Recomendadas

**Para Desarrollo**:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Para Producción**:
```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "data.exists()",
        ".write": "data.child('info/status').val() == 'active'"
      }
    }
  }
}
```

## 🎮 Flujo de Uso

### Como Banco:
1. Crear sala → Obtener código
2. Compartir código con jugadores
3. Gestionar transacciones:
   - Cobrar salidas
   - Procesar compras de propiedades
   - Aplicar impuestos y multas
4. Ver historial completo
5. Terminar juego cuando finalice

### Como Jugador:
1. Unirse con código
2. Elegir nombre y color
3. Ver dinero en tiempo real
4. Pagar alquileres a otros jugadores
5. Ver historial personal

## 🐛 Solución de Problemas Comunes

### Problema: Las transacciones no se reflejan
**Solución**: Verificar conexión a internet y reglas de Firebase

### Problema: Error "Saldo insuficiente"
**Solución**: El jugador realmente no tiene dinero, validar monto

### Problema: Jugadores no se ven
**Solución**: Verificar que la sala esté activa y el código sea correcto

### Problema: Sesión expirada
**Solución**: La sala fue cerrada o el juego terminó

## 📊 Monitoreo y Debug

### Console Logs Útiles
```javascript
// Ver datos de sala en consola
database.ref('rooms/TU_CODIGO').on('value', snap => {
    console.log('Room data:', snap.val());
});
```

### Verificar Estado en Firebase Console
1. Ir a Realtime Database
2. Ver estructura de datos en tiempo real
3. Editar manualmente si es necesario (solo desarrollo)

## 🔄 Mejoras Futuras Sugeridas

1. **Autenticación**
   - Firebase Auth para usuarios permanentes
   - Historial de juegos por usuario

2. **Analytics**
   - Estadísticas de juegos
   - Jugadores más activos
   - Duración promedio de partidas

3. **Características Adicionales**
   - Chat entre jugadores
   - Temporizador de turnos
   - Propiedades hipotecadas
   - Tratos entre jugadores

4. **Seguridad Avanzada**
   - Rate limiting
   - Validación de server-side con Cloud Functions
   - Encriptación de datos sensibles

## 📄 Licencia

Este proyecto es de código abierto y puede ser usado libremente.

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para problemas o preguntas, abre un issue en el repositorio.

---

**¡Disfruta jugando Monopoly sin preocuparte por el dinero!** 🎲💰