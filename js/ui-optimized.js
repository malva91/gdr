// UI management ottimizzato - Performance e layout migliorati
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

export class UIManager {
    constructor() {
        // Lazy initialization dei sistemi
        this.systems = new Map();
        this.systemsInitialized = false;
        this.initializationInProgress = false;
        this.isLoggingOut = false;
        this.currentView = 'login';
        
        // Performance monitoring
        this.performanceMetrics = {
            initTime: 0,
            renderTime: 0,
            memoryUsage: 0
        };
        
        // Throttled functions
        this.throttledResize = this.throttle(this.handleWindowResize.bind(this), 250);
        this.debouncedLayout = this.debounce(this.updateResponsiveLayout.bind(this), 100);

        // Initialize auth manager immediately
        this.authManager = new AuthManager();
    }
    
    // Lazy system initialization
    getSystem(name) {
        if (!this.systems.has(name)) {
            this.initializeSystem(name);
        }
        return this.systems.get(name);
    }
    
    // Initialize individual system on demand
    initializeSystem(name) {
        const startTime = performance.now();
        
        try {
            let system;
            
            switch (name) {
                case 'users':
                    system = new UserManager(this.authManager);
                    break;
                case 'dice':
                    system = new DiceSystem(this.authManager);
                    break;
                case 'chat':
                    system = new ChatSystem(this.authManager);
                    break;
                case 'music':
                    system = new MusicSystem(this.authManager);
                    break;
                case 'map':
                    system = new MapSystem(this.authManager);
                    break;
                case 'tokens':
                    system = new TokenSystem(this.authManager, this.getSystem('map'));
                    break;
                case 'assets':
                    system = new AssetSystem(this.authManager, this.getSystem('map'));
                    break;
                case 'ping':
                    system = new PingSystem(this.authManager, this.getSystem('map'));
                    break;
                case 'soundBoard':
                    system = new SoundBoardSystem(this.authManager, this.getSystem('music'));
                    break;
                case 'master':
                    system = new MasterPanel(
                        this.authManager,
                        this.getSystem('map'),
                        this.getSystem('tokens'),
                        this.getSystem('assets'),
                        this.getSystem('music'),
                        this.getSystem('chat')
                    );
                    break;
                case 'characterSheet':
                    system = new CharacterSheetSystem(this.authManager);
                    break;
                default:
                    console.warn('⚠️ Sistema sconosciuto:', name);
                    return null;
            }
            
            if (system) {
                this.systems.set(name, system);
                
                // Make globally available for onclick handlers
                window[`${name}System`] = system;
                
                const initTime = performance.now() - startTime;
                console.log(`✅ Sistema ${name} inizializzato in ${initTime.toFixed(2)}ms`);
            }
            
            return system;
            
        } catch (error) {
            console.error(`❌ Errore inizializzazione sistema ${name}:`, error);
            return null;
        }
    }
    
    // Initialize UI with performance monitoring
    init() {
        const startTime = performance.now();
        console.log('🎮 Inizializzazione UI Manager ottimizzato...');
        
        this.setupEventListeners();
        this.authManager.init();
        
        // Make modal system globally available
        window.modalSystem = modalSystem;
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Check for existing session
        if (this.authManager.loadSession()) {
            console.log('🔄 Sessione esistente trovata, caricamento interfaccia gioco...');
            this.showGameInterface();
        }
        
        this.performanceMetrics.initTime = performance.now() - startTime;
        console.log(`✅ UI Manager inizializzato in ${this.performanceMetrics.initTime.toFixed(2)}ms`);
    }
    
    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Memory usage monitoring
        if (performance.memory) {
            setInterval(() => {
                this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
                
                // Warn if memory usage is high
                if (this.performanceMetrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
                    console.warn('⚠️ Alto uso memoria:', Math.round(this.performanceMetrics.memoryUsage / 1024 / 1024) + 'MB');
                }
            }, 30000); // Check every 30 seconds
        }
        
        // FPS monitoring
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                if (fps < 30) {
                    console.warn('⚠️ FPS basso:', fps);
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    // Optimized event listeners setup
    setupEventListeners() {
        // Use event delegation for better performance
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Throttled resize handler
        window.addEventListener('resize', this.throttledResize);
        
        // Passive scroll listeners for better performance
        document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        
        console.log('✅ Event listeners ottimizzati configurati');
    }
    
    // Global click handler with event delegation
    handleGlobalClick(event) {
        const target = event.target;
        
        // Exit button
        if (target.id === 'exitBtn' || target.closest('#exitBtn')) {
            this.handleExit();
            return;
        }
        
        // Character sheet button
        if (target.id === 'characterSheetBtn' || target.closest('#characterSheetBtn')) {
            this.getSystem('characterSheet')?.openCharacterSheetModal();
            return;
        }
        
        // Modal close buttons
        if (target.classList.contains('modal-close')) {
            const modal = target.closest('.modal-overlay');
            if (modal) {
                modal.style.display = 'none';
            }
            return;
        }
        
        // Modal outside click
        if (target.classList.contains('modal-overlay')) {
            target.style.display = 'none';
            return;
        }
    }
    
    // Optimized keyboard shortcuts
    handleKeyboardShortcuts(event) {
        // Early return for input elements
        const activeElement = document.activeElement;
        const isInputActive = activeElement.tagName === 'INPUT' || 
                             activeElement.tagName === 'TEXTAREA' || 
                             activeElement.contentEditable === 'true';
        
        switch (event.key) {
            case 'Escape':
                if (this.currentView === 'game') {
                    this.handleEscapeKey();
                }
                break;
                
            case 'Enter':
                if (this.currentView === 'login' && !isInputActive) {
                    this.handleLoginEnter();
                } else if (event.ctrlKey && this.currentView === 'game') {
                    this.handleCtrlEnter();
                }
                break;
                
            case ' ':
                if (!isInputActive && this.currentView === 'game' && this.authManager.isMaster()) {
                    event.preventDefault();
                    this.getSystem('music')?.togglePlayPause();
                }
                break;
                
            case 'F2':
                if (this.currentView === 'game' && this.authManager.isMaster()) {
                    event.preventDefault();
                    this.getSystem('master')?.togglePanel();
                }
                break;
                
            case 'm':
                if (!isInputActive && this.currentView === 'game' && this.authManager.isMaster()) {
                    event.preventDefault();
                    this.getSystem('master')?.togglePanel();
                }
                break;
        }
    }
    
    // Handle escape key logic
    handleEscapeKey() {
        const masterPanel = this.getSystem('master');
        if (masterPanel?.isOpen) {
            masterPanel.closePanel();
            return;
        }
        
        // Check for open modals
        const openModal = document.querySelector('.modal-overlay[style*="block"], .modal-overlay[style*="flex"]');
        if (!openModal) {
            this.handleExit();
        }
    }
    
    // Handle login enter
    handleLoginEnter() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm?.checkValidity()) {
            loginForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Handle Ctrl+Enter for dice roll
    handleCtrlEnter() {
        const rollBtn = document.getElementById('rollAllDice');
        if (rollBtn && !rollBtn.disabled) {
            this.getSystem('dice')?.rollAllDice();
        }
    }
    
    // Optimized scroll handler
    handleScroll(event) {
        // Implement scroll-based optimizations here
        // For example, hide/show elements based on scroll position
    }
    
    // Throttle function for performance
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Optimized window resize handler
    handleWindowResize() {
        this.debouncedLayout();
        
        // Update ping positions if system is loaded
        const pingSystem = this.systems.get('ping');
        if (pingSystem) {
            pingSystem.updatePingPositions();
        }
    }
    
    // Optimized responsive layout with CSS custom properties
    updateResponsiveLayout() {
        const startTime = performance.now();
        
        const root = document.documentElement;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Set CSS custom properties for responsive design
        root.style.setProperty('--viewport-width', `${width}px`);
        root.style.setProperty('--viewport-height', `${height}px`);
        
        // Mobile breakpoint
        const isMobile = width <= 768;
        root.style.setProperty('--is-mobile', isMobile ? '1' : '0');
        
        // Update classes efficiently
        const gameInterface = document.getElementById('gameInterface');
        const usersList = document.getElementById('usersList');
        
        if (gameInterface) {
            gameInterface.classList.toggle('mobile-layout', isMobile);
        }
        
        if (usersList) {
            usersList.classList.toggle('mobile-users', isMobile);
        }
        
        this.performanceMetrics.renderTime = performance.now() - startTime;
    }
    
    // Optimized game interface initialization
    showGameInterface() {
        console.log('🎮 Visualizzazione interfaccia gioco ottimizzata...');
        this.currentView = 'game';
        this.authManager.showGameInterface();
        this.updateRoomDisplay();
        
        // Initialize core systems immediately
        if (!this.systemsInitialized && !this.initializationInProgress) {
            this.initializationInProgress = true;
            this.initializeCoreSystemsAsync();
        } else if (this.systemsInitialized) {
            this.updateAdminControlsVisibility();
        }
    }
    
    // Async initialization of core systems
    async initializeCoreSystemsAsync() {
        console.log('⚙️ Inizializzazione sistemi core asincrona...');
        
        try {
            // Initialize in order of dependency and importance
            const initOrder = [
                'users',
                'map',
                'dice',
                'chat',
                'music',
                'tokens',
                'assets',
                'ping',
                'soundBoard',
                'master',
                'characterSheet'
            ];
            
            // Initialize systems with small delays to prevent blocking
            for (const systemName of initOrder) {
                const system = this.getSystem(systemName);
                if (system && typeof system.init === 'function') {
                    await new Promise(resolve => {
                        system.init();
                        setTimeout(resolve, 10); // Small delay to prevent blocking
                    });
                }
            }
            
            // Post-initialization setup
            await this.postInitializationSetup();
            
            this.systemsInitialized = true;
            this.initializationInProgress = false;
            
            console.log('✅ Tutti i sistemi inizializzati con successo');
            
        } catch (error) {
            console.error('❌ Errore inizializzazione sistemi:', error);
            this.initializationInProgress = false;
        }
    }
    
    // Post-initialization setup
    async postInitializationSetup() {
        // Update responsive layout
        this.updateResponsiveLayout();
        
        // Update admin controls
        this.updateAdminControlsVisibility();
        
        // Setup intersection observer for performance
        this.setupIntersectionObserver();
    }
    
    // Setup intersection observer for performance optimizations
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                } else {
                    entry.target.classList.remove('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observe elements that can benefit from visibility optimization
        const observableElements = document.querySelectorAll('.dice-result, .chat-message, .library-asset');
        observableElements.forEach(el => observer.observe(el));
    }
    
    // Optimized login screen
    showLoginScreen() {
        console.log('🔐 Visualizzazione schermata login...');
        this.currentView = 'login';
        this.authManager.showLoginScreen();
        
        // Cleanup systems efficiently
        if (this.systemsInitialized) {
            this.cleanupSystemsAsync();
        }
    }
    
    // Async cleanup of systems
    async cleanupSystemsAsync() {
        console.log('🧹 Pulizia sistemi asincrona...');
        
        const cleanupPromises = [];
        
        this.systems.forEach((system, name) => {
            if (system && typeof system.cleanup === 'function') {
                cleanupPromises.push(
                    new Promise(resolve => {
                        try {
                            system.cleanup();
                            resolve();
                        } catch (error) {
                            console.error(`❌ Errore cleanup ${name}:`, error);
                            resolve();
                        }
                    })
                );
            }
        });
        
        await Promise.all(cleanupPromises);
        
        // Clear systems map
        this.systems.clear();
        
        this.systemsInitialized = false;
        this.initializationInProgress = false;
        
        console.log('✅ Cleanup sistemi completato');
    }
    
    // Optimized room display update
    updateRoomDisplay() {
        const roomName = this.authManager.getCurrentRoom();
        const roomNameElement = document.getElementById('currentRoomName');
        
        if (roomName && roomNameElement && roomNameElement.textContent !== roomName) {
            roomNameElement.textContent = roomName;
            console.log('🏠 Display stanza aggiornato:', roomName);
        }
    }
    
    // Optimized admin controls visibility
    updateAdminControlsVisibility() {
        const isMaster = this.authManager.isMaster();
        
        // Use CSS custom property for better performance
        document.documentElement.style.setProperty('--is-master', isMaster ? '1' : '0');
        
        // Update specific systems
        const masterPanel = this.systems.get('master');
        const soundBoard = this.systems.get('soundBoard');
        
        if (masterPanel) masterPanel.updateVisibility();
        if (soundBoard) soundBoard.updateVisibility();
        
        console.log('👑 Controlli admin aggiornati, isMaster:', isMaster);
    }
    
    // Optimized exit handling
    async handleExit() {
        if (this.isLoggingOut) return;
        
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
            console.log('👋 Uscita dalla taverna...');
            
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
    
    // Optimized notification system with object pooling
    showNotification(message, type = 'info', duration = 3000) {
        console.log(`📢 Notifica ${type}:`, message);
        
        // Reuse notification elements for better performance
        let notification = document.querySelector('.notification.pooled');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification pooled';
            this.setupNotificationStyles(notification);
        }
        
        // Update content and type
        notification.textContent = message;
        notification.className = `notification pooled notification-${type}`;
        this.updateNotificationStyle(notification, type);
        
        // Show notification
        document.body.appendChild(notification);
        notification.style.display = 'block';
        notification.style.animation = 'slideInRight 0.4s ease-out';
        
        // Auto-hide
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease-in';
            setTimeout(() => {
                notification.style.display = 'none';
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, duration);
    }
    
    // Setup base notification styles
    setupNotificationStyles(notification) {
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
            backdrop-filter: blur(10px);
            display: none;
        `;
    }
    
    // Update notification style based on type
    updateNotificationStyle(notification, type) {
        const styles = {
            success: {
                background: 'linear-gradient(135deg, rgba(34, 139, 34, 0.9) 0%, rgba(50, 205, 50, 0.9) 100%)',
                borderColor: '#32cd32'
            },
            error: {
                background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.9) 0%, rgba(220, 20, 60, 0.9) 100%)',
                borderColor: '#dc143c'
            },
            warning: {
                background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.9) 0%, rgba(255, 165, 0, 0.9) 100%)',
                borderColor: '#ffa500'
            },
            info: {
                background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(160, 82, 45, 0.9) 100%)',
                borderColor: '#8b4513'
            }
        };
        
        const style = styles[type] || styles.info;
        notification.style.background = style.background;
        notification.style.borderColor = style.borderColor;
    }
    
    // Get performance metrics
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            systemsLoaded: this.systems.size,
            memoryUsageMB: Math.round(this.performanceMetrics.memoryUsage / 1024 / 1024)
        };
    }
    
    // Get all systems for external access
    getSystems() {
        const systemsObj = {};
        this.systems.forEach((system, name) => {
            systemsObj[name] = system;
        });
        
        return {
            auth: this.authManager,
            ...systemsObj
        };
    }
}

export default UIManager;