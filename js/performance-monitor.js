// Performance monitoring system
export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: 0,
            memory: 0,
            renderTime: 0,
            networkRequests: 0,
            errors: 0
        };
        
        this.observers = [];
        this.isMonitoring = false;
        this.frameCount = 0;
        this.lastTime = performance.now();
    }
    
    // Start monitoring
    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.startFPSMonitoring();
        this.startMemoryMonitoring();
        this.startNetworkMonitoring();
        this.startErrorMonitoring();
        this.startIntersectionObserver();
        
        console.log('📊 Performance monitoring avviato');
    }
    
    // Stop monitoring
    stop() {
        this.isMonitoring = false;
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        console.log('📊 Performance monitoring fermato');
    }
    
    // FPS monitoring
    startFPSMonitoring() {
        const measureFPS = () => {
            if (!this.isMonitoring) return;
            
            this.frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - this.lastTime >= 1000) {
                this.metrics.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
                
                if (this.metrics.fps < 30) {
                    console.warn('⚠️ FPS basso:', this.metrics.fps);
                    this.optimizeForLowFPS();
                }
                
                this.frameCount = 0;
                this.lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    // Memory monitoring
    startMemoryMonitoring() {
        if (!performance.memory) return;
        
        setInterval(() => {
            if (!this.isMonitoring) return;
            
            this.metrics.memory = performance.memory.usedJSHeapSize;
            
            // Warn if memory usage is high
            if (this.metrics.memory > 100 * 1024 * 1024) { // 100MB
                console.warn('⚠️ Alto uso memoria:', Math.round(this.metrics.memory / 1024 / 1024) + 'MB');
                this.optimizeMemoryUsage();
            }
        }, 5000);
    }
    
    // Network monitoring
    startNetworkMonitoring() {
        const originalFetch = window.fetch;
        let requestCount = 0;
        
        window.fetch = async function(...args) {
            requestCount++;
            const start = performance.now();
            
            try {
                const response = await originalFetch.apply(this, args);
                const duration = performance.now() - start;
                
                if (duration > 1000) {
                    console.warn('⚠️ Richiesta lenta:', args[0], duration + 'ms');
                }
                
                return response;
            } catch (error) {
                console.error('❌ Errore rete:', error);
                throw error;
            }
        };
        
        setInterval(() => {
            this.metrics.networkRequests = requestCount;
            requestCount = 0;
        }, 1000);
    }
    
    // Error monitoring
    startErrorMonitoring() {
        window.addEventListener('error', (event) => {
            this.metrics.errors++;
            console.error('❌ Errore JavaScript:', event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.metrics.errors++;
            console.error('❌ Promise rifiutata:', event.reason);
        });
    }
    
    // Intersection observer for performance
    startIntersectionObserver() {
        if (!window.IntersectionObserver) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const element = entry.target;
                
                if (entry.isIntersecting) {
                    element.classList.add('visible');
                    element.style.willChange = 'transform';
                } else {
                    element.classList.remove('visible');
                    element.style.willChange = 'auto';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observe performance-critical elements
        const observableElements = document.querySelectorAll(
            '.chat-message, .dice-result, .library-asset, .token, .map-asset'
        );
        
        observableElements.forEach(el => observer.observe(el));
        this.observers.push(observer);
    }
    
    // Optimize for low FPS
    optimizeForLowFPS() {
        // Reduce animation quality
        document.documentElement.style.setProperty('--transition-fast', '0.1s ease');
        document.documentElement.style.setProperty('--transition-normal', '0.2s ease');
        
        // Disable non-essential animations
        const elements = document.querySelectorAll('.token, .map-asset');
        elements.forEach(el => {
            el.style.transition = 'none';
        });
        
        console.log('🔧 Ottimizzazioni FPS applicate');
    }
    
    // Optimize memory usage
    optimizeMemoryUsage() {
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Clear unused cached elements
        this.clearUnusedElements();
        
        // Reduce image quality for better memory usage
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.naturalWidth > 1024) {
                img.style.imageRendering = 'pixelated';
            }
        });
        
        console.log('🔧 Ottimizzazioni memoria applicate');
    }
    
    // Clear unused elements
    clearUnusedElements() {
        // Remove old chat messages
        const chatMessages = document.querySelectorAll('.chat-message');
        if (chatMessages.length > 50) {
            for (let i = 50; i < chatMessages.length; i++) {
                chatMessages[i].remove();
            }
        }
        
        // Remove old dice results
        const diceResults = document.querySelectorAll('.dice-result');
        if (diceResults.length > 20) {
            for (let i = 20; i < diceResults.length; i++) {
                diceResults[i].remove();
            }
        }
    }
    
    // Get current metrics
    getMetrics() {
        return {
            ...this.metrics,
            memoryMB: Math.round(this.metrics.memory / 1024 / 1024),
            timestamp: Date.now()
        };
    }
    
    // Performance report
    generateReport() {
        const metrics = this.getMetrics();
        
        return {
            performance: {
                fps: metrics.fps,
                memory: metrics.memoryMB + 'MB',
                renderTime: metrics.renderTime + 'ms',
                networkRequests: metrics.networkRequests + '/s',
                errors: metrics.errors
            },
            recommendations: this.getRecommendations(metrics),
            timestamp: new Date().toISOString()
        };
    }
    
    // Get performance recommendations
    getRecommendations(metrics) {
        const recommendations = [];
        
        if (metrics.fps < 30) {
            recommendations.push('Considera di ridurre la qualità delle animazioni');
        }
        
        if (metrics.memoryMB > 100) {
            recommendations.push('Alto uso di memoria - considera di ricaricare la pagina');
        }
        
        if (metrics.networkRequests > 10) {
            recommendations.push('Molte richieste di rete - verifica la connessione');
        }
        
        if (metrics.errors > 0) {
            recommendations.push('Errori rilevati - controlla la console');
        }
        
        return recommendations;
    }
}

export default PerformanceMonitor;