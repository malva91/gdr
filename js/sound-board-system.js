// Sound Board System - FIXED: Completely separate from music with independent sound library AND volume control
import FirebaseHelper from './firebase.js?v.100';
import { modalSystem } from './modal-system.js?v.100';

export class SoundBoardSystem {
    constructor(authManager, musicSystem) {
        this.authManager = authManager;
        this.musicSystem = musicSystem;
        this.soundButtons = new Map();
        this.soundBoardListener = null;
        this.soundSyncListener = null;
        this.maxButtons = 15;
        this.buttonColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
            '#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe', '#74b9ff'
        ];
        this.currentConfigButton = null;
        
        // FIXED: Independent audio system for sound buttons
        this.soundAudioElements = new Map();
        this.currentlyPlayingSound = null;
        this.soundVolume = 0.4; // Default 40% volume for sounds
        
        // FIXED: Independent sound library (separate from music)
        this.soundLibrary = new Map();
        this.soundLibraryListener = null;
        
        // FIXED: Volume control handler reference
        this.soundVolumeHandler = null;
    }
    
    // Initialize sound board system
    init() {
        this.loadSavedVolume(); // FIXED: Load saved volume preferences
        this.setupEventListeners();
        this.createSoundButtons();
        this.listenToSoundBoard();
        this.listenToSoundLibrary(); // FIXED: Listen to separate sound library
        this.listenToSoundSync(); // FIXED: Listen to sound sync for all users
        this.updateVisibility();
        this.setupSoundVolumeControls(); // FIXED: Setup sound volume controls
    }
    
    // FIXED: Load saved volume preferences
    loadSavedVolume() {
        const savedSoundVolume = localStorage.getItem('tavernaSoundVolume');
        
        if (savedSoundVolume) {
            this.soundVolume = parseFloat(savedSoundVolume);
            console.log('🔊 Volume suoni caricato:', this.soundVolume);
        }
    }
    
    // FIXED: Setup sound volume controls
    setupSoundVolumeControls() {
        // Find existing sound volume control in HTML or create it
        this.createSoundVolumeControls();
    }
    
    // FIXED: Create sound volume controls next to music controls
    createSoundVolumeControls() {
        const musicControls = document.querySelector('.music-controls');
        if (!musicControls) {
            console.warn('⚠️ Music controls container non trovato per aggiungere controllo volume suoni');
            return;
        }
        
        // Find or create dual volume controls container
        let dualVolumeControls = musicControls.querySelector('.dual-volume-controls');
        if (!dualVolumeControls) {
            // If dual controls don't exist, create them
            dualVolumeControls = document.createElement('div');
            dualVolumeControls.className = 'dual-volume-controls';
            dualVolumeControls.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                align-items: flex-end;
            `;
            musicControls.appendChild(dualVolumeControls);
        }
        
        // Check if sound volume control already exists
        let soundVolumeControl = dualVolumeControls.querySelector('.sound-volume');
        if (soundVolumeControl) {
            // Remove existing control to recreate it
            soundVolumeControl.remove();
        }
        
        // Create sound volume control
        soundVolumeControl = document.createElement('div');
        soundVolumeControl.className = 'volume-control sound-volume';
        soundVolumeControl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        const soundLabel = document.createElement('span');
        soundLabel.className = 'volume-label';
        soundLabel.textContent = '🔊';
        soundLabel.style.cssText = `
            font-size: 0.8rem;
            color: #d4af37;
            min-width: 20px;
        `;
        
        const soundSlider = document.createElement('input');
        soundSlider.type = 'range';
        soundSlider.id = 'soundVolumeSlider';
        soundSlider.className = 'volume-slider';
        soundSlider.min = '0';
        soundSlider.max = '100';
        soundSlider.value = this.soundVolume * 100;
        soundSlider.style.cssText = `
            width: 80px;
            height: 4px;
            background: #8b4513;
            outline: none;
            border-radius: 2px;
            cursor: pointer;
        `;
        
        soundVolumeControl.appendChild(soundLabel);
        soundVolumeControl.appendChild(soundSlider);
        
        // Add to dual volume controls (after music volume)
        dualVolumeControls.appendChild(soundVolumeControl);
        
        // Add event listener with proper binding
        if (this.soundVolumeHandler) {
            soundSlider.removeEventListener('input', this.soundVolumeHandler);
        }
        
        this.soundVolumeHandler = (e) => {
            this.setSoundVolume(e.target.value / 100);
        };
        
        soundSlider.addEventListener('input', this.soundVolumeHandler);
        
        console.log('🎛️ Controllo volume suoni creato e configurato:', this.soundVolume);
    }
    
    // FIXED: Set sound volume (separate from music)
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        
        // FIXED: Apply volume to all existing sound audio elements immediately
        this.soundAudioElements.forEach(audio => {
            audio.volume = this.soundVolume;
            audio.muted = this.soundVolume === 0;
        });
        
        // FIXED: Update slider value
        const soundSlider = document.getElementById('soundVolumeSlider');
        if (soundSlider) {
            soundSlider.value = this.soundVolume * 100;
        }
        
        // Save volume preference
        localStorage.setItem('tavernaSoundVolume', this.soundVolume.toString());
        
        console.log('🔊 Volume suoni aggiornato:', this.soundVolume);
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Sound config modal
        const soundConfigModal = document.getElementById('soundConfigModal');
        const closeBtn = soundConfigModal?.querySelector('.modal-close');
        const saveSoundButton = document.getElementById('saveSoundButton');
        const cancelSoundConfig = document.getElementById('cancelSoundConfig');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeSoundConfigModal());
        if (saveSoundButton) saveSoundButton.addEventListener('click', () => this.saveSoundButtonConfig());
        if (cancelSoundConfig) cancelSoundConfig.addEventListener('click', () => this.closeSoundConfigModal());
        
        // Close modal on outside click
        if (soundConfigModal) {
            soundConfigModal.addEventListener('click', (e) => {
                if (e.target === soundConfigModal) {
                    this.closeSoundConfigModal();
                }
            });
        }
    }
    
    // FIXED: Listen to separate sound library (not music library)
    listenToSoundLibrary() {
        const room = this.authManager.getCurrentRoom();
        if (!room) return;
        
        this.soundLibraryListener = FirebaseHelper.listenToData(`rooms/${room}/assets/sound`, (snapshot) => {
            this.handleSoundLibraryUpdate(snapshot);
        });
    }
    
    // FIXED: Handle sound library update (separate from music)
    handleSoundLibraryUpdate(snapshot) {
        try {
            const soundsData = snapshot.val();
            this.soundLibrary.clear();
            
            if (soundsData) {
                Object.entries(soundsData).forEach(([id, soundData]) => {
                    if (soundData && soundData.id && soundData.url && soundData.name) {
                        this.soundLibrary.set(id, soundData);
                    }
                });
            }
            
            console.log('🔊 Libreria suoni aggiornata:', this.soundLibrary.size, 'suoni disponibili');
            
        } catch (error) {
            console.error('❌ ERRORE aggiornamento libreria suoni:', error);
        }
    }
    
    // FIXED: Listen to sound sync for synchronized playback
    listenToSoundSync() {
        const room = this.authManager.getCurrentRoom();
        if (!room) return;
        
        this.soundSyncListener = FirebaseHelper.listenToData(`rooms/${room}/soundSync`, (snapshot) => {
            this.handleSoundSync(snapshot);
        });
    }
    
    // Update visibility based on user role
    updateVisibility() {
        const isMaster = this.authManager.isMaster();
        const soundBoard = document.getElementById('soundBoard');
        
        if (soundBoard) {
            soundBoard.style.display = isMaster ? 'block' : 'none';
        }
    }
    
    // Create sound buttons
    createSoundButtons() {
        const soundButtonsContainer = document.getElementById('soundButtons');
        if (!soundButtonsContainer) return;
        
        soundButtonsContainer.innerHTML = '';
        
        for (let i = 0; i < this.maxButtons; i++) {
            const buttonData = this.soundButtons.get(i) || {
                id: i,
                name: `Suono ${i + 1}`,
                color: this.buttonColors[i],
                soundId: null,
                soundUrl: null,
                soundName: null
            };
            
            const buttonContainer = this.createSoundButtonContainer(buttonData);
            soundButtonsContainer.appendChild(buttonContainer);
        }
    }
    
    // FIXED: Create sound button container with play and stop buttons
    createSoundButtonContainer(buttonData) {
        const container = document.createElement('div');
        container.className = 'sound-button-container';
        container.style.cssText = `
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 4px;
            margin: 1px;
        `;
        
        // Main play button
        const playButton = document.createElement('button');
        playButton.className = 'sound-button play-button';
        playButton.dataset.buttonId = buttonData.id;
        
        playButton.style.cssText = `
            width: 80px;
            height: 50px;
            border: 2px solid #8b4513;
            border-radius: 6px;
            background: linear-gradient(135deg, ${buttonData.color} 0%, ${this.darkenColor(buttonData.color, 20)} 100%);
            color: #fff;
            font-family: 'Cinzel', serif;
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            line-height: 1;
            padding: 4px;
            position: relative;
            overflow: hidden;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        `;
        
        // Button content
        const content = document.createElement('div');
        content.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1px;
            pointer-events: none;
        `;
        
        const icon = document.createElement('div');
        // Show different icons based on state and sound availability
        if (buttonData.soundId) {
            icon.textContent = this.currentlyPlayingSound === buttonData.id ? '⏸️' : '▶️';
        } else {
            icon.textContent = '➕'; // Plus icon for empty buttons
        }
        icon.style.fontSize = '1.2rem';
        
        const name = document.createElement('div');
        const displayName = buttonData.name && buttonData.name.length > 10 ? 
                           buttonData.name.substring(0, 10) + '...' : 
                           (buttonData.name || `S${buttonData.id + 1}`);
        name.textContent = displayName;
        name.style.cssText = `
            font-size: 0.6rem;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        name.title = buttonData.name || `Suono ${buttonData.id + 1}`;
        
        content.appendChild(icon);
        content.appendChild(name);
        playButton.appendChild(content);
        
        // Event listeners
        playButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSoundButtonClick(buttonData.id);
        });
        
        playButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.authManager.isMaster()) {
                this.openSoundConfigModal(buttonData.id);
            }
        });
        
        // Hover effects
        playButton.addEventListener('mouseenter', () => {
            playButton.style.transform = 'scale(1.05)';
            playButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
        });
        
        playButton.addEventListener('mouseleave', () => {
            playButton.style.transform = 'scale(1)';
            playButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        });
        
        container.appendChild(playButton);
        
        return container;
    }
    
    // FIXED: Handle sound button click with new logic
    async handleSoundButtonClick(buttonId) {
        const buttonData = this.soundButtons.get(buttonId);
        
        // If button is empty, open config modal (only for master)
        if (!buttonData || !buttonData.soundId || !buttonData.soundUrl) {
            if (this.authManager.isMaster()) {
                console.log('🔇 Pulsante vuoto, apertura configurazione:', buttonId);
                this.openSoundConfigModal(buttonId);
            }
            return;
        }
        
        // If this button is currently playing, pause it
        if (this.currentlyPlayingSound === buttonId) {
            await this.pauseSoundButton(buttonId);
            return;
        }
        
        // Stop any currently playing sound and play the new one
        if (this.currentlyPlayingSound !== null) {
            await this.stopCurrentSound();
        }
        
        await this.playSoundButton(buttonId);
    }
    
    // FIXED: Play sound button with enhanced audio handling and sync
    async playSoundButton(buttonId) {
        const buttonData = this.soundButtons.get(buttonId);
        if (!buttonData || !buttonData.soundId || !buttonData.soundUrl) {
            return;
        }
        
        try {
            // Create or get audio element for this sound
            let audioElement = this.soundAudioElements.get(buttonId);
            if (!audioElement) {
                audioElement = new Audio();
                audioElement.preload = 'metadata';
                
                // FIXED: Set initial volume and mute state like music system
                audioElement.volume = this.soundVolume;
                audioElement.muted = this.soundVolume === 0;
                
                this.soundAudioElements.set(buttonId, audioElement);
                console.log('🔊 Creato nuovo elemento audio per pulsante:', buttonId, 'volume:', this.soundVolume);
                
                // Setup event listeners
                audioElement.addEventListener('ended', () => {
                    if (this.currentlyPlayingSound === buttonId) {
                        this.currentlyPlayingSound = null;
                        this.updateButtonIcons();
                    }
                });
                
                audioElement.addEventListener('error', (e) => {
                    console.error('❌ ERRORE audio suono:', e);
                    if (this.currentlyPlayingSound === buttonId) {
                        this.currentlyPlayingSound = null;
                        this.updateButtonIcons();
                    }
                });
            } else {
                console.log('🔊 Riutilizzo elemento audio esistente per pulsante:', buttonId);
            }
            
            // Set source and play
            audioElement.src = buttonData.soundUrl;
            
            // FIXED: Set volume and mute state like music system (no pausing)
            audioElement.volume = this.soundVolume;
            audioElement.muted = this.soundVolume === 0;
            
            await audioElement.play();
            
            // Update current playing sound
            this.currentlyPlayingSound = buttonId;
            this.updateButtonIcons();
            
            // Visual feedback
            const buttonElement = document.querySelector(`[data-button-id="${buttonId}"].play-button`);
            if (buttonElement) {
                buttonElement.style.animation = 'soundButtonPulse 0.5s ease-out';
                setTimeout(() => {
                    buttonElement.style.animation = '';
                }, 500);
            }
            
            // FIXED: Sync with other users (only if master initiated)
            if (this.authManager.isMaster()) {
                await this.syncSoundButtonPlay(buttonId);
            }
            
            console.log('🔊 Suono riprodotto:', buttonData.name);
            
        } catch (error) {
            console.error('❌ ERRORE riproduzione suono pulsante:', error);
            // Reset state on error
            if (this.currentlyPlayingSound === buttonId) {
                this.currentlyPlayingSound = null;
                this.updateButtonIcons();
            }
        }
    }
    
    // FIXED: Pause sound button
    async pauseSoundButton(buttonId) {
        if (this.currentlyPlayingSound !== buttonId) return;
        
        try {
            const audioElement = this.soundAudioElements.get(buttonId);
            if (audioElement) {
                audioElement.pause();
            }
            
            this.currentlyPlayingSound = null;
            this.updateButtonIcons();
            
            // FIXED: Sync pause with other users (only if master initiated)
            if (this.authManager.isMaster()) {
                await this.syncSoundButtonStop(buttonId);
            }
            
            console.log('⏸️ Suono in pausa:', buttonId);
            
        } catch (error) {
            console.error('❌ ERRORE pausa suono:', error);
        }
    }
    
    // FIXED: Stop specific sound button
    async stopSoundButton(buttonId) {
        try {
            const audioElement = this.soundAudioElements.get(buttonId);
            if (audioElement) {
                audioElement.pause();
                audioElement.currentTime = 0;
            }
            
            if (this.currentlyPlayingSound === buttonId) {
                this.currentlyPlayingSound = null;
                this.updateButtonIcons();
            }
            
            // FIXED: Sync stop with other users (only if master initiated)
            if (this.authManager.isMaster()) {
                await this.syncSoundButtonStop(buttonId);
            }
            
            console.log('⏹️ Suono fermato:', buttonId);
            
        } catch (error) {
            console.error('❌ ERRORE stop suono:', error);
        }
    }
    
    // FIXED: Stop current sound with proper cleanup
    async stopCurrentSound() {
        if (this.currentlyPlayingSound === null) return;
        
        await this.stopSoundButton(this.currentlyPlayingSound);
    }
    
    // FIXED: Sync sound button play with other users
    async syncSoundButtonPlay(buttonId) {
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        try {
            const syncData = {
                buttonId: buttonId,
                action: 'play',
                playedBy: user.name,
                timestamp: Date.now()
            };
            
            // Send sync signal (will be received by other users)
            await FirebaseHelper.setData(`rooms/${room}/soundSync/${Date.now()}`, syncData);
            
            // Auto-remove sync data after 5 seconds
            setTimeout(async () => {
                try {
                    await FirebaseHelper.removeData(`rooms/${room}/soundSync/${syncData.timestamp}`);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }, 5000);
            
        } catch (error) {
            console.error('❌ ERRORE sincronizzazione suono:', error);
        }
    }
    
    // FIXED: Sync sound button stop with other users
    async syncSoundButtonStop(buttonId) {
        const room = this.authManager.getCurrentRoom();
        const user = this.authManager.getCurrentUser();
        
        try {
            const syncData = {
                buttonId: buttonId,
                action: 'stop',
                stoppedBy: user.name,
                timestamp: Date.now()
            };
            
            // Send sync signal (will be received by other users)
            await FirebaseHelper.setData(`rooms/${room}/soundSync/${Date.now()}`, syncData);
            
            // Auto-remove sync data after 5 seconds
            setTimeout(async () => {
                try {
                    await FirebaseHelper.removeData(`rooms/${room}/soundSync/${syncData.timestamp}`);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }, 5000);
            
        } catch (error) {
            console.error('❌ ERRORE sincronizzazione stop suono:', error);
        }
    }
    
    // FIXED: Update button icons based on playing state
    updateButtonIcons() {
        this.soundButtons.forEach((buttonData, buttonId) => {
            const playButtonElement = document.querySelector(`[data-button-id="${buttonId}"].play-button`);
            
            if (playButtonElement) {
                const icon = playButtonElement.querySelector('div div:first-child');
                const name = playButtonElement.querySelector('div div:last-child');
                
                if (icon) {
                    if (buttonData.soundId) {
                        icon.textContent = this.currentlyPlayingSound === buttonId ? '⏸️' : '▶️';
                    } else {
                        icon.textContent = '➕'; // Plus icon for empty buttons
                    }
                }
                
                // Always update and show name
                if (name) {
                    const displayName = buttonData.name && buttonData.name.length > 10 ? 
                                       buttonData.name.substring(0, 10) + '...' : 
                                       (buttonData.name || `S${buttonId + 1}`);
                    name.textContent = displayName;
                    name.title = buttonData.name || `Suono ${buttonId + 1}`;
                }
            }
        });
    }
    
    // Darken color for gradient
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    // FIXED: Open sound configuration modal with separate sound library
    openSoundConfigModal(buttonId) {
        if (!this.authManager.isMaster()) return;
        
        this.currentConfigButton = buttonId;
        const buttonData = this.soundButtons.get(buttonId) || {
            id: buttonId,
            name: `Suono ${buttonId + 1}`,
            color: this.buttonColors[buttonId],
            soundId: null
        };
        
        const modal = document.getElementById('soundConfigModal');
        const nameInput = document.getElementById('soundButtonName');
        const colorInput = document.getElementById('soundButtonColor');
        const musicSelection = document.getElementById('musicSelection');
        
        // Populate form
        nameInput.value = buttonData.name;
        colorInput.value = buttonData.color;
        
        // FIXED: Populate sound selection (not music)
        this.populateSoundSelection(buttonData.soundId);
        
        modal.style.display = 'flex';
        nameInput.focus();
    }
    
    // Close sound configuration modal
    closeSoundConfigModal() {
        const modal = document.getElementById('soundConfigModal');
        modal.style.display = 'none';
        this.currentConfigButton = null;
    }
    
    // FIXED: Populate sound selection with separate sound library
    async populateSoundSelection(selectedSoundId) {
        const musicSelection = document.getElementById('musicSelection');
        if (!musicSelection) return;
        
        musicSelection.innerHTML = '';
        
        // FIXED: Create header with organized buttons
        const headerSection = document.createElement('div');
        headerSection.className = 'sound-selection-header';
        headerSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding: 0.5rem;
            background: rgba(139, 69, 19, 0.3);
            border-radius: 6px;
            border: 1px solid #8b4513;
        `;
        
        const headerTitle = document.createElement('span');
        headerTitle.textContent = 'Seleziona Musica:';
        headerTitle.style.cssText = `
            color: #d4af37;
            font-weight: 600;
            flex: 1;
        `;
        
        // FIXED: Small upload button
        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'small-action-btn upload-btn';
        uploadBtn.textContent = '📁 Carica';
        uploadBtn.style.cssText = `
            padding: 0.25rem 0.5rem;
            background: linear-gradient(135deg, #32cd32 0%, #228b22 100%);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
        `;
        
        // FIXED: Small clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'small-action-btn clear-btn';
        clearBtn.textContent = '🗑️ Svuota';
        clearBtn.style.cssText = `
            padding: 0.25rem 0.5rem;
            background: linear-gradient(135deg, #dc143c 0%, #8b0000 100%);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
        `;
        
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/mp3,audio/wav,audio/ogg';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                // FIXED: Replace existing sound for this button
                await this.replaceSoundForButton(file);
            }
        });
        
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        clearBtn.addEventListener('click', () => {
            this.clearSoundButton();
        });
        
        // Hover effects
        uploadBtn.addEventListener('mouseenter', () => {
            uploadBtn.style.background = 'linear-gradient(135deg, #228b22 0%, #32cd32 100%)';
        });
        
        uploadBtn.addEventListener('mouseleave', () => {
            uploadBtn.style.background = 'linear-gradient(135deg, #32cd32 0%, #228b22 100%)';
        });
        
        clearBtn.addEventListener('mouseenter', () => {
            clearBtn.style.background = 'linear-gradient(135deg, #8b0000 0%, #dc143c 100%)';
        });
        
        clearBtn.addEventListener('mouseleave', () => {
            clearBtn.style.background = 'linear-gradient(135deg, #dc143c 0%, #8b0000 100%)';
        });
        
        headerSection.appendChild(headerTitle);
        headerSection.appendChild(uploadBtn);
        headerSection.appendChild(clearBtn);
        headerSection.appendChild(fileInput);
        
        musicSelection.appendChild(headerSection);
        
        // FIXED: Get available sounds from separate sound library
        if (this.soundLibrary.size === 0) {
            const noSoundsDiv = document.createElement('div');
            noSoundsDiv.className = 'no-music';
            noSoundsDiv.textContent = 'Nessun suono disponibile. Carica un nuovo suono per iniziare.';
            noSoundsDiv.style.cssText = `
                text-align: center;
                color: #cd853f;
                font-style: italic;
                padding: 1rem;
            `;
            musicSelection.appendChild(noSoundsDiv);
            return;
        }
        
        // Create sound options from separate sound library
        this.soundLibrary.forEach(sound => {
            const option = document.createElement('div');
            option.className = 'music-option';
            option.dataset.soundId = sound.id;
            option.dataset.soundUrl = sound.url;
            option.dataset.soundName = sound.title || sound.name;
            
            const isSelected = sound.id === selectedSoundId;
            
            option.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                background: ${isSelected ? 'rgba(212, 175, 55, 0.2)' : 'rgba(61, 39, 22, 0.6)'};
                border: 1px solid ${isSelected ? '#d4af37' : '#8b4513'};
                border-radius: 4px;
                margin-bottom: 0.5rem;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            option.innerHTML = `
                <div class="music-icon">🔊</div>
                <div class="music-info">
                    <div class="music-name">${sound.title || sound.name}</div>
                </div>
                <div class="music-select-indicator">${isSelected ? '✓' : ''}</div>
            `;
            
            option.addEventListener('click', () => {
                // Deselect all
                musicSelection.querySelectorAll('.music-option').forEach(opt => {
                    opt.style.background = 'rgba(61, 39, 22, 0.6)';
                    opt.style.borderColor = '#8b4513';
                    opt.querySelector('.music-select-indicator').textContent = '';
                    opt.dataset.selected = 'false';
                });
                
                // Select this one
                option.style.background = 'rgba(212, 175, 55, 0.2)';
                option.style.borderColor = '#d4af37';
                option.querySelector('.music-select-indicator').textContent = '✓';
                option.dataset.selected = 'true';
            });
            
            if (isSelected) {
                option.dataset.selected = 'true';
            }
            
            musicSelection.appendChild(option);
        });
    }
    
    // FIXED: Replace sound for button (removes old sound and uploads new one)
    async replaceSoundForButton(file) {
        if (!this.authManager.isMaster()) return;
        
        // Validate file type
        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
        if (!allowedTypes.includes(file.type)) {
            await modalSystem.alert(
                'Tipo file non supportato. Usa MP3, WAV o OGG.',
                'Errore Formato File',
                { icon: '❌' }
            );
            return;
        }
        
        // Validate file size (max 20MB for sound effects)
        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            await modalSystem.alert(
                'File troppo grande. Massimo 20MB per i suoni.',
                'File Troppo Grande',
                { icon: '⚠️' }
            );
            return;
        }
        
        // FIXED: Check if button already has a sound and remove it
        const currentButtonData = this.soundButtons.get(this.currentConfigButton);
        if (currentButtonData && currentButtonData.soundId) {
            try {
                // Remove old sound from library
                const room = this.authManager.getCurrentRoom();
                await FirebaseHelper.removeData(`rooms/${room}/assets/sound/${currentButtonData.soundId}`);
                
                // Try to delete old file from server
                const oldSoundData = this.soundLibrary.get(currentButtonData.soundId);
                if (oldSoundData && oldSoundData.filename) {
                    try {
                        await fetch('php/delete.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                filename: oldSoundData.filename,
                                room: room,
                                type: 'sound'
                            })
                        });
                    } catch (deleteError) {
                        console.warn('⚠️ Errore eliminazione file vecchio suono:', deleteError);
                    }
                }
                
                console.log('🗑️ Suono precedente rimosso per pulsante:', this.currentConfigButton);
            } catch (error) {
                console.warn('⚠️ Errore rimozione suono precedente:', error);
            }
        }
        
        try {
            const formData = new FormData();
            formData.append('sound', file); // FIXED: Use 'sound' field name
            formData.append('room', this.authManager.getCurrentRoom());
            formData.append('type', 'sound'); // FIXED: Use 'sound' type
            
            const response = await fetch('php/upload.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // FIXED: Save to separate sound library
                const room = this.authManager.getCurrentRoom();
                const user = this.authManager.getCurrentUser();
                
                const soundData = {
                    id: FirebaseHelper.generateUserId(),
                    filename: result.filename,
                    originalName: file.name,
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    url: result.url,
                    size: result.size,
                    type: result.type || file.type,
                    uploadedBy: user.name,
                    timestamp: FirebaseHelper.getTimestamp(),
                    visibleToPlayers: false
                };
                
                // FIXED: Save to separate sound library path
                await FirebaseHelper.setData(`rooms/${room}/assets/sound/${soundData.id}`, soundData);
                
                console.log('✅ Suono sostituito per pulsante sonoro:', file.name);
                
                // Refresh sound selection
                this.populateSoundSelection(soundData.id);
                
            } else {
                throw new Error(result.error || 'Errore upload');
            }
            
        } catch (error) {
            console.error('❌ ERRORE upload suono:', error);
            await modalSystem.alert(
                'Errore durante il caricamento del suono: ' + error.message,
                'Errore Upload',
                { icon: '❌' }
            );
        }
    }
    
    // FIXED: Save sound button configuration with enhanced data
    async saveSoundButtonConfig() {
        if (this.currentConfigButton === null) return;
        
        const nameInput = document.getElementById('soundButtonName');
        const colorInput = document.getElementById('soundButtonColor');
        const musicSelection = document.getElementById('musicSelection');
        
        const name = nameInput.value.trim() || `Suono ${this.currentConfigButton + 1}`;
        const color = colorInput.value;
        
        // Get selected sound
        const selectedOption = musicSelection.querySelector('.music-option[data-selected="true"]');
        let soundId = null;
        let soundUrl = null;
        let soundName = null;
        
        if (selectedOption) {
            soundId = selectedOption.dataset.soundId;
            soundUrl = selectedOption.dataset.soundUrl;
            soundName = selectedOption.dataset.soundName;
        }
        
        const buttonData = {
            id: this.currentConfigButton,
            name: name,
            color: color,
            soundId: soundId, // FIXED: Use soundId instead of musicId
            soundUrl: soundUrl, // FIXED: Use soundUrl instead of musicUrl
            soundName: soundName, // FIXED: Use soundName instead of musicName
            lastModified: FirebaseHelper.getTimestamp()
        };
        
        // Save to Firebase
        const room = this.authManager.getCurrentRoom();
        
        try {
            await FirebaseHelper.setData(`rooms/${room}/soundBoard/${this.currentConfigButton}`, buttonData);
            
            console.log('✅ Configurazione pulsante salvata:', buttonData);
            
        } catch (error) {
            console.error('❌ ERRORE salvataggio configurazione pulsante:', error);
        }
        
        this.closeSoundConfigModal();
    }
    
    // FIXED: Clear sound button (remove sound from button)
    async clearSoundButton() {
        if (this.currentConfigButton === null) return;
        
        const confirmed = await modalSystem.confirm(
            'Sei sicuro di voler svuotare questo pulsante sonoro?',
            'Svuota Pulsante Sonoro',
            {
                icon: '🔊',
                confirmText: 'Sì, svuota',
                cancelText: 'Annulla'
            }
        );
        
        if (!confirmed) {
            return;
        }
        
        const room = this.authManager.getCurrentRoom();
        
        try {
            // Remove the sound button configuration
            await FirebaseHelper.removeData(`rooms/${room}/soundBoard/${this.currentConfigButton}`);
            
            // Update local state
            this.soundButtons.delete(this.currentConfigButton);
            
            // Stop any currently playing sound from this button
            if (this.currentlyPlayingSound === this.currentConfigButton) {
                await this.stopSoundButton(this.currentConfigButton);
            }
            
            // Remove audio element if exists
            const audioElement = this.soundAudioElements.get(this.currentConfigButton);
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
                this.soundAudioElements.delete(this.currentConfigButton);
            }
            
            console.log('✅ Pulsante sonoro svuotato:', this.currentConfigButton);
            
            // Update display
            this.updateSoundButtonsDisplay();
            
        } catch (error) {
            console.error('❌ ERRORE svuotamento pulsante sonoro:', error);
        }
        
        this.closeSoundConfigModal();
    }
    
    // Listen to sound board changes
    listenToSoundBoard() {
        const room = this.authManager.getCurrentRoom();
        if (!room) return;
        
        // Listen to sound board configuration
        this.soundBoardListener = FirebaseHelper.listenToData(`rooms/${room}/soundBoard`, (snapshot) => {
            this.handleSoundBoardUpdate(snapshot);
        });
    }
    
    // Handle sound board update
    handleSoundBoardUpdate(snapshot) {
        try {
            const soundBoardData = snapshot.val();
            
            this.soundButtons.clear();
            
            if (soundBoardData) {
                Object.entries(soundBoardData).forEach(([buttonId, buttonData]) => {
                    this.soundButtons.set(parseInt(buttonId), buttonData);
                });
            }
            
            // Update button display
            this.updateSoundButtonsDisplay();
            
        } catch (error) {
            console.error('❌ ERRORE aggiornamento pulsanti sonori:', error);
        }
    }
    
    // FIXED: Handle sound sync from other users (all users receive sync)
    handleSoundSync(snapshot) {
        try {
            const syncData = snapshot.val();
            if (!syncData) return;
            
            // Get the latest sync event
            const latestSync = Object.values(syncData).sort((a, b) => b.timestamp - a.timestamp)[0];
            if (!latestSync) return;
            
            // Check if this is a recent event (within last 2 seconds)
            const now = Date.now();
            if (now - latestSync.timestamp > 2000) return;
            
            // Don't process our own sync events
            const currentUser = this.authManager.getCurrentUser();
            if (latestSync.playedBy === currentUser?.name || latestSync.stoppedBy === currentUser?.name) {
                return;
            }
            
            // FIXED: Handle both play and stop actions
            if (latestSync.action === 'stop') {
                this.stopSoundButtonForSync(latestSync.buttonId);
            } else {
                // Default to play action
                this.playSoundButtonForSync(latestSync.buttonId);
            }
            
        } catch (error) {
            console.error('❌ ERRORE gestione sincronizzazione suono:', error);
        }
    }
    
    // FIXED: Stop sound button for sync (no re-sync)
    async stopSoundButtonForSync(buttonId) {
        try {
            const audioElement = this.soundAudioElements.get(buttonId);
            if (audioElement) {
                audioElement.pause();
                audioElement.currentTime = 0;
            }
            
            if (this.currentlyPlayingSound === buttonId) {
                this.currentlyPlayingSound = null;
                this.updateButtonIcons();
            }
            
            console.log('🔊 Suono fermato da sincronizzazione:', buttonId);
            
        } catch (error) {
            console.error('❌ ERRORE stop suono sincronizzato:', error);
        }
    }
    
    // Play sound button for sync (no re-sync)
    async playSoundButtonForSync(buttonId) {
        const buttonData = this.soundButtons.get(buttonId);
        if (!buttonData || !buttonData.soundId || !buttonData.soundUrl) return;
        
        try {
            // Stop any currently playing sound
            if (this.currentlyPlayingSound !== null) {
                await this.stopCurrentSound();
            }
            
            // Create or get audio element for this sound
            let audioElement = this.soundAudioElements.get(buttonId);
            if (!audioElement) {
                audioElement = new Audio();
                audioElement.preload = 'metadata';
                
                this.soundAudioElements.set(buttonId, audioElement);
                
                audioElement.addEventListener('ended', () => {
                    if (this.currentlyPlayingSound === buttonId) {
                        this.currentlyPlayingSound = null;
                        this.updateButtonIcons();
                    }
                });
            }
            
            // Set source and play
            audioElement.src = buttonData.soundUrl;
            audioElement.currentTime = 0;
            
            // FIXED: Set volume and mute state like music system (no pausing)
            audioElement.volume = this.soundVolume;
            audioElement.muted = this.soundVolume === 0;
            
            await audioElement.play();
            
            // Update current playing sound
            this.currentlyPlayingSound = buttonId;
            this.updateButtonIcons();
            
            // Visual feedback
            const buttonElement = document.querySelector(`[data-button-id="${buttonId}"].play-button`);
            if (buttonElement) {
                buttonElement.style.animation = 'soundButtonPulse 0.5s ease-out';
                setTimeout(() => {
                    buttonElement.style.animation = '';
                }, 500);
            }
            
            console.log('🔊 Suono riprodotto da sincronizzazione:', buttonData.name);
            
        } catch (error) {
            console.error('❌ ERRORE riproduzione suono sincronizzato:', error);
        }
    }
    
    // Update sound buttons display
    updateSoundButtonsDisplay() {
        // Recreate all buttons to ensure proper structure
        this.createSoundButtons();
    }
    
    // Cleanup
    cleanup() {
        if (this.soundBoardListener) {
            FirebaseHelper.stopListening(this.soundBoardListener);
            this.soundBoardListener = null;
        }
        
        if (this.soundLibraryListener) {
            FirebaseHelper.stopListening(this.soundLibraryListener);
            this.soundLibraryListener = null;
        }
        
        if (this.soundSyncListener) {
            FirebaseHelper.stopListening(this.soundSyncListener);
            this.soundSyncListener = null;
        }
        
        // FIXED: Stop and cleanup all audio elements properly
        this.stopCurrentSound();
        this.soundAudioElements.forEach(audio => {
            audio.pause();
            audio.src = '';
            audio.load();
        });
        this.soundAudioElements.clear();
        this.currentlyPlayingSound = null;
        this.soundLibrary.clear();
    }
}

export default SoundBoardSystem;