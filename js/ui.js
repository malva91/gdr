// UI management and interface interactions - Enhanced with asset system
import AuthManager from './auth.js?v.100';
import UserManager from './users.js?v.100';
import DiceSystem from './dice-system.js?v.100';
import ChatSystem from './chat-system.js?v.100';
import MusicSystem from './music-system.js?v.100';
import MapSystem from './map-system.js?v.100';
import TokenSystem from './token-system.js?v.100';
import AssetSystem from './asset-system.js?v.100';
import MasterPanel from './master-panel.js?v.100';
import PingSystem from './ping-system.js?v.100';
import SoundBoardSystem from './sound-board-system.js?v.100';
import CharacterSheetSystem from './character-sheet-system.js?v.100';
import { modalSystem } from './modal-system.js?v.100';
import FirebaseHelper from './firebase.js?v.100';

export class UIManager {
    constructor() {
        this.authManager = new AuthManager();
        this.userManager = new UserManager(this.authManager);
        this.diceSystem = new DiceSystem(this.authManager);
        this.chatSystem = new ChatSystem(this.authManager);
        this.musicSystem = new MusicSystem(this.authManager);
        this.mapSystem = new MapSystem(this.authManager);
        this.tokenSystem = new TokenSystem(this.authManager, this.mapSystem);
        this.assetSystem = new AssetSystem(this.authManager, this.mapSystem);
        this.pingSystem = new PingSystem(this.authManager, this.mapSystem);
        this.soundBoardSystem = new SoundBoardSystem(this.authManager, this.musicSystem);
        this.masterPanel = new MasterPanel(this.authManager, this.mapSystem, this.tokenSystem, this.assetSystem, this.musicSystem, this.chatSystem);
        this.characterSheetSystem = new CharacterSheetSystem(this.authManager);
        this.currentView = 'login';
        this.systemsInitialized = false;
        this.initializationInProgress = false;
        this.isLoggingOut = false;
    }
    
    // Initialize UI
    init() {
        console.log('🎮 Inizializzazione UI Manager...');
        this.setupEventListeners();
        this.setupConnectionMonitor();
        this.authManager.init();
        
        // FIXED: Applica il nome stanza configurato
        this.applyConfiguredRoomName();
        
        // Make systems globally available for onclick handlers
        window.diceSystem = this.diceSystem;
        window.musicSystem = this.musicSystem;
        window.masterPanel = this.masterPanel;
        window.soundBoardSystem = this.soundBoardSystem;
        window.assetSystem = this.assetSystem;
        window.characterSheetSystem = this.characterSheetSystem;
        
        // Make modal system globally available
        window.modalSystem = modalSystem;
        
        // Check for existing session
        if (this.authManager.loadSession()) {
            console.log('🔄 Sessione esistente trovata, caricamento interfaccia gioco...');
            this.showGameInterface();
        }
    }
    
    // FIXED: Applica il nome stanza configurato
    applyConfiguredRoomName() {
        if (window.TAVERNA_ROOM_NAME) {
            const success = this.authManager.setRoomName(window.TAVERNA_ROOM_NAME);
            if (success) {
                console.log('✅ Nome stanza applicato dall\'UI Manager:', window.TAVERNA_ROOM_NAME);
            }
        }
    }
    
    // Setup global event listeners
    setupEventListeners() {
        // Exit button
        const exitBtn = document.getElementById('exitBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.handleExit());
        }
        
        // Character sheet button
        const characterSheetBtn = document.getElementById('characterSheetBtn');
        if (characterSheetBtn) {
            characterSheetBtn.addEventListener('click', () => this.characterSheetSystem.openCharacterSheetModal());
        }
        
        // Character sheet modal close
        const characterSheetModal = document.getElementById('characterSheetModal');
        const closeCharacterSheetBtn = characterSheetModal?.querySelector('.modal-close');
        if (closeCharacterSheetBtn) {
            closeCharacterSheetBtn.addEventListener('click', () => this.characterSheetSystem.closeCharacterSheetModal());
        }
        
        // Close modal on outside click
        if (characterSheetModal) {
            characterSheetModal.addEventListener('click', (e) => {
                if (e.target === characterSheetModal) {
                    this.characterSheetSystem.closeCharacterSheetModal();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Window resize
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    // Handle keyboard shortcuts
    handleKeyboardShortcuts(event) {
        // Escape key to close master panel or exit
        if (event.key === 'Escape' && this.currentView === 'game') {
            // Check if master panel is open first
            if (this.masterPanel.isOpen) {
                this.masterPanel.closePanel();
                return;
            }
            
            // Check if any modal is open
            const modals = document.querySelectorAll('.modal-overlay');
            const openModal = Array.from(modals).find(modal => modal.style.display === 'block' || modal.style.display === 'flex');
            
            if (!openModal) {
                this.handleExit();
            }
        }
        
        // Enter key in login form
        if (event.key === 'Enter' && this.currentView === 'login') {
            const activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT') {
                const loginForm = document.getElementById('loginForm');
                if (loginForm && loginForm.checkValidity()) {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            }
        }
        
        // Ctrl+Enter to roll dice
        if (event.ctrlKey && event.key === 'Enter' && this.currentView === 'game') {
            const rollBtn = document.getElementById('rollAllDice');
            if (rollBtn && !rollBtn.disabled) {
                this.diceSystem.rollAllDice();
            }
        }
        
        // Space to play/pause music (when not typing) - Only for master
        if (event.code === 'Space' && this.currentView === 'game' && this.authManager.isMaster()) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                event.preventDefault();
                this.musicSystem.togglePlayPause();
            }
        }
        

        
        // F2 for master panel (Master only)
        if (event.key === 'F2' && this.currentView === 'game' && this.authManager.isMaster()) {
            event.preventDefault();
            this.masterPanel.togglePanel();
        }
        
        // M key for master panel toggle (Master only)
        if (event.key === 'm' && this.currentView === 'game' && this.authManager.isMaster()) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                event.preventDefault();
                this.masterPanel.togglePanel();
            }
        }
    }
    
    // Handle window resize
    handleWindowResize() {
        // Update responsive layout if needed
        this.updateResponsiveLayout();
    
        // Update ping positions
        if (this.pingSystem) {
            this.pingSystem.updatePingPositions();
        }
    }
    
    // Setup connection monitor
    setupConnectionMonitor() {
        FirebaseHelper.monitorConnection((status) => {
            this.updateConnectionStatus(status);
        });
    }

    // Update connection status indicator
    updateConnectionStatus(status) {
        const connectionStatus = document.getElementById('connectionStatus');
        if (!connectionStatus) return;

        const currentStatus = status || FirebaseHelper.getConnectionStatus();

        connectionStatus.className = 'connection-status';
        connectionStatus.classList.add(currentStatus);

        let statusText = '';
        switch (currentStatus) {
            case 'connected':
                statusText = 'Connesso';
                break;
            case 'disconnected':
                statusText = 'Disconnesso';
                break;
            case 'reconnecting':
                statusText = 'Riconnessione...';
                break;
            default:
                statusText = 'Sconosciuto';
        }

        connectionStatus.title = `Stato connessione: ${statusText}`;
    }

    // Update responsive layout
    updateResponsiveLayout() {
        const gameInterface = document.getElementById('gameInterface');
        const usersList = document.getElementById('usersList');
        
        if (window.innerWidth <= 768) {
            if (gameInterface) gameInterface.classList.add('mobile-layout');
            if (usersList) usersList.classList.add('mobile-users');
        } else {
            if (gameInterface) gameInterface.classList.remove('mobile-layout');
            if (usersList) usersList.classList.remove('mobile-users');
        }
    }
    
    // Show game interface
    showGameInterface() {
        this.currentView = 'game';
        this.authManager.showGameInterface();
        this.updateRoomDisplay();
        this.updateConnectionStatus();
        
        // Initialize all systems with proper sequencing - only once and prevent multiple calls
        if (!this.systemsInitialized && !this.initializationInProgress) {
            this.initializationInProgress = true;
            console.log('⚙️ Inizializzazione sistemi di gioco...');
            
            // Use a longer timeout to ensure DOM is ready
            setTimeout(() => {
                try {
                    this.userManager.init();
                    this.diceSystem.init();
                    this.chatSystem.init();
                    this.musicSystem.init();
                    this.mapSystem.init();
                    this.tokenSystem.init();
                    this.assetSystem.init();
                    this.pingSystem.init();
                    this.soundBoardSystem.init();
                    this.masterPanel.init();
                    this.characterSheetSystem.init();
                    
                    // Update responsive layout
                    this.updateResponsiveLayout();
                    
                    // Update admin controls visibility
                    this.updateAdminControlsVisibility();
                    
                    this.systemsInitialized = true;
                    this.initializationInProgress = false;
                    
                } catch (error) {
                    console.error('❌ Errore inizializzazione sistemi:', error);
                    this.initializationInProgress = false;
                }
            }, 500); // Increased timeout
        } else if (this.systemsInitialized) {
            this.updateAdminControlsVisibility();
        }
    }
    
    // Show login screen
    showLoginScreen() {
        this.currentView = 'login';
        this.authManager.showLoginScreen();
        
        // Cleanup all systems
        if (this.systemsInitialized) {
            this.userManager.cleanup();
            this.diceSystem.cleanup();
            this.chatSystem.cleanup();
            this.musicSystem.cleanup();
            this.mapSystem.cleanup();
            this.tokenSystem.cleanup();
            this.assetSystem.cleanup();
            this.pingSystem.cleanup();
            this.soundBoardSystem.cleanup();
            this.masterPanel.cleanup();
            this.characterSheetSystem.cleanup();
            this.systemsInitialized = false;
            this.initializationInProgress = false;
        }
    }
    
    // Update room display
    updateRoomDisplay() {
        const roomName = this.authManager.getCurrentRoom();
        const roomNameElement = document.getElementById('currentRoomName');
        
        if (roomName && roomNameElement) {
            roomNameElement.textContent = roomName;
        }
    }
    
    // Update admin controls visibility
    updateAdminControlsVisibility() {
        const isMaster = this.authManager.isMaster();
        const adminElements = document.querySelectorAll('.admin-only');
        
        adminElements.forEach(element => {
            element.style.display = isMaster ? 'block' : 'none';
        });
        
        // Update master panel visibility
        this.masterPanel.updateVisibility();
        
        // Update sound board visibility
        this.soundBoardSystem.updateVisibility();
    }
    
    // Handle exit with improved confirmation
    async handleExit() {
        if (this.isLoggingOut) return; // Prevent multiple logout attempts
        
        // Use styled modal instead of native confirm
        const confirmed = await modalSystem.confirm(
            'Sei sicuro di voler uscire dalla taverna?',
            'Conferma Uscita',
            {
                icon: '🚪',
                confirmText: 'Sì, esci',
                cancelText: 'Rimani'
            }
        );
        
        if (confirmed) {
            this.isLoggingOut = true;
            
            try {
                await this.authManager.logout();
                this.showLoginScreen();
            } catch (error) {
                console.error('❌ Errore durante logout:', error);
            } finally {
                this.isLoggingOut = false;
            }
        }
    }
    
    // Show styled notification
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style notification with tavern theme
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            color: #d4af37;
            font-family: 'Cinzel', serif;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            border: 2px solid #8b4513;
            animation: slideInRight 0.4s ease-out;
            backdrop-filter: blur(10px);
        `;
        
        // Set background based on type
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, rgba(34, 139, 34, 0.9) 0%, rgba(50, 205, 50, 0.9) 100%)';
                notification.style.borderColor = '#32cd32';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, rgba(139, 0, 0, 0.9) 0%, rgba(220, 20, 60, 0.9) 100%)';
                notification.style.borderColor = '#dc143c';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, rgba(255, 140, 0, 0.9) 0%, rgba(255, 165, 0, 0.9) 100%)';
                notification.style.borderColor = '#ffa500';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(160, 82, 45, 0.9) 100%)';
                notification.style.borderColor = '#8b4513';
        }
        
        document.body.appendChild(notification);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, duration);
    }
    
    // Show loading overlay
    showLoadingOverlay(message = 'Caricamento...') {
        // Use modal system for loading
        this.loadingModal = modalSystem.loading(message, 'Caricamento');
    }
    
    // Hide loading overlay
    hideLoadingOverlay() {
        if (this.loadingModal) {
            this.loadingModal.close();
            this.loadingModal = null;
        }
    }
    
    // Initialize tooltips
    initTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, e.target.dataset.tooltip);
            });
            
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
        
        console.log('💡 Tooltips inizializzati:', tooltipElements.length);
    }
    
    // Show tooltip
    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(44, 24, 16, 0.95);
            color: #d4af37;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            font-size: 0.85rem;
            z-index: 10001;
            pointer-events: none;
            border: 1px solid #8b4513;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
        
        this.currentTooltip = tooltip;
    }
    
    // Hide tooltip
    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }
    
    // Get all systems for external access
    getSystems() {
        return {
            auth: this.authManager,
            users: this.userManager,
            dice: this.diceSystem,
            chat: this.chatSystem,
            music: this.musicSystem,
            map: this.mapSystem,
            tokens: this.tokenSystem,
            assets: this.assetSystem,
            ping: this.pingSystem,
            soundBoard: this.soundBoardSystem,
            master: this.masterPanel,
            characterSheet: this.characterSheetSystem
        };
    }
}

export default UIManager;