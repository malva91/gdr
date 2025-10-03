// Master Panel management - FIXED: Collapsible tabs and improved token names
import FirebaseHelper from './firebase.js?v.100';
import { modalSystem } from './modal-system.js?v.100';

export class MasterPanel {
    constructor(authManager, mapSystem, tokenSystem, assetSystem, musicSystem, chatSystem) {
        this.authManager = authManager;
        this.mapSystem = mapSystem;
        this.tokenSystem = tokenSystem;
        this.assetSystem = assetSystem;
        this.musicSystem = musicSystem;
        this.chatSystem = chatSystem;
        this.isOpen = false;
        this.assetsListeners = new Map();
        this.activeTokensListener = null;
        this.activeAssetsListener = null;
        this.assets = {
            maps: new Map(),
            tokens: new Map(),
            assets: new Map(),
            music: new Map(),
            sounds: new Map()
        };
        this.activeTokens = new Map();
        this.activeAssets = new Map();
        
        // FIXED: Individual resource collapse state
        this.collapsedResources = new Set();
    }
    
    // Initialize master panel
    init() {
        this.setupEventListeners();
        this.updateVisibility();
        this.listenToAssetLibraries();
        this.listenToActiveTokens();
        this.listenToActiveAssets();
    }
    
    // Setup event listeners
    setupEventListeners() {
        const masterPanelBtn = document.getElementById('masterPanelBtn');
        if (masterPanelBtn) {
            masterPanelBtn.addEventListener('click', () => this.togglePanel());
        }
        
        const closePanelBtn = document.getElementById('closeMasterPanel');
        if (closePanelBtn) {
            closePanelBtn.addEventListener('click', () => this.closePanel());
        }
        
        const uploadButtons = [
            { id: 'uploadMapBtn', type: 'map', input: 'mapFileInput' },
            { id: 'uploadTokenBtn', type: 'token', input: 'tokenFileInput' },
            { id: 'uploadAssetBtn', type: 'asset', input: 'assetFileInput' },
            { id: 'uploadMusicBtn', type: 'music', input: 'musicFileInput' },
            { id: 'uploadSoundBtn', type: 'sound', input: 'soundFileInput' }
        ];
        
        uploadButtons.forEach(({ id, type, input }) => {
            const btn = document.getElementById(id);
            const fileInput = document.getElementById(input);
            
            if (btn && fileInput) {
                btn.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', (e) => this.handleFileUpload(e, type));
            }
        });
        
        const clearTokensBtn = document.getElementById('clearTokensBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        const clearChatBtn = document.getElementById('clearChatBtn');
        
        if (clearTokensBtn) clearTokensBtn.addEventListener('click', () => this.clearTokens());
        if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearAll());
        if (clearChatBtn) clearChatBtn.addEventListener('click', () => this.clearChat());
    }
    
    // Handle file upload
    async handleFileUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!this.authManager.isMaster()) {
            console.error('❌ ERRORE: Solo i master possono caricare file');
            return;
        }
        
        try {
            const uploadBtn = document.getElementById(`upload${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
            if (uploadBtn) {
                uploadBtn.classList.add('loading');
                uploadBtn.disabled = true;
            }
            
            const formData = new FormData();
            formData.append(type, file);
            formData.append('room', this.authManager.getCurrentRoom());
            formData.append('type', type);
            
            const response = await fetch('php/upload.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.saveAssetToDatabase(type, {
                    filename: result.filename,
                    originalName: file.name,
                    url: result.url,
                    size: result.size,
                    type: result.type || file.type
                });
                
                console.log(`✅ ${type} caricato:`, file.name);
                
            } else {
                throw new Error(result.error || 'Errore upload');
            }
            
        } catch (error) {
            console.error(`❌ ERRORE upload ${type}:`, error);
        } finally {
            const uploadBtn = document.getElementById(`upload${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
            if (uploadBtn) {
                uploadBtn.classList.remove('loading');
                uploadBtn.disabled = false;
            }
            event.target.value = '';
        }
    }
    
    // Save asset to database with correct paths for all types
    async saveAssetToDatabase(type, fileData) {
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        const assetData = {
            id: FirebaseHelper.generateUserId(),
            filename: fileData.filename,
            originalName: fileData.originalName,
            name: fileData.originalName.replace(/\.[^/.]+$/, ''),
            url: fileData.url,
            size: fileData.size,
            type: fileData.type,
            uploadedBy: user.name,
            timestamp: FirebaseHelper.getTimestamp(),
            visibleToPlayers: false
        };
        
        // Add title for music files
        if (type === 'music') {
            assetData.title = assetData.name;
        }
        
        // Correct path structure for all asset types
        let path;
        switch (type) {
            case 'map':
                path = `rooms/${room}/assets/map/${assetData.id}`;
                break;
            case 'token':
                path = `rooms/${room}/assets/token/${assetData.id}`;
                break;
            case 'asset':
                path = `rooms/${room}/assets/asset/${assetData.id}`;
                break;
            case 'music':
                path = `rooms/${room}/assets/music/${assetData.id}`;
                break;
            case 'sound':
                path = `rooms/${room}/assets/sound/${assetData.id}`;
                break;
            default:
                console.error('❌ ERRORE: Tipo asset non riconosciuto:', type);
                return;
        }
        
        try {
            await FirebaseHelper.setData(path, assetData);
            console.log('✅ Asset salvato:', path);
        } catch (error) {
            console.error('❌ ERRORE salvataggio asset:', error);
            throw error;
        }
    }
    
    // Listen to asset libraries with correct paths
    listenToAssetLibraries() {
        const room = this.authManager.getCurrentRoom();
        if (!room) {
            console.error('❌ ERRORE: Nessuna stanza per ascoltare asset libraries');
            return;
        }
        
        const assetTypes = [
            { plural: 'maps', singular: 'map' },
            { plural: 'tokens', singular: 'token' },
            { plural: 'assets', singular: 'asset' },
            { plural: 'music', singular: 'music' },
            { plural: 'sounds', singular: 'sound' },
            { plural: 'sounds', singular: 'sound' }
        ];
        
        assetTypes.forEach(({ plural, singular }) => {
            const path = `rooms/${room}/assets/${singular}`;
            
            const listener = FirebaseHelper.listenToData(path, (snapshot) => {
                this.handleAssetLibraryUpdate(plural, snapshot);
            });
            
            this.assetsListeners.set(plural, listener);
        });
    }
    
    // Listen to active tokens on map
    listenToActiveTokens() {
        const room = this.authManager.getCurrentRoom();
        if (!room) return;
        
        this.activeTokensListener = FirebaseHelper.listenToData(`rooms/${room}/tokens`, (snapshot) => {
            this.handleActiveTokensUpdate(snapshot);
        });
    }
    
    // Listen to active assets on map
    listenToActiveAssets() {
        const room = this.authManager.getCurrentRoom();
        if (!room) return;
        
        this.activeAssetsListener = FirebaseHelper.listenToData(`rooms/${room}/assets`, (snapshot) => {
            this.handleActiveAssetsUpdate(snapshot);
        });
    }
    
    // Handle active tokens update
    handleActiveTokensUpdate(snapshot) {
        try {
            const tokensData = snapshot.val();
            this.activeTokens.clear();
            
            if (tokensData) {
                Object.entries(tokensData).forEach(([id, tokenData]) => {
                    if (tokenData && tokenData.id && tokenData.onMap) {
                        this.activeTokens.set(id, tokenData);
                    }
                });
            }
            
            this.updateActiveTokensDisplay();
            
        } catch (error) {
            console.error('❌ ERRORE aggiornamento token attivi:', error);
        }
    }
    
    // Handle active assets update
    handleActiveAssetsUpdate(snapshot) {
        try {
            const assetsData = snapshot.val();
            this.activeAssets.clear();
            
            if (assetsData) {
                Object.entries(assetsData).forEach(([id, assetData]) => {
                    if (assetData && assetData.id && assetData.onMap) {
                        this.activeAssets.set(id, assetData);
                    }
                });
            }
            
            this.updateActiveAssetsDisplay();
            
        } catch (error) {
            console.error('❌ ERRORE aggiornamento asset attivi:', error);
        }
    }
    
    // FIXED: Update active tokens display with collapsible tabs
    updateActiveTokensDisplay() {
        const libraryElement = document.getElementById('activeTokensLibrary');
        const countElement = document.getElementById('activeTokensCount');
        
        if (!libraryElement) return;
        
        const tokens = Array.from(this.activeTokens.values());
        
        if (countElement) {
            countElement.textContent = tokens.length.toString();
        }
        
        // FIXED: Create individual collapsible resources
        this.createIndividualCollapsibleResources(libraryElement, 'activeTokens', tokens, (token) => {
            return this.createActiveTokenElement(token);
        });
    }
    
    // FIXED: Update active assets display with collapsible tabs
    updateActiveAssetsDisplay() {
        const libraryElement = document.getElementById('activeAssetsLibrary');
        const countElement = document.getElementById('activeAssetsCount');
        
        if (!libraryElement) return;
        
        const assets = Array.from(this.activeAssets.values());
        
        if (countElement) {
            countElement.textContent = assets.length.toString();
        }
        
        // FIXED: Create individual collapsible resources
        this.createIndividualCollapsibleResources(libraryElement, 'activeAssets', assets, (asset) => {
            return this.createActiveAssetElement(asset);
        });
    }
    
    // FIXED: Create individual collapsible resources
    createIndividualCollapsibleResources(container, libraryId, items, createElementFn) {
        container.innerHTML = '';
        
        if (items.length === 0) {
            const noItemsDiv = document.createElement('div');
            noItemsDiv.className = 'no-assets';
            noItemsDiv.textContent = libraryId.includes('Token') ? 'Nessun token sulla mappa' : 'Nessun asset sulla mappa';
            container.appendChild(noItemsDiv);
            return;
        }
        
        // FIXED: Create individual collapsible items
        items.forEach(item => {
            const itemContainer = this.createCollapsibleResourceItem(item, createElementFn);
            container.appendChild(itemContainer);
        });
    }
    
    // FIXED: Create individual collapsible resource item
    createCollapsibleResourceItem(item, createElementFn) {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'collapsible-resource-item';
        itemContainer.style.cssText = `
            margin-bottom: 0.5rem;
            border: 1px solid #8b4513;
            border-radius: 6px;
            background: rgba(61, 39, 22, 0.4);
            overflow: hidden;
            transition: all 0.3s ease;
        `;
        
        const resourceId = item.id || item.name || Math.random().toString(36);
        const isCollapsed = this.collapsedResources.has(resourceId);
        
        // FIXED: Create header with resource name and toggle
        const header = document.createElement('div');
        header.className = 'resource-header';
        header.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            background: rgba(139, 69, 19, 0.2);
            transition: all 0.3s ease;
            border-bottom: ${isCollapsed ? 'none' : '1px solid #8b4513'};
        `;
        
        // Resource name with icon
        const nameSection = document.createElement('div');
        nameSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
            min-width: 0;
        `;
        
        const icon = document.createElement('span');
        icon.style.fontSize = '1rem';
        
        // Set icon based on item type
        if (item.type && item.type.includes('audio')) {
            icon.textContent = '🔊';
        } else if (item.type && item.type.includes('image')) {
            icon.textContent = '🖼️';
        } else if (item.url && item.url.includes('/map/')) {
            icon.textContent = '🗺️';
        } else if (item.url && item.url.includes('/token/')) {
            icon.textContent = '🎭';
        } else {
            icon.textContent = '📄';
        }
        
        const nameText = document.createElement('span');
        nameText.style.cssText = `
            color: #d4af37;
            font-weight: 600;
            font-size: 0.9rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        nameText.textContent = item.name || item.title || 'Risorsa senza nome';
        nameText.title = item.name || item.title || 'Risorsa senza nome';
        
        nameSection.appendChild(icon);
        nameSection.appendChild(nameText);
        
        // Toggle arrow
        const toggleArrow = document.createElement('span');
        toggleArrow.style.cssText = `
            color: #d4af37;
            font-size: 1rem;
            transition: transform 0.3s ease;
            transform: rotate(${isCollapsed ? '0' : '90'}deg);
            user-select: none;
        `;
        toggleArrow.textContent = '▶';
        
        header.appendChild(nameSection);
        header.appendChild(toggleArrow);
        
        // FIXED: Create content area
        const content = document.createElement('div');
        content.className = 'resource-content';
        content.style.cssText = `
            display: ${isCollapsed ? 'none' : 'block'};
            padding: 0.5rem;
            transition: all 0.3s ease;
        `;
        
        // Add the actual resource element
        const resourceElement = createElementFn(item);
        content.appendChild(resourceElement);
        
        // FIXED: Toggle functionality
        header.addEventListener('click', () => {
            this.toggleResourceCollapse(resourceId, toggleArrow, content);
        });
        
        // Hover effects
        header.addEventListener('mouseenter', () => {
            header.style.background = 'rgba(139, 69, 19, 0.4)';
        });
        
        header.addEventListener('mouseleave', () => {
            header.style.background = 'rgba(139, 69, 19, 0.2)';
        });
        
        itemContainer.appendChild(header);
        itemContainer.appendChild(content);
        
        return itemContainer;
    }
    
    // FIXED: Toggle individual resource collapse
    toggleResourceCollapse(resourceId, toggleArrow, content) {
        const isCollapsed = this.collapsedResources.has(resourceId);
        
        if (isCollapsed) {
            // Expand
            this.collapsedResources.delete(resourceId);
            content.style.display = 'block';
            toggleArrow.style.transform = 'rotate(90deg)';
            content.parentElement.querySelector('.resource-header').style.borderBottom = '1px solid #8b4513';
        } else {
            // Collapse
            this.collapsedResources.add(resourceId);
            content.style.display = 'none';
            toggleArrow.style.transform = 'rotate(0deg)';
            content.parentElement.querySelector('.resource-header').style.borderBottom = 'none';
        }
    }
    
    // Create active token element
    createActiveTokenElement(token) {
        const tokenDiv = document.createElement('div');
        tokenDiv.className = 'library-asset active-asset';
        tokenDiv.dataset.tokenId = token.id;
        
        const preview = document.createElement('div');
        preview.className = 'asset-preview';
        
        const img = document.createElement('img');
        img.src = token.url;
        img.alt = token.name;
        img.onerror = () => {
            preview.innerHTML = '🎭';
        };
        preview.appendChild(img);
        
        const visibilityIndicator = document.createElement('div');
        visibilityIndicator.className = `visibility-indicator ${token.visibleToPlayers ? 'visible' : 'hidden'}`;
        visibilityIndicator.textContent = token.visibleToPlayers ? '👁️' : '👁️‍🗨️';
        visibilityIndicator.title = token.visibleToPlayers ? 'Visibile ai giocatori' : 'Solo Master';
        preview.appendChild(visibilityIndicator);
        
        const info = document.createElement('div');
        info.className = 'asset-info';
        
        const tokenConfig = document.createElement('div');
        tokenConfig.className = 'token-config';
        
        const nameRow = document.createElement('div');
        nameRow.className = 'token-config-row';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'token-name-input';
        nameInput.value = token.name || 'Token';
        nameInput.addEventListener('change', () => this.updateTokenProperty(token.id, 'name', nameInput.value));
        
        nameRow.appendChild(nameInput);
        
        const propsRow = document.createElement('div');
        propsRow.className = 'token-config-row';
        
        const sizeSelect = document.createElement('select');
        sizeSelect.className = 'token-size-select';
        sizeSelect.innerHTML = `
            <option value="small" ${token.size === 'small' ? 'selected' : ''}>S</option>
            <option value="medium" ${token.size === 'medium' ? 'selected' : ''}>M</option>
            <option value="large" ${token.size === 'large' ? 'selected' : ''}>L</option>
        `;
        sizeSelect.addEventListener('change', () => this.updateTokenProperty(token.id, 'size', sizeSelect.value));
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'token-color-input';
        colorInput.value = token.color || '#ff6b6b';
        colorInput.addEventListener('change', () => this.updateTokenProperty(token.id, 'color', colorInput.value));
        
        // FIXED: Add toggle for token name visibility
        const nameToggle = document.createElement('button');
        nameToggle.className = 'name-toggle-btn';
        nameToggle.textContent = token.showName !== false ? '👁️' : '🚫';
        nameToggle.title = token.showName !== false ? 'Nascondi nome' : 'Mostra nome';
        nameToggle.style.cssText = `
            background: ${token.showName !== false ? '#32cd32' : '#8b0000'};
            color: white;
            border: none;
            border-radius: 3px;
            padding: 2px 6px;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.3s ease;
        `;
        nameToggle.addEventListener('click', () => {
            const newShowName = token.showName === false;
            this.updateTokenProperty(token.id, 'showName', newShowName);
            nameToggle.textContent = newShowName ? '👁️' : '🚫';
            nameToggle.title = newShowName ? 'Nascondi nome' : 'Mostra nome';
            nameToggle.style.background = newShowName ? '#32cd32' : '#8b0000';
        });
        
        propsRow.appendChild(sizeSelect);
        propsRow.appendChild(colorInput);
        propsRow.appendChild(nameToggle);
        
        tokenConfig.appendChild(nameRow);
        tokenConfig.appendChild(propsRow);
        info.appendChild(tokenConfig);
        
        const actions = document.createElement('div');
        actions.className = 'asset-actions';
        
        const visibilityBtn = this.createActionButton(
            token.visibleToPlayers ? '👁️' : '👁️‍🗨️',
            token.visibleToPlayers ? 'Nascondi ai giocatori' : 'Mostra ai giocatori',
            () => this.toggleTokenVisibilityOnMap(token.id),
            token.visibleToPlayers ? 'hide-players' : 'show-players'
        );
        actions.appendChild(visibilityBtn);
        
        const deleteBtn = this.createActionButton('🗑️', 'Rimuovi dalla mappa', () => this.removeTokenFromMap(token.id), 'delete');
        actions.appendChild(deleteBtn);
        
        tokenDiv.appendChild(preview);
        tokenDiv.appendChild(info);
        tokenDiv.appendChild(actions);
        
        return tokenDiv;
    }
    
    // Create active asset element
    createActiveAssetElement(asset) {
        const assetDiv = document.createElement('div');
        assetDiv.className = 'library-asset active-asset';
        assetDiv.dataset.assetId = asset.id;
        
        const preview = document.createElement('div');
        preview.className = 'asset-preview';
        
        const img = document.createElement('img');
        img.src = asset.url;
        img.alt = asset.name;
        img.onerror = () => {
            preview.innerHTML = '🖼️';
        };
        preview.appendChild(img);
        
        const visibilityIndicator = document.createElement('div');
        visibilityIndicator.className = `visibility-indicator ${asset.visibleToPlayers ? 'visible' : 'hidden'}`;
        visibilityIndicator.textContent = asset.visibleToPlayers ? '👁️' : '👁️‍🗨️';
        visibilityIndicator.title = asset.visibleToPlayers ? 'Visibile ai giocatori' : 'Solo Master';
        preview.appendChild(visibilityIndicator);
        
        const info = document.createElement('div');
        info.className = 'asset-info';
        
        // FIXED: Make asset name editable
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'asset-name-input';
        nameInput.value = asset.name || 'Asset';
        nameInput.addEventListener('change', () => this.renameActiveAsset(asset.id, nameInput.value));
        nameInput.addEventListener('blur', () => this.renameActiveAsset(asset.id, nameInput.value));
        
        info.appendChild(nameInput);
        
        const actions = document.createElement('div');
        actions.className = 'asset-actions';
        
        const visibilityBtn = this.createActionButton(
            asset.visibleToPlayers ? '👁️' : '👁️‍🗨️',
            asset.visibleToPlayers ? 'Nascondi ai giocatori' : 'Mostra ai giocatori',
            () => this.toggleAssetVisibilityOnMap(asset.id),
            asset.visibleToPlayers ? 'hide-players' : 'show-players'
        );
        actions.appendChild(visibilityBtn);
        
        const deleteBtn = this.createActionButton('🗑️', 'Rimuovi dalla mappa', () => this.removeAssetFromMap(asset.id), 'delete');
        actions.appendChild(deleteBtn);
        
        assetDiv.appendChild(preview);
        assetDiv.appendChild(info);
        assetDiv.appendChild(actions);
        
        return assetDiv;
    }
    
    // Handle asset library update
    handleAssetLibraryUpdate(assetType, snapshot) {
        try {
            const assetsData = snapshot.val();
            const assetMap = this.assets[assetType];
            
            assetMap.clear();
            
            if (assetsData) {
                Object.entries(assetsData).forEach(([id, assetData]) => {
                    if (assetData && assetData.id && assetData.url && assetData.name) {
                        assetMap.set(id, assetData);
                    }
                });
            }
            
            this.updateAssetLibraryDisplay(assetType);
            
        } catch (error) {
            console.error(`❌ ERRORE aggiornamento libreria ${assetType}:`, error);
        }
    }
    
    // FIXED: Update asset library display with collapsible tabs
    updateAssetLibraryDisplay(assetType) {
        const libraryId = `${assetType}Library`;
        const countId = `${assetType}Count`;
        
        const libraryElement = document.getElementById(libraryId);
        const countElement = document.getElementById(countId);
        
        if (!libraryElement) {
            console.error(`❌ ERRORE: Elemento libreria non trovato: ${libraryId}`);
            return;
        }
        
        const assetMap = this.assets[assetType];
        const assets = Array.from(assetMap.values());
        
        if (countElement) {
            countElement.textContent = assets.length.toString();
        }
        
        // FIXED: Create individual collapsible resources
        this.createIndividualCollapsibleResources(libraryElement, assetType, assets, (asset) => {
            return this.createAssetLibraryElement(assetType, asset);
        });
    }
    
    // FIXED: Create asset library element with proper image display
createAssetLibraryElement(assetType, asset) {
    const assetDiv = document.createElement('div');
    assetDiv.className = 'library-asset';
    assetDiv.dataset.assetId = asset.id;
    assetDiv.dataset.assetType = assetType;

    const preview = document.createElement('div');
    preview.className = 'asset-preview';

    // Nascondi preview per audio
    if (assetType === 'music' || assetType === 'sounds') {
        preview.style.display = 'none';
    } else {
        const img = document.createElement('img');
        img.src = asset.url;
        img.alt = asset.name;
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
        `;
        img.onerror = () => {
            preview.textContent = assetType === 'maps'   ? '🗺️'
                                 : assetType === 'tokens' ? '🎭'
                                                          : '🖼️';
        };
        preview.appendChild(img);
    }

    // Indicatore di visibilità (solo per maps)
    if (assetType === 'maps') {
        const visibilityIndicator = document.createElement('div');
        visibilityIndicator.className = `visibility-indicator ${asset.visibleToPlayers ? 'visible' : 'hidden'}`;
        visibilityIndicator.textContent = asset.visibleToPlayers ? '👁️' : '👁️‍🗨️';
        visibilityIndicator.title = asset.visibleToPlayers ? 'Visibile ai giocatori' : 'Solo Master';
        preview.appendChild(visibilityIndicator);
    }

    const info = document.createElement('div');
    info.className = 'asset-info';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'asset-name-input';
    nameInput.value = asset.name || 'Asset senza nome';
    nameInput.addEventListener('change', () => this.renameAsset(assetType, asset.id, nameInput.value));
    nameInput.addEventListener('blur',   () => this.renameAsset(assetType, asset.id, nameInput.value));
    info.appendChild(nameInput);

    const actions = document.createElement('div');
    actions.className = 'asset-actions';

    if (assetType === 'maps') {
        // Unico pulsante statico per carica/rimuovi
        const toggleMapBtn = this.createActionButton(
            '🗺️',
            'Carica/Rimuovi Mappa',
            () => this.toggleMap(asset)
        );
        actions.appendChild(toggleMapBtn);

    } else if (assetType === 'tokens') {
        const addBtn = this.createActionButton('➕', 'Aggiungi alla Mappa', () => this.addTokenToMap(asset));
        actions.appendChild(addBtn);

    } else if (assetType === 'assets') {
        const addBtn = this.createActionButton('➕', 'Aggiungi alla Mappa', () => this.addAssetToMap(asset));
        actions.appendChild(addBtn);

    } else if (assetType === 'music' || assetType === 'sound') {
        const playBtn = this.createActionButton('▶️', 'Riproduci', () => this.playMusic(asset));
        actions.appendChild(playBtn);
    }

    // Pulsante elimina sempre disponibile
    const deleteBtn = this.createActionButton('🗑️', 'Elimina', () => this.deleteAsset(assetType, asset), 'delete');
    actions.appendChild(deleteBtn);

    assetDiv.appendChild(preview);
    assetDiv.appendChild(info);
    assetDiv.appendChild(actions);
    return assetDiv;
}

    
    // FIXED: Rename active asset on map
    async renameActiveAsset(assetId, newName) {
        if (!this.authManager.isMaster()) return;
        if (!newName.trim()) return;
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.updateData(`rooms/${room}/assets/${assetId}`, {
                name: newName.trim(),
                lastModified: FirebaseHelper.getTimestamp()
            });
            
            console.log('✅ Asset sulla mappa rinominato:', assetId, newName);
            
        } catch (error) {
            console.error('❌ ERRORE rinomina asset sulla mappa:', error);
        }
    }
    
    // FIXED: Toggle map (load/unload)
    async toggleMap(mapAsset) {
        if (!this.authManager.isMaster()) return;
        
        const currentMap = this.mapSystem.getCurrentMap();
        const isCurrentMap = currentMap && currentMap.id === mapAsset.id;
        
        if (isCurrentMap) {
            // Unload current map
            await this.unloadMap();
        } else {
            // Load new map
            await this.loadMap(mapAsset);
        }
    }
    
    // FIXED: Unload current map
    async unloadMap() {
        if (!this.authManager.isMaster()) return;
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            // Remove current map
            await FirebaseHelper.removeData(`rooms/${room}/map`);
            
            console.log('✅ Mappa rimossa dalla finestra di gioco');
            
        } catch (error) {
            console.error('❌ ERRORE rimozione mappa:', error);
        }
    }
    
    // Rename asset
    async renameAsset(assetType, assetId, newName) {
        if (!this.authManager.isMaster()) return;
        if (!newName.trim()) return;
        
        const room = this.authManager.getCurrentRoom();
        const singularType = assetType === 'music' ? 'music' : assetType.slice(0, -1);
        
        try {
            const updateData = {
                name: newName.trim(),
                lastModified: FirebaseHelper.getTimestamp()
            };
            
            if (assetType === 'music') {
                updateData.title = newName.trim();
            }
            
            await FirebaseHelper.updateData(`rooms/${room}/assets/${singularType}/${assetId}`, updateData);
            
        } catch (error) {
            console.error('❌ ERRORE rinomina asset:', error);
        }
    }
    
    // FIXED: Toggle map visibility with proper Firebase update
    async toggleMapVisibility(mapId) {
        if (!this.authManager.isMaster()) return;
        
        const room = this.authManager.getCurrentRoom();
        const mapAsset = this.assets.maps.get(mapId);
        
        if (!mapAsset) {
            console.error('❌ ERRORE: Mappa non trovata per toggle visibilità:', mapId);
            return;
        }
        
        const newVisibility = !mapAsset.visibleToPlayers;
        
        try {
            // Update in asset library
            await FirebaseHelper.updateData(`rooms/${room}/assets/map/${mapId}`, {
                visibleToPlayers: newVisibility,
                lastModified: FirebaseHelper.getTimestamp()
            });
            
            // FIXED: Update current map visibility if this is the loaded map
            const currentMap = this.mapSystem.getCurrentMap();
            if (currentMap && currentMap.id === mapId) {
                // Update the current map data with new visibility
                const updatedMapData = {
                    ...currentMap,
                    visibleToPlayers: newVisibility,
                    lastModified: FirebaseHelper.getTimestamp()
                };
                
                await FirebaseHelper.setData(`rooms/${room}/map`, updatedMapData);
                console.log('✅ Visibilità mappa corrente aggiornata:', newVisibility);
            }
            
            console.log('✅ Visibilità mappa aggiornata:', mapId, newVisibility ? 'visibile' : 'nascosta');
            
        } catch (error) {
            console.error('❌ ERRORE aggiornamento visibilità mappa:', error);
        }
    }
    
    // Toggle token visibility on map
    async toggleTokenVisibilityOnMap(tokenId) {
        if (!this.authManager.isMaster()) return;
        await this.tokenSystem.toggleTokenVisibility(tokenId);
    }
    
    // Toggle asset visibility on map
    async toggleAssetVisibilityOnMap(assetId) {
        if (!this.authManager.isMaster()) return;
        await this.assetSystem.toggleAssetVisibility(assetId);
    }
    
    // Update token property
    async updateTokenProperty(tokenId, property, value) {
        if (!this.authManager.isMaster()) return;
        await this.tokenSystem.updateTokenProperty(tokenId, property, value);
    }
    
    // Remove token from map
    async removeTokenFromMap(tokenId) {
        if (!this.authManager.isMaster()) return;
        
        if (!confirm('Rimuovere questo token dalla mappa?')) return;
        
        await this.tokenSystem.deleteTokenFromMap(tokenId);
    }
    
    // Remove asset from map
    async removeAssetFromMap(assetId) {
        if (!this.authManager.isMaster()) return;
        
        if (!confirm('Rimuovere questo asset dalla mappa?')) return;
        
        await this.assetSystem.deleteAssetFromMap(assetId);
    }
    
    // Create action button
    createActionButton(icon, title, onClick, className = '') {
        const button = document.createElement('button');
        button.className = `asset-action-btn ${className}`;
        button.textContent = icon;
        button.title = title;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return button;
    }
    
    // FIXED: Load map with proper visibility handling
    async loadMap(mapAsset) {
        if (!this.authManager.isMaster()) return;
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            const mapData = {
                id: mapAsset.id,
                name: mapAsset.name,
                url: mapAsset.url,
                filename: mapAsset.filename,
                visibleToPlayers: mapAsset.visibleToPlayers || false, // FIXED: Include visibility
                loadedBy: this.authManager.getCurrentUser().name,
                timestamp: FirebaseHelper.getTimestamp()
            };
            
            await FirebaseHelper.setData(`rooms/${room}/map`, mapData);
            
            console.log('✅ Mappa caricata con visibilità:', mapAsset.name, mapData.visibleToPlayers);
            
        } catch (error) {
            console.error('❌ ERRORE caricamento mappa:', error);
        }
    }
    
    // Add token to map
    async addTokenToMap(tokenAsset) {
        if (!this.authManager.isMaster()) return;
        
        try {
            await this.tokenSystem.addTokenToMap(tokenAsset, {
                name: tokenAsset.name,
                size: 'small',
                color: '#ff6b6b'
            });
            
        } catch (error) {
            console.error('❌ ERRORE aggiunta token:', error);
        }
    }
    
    // Add asset to map
    async addAssetToMap(asset) {
        if (!this.authManager.isMaster()) return;
        
        try {
            await this.assetSystem.addAssetToMap(asset, {
                name: asset.name,
                scale: 1,
                rotation: 0
            });
            
        } catch (error) {
            console.error('❌ ERRORE aggiunta asset:', error);
        }
    }
    
    // Play music
    async playMusic(musicAsset) {
        if (!this.authManager.isMaster()) return;
        
        try {
            await this.musicSystem.selectTrackById(musicAsset.id);
            
        } catch (error) {
            console.error('❌ ERRORE selezione musica:', error);
        }
    }
    
    // Delete asset
    async deleteAsset(assetType, asset) {
        if (!this.authManager.isMaster()) return;
        
        const confirmed = await modalSystem.confirm(
            `Sei sicuro di voler eliminare "${asset.name}"?`,
            'Elimina Asset',
            {
                icon: '🗑️',
                confirmText: 'Sì, elimina',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) {
            return;
        }
        
        const room = this.authManager.getCurrentRoom();
        const singularType = assetType === 'music' ? 'music' : assetType.slice(0, -1);
        
        try {
            const deleteResponse = await fetch('php/delete.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: asset.filename,
                    room: room,
                    type: singularType
                })
            });
            
            const deleteResult = await deleteResponse.json();
            if (!deleteResult.success) {
                console.warn('⚠️ Errore eliminazione file server:', deleteResult.error);
            }
            
            await FirebaseHelper.removeData(`rooms/${room}/assets/${singularType}/${asset.id}`);
            
        } catch (error) {
            console.error('❌ ERRORE eliminazione asset:', error);
        }
    }
    
    // Clear tokens
    async clearTokens() {
        if (!this.authManager.isMaster()) return;
        
        const confirmed = await modalSystem.confirm(
            'Sei sicuro di voler rimuovere tutti i token dalla mappa?',
            'Rimuovi Tutti i Token',
            {
                icon: '🎭',
                confirmText: 'Sì, rimuovi',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            await this.tokenSystem.clearAllTokens();
        } catch (error) {
            console.error('❌ ERRORE pulizia token:', error);
        }
    }
    
    // Clear all assets and resources
    async clearAll() {
        if (!this.authManager.isMaster()) return;
        
        const confirmed = await modalSystem.confirm(
            'Sei sicuro di voler eliminare TUTTE le risorse? Questa azione non può essere annullata!',
            'Elimina Tutte le Risorse',
            {
                icon: '💥',
                confirmText: 'Sì, elimina tutto',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) {
            return;
        }
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.removeData(`rooms/${room}/assets`);
            await FirebaseHelper.removeData(`rooms/${room}/map`);
            await FirebaseHelper.removeData(`rooms/${room}/tokens`);
            await FirebaseHelper.removeData(`rooms/${room}/messages`);
            await FirebaseHelper.removeData(`rooms/${room}/diceRolls`);
            
            const assetTypes = ['map', 'token', 'asset', 'music', 'sound'];
            for (const type of assetTypes) {
                try {
                    await fetch('php/delete.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            filename: '*',
                            room: room,
                            type: type
                        })
                    });
                } catch (error) {
                    console.warn(`⚠️ Errore pulizia ${type} dal server:`, error);
                }
            }
            
        } catch (error) {
            console.error('❌ ERRORE eliminazione risorse:', error);
        }
    }
    
    // Clear chat
    async clearChat() {
        if (!this.authManager.isMaster()) return;
        
        const confirmed = await modalSystem.confirm(
            'Sei sicuro di voler cancellare tutta la chat?',
            'Cancella Chat',
            {
                icon: '💬',
                confirmText: 'Sì, cancella',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            await this.chatSystem.clearChat();
        } catch (error) {
            console.error('❌ ERRORE cancellazione chat:', error);
        }
    }
    
    // Toggle panel
    togglePanel() {
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }
    
    // Open panel
    openPanel() {
        if (!this.authManager.isMaster()) return;

        const panel = document.getElementById('masterPanel');
        if (panel) {
            setTimeout(() => {
                panel.classList.add('panel-open');
            }, 10);
            this.isOpen = true;
        }
    }
    
    // Close panel
    closePanel() {
        const panel = document.getElementById('masterPanel');
        if (panel) {
            panel.classList.remove('panel-open');
            this.isOpen = false;
        }
    }
    
    // Update visibility based on user role
    updateVisibility() {
        const isMaster = this.authManager.isMaster();
        const masterPanelBtn = document.getElementById('masterPanelBtn');
        
        if (masterPanelBtn) {
            masterPanelBtn.style.display = isMaster ? 'block' : 'none';
        }
        
        if (!isMaster && this.isOpen) {
            this.closePanel();
        }
    }
    
    // Cleanup
    cleanup() {
        this.assetsListeners.forEach((listener, type) => {
            FirebaseHelper.stopListening(listener);
        });
        this.assetsListeners.clear();
        
        if (this.activeTokensListener) {
            FirebaseHelper.stopListening(this.activeTokensListener);
            this.activeTokensListener = null;
        }
        
        if (this.activeAssetsListener) {
            FirebaseHelper.stopListening(this.activeAssetsListener);
            this.activeAssetsListener = null;
        }
        
        Object.values(this.assets).forEach(assetMap => assetMap.clear());
        this.activeTokens.clear();
        this.activeAssets.clear();
        
        this.closePanel();
    }
}

export default MasterPanel;