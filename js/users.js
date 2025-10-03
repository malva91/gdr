// User management and presence system - Fixed user display and cleanup
import FirebaseHelper from './firebase.js?v.100';

export class UserManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.users = new Map();
        this.heartbeatInterval = null;
        this.usersListener = null;
        this.heartbeatFrequency = 30000; // 30 seconds
        this.isCleaningUp = false;
        this.lastUserUpdate = 0;
    }
    
    // Initialize user management
    init() {
        console.log('👥 Inizializzazione gestione utenti...');
        this.startHeartbeat();
        this.listenToUsers();
        this.setupPageUnloadHandlers();
        
        // Force initial user display update
        setTimeout(() => {
            this.updateUsersDisplay();
        }, 1000);
    }
    
    // Setup page unload handlers
    setupPageUnloadHandlers() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleUserInactive();
            } else {
                this.handleUserActive();
            }
        });
        
        // Handle window beforeunload
        window.addEventListener('beforeunload', () => {
            this.handleUserDisconnect();
        });
        
        // Handle page unload
        window.addEventListener('unload', () => {
            this.handleUserDisconnect();
        });
        
        // Handle browser close/refresh
        window.addEventListener('pagehide', () => {
            this.handleUserDisconnect();
        });
    }
    
    // Start heartbeat to maintain presence
    startHeartbeat() {
        // Initial presence update
        this.updatePresence();
        
        this.heartbeatInterval = setInterval(() => {
            if (!this.isCleaningUp) {
                this.updatePresence();
            }
        }, this.heartbeatFrequency);
    }
    
    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    // Update user presence
    async updatePresence() {
        const user = this.authManager.getCurrentUser();
        const room = this.authManager.getCurrentRoom();
        
        if (user && room && !this.isCleaningUp) {
            try {
                const updateData = {
                    lastSeen: FirebaseHelper.getTimestamp(),
                    status: 'online',
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    id: user.id
                };
                
                await FirebaseHelper.updateData(`rooms/${room}/users/${user.id}`, updateData);
                console.log('💓 Presenza aggiornata per:', user.name);
            } catch (error) {
                console.error('❌ Errore aggiornamento presenza:', error);
            }
        }
    }
    
    // Handle user becoming inactive
    async handleUserInactive() {
        const user = this.authManager.getCurrentUser();
        const room = this.authManager.getCurrentRoom();
        
        if (user && room && !this.isCleaningUp) {
            try {
                await FirebaseHelper.updateData(`rooms/${room}/users/${user.id}`, {
                    status: 'away',
                    lastSeen: FirebaseHelper.getTimestamp()
                });
            } catch (error) {
                console.error('❌ Errore aggiornamento stato inattivo:', error);
            }
        }
    }
    
    // Handle user becoming active
    async handleUserActive() {
        const user = this.authManager.getCurrentUser();
        const room = this.authManager.getCurrentRoom();
        
        if (user && room && !this.isCleaningUp) {
            try {
                await FirebaseHelper.updateData(`rooms/${room}/users/${user.id}`, {
                    status: 'online',
                    lastSeen: FirebaseHelper.getTimestamp()
                });
            } catch (error) {
                console.error('❌ Errore aggiornamento stato attivo:', error);
            }
        }
    }
    
    // Handle user disconnect
    async handleUserDisconnect() {
        if (this.isCleaningUp) return;
        
        const user = this.authManager.getCurrentUser();
        const room = this.authManager.getCurrentRoom();
        
        if (user && room) {
            try {
                // Remove user immediately
                await FirebaseHelper.removeData(`rooms/${room}/users/${user.id}`);
            } catch (error) {
                console.error('❌ Errore aggiornamento disconnessione:', error);
            }
        }
    }
    
    // Listen to users in current room
    listenToUsers() {
        const room = this.authManager.getCurrentRoom();
        if (!room) {
            console.error('❌ Nessuna stanza per ascoltare utenti');
            return;
        }
        
        this.usersListener = FirebaseHelper.listenToData(`rooms/${room}/users`, (snapshot) => {
            this.handleUsersUpdate(snapshot);
        });
    }
    
    // Stop listening to users
    stopListeningToUsers() {
        if (this.usersListener) {
            FirebaseHelper.stopListening(this.usersListener);
            this.usersListener = null;
        }
    }
    
    // Handle users update
    handleUsersUpdate(snapshot) {
        try {
            const usersData = snapshot.val();
            const previousUserCount = this.users.size;
            this.users.clear();
            
            if (usersData) {
                Object.entries(usersData).forEach(([userId, user]) => {
                    if (user && user.name && user.id) {
                        // Ensure user has all required properties
                        const completeUser = {
                            id: user.id,
                            name: user.name,
                            role: user.role || 'player',
                            avatar: user.avatar || null,
                            status: user.status || 'online',
                            lastSeen: user.lastSeen || Date.now(),
                            timestamp: user.timestamp || Date.now()
                        };
                        this.users.set(userId, completeUser);
                    }
                });
            }
            
            // Log user changes
            if (this.users.size !== previousUserCount) {
                console.log('📊 Cambiamento numero utenti:', previousUserCount, '->', this.users.size);
            }
            
            // Force update display
            this.updateUsersDisplay();
            this.cleanupOfflineUsers();
            
        } catch (error) {
            console.error('❌ Errore aggiornamento utenti:', error);
        }
    }
    
    // Update users display in header
    updateUsersDisplay() {
        const usersList = document.getElementById('usersList');
        if (!usersList) {
            console.error('❌ Lista utenti non trovata');
            return;
        }
        
        // Clear existing users
        usersList.innerHTML = '';
        
        if (this.users.size === 0) {
            return;
        }
        
        // Sort users: masters first, then by name
        const sortedUsers = Array.from(this.users.values()).sort((a, b) => {
            if (!a.name || !b.name) return 0;
            
            if (a.role === 'master' && b.role !== 'master') return -1;
            if (b.role === 'master' && a.role !== 'master') return 1;
            return a.name.localeCompare(b.name);
        });
        
        sortedUsers.forEach(user => {
            if (user && user.name && user.id) {
                const userElement = this.createUserElement(user);
                usersList.appendChild(userElement);
            }
        });
        
        // Force layout update
        usersList.style.display = 'flex';
    }
    
    // Create user element for display
    createUserElement(user) {
        const userItem = document.createElement('div');
        userItem.className = `user-item ${user.role === 'master' ? 'master' : ''}`;
        userItem.setAttribute('data-user-id', user.id);
        
        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        
        if (user.avatar) {
            avatar.style.backgroundImage = `url(${user.avatar})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
        } else {
            // Default avatar based on role
            avatar.textContent = user.role === 'master' ? '👑' : '⚔️';
            avatar.style.fontSize = '1.2rem';
        }
        
        // Create name element with truncation for long names
        const nameElement = document.createElement('span');
        nameElement.className = 'user-name';
        const displayName = user.name || 'Utente senza nome';
        nameElement.textContent = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
        nameElement.title = displayName; // Show full name on hover
        
        // Add status indicator
        const statusClass = this.getStatusClass(user);
        userItem.classList.add(statusClass);
        
        userItem.appendChild(avatar);
        userItem.appendChild(nameElement);
        
        return userItem;
    }
    
    // Get status class for user
    getStatusClass(user) {
        if (!user.status || user.status === 'offline') {
            return 'offline';
        }
        
        // Check if user is really online (last seen within 2 minutes)
        if (user.lastSeen && typeof user.lastSeen === 'number') {
            const now = Date.now();
            const lastSeen = user.lastSeen;
            const timeDiff = now - lastSeen;
            
            if (timeDiff > 2 * 60 * 1000) { // 2 minutes
                return 'offline';
            }
        }
        
        return user.status || 'online';
    }
    
    // Clean up offline users (remove after 5 minutes)
    async cleanupOfflineUsers() {
        const room = this.authManager.getCurrentRoom();
        if (!room) return;
        
        const now = Date.now();
        const offlineThreshold = 5 * 60 * 1000; // 5 minutes
        
        for (const [userId, user] of this.users) {
            if (user.lastSeen && typeof user.lastSeen === 'number') {
                const timeDiff = now - user.lastSeen;
                
                if (timeDiff > offlineThreshold) {
                    try {
                        await FirebaseHelper.removeData(`rooms/${room}/users/${userId}`);
                    } catch (error) {
                        console.error('❌ Errore rimozione utente offline:', error);
                    }
                }
            }
        }
    }
    
    // Get all users
    getAllUsers() {
        return Array.from(this.users.values());
    }
    
    // Get user by ID
    getUserById(userId) {
        return this.users.get(userId);
    }
    
    // Get masters
    getMasters() {
        return Array.from(this.users.values()).filter(user => user.role === 'master');
    }
    
    // Get players
    getPlayers() {
        return Array.from(this.users.values()).filter(user => user.role === 'player');
    }
    
    // Get online users
    getOnlineUsers() {
        return Array.from(this.users.values()).filter(user => {
            const statusClass = this.getStatusClass(user);
            return statusClass === 'online' || statusClass === 'away';
        });
    }
    
    // Cleanup when leaving
    cleanup() {
        this.isCleaningUp = true;
        this.stopHeartbeat();
        this.stopListeningToUsers();
        this.handleUserDisconnect();
    }
}

export default UserManager;