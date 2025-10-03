// Map system management - FIXED: Perfect fit for all aspect ratios
import FirebaseHelper from './firebase.js?v.100';

export class MapSystem {
    constructor(authManager) {
        this.authManager = authManager;
        this.currentMap = null;
        this.localZoom = 1;
        this.localPanX = 0;
        this.localPanY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mapListener = null;
        this.minZoom = 1; // Minimum zoom is 100% (fit to container)
        this.maxZoom = 5;
        this.baseZoom = 1;
        this.panSmoothness = 0.1;
        this.isMapChanging = false;
        this.autoCenter = true;
        
        // FIXED: Map sizing constraints - always fit perfectly in viewport
        this.maxMapWidth = 800; // Maximum width
        this.maxMapHeight = 600; // Maximum height for viewport
        this.containerPadding = 20; // Padding around map
    }
    
    // Initialize map system
    init() {
        console.log('🗺️ Inizializzazione sistema mappa...');
        this.setupEventListeners();
        this.listenToMapChanges();
        this.updateAdminControls();
        
        // Setup resize observer for responsive map
        this.setupResizeObserver();
    }
    
    // Setup resize observer
    setupResizeObserver() {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer && window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                if (this.currentMap && this.autoCenter) {
                    this.calculateOptimalZoom();
                    this.centerMapInViewport();
                }
            });
            resizeObserver.observe(mapContainer);
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetZoomBtn = document.getElementById('resetZoomBtn');
        const mapViewport = document.getElementById('mapViewport');
        
        if (!mapViewport) {
            console.error('❌ Viewport mappa non trovato');
            return;
        }
        
        // Zoom controls
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => this.resetZoom());
        
        // Pan controls with improved smoothness
        mapViewport.addEventListener('mousedown', (e) => this.startPan(e));
        document.addEventListener('mousemove', (e) => this.handlePan(e));
        document.addEventListener('mouseup', () => this.endPan());
        
        // Touch support
        mapViewport.addEventListener('touchstart', (e) => this.startPan(e.touches[0]));
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handlePan(e.touches[0]);
        });
        document.addEventListener('touchend', () => this.endPan());
        
        // Wheel zoom
        mapViewport.addEventListener('wheel', (e) => this.handleWheel(e));
    }
    
    // Update admin controls visibility
    updateAdminControls() {
        const isMaster = this.authManager.isMaster();
        const adminElements = document.querySelectorAll('.admin-only');
        
        adminElements.forEach(element => {
            element.style.display = isMaster ? 'block' : 'none';
        });
    }
    
    // Listen to map changes
    listenToMapChanges() {
        const room = this.authManager.getCurrentRoom();
        if (!room) {
            console.error('❌ Nessuna stanza per ascoltare mappa');
            return;
        }
        
        this.mapListener = FirebaseHelper.listenToData(`rooms/${room}/map`, (snapshot) => {
            this.handleMapUpdate(snapshot);
        });
    }
    
    // FIXED: Handle map update with perfect fitting for all aspect ratios
    handleMapUpdate(snapshot) {
        if (this.isMapChanging) {
            console.log('⏳ Cambio mappa già in corso, ignorando aggiornamento');
            return;
        }
        
        try {
            const mapData = snapshot.val();
            const mapImage = document.getElementById('mapImage');
            const noMapDiv = document.querySelector('.no-map');
            
            if (!mapImage || !noMapDiv) {
                console.error('❌ Elementi mappa non trovati');
                return;
            }
            
            if (mapData && mapData.url !== this.currentMap?.url) {
                this.isMapChanging = true;
                this.currentMap = mapData;
                this.autoCenter = true;

                // Validate URL before loading
                if (!mapData.url || mapData.url.trim() === '') {
                    console.error('❌ URL mappa non valido o vuoto');
                    mapImage.style.display = 'none';
                    noMapDiv.style.display = 'block';
                    this.isMapChanging = false;
                    return;
                }

                // Preload image for faster display
                const img = new Image();
                img.onload = () => {
                    // Show map image immediately
                    mapImage.src = mapData.url;
                    mapImage.style.display = 'block';
                    noMapDiv.style.display = 'none';

                    // FIXED: Sincronizza dimensioni dei layer con immagine mappa
                    this.syncLayerDimensions();

                    // Wait for image to be rendered, then calculate and apply transforms
                    setTimeout(() => {
                        try {
                            this.calculateOptimalZoom();
                            this.centerMapInViewport();
                        } catch (error) {
                            console.error('❌ Errore durante calcolo zoom/centratura:', error);
                        } finally {
                            this.isMapChanging = false;
                        }
                    }, 100);
                };

                img.onerror = (error) => {
                    console.error('❌ Errore caricamento immagine mappa');
                    console.error('URL mappa:', mapData.url);
                    console.error('Dettagli errore:', error);
                    console.warn('⚠️ Verifica che il file esista e sia accessibile');
                    mapImage.style.display = 'none';
                    noMapDiv.style.display = 'block';
                    this.isMapChanging = false;
                };
                
                img.src = mapData.url;
                
            } else if (!mapData) {
                this.currentMap = null;
                mapImage.style.display = 'none';
                noMapDiv.style.display = 'block';
                this.resetZoom();
                this.isMapChanging = false;
            }
            
        } catch (error) {
            console.error('❌ Errore aggiornamento mappa:', error);
            this.isMapChanging = false;
        }
    }
    
    // FIXED: Calculate optimal zoom to fit perfectly in viewport (no cropping)
    calculateOptimalZoom() {
        const mapImage = document.getElementById('mapImage');
        const mapViewport = document.getElementById('mapViewport');
        
        if (!mapImage || !this.currentMap || !mapViewport) {
            this.baseZoom = 1;
            this.minZoom = 1;
            return;
        }
        
        // Wait for image to load completely
        if (mapImage.naturalWidth === 0 || mapImage.naturalHeight === 0) {
            setTimeout(() => this.calculateOptimalZoom(), 50);
            return;
        }
        
        const imageNaturalWidth = mapImage.naturalWidth;
        const imageNaturalHeight = mapImage.naturalHeight;
        
        // Get viewport dimensions
        const viewportRect = mapViewport.getBoundingClientRect();
        const availableWidth = viewportRect.width - (this.containerPadding * 2);
        const availableHeight = viewportRect.height - (this.containerPadding * 2);
        
        // FIXED: Calculate zoom to fit ENTIRELY in viewport (no cropping)
        const scaleX = availableWidth / imageNaturalWidth;
        const scaleY = availableHeight / imageNaturalHeight;
        
        // Use the SMALLER scale to ensure the entire image fits
        this.baseZoom = Math.min(scaleX, scaleY);
        
        // Ensure minimum zoom is not too small
        this.baseZoom = Math.max(0.1, this.baseZoom);
        
        // Set minimum zoom to the calculated base zoom
        this.minZoom = this.baseZoom;
        
        const finalWidth = imageNaturalWidth * this.baseZoom;
        const finalHeight = imageNaturalHeight * this.baseZoom;
    }
    
    // FIXED: Perfect centering in viewport with complete fit
    centerMapInViewport() {
        if (!this.currentMap) return;
        
        const mapViewport = document.getElementById('mapViewport');
        const mapImage = document.getElementById('mapImage');
        
        if (!mapViewport || !mapImage) return;
        
        // Wait for image to be fully loaded
        if (mapImage.naturalWidth === 0 || mapImage.naturalHeight === 0) {
            setTimeout(() => this.centerMapInViewport(), 50);
            return;
        }
        
        // Set zoom to optimal size (perfect fit)
        this.localZoom = this.baseZoom;
        
        // Get viewport dimensions
        const viewportRect = mapViewport.getBoundingClientRect();
        const viewportWidth = viewportRect.width;
        const viewportHeight = viewportRect.height;
        
        // Calculate scaled map dimensions
        const scaledWidth = mapImage.naturalWidth * this.localZoom;
        const scaledHeight = mapImage.naturalHeight * this.localZoom;
        
        // FIXED: Perfect centering calculation for any aspect ratio
        this.localPanX = (viewportWidth - scaledWidth) / 2;
        this.localPanY = (viewportHeight - scaledHeight) / 2;
        
        // Apply the transform
        this.updateMapTransform();
    }

    // FIXED: Sincronizza dimensioni layer con immagine mappa
    syncLayerDimensions() {
        const mapImage = document.getElementById('mapImage');
        const tokensLayer = document.getElementById('tokensLayer');
        const assetsLayer = document.getElementById('assetsLayer');
        const mapCanvas = document.getElementById('mapCanvas');

        if (!mapImage || !tokensLayer || !assetsLayer || !mapCanvas) {
            console.error('❌ Elementi per sincronizzazione layer non trovati');
            return;
        }

        // Wait for image to be fully loaded
        if (mapImage.naturalWidth === 0 || mapImage.naturalHeight === 0) {
            setTimeout(() => this.syncLayerDimensions(), 50);
            return;
        }

        const naturalWidth = mapImage.naturalWidth;
        const naturalHeight = mapImage.naturalHeight;

        // Set canvas dimensions to match image natural size
        mapCanvas.style.width = `${naturalWidth}px`;
        mapCanvas.style.height = `${naturalHeight}px`;

        // Set layer dimensions to match image natural size
        tokensLayer.style.width = `${naturalWidth}px`;
        tokensLayer.style.height = `${naturalHeight}px`;
        assetsLayer.style.width = `${naturalWidth}px`;
        assetsLayer.style.height = `${naturalHeight}px`;

        console.log('✅ Layer sincronizzati con mappa:', naturalWidth, 'x', naturalHeight);
    }

    // Zoom in (local only)
    zoomIn() {
        this.autoCenter = false;
        this.localZoom = Math.min(this.maxZoom, this.localZoom * 1.2);
        this.updateMapTransform();
    }
    
    // Zoom out (local only) - FIXED: Cannot go below optimal size
    zoomOut() {
        this.autoCenter = false;
        this.localZoom = Math.max(this.minZoom, this.localZoom / 1.2);
        this.updateMapTransform();
    }
    
    // FIXED: Reset zoom - always return to centered perfect fit
    resetZoom() {
        this.autoCenter = true;
        if (this.currentMap) {
            this.calculateOptimalZoom();
            this.centerMapInViewport();
        } else {
            this.localZoom = 1;
            this.localPanX = 0;
            this.localPanY = 0;
            this.updateMapTransform();
        }
    }
    
    // Handle wheel zoom (local only) - FIXED: Respect optimal minimum
    handleWheel(event) {
        event.preventDefault();
        
        this.autoCenter = false;
        
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.localZoom * delta));
        
        if (newZoom !== this.localZoom) {
            // Zoom towards mouse position
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Calculate zoom center offset
            const zoomFactor = newZoom / this.localZoom;
            this.localPanX = mouseX - (mouseX - this.localPanX) * zoomFactor;
            this.localPanY = mouseY - (mouseY - this.localPanY) * zoomFactor;
            
            this.localZoom = newZoom;
            this.updateMapTransform();
        }
    }
    
    // Start pan (local only)
    startPan(event) {
        this.autoCenter = false;
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        const mapViewport = document.getElementById('mapViewport');
        if (mapViewport) {
            mapViewport.style.cursor = 'grabbing';
            mapViewport.style.transition = 'none';
        }
    }
    
    // Handle pan (local only, improved smoothness)
    handlePan(event) {
        if (!this.isDragging) return;
        
        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;
        
        // Apply smoothness factor for fluid movement
        this.localPanX += deltaX;
        this.localPanY += deltaY;
        
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        this.updateMapTransform();
    }
    
    // End pan (local only)
    endPan() {
        if (this.isDragging) {
            this.isDragging = false;
            
            const mapViewport = document.getElementById('mapViewport');
            if (mapViewport) {
                mapViewport.style.cursor = 'grab';
                mapViewport.style.transition = 'transform 0.1s ease-out';
            }
        }
    }
    
    // Update map transform (local only)
    updateMapTransform() {
        const mapCanvas = document.getElementById('mapCanvas');
        if (mapCanvas) {
            mapCanvas.style.transform = `translate(${this.localPanX}px, ${this.localPanY}px) scale(${this.localZoom})`;
            mapCanvas.style.transformOrigin = '0 0';
        }
    }
    
    // Get current map data
    getCurrentMap() {
        return this.currentMap;
    }
    
    // Get map bounds for token positioning
    getMapBounds() {
        const mapImage = document.getElementById('mapImage');
        const mapViewport = document.getElementById('mapViewport');

        if (!mapImage || !mapViewport || !this.currentMap) return null;

        const viewportRect = mapViewport.getBoundingClientRect();

        return {
            left: viewportRect.left + this.localPanX,
            top: viewportRect.top + this.localPanY,
            width: mapImage.naturalWidth * this.localZoom,
            height: mapImage.naturalHeight * this.localZoom,
            zoom: this.localZoom,
            panX: this.localPanX,
            panY: this.localPanY,
            viewportLeft: viewportRect.left,
            viewportTop: viewportRect.top
        };
    }
    
    // Convert screen coordinates to map coordinates (image pixels)
    screenToMapCoords(screenX, screenY) {
        const mapBounds = this.getMapBounds();
        if (!mapBounds) return { x: 0, y: 0 };

        // Convert screen coordinates to map image pixel coordinates
        const mapX = (screenX - mapBounds.viewportLeft - this.localPanX) / this.localZoom;
        const mapY = (screenY - mapBounds.viewportTop - this.localPanY) / this.localZoom;

        return { x: mapX, y: mapY };
    }
    
    // Convert map coordinates (image pixels) to screen coordinates
    mapToScreenCoords(mapX, mapY) {
        const mapBounds = this.getMapBounds();
        if (!mapBounds) return { x: 0, y: 0 };

        const screenX = mapX * this.localZoom + this.localPanX + mapBounds.viewportLeft;
        const screenY = mapY * this.localZoom + this.localPanY + mapBounds.viewportTop;

        return { x: screenX, y: screenY };
    }
    
    // Cleanup
    cleanup() {
        if (this.mapListener) {
            FirebaseHelper.stopListening(this.mapListener);
            this.mapListener = null;
        }
    }
}

export default MapSystem;