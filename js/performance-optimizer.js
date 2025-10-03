// Performance optimization system
export class PerformanceOptimizer {
    constructor() {
        this.metrics = {
            fps: 60,
            memory: 0,
            renderTime: 0,
            domNodes: 0,
            eventListeners: 0
        };
        
        this.optimizations = {
            virtualScrolling: false,
            lazyLoading: true,
            imageCompression: true,
            eventDelegation: true,
            debouncing: true
        };
        
        this.observers = [];
        this.isMonitoring = false;
        this.performanceMode = false;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        // Throttled functions
        this.throttledOptimize = this.throttle(this.optimizePerformance.bind(this), 1000);
    }
    
    // Initialize performance optimizer
    init() {
        this.detectDeviceCapabilities();
        this.setupPerformanceMonitoring();
        this.setupIntersectionObserver();
        this.optimizeInitialLoad();
        
        console.log('⚡ Performance optimizer inizializzato');
    }
    
    // Detect device capabilities
    detectDeviceCapabilities() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;
        
        // Determine performance mode based on device capabilities
        const isLowEnd = memory < 4 || cores < 4;
        const isSlowConnection = connection && (
            connection.effectiveType === 'slow-2g' || 
            connection.effectiveType === '2g' ||
            connection.downlink < 1
        );
        
        this.performanceMode = isLowEnd || isSlowConnection;
        
        if (this.performanceMode) {
            this.enablePerformanceMode();
        }
        
        console.log('📱 Device capabilities:', {
            memory: memory + 'GB',
            cores,
            connection: connection?.effectiveType || 'unknown',
            performanceMode: this.performanceMode
        });
    }
    
    // Enable performance mode
    enablePerformanceMode() {
        // Disable heavy animations
        document.documentElement.classList.add('performance-mode');
        
        // Reduce update frequencies
        this.optimizations.virtualScrolling = true;
        this.optimizations.imageCompression = true;
        
        // Apply CSS optimizations
        const style = document.createElement('style');
        style.textContent = `
            .performance-mode * {
                will-change: auto !important;
                transform: translateZ(0) !important;
            }
            .performance-mode .map-canvas {
                image-rendering: pixelated;
            }
            .performance-mode .token,
            .performance-mode .map-asset {
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('🚀 Performance mode attivato');
    }
    
    // Setup performance monitoring
    setupPerformanceMonitoring() {
        this.isMonitoring = true;
        this.startFPSMonitoring();
        this.startMemoryMonitoring();
        this.startDOMMonitoring();
    }
    
    // Monitor FPS
    startFPSMonitoring() {
        const measureFPS = () => {
            if (!this.isMonitoring) return;
            
            this.frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - this.lastTime >= 1000) {
                this.metrics.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
                
                if (this.metrics.fps < 30) {
                    this.throttledOptimize();
                }
                
                this.frameCount = 0;
                this.lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    // Monitor memory usage
    startMemoryMonitoring() {
        if (!performance.memory) return;
        
        setInterval(() => {
            if (!this.isMonitoring) return;
            
            this.metrics.memory = performance.memory.usedJSHeapSize;
            
            if (this.metrics.memory > 100 * 1024 * 1024) { // 100MB
                this.optimizeMemoryUsage();
            }
        }, 5000);
    }
    
    // Monitor DOM complexity
    startDOMMonitoring() {
        setInterval(() => {
            if (!this.isMonitoring) return;
            
            this.metrics.domNodes = document.querySelectorAll('*').length;
            
            if (this.metrics.domNodes > 5000) {
                this.optimizeDOMComplexity();
            }
        }, 10000);
    }
    
    // Setup intersection observer for lazy loading
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                } else {
                    this.unloadElement(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observe images and heavy elements
        const observableElements = document.querySelectorAll('img, .map-asset, .token, .chat-message');
        observableElements.forEach(el => observer.observe(el));
        
        this.observers.push(observer);
    }
    
    // Load element when visible
    loadElement(element) {
        if (element.dataset.src && !element.src) {
            element.src = element.dataset.src;
            element.classList.add('loaded');
        }
        
        element.style.willChange = 'transform';
    }
    
    // Unload element when not visible
    unloadElement(element) {
        element.style.willChange = 'auto';
    }
    
    // Optimize performance when FPS drops
    optimizePerformance() {
        console.log('🔧 Ottimizzazione performance per FPS basso:', this.metrics.fps);
        
        // Reduce animation quality
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
        document.documentElement.style.setProperty('--transition-duration', '0.1s');
        
        // Disable non-essential effects
        const elements = document.querySelectorAll('.token, .map-asset, .chat-message');
        elements.forEach(el => {
            el.style.transition = 'none';
            el.style.animation = 'none';
        });
        
        // Enable virtual scrolling for chat
        this.enableVirtualScrolling();
    }
    
    // Optimize memory usage
    optimizeMemoryUsage() {
        console.log('🧹 Ottimizzazione memoria:', Math.round(this.metrics.memory / 1024 / 1024) + 'MB');
        
        // Clear unused images
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!this.isElementVisible(img)) {
                const src = img.src;
                img.src = '';
                img.dataset.src = src;
            }
        });
        
        // Limit chat messages
        const chatMessages = document.querySelectorAll('.chat-message');
        if (chatMessages.length > 50) {
            for (let i = 50; i < chatMessages.length; i++) {
                chatMessages[i].remove();
            }
        }
        
        // Limit dice results
        const diceResults = document.querySelectorAll('.dice-result');
        if (diceResults.length > 20) {
            for (let i = 20; i < diceResults.length; i++) {
                diceResults[i].remove();
            }
        }
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }
    
    // Optimize DOM complexity
    optimizeDOMComplexity() {
        console.log('📊 Ottimizzazione complessità DOM:', this.metrics.domNodes, 'nodi');
        
        // Remove hidden elements
        const hiddenElements = document.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(el => {
            if (!el.dataset.keepHidden) {
                el.remove();
            }
        });
        
        // Virtualize long lists
        this.virtualizeList('.chat-messages');
        this.virtualizeList('.dice-results-content');
    }
    
    // Enable virtual scrolling
    enableVirtualScrolling() {
        if (this.optimizations.virtualScrolling) return;
        
        this.optimizations.virtualScrolling = true;
        
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
            this.setupVirtualScroll(chatContainer);
        }
    }
    
    // Setup virtual scrolling for container
    setupVirtualScroll(container) {
        const itemHeight = 60; // Approximate height of chat message
        const visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        
        let scrollTop = 0;
        let items = Array.from(container.children);
        
        const updateVisibleItems = () => {
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(startIndex + visibleItems, items.length);
            
            items.forEach((item, index) => {
                if (index >= startIndex && index < endIndex) {
                    item.style.display = 'block';
                    item.style.transform = `translateY(${index * itemHeight}px)`;
                } else {
                    item.style.display = 'none';
                }
            });
        };
        
        container.addEventListener('scroll', () => {
            scrollTop = container.scrollTop;
            requestAnimationFrame(updateVisibleItems);
        });
        
        updateVisibleItems();
    }
    
    // Virtualize list
    virtualizeList(selector) {
        const container = document.querySelector(selector);
        if (!container) return;
        
        const items = Array.from(container.children);
        if (items.length < 100) return; // Only virtualize large lists
        
        this.setupVirtualScroll(container);
    }
    
    // Check if element is visible
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }
    
    // Optimize initial load
    optimizeInitialLoad() {
        // Preload critical resources
        this.preloadCriticalResources();
        
        // Defer non-critical scripts
        this.deferNonCriticalScripts();
        
        // Optimize images
        this.optimizeImages();
    }
    
    // Preload critical resources
    preloadCriticalResources() {
        const criticalResources = [
            'styles.css',
            'js/main.js',
            'js/firebase.js'
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;
            link.as = resource.endsWith('.css') ? 'style' : 'script';
            document.head.appendChild(link);
        });
    }
    
    // Defer non-critical scripts
    deferNonCriticalScripts() {
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            if (!script.src.includes('firebase') && !script.src.includes('main')) {
                script.defer = true;
            }
        });
    }
    
    // Optimize images
    optimizeImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Add loading="lazy" for better performance
            img.loading = 'lazy';
            
            // Add decoding="async" for non-blocking
            img.decoding = 'async';
            
            // Optimize image rendering
            if (img.naturalWidth > 1024) {
                img.style.imageRendering = 'optimizeQuality';
            }
        });
    }
    
    // Throttle function
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
    
    // Get performance metrics
    getMetrics() {
        return {
            ...this.metrics,
            memoryMB: Math.round(this.metrics.memory / 1024 / 1024),
            performanceMode: this.performanceMode,
            optimizations: this.optimizations
        };
    }
    
    // Generate performance report
    generateReport() {
        const metrics = this.getMetrics();
        
        return {
            performance: {
                fps: metrics.fps,
                memory: metrics.memoryMB + 'MB',
                domNodes: metrics.domNodes,
                performanceMode: metrics.performanceMode
            },
            optimizations: metrics.optimizations,
            recommendations: this.getRecommendations(metrics),
            timestamp: new Date().toISOString()
        };
    }
    
    // Get performance recommendations
    getRecommendations(metrics) {
        const recommendations = [];
        
        if (metrics.fps < 30) {
            recommendations.push('FPS basso - considera di ridurre la qualità delle animazioni');
        }
        
        if (metrics.memoryMB > 100) {
            recommendations.push('Alto uso di memoria - ricarica la pagina periodicamente');
        }
        
        if (metrics.domNodes > 3000) {
            recommendations.push('DOM complesso - abilita la virtualizzazione delle liste');
        }
        
        if (!metrics.performanceMode && (metrics.fps < 45 || metrics.memoryMB > 80)) {
            recommendations.push('Considera di abilitare la modalità performance');
        }
        
        return recommendations;
    }
    
    // Stop monitoring
    stop() {
        this.isMonitoring = false;
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        console.log('⏹️ Performance monitoring fermato');
    }
}

export default PerformanceOptimizer;