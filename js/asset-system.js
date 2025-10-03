// Asset system management - FIXED ultra-fluid movement with NO CONSTRAINTS and FIXED scaling
import FirebaseHelper from './firebase.js?v.100';
import { modalSystem } from './modal-system.js?v.100';

export class AssetSystem {
    constructor(authManager, mapSystem) {
        this.authManager = authManager;
        this.mapSystem = mapSystem;
        this.activeAssets = new Map(); // Assets on map
        this.assetsListener = null;
        this.selectedAsset = null;
        this.isFollowingMouse = false;
        this.allowPlayerMovement = false;
        this.assetColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
        ];
        
        // FIXED: Ultra-fluid drag system with NO CONSTRAINTS
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.assetStartPos = { x: 0, y: 0 };
        this.dragThreshold = 2;
        this.hasMoved = false;
        this.animationFrame = null;
        this.lastUpdateTime = 0;
        this.updateThrottle = 8;
        
        // Enhanced mouse/touch tracking
        this.currentPointer = { x: 0, y: 0 };
        this.pointerType = 'mouse';
        this.isPointerDown = false;
        this.smoothingFactor = 0.8;
        this.targetPosition = { x: 0, y: 0 };
        this.currentPosition = { x: 0, y: 0 };
        
        // FIXED: Scaling system
        this.isScaling = false;
        this.scaleStartValue = 1;
        this.scaleStartY = 0;
        this.scaleStartX = 0;

        // Firebase batch updates
        this.batchUpdateDelay = 100;
        this.pendingUpdates = new Map();
        this.batchTimer = null;
    }
    
    // Initialize asset system
    init() {
        console.log('🖼️ Inizializzazione sistema asset...');
        this.setupEventListeners();
        this.listenToActiveAssets();
        this.updateAdminControls();
        this.startSmoothUpdateLoop();
    }
    
    // FIXED: Start smooth update loop for ultra-fluid movement
    startSmoothUpdateLoop() {
        const updateLoop = () => {
            if (this.isDragging && this.selectedAsset) {
                this.updateAssetPositionSmooth();
            }
            this.animationFrame = requestAnimationFrame(updateLoop);
        };
        updateLoop();
    }
    
    // Setup event listeners with ultra-fluid movement
    setupEventListeners() {
        const assetsLayer = document.getElementById('assetsLayer');
        const mapViewport = document.getElementById('mapViewport');
        
        if (!assetsLayer || !mapViewport) {
            console.error('❌ Elementi assets layer o map viewport non trovati');
            return;
        }
        
        // FIXED: Enhanced asset interactions with better precision
        assetsLayer.addEventListener('mousedown', (e) => this.handleAssetPointerDown(e, 'mouse'), { passive: false });
        assetsLayer.addEventListener('touchstart', (e) => this.handleAssetPointerDown(e, 'touch'), { passive: false });
        
        // FIXED: Global pointer events for ultra-smooth dragging
        document.addEventListener('mousemove', (e) => this.handleGlobalPointerMove(e, 'mouse'), { passive: false });
        document.addEventListener('mouseup', (e) => this.handleGlobalPointerUp(e, 'mouse'), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleGlobalPointerMove(e, 'touch'), { passive: false });
        document.addEventListener('touchend', (e) => this.handleGlobalPointerUp(e, 'touch'), { passive: false });
        
        // Map click to place following asset
        mapViewport.addEventListener('click', (e) => this.handleMapClick(e));
        
        // Escape to cancel asset following
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && (this.isFollowingMouse || this.isDragging)) {
                this.cancelAssetFollow();
            }
        });
        
        console.log('✅ Event listeners asset configurati con movimento ultra-fluido');
    }
    
    // FIXED: Handle asset pointer down with improved precision and scaling detection
    handleAssetPointerDown(event, pointerType) {
        const assetElement = event.target.closest('.map-asset');
        if (!assetElement || assetElement.classList.contains('following-asset')) return;
        if (!this.canMoveAsset()) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const assetId = assetElement.dataset.assetId;
        const assetData = this.activeAssets.get(assetId);
        if (!assetData) {
            console.warn('⚠️ Asset data non trovato per ID:', assetId);
            return;
        }
        
        // FIXED: Check if clicking on scale handle
        if (event.target.classList.contains('scale-handle')) {
            const pointer = this.getPointerPosition(event, pointerType);
            if (pointer) {
                this.startAssetScale(assetId, assetElement, pointer);
            }
            return;
        }
        
        // Get pointer position
        const pointer = this.getPointerPosition(event, pointerType);
        if (!pointer) return;
        
        // Store initial positions
        this.dragStartPos = { x: pointer.x, y: pointer.y };
        this.assetStartPos = { x: assetData.x || 0, y: assetData.y || 0 };
        this.currentPointer = { x: pointer.x, y: pointer.y };
        this.targetPosition = { x: pointer.x, y: pointer.y };
        this.currentPosition = { x: pointer.x, y: pointer.y };
        this.pointerType = pointerType;
        this.isPointerDown = true;
        
        // Set selected asset
        this.selectedAsset = assetData;
        this.hasMoved = false;
        this.isDragging = false;
        
        console.log('🎯 Asset selezionato:', assetId, 'posizione iniziale:', this.assetStartPos);
    }
    
    // Get unified pointer position
    getPointerPosition(event, pointerType) {
        try {
            if (pointerType === 'touch') {
                if (event.touches && event.touches.length > 0) {
                    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
                } else if (event.changedTouches && event.changedTouches.length > 0) {
                    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
                }
                return null;
            } else {
                return { x: event.clientX, y: event.clientY };
            }
        } catch (error) {
            console.error('❌ Errore ottenimento posizione pointer:', error);
            return null;
        }
    }
    
    // FIXED: Handle global pointer move with ultra-smooth interpolation and scaling
    handleGlobalPointerMove(event, pointerType) {
        if (!this.selectedAsset || !this.isPointerDown) return;
        
        // Handle following mouse mode
        if (this.isFollowingMouse) {
            const pointer = this.getPointerPosition(event, pointerType);
            if (pointer) {
                this.updateFollowingAssetPosition(pointer.x, pointer.y);
            }
            return;
        }
        
        // Only process if this is the same pointer type that started the interaction
        if (pointerType !== this.pointerType) return;
        
        const pointer = this.getPointerPosition(event, pointerType);
        if (!pointer) return;
        
        // FIXED: Handle scaling
        if (this.isScaling) {
            this.updateAssetScale(pointer);
            return;
        }
        
        // Update target position for smooth interpolation
        this.targetPosition = { x: pointer.x, y: pointer.y };
        
        // Check if we should start dragging
        if (!this.isDragging && this.selectedAsset) {
            const deltaX = pointer.x - this.dragStartPos.x;
            const deltaY = pointer.y - this.dragStartPos.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > this.dragThreshold) {
                this.startAssetDrag();
            }
        }
        
        // Prevent default for touch to avoid scrolling
        if (pointerType === 'touch' && (this.isDragging || this.isScaling)) {
            event.preventDefault();
        }
    }
    
    // Start asset drag with enhanced visual feedback
    startAssetDrag() {
        if (!this.selectedAsset || this.isDragging) return;
        
        const assetElement = document.querySelector(`[data-asset-id="${this.selectedAsset.id}"]`);
        if (!assetElement) {
            console.error('❌ Elemento asset non trovato per drag:', this.selectedAsset.id);
            return;
        }
        
        this.isDragging = true;
        this.hasMoved = true;
        
        // Enhanced visual feedback
        assetElement.classList.add('dragging');
        assetElement.style.zIndex = '300';
        assetElement.style.transition = 'none';
        assetElement.style.cursor = 'grabbing';
        assetElement.style.transform = assetElement.style.transform.replace(/scale\([^)]*\)/, '') + ' scale(1.1)';
        assetElement.style.filter = 'brightness(1.2) drop-shadow(0 8px 16px rgba(0,0,0,0.4))';
        assetElement.style.willChange = 'transform, left, top';
        
        // Add visual feedback to other assets
        document.querySelectorAll('.map-asset').forEach(asset => {
            if (asset !== assetElement) {
                asset.style.opacity = '0.5';
                asset.style.filter = 'grayscale(0.5)';
            }
        });
        
        console.log('🖼️ Inizio trascinamento ultra-fluido asset:', this.selectedAsset.id);
    }
    
    // FIXED: Start asset scale with proper initialization
    startAssetScale(assetId, assetElement, pointer) {
        const assetData = this.activeAssets.get(assetId);
        if (!assetData) return;
        
        this.selectedAsset = assetData;
        this.isScaling = true;
        this.scaleStartValue = assetData.scale || 1;
        this.scaleStartX = pointer.x;
        this.scaleStartY = pointer.y;
        
        // Visual feedback
        assetElement.classList.add('scaling');
        assetElement.style.cursor = 'nw-resize';
        assetElement.style.zIndex = '300';
        assetElement.style.transition = 'none';
        
        console.log('📏 Inizio scaling asset:', assetId, 'scala iniziale:', this.scaleStartValue);
    }
    
    // FIXED: Update asset position with NO CONSTRAINTS - completely free movement
    updateAssetPositionSmooth() {
        if (!this.selectedAsset || !this.isDragging) return;
        
        const assetElement = document.querySelector(`[data-asset-id="${this.selectedAsset.id}"]`);
        if (!assetElement) return;
        
        try {
            // Smooth interpolation between current and target position
            this.currentPosition.x += (this.targetPosition.x - this.currentPosition.x) * this.smoothingFactor;
            this.currentPosition.y += (this.targetPosition.y - this.currentPosition.y) * this.smoothingFactor;
            
            // Calculate movement delta from start position with smooth interpolation
            const deltaX = this.currentPosition.x - this.dragStartPos.x;
            const deltaY = this.currentPosition.y - this.dragStartPos.y;
            
            // Calculate new position based on asset's original position + delta
            const newX = this.assetStartPos.x + deltaX;
            const newY = this.assetStartPos.y + deltaY;
            
            // FIXED: NO CONSTRAINTS - completely free movement
            // Apply position with hardware acceleration - NO BOUNDS CHECKING
            assetElement.style.left = newX + 'px';
            assetElement.style.top = newY + 'px';
            assetElement.style.transform = assetElement.style.transform.replace(/translate3d\([^)]*\)/, '') + ' translate3d(0, 0, 0)';
            
        } catch (error) {
            console.error('❌ Errore aggiornamento posizione asset:', error);
        }
    }
    
    // FIXED: Update asset scale with proper calculation
    updateAssetScale(pointer) {
        if (!this.selectedAsset || !this.isScaling) return;
        
        const assetElement = document.querySelector(`[data-asset-id="${this.selectedAsset.id}"]`);
        if (!assetElement) return;
        
        try {
            // Calculate scale change based on mouse movement (diagonal movement for more intuitive scaling)
            const deltaX = pointer.x - this.scaleStartX;
            const deltaY = pointer.y - this.scaleStartY;
            
            // Use the average of X and Y movement for scaling
            const avgDelta = (deltaX + deltaY) / 2;
            const scaleChange = avgDelta / 100; // 100px = 1.0 scale change
            const newScale = Math.max(0.1, Math.min(5, this.scaleStartValue + scaleChange));
            
            // Update visual scale immediately
            const baseSize = 100;
            const newSize = baseSize * newScale;
            assetElement.style.width = newSize + 'px';
            assetElement.style.height = newSize + 'px';
            
            // Update scale handle position
            const scaleHandle = assetElement.querySelector('.scale-handle');
            if (scaleHandle) {
                scaleHandle.style.right = '-10px';
                scaleHandle.style.bottom = '-10px';
            }
            
            console.log('📏 Scaling asset:', this.selectedAsset.id, 'nuova scala:', newScale);
            
        } catch (error) {
            console.error('❌ Errore scaling asset:', error);
        }
    }
    
    // Handle global pointer up
    handleGlobalPointerUp(event, pointerType) {
        if (!this.selectedAsset || !this.isPointerDown) return;
        
        // Only process if this is the same pointer type that started the interaction
        if (pointerType !== this.pointerType) return;
        
        this.isPointerDown = false;
        
        if (this.isDragging) {
            this.finishAssetDrag();
        } else if (this.isScaling) {
            this.finishAssetScale();
        } else {
            // Just a click/tap, not a drag
            this.selectedAsset = null;
        }
    }
    
    // FIXED: Finish asset drag with improved cleanup and performance
    async finishAssetDrag() {
        if (!this.selectedAsset || !this.isDragging) return;
        
        const assetElement = document.querySelector(`[data-asset-id="${this.selectedAsset.id}"]`);
        if (!assetElement) {
            console.error('❌ Elemento asset non trovato per finish drag:', this.selectedAsset.id);
            this.resetDragState();
            return;
        }
        
        try {
            // Get final position - NO CONSTRAINTS
            const finalX = parseFloat(assetElement.style.left) || 0;
            const finalY = parseFloat(assetElement.style.top) || 0;
            
            console.log('🖼️ Posizione finale asset (libera):', this.selectedAsset.id, { x: finalX, y: finalY });
            
            // Clean up visual feedback
            this.cleanupDragVisuals(assetElement);
            
            // Save position to Firebase only if actually moved
            if (this.hasMoved) {
                await this.saveAssetPosition(finalX, finalY);
            }
            
        } catch (error) {
            console.error('❌ Errore completamento drag asset:', error);
        } finally {
            this.resetDragState();
        }
    }
    
    // FIXED: Finish asset scale with proper calculation and save
    async finishAssetScale() {
        if (!this.selectedAsset || !this.isScaling) return;
        
        const assetElement = document.querySelector(`[data-asset-id="${this.selectedAsset.id}"]`);
        if (!assetElement) {
            this.resetDragState();
            return;
        }
        
        try {
            // Calculate final scale from element size
            const currentWidth = parseInt(assetElement.style.width) || 100;
            const finalScale = currentWidth / 100; // Base size is 100px
            
            console.log('📏 Scala finale asset:', this.selectedAsset.id, finalScale);
            
            // Clean up visual feedback
            assetElement.classList.remove('scaling');
            assetElement.style.cursor = this.canMoveAsset() ? 'pointer' : 'default';
            assetElement.style.zIndex = '100';
            assetElement.style.transition = 'transform 0.3s ease';
            
            // Save scale to Firebase
            await this.saveAssetScale(finalScale);
            
        } catch (error) {
            console.error('❌ Errore completamento scaling asset:', error);
        } finally {
            this.resetDragState();
        }
    }
    
    // FIXED: Clean up drag visuals with improved performance
    cleanupDragVisuals(assetElement) {
        try {
            // Reset dragging asset
            assetElement.classList.remove('dragging');
            assetElement.style.zIndex = '100';
            assetElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, filter 0.3s ease';
            assetElement.style.cursor = this.canMoveAsset() ? 'pointer' : 'default';
            assetElement.style.willChange = 'auto';
            
            // Reset scale and filter with smooth transition
            const currentTransform = assetElement.style.transform;
            assetElement.style.transform = currentTransform.replace(/scale\([^)]*\)/g, '').replace(/translate3d\([^)]*\)/g, '').trim();
            assetElement.style.filter = '';
            
            // Restore other assets with smooth transition
            document.querySelectorAll('.map-asset').forEach(asset => {
                asset.style.opacity = '1';
                asset.style.filter = '';
                asset.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
            });
            
        } catch (error) {
            console.error('❌ Errore cleanup visuals drag:', error);
        }
    }
    
    // Queue position update for batching
    queuePositionUpdate(assetId, x, y) {
        this.pendingUpdates.set(assetId, { x, y });

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        this.batchTimer = setTimeout(() => {
            this.flushPendingUpdates();
        }, this.batchUpdateDelay);
    }

    // Flush all pending updates to Firebase
    async flushPendingUpdates() {
        if (this.pendingUpdates.size === 0) return;

        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();

        if (!room || !user) return;

        const updates = {};
        const timestamp = FirebaseHelper.getTimestamp();

        for (const [assetId, position] of this.pendingUpdates) {
            updates[`rooms/${room}/assets/${assetId}/x`] = position.x;
            updates[`rooms/${room}/assets/${assetId}/y`] = position.y;
            updates[`rooms/${room}/assets/${assetId}/lastMoved`] = timestamp;
            updates[`rooms/${room}/assets/${assetId}/movedBy`] = user.name;
        }

        this.pendingUpdates.clear();

        try {
            await FirebaseHelper.database.ref().update(updates);
        } catch (error) {
            console.error('❌ Errore batch update posizioni asset:', error);
        }
    }

    // Save asset position to Firebase
    async saveAssetPosition(finalX, finalY) {
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();

        if (!room || !user) {
            console.error('❌ Room o user non disponibili per salvataggio posizione');
            return;
        }

        try {
            await FirebaseHelper.updateData(`rooms/${room}/assets/${this.selectedAsset.id}`, {
                x: finalX,
                y: finalY,
                lastMoved: FirebaseHelper.getTimestamp(),
                movedBy: user.name
            });

            console.log('✅ Posizione asset salvata (libera):', this.selectedAsset.id, { x: finalX, y: finalY });

        } catch (error) {
            console.error('❌ Errore salvataggio posizione asset:', error);
            throw error;
        }
    }
    
    // FIXED: Save asset scale to Firebase
    async saveAssetScale(finalScale) {
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        if (!room || !user) {
            console.error('❌ Room o user non disponibili per salvataggio scala');
            return;
        }
        
        try {
            await FirebaseHelper.updateData(`rooms/${room}/assets/${this.selectedAsset.id}`, {
                scale: finalScale,
                lastModified: FirebaseHelper.getTimestamp(),
                modifiedBy: user.name
            });
            
            console.log('✅ Scala asset salvata:', this.selectedAsset.id, finalScale);
            
        } catch (error) {
            console.error('❌ Errore salvataggio scala asset:', error);
            throw error;
        }
    }
    
    // Reset drag state
    resetDragState() {
        this.isDragging = false;
        this.isScaling = false;
        this.selectedAsset = null;
        this.hasMoved = false;
        this.isPointerDown = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.assetStartPos = { x: 0, y: 0 };
        this.currentPointer = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.currentPosition = { x: 0, y: 0 };
        this.pointerType = 'mouse';
        this.scaleStartValue = 1;
        this.scaleStartX = 0;
        this.scaleStartY = 0;
    }
    
    // Update admin controls visibility
    updateAdminControls() {
        const isMaster = this.authManager.isMaster();
        const adminElements = document.querySelectorAll('.admin-only');
        
        adminElements.forEach(element => {
            element.style.display = isMaster ? 'block' : 'none';
        });
    }
    
    // Add asset to map from library - FIXED to place at center
    async addAssetToMap(assetData, assetProperties) {
        if (!this.authManager.isMaster()) return;
        
        const mapContainer = document.getElementById('mapContainer');
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Calculate center position
        const centerX = mapRect.width / 2;
        const centerY = mapRect.height / 2;
        
        const mapAssetData = {
            id: FirebaseHelper.generateUserId(),
            assetId: assetData.id,
            url: assetData.url,
            filename: assetData.filename,
            name: assetProperties.name || assetData.name,
            x: centerX,
            y: centerY,
            scale: assetProperties.scale || 1,
            rotation: assetProperties.rotation || 0,
            onMap: true,
            visibleToPlayers: false, // Initially visible only to master
            createdBy: this.authManager.getCurrentUser().name,
            timestamp: FirebaseHelper.getTimestamp()
        };
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            // Add directly to active assets on map
            await FirebaseHelper.setData(`rooms/${room}/assets/${mapAssetData.id}`, mapAssetData);
            
            console.log('✅ Asset posizionato al centro della mappa:', mapAssetData.name);
            
        } catch (error) {
            console.error('❌ Errore posizionamento asset:', error);
        }
    }
    
    // Create following asset visual
    createFollowingAsset(assetData) {
        const assetsLayer = document.getElementById('assetsLayer');
        if (!assetsLayer) return;
        
        // Remove any existing following asset
        const existingFollowing = assetsLayer.querySelector('.following-asset');
        if (existingFollowing) {
            existingFollowing.remove();
        }
        
        const assetElement = document.createElement('div');
        assetElement.className = 'map-asset following-asset';
        assetElement.dataset.assetId = 'following';
        
        assetElement.style.cssText = `
            position: absolute;
            width: ${100 * assetData.scale}px;
            height: ${100 * assetData.scale}px;
            background-image: url(${assetData.url});
            background-size: cover;
            background-position: center;
            z-index: 200;
            opacity: 0.8;
            pointer-events: none;
            transform: translate(-50%, -50%) rotate(${assetData.rotation}deg);
            transition: none;
            border: 2px solid #d4af37;
            border-radius: 4px;
        `;
        
        assetsLayer.appendChild(assetElement);
    }
    
    // Update following asset position
    updateFollowingAssetPosition(clientX, clientY) {
        const followingAsset = document.querySelector('.following-asset');
        if (!followingAsset) return;
        
        const mapContainer = document.getElementById('mapContainer');
        const mapRect = mapContainer.getBoundingClientRect();
        
        const x = clientX - mapRect.left;
        const y = clientY - mapRect.top;
        
        followingAsset.style.left = x + 'px';
        followingAsset.style.top = y + 'px';
    }
    
    // Handle map click to place asset - FIXED to place at center
    async handleMapClick(event) {
        if (!this.isFollowingMouse || !this.selectedAsset || this.isDragging) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const mapContainer = document.getElementById('mapContainer');
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Get map center coordinates for initial placement
        const centerX = mapRect.width / 2;
        const centerY = mapRect.height / 2;
        
        // Place asset on map at center
        const assetData = {
            ...this.selectedAsset,
            x: centerX,
            y: centerY,
            onMap: true,
            visibleToPlayers: false, // Initially visible only to master
            placedAt: FirebaseHelper.getTimestamp()
        };
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            // Add to active assets on map
            await FirebaseHelper.setData(`rooms/${room}/assets/${assetData.id}`, assetData);
            
            console.log('✅ Asset posizionato sulla mappa:', assetData.name, 'al centro');
            
        } catch (error) {
            console.error('❌ Errore posizionamento asset:', error);
        }
        
        this.cancelAssetFollow();
    }
    
    // Cancel asset following
    cancelAssetFollow() {
        this.isFollowingMouse = false;
        this.resetDragState();
        
        // Remove following asset visual
        const followingAsset = document.querySelector('.following-asset');
        if (followingAsset) {
            followingAsset.remove();
        }
        
        // Clean up any dragging states
        document.querySelectorAll('.map-asset').forEach(asset => {
            asset.classList.remove('dragging', 'scaling');
            asset.style.zIndex = '100';
            asset.style.opacity = '1';
            asset.style.cursor = 'pointer';
            asset.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            asset.style.willChange = 'auto';
        });
        
        console.log('❌ Operazione asset annullata');
    }
    
    // Listen to active assets on map
    listenToActiveAssets() {
        const room = this.authManager.getCurrentRoom();
        if (room) {
            this.assetsListener = FirebaseHelper.listenToData(`rooms/${room}/assets`, (snapshot) => {
                this.handleActiveAssetsUpdate(snapshot);
            });
        }
    }
    
    // Handle active assets update - FIXED error handling and validation
    handleActiveAssetsUpdate(snapshot) {
        try {
            const assetsData = snapshot.val();
            const assetsLayer = document.getElementById('assetsLayer');
            
            // Clear existing assets (except following asset)
            const existingAssets = assetsLayer.querySelectorAll('.map-asset:not(.following-asset)');
            existingAssets.forEach(asset => asset.remove());
            
            this.activeAssets.clear();
            
            if (assetsData) {
                Object.entries(assetsData).forEach(([id, assetData]) => {
                    // FIXED: Enhanced validation to prevent alerts
                    if (this.validateAssetData(assetData)) {
                        this.activeAssets.set(id, assetData);
                        
                        // Show asset based on visibility rules
                        const shouldShow = this.shouldShowAsset(assetData);
                        if (shouldShow) {
                            this.createAssetElement(id, assetData);
                        }
                    } else {
                        // FIXED: Only log warning for truly invalid data, not library assets
                        if (assetData && assetData.onMap === true) {
                            console.warn('⚠️ Asset data non valido ignorato:', id, assetData);
                        }
                    }
                });
            }
            
            console.log(`🖼️ Aggiornamento asset attivi: ${this.activeAssets.size} asset sulla mappa`);
            
        } catch (error) {
            console.error('❌ Errore aggiornamento asset attivi:', error);
        }
    }
    
    // FIXED: Enhanced validation to prevent false alerts
    validateAssetData(assetData) {
        if (!assetData || typeof assetData !== 'object') {
            return false;
        }
        
        // FIXED: Only validate assets that are actually on the map
        if (assetData.onMap !== true) {
            return false; // This is a library asset, not a map asset
        }
        
        // Check required properties for map assets
        const requiredProps = ['id', 'url', 'name'];
        for (const prop of requiredProps) {
            if (!assetData.hasOwnProperty(prop) || assetData[prop] === undefined || assetData[prop] === null) {
                return false;
            }
        }
        
        // Ensure name is a string
        if (typeof assetData.name !== 'string') {
            return false;
        }
        
        // Set default values for optional properties
        assetData.x = assetData.x || 0;
        assetData.y = assetData.y || 0;
        assetData.scale = assetData.scale || 1;
        assetData.rotation = assetData.rotation || 0;
        assetData.visibleToPlayers = assetData.visibleToPlayers || false;
        
        return true;
    }
    
    // Check if asset should be shown to current user
    shouldShowAsset(assetData) {
        const isMaster = this.authManager.isMaster();
        
        // Masters can always see all assets
        if (isMaster) return true;
        
        // Players can only see assets marked as visible to players
        return assetData.visibleToPlayers === true;
    }
    
    // FIXED: Create asset element with enhanced performance and hardware acceleration
    createAssetElement(id, assetData) {
        try {
            const assetsLayer = document.getElementById('assetsLayer');
            if (!assetsLayer) {
                console.error('❌ Assets layer non trovato');
                return;
            }
            
            const assetElement = document.createElement('div');
            assetElement.className = 'map-asset';
            assetElement.dataset.assetId = id;
            
            // Add opacity for assets not visible to players (master only)
            const isVisibleToPlayers = assetData.visibleToPlayers === true;
            const opacity = this.authManager.isMaster() && !isVisibleToPlayers ? '0.6' : '1';
            
            const scale = assetData.scale || 1;
            const rotation = assetData.rotation || 0;
            
            assetElement.style.cssText = `
                position: absolute;
                left: ${assetData.x}px;
                top: ${assetData.y}px;
                width: ${100 * scale}px;
                height: ${100 * scale}px;
                background-image: url(${assetData.url});
                background-position: center;
                cursor: ${this.canMoveAsset() ? 'grab' : 'default'};
                z-index: 100;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
                transform: translate(-50%, -50%) rotate(${rotation}deg);
                user-select: none;
                opacity: ${opacity};
                border: 2px solid #8b4513;
                border-radius: 4px;
                will-change: auto;
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
            `;
            
            // Add visibility indicator for master
            if (this.authManager.isMaster()) {
                const visibilityIndicator = document.createElement('div');
                visibilityIndicator.className = 'asset-visibility';
                visibilityIndicator.textContent = isVisibleToPlayers ? '👁️' : '👁️‍🗨️';
                visibilityIndicator.title = isVisibleToPlayers ? 'Visibile ai giocatori' : 'Solo Master';
                visibilityIndicator.style.cssText = `
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: ${isVisibleToPlayers ? '#32cd32' : '#ff8c00'};
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    border: 2px solid white;
                `;
                assetElement.appendChild(visibilityIndicator);
                
                // FIXED: Add scale handle for master with proper cursor
                const scaleHandle = document.createElement('div');
                scaleHandle.className = 'scale-handle';
                scaleHandle.style.cssText = `
                    position: absolute;
                    right: -10px;
                    bottom: -10px;
                    width: 20px;
                    height: 20px;
                    background: #d4af37;
                    border: 2px solid white;
                    border-radius: 50%;
                    cursor: nw-resize;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: #2c1810;
                    font-weight: bold;
                    z-index: 101;
                `;
                scaleHandle.textContent = '⟷';
                scaleHandle.title = 'Trascina per scalare';
                assetElement.appendChild(scaleHandle);
            }
            
            assetsLayer.appendChild(assetElement);
            
            // FIXED: Add enhanced hover effect with hardware acceleration
            assetElement.addEventListener('mouseenter', () => {
                if (!this.isDragging && !this.isScaling && this.canMoveAsset()) {
                    assetElement.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(1.1)`;
                    assetElement.style.cursor = 'grab';
                    assetElement.style.willChange = 'transform';
                }
            });
            
            assetElement.addEventListener('mouseleave', () => {
                if (!this.isDragging && !this.isScaling) {
                    assetElement.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(1)`;
                    assetElement.style.willChange = 'auto';
                }
            });
            
        } catch (error) {
            console.error('❌ Errore creazione elemento asset:', error, assetData);
        }
    }
    
    // Check if user can move assets
    canMoveAsset() {
        return this.authManager.isMaster() || this.allowPlayerMovement;
    }
    
    // Toggle asset visibility to players (Master only)
    async toggleAssetVisibility(assetId) {
        if (!this.authManager.isMaster()) return;
        
        const assetData = this.activeAssets.get(assetId);
        if (!assetData) return;
        
        const newVisibility = !assetData.visibleToPlayers;
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.updateData(`rooms/${room}/assets/${assetId}`, {
                visibleToPlayers: newVisibility,
                lastModified: FirebaseHelper.getTimestamp()
            });
            
            console.log(`✅ Visibilità asset aggiornata:`, assetId, newVisibility ? 'visibile' : 'nascosto');
            
        } catch (error) {
            console.error('❌ Errore aggiornamento visibilità asset:', error);
        }
    }
    
    // Update asset properties (Master only)
    async updateAssetProperty(assetId, property, value) {
        if (!this.authManager.isMaster()) return;
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.updateData(`rooms/${room}/assets/${assetId}`, {
                [property]: value,
                lastModified: FirebaseHelper.getTimestamp()
            });
            
            console.log(`✅ Asset ${property} aggiornato:`, assetId, value);
            
        } catch (error) {
            console.error(`❌ Errore aggiornamento ${property} asset:`, error);
        }
    }
    
    // Remove asset from map
    async removeAssetFromMap(assetId) {
        if (!this.authManager.isMaster()) return;
        
        const assetData = this.activeAssets.get(assetId);
        const assetName = assetData?.name || 'questo asset';
        
        const confirmed = await modalSystem.confirm(
            `Rimuovere "${assetName}" dalla mappa?`,
            'Rimuovi Asset',
            {
                icon: '🖼️',
                confirmText: 'Sì, rimuovi',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) return;
        
        await this.assetSystem.deleteAssetFromMap(assetId);
    }
    
    // Delete asset from map (Master only)
    async deleteAssetFromMap(assetId) {
        if (!this.authManager.isMaster()) return;
        
        const assetData = this.activeAssets.get(assetId);
        if (!assetData) return;
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            // Remove from active assets
            await FirebaseHelper.removeData(`rooms/${room}/assets/${assetId}`);
            
            console.log('✅ Asset rimosso dalla mappa:', assetData.name);
            
        } catch (error) {
            console.error('❌ Errore rimozione asset dalla mappa:', error);
        }
    }
    
    // Clear all assets (Master only)
    async clearAllAssets() {
        if (!this.authManager.isMaster()) return;
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            // Remove all from Firebase
            await FirebaseHelper.removeData(`rooms/${room}/assets`);
            
            console.log('✅ Tutti gli asset rimossi dalla mappa');
            
        } catch (error) {
            console.error('❌ Errore pulizia asset:', error);
        }
    }
    
    // Get all active assets
    getAllActiveAssets() {
        return Array.from(this.activeAssets.values());
    }
    
    // Cleanup
    cleanup() {
        console.log('🧹 Pulizia sistema asset...');
        
        if (this.assetsListener) {
            FirebaseHelper.stopListening(this.assetsListener);
            this.assetsListener = null;
        }
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        this.cancelAssetFollow();
    }
}

export default AssetSystem;