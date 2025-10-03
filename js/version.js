// Version management system - FIXED: Aggressive cache prevention
export const AppVersion = {
    version: 'v.100', // Updated version
    buildDate: new Date().toISOString(),
    buildNumber: Date.now(),
    versionParam: 'v.100', // Updated version parameter
    isInitialized: false,
    
    // Get version string for cache busting
    getVersionString() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${this.versionParam}&build=${this.buildNumber}&t=${timestamp}&r=${random}&nocache=true&bust=${timestamp}&force=${Date.now()}`;
    },
    
    // Get version for display
    getDisplayVersion() {
        return `${this.version}`;
    },
    
    // Get build info
    getBuildInfo() {
        return {
            version: this.version,
            buildDate: this.buildDate,
            buildNumber: this.buildNumber,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    },
    
    // FIXED: More aggressive version checking
    checkVersion() {
        if (this.isInitialized) {
            return false;
        }
        
        const storedVersion = localStorage.getItem('tavernaVersion');
        const storedBuild = localStorage.getItem('tavernaBuild');
        
        const versionChanged = storedVersion !== this.version;
        const buildChanged = storedBuild !== this.buildNumber.toString();
        const isReloadCycle = sessionStorage.getItem('tavernaReloading') === 'true';
        
        if ((versionChanged || buildChanged) && !isReloadCycle) {
            sessionStorage.setItem('tavernaReloading', 'true');
            localStorage.setItem('tavernaVersion', this.version);
            localStorage.setItem('tavernaBuild', this.buildNumber.toString());
            
            // FIXED: Immediate aggressive cache clear and reload
            this.clearAllCaches().then(() => {
                this.forceReload();
            });
            
            return true;
        }
        
        sessionStorage.removeItem('tavernaReloading');
        return false;
    },
    
    // FIXED: More aggressive cache clearing
    async clearAllCaches() {
        try {
            // Clear all browser caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }
            
            // Clear application cache
            if (window.applicationCache) {
                try {
                    window.applicationCache.update();
                    window.applicationCache.swapCache();
                } catch (e) {
                    console.warn('⚠️ Application cache clear failed:', e);
                }
            }
            
            // Clear IndexedDB
            if ('indexedDB' in window) {
                try {
                    const databases = await indexedDB.databases();
                    await Promise.all(
                        databases.map(db => {
                            return new Promise((resolve) => {
                                const deleteReq = indexedDB.deleteDatabase(db.name);
                                deleteReq.onsuccess = () => resolve();
                                deleteReq.onerror = () => resolve();
                                deleteReq.onblocked = () => resolve();
                            });
                        })
                    );
                } catch (e) {
                    console.warn('⚠️ IndexedDB clear failed:', e);
                }
            }
            
            // Clear session storage (except reload flag)
            const reloadFlag = sessionStorage.getItem('tavernaReloading');
            sessionStorage.clear();
            if (reloadFlag) {
                sessionStorage.setItem('tavernaReloading', reloadFlag);
            }
            
        } catch (error) {
            console.error('❌ ERRORE pulizia cache:', error);
        }
    },
    
    // FIXED: More aggressive force reload
    forceReload() {
        try {
            // Preserve only session data
            const sessionData = localStorage.getItem('tavernaSession');
            
            // Clear everything
            localStorage.clear();
            
            // Restore session if exists
            if (sessionData) {
                localStorage.setItem('tavernaSession', sessionData);
            }
            
            // Set new version info
            localStorage.setItem('tavernaVersion', this.version);
            localStorage.setItem('tavernaBuild', this.buildNumber.toString());
            
            // Create completely new URL with aggressive cache busting
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set('v', this.versionParam);
            url.searchParams.set('build', this.buildNumber);
            url.searchParams.set('t', Date.now());
            url.searchParams.set('r', Math.random().toString(36).substr(2, 9));
            url.searchParams.set('nocache', 'true');
            url.searchParams.set('bust', Date.now());
            url.searchParams.set('reload', 'force');
            url.searchParams.set('clear', 'all');
            url.searchParams.set('fresh', Date.now());
            
            // Use replace to avoid back button issues
            window.location.replace(url.toString());
            
        } catch (error) {
            console.error('❌ ERRORE durante force reload:', error);
            // Fallback to hard reload
            window.location.reload(true);
        }
    },
    
    // FIXED: More aggressive URL versioning
    addVersionToUrl(url) {
        if (!url) return url;
        
        const separator = url.includes('?') ? '&' : '?';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${url}${separator}${this.getVersionString()}&fresh=${timestamp}&rnd=${random}`;
    },
    
    // Update all version references in DOM
    updateVersionReferences() {
        const versionText = document.getElementById('versionText');
        if (versionText) {
            versionText.textContent = this.getDisplayVersion();
        }
        
        if (!sessionStorage.getItem('tavernaReloading')) {
            this.updateResourceVersions();
        }
    },
    
    // FIXED: More aggressive resource version updates
    updateResourceVersions() {
        try {
            // Update CSS files
            const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
            cssLinks.forEach(link => {
                if (link.href && !link.href.includes(this.versionParam)) {
                    const baseUrl = link.href.split('?')[0];
                    const newHref = this.addVersionToUrl(baseUrl);
                    link.href = newHref;
                }
            });
            
            // Update script files
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                if (script.src && script.src.includes('.js') && !script.src.includes(this.versionParam)) {
                    const baseUrl = script.src.split('?')[0];
                    const newSrc = this.addVersionToUrl(baseUrl);
                    script.src = newSrc;
                }
            });
            
            this.updateCacheControlMeta();
            
        } catch (error) {
            console.error('❌ ERRORE aggiornamento risorse:', error);
        }
    },
    
    // FIXED: More aggressive cache control meta tags
    updateCacheControlMeta() {
        try {
            // Remove all existing cache control metas
            const existingMetas = document.querySelectorAll('meta[http-equiv*="Cache"], meta[http-equiv*="Pragma"], meta[http-equiv*="Expires"], meta[name="version"], meta[name="build"]');
            existingMetas.forEach(meta => meta.remove());
            
            // Add aggressive cache control
            const metaTags = [
                { httpEquiv: 'Cache-Control', content: `no-cache, no-store, must-revalidate, max-age=0, version=${this.version}, build=${this.buildNumber}` },
                { httpEquiv: 'Pragma', content: `no-cache, version=${this.version}` },
                { httpEquiv: 'Expires', content: '0' },
                { name: 'version', content: this.version },
                { name: 'build', content: this.buildNumber.toString() }
            ];
            
            metaTags.forEach(tag => {
                const meta = document.createElement('meta');
                if (tag.httpEquiv) {
                    meta.httpEquiv = tag.httpEquiv;
                } else {
                    meta.name = tag.name;
                }
                meta.content = tag.content;
                document.head.appendChild(meta);
            });
            
        } catch (error) {
            console.error('❌ ERRORE aggiornamento meta tags:', error);
        }
    },
    
    // Initialize version system
    init() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            this.isInitialized = true;
            this.updateVersionReferences();
            
            if (this.checkVersion()) {
                return;
            }
            
            this.disableCache();
            
        } catch (error) {
            console.error('❌ ERRORE inizializzazione versioning:', error);
            this.isInitialized = false;
        }
    },
    
    // FIXED: More aggressive cache disabling
    disableCache() {
        try {
            this.updateCacheControlMeta();
            
            // Override fetch with aggressive cache busting
            if (!window.originalFetch) {
                window.originalFetch = window.fetch;
                
                window.fetch = function(url, options = {}) {
                    if (typeof url === 'string') {
                        if (url.includes('.php') || url.includes('.js') || url.includes('.css')) {
                            url = AppVersion.addVersionToUrl(url);
                        }
                    }
                    
                    options.cache = 'no-store';
                    options.headers = {
                        ...options.headers,
                        'Cache-Control': `no-cache, no-store, must-revalidate, max-age=0, version=${AppVersion.version}`,
                        'Pragma': `no-cache, version=${AppVersion.version}`,
                        'Expires': '0',
                        'X-Version': AppVersion.version,
                        'X-Build': AppVersion.buildNumber,
                        'X-Timestamp': Date.now(),
                        'X-Random': Math.random().toString(36).substr(2, 9)
                    };
                    
                    return window.originalFetch(url, options);
                };
            }
            
            // Override XMLHttpRequest with aggressive cache busting
            if (!window.originalXMLHttpRequest) {
                window.originalXMLHttpRequest = window.XMLHttpRequest;
                
                window.XMLHttpRequest = function() {
                    const xhr = new window.originalXMLHttpRequest();
                    const originalOpen = xhr.open;
                    
                    xhr.open = function(method, url, ...args) {
                        if (typeof url === 'string' && (url.includes('.php') || url.includes('.js') || url.includes('.css'))) {
                            url = AppVersion.addVersionToUrl(url);
                        }
                        
                        const result = originalOpen.call(this, method, url, ...args);
                        
                        // Set aggressive cache headers
                        xhr.setRequestHeader('Cache-Control', `no-cache, no-store, must-revalidate, version=${AppVersion.version}`);
                        xhr.setRequestHeader('Pragma', `no-cache, version=${AppVersion.version}`);
                        xhr.setRequestHeader('Expires', '0');
                        xhr.setRequestHeader('X-Version', AppVersion.version);
                        xhr.setRequestHeader('X-Build', AppVersion.buildNumber);
                        
                        return result;
                    };
                    
                    return xhr;
                };
            }
            
        } catch (error) {
            console.error('❌ ERRORE disabilitazione cache:', error);
        }
    },
    
    // Manual version check and reload
    checkAndReload() {
        if (confirm('Controllare per aggiornamenti e ricaricare l\'applicazione? Eventuali dati non salvati andranno persi.')) {
            sessionStorage.removeItem('tavernaReloading');
            
            this.clearAllCaches().then(() => {
                this.forceReload();
            });
        }
    }
};

// FIXED: Initialize cache disabling immediately and aggressively
if (!window.versionSystemLoaded) {
    AppVersion.disableCache();
    window.versionSystemLoaded = true;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!AppVersion.isInitialized) {
            AppVersion.init();
        }
    });
} else {
    if (!AppVersion.isInitialized) {
        AppVersion.init();
    }
}

export default AppVersion;