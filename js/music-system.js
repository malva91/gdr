// Music system management - FIXED with dual volume controls
import FirebaseHelper from './firebase.js?v.100';

export class MusicSystem {
    constructor(authManager) {
        this.authManager = authManager;
        this.playlistListener = null;
        this.musicStateListener = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.isLooping = false;
        this.musicVolume = 0.2; // FIXED: Default 20% for music
        this.audioElement = null;
        this.syncInterval = null;
        this.lastSyncTime = 0;
        this.syncFrequency = 1000; // Sync every 1 second for better precision
        this.isSyncing = false;
        this.masterStateCheckInterval = null;
    }
    
    // Initialize music system
    init() {
        console.log('🎵 Inizializzazione sistema musica...');
        this.audioElement = document.getElementById('musicPlayer');
        
        // Load saved volume preferences
        const savedMusicVolume = localStorage.getItem('tavernaMusicVolume');
        
        if (savedMusicVolume) {
            this.musicVolume = parseFloat(savedMusicVolume);
        }
        
        this.setupEventListeners();
        this.setupAudioEvents();
        this.listenToMusicState();
        this.updateMasterControls();
        this.setupVolumeControls(); // Setup music volume controls
        
        // Start sync interval for master
        if (this.authManager.isMaster()) {
            this.startSyncInterval();
            this.startMasterStateCheck();
        }
    }
    
    // FIXED: Setup dual volume controls
    setupVolumeControls() {
        // Find existing music volume control in HTML
        const musicSlider = document.getElementById('musicVolumeSlider');
        
        if (musicSlider) {
            // Remove any existing event listeners
            if (this.musicVolumeHandler) {
                musicSlider.removeEventListener('input', this.musicVolumeHandler);
            }
            
            // Create bound handler
            this.musicVolumeHandler = (e) => {
                this.setMusicVolume(e.target.value / 100);
            };
            
            musicSlider.addEventListener('input', this.musicVolumeHandler);
            musicSlider.value = this.musicVolume * 100;
            
            console.log('🎵 Music volume slider configurato:', this.musicVolume);
        } else {
            console.warn('⚠️ Music volume slider non trovato in HTML');
        }
        
        console.log('🎛️ Controllo volume musicale configurato:', {
            music: this.musicVolume,
            musicSliderFound: !!musicSlider
        });
    }
    
    // Create music volume controls
    createMusicVolumeControls() {
        const musicControls = document.querySelector('.music-controls');
        if (!musicControls) return;
        
        // Remove ALL old volume controls to prevent duplicates
        const oldVolumeControls = musicControls.querySelectorAll('.volume-control');
        oldVolumeControls.forEach(control => {
            control.remove();
        });
        
        // Also remove any standalone volume sliders
        const oldSliders = musicControls.querySelectorAll('#musicVolumeSlider');
        oldSliders.forEach(slider => {
            if (slider.parentElement && !slider.parentElement.classList.contains('volume-control')) {
                slider.remove();
            }
        });
        
        // Remove any orphaned volume labels
        const oldLabels = musicControls.querySelectorAll('.volume-label');
        oldLabels.forEach(label => {
            if (!label.closest('.volume-control')) {
                label.remove();
            }
        }
        )
        
        // Create new music volume control
        const volumeContainer = document.createElement('div');
        volumeContainer.className = 'music-volume-controls';
        volumeContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            align-items: flex-end;
        `;
        
        // Music volume control
        const musicVolumeControl = document.createElement('div');
        musicVolumeControl.className = 'volume-control music-volume';
        musicVolumeControl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        const musicLabel = document.createElement('span');
        musicLabel.className = 'volume-label';
        musicLabel.textContent = '🎵';
        musicLabel.style.cssText = `
            font-size: 0.8rem;
            color: #d4af37;
            min-width: 20px;
        `;
        
        const musicSlider = document.createElement('input');
        musicSlider.type = 'range';
        musicSlider.id = 'musicVolumeSlider';
        musicSlider.className = 'volume-slider';
        musicSlider.min = '0';
        musicSlider.max = '100';
        musicSlider.value = this.musicVolume * 100;
        musicSlider.style.cssText = `
            width: 80px;
            height: 4px;
            background: #8b4513;
            outline: none;
            border-radius: 2px;
        `;
        
        musicVolumeControl.appendChild(musicLabel);
        musicVolumeControl.appendChild(musicSlider);
        
        volumeContainer.appendChild(musicVolumeControl);
        musicControls.appendChild(volumeContainer);
        
        // Add event listeners
        musicSlider.addEventListener('input', (e) => this.setMusicVolume(e.target.value / 100));
        
        // Set initial values from current settings
        musicSlider.value = this.musicVolume * 100;
        
        console.log('🎛️ Controllo volume musicale creato');
    }
    
    // Setup event listeners
    setupEventListeners() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const loopBtn = document.getElementById('loopBtn');
        
        // Playback controls - only for master
        if (this.authManager.isMaster()) {
            if (playPauseBtn) playPauseBtn.addEventListener('click', () => this.togglePlayPause());
            if (stopBtn) stopBtn.addEventListener('click', () => this.stopMusic());
            if (loopBtn) loopBtn.addEventListener('click', () => this.toggleLoop());
        }
    }
    
    // Setup audio events
    setupAudioEvents() {
        if (!this.audioElement) return;
        
        this.audioElement.addEventListener('loadedmetadata', () => {
            this.updateTrackDisplay();
            
            // FIXED: Apply current volume settings when audio loads
            if (this.audioElement) {
                this.audioElement.volume = this.musicVolume;
                this.audioElement.muted = this.musicVolume === 0;
            }
        });
        
        this.audioElement.addEventListener('timeupdate', () => {
            this.updateTrackDisplay();
        });
        
        this.audioElement.addEventListener('ended', () => {
            if (this.isLooping) {
                this.audioElement.currentTime = 0;
                this.audioElement.play().catch(error => {
                    console.warn('⚠️ Errore riproduzione loop:', error.message);
                });
            } else {
                this.isPlaying = false;
                this.updatePlayPauseButton();
                if (this.authManager.isMaster()) {
                    this.syncMusicState();
                }
            }
        });
        
        this.audioElement.addEventListener('error', (e) => {
            console.warn('⚠️ Errore audio:', e.target.error?.message || 'Errore sconosciuto');
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });
        
        // Prevent seeking for non-masters
        if (!this.authManager.isMaster()) {
            this.audioElement.addEventListener('seeking', (e) => {
                e.preventDefault();
                return false;
            });
        }
    }
    
    // Update master controls visibility
    updateMasterControls() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const loopBtn = document.getElementById('loopBtn');
        const isMaster = this.authManager.isMaster();
        
        // Show/hide master controls
        if (playPauseBtn) playPauseBtn.style.display = isMaster ? 'block' : 'none';
        if (stopBtn) stopBtn.style.display = isMaster ? 'block' : 'none';
        if (loopBtn) loopBtn.style.display = isMaster ? 'block' : 'none';
    }
    
    // Start sync interval (Master only)
    startSyncInterval() {
        if (!this.authManager.isMaster()) return;
        
        this.syncInterval = setInterval(() => {
            if (this.currentTrack && !this.isSyncing) {
                this.syncMusicState();
            }
        }, this.syncFrequency);
    }
    
    // Start master state check (Master only)
    startMasterStateCheck() {
        if (!this.authManager.isMaster()) return;
        
        this.masterStateCheckInterval = setInterval(() => {
            if (this.currentTrack && this.audioElement) {
                // Ensure audio element state matches our state
                if (this.isPlaying && this.audioElement.paused) {
                    this.audioElement.play().catch(error => {
                        console.warn('⚠️ Errore riproduzione automatica:', error.message);
                    });
                } else if (!this.isPlaying && !this.audioElement.paused) {
                    this.audioElement.pause();
                }
            }
        }, 500); // Check every 500ms
    }
    
    // Stop sync interval
    stopSyncInterval() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        if (this.masterStateCheckInterval) {
            clearInterval(this.masterStateCheckInterval);
            this.masterStateCheckInterval = null;
        }
    }
    
    // Listen to music state (for synchronization)
    listenToMusicState() {
        const room = this.authManager.getCurrentRoom();
        if (!room) {
            console.error('❌ Nessuna stanza per ascoltare stato musica');
            return;
        }
        
        this.musicStateListener = FirebaseHelper.listenToData(`rooms/${room}/musicState`, (snapshot) => {
            if (!this.authManager.isMaster()) {
                this.handleMusicStateUpdate(snapshot);
            }
        });
    }
    
    // Handle music state update (synchronization for players)
    handleMusicStateUpdate(snapshot) {
        if (this.authManager.isMaster() || this.isSyncing) return;
        
        try {
            const musicState = snapshot.val();
            if (!musicState) {
                // No music state - stop playback
                if (this.audioElement) {
                    this.audioElement.pause();
                    this.audioElement.src = '';
                }
                this.currentTrack = null;
                this.isPlaying = false;
                this.updatePlayPauseButton();
                this.updateStopButton();
                this.updateTrackDisplay();
                return;
            }
            
            this.isSyncing = true;
            
            // Sync current track
            if (musicState.currentTrackId && musicState.currentTrackId !== this.currentTrack?.id) {
                this.selectTrackById(musicState.currentTrackId, false); // Don't sync back
            }
            
            // Sync play/pause state with precise timing
            if (musicState.isPlaying !== this.isPlaying) {
                if (musicState.isPlaying && this.audioElement && this.currentTrack) {
                    // Calculate expected current time based on timestamp
                    const timeSinceUpdate = Date.now() - musicState.timestamp;
                    const expectedTime = (musicState.currentTime || 0) + (timeSinceUpdate / 1000);
                    
                    this.audioElement.currentTime = expectedTime;
                    this.audioElement.play().catch(error => {
                        console.warn('⚠️ Errore riproduzione sincronizzata:', error.message);
                    });
                    this.isPlaying = true;
                } else if (!musicState.isPlaying && this.audioElement) {
                    this.audioElement.pause();
                    this.audioElement.currentTime = musicState.currentTime || 0;
                    this.isPlaying = false;
                }
                this.updatePlayPauseButton();
                this.updateStopButton();
            }
            
            // Sync loop state
            if (musicState.isLooping !== this.isLooping) {
                this.isLooping = musicState.isLooping;
                if (this.audioElement) {
                    this.audioElement.loop = this.isLooping;
                }
                this.updateLoopButton();
            }
            
            // Sync time if playing and significant difference
            if (musicState.isPlaying && this.isPlaying && this.audioElement && musicState.currentTime) {
                const timeSinceUpdate = Date.now() - musicState.timestamp;
                const expectedTime = musicState.currentTime + (timeSinceUpdate / 1000);
                const timeDiff = Math.abs(this.audioElement.currentTime - expectedTime);
                
                if (timeDiff > 2) { // More than 2 seconds difference
                    this.audioElement.currentTime = expectedTime;
                }
            }
            
            setTimeout(() => {
                this.isSyncing = false;
            }, 200);
            
        } catch (error) {
            console.error('❌ Errore aggiornamento stato musica:', error);
            this.isSyncing = false;
        }
    }
    
    // Sync music state to Firebase (Master only)
    async syncMusicState() {
        if (!this.authManager.isMaster() || this.isSyncing) return;
        
        const room = this.authManager.getCurrentRoom();
        if (!room) return;
        
        try {
            const musicState = {
                currentTrackId: this.currentTrack?.id || null,
                isPlaying: this.isPlaying,
                isLooping: this.isLooping,
                currentTime: this.audioElement?.currentTime || 0,
                timestamp: Date.now()
            };
            
            await FirebaseHelper.setData(`rooms/${room}/musicState`, musicState);
            
        } catch (error) {
            console.error('❌ Errore sincronizzazione stato musica:', error);
        }
    }
    
    // FIXED: Select track by ID with proper library path
    async selectTrackById(trackId, shouldSync = true) {
        if (!this.authManager.isMaster() && shouldSync) {
            return; // Only master can manually select tracks
        }
        
        const room = this.authManager.getCurrentRoom();
        if (!room) return;
        
        try {
            console.log('🎵 Selezione traccia per ID:', trackId);
            
            // FIXED: Find track in music library with correct path
            const musicRef = FirebaseHelper.getRef(`rooms/${room}/assets/music`);
            const snapshot = await musicRef.once('value');
            const musicData = snapshot.val();
            
            if (!musicData) {
                console.warn('⚠️ Nessuna musica trovata nella libreria');
                return;
            }
            
            let trackData = null;
            
            // Search through all music entries
            for (const [key, track] of Object.entries(musicData)) {
                if (track && track.id === trackId) {
                    trackData = track;
                    break;
                }
            }
            
            if (!trackData) {
                console.warn('⚠️ Traccia non trovata con ID:', trackId);
                return;
            }
            
            // Update current track
            this.currentTrack = trackData;
            
            // FIXED: Load audio with proper error handling
            if (this.audioElement && trackData.url) {
                this.audioElement.src = trackData.url;
                
                // FIXED: Set correct volume and mute state
                this.audioElement.volume = this.musicVolume;
                this.audioElement.muted = this.musicVolume === 0;
                
                this.audioElement.load();
                
                // Wait for audio to be ready
                this.audioElement.addEventListener('canplay', () => {
                    // FIXED: Ensure volume is applied when ready
                    this.audioElement.volume = this.musicVolume;
                    this.audioElement.muted = this.musicVolume === 0;
                }, { once: true });
                
                this.audioElement.addEventListener('error', (e) => {
                    console.error('❌ Errore caricamento audio:', e.target.error);
                }, { once: true });
            }
            
            // Update UI
            this.updateTrackDisplay();
            
            // Enable controls for master
            if (this.authManager.isMaster()) {
                const playPauseBtn = document.getElementById('playPauseBtn');
                const stopBtn = document.getElementById('stopBtn');
                if (playPauseBtn) playPauseBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = false;
            }
            
            // Sync state if master
            if (this.authManager.isMaster() && shouldSync) {
                await this.syncMusicState();
            }
            
        } catch (error) {
            console.error('❌ Errore selezione traccia:', error);
        }
    }
    
    // Toggle play/pause (Master only)
    async togglePlayPause() {
        if (!this.authManager.isMaster()) {
            return;
        }
        
        if (!this.currentTrack || !this.audioElement) {
            console.warn('⚠️ Nessuna traccia selezionata per play/pause');
            return;
        }
        
        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
        } else {
            try {
                // FIXED: Ensure volume is applied before playing
                this.audioElement.volume = this.musicVolume;
                this.audioElement.muted = this.musicVolume === 0;
                
                await this.audioElement.play();
                this.isPlaying = true;
            } catch (error) {
                console.warn('⚠️ Errore riproduzione:', error.message);
                this.isPlaying = false;
            }
        }
        
        this.updatePlayPauseButton();
        this.updateStopButton();
        await this.syncMusicState();
    }
    
    // Stop music (Master only)
    async stopMusic() {
        if (!this.authManager.isMaster()) {
            return;
        }
        
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.updateStopButton();
        await this.syncMusicState();
    }
    
    // Toggle loop (Master only)
    async toggleLoop() {
        if (!this.authManager.isMaster()) {
            return;
        }
        
        this.isLooping = !this.isLooping;
        if (this.audioElement) {
            this.audioElement.loop = this.isLooping;
        }
        
        this.updateLoopButton();
        await this.syncMusicState();
    }
    
    // FIXED: Set music volume (separate from ambient)
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        // FIXED: Apply volume to audio element immediately
        if (this.audioElement) {
            this.audioElement.volume = this.musicVolume;
            
            // FIXED: If volume is 0, mute the audio completely
            if (this.musicVolume === 0) {
                this.audioElement.muted = true;
            } else {
                this.audioElement.muted = false;
            }
        }
        
        // FIXED: Update slider value
        const musicSlider = document.getElementById('musicVolumeSlider');
        if (musicSlider) {
            musicSlider.value = this.musicVolume * 100;
        }
        
        // Save volume preference
        localStorage.setItem('tavernaMusicVolume', this.musicVolume.toString());
    }
    // Update play/pause button
    updatePlayPauseButton() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (this.authManager.isMaster() && playPauseBtn) {
            playPauseBtn.textContent = this.isPlaying ? '⏸️' : '▶️';
        }
    }
    
    // Update stop button
    updateStopButton() {
        const stopBtn = document.getElementById('stopBtn');
        if (this.authManager.isMaster() && stopBtn) {
            stopBtn.disabled = !this.currentTrack;
        }
    }
    
    // Update loop button
    updateLoopButton() {
        const loopBtn = document.getElementById('loopBtn');
        if (this.authManager.isMaster() && loopBtn) {
            loopBtn.style.background = this.isLooping ? '#d4af37' : '#8b4513';
            loopBtn.style.color = this.isLooping ? '#2c1810' : '#d4af37';
        }
    }
    
    // Update track display
    updateTrackDisplay() {
        const currentTrackElement = document.getElementById('currentTrack');
        if (!currentTrackElement) return;
        
        const trackName = currentTrackElement.querySelector('.track-name');
        const trackTime = currentTrackElement.querySelector('.track-time');
        
        if (this.currentTrack && trackName && trackTime) {
            trackName.textContent = this.currentTrack.title || this.currentTrack.name;
            
            const currentTime = this.audioElement?.currentTime || 0;
            const duration = this.audioElement?.duration || 0;
            
            trackTime.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
        } else if (trackName && trackTime) {
            trackName.textContent = 'Nessuna traccia selezionata';
            trackTime.textContent = '--:-- / --:--';
        }
    }
    
    // Format time in MM:SS
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '--:--';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // Cleanup
    cleanup() {
        if (this.musicStateListener) {
            FirebaseHelper.stopListening(this.musicStateListener);
            this.musicStateListener = null;
        }
        
        this.stopSyncInterval();
        
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
    }
}

export default MusicSystem;