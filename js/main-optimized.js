// Main application entry point - Ottimizzato per performance
import UIManager from './ui-optimized.js?v.100';
import PerformanceMonitor from './performance-monitor.js?v.100';
import LayoutOptimizer from './layout-optimizer.js?v.100';
import AppVersion from './version.js?v.100';
import { modalSystem } from './modal-system.js?v.100';

// Application state ottimizzato
const App = {
    uiManager: null,
    performanceMonitor: null,
    layoutOptimizer: null,
    initialized: false,
    startTime: 0,

    // Initialize the application with performance monitoring
    init() {
        if (this.initialized) return;
        
        this.startTime = performance.now();
        console.log('🐺 Inizializzazione Taverna dei Cani di Odino v' + AppVersion.version + ' (Ottimizzata)');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bootstrap());
        } else {
            this.bootstrap();
        }
    },
    
    // Bootstrap the application with optimizations
    async bootstrap() {
        try {
            // Check version first
            if (AppVersion.checkVersion()) {
                console.log('🔄 Nuova versione rilevata, ricaricamento...');
                return;
            }
            
            // Initialize performance monitoring
            this.performanceMonitor = new PerformanceMonitor();
            this.performanceMonitor.start();
            
            // Initialize layout optimizer
            this.layoutOptimizer = new LayoutOptimizer();
            this.layoutOptimizer.init();
            
            // Initialize version display
            this.initVersionDisplay();
            
            // Initialize UI manager
            this.uiManager = new UIManager();
            this.uiManager.init();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Setup performance monitoring
            this.setupPerformanceReporting();
            
            // Initialize tooltips
            this.uiManager.initTooltips();
            
            // Mark as initialized
            this.initialized = true;
            
            const initTime = performance.now() - this.startTime;
            console.log(`✅ Taverna inizializzata con successo in ${initTime.toFixed(2)}ms`);
            
            // Dispatch ready event
            document.dispatchEvent(new CustomEvent('tavernaReady', {
                detail: {
                    initTime,
                    performance: this.performanceMonitor.getMetrics(),
                    layout: this.layoutOptimizer.getLayoutMetrics()
                }
            }));
            
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
    
    // Setup enhanced error handling
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('❌ ERRORE NON GESTITO:', event.error);
            this.handleError(event.error, 'Errore imprevisto');
            
            // Report to performance monitor
            if (this.performanceMonitor) {
                this.performanceMonitor.metrics.errors++;
            }
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ PROMISE RIFIUTATA:', event.reason);
            this.handleError(event.reason, 'Errore di connessione');
            
            // Report to performance monitor
            if (this.performanceMonitor) {
                this.performanceMonitor.metrics.errors++;
            }
        });
        
        // Firebase error handler
        window.addEventListener('firebase-error', (event) => {
            console.error('❌ ERRORE FIREBASE:', event.detail);
            this.handleError(event.detail, 'Errore del server');
        });
        
        // Network error handler
        window.addEventListener('offline', () => {
            this.handleNetworkError('Connessione persa');
        });
        
        window.addEventListener('online', () => {
            this.handleNetworkRestore();
        });
    },
    
    // Setup performance reporting
    setupPerformanceReporting() {
        // Report performance metrics every 30 seconds
        setInterval(() => {
            if (this.performanceMonitor) {
                const metrics = this.performanceMonitor.getMetrics();
                
                // Log performance issues
                if (metrics.fps < 30) {
                    console.warn('⚠️ Performance degradata - FPS:', metrics.fps);
                }
                
                if (metrics.memoryMB > 150) {
                    console.warn('⚠️ Alto uso memoria:', metrics.memoryMB + 'MB');
                }
            }
        }, 30000);
        
        // Report on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.performanceMonitor) {
                const report = this.performanceMonitor.generateReport();
                console.log('📊 Performance Report:', report);
            }
        });
    },
    
    // Handle application errors
    handleError(error, userMessage = 'Si è verificato un errore') {
        const errorMessage = error && error.message ? error.message : (error || 'Errore sconosciuto');
        
        // Show user notification
        if (this.uiManager) {
            this.uiManager.showNotification(userMessage, 'error');
        }
        
        // Log detailed error
        console.error('❌ DETTAGLI ERRORE:', {
            message: errorMessage,
            stack: error && error.stack ? error.stack : 'Stack non disponibile',
            timestamp: new Date().toISOString(),
            version: AppVersion.getDisplayVersion(),
            performance: this.performanceMonitor ? this.performanceMonitor.getMetrics() : null,
            layout: this.layoutOptimizer ? this.layoutOptimizer.getLayoutMetrics() : null
        });
    },
    
    // Handle network errors
    handleNetworkError(message) {
        console.warn('🌐 Errore rete:', message);
        
        if (this.uiManager) {
            this.uiManager.showNotification('Connessione persa - Riconnessione automatica...', 'warning', 5000);
        }
        
        // Implement reconnection logic here
        this.attemptReconnection();
    },
    
    // Handle network restore
    handleNetworkRestore() {
        console.log('🌐 Connessione ripristinata');
        
        if (this.uiManager) {
            this.uiManager.showNotification('Connessione ripristinata', 'success');
        }
    },
    
    // Attempt reconnection
    attemptReconnection() {
        let attempts = 0;
        const maxAttempts = 5;
        
        const reconnect = () => {
            attempts++;
            
            if (attempts > maxAttempts) {
                console.error('❌ Riconnessione fallita dopo', maxAttempts, 'tentativi');
                if (this.uiManager) {
                    this.uiManager.showNotification('Impossibile riconnettersi - Ricarica la pagina', 'error', 10000);
                }
                return;
            }
            
            // Test connection
            fetch('/ping', { method: 'HEAD' })
                .then(() => {
                    console.log('✅ Riconnessione riuscita');
                    this.handleNetworkRestore();
                })
                .catch(() => {
                    console.log(`🔄 Tentativo riconnessione ${attempts}/${maxAttempts}`);
                    setTimeout(reconnect, 2000 * attempts); // Exponential backoff
                });
        };
        
        setTimeout(reconnect, 1000);
    },
    
    // Handle critical errors
    handleCriticalError(error) {
        const errorInfo = {
            message: error.message || 'Errore critico sconosciuto',
            stack: error.stack || 'Stack non disponibile',
            version: AppVersion.getDisplayVersion(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        const errorMessage = `
            <div style="text-align: center; padding: 2rem; color: #ff6b6b; font-family: 'Cinzel', serif;">
                <h2>🚨 Errore Critico</h2>
                <p>Si è verificato un errore critico nell'applicazione.</p>
                <p>Versione: ${errorInfo.version}</p>
                <p>Timestamp: ${errorInfo.timestamp}</p>
                <details style="margin: 1rem 0; text-align: left;">
                    <summary style="cursor: pointer; color: #d4af37;">Dettagli Tecnici</summary>
                    <pre style="background: #000; padding: 1rem; border-radius: 4px; overflow: auto; font-size: 0.8rem;">
${JSON.stringify(errorInfo, null, 2)}
                    </pre>
                </details>
                <div style="margin-top: 2rem;">
                    <button onclick="window.location.reload()" style="
                        padding: 0.75rem 1.5rem;
                        background: #8b4513;
                        color: #d4af37;
                        border: none;
                        border-radius: 6px;
                        font-family: 'Cinzel', serif;
                        font-weight: 600;
                        cursor: pointer;
                        margin-right: 1rem;
                    ">Ricarica Pagina</button>
                    <button onclick="localStorage.clear(); window.location.reload()" style="
                        padding: 0.75rem 1.5rem;
                        background: #dc143c;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-family: 'Cinzel', serif;
                        font-weight: 600;
                        cursor: pointer;
                    ">Reset Completo</button>
                </div>
            </div>
        `;
        
        document.body.innerHTML = errorMessage;
        console.error('❌ ERRORE CRITICO:', errorInfo);
    },
    
    // Get application info with performance data
    getInfo() {
        return {
            name: 'Taverna dei Cani di Odino',
            ...AppVersion.getBuildInfo(),
            initialized: this.initialized,
            performance: this.performanceMonitor ? this.performanceMonitor.getMetrics() : null,
            layout: this.layoutOptimizer ? this.layoutOptimizer.getLayoutMetrics() : null,
            systems: this.uiManager ? Object.keys(this.uiManager.getSystems()) : []
        };
    },
    
    // Performance diagnostics
    runDiagnostics() {
        if (!this.performanceMonitor) {
            console.warn('⚠️ Performance monitor non disponibile');
            return;
        }
        
        const report = this.performanceMonitor.generateReport();
        console.log('🔍 Diagnostica Performance:', report);
        
        return report;
    },
    
    // Cleanup on page unload
    cleanup() {
        if (this.performanceMonitor) {
            this.performanceMonitor.stop();
        }
        
        if (this.layoutOptimizer) {
            this.layoutOptimizer.cleanup();
        }
        
        if (this.uiManager) {
            // Cleanup UI systems
            const systems = this.uiManager.getSystems();
            Object.values(systems).forEach(system => {
                if (system && typeof system.cleanup === 'function') {
                    system.cleanup();
                }
            });
        }
        
        console.log('🧹 Applicazione pulita');
    }
};

// Make modal system globally available AFTER importing
window.modalSystem = modalSystem;

// Setup cleanup on page unload
window.addEventListener('beforeunload', () => {
    App.cleanup();
});

// Global app reference
window.TavernaApp = App;

// Initialize the application
App.init();

// Export for module usage
export default App;