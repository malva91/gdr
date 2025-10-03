// Token system management - FIXED: Controllable token names visibility
import FirebaseHelper from './firebase.js?v.100';
import { modalSystem } from './modal-system.js?v.100';

export class TokenSystem {
    constructor(authManager, mapSystem) {
        this.authManager = authManager;
        this.mapSystem = mapSystem;
        this.activeTokens = new Map(); // Tokens on map
        this.tokensListener = null;
        this.selectedToken = null;
        this.isFollowingMouse = false;
        this.allowPlayerMovement = false;
        this.tokenColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
        ];
        this.tokenSizes = {
            small: 25, // FIXED: Default small size
            medium: 50,
            large: 70
        };
        
        // FIXED: Ultra-fluid drag system with NO CONSTRAINTS
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.tokenStartPos = { x: 0, y: 0 };
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
    }
    
    // Initialize token system
    init() {
        console.log('🎭 Inizializzazione sistema token...');
        this.setupEventListeners();
        this.listenToActiveTokens();
        this.listenToSettings();
        this.updateAdminControls();
        this.startSmoothUpdateLoop();
    }
    
    // FIXED: Start smooth update loop for ultra-fluid movement
    startSmoothUpdateLoop() {
        const updateLoop = () => {
            if (this.isDragging && this.selectedToken) {
                this.updateTokenPositionSmooth();
            }
            this.animationFrame = requestAnimationFrame(updateLoop);
        };
        updateLoop();
    }
    
    // Setup event listeners with ultra-fluid movement
    setupEventListeners() {
        const tokensLayer = document.getElementById('tokensLayer');
        const mapViewport = document.getElementById('mapViewport');
        
        if (!tokensLayer || !mapViewport) {
            console.error('❌ Elementi token layer o map viewport non trovati');
            return;
        }
        
        // FIXED: Enhanced token interactions with better precision
        tokensLayer.addEventListener('mousedown', (e) => this.handleTokenPointerDown(e, 'mouse'), { passive: false });
        tokensLayer.addEventListener('touchstart', (e) => this.handleTokenPointerDown(e, 'touch'), { passive: false });
        
        // FIXED: Global pointer events for ultra-smooth dragging
        document.addEventListener('mousemove', (e) => this.handleGlobalPointerMove(e, 'mouse'), { passive: false });
        document.addEventListener('mouseup', (e) => this.handleGlobalPointerUp(e, 'mouse'), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleGlobalPointerMove(e, 'touch'), { passive: false });
        document.addEventListener('touchend', (e) => this.handleGlobalPointerUp(e, 'touch'), { passive: false });
        
        // Map click to place following token
        mapViewport.addEventListener('click', (e) => this.handleMapClick(e));
        
        // Escape to cancel token following
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && (this.isFollowingMouse || this.isDragging)) {
                this.cancelTokenFollow();
            }
        });
    }
    
    // FIXED: Handle token pointer down with improved precision
    handleTokenPointerDown(event, pointerType) {
        const tokenElement = event.target.closest('.token');
        if (!tokenElement || tokenElement.classList.contains('following-token')) return;
        if (!this.canMoveToken()) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const tokenId = tokenElement.dataset.tokenId;
        const tokenData = this.activeTokens.get(tokenId);
        if (!tokenData) {
            console.warn('⚠️ Token data non trovato per ID:', tokenId);
            return;
        }
        
        // Get pointer position
        const pointer = this.getPointerPosition(event, pointerType);
        if (!pointer) return;
        
        // Store initial positions
        this.dragStartPos = { x: pointer.x, y: pointer.y };
        this.tokenStartPos = { x: tokenData.x || 0, y: tokenData.y || 0 };
        this.currentPointer = { x: pointer.x, y: pointer.y };
        this.targetPosition = { x: pointer.x, y: pointer.y };
        this.currentPosition = { x: pointer.x, y: pointer.y };
        this.pointerType = pointerType;
        this.isPointerDown = true;
        
        // Set selected token
        this.selectedToken = tokenData;
        this.hasMoved = false;
        this.isDragging = false;
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
    
    // FIXED: Handle global pointer move with ultra-smooth interpolation
    handleGlobalPointerMove(event, pointerType) {
        if (!this.selectedToken || !this.isPointerDown) return;
        
        // Handle following mouse mode
        if (this.isFollowingMouse) {
            const pointer = this.getPointerPosition(event, pointerType);
            if (pointer) {
                this.updateFollowingTokenPosition(pointer.x, pointer.y);
            }
            return;
        }
        
        // Only process if this is the same pointer type that started the drag
        if (pointerType !== this.pointerType) return;
        
        const pointer = this.getPointerPosition(event, pointerType);
        if (!pointer) return;
        
        // Update target position for smooth interpolation
        this.targetPosition = { x: pointer.x, y: pointer.y };
        
        // Check if we should start dragging
        if (!this.isDragging && this.selectedToken) {
            const deltaX = pointer.x - this.dragStartPos.x;
            const deltaY = pointer.y - this.dragStartPos.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > this.dragThreshold) {
                this.startTokenDrag();
            }
        }
        
        // Prevent default for touch to avoid scrolling
        if (pointerType === 'touch' && this.isDragging) {
            event.preventDefault();
        }
    }
    
    // Start token drag with enhanced visual feedback
    startTokenDrag() {
        if (!this.selectedToken || this.isDragging) return;
        
        const tokenElement = document.querySelector(`[data-token-id="${this.selectedToken.id}"]`);
        if (!tokenElement) {
            console.error('❌ Elemento token non trovato per drag:', this.selectedToken.id);
            return;
        }
        
        this.isDragging = true;
        this.hasMoved = true;
        
        // Enhanced visual feedback
        tokenElement.classList.add('dragging');
        tokenElement.style.zIndex = '300';
        tokenElement.style.transition = 'none';
        tokenElement.style.cursor = 'grabbing';
        tokenElement.style.transform = tokenElement.style.transform.replace(/scale\([^)]*\)/, '') + ' scale(1.15)';
        tokenElement.style.filter = 'brightness(1.3) drop-shadow(0 12px 24px rgba(0,0,0,0.5))';
        tokenElement.style.willChange = 'transform, left, top';
        
        // Add visual feedback to other tokens
        document.querySelectorAll('.token').forEach(token => {
            if (token !== tokenElement) {
                token.style.opacity = '0.4';
                token.style.filter = 'grayscale(0.7)';
            }
        });
    }
    
    // FIXED: Update token position with NO CONSTRAINTS - completely free movement
    updateTokenPositionSmooth() {
        if (!this.selectedToken || !this.isDragging) return;
        
        const tokenElement = document.querySelector(`[data-token-id="${this.selectedToken.id}"]`);
        if (!tokenElement) return;
        
        try {
            // Smooth interpolation between current and target position
            this.currentPosition.x += (this.targetPosition.x - this.currentPosition.x) * this.smoothingFactor;
            this.currentPosition.y += (this.targetPosition.y - this.currentPosition.y) * this.smoothingFactor;
            
            // Calculate movement delta from start position with smooth interpolation
            const deltaX = this.currentPosition.x - this.dragStartPos.x;
            const deltaY = this.currentPosition.y - this.dragStartPos.y;
            
            // Calculate new position based on token's original position + delta
            const newX = this.tokenStartPos.x + deltaX;
            const newY = this.tokenStartPos.y + deltaY;
            
            // FIXED: NO CONSTRAINTS - completely free movement
            // Apply position with hardware acceleration - NO BOUNDS CHECKING
            tokenElement.style.left = newX + 'px';
            tokenElement.style.top = newY + 'px';
            tokenElement.style.transform = tokenElement.style.transform.replace(/translate3d\([^)]*\)/, '') + ' translate3d(0, 0, 0)';
            
        } catch (error) {
            console.error('❌ Errore aggiornamento posizione token:', error);
        }
    }
    
    // Handle global pointer up
    handleGlobalPointerUp(event, pointerType) {
        if (!this.selectedToken || !this.isPointerDown) return;
        
        // Only process if this is the same pointer type that started the interaction
        if (pointerType !== this.pointerType) return;
        
        this.isPointerDown = false;
        
        if (this.isDragging) {
            this.finishTokenDrag();
        } else {
            // Just a click/tap, not a drag
            this.selectedToken = null;
        }
    }
    
    // FIXED: Finish token drag with improved cleanup and performance
    async finishTokenDrag() {
        if (!this.selectedToken || !this.isDragging) return;
        
        const tokenElement = document.querySelector(`[data-token-id="${this.selectedToken.id}"]`);
        if (!tokenElement) {
            console.error('❌ Elemento token non trovato per finish drag:', this.selectedToken.id);
            this.resetDragState();
            return;
        }
        
        try {
            // Get final position - NO CONSTRAINTS
            const finalX = parseFloat(tokenElement.style.left) || 0;
            const finalY = parseFloat(tokenElement.style.top) || 0;
            
            // Clean up visual feedback
            this.cleanupDragVisuals(tokenElement);
            
            // Save position to Firebase only if actually moved
            if (this.hasMoved) {
                await this.saveTokenPosition(finalX, finalY);
            }
            
        } catch (error) {
            console.error('❌ Errore completamento drag token:', error);
        } finally {
            this.resetDragState();
        }
    }
    
    // FIXED: Clean up drag visuals with improved performance
    cleanupDragVisuals(tokenElement) {
        try {
            // Reset dragging token
            tokenElement.classList.remove('dragging');
            tokenElement.style.zIndex = '100';
            tokenElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, filter 0.3s ease';
            tokenElement.style.cursor = this.canMoveToken() ? 'grab' : 'default';
            tokenElement.style.willChange = 'auto';
            
            // Reset scale and filter with smooth transition
            const currentTransform = tokenElement.style.transform;
            tokenElement.style.transform = currentTransform.replace(/scale\([^)]*\)/g, '').replace(/translate3d\([^)]*\)/g, '').trim();
            tokenElement.style.filter = '';
            
            // Restore other tokens with smooth transition
            document.querySelectorAll('.token').forEach(token => {
                token.style.opacity = '1';
                token.style.filter = '';
                token.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
            });
            
        } catch (error) {
            console.error('❌ Errore cleanup visuals drag:', error);
        }
    }
    
    // Save token position to Firebase
    async saveTokenPosition(finalX, finalY) {
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        if (!room || !user) {
            console.error('❌ Room o user non disponibili per salvataggio posizione');
            return;
        }
        
        try {
            await FirebaseHelper.updateData(`rooms/${room}/tokens/${this.selectedToken.id}`, {
                x: finalX,
                y: finalY,
                lastMoved: FirebaseHelper.getTimestamp(),
                movedBy: user.name
            });
            
        } catch (error) {
            console.error('❌ Errore salvataggio posizione token:', error);
            throw error;
        }
    }
    
    // Reset drag state
    resetDragState() {
        this.isDragging = false;
        this.selectedToken = null;
        this.hasMoved = false;
        this.isPointerDown = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.tokenStartPos = { x: 0, y: 0 };
        this.currentPointer = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.currentPosition = { x: 0, y: 0 };
        this.pointerType = 'mouse';
    }
    
    // Update admin controls visibility
    updateAdminControls() {
        const isMaster = this.authManager.isMaster();
        const adminElements = document.querySelectorAll('.admin-only');
        
        adminElements.forEach(element => {
            element.style.display = isMaster ? 'block' : 'none';
        });
    }
    
    // Add token to map from library with specific properties - FIXED to place at center
    async addTokenToMap(tokenAsset, tokenProperties) {
        if (!this.authManager.isMaster()) {
            console.warn('⚠️ Solo i master possono aggiungere token alla mappa');
            return;
        }
        
        try {
            const mapContainer = document.getElementById('mapContainer');
            if (!mapContainer) {
                console.error('❌ Map container non trovato');
                return;
            }
            
            const mapRect = mapContainer.getBoundingClientRect();
            
            // Calculate center position
            const centerX = mapRect.width / 2;
            const centerY = mapRect.height / 2;
            
            const tokenData = {
                id: FirebaseHelper.generateUserId(),
                assetId: tokenAsset.id,
                url: tokenAsset.url,
                filename: tokenAsset.filename,
                name: tokenProperties.name || tokenAsset.name || 'Token senza nome',
                size: tokenProperties.size || 'small', // FIXED: Default to small
                color: tokenProperties.color || this.tokenColors[0],
                x: centerX,
                y: centerY,
                onMap: true,
                visibleToPlayers: false, // Initially visible only to master
                showName: true, // FIXED: Default to showing name
                createdBy: this.authManager.getCurrentUser().name,
                timestamp: FirebaseHelper.getTimestamp()
            };
            
            const room = this.authManager.getCurrentRoom();
            
            await FirebaseHelper.setData(`rooms/${room}/tokens/${tokenData.id}`, tokenData);
            
        } catch (error) {
            console.error('❌ Errore posizionamento token:', error);
        }
    }
    
    // Create following token visual
    createFollowingToken(tokenData) {
        const tokensLayer = document.getElementById('tokensLayer');
        if (!tokensLayer) {
            console.error('❌ Tokens layer non trovato per following token');
            return;
        }
        
        // Remove any existing following token
        const existingFollowing = tokensLayer.querySelector('.following-token');
        if (existingFollowing) {
            existingFollowing.remove();
        }
        
        const tokenElement = document.createElement('div');
        tokenElement.className = 'token following-token';
        tokenElement.dataset.tokenId = 'following';
        
        const size = this.tokenSizes[tokenData.size] || this.tokenSizes.medium;
        
        tokenElement.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border: 2px solid ${tokenData.color};
            border-radius: 50%;
            background-image: url(${tokenData.url});
            background-size: cover;
            background-position: center;
            z-index: 200;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            opacity: 0.8;
            pointer-events: none;
            transform: translate(-50%, -50%);
            transition: none;
        `;
        
        tokensLayer.appendChild(tokenElement);
    }
    
    // Update following token position
    updateFollowingTokenPosition(clientX, clientY) {
        const followingToken = document.querySelector('.following-token');
        if (!followingToken) return;
        
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) return;
        
        const mapRect = mapContainer.getBoundingClientRect();
        
        const x = clientX - mapRect.left;
        const y = clientY - mapRect.top;
        
        followingToken.style.left = x + 'px';
        followingToken.style.top = y + 'px';
    }
    
    // Handle map click to place token - FIXED to place at center
    async handleMapClick(event) {
        if (!this.isFollowingMouse || !this.selectedToken || this.isDragging) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        try {
            const mapContainer = document.getElementById('mapContainer');
            if (!mapContainer) {
                console.error('❌ Map container non trovato per placement');
                return;
            }
            
            const mapRect = mapContainer.getBoundingClientRect();
            
            // Get map center coordinates for initial placement
            const centerX = mapRect.width / 2;
            const centerY = mapRect.height / 2;
            
            // Place token on map at center
            const tokenData = {
                ...this.selectedToken,
                x: centerX,
                y: centerY,
                onMap: true,
                visibleToPlayers: false, // Initially visible only to master
                showName: true, // FIXED: Default to showing name
                placedAt: FirebaseHelper.getTimestamp()
            };
            
            const room = this.authManager.getCurrentRoom();
            
            await FirebaseHelper.setData(`rooms/${room}/tokens/${tokenData.id}`, tokenData);
            
        } catch (error) {
            console.error('❌ Errore posizionamento token sulla mappa:', error);
        }
        
        this.cancelTokenFollow();
    }
    
    // Cancel token following
    cancelTokenFollow() {
        this.isFollowingMouse = false;
        this.resetDragState();
        
        // Remove following token visual
        const followingToken = document.querySelector('.following-token');
        if (followingToken) {
            followingToken.remove();
        }
        
        // Clean up any dragging states
        document.querySelectorAll('.token').forEach(token => {
            token.classList.remove('dragging');
            token.style.zIndex = '100';
            token.style.opacity = '1';
            token.style.filter = '';
            token.style.cursor = this.canMoveToken() ? 'grab' : 'default';
            token.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            token.style.willChange = 'auto';
        });
    }
    
    // Listen to active tokens on map
    listenToActiveTokens() {
        const room = this.authManager.getCurrentRoom();
        if (room) {
            this.tokensListener = FirebaseHelper.listenToData(`rooms/${room}/tokens`, (snapshot) => {
                this.handleActiveTokensUpdate(snapshot);
            });
        }
    }
    
    // Listen to settings
    listenToSettings() {
        const room = this.authManager.getCurrentRoom();
        if (room) {
            FirebaseHelper.listenToData(`rooms/${room}/settings`, (snapshot) => {
                const settings = snapshot.val();
                if (settings) {
                    this.allowPlayerMovement = settings.allowTokenMovement || false;
                }
            });
        }
    }
    
    // Handle active tokens update - FIXED to validate data
    handleActiveTokensUpdate(snapshot) {
        try {
            const tokensData = snapshot.val();
            const tokensLayer = document.getElementById('tokensLayer');
            
            if (!tokensLayer) {
                console.error('❌ Tokens layer non trovato per update');
                return;
            }
            
            // Clear existing tokens (except following token)
            const existingTokens = tokensLayer.querySelectorAll('.token:not(.following-token)');
            existingTokens.forEach(token => token.remove());
            
            this.activeTokens.clear();
            
            if (tokensData) {
                Object.entries(tokensData).forEach(([id, tokenData]) => {
                    // Validate token data before processing
                    if (this.validateTokenData(tokenData)) {
                        this.activeTokens.set(id, tokenData);
                        
                        // Show token based on visibility rules
                        const shouldShow = this.shouldShowToken(tokenData);
                        if (shouldShow) {
                            this.createTokenElement(id, tokenData);
                        }
                    } else {
                        console.warn('⚠️ Token data non valido ignorato:', id, tokenData);
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Errore aggiornamento token attivi:', error);
        }
    }
    
    // Validate token data - Enhanced validation
    validateTokenData(tokenData) {
        if (!tokenData || typeof tokenData !== 'object') {
            return false;
        }
        
        // Check required properties
        const requiredProps = ['id', 'url'];
        for (const prop of requiredProps) {
            if (!tokenData.hasOwnProperty(prop) || tokenData[prop] === undefined || tokenData[prop] === null) {
                return false;
            }
        }
        
        // Ensure name is a string (with fallback)
        if (!tokenData.name || typeof tokenData.name !== 'string') {
            tokenData.name = 'Token senza nome';
        }
        
        // Set default values for optional properties
        tokenData.x = typeof tokenData.x === 'number' ? tokenData.x : 0;
        tokenData.y = typeof tokenData.y === 'number' ? tokenData.y : 0;
        tokenData.size = tokenData.size || 'small'; // FIXED: Default to small
        tokenData.color = tokenData.color || this.tokenColors[0];
        tokenData.visibleToPlayers = tokenData.visibleToPlayers || false;
        tokenData.showName = tokenData.showName !== false; // FIXED: Default to true
        
        return true;
    }
    
    // Check if token should be shown to current user
    shouldShowToken(tokenData) {
        const isMaster = this.authManager.isMaster();
        
        // Masters can always see all tokens
        if (isMaster) return true;
        
        // Players can only see tokens marked as visible to players
        return tokenData.visibleToPlayers === true;
    }
    
    // FIXED: Create token element with controllable name visibility
    createTokenElement(id, tokenData) {
        try {
            const tokensLayer = document.getElementById('tokensLayer');
            if (!tokensLayer) {
                console.error('❌ Tokens layer non trovato');
                return;
            }
            
            const tokenElement = document.createElement('div');
            tokenElement.className = 'token';
            tokenElement.dataset.tokenId = id;
            
            const size = this.tokenSizes[tokenData.size] || this.tokenSizes.medium;
            
            // Add opacity for tokens not visible to players (master only)
            const isVisibleToPlayers = tokenData.visibleToPlayers === true;
            const opacity = this.authManager.isMaster() && !isVisibleToPlayers ? '0.6' : '1';
            
            tokenElement.style.cssText = `
                position: absolute;
                left: ${tokenData.x}px;
                top: ${tokenData.y}px;
                width: ${size}px;
                height: ${size}px;
                border: 2px solid ${tokenData.color};
                border-radius: 50%;
                background-image: url(${tokenData.url});
                background-size: cover;
                background-position: center;
                cursor: ${this.canMoveToken() ? 'grab' : 'default'};
                z-index: 100;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
                transform: translate(-50%, -50%);
                user-select: none;
                opacity: ${opacity};
                will-change: auto;
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
            `;
            
            // FIXED: Add name label only if showName is true
            if (tokenData.showName !== false) {
                const nameLabel = document.createElement('div');
                nameLabel.className = 'token-name';
                const tokenName = tokenData.name || 'Token senza nome';
                const displayName = tokenName.length > 8 ? tokenName.substring(0, 8) + '...' : tokenName;
                nameLabel.textContent = displayName;
                nameLabel.title = tokenName; // Full name on hover
                nameLabel.style.cssText = `
                    position: absolute;
                    bottom: -18px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.8);
                    color: #d4af37;
                    padding: 1px 3px;
                    border-radius: 2px;
                    font-size: 7px;
                    white-space: nowrap;
                    pointer-events: none;
                    max-width: 50px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    border: 1px solid ${tokenData.color};
                    opacity: 0.9;
                    font-weight: 600;
                    text-shadow: 1px 1px 1px rgba(0,0,0,0.9);
                `;
                tokenElement.appendChild(nameLabel);
            }
            
            // Add visibility indicator for master
            if (this.authManager.isMaster()) {
                const visibilityIndicator = document.createElement('div');
                visibilityIndicator.className = 'token-visibility';
                visibilityIndicator.textContent = isVisibleToPlayers ? '👁️' : '👁️‍🗨️';
                visibilityIndicator.title = isVisibleToPlayers ? 'Visibile ai giocatori' : 'Solo Master';
                visibilityIndicator.style.cssText = `
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: ${isVisibleToPlayers ? '#32cd32' : '#ff8c00'};
                    color: white;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    border: 1px solid white;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                `;
                tokenElement.appendChild(visibilityIndicator);
            }
            
            tokensLayer.appendChild(tokenElement);
            
            // FIXED: Add enhanced hover effect with hardware acceleration
            tokenElement.addEventListener('mouseenter', () => {
                if (!this.isDragging && this.canMoveToken()) {
                    tokenElement.style.transform = 'translate(-50%, -50%) scale(1.1)';
                    tokenElement.style.cursor = 'grab';
                    tokenElement.style.willChange = 'transform';
                }
            });
            
            tokenElement.addEventListener('mouseleave', () => {
                if (!this.isDragging) {
                    tokenElement.style.transform = 'translate(-50%, -50%) scale(1)';
                    tokenElement.style.willChange = 'auto';
                }
            });
            
        } catch (error) {
            console.error('❌ Errore creazione elemento token:', error, tokenData);
        }
    }
    
    // Check if user can move tokens
    canMoveToken() {
        return this.authManager.isMaster() || this.allowPlayerMovement;
    }
    
    // Toggle token visibility to players (Master only)
    async toggleTokenVisibility(tokenId) {
        if (!this.authManager.isMaster()) {
            console.warn('⚠️ Solo i master possono modificare la visibilità dei token');
            return;
        }
        
        const tokenData = this.activeTokens.get(tokenId);
        if (!tokenData) {
            console.warn('⚠️ Token non trovato per toggle visibilità:', tokenId);
            return;
        }
        
        const newVisibility = !tokenData.visibleToPlayers;
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.updateData(`rooms/${room}/tokens/${tokenId}`, {
                visibleToPlayers: newVisibility,
                lastModified: FirebaseHelper.getTimestamp()
            });
            
        } catch (error) {
            console.error('❌ Errore aggiornamento visibilità token:', error);
        }
    }
    
    // Update token properties (Master only)
    async updateTokenProperty(tokenId, property, value) {
        if (!this.authManager.isMaster()) {
            console.warn('⚠️ Solo i master possono modificare le proprietà dei token');
            return;
        }
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.updateData(`rooms/${room}/tokens/${tokenId}`, {
                [property]: value,
                lastModified: FirebaseHelper.getTimestamp()
            });
            
        } catch (error) {
            console.error(`❌ Errore aggiornamento ${property} token:`, error);
        }
    }
    
    // Delete token from map (Master only)
    async deleteTokenFromMap(tokenId) {
        if (!this.authManager.isMaster()) {
            console.warn('⚠️ Solo i master possono eliminare token dalla mappa');
            return;
        }
        
        const tokenData = this.activeTokens.get(tokenId);
        if (!tokenData) {
            console.warn('⚠️ Token non trovato per eliminazione:', tokenId);
            return;
        }
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.removeData(`rooms/${room}/tokens/${tokenId}`);
            
        } catch (error) {
            console.error('❌ Errore rimozione token dalla mappa:', error);
        }
    }
    
    // Remove token from map
    async removeTokenFromMap(tokenId) {
        if (!this.authManager.isMaster()) return;
        
        const tokenData = this.activeTokens.get(tokenId);
        const tokenName = tokenData?.name || 'questo token';
        
        const confirmed = await modalSystem.confirm(
            `Rimuovere "${tokenName}" dalla mappa?`,
            'Rimuovi Token',
            {
                icon: '🎭',
                confirmText: 'Sì, rimuovi',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) return;
        
        await this.tokenSystem.deleteTokenFromMap(tokenId);
    }
    
    // Clear all tokens (Master only)
    async clearAllTokens() {
        if (!this.authManager.isMaster()) {
            console.warn('⚠️ Solo i master possono pulire tutti i token');
            return;
        }
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.removeData(`rooms/${room}/tokens`);
            
        } catch (error) {
            console.error('❌ Errore pulizia token:', error);
        }
    }
    
    // Set player movement permission
    async setPlayerMovement(allowed) {
        if (!this.authManager.isMaster()) {
            console.warn('⚠️ Solo i master possono modificare i permessi di movimento');
            return;
        }
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.setData(`rooms/${room}/settings/allowTokenMovement`, allowed);
            this.allowPlayerMovement = allowed;
            
        } catch (error) {
            console.error('❌ Errore impostazione movimento giocatori:', error);
        }
    }
    
    // Get all active tokens
    getAllActiveTokens() {
        return Array.from(this.activeTokens.values());
    }
    
    // Cleanup
    cleanup() {
        if (this.tokensListener) {
            FirebaseHelper.stopListening(this.tokensListener);
            this.tokensListener = null;
        }
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        this.cancelTokenFollow();
    }
}

export default TokenSystem;