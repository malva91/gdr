// Character Sheet System - FIXED: Logica doppio click e duplicazione corretta
import FirebaseHelper from './firebase.js?v.100';
import { modalSystem } from './modal-system.js?v.100';

export class CharacterSheetSystem {
    constructor(authManager) {
        this.authManager = authManager;
        this.currentSheets = new Map();
        this.activeSheetId = null;
        this.textBoxes = new Map();
        this.currentEditingTextBox = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isDraggingTextBox = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.sheetListener = null;
        this.textBoxListener = null;
        this.minZoom = 0.5;
        this.maxZoom = 3;
        
        // FIXED: Sistema drag ultra-smooth per text box
        this.draggedTextBox = null;
        this.dragStartPos = { x: 0, y: 0 };
        this.textBoxStartPos = { x: 0, y: 0 };
        this.clickStartTime = 0;
        this.dragThreshold = 3;
        this.animationFrame = null;
        this.isPointerDown = false;
        this.currentPointer = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.currentPosition = { x: 0, y: 0 };
        this.smoothingFactor = 0.85;
        
        // FIXED: Gestione doppio click
        this.lastClickTime = 0;
        this.lastClickTarget = null;
        this.doubleClickDelay = 300;
        
        // FIXED: Menu di editing
        this.editMenu = null;
        this.isEditMenuOpen = false;
    }
    
    // Initialize character sheet system
    init() {
        console.log('📋 Inizializzazione sistema schede personaggio...');
        this.setupEventListeners();
        this.createEditMenu();
        this.listenToSheetData();
        this.startSmoothUpdateLoop();
    }
    
    // Start smooth update loop
    startSmoothUpdateLoop() {
        const updateLoop = () => {
            if (this.isDraggingTextBox && this.draggedTextBox) {
                this.updateTextBoxPositionSmooth();
            }
            this.animationFrame = requestAnimationFrame(updateLoop);
        };
        updateLoop();
    }
    
    // FIXED: Crea menu di editing compatto e funzionale
    createEditMenu() {
        // Rimuovi menu esistente se presente
        const existingMenu = document.getElementById('textEditMenu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        this.editMenu = document.createElement('div');
        this.editMenu.id = 'textEditMenu';
        this.editMenu.className = 'text-edit-menu';
        this.editMenu.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 280px;
            background: linear-gradient(135deg, #3d2716 0%, #2c1810 100%);
            border: 2px solid #8b4513;
            border-radius: 12px;
            padding: 1rem;
            z-index: 10000;
            display: none;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            font-family: 'Cinzel', serif;
            color: #d4af37;
        `;
        
        this.editMenu.innerHTML = `
            <div class="edit-menu-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid #8b4513;
            ">
                <h4 style="margin: 0; color: #d4af37; font-size: 1rem;">📝 Modifica Testo</h4>
                <button id="closeEditMenu" style="
                    background: none;
                    border: none;
                    color: #d4af37;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='rgba(212,175,55,0.2)'" onmouseout="this.style.background='none'">✕</button>
            </div>
            
            <div class="edit-form">
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #cd853f;">Testo:</label>
                    <textarea id="editTextContent" rows="2" style="
                        width: 100%;
                        padding: 0.5rem;
                        background: rgba(44, 24, 16, 0.8);
                        border: 1px solid #8b4513;
                        border-radius: 6px;
                        color: #d4af37;
                        font-family: 'Cinzel', serif;
                        resize: vertical;
                        min-height: 60px;
                    " placeholder="Inserisci il testo..."></textarea>
                </div>
                
                <div class="form-row" style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                ">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.8rem; color: #cd853f;">Dimensione:</label>
                        <input type="number" id="editFontSize" min="8" max="72" value="12" style="
                            width: 100%;
                            padding: 0.4rem;
                            background: rgba(44, 24, 16, 0.8);
                            border: 1px solid #8b4513;
                            border-radius: 4px;
                            color: #d4af37;
                            font-family: 'Cinzel', serif;
                        ">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.8rem; color: #cd853f;">Peso:</label>
                        <select id="editFontWeight" style="
                            width: 100%;
                            padding: 0.4rem;
                            background: rgba(44, 24, 16, 0.8);
                            border: 1px solid #8b4513;
                            border-radius: 4px;
                            color: #d4af37;
                            font-family: 'Cinzel', serif;
                        ">
                            <option value="normal">Normale</option>
                            <option value="bold">Grassetto</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row" style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                ">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.8rem; color: #cd853f;">Colore Testo:</label>
                        <input type="color" id="editTextColor" value="#000000" style="
                            width: 100%;
                            height: 35px;
                            border: 1px solid #8b4513;
                            border-radius: 4px;
                            cursor: pointer;
                        ">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.8rem; color: #cd853f;">Sfondo:</label>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="color" id="editBgColor" value="#ffffff" style="
                                width: 60px;
                                height: 35px;
                                border: 1px solid #8b4513;
                                border-radius: 4px;
                                cursor: pointer;
                            ">
                            <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: #cd853f;">
                                <input type="checkbox" id="editBgTransparent" checked style="accent-color: #d4af37;">
                                Trasp.
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="form-row" style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                ">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.8rem; color: #cd853f;">Bordo:</label>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="color" id="editBorderColor" value="#8b4513" style="
                                width: 60px;
                                height: 35px;
                                border: 1px solid #8b4513;
                                border-radius: 4px;
                                cursor: pointer;
                            ">
                            <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: #cd853f;">
                                <input type="checkbox" id="editBorderTransparent" style="accent-color: #d4af37;">
                                Trasp.
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.8rem; color: #cd853f;">Spessore:</label>
                        <input type="number" id="editBorderWidth" min="0" max="10" value="0" style="
                            width: 100%;
                            padding: 0.4rem;
                            background: rgba(44, 24, 16, 0.8);
                            border: 1px solid #8b4513;
                            border-radius: 4px;
                            color: #d4af37;
                            font-family: 'Cinzel', serif;
                        ">
                    </div>
                </div>
                
                <div class="form-actions" style="
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                ">
                    <button id="saveTextEdit" style="
                        flex: 1;
                        padding: 0.6rem;
                        background: linear-gradient(135deg, #32cd32 0%, #228b22 100%);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-family: 'Cinzel', serif;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-size: 0.85rem;
                    ">💾 Salva</button>
                    <button id="duplicateTextEdit" style="
                        flex: 1;
                        padding: 0.6rem;
                        background: linear-gradient(135deg, #4169e1 0%, #1e90ff 100%);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-family: 'Cinzel', serif;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-size: 0.85rem;
                    ">📋 Duplica</button>
                    <button id="deleteTextEdit" style="
                        flex: 1;
                        padding: 0.6rem;
                        background: linear-gradient(135deg, #dc143c 0%, #8b0000 100%);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-family: 'Cinzel', serif;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-size: 0.85rem;
                    ">🗑️ Elimina</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.editMenu);
        this.setupEditMenuEvents();
    }
    
    // FIXED: Setup eventi menu di editing
    setupEditMenuEvents() {
        const closeBtn = document.getElementById('closeEditMenu');
        const saveBtn = document.getElementById('saveTextEdit');
        const duplicateBtn = document.getElementById('duplicateTextEdit');
        const deleteBtn = document.getElementById('deleteTextEdit');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeEditMenu());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveTextEdit());
        if (duplicateBtn) duplicateBtn.addEventListener('click', () => this.duplicateTextEdit());
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteTextEdit());
        
        // FIXED: Input events per preview in tempo reale
        const inputs = ['editTextContent', 'editFontSize', 'editFontWeight', 'editTextColor', 'editBgColor', 'editBgTransparent', 'editBorderColor', 'editBorderTransparent', 'editBorderWidth'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => this.updateTextBoxPreview());
                input.addEventListener('change', () => this.updateTextBoxPreview());
            }
        });
        
        // Chiudi menu con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isEditMenuOpen) {
                this.closeEditMenu();
            }
        });
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Sheet controls
        const loadSheetBtn = document.getElementById('loadSheetBtn');
        const removeSheetBtn = document.getElementById('removeSheetBtn');
        const addTextBtn = document.getElementById('addTextBtn');
        const clearTextsBtn = document.getElementById('clearTextsBtn');
        const resetSheetZoomBtn = document.getElementById('resetSheetZoomBtn');
        
        if (loadSheetBtn) loadSheetBtn.addEventListener('click', () => this.loadSheet());
        if (removeSheetBtn) removeSheetBtn.addEventListener('click', () => this.removeSheet());
        if (addTextBtn) addTextBtn.addEventListener('click', () => this.addTextBox());
        if (clearTextsBtn) clearTextsBtn.addEventListener('click', () => this.clearAllTexts());
        if (resetSheetZoomBtn) resetSheetZoomBtn.addEventListener('click', () => this.resetZoom());
        
        // Sheet viewer interactions
        const sheetViewer = document.getElementById('sheetViewer');
        if (sheetViewer) {
            // Pan functionality
            sheetViewer.addEventListener('mousedown', (e) => this.handleSheetMouseDown(e));
            
            // Zoom functionality
            sheetViewer.addEventListener('wheel', (e) => this.handleZoom(e));
            
            // FIXED: Doppio click per aggiungere testo
            sheetViewer.addEventListener('click', (e) => this.handleSheetClick(e));
        }
        
        // Global mouse events
        document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleGlobalMouseUp(e));
        
        // File input
        const sheetFileInput = document.getElementById('sheetFileInput');
        if (sheetFileInput) {
            sheetFileInput.addEventListener('change', (e) => this.handleSheetUpload(e));
        }
    }
    
    // FIXED: Gestione click sulla scheda (doppio click per aggiungere testo)
    handleSheetClick(event) {
        const currentTime = Date.now();
        const timeDiff = currentTime - this.lastClickTime;
        
        // Se è un click su text box, gestisci editing
        if (event.target.classList.contains('text-box')) {
            this.handleTextBoxClick(event);
            return;
        }
        
        // Se è doppio click sulla scheda, aggiungi testo
        if (timeDiff < this.doubleClickDelay && this.lastClickTarget === event.target) {
            this.handleDoubleClick(event);
        }
        
        this.lastClickTime = currentTime;
        this.lastClickTarget = event.target;
    }
    
    // FIXED: Gestione click su text box (apre menu editing)
    handleTextBoxClick(event) {
        if (this.isDraggingTextBox) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const textBoxId = event.target.dataset.textId;
        if (textBoxId) {
            this.openEditMenu(textBoxId);
        }
    }
    
    // FIXED: Gestione doppio click per aggiungere testo
    handleDoubleClick(event) {
        if (!this.activeSheetId || !this.currentSheets.has(this.activeSheetId)) return;
        if (this.isDraggingTextBox) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const sheetContainer = document.getElementById('sheetContainer');
        const rect = sheetContainer.getBoundingClientRect();
        
        const x = (event.clientX - rect.left - this.panX) / this.zoom;
        const y = (event.clientY - rect.top - this.panY) / this.zoom;
        
        this.createNewTextBox(x, y);
    }
    
    // FIXED: Crea nuova text box
    async createNewTextBox(x, y) {
        if (!this.activeSheetId) return;
        
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        const textBoxData = {
            id: FirebaseHelper.generateUserId(),
            sheetId: this.activeSheetId,
            text: 'Nuovo testo',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',
            bgColor: '#ffffff',
            bgTransparent: true,
            borderColor: '#8b4513',
            borderTransparent: true,
            borderWidth: 0,
            x: x,
            y: y,
            timestamp: FirebaseHelper.getTimestamp()
        };
        
        try {
            await FirebaseHelper.setData(`rooms/${room}/characterSheetTexts/${user.id}/${this.activeSheetId}/${textBoxData.id}`, textBoxData);
            
            // Apri subito il menu di editing per la nuova text box
            setTimeout(() => {
                this.openEditMenu(textBoxData.id);
            }, 100);
            
            console.log('✅ Nuova text box creata:', textBoxData.id);
        } catch (error) {
            console.error('❌ ERRORE creazione text box:', error);
        }
    }
    
    // FIXED: Apri menu di editing
    openEditMenu(textBoxId) {
        if (!textBoxId || !this.textBoxes.has(textBoxId)) return;
        
        this.currentEditingTextBox = textBoxId;
        const textBox = this.textBoxes.get(textBoxId);
        
        // Popola il form con i dati della text box
        document.getElementById('editTextContent').value = textBox.text || '';
        document.getElementById('editFontSize').value = textBox.fontSize || 12;
        document.getElementById('editFontWeight').value = textBox.fontWeight || 'normal';
        document.getElementById('editTextColor').value = textBox.textColor || '#000000';
        document.getElementById('editBgColor').value = textBox.bgColor || '#ffffff';
        document.getElementById('editBgTransparent').checked = textBox.bgTransparent !== false;
        document.getElementById('editBorderColor').value = textBox.borderColor || '#8b4513';
        document.getElementById('editBorderTransparent').checked = textBox.borderTransparent === true;
        document.getElementById('editBorderWidth').value = textBox.borderWidth || 0;
        
        // Evidenzia la text box in editing
        this.highlightEditingTextBox(textBoxId);
        
        // Mostra il menu
        this.editMenu.style.display = 'block';
        this.isEditMenuOpen = true;
        
        // Focus sul campo testo
        setTimeout(() => {
            document.getElementById('editTextContent').focus();
        }, 100);
        
        console.log('📝 Menu editing aperto per:', textBoxId);
    }
    
    // FIXED: Chiudi menu di editing
    closeEditMenu() {
        this.editMenu.style.display = 'none';
        this.isEditMenuOpen = false;
        this.currentEditingTextBox = null;
        
        // Rimuovi evidenziazione
        this.removeEditingHighlight();
        
        console.log('❌ Menu editing chiuso');
    }
    
    // FIXED: Evidenzia text box in editing
    highlightEditingTextBox(textBoxId) {
        // Rimuovi evidenziazione precedente
        this.removeEditingHighlight();
        
        const textBoxElement = document.querySelector(`[data-text-id="${textBoxId}"]`);
        if (textBoxElement) {
            textBoxElement.style.outline = '2px solid #d4af37';
            textBoxElement.style.outlineOffset = '2px';
            textBoxElement.classList.add('editing');
        }
    }
    
    // Rimuovi evidenziazione
    removeEditingHighlight() {
        const editingElements = document.querySelectorAll('.text-box.editing');
        editingElements.forEach(el => {
            el.style.outline = '';
            el.style.outlineOffset = '';
            el.classList.remove('editing');
        });
    }
    
    // FIXED: Aggiorna preview text box in tempo reale
    updateTextBoxPreview() {
        if (!this.currentEditingTextBox) return;
        
        const textBoxElement = document.querySelector(`[data-text-id="${this.currentEditingTextBox}"]`);
        if (!textBoxElement) return;
        
        const text = document.getElementById('editTextContent').value;
        const fontSize = document.getElementById('editFontSize').value;
        const fontWeight = document.getElementById('editFontWeight').value;
        const textColor = document.getElementById('editTextColor').value;
        const bgColor = document.getElementById('editBgColor').value;
        const bgTransparent = document.getElementById('editBgTransparent').checked;
        const borderColor = document.getElementById('editBorderColor').value;
        const borderTransparent = document.getElementById('editBorderTransparent').checked;
        const borderWidth = document.getElementById('editBorderWidth').value;
        
        // Applica le modifiche visivamente
        textBoxElement.textContent = text;
        textBoxElement.style.fontSize = fontSize + 'px';
        textBoxElement.style.fontWeight = fontWeight;
        textBoxElement.style.color = textColor;
        textBoxElement.style.backgroundColor = bgTransparent ? 'transparent' : bgColor;
        textBoxElement.style.border = borderTransparent || borderWidth == 0 ? 'none' : `${borderWidth}px solid ${borderColor}`;
    }
    
    // FIXED: Salva modifiche text box
    async saveTextEdit() {
        if (!this.currentEditingTextBox || !this.activeSheetId) return;
        
        const text = document.getElementById('editTextContent').value.trim();
        if (!text) {
            await modalSystem.alert('Inserisci del testo prima di salvare.', 'Testo Vuoto', { icon: '⚠️' });
            return;
        }
        
        const textBoxData = {
            text: text,
            fontSize: parseInt(document.getElementById('editFontSize').value) || 12,
            fontWeight: document.getElementById('editFontWeight').value,
            textColor: document.getElementById('editTextColor').value,
            bgColor: document.getElementById('editBgColor').value,
            bgTransparent: document.getElementById('editBgTransparent').checked,
            borderColor: document.getElementById('editBorderColor').value,
            borderTransparent: document.getElementById('editBorderTransparent').checked,
            borderWidth: parseInt(document.getElementById('editBorderWidth').value) || 0,
            lastModified: FirebaseHelper.getTimestamp()
        };
        
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        try {
            await FirebaseHelper.updateData(`rooms/${room}/characterSheetTexts/${user.id}/${this.activeSheetId}/${this.currentEditingTextBox}`, textBoxData);
            console.log('✅ Text box salvata:', this.currentEditingTextBox);
            this.closeEditMenu();
        } catch (error) {
            console.error('❌ ERRORE salvataggio text box:', error);
            await modalSystem.alert('Errore durante il salvataggio del testo.', 'Errore', { icon: '❌' });
        }
    }
    
    // FIXED: Duplica text box (crea una copia reale)
    async duplicateTextEdit() {
        if (!this.currentEditingTextBox || !this.activeSheetId) return;
        
        const originalTextBox = this.textBoxes.get(this.currentEditingTextBox);
        if (!originalTextBox) return;
        
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        // FIXED: Crea una copia reale con dati dal form corrente
        const duplicateData = {
            id: FirebaseHelper.generateUserId(),
            sheetId: this.activeSheetId,
            text: document.getElementById('editTextContent').value,
            fontSize: parseInt(document.getElementById('editFontSize').value) || 12,
            fontWeight: document.getElementById('editFontWeight').value,
            textColor: document.getElementById('editTextColor').value,
            bgColor: document.getElementById('editBgColor').value,
            bgTransparent: document.getElementById('editBgTransparent').checked,
            borderColor: document.getElementById('editBorderColor').value,
            borderTransparent: document.getElementById('editBorderTransparent').checked,
            borderWidth: parseInt(document.getElementById('editBorderWidth').value) || 0,
            x: originalTextBox.x + 20, // Offset per distinguere la copia
            y: originalTextBox.y + 20,
            timestamp: FirebaseHelper.getTimestamp()
        };
        
        try {
            await FirebaseHelper.setData(`rooms/${room}/characterSheetTexts/${user.id}/${this.activeSheetId}/${duplicateData.id}`, duplicateData);
            console.log('✅ Text box duplicata:', duplicateData.id);
            
            // Chiudi il menu corrente e apri per la nuova text box
            this.closeEditMenu();
            setTimeout(() => {
                this.openEditMenu(duplicateData.id);
            }, 200);
            
        } catch (error) {
            console.error('❌ ERRORE duplicazione text box:', error);
            await modalSystem.alert('Errore durante la duplicazione del testo.', 'Errore', { icon: '❌' });
        }
    }
    
    // FIXED: Elimina text box
    async deleteTextEdit() {
        if (!this.currentEditingTextBox || !this.activeSheetId) return;
        
        const confirmed = await modalSystem.confirm(
            'Sei sicuro di voler eliminare questo testo?',
            'Elimina Testo',
            {
                icon: '📝',
                confirmText: 'Sì, elimina',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) return;
        
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        try {
            await FirebaseHelper.removeData(`rooms/${room}/characterSheetTexts/${user.id}/${this.activeSheetId}/${this.currentEditingTextBox}`);
            console.log('✅ Text box eliminata:', this.currentEditingTextBox);
            this.closeEditMenu();
        } catch (error) {
            console.error('❌ ERRORE eliminazione text box:', error);
        }
    }
    
    // Open character sheet modal
    openCharacterSheetModal() {
        const modal = document.getElementById('characterSheetModal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateSheetDisplay();
        }
    }
    
    // Close character sheet modal
    closeCharacterSheetModal() {
        const modal = document.getElementById('characterSheetModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.closeEditMenu(); // Chiudi anche il menu di editing
    }
    
    // Load sheet
    loadSheet() {
        const fileInput = document.getElementById('sheetFileInput');
        if (fileInput) {
            fileInput.click();
        }
    }
    
    // Handle sheet upload
    async handleSheetUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            await modalSystem.alert(
                'Tipo file non supportato. Usa PNG, JPG o WebP.',
                'Errore Formato File',
                { icon: '❌' }
            );
            return;
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            await modalSystem.alert(
                'File troppo grande. Massimo 10MB per le schede.',
                'File Troppo Grande',
                { icon: '⚠️' }
            );
            return;
        }
        
        const loadingModal = modalSystem.loading('Caricamento scheda...', 'Upload');
        
        try {
            const formData = new FormData();
            formData.append('sheet', file);
            formData.append('room', this.authManager.getCurrentRoom());
            formData.append('type', 'sheet');
            
            const response = await fetch('php/upload.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.saveSheetToDatabase({
                    filename: result.filename,
                    originalName: file.name,
                    url: result.url,
                    size: result.size,
                    type: result.type
                });
                
                console.log('✅ Scheda caricata:', file.name);
                
            } else {
                throw new Error(result.error || 'Errore upload');
            }
            
        } catch (error) {
            console.error('❌ ERRORE upload scheda:', error);
            await modalSystem.alert(
                'Errore durante il caricamento della scheda: ' + error.message,
                'Errore Upload',
                { icon: '❌' }
            );
        } finally {
            loadingModal.close();
            event.target.value = '';
        }
    }
    
    // Save sheet to database
    async saveSheetToDatabase(fileData) {
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        const sheetId = FirebaseHelper.generateUserId();
        
        const sheetData = {
            id: sheetId,
            filename: fileData.filename,
            originalName: fileData.originalName,
            name: fileData.originalName.replace(/\.[^/.]+$/, ''),
            url: fileData.url,
            size: fileData.size,
            type: fileData.type,
            uploadedBy: user.name,
            userId: user.id,
            timestamp: FirebaseHelper.getTimestamp()
        };
        
        try {
            await FirebaseHelper.setData(`rooms/${room}/characterSheets/${user.id}/${sheetId}`, sheetData);
            console.log('✅ Scheda salvata nel database con ID:', sheetId);
        } catch (error) {
            console.error('❌ ERRORE salvataggio scheda:', error);
            throw error;
        }
    }
    
    // Remove sheet
    async removeSheet() {
        if (!this.activeSheetId || !this.currentSheets.has(this.activeSheetId)) {
            await modalSystem.alert(
                'Nessuna scheda selezionata da rimuovere.',
                'Nessuna Scheda',
                { icon: 'ℹ️' }
            );
            return;
        }
        
        const activeSheet = this.currentSheets.get(this.activeSheetId);
        
        const confirmed = await modalSystem.confirm(
            `Sei sicuro di voler rimuovere la scheda "${activeSheet.name}"?`,
            'Rimuovi Scheda',
            {
                icon: '📋',
                confirmText: 'Sì, rimuovi',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) return;
        
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        try {
            // Remove sheet and its text boxes
            await FirebaseHelper.removeData(`rooms/${room}/characterSheets/${user.id}/${this.activeSheetId}`);
            await FirebaseHelper.removeData(`rooms/${room}/characterSheetTexts/${user.id}/${this.activeSheetId}`);
            
            // Try to delete file from server
            if (activeSheet.filename) {
                try {
                    await fetch('php/delete.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            filename: activeSheet.filename,
                            room: room,
                            type: 'sheet'
                        })
                    });
                } catch (deleteError) {
                    console.warn('⚠️ Errore eliminazione file scheda:', deleteError);
                }
            }
            
            console.log('✅ Scheda rimossa:', this.activeSheetId);
            
        } catch (error) {
            console.error('❌ ERRORE rimozione scheda:', error);
            await modalSystem.alert(
                'Errore durante la rimozione della scheda.',
                'Errore',
                { icon: '❌' }
            );
        }
    }
    
    // Add text box
    addTextBox() {
        if (!this.activeSheetId || !this.currentSheets.has(this.activeSheetId)) {
            modalSystem.alert(
                'Carica prima una scheda per aggiungere testi.',
                'Nessuna Scheda',
                { icon: 'ℹ️' }
            );
            return;
        }
        
        const sheetContainer = document.getElementById('sheetContainer');
        const rect = sheetContainer.getBoundingClientRect();
        
        // Calculate center position
        const centerX = (rect.width / 2 - this.panX) / this.zoom;
        const centerY = (rect.height / 2 - this.panY) / this.zoom;
        
        this.createNewTextBox(centerX, centerY);
    }
    
    // Clear all texts
    async clearAllTexts() {
        if (!this.activeSheetId) {
            await modalSystem.alert(
                'Nessuna scheda selezionata.',
                'Nessuna Scheda',
                { icon: 'ℹ️' }
            );
            return;
        }
        
        const sheetTextBoxes = this.getTextBoxesForSheet(this.activeSheetId);
        
        if (sheetTextBoxes.length === 0) {
            await modalSystem.alert(
                'Non ci sono testi da cancellare per questa scheda.',
                'Nessun Testo',
                { icon: 'ℹ️' }
            );
            return;
        }
        
        const confirmed = await modalSystem.confirm(
            'Sei sicuro di voler cancellare tutti i testi da questa scheda?',
            'Cancella Tutti i Testi',
            {
                icon: '📝',
                confirmText: 'Sì, cancella',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) return;
        
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        try {
            await FirebaseHelper.removeData(`rooms/${room}/characterSheetTexts/${user.id}/${this.activeSheetId}`);
            console.log('✅ Tutti i testi cancellati per scheda:', this.activeSheetId);
        } catch (error) {
            console.error('❌ ERRORE cancellazione testi:', error);
        }
    }
    
    // Reset zoom
    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateSheetTransform();
    }
    
    // FIXED: Handle sheet mouse down (distingue tra pan e text box drag)
    handleSheetMouseDown(event) {
        // Se è un text box, gestisci il drag
        if (event.target.classList.contains('text-box')) {
            this.startTextBoxDrag(event);
            return;
        }
        
        // Altrimenti gestisci il pan della scheda
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        const sheetViewer = document.getElementById('sheetViewer');
        sheetViewer.style.cursor = 'grabbing';
    }
    
    // Start text box drag
    startTextBoxDrag(event) {
        const textBox = event.target;
        const textBoxId = textBox.dataset.textId;
        
        if (!textBoxId) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        this.clickStartTime = Date.now();
        this.draggedTextBox = textBoxId;
        this.isPointerDown = true;
        
        // Store initial positions
        this.dragStartPos = { x: event.clientX, y: event.clientY };
        this.currentPointer = { x: event.clientX, y: event.clientY };
        this.targetPosition = { x: event.clientX, y: event.clientY };
        this.currentPosition = { x: event.clientX, y: event.clientY };
        
        const textBoxData = this.textBoxes.get(textBoxId);
        if (textBoxData) {
            this.textBoxStartPos = { x: textBoxData.x, y: textBoxData.y };
        }
        
        // Enhanced visual feedback
        textBox.style.cursor = 'grabbing';
        textBox.style.zIndex = '1000';
        textBox.style.transition = 'none';
        textBox.style.willChange = 'transform, left, top';
        
        console.log('🖱️ Preparazione drag text box:', textBoxId);
    }
    
    // Global mouse move
    handleGlobalMouseMove(event) {
        if (this.isPointerDown && this.draggedTextBox) {
            // Update target position for smooth interpolation
            this.targetPosition = { x: event.clientX, y: event.clientY };
            
            // Check if we should start dragging
            if (!this.isDraggingTextBox) {
                const deltaX = event.clientX - this.dragStartPos.x;
                const deltaY = event.clientY - this.dragStartPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > this.dragThreshold) {
                    this.isDraggingTextBox = true;
                    
                    // Enhanced visual feedback when drag starts
                    const textBoxElement = document.querySelector(`[data-text-id="${this.draggedTextBox}"]`);
                    if (textBoxElement) {
                        textBoxElement.style.transform = 'translate(-50%, -50%) scale(1.1)';
                        textBoxElement.style.filter = 'brightness(1.2) drop-shadow(0 4px 8px rgba(0,0,0,0.3))';
                        textBoxElement.style.opacity = '0.9';
                    }
                    
                    console.log('🖱️ Inizio drag text box:', this.draggedTextBox);
                }
            }
            
            return;
        }
        
        // Handle sheet pan
        if (this.isDragging) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            
            this.updateSheetTransform();
        }
    }
    
    // Ultra-smooth text box position update
    updateTextBoxPositionSmooth() {
        if (!this.isDraggingTextBox || !this.draggedTextBox) return;
        
        const textBoxElement = document.querySelector(`[data-text-id="${this.draggedTextBox}"]`);
        if (!textBoxElement) return;
        
        try {
            // Smooth interpolation between current and target position
            this.currentPosition.x += (this.targetPosition.x - this.currentPosition.x) * this.smoothingFactor;
            this.currentPosition.y += (this.targetPosition.y - this.currentPosition.y) * this.smoothingFactor;
            
            // Calculate movement delta from start position with smooth interpolation
            const deltaX = this.currentPosition.x - this.dragStartPos.x;
            const deltaY = this.currentPosition.y - this.dragStartPos.y;
            
            // Calculate new position in sheet coordinates
            const newX = this.textBoxStartPos.x + (deltaX / this.zoom);
            const newY = this.textBoxStartPos.y + (deltaY / this.zoom);
            
            // Apply position with hardware acceleration
            textBoxElement.style.left = newX + 'px';
            textBoxElement.style.top = newY + 'px';
            textBoxElement.style.transform = 'translate(-50%, -50%) scale(1.1) translate3d(0, 0, 0)';
            
        } catch (error) {
            console.error('❌ Errore aggiornamento posizione text box:', error);
        }
    }
    
    // Global mouse up
    handleGlobalMouseUp(event) {
        if (this.draggedTextBox && this.isPointerDown) {
            this.endTextBoxDrag();
            return;
        }
        
        if (this.isDragging) {
            this.isDragging = false;
            
            const sheetViewer = document.getElementById('sheetViewer');
            sheetViewer.style.cursor = 'grab';
        }
    }
    
    // End text box drag
    async endTextBoxDrag() {
        if (!this.draggedTextBox) return;
        
        const textBoxElement = document.querySelector(`[data-text-id="${this.draggedTextBox}"]`);
        if (textBoxElement) {
            // Smooth cleanup of visual effects
            textBoxElement.style.cursor = 'pointer';
            textBoxElement.style.zIndex = '10';
            textBoxElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            textBoxElement.style.willChange = 'auto';
            textBoxElement.style.transform = 'translate(-50%, -50%) scale(1)';
            textBoxElement.style.filter = '';
            textBoxElement.style.opacity = '1';
            
            // Only save if we actually dragged
            if (this.isDraggingTextBox) {
                const newX = parseFloat(textBoxElement.style.left) || 0;
                const newY = parseFloat(textBoxElement.style.top) || 0;
                
                // Save new position to Firebase
                const room = this.authManager.getCurrentRoom();
                const user = this.authManager.getCurrentUser();
                
                try {
                    await FirebaseHelper.updateData(`rooms/${room}/characterSheetTexts/${user.id}/${this.activeSheetId}/${this.draggedTextBox}`, {
                        x: newX,
                        y: newY,
                        lastModified: FirebaseHelper.getTimestamp()
                    });
                    
                    console.log('✅ Posizione text box salvata:', this.draggedTextBox, { x: newX, y: newY });
                } catch (error) {
                    console.error('❌ ERRORE salvataggio posizione text box:', error);
                }
            } else {
                // If we didn't drag, treat as click to edit (but only if not already editing)
                const clickDuration = Date.now() - this.clickStartTime;
                if (clickDuration < 300 && !this.isEditMenuOpen) {
                    setTimeout(() => {
                        this.openEditMenu(this.draggedTextBox);
                    }, 50);
                }
            }
        }
        
        // Reset all drag states
        this.isDraggingTextBox = false;
        this.draggedTextBox = null;
        this.isPointerDown = false;
    }
    
    // Handle zoom
    handleZoom(event) {
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * delta));
        
        if (newZoom !== this.zoom) {
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            const zoomFactor = newZoom / this.zoom;
            this.panX = mouseX - (mouseX - this.panX) * zoomFactor;
            this.panY = mouseY - (mouseY - this.panY) * zoomFactor;
            
            this.zoom = newZoom;
            this.updateSheetTransform();
        }
    }
    
    // Update sheet transform
    updateSheetTransform() {
        const sheetContainer = document.getElementById('sheetContainer');
        if (sheetContainer) {
            sheetContainer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        }
    }
    
    // Listen to sheet data
    listenToSheetData() {
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        if (!room || !user) return;
        
        // Listen to all sheets for this user
        this.sheetListener = FirebaseHelper.listenToData(`rooms/${room}/characterSheets/${user.id}`, (snapshot) => {
            this.handleSheetsUpdate(snapshot);
        });
        
        // Listen to all text boxes for this user
        this.textBoxListener = FirebaseHelper.listenToData(`rooms/${room}/characterSheetTexts/${user.id}`, (snapshot) => {
            this.handleTextBoxesUpdate(snapshot);
        });
    }
    
    // Handle sheets update
    handleSheetsUpdate(snapshot) {
        const sheetsData = snapshot.val();
        this.currentSheets.clear();
        
        if (sheetsData) {
            Object.entries(sheetsData).forEach(([sheetId, sheetData]) => {
                if (sheetData && typeof sheetData === 'object' && sheetData.id) {
                    this.currentSheets.set(sheetId, sheetData);
                }
            });
        }
        
        // If no active sheet or active sheet was deleted, select first available
        if (!this.activeSheetId || !this.currentSheets.has(this.activeSheetId)) {
            const firstSheetId = this.currentSheets.keys().next().value;
            this.activeSheetId = firstSheetId || null;
        }
        
        this.updateSheetDisplay();
        this.updateSheetTabs();
    }
    
    // Handle text boxes update
    handleTextBoxesUpdate(snapshot) {
        try {
            const allTextBoxesData = snapshot.val();
            this.textBoxes.clear();
            
            if (allTextBoxesData && typeof allTextBoxesData === 'object') {
                // Flatten all text boxes from all sheets
                Object.entries(allTextBoxesData).forEach(([sheetId, sheetTextBoxes]) => {
                    if (sheetTextBoxes && typeof sheetTextBoxes === 'object') {
                        Object.entries(sheetTextBoxes).forEach(([textBoxId, textBox]) => {
                            if (textBox && typeof textBox === 'object' && textBox.id) {
                                const validatedTextBox = {
                                    ...textBox,
                                    sheetId: sheetId
                                };
                                this.textBoxes.set(textBoxId, validatedTextBox);
                            }
                        });
                    }
                });
            }
            
            this.updateTextBoxesDisplay();
            
        } catch (error) {
            console.error('❌ ERRORE aggiornamento text boxes:', error);
        }
    }
    
    // Update sheet tabs
    updateSheetTabs() {
        const sheetControls = document.querySelector('.sheet-controls');
        if (!sheetControls) return;

        // Remove existing tabs wrapper
        const existingWrapper = sheetControls.querySelector('.sheet-tabs-wrapper');
        if (existingWrapper) {
            existingWrapper.remove();
        }

        // Create wrapper for tabs (if we have sheets)
        if (this.currentSheets.size > 0) {
            const wrapper = document.createElement('div');
            wrapper.className = 'sheet-tabs-wrapper';

            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'sheet-tabs';

            this.currentSheets.forEach((sheet, sheetId) => {
                const tab = document.createElement('button');
                tab.className = `sheet-tab ${sheetId === this.activeSheetId ? 'active' : ''}`;
                tab.textContent = sheet.name || 'Scheda';
                tab.title = sheet.name || 'Scheda';

                tab.addEventListener('click', () => {
                    this.switchToSheet(sheetId);
                });

                tabsContainer.appendChild(tab);
            });

            wrapper.appendChild(tabsContainer);

            // Insert tabs wrapper at the beginning of sheet controls
            sheetControls.insertBefore(wrapper, sheetControls.firstChild);
        }
    }
    
    // Switch to specific sheet
    switchToSheet(sheetId) {
        if (!this.currentSheets.has(sheetId)) return;
        
        this.activeSheetId = sheetId;
        this.closeEditMenu(); // Chiudi menu di editing quando cambi scheda
        this.updateSheetDisplay();
        this.updateSheetTabs();
        this.updateTextBoxesDisplay();
        
        console.log('📋 Cambiato a scheda:', sheetId);
    }
    
    // Update sheet display
    updateSheetDisplay() {
        const sheetImage = document.getElementById('sheetImage');
        const noSheet = document.querySelector('.no-sheet');
        const removeSheetBtn = document.getElementById('removeSheetBtn');
        const addTextBtn = document.getElementById('addTextBtn');
        const clearTextsBtn = document.getElementById('clearTextsBtn');
        const resetSheetZoomBtn = document.getElementById('resetSheetZoomBtn');
        
        const activeSheet = this.activeSheetId ? this.currentSheets.get(this.activeSheetId) : null;
        
        if (activeSheet) {
            sheetImage.src = activeSheet.url;
            sheetImage.style.display = 'block';
            noSheet.style.display = 'none';
            
            // Enable controls
            if (removeSheetBtn) removeSheetBtn.disabled = false;
            if (addTextBtn) addTextBtn.disabled = false;
            if (clearTextsBtn) clearTextsBtn.disabled = false;
            if (resetSheetZoomBtn) resetSheetZoomBtn.disabled = false;
        } else {
            sheetImage.style.display = 'none';
            noSheet.style.display = 'block';
            
            // Disable controls
            if (removeSheetBtn) removeSheetBtn.disabled = true;
            if (addTextBtn) addTextBtn.disabled = true;
            if (clearTextsBtn) clearTextsBtn.disabled = true;
            if (resetSheetZoomBtn) resetSheetZoomBtn.disabled = true;
        }
    }
    
    // Update text boxes display for active sheet only
    updateTextBoxesDisplay() {
        const textBoxesLayer = document.getElementById('textBoxesLayer');
        if (!textBoxesLayer) return;
        
        // Clear existing text boxes
        textBoxesLayer.innerHTML = '';
        
        // Show only text boxes for active sheet
        if (this.activeSheetId) {
            const sheetTextBoxes = this.getTextBoxesForSheet(this.activeSheetId);
            
            sheetTextBoxes.forEach((textBox) => {
                const textElement = this.createTextBoxElement(textBox.id, textBox);
                textBoxesLayer.appendChild(textElement);
            });
        }
    }
    
    // Get text boxes for specific sheet
    getTextBoxesForSheet(sheetId) {
        const sheetTextBoxes = [];
        this.textBoxes.forEach((textBox, id) => {
            if (textBox && textBox.sheetId === sheetId) {
                sheetTextBoxes.push({ id, ...textBox });
            }
        });
        return sheetTextBoxes;
    }
    
    // Create text box element
    createTextBoxElement(id, textBox) {
        const textElement = document.createElement('div');
        textElement.className = 'text-box';
        textElement.dataset.textId = id;
        
        textElement.style.cssText = `
            position: absolute;
            left: ${textBox.x}px;
            top: ${textBox.y}px;
            font-size: ${textBox.fontSize}px;
            font-weight: ${textBox.fontWeight};
            color: ${textBox.textColor};
            background-color: ${textBox.bgTransparent ? 'transparent' : textBox.bgColor};
            border: ${textBox.borderTransparent || textBox.borderWidth === 0 ? 'none' : `${textBox.borderWidth}px solid ${textBox.borderColor}`};
            padding: 4px 6px;
            cursor: pointer;
            user-select: none;
            white-space: pre-wrap;
            font-family: 'Cinzel', serif;
            transform: translate(-50%, -50%);
            z-index: 10;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: auto;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            border-radius: 4px;
            min-width: 20px;
            min-height: 20px;
        `;
        
        textElement.textContent = textBox.text;
        
        // Enhanced hover effects
        textElement.addEventListener('mouseenter', () => {
            if (!this.isDraggingTextBox) {
                textElement.style.transform = 'translate(-50%, -50%) scale(1.05)';
                textElement.style.boxShadow = '0 2px 8px rgba(212, 175, 55, 0.4)';
                textElement.style.willChange = 'transform';
            }
        });
        
        textElement.addEventListener('mouseleave', () => {
            if (!this.isDraggingTextBox) {
                textElement.style.transform = 'translate(-50%, -50%) scale(1)';
                textElement.style.boxShadow = 'none';
                textElement.style.willChange = 'auto';
            }
        });
        
        return textElement;
    }
    
    // Cleanup
    cleanup() {
        if (this.sheetListener) {
            FirebaseHelper.stopListening(this.sheetListener);
            this.sheetListener = null;
        }
        
        if (this.textBoxListener) {
            FirebaseHelper.stopListening(this.textBoxListener);
            this.textBoxListener = null;
        }
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Remove edit menu
        if (this.editMenu && this.editMenu.parentNode) {
            this.editMenu.parentNode.removeChild(this.editMenu);
        }
        
        this.closeEditMenu();
    }
}

export default CharacterSheetSystem;