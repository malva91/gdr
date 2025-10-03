// Main application entry point - Optimized logging
import UIManager from './ui.js?v.100';
import AppVersion from './version.js?v.100';
import { modalSystem } from './modal-system.js?v.100';

// Application state
const App = {
    uiManager: null,
    initialized: false,

    // Initialize the application
    init() {
        if (this.initialized) return;
        
        console.log('🐺 Inizializzazione Taverna dei Cani di Odino v' + AppVersion.version);
        
        // FIXED: Configura il nome della stanza prima dell'inizializzazione
        this.configureRoomName();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bootstrap());
        } else {
            this.bootstrap();
        }
    },
    
    // FIXED: Configurazione nome stanza
    configureRoomName() {
        // Qui puoi cambiare il nome della stanza
        // Esempi di utilizzo:
        
        // Nome fisso
        // window.TAVERNA_ROOM_NAME = 'La-Taverna-del-Drago-Rosso';
        
        // Nome basato sulla data
        // const today = new Date().toISOString().split('T')[0];
        // window.TAVERNA_ROOM_NAME = `Sessione-${today}`;
        
        // Nome casuale
        // const randomId = Math.random().toString(36).substr(2, 9);
        // window.TAVERNA_ROOM_NAME = `Taverna-${randomId}`;
        
        // Nome da parametro URL
        // const urlParams = new URLSearchParams(window.location.search);
        // const roomFromUrl = urlParams.get('room');
        // if (roomFromUrl) {
        //     window.TAVERNA_ROOM_NAME = roomFromUrl;
        // }
        
        // Se non è stato impostato nessun nome personalizzato, usa quello predefinito
        if (!window.TAVERNA_ROOM_NAME) {
            window.TAVERNA_ROOM_NAME = 'Taverna-Principale';
        }
        
        console.log('🏠 Nome stanza configurato:', window.TAVERNA_ROOM_NAME);
    },
    
    // Bootstrap the application
    bootstrap() {
        try {
            if (AppVersion.checkVersion()) {
                console.log('🔄 Nuova versione rilevata, ricaricamento...');
                return;
            }
            
            this.initVersionDisplay();
            this.uiManager = new UIManager();
            this.uiManager.init();
            this.setupErrorHandling();
            this.setupPerformanceMonitoring();
            this.uiManager.initTooltips();
            
            this.initialized = true;
            console.log('✅ Taverna inizializzata con successo');
            
            document.dispatchEvent(new CustomEvent('tavernaReady'));
            
        } catch (error) {
            console.error('❌ ERRORE CRITICO inizializzazione:', error);
            this.handleCriticalError(error);
        }
    },
    
    // Initialize version display
    initVersionDisplay() {
        const versionText = document.getElementById('versionText');
        const reloadBtn = document.getElementById('reloadBtn');
        
        if (versionText) {
            versionText.textContent = AppVersion.getDisplayVersion();
        }
        
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                if (confirm('Ricaricare l\'applicazione? Eventuali dati non salvati andranno persi.')) {
                    AppVersion.forceReload();
                }
            });
        }
    },
    
    // Setup global error handling
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('❌ ERRORE NON GESTITO:', event.error);
            this.handleError(event.error, 'Errore imprevisto');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ PROMISE RIFIUTATA:', event.reason);
            this.handleError(event.reason, 'Errore di connessione');
        });
        
        window.addEventListener('firebase-error', (event) => {
            console.error('❌ ERRORE FIREBASE:', event.detail);
            this.handleError(event.detail, 'Errore del server');
        });
    },
    
    // Setup performance monitoring
    setupPerformanceMonitoring() {
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            if (loadTime > 5000) {
                console.warn('⚠️ Tempo di caricamento elevato:', Math.round(loadTime) + 'ms');
            }
        });
        
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                if (memory.usedJSHeapSize > 50 * 1024 * 1024) {
                    console.warn('⚠️ Uso memoria elevato:', Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB');
                }
            }, 60000);
        }
    },
    
    // Handle application errors
    handleError(error, userMessage = 'Si è verificato un errore') {
        const errorMessage = error && error.message ? error.message : (error || 'Errore sconosciuto');
        
        if (this.uiManager) {
            this.uiManager.showNotification(userMessage, 'error');
        }
        
        console.error('❌ DETTAGLI ERRORE:', {
            message: errorMessage,
            stack: error && error.stack ? error.stack : 'Stack non disponibile',
            timestamp: new Date().toISOString(),
            version: AppVersion.getDisplayVersion()
        });
    },
    
    // Handle critical errors
    handleCriticalError(error) {
        const errorMessage = `
            <div style="text-align: center; padding: 2rem; color: #ff6b6b;">
                <h2>🚨 Errore Critico</h2>
                <p>Si è verificato un errore critico nell'applicazione.</p>
                <p>Versione: ${AppVersion.getDisplayVersion()}</p>
                <p>Per favore, ricarica la pagina per continuare.</p>
                <button onclick="window.location.reload()" style="
                    padding: 0.75rem 1.5rem;
                    background: #8b4513;
                    color: #d4af37;
                    border: none;
                    border-radius: 6px;
                    font-family: 'Cinzel', serif;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 1rem;
                ">Ricarica Pagina</button>
            </div>
        `;
        
        document.body.innerHTML = errorMessage;
        console.error('❌ ERRORE CRITICO:', error);
    },
    
    // Get application info
    getInfo() {
        return {
            name: 'Taverna dei Cani di Odino',
            ...AppVersion.getBuildInfo(),
            initialized: this.initialized
        };
    }
};

// Make modal system globally available AFTER importing
window.modalSystem = modalSystem;

// Global app reference
window.TavernaApp = App;

// Initialize the application
App.init();

// Export for module usage
export default App;