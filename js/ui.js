// =====================================================
// INFINITE SLICE - CONTROLE DE UI
// =====================================================

class UIManager {
    constructor() {
        this.screens = {
            menu: document.getElementById('menu-screen'),
            game: document.getElementById('game-screen'),
            gameover: document.getElementById('gameover-screen')
        };
        
        this.buttons = {
            start: document.getElementById('btn-start'),
            restart: document.getElementById('btn-restart'),
            menu: document.getElementById('btn-menu')
        };
        
        this.loading = document.getElementById('loading');
        
        this.setupEventListeners();
        this.createMenuParticles();
        this.createGameoverParticles();
    }

    // Configurar event listeners
    setupEventListeners() {
        // Helper para adicionar eventos de click e touch
        const addButtonEvent = (button, callback) => {
            let touched = false;
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                touched = true;
                callback();
            }, { passive: false });
            
            button.addEventListener('click', (e) => {
                if (!touched) {
                    callback();
                }
                touched = false;
            });
        };
        
        // Botões
        addButtonEvent(this.buttons.start, () => {
            audioManager.play('ui');
            this.showScreen('game');
            window.dispatchEvent(new Event('startgame'));
        });
        
        addButtonEvent(this.buttons.restart, () => {
            audioManager.play('ui');
            this.showScreen('game');
            window.dispatchEvent(new Event('startgame'));
        });
        
        addButtonEvent(this.buttons.menu, () => {
            audioManager.play('ui');
            this.showScreen('menu');
        });
        
        // Event de game over
        window.addEventListener('gameover', (e) => {
            this.showGameOver(e.detail);
        });
        
        // Carregar highscore no menu
        this.updateHighscore();
    }

    // Mostrar tela específica
    showScreen(screenName) {
        // Esconder todas
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Mostrar a desejada
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
        
        // Se voltou ao menu, atualizar highscore
        if (screenName === 'menu') {
            this.updateHighscore();
        }
    }

    // Atualizar highscore no menu
    updateHighscore() {
        const highscore = UTILS.getHighscore();
        document.getElementById('highscore').textContent = highscore;
    }

    // Mostrar tela de game over
    showGameOver(stats) {
        setTimeout(() => {
            this.showScreen('gameover');
            
            // Atualizar título baseado no resultado
            const titleElement = document.querySelector('.gameover-title');
            if (titleElement) {
                if (stats.missionComplete) {
                    titleElement.innerHTML = 'MISSÃO <span class="accent">COMPLETA</span>';
                } else {
                    titleElement.innerHTML = 'GAME <span class="accent">OVER</span>';
                }
            }
            
            // Animar números
            this.animateNumber('final-score', 0, stats.score, 1000);
            this.animateNumber('max-combo', 0, stats.maxCombo, 800);
            this.animateNumber('total-slices', 0, stats.totalSlices, 600);
            
            // Mostrar novo recorde
            const newRecord = document.getElementById('new-record');
            if (stats.isNewRecord) {
                newRecord.style.display = 'block';
            } else {
                newRecord.style.display = 'none';
            }
        }, 500);
    }

    // Animar contagem de números
    animateNumber(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * easeOut);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Criar partículas animadas no menu
    createMenuParticles() {
        const container = document.getElementById('particles-menu');
        if (!container) {
            console.warn('Container particles-menu não encontrado');
            return;
        }
        
        const particleCount = 80;
        
        // Cores: verde neon e branco
        const colors = [
            'rgba(0, 238, 38, 0.6)',   // Verde neon
            'rgba(0, 255, 122, 0.5)',  // Verde neon claro
            'rgba(255, 255, 255, 0.4)', // Branco
            'rgba(0, 238, 38, 0.4)',   // Verde neon suave
            'rgba(255, 238, 0, 0.3)'   // Amarelo suave
        ];
        
        // Adicionar CSS de animação primeiro
        if (!document.getElementById('particle-animation-style')) {
            const style = document.createElement('style');
            style.id = 'particle-animation-style';
            style.textContent = `
                @keyframes floatParticle {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                        opacity: 0.1;
                    }
                    25% {
                        opacity: 0.8;
                    }
                    75% {
                        opacity: 0.8;
                    }
                    50% {
                        transform: translate(30px, -30px) scale(1.2);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'menu-particle';
            
            const size = Math.random() * 3 + 2;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = Math.random() * 10 + 5;
            const delay = Math.random() * 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}%;
                top: ${y}%;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                animation: floatParticle ${duration}s ease-in-out ${delay}s infinite;
                box-shadow: 0 0 ${size * 2}px ${color};
            `;
            
            container.appendChild(particle);
        }
        
        console.log(`✨ ${particleCount} partículas criadas no menu`);
    }

    // Criar partículas animadas na tela de game over
    createGameoverParticles() {
        const container = document.getElementById('particles-gameover');
        if (!container) {
            console.warn('Container particles-gameover não encontrado');
            return;
        }
        
        const particleCount = 80;
        
        // Cores: verde neon e branco
        const colors = [
            'rgba(0, 238, 38, 0.6)',   // Verde neon
            'rgba(0, 255, 122, 0.5)',  // Verde neon claro
            'rgba(255, 255, 255, 0.4)', // Branco
            'rgba(0, 238, 38, 0.4)',   // Verde neon suave
            'rgba(255, 238, 0, 0.3)'   // Amarelo suave
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'menu-particle';
            
            const size = Math.random() * 3 + 2;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = Math.random() * 10 + 5;
            const delay = Math.random() * 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}%;
                top: ${y}%;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                animation: floatParticle ${duration}s ease-in-out ${delay}s infinite;
                box-shadow: 0 0 ${size * 2}px ${color};
            `;
            
            container.appendChild(particle);
        }
        
        console.log(`✨ ${particleCount} partículas criadas no gameover`);
    }

    // Esconder loading
    hideLoading() {
        this.loading.classList.add('hidden');
    }

    // Mostrar loading
    showLoading() {
        this.loading.classList.remove('hidden');
    }

    // Mostrar mensagem temporária
    showMessage(text, duration = 2000, color = '#b0cddf') {
        const message = document.createElement('div');
        message.className = 'floating-message';
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(176, 205, 223, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(176, 205, 223, 0.3);
            border-radius: 15px;
            padding: 20px 40px;
            font-size: 1.5rem;
            font-weight: 700;
            color: ${color};
            text-shadow: 0 0 20px ${color};
            z-index: 9999;
            pointer-events: none;
            animation: messagePopup 0.5s ease-out;
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'messageFadeOut 0.5s ease-out forwards';
            setTimeout(() => message.remove(), 500);
        }, duration);
        
        // Adicionar animações se não existirem
        if (!document.getElementById('message-animation-style')) {
            const style = document.createElement('style');
            style.id = 'message-animation-style';
            style.textContent = `
                @keyframes messagePopup {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                @keyframes messageFadeOut {
                    to {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Shake screen (efeito de impacto)
    shakeScreen(intensity = 10, duration = 200) {
        const gameScreen = this.screens.game;
        const originalTransform = gameScreen.style.transform;
        
        const startTime = performance.now();
        
        const shake = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const currentIntensity = intensity * (1 - progress);
                const x = UTILS.random(-currentIntensity, currentIntensity);
                const y = UTILS.random(-currentIntensity, currentIntensity);
                
                gameScreen.style.transform = `translate(${x}px, ${y}px)`;
                requestAnimationFrame(shake);
            } else {
                gameScreen.style.transform = originalTransform;
            }
        };
        
        requestAnimationFrame(shake);
    }
}

