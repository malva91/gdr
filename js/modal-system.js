// Modal system for styled popups - Taverna dei Cani di Odino theme
export class ModalSystem {
    constructor() {
        this.activeModals = new Set();
        this.modalCounter = 0;
        this.setupGlobalStyles();
    }
    
    // Setup global modal styles
    setupGlobalStyles() {
        if (document.getElementById('modal-system-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'modal-system-styles';
        style.textContent = `
            /* Modal System Styles - Taverna Theme */
            .taverna-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(26, 15, 8, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(8px);
                animation: tavernaFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Cinzel', serif;
            }
            
            .taverna-modal-dialog {
                background: linear-gradient(135deg, #3d2716 0%, #2c1810 100%);
                border: 3px solid #8b4513;
                border-radius: 15px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                color: #d4af37;
                box-shadow: 
                    0 0 40px rgba(212, 175, 55, 0.4),
                    inset 0 1px 0 rgba(212, 175, 55, 0.2);
                animation: tavernaScaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            
            .taverna-modal-dialog::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #d4af37 0%, #8b4513 50%, #d4af37 100%);
                opacity: 0.8;
            }
            
            .taverna-modal-header {
                padding: 1.5rem 2rem 1rem;
                border-bottom: 2px solid rgba(139, 69, 19, 0.6);
                text-align: center;
                position: relative;
                background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, transparent 100%);
            }
            
            .taverna-modal-title {
                font-family: 'Uncial Antiqua', serif;
                font-size: 1.4rem;
                color: #d4af37;
                margin: 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                letter-spacing: 1px;
            }
            
            .taverna-modal-icon {
                font-size: 2rem;
                margin-bottom: 0.5rem;
                display: block;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
            }
            
            .taverna-modal-content {
                padding: 1.5rem 2rem;
                text-align: center;
                line-height: 1.6;
                font-size: 1rem;
                color: #e6d3a3;
            }
            
            .taverna-modal-message {
                margin: 0 0 2rem 0;
                font-weight: 500;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
            }
            
            .taverna-modal-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .taverna-modal-btn {
                padding: 0.75rem 2rem;
                border: none;
                border-radius: 8px;
                font-family: 'Cinzel', serif;
                font-weight: 600;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                min-width: 120px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .taverna-modal-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s ease;
            }
            
            .taverna-modal-btn:hover::before {
                left: 100%;
            }
            
            .taverna-modal-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            }
            
            .taverna-modal-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            
            /* Button Variants */
            .taverna-modal-btn.primary {
                background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
                color: #d4af37;
                border: 2px solid #d4af37;
            }
            
            .taverna-modal-btn.primary:hover {
                background: linear-gradient(135deg, #a0522d 0%, #cd853f 100%);
                border-color: #ffd700;
                color: #ffd700;
            }
            
            .taverna-modal-btn.danger {
                background: linear-gradient(135deg, #8b0000 0%, #dc143c 100%);
                color: #ffcccb;
                border: 2px solid #ff6b6b;
            }
            
            .taverna-modal-btn.danger:hover {
                background: linear-gradient(135deg, #dc143c 0%, #ff4500 100%);
                border-color: #ff8c8c;
                color: #fff;
            }
            
            .taverna-modal-btn.success {
                background: linear-gradient(135deg, #228b22 0%, #32cd32 100%);
                color: #f0fff0;
                border: 2px solid #90ee90;
            }
            
            .taverna-modal-btn.success:hover {
                background: linear-gradient(135deg, #32cd32 0%, #00ff00 100%);
                border-color: #98fb98;
                color: #fff;
            }
            
            .taverna-modal-btn.warning {
                background: linear-gradient(135deg, #ff8c00 0%, #ffa500 100%);
                color: #2c1810;
                border: 2px solid #ffd700;
            }
            
            .taverna-modal-btn.warning:hover {
                background: linear-gradient(135deg, #ffa500 0%, #ffb347 100%);
                border-color: #ffff00;
                color: #000;
            }
            
            .taverna-modal-btn.secondary {
                background: linear-gradient(135deg, #696969 0%, #808080 100%);
                color: #f5f5f5;
                border: 2px solid #a9a9a9;
            }
            
            .taverna-modal-btn.secondary:hover {
                background: linear-gradient(135deg, #808080 0%, #a9a9a9 100%);
                border-color: #d3d3d3;
                color: #fff;
            }
            
            /* Input Styles */
            .taverna-modal-input {
                width: 100%;
                padding: 0.75rem 1rem;
                background: rgba(44, 24, 16, 0.8);
                border: 2px solid #8b4513;
                border-radius: 6px;
                color: #d4af37;
                font-family: 'Cinzel', serif;
                font-size: 1rem;
                margin-bottom: 1rem;
                transition: all 0.3s ease;
            }
            
            .taverna-modal-input:focus {
                outline: none;
                border-color: #d4af37;
                box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
                background: rgba(44, 24, 16, 0.9);
            }
            
            .taverna-modal-input::placeholder {
                color: rgba(212, 175, 55, 0.6);
            }
            
            /* Textarea Styles */
            .taverna-modal-textarea {
                width: 100%;
                min-height: 100px;
                padding: 0.75rem 1rem;
                background: rgba(44, 24, 16, 0.8);
                border: 2px solid #8b4513;
                border-radius: 6px;
                color: #d4af37;
                font-family: 'Cinzel', serif;
                font-size: 1rem;
                margin-bottom: 1rem;
                resize: vertical;
                transition: all 0.3s ease;
            }
            
            .taverna-modal-textarea:focus {
                outline: none;
                border-color: #d4af37;
                box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
                background: rgba(44, 24, 16, 0.9);
            }
            
            /* Animations */
            @keyframes tavernaFadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            
            @keyframes tavernaScaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.8) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            @keyframes tavernaFadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }
            
            @keyframes tavernaScaleOut {
                from {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: scale(0.8) translateY(-20px);
                }
            }
            
            /* Mobile Responsive */
            @media (max-width: 768px) {
                .taverna-modal-dialog {
                    width: 95%;
                    margin: 1rem;
                }
                
                .taverna-modal-header,
                .taverna-modal-content {
                    padding: 1rem 1.5rem;
                }
                
                .taverna-modal-title {
                    font-size: 1.2rem;
                }
                
                .taverna-modal-actions {
                    flex-direction: column;
                }
                
                .taverna-modal-btn {
                    width: 100%;
                    min-width: auto;
                }
            }
            
            /* Loading Spinner */
            .taverna-modal-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(212, 175, 55, 0.3);
                border-top: 3px solid #d4af37;
                border-radius: 50%;
                animation: tavernaSpinnerRotate 1s linear infinite;
                margin: 0 auto 1rem;
            }
            
            @keyframes tavernaSpinnerRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Create base modal structure
    createModal(options = {}) {
        const modalId = `taverna-modal-${++this.modalCounter}`;
        
        const overlay = document.createElement('div');
        overlay.className = 'taverna-modal-overlay';
        overlay.id = modalId;
        
        const dialog = document.createElement('div');
        dialog.className = 'taverna-modal-dialog';
        
        // Header
        if (options.title || options.icon) {
            const header = document.createElement('div');
            header.className = 'taverna-modal-header';
            
            if (options.icon) {
                const icon = document.createElement('div');
                icon.className = 'taverna-modal-icon';
                icon.textContent = options.icon;
                header.appendChild(icon);
            }
            
            if (options.title) {
                const title = document.createElement('h3');
                title.className = 'taverna-modal-title';
                title.textContent = options.title;
                header.appendChild(title);
            }
            
            dialog.appendChild(header);
        }
        
        // Content
        const content = document.createElement('div');
        content.className = 'taverna-modal-content';
        dialog.appendChild(content);
        
        overlay.appendChild(dialog);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && options.closeOnOverlay !== false) {
                this.closeModal(modalId);
                if (options.onCancel) options.onCancel();
            }
        });
        
        // ESC key handling
        const handleEscape = (e) => {
            if (e.key === 'Escape' && options.closeOnEscape !== false) {
                this.closeModal(modalId);
                if (options.onCancel) options.onCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        
        this.activeModals.add(modalId);
        
        return { overlay, dialog, content, modalId };
    }
    
    // Show modal
    showModal(overlay) {
        document.body.appendChild(overlay);
        
        // Focus management
        const firstButton = overlay.querySelector('.taverna-modal-btn');
        if (firstButton) {
            setTimeout(() => firstButton.focus(), 100);
        }
    }
    
    // Close modal with animation
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const dialog = modal.querySelector('.taverna-modal-dialog');
        
        modal.style.animation = 'tavernaFadeOut 0.3s ease-out';
        if (dialog) {
            dialog.style.animation = 'tavernaScaleOut 0.3s ease-out';
        }
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            this.activeModals.delete(modalId);
        }, 300);
    }
    
    // Styled Confirm Dialog
    confirm(message, title = 'Conferma', options = {}) {
        return new Promise((resolve) => {
            const modalOptions = {
                title: title,
                icon: options.icon || '⚠️',
                closeOnOverlay: false,
                closeOnEscape: true,
                onCancel: () => resolve(false)
            };
            
            const { overlay, content, modalId } = this.createModal(modalOptions);
            
            // Message
            const messageEl = document.createElement('p');
            messageEl.className = 'taverna-modal-message';
            messageEl.textContent = message;
            content.appendChild(messageEl);
            
            // Actions
            const actions = document.createElement('div');
            actions.className = 'taverna-modal-actions';
            
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'taverna-modal-btn primary';
            confirmBtn.textContent = options.confirmText || 'Sì';
            confirmBtn.addEventListener('click', () => {
                this.closeModal(modalId);
                resolve(true);
            });
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'taverna-modal-btn secondary';
            cancelBtn.textContent = options.cancelText || 'No';
            cancelBtn.addEventListener('click', () => {
                this.closeModal(modalId);
                resolve(false);
            });
            
            actions.appendChild(confirmBtn);
            actions.appendChild(cancelBtn);
            content.appendChild(actions);
            
            this.showModal(overlay);
        });
    }
    
    // Styled Alert Dialog
    alert(message, title = 'Avviso', options = {}) {
        return new Promise((resolve) => {
            const modalOptions = {
                title: title,
                icon: options.icon || 'ℹ️',
                closeOnOverlay: true,
                closeOnEscape: true,
                onCancel: () => resolve()
            };
            
            const { overlay, content, modalId } = this.createModal(modalOptions);
            
            // Message
            const messageEl = document.createElement('p');
            messageEl.className = 'taverna-modal-message';
            messageEl.textContent = message;
            content.appendChild(messageEl);
            
            // Actions
            const actions = document.createElement('div');
            actions.className = 'taverna-modal-actions';
            
            const okBtn = document.createElement('button');
            okBtn.className = 'taverna-modal-btn primary';
            okBtn.textContent = options.okText || 'OK';
            okBtn.addEventListener('click', () => {
                this.closeModal(modalId);
                resolve();
            });
            
            actions.appendChild(okBtn);
            content.appendChild(actions);
            
            this.showModal(overlay);
        });
    }
    
    // Styled Prompt Dialog
    prompt(message, defaultValue = '', title = 'Inserisci', options = {}) {
        return new Promise((resolve) => {
            const modalOptions = {
                title: title,
                icon: options.icon || '✏️',
                closeOnOverlay: false,
                closeOnEscape: true,
                onCancel: () => resolve(null)
            };
            
            const { overlay, content, modalId } = this.createModal(modalOptions);
            
            // Message
            const messageEl = document.createElement('p');
            messageEl.className = 'taverna-modal-message';
            messageEl.textContent = message;
            content.appendChild(messageEl);
            
            // Input
            const input = document.createElement('input');
            input.className = 'taverna-modal-input';
            input.type = 'text';
            input.value = defaultValue;
            input.placeholder = options.placeholder || '';
            content.appendChild(input);
            
            // Actions
            const actions = document.createElement('div');
            actions.className = 'taverna-modal-actions';
            
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'taverna-modal-btn primary';
            confirmBtn.textContent = options.confirmText || 'OK';
            confirmBtn.addEventListener('click', () => {
                this.closeModal(modalId);
                resolve(input.value);
            });
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'taverna-modal-btn secondary';
            cancelBtn.textContent = options.cancelText || 'Annulla';
            cancelBtn.addEventListener('click', () => {
                this.closeModal(modalId);
                resolve(null);
            });
            
            actions.appendChild(confirmBtn);
            actions.appendChild(cancelBtn);
            content.appendChild(actions);
            
            // Enter key handling
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });
            
            this.showModal(overlay);
            
            // Focus input
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);
        });
    }
    
    // Custom Modal with multiple options
    choice(message, choices, title = 'Scegli', options = {}) {
        return new Promise((resolve) => {
            const modalOptions = {
                title: title,
                icon: options.icon || '🤔',
                closeOnOverlay: false,
                closeOnEscape: true,
                onCancel: () => resolve(null)
            };
            
            const { overlay, content, modalId } = this.createModal(modalOptions);
            
            // Message
            const messageEl = document.createElement('p');
            messageEl.className = 'taverna-modal-message';
            messageEl.textContent = message;
            content.appendChild(messageEl);
            
            // Actions
            const actions = document.createElement('div');
            actions.className = 'taverna-modal-actions';
            
            choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className = `taverna-modal-btn ${choice.type || 'primary'}`;
                btn.textContent = choice.text;
                btn.addEventListener('click', () => {
                    this.closeModal(modalId);
                    resolve(choice.value !== undefined ? choice.value : index);
                });
                actions.appendChild(btn);
            });
            
            content.appendChild(actions);
            this.showModal(overlay);
        });
    }
    
    // Loading Modal
    loading(message = 'Caricamento...', title = 'Attendere') {
        const modalOptions = {
            title: title,
            icon: '⏳',
            closeOnOverlay: false,
            closeOnEscape: false
        };
        
        const { overlay, content, modalId } = this.createModal(modalOptions);
        
        // Spinner
        const spinner = document.createElement('div');
        spinner.className = 'taverna-modal-spinner';
        content.appendChild(spinner);
        
        // Message
        const messageEl = document.createElement('p');
        messageEl.className = 'taverna-modal-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);
        
        this.showModal(overlay);
        
        return {
            close: () => this.closeModal(modalId),
            updateMessage: (newMessage) => {
                messageEl.textContent = newMessage;
            }
        };
    }
    
    // Close all modals
    closeAll() {
        this.activeModals.forEach(modalId => {
            this.closeModal(modalId);
        });
    }
    
    // Check if any modal is open
    hasOpenModals() {
        return this.activeModals.size > 0;
    }
}

// Create global instance
const modalSystem = new ModalSystem();

// Export both class and instance
export { modalSystem };
export default ModalSystem;