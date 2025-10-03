// Layout optimization system
export class LayoutOptimizer {
    constructor() {
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        };
        
        this.currentBreakpoint = this.getCurrentBreakpoint();
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.isOptimizing = false;
    }
    
    // Initialize layout optimizer
    init() {
        this.setupResponsiveSystem();
        this.setupResizeObserver();
        this.setupMutationObserver();
        this.optimizeInitialLayout();
        
        console.log('📐 Layout optimizer inizializzato');
    }
    
    // Setup responsive system with CSS custom properties
    setupResponsiveSystem() {
        const root = document.documentElement;
        
        // Set initial viewport variables
        this.updateViewportVariables();
        
        // Update on resize
        window.addEventListener('resize', this.throttle(() => {
            this.updateViewportVariables();
            this.handleBreakpointChange();
        }, 250));
    }
    
    // Update CSS custom properties for viewport
    updateViewportVariables() {
        const root = document.documentElement;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        root.style.setProperty('--viewport-width', `${width}px`);
        root.style.setProperty('--viewport-height', `${height}px`);
        root.style.setProperty('--is-mobile', width <= this.breakpoints.mobile ? '1' : '0');
        root.style.setProperty('--is-tablet', width <= this.breakpoints.tablet ? '1' : '0');
        root.style.setProperty('--is-desktop', width > this.breakpoints.desktop ? '1' : '0');
    }
    
    // Get current breakpoint
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        
        if (width <= this.breakpoints.mobile) return 'mobile';
        if (width <= this.breakpoints.tablet) return 'tablet';
        return 'desktop';
    }
    
    // Handle breakpoint changes
    handleBreakpointChange() {
        const newBreakpoint = this.getCurrentBreakpoint();
        
        if (newBreakpoint !== this.currentBreakpoint) {
            console.log('📱 Breakpoint cambiato:', this.currentBreakpoint, '->', newBreakpoint);
            this.currentBreakpoint = newBreakpoint;
            this.optimizeForBreakpoint(newBreakpoint);
        }
    }
    
    // Optimize layout for specific breakpoint
    optimizeForBreakpoint(breakpoint) {
        const gameMain = document.querySelector('.game-main');
        if (!gameMain) return;
        
        switch (breakpoint) {
            case 'mobile':
                this.optimizeForMobile();
                break;
            case 'tablet':
                this.optimizeForTablet();
                break;
            case 'desktop':
                this.optimizeForDesktop();
                break;
        }
    }
    
    // Mobile optimizations
    optimizeForMobile() {
        const gameMain = document.querySelector('.game-main');
        if (gameMain) {
            gameMain.style.gridTemplateColumns = '1fr';
            gameMain.style.gridTemplateRows = 'auto auto 1fr';
            gameMain.style.gap = '0.5rem';
        }
        
        // Optimize sections for mobile
        this.optimizeSectionsForMobile();
        
        // Reduce animations on mobile
        this.reduceAnimationsForMobile();
        
        console.log('📱 Ottimizzazioni mobile applicate');
    }
    
    // Tablet optimizations
    optimizeForTablet() {
        const gameMain = document.querySelector('.game-main');
        if (gameMain) {
            gameMain.style.gridTemplateColumns = '250px 1fr 300px';
            gameMain.style.gridTemplateRows = '1fr';
            gameMain.style.gap = '1rem';
        }
        
        console.log('📱 Ottimizzazioni tablet applicate');
    }
    
    // Desktop optimizations
    optimizeForDesktop() {
        const gameMain = document.querySelector('.game-main');
        if (gameMain) {
            gameMain.style.gridTemplateColumns = '300px 1fr 350px';
            gameMain.style.gridTemplateRows = '1fr';
            gameMain.style.gap = '1rem';
        }
        
        console.log('🖥️ Ottimizzazioni desktop applicate');
    }
    
    // Optimize sections for mobile
    optimizeSectionsForMobile() {
        const sections = document.querySelectorAll('.dice-section, .map-section, .chat-section');
        
        sections.forEach((section, index) => {
            section.style.order = index + 1;
            
            if (section.classList.contains('map-section')) {
                section.style.minHeight = '300px';
            }
        });
    }
    
    // Reduce animations for mobile
    reduceAnimationsForMobile() {
        const root = document.documentElement;
        root.style.setProperty('--transition-fast', '0.1s ease');
        root.style.setProperty('--transition-normal', '0.2s ease');
        root.style.setProperty('--transition-slow', '0.3s ease');
    }
    
    // Setup resize observer for element-specific optimizations
    setupResizeObserver() {
        if (!window.ResizeObserver) return;
        
        this.resizeObserver = new ResizeObserver((entries) => {
            entries.forEach(entry => {
                this.optimizeElementSize(entry.target, entry.contentRect);
            });
        });
        
        // Observe critical elements
        const criticalElements = document.querySelectorAll(
            '.map-container, .chat-messages, .master-panel'
        );
        
        criticalElements.forEach(el => {
            if (el) this.resizeObserver.observe(el);
        });
    }
    
    // Setup mutation observer for dynamic content
    setupMutationObserver() {
        if (!window.MutationObserver) return;
        
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.optimizeNewElement(node);
                        }
                    });
                }
            });
        });
        
        // Observe document changes
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Optimize element size based on container
    optimizeElementSize(element, rect) {
        if (element.classList.contains('map-container')) {
            this.optimizeMapContainer(element, rect);
        } else if (element.classList.contains('chat-messages')) {
            this.optimizeChatMessages(element, rect);
        } else if (element.classList.contains('master-panel')) {
            this.optimizeMasterPanel(element, rect);
        }
    }
    
    // Optimize map container
    optimizeMapContainer(container, rect) {
        const aspectRatio = rect.width / rect.height;
        
        // Adjust map scaling based on container size
        if (aspectRatio > 2) {
            container.style.setProperty('--map-scale', '0.8');
        } else if (aspectRatio < 0.5) {
            container.style.setProperty('--map-scale', '1.2');
        } else {
            container.style.setProperty('--map-scale', '1');
        }
    }
    
    // Optimize chat messages
    optimizeChatMessages(chatContainer, rect) {
        const messages = chatContainer.querySelectorAll('.chat-message');
        
        // Limit visible messages based on container height
        const messageHeight = 60; // Approximate message height
        const maxVisibleMessages = Math.floor(rect.height / messageHeight);
        
        messages.forEach((message, index) => {
            if (index >= maxVisibleMessages) {
                message.style.display = 'none';
            } else {
                message.style.display = 'block';
            }
        });
    }
    
    // Optimize master panel
    optimizeMasterPanel(panel, rect) {
        const libraries = panel.querySelectorAll('.asset-library');
        const libraryWidth = 200;
        const maxColumns = Math.floor(rect.width / libraryWidth);
        
        const librariesContainer = panel.querySelector('.asset-libraries');
        if (librariesContainer) {
            librariesContainer.style.gridTemplateColumns = `repeat(${maxColumns}, 1fr)`;
        }
    }
    
    // Optimize new elements
    optimizeNewElement(element) {
        // Add performance optimizations to new elements
        if (element.classList.contains('token') || element.classList.contains('map-asset')) {
            element.style.willChange = 'transform';
            element.style.backfaceVisibility = 'hidden';
        }
        
        if (element.classList.contains('chat-message') || element.classList.contains('dice-result')) {
            element.style.contain = 'layout';
        }
        
        // Add intersection observer for new elements
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(element);
        }
    }
    
    // Optimize initial layout
    optimizeInitialLayout() {
        // Set initial CSS custom properties
        this.updateViewportVariables();
        
        // Apply initial breakpoint optimizations
        this.optimizeForBreakpoint(this.currentBreakpoint);
        
        // Optimize critical elements
        this.optimizeCriticalElements();
        
        console.log('📐 Layout iniziale ottimizzato');
    }
    
    // Optimize critical elements
    optimizeCriticalElements() {
        // Map container optimizations
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.contain = 'strict';
            mapContainer.style.willChange = 'transform';
        }
        
        // Chat optimizations
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            chatMessages.style.contain = 'layout';
            chatMessages.style.scrollBehavior = 'smooth';
        }
        
        // Dice results optimizations
        const diceResults = document.querySelector('.dice-results-content');
        if (diceResults) {
            diceResults.style.contain = 'layout';
            diceResults.style.scrollBehavior = 'smooth';
        }
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
    
    // Get layout metrics
    getLayoutMetrics() {
        return {
            breakpoint: this.currentBreakpoint,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            devicePixelRatio: window.devicePixelRatio,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
        };
    }
    
    // Cleanup
    cleanup() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        console.log('📐 Layout optimizer pulito');
    }
}

export default LayoutOptimizer;