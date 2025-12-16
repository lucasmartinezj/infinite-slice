// =====================================================
// INFINITE SLICE - LÓGICA PRINCIPAL DO JOGO
// =====================================================

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.saber = null;
        this.particles = null;
        this.sliceDetector = null;
        
        this.machines = [];
        this.debris = [];
        
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.totalSlices = 0;
        this.comboTimer = 0;
        
        this.timeLeft = CONFIG.GAME.duration;
        this.spawnTimer = 0;
        
        // Sistema de níveis e bosses
        this.currentLevelIndex = 0;
        this.currentLevel = CONFIG.LEVELS ? CONFIG.LEVELS[0] : null;
        this.spawnRate = this.currentLevel ? this.currentLevel.spawnRate : CONFIG.GAME.spawnRate;
        this.bossComboThreshold = CONFIG.BOSS ? CONFIG.BOSS.comboThreshold : 5;
        this.bossRewardTime = CONFIG.BOSS ? CONFIG.BOSS.rewardTime : 8;
        this.currentBossHitCooldown = CONFIG.BOSS ? CONFIG.BOSS.hitCooldown : 400;
        this.bossActive = false;
        this.bossAvailable = false;
        this.bossIncoming = false;
        this.currentBoss = null;
        // levelScore é o score do nível atual (reseta a cada nível) - usado para triggar boss
        this.levelScore = 0;
        this.pointsToTriggerBoss = this.currentLevel && this.currentLevel.pointsToAdvance ? this.currentLevel.pointsToAdvance : 350;
        this.levelCountdownActive = false;
        this.levelCountdownInterval = null;
        this.countdownElement = null;
        this.nextLevelMessageEl = null;
        this.levelCountdownTimeouts = [];
        
        // Sistema para rastrear todos os timeouts do jogo
        this.gameTimeouts = [];
        
        // Sistema de vidas
        this.maxLives = CONFIG.LIVES || 3;
        this.lives = this.maxLives;
        
        // Sistema de bônus
        this.slicesWithoutInfinitePay = 0;
        this.bonusesEarned = 0;
        
        this.isPlaying = false;
        this.isPaused = false;
        
        this.lastTime = 0;
        
        // Referência global para debris
        window.gameInstance = this;
    }

    // Inicializar Three.js e cena
    init() {
        const canvas = document.getElementById('game-canvas');
        const slashCanvas = document.getElementById('slash-canvas');
        
        // Configurar renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: CONFIG.CANVAS.antialias,
            alpha: CONFIG.CANVAS.alpha,
            powerPreference: CONFIG.CANVAS.powerPreference
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 1);
        
        // Configurar cena
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0e27, 15, 40);
        
        // Fundo gradiente futurista
        this.scene.background = new THREE.Color(0x000000);
        
        // Configurar câmera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Iluminação
        this.setupLighting();
        
        // Inicializar sistemas
        this.particles = new ParticleSystem(this.scene);
        this.saber = new LightSaber(this.scene, slashCanvas);
        this.sliceDetector = new SliceDetector(this.camera, this.machines);
        
        // Event listeners
        this.setupEventListeners();
        
        // Começar loop de renderização
        this.animate();
    }

    // Configurar iluminação da cena - MELHORADA PARA REFLEXOS METÁLICOS
    setupLighting() {
        // Luz ambiente mais forte para reflexos
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Luz direcional principal (mais intensa)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);
        
        // Segunda luz direcional (para reflexos)
        const directionalLight2 = new THREE.DirectionalLight(0xb0cddf, 0.8);
        directionalLight2.position.set(-5, 8, 5);
        this.scene.add(directionalLight2);
        
        // Luz azul de fundo (InfinitePay) - mais forte
        const backLight = new THREE.PointLight(0xb0cddf, 2, 50);
        backLight.position.set(0, 0, -5);
        this.scene.add(backLight);
        
        // Luzes laterais (efeito futurista) - mais intensas
        const leftLight = new THREE.PointLight(0x4dd0e1, 1.5, 25);
        leftLight.position.set(-10, 5, 5);
        this.scene.add(leftLight);
        
        const rightLight = new THREE.PointLight(0x00ff88, 1.5, 25);
        rightLight.position.set(10, 5, 5);
        this.scene.add(rightLight);
        
        // Luz superior (key light para brilho)
        const topLight = new THREE.PointLight(0xffffff, 2, 30);
        topLight.position.set(0, 15, 10);
        this.scene.add(topLight);
        
        // Luzes inferiores (rim light)
        const bottomLight1 = new THREE.PointLight(0xff00ff, 0.8, 20);
        bottomLight1.position.set(-8, -5, 3);
        this.scene.add(bottomLight1);
        
        const bottomLight2 = new THREE.PointLight(0x00ffff, 0.8, 20);
        bottomLight2.position.set(8, -5, 3);
        this.scene.add(bottomLight2);
    }

    // Configurar event listeners
    setupEventListeners() {
        // Mouse events
        window.addEventListener('mousedown', (e) => this.onInputStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => this.onInputMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', () => this.onInputEnd());
        
        // Touch events - só previne default quando o jogo está ativo
        window.addEventListener('touchstart', (e) => {
            if (!this.isPlaying) return;
            e.preventDefault();
            const touch = e.touches[0];
            this.onInputStart(touch.clientX, touch.clientY);
        }, { passive: false });
        
        window.addEventListener('touchmove', (e) => {
            if (!this.isPlaying) return;
            e.preventDefault();
            const touch = e.touches[0];
            this.onInputMove(touch.clientX, touch.clientY);
        }, { passive: false });
        
        window.addEventListener('touchend', (e) => {
            if (!this.isPlaying) return;
            e.preventDefault();
            this.onInputEnd();
        }, { passive: false });
        
        // Resize
        window.addEventListener('resize', () => this.onResize());
    }

    // Input start (mouse/touch)
    onInputStart(x, y) {
        if (!this.isPlaying) return;
        this.saber.start(x, y);
    }

    // Input move
    onInputMove(x, y) {
        if (!this.isPlaying) return;
        this.saber.move(x, y);
        
        // Verificar cortes
        const sliced = this.sliceDetector.checkSlice(this.saber.trail);
        
        if (sliced.length > 0) {
            sliced.forEach(slice => {
                this.onMachineSliced(slice);
            });
        }
    }

    // Input end
    onInputEnd() {
        if (!this.isPlaying) return;
        this.saber.stop();
    }

    // Quando uma máquina é cortada - CORRIGIDO
    onMachineSliced(sliceData) {
        const { machine, slicePoint, sliceDirection, screenPos, distance } = sliceData;
        
        // Verificar se máquina existe
        if (!machine) return;
        
        console.log(`⚔️ Cortando máquina ${machine.colorData ? machine.colorData.name : 'unknown'} (dist: ${distance.toFixed(1)}px)`);
        
        // Boss tem comportamento próprio (NÃO marcar como sliced, precisa de múltiplos hits)
        if (machine.isBoss) {
            this.handleBossHit(machine, slicePoint, sliceDirection, screenPos);
            return;
        }
        
        // Para máquinas normais e InfinitePay, verificar se já foi cortada
        if (machine.sliced) return;
        
        // Marcar como processada IMEDIATAMENTE para evitar chamadas duplicadas
        machine.sliced = true;
        
        // VERIFICAR SE É INFINITEPAY - NÃO PODE CORTAR!
        if (machine.isInfinitePay) {
            this.onInfinitePaySliced(machine);
            return;
        }
        
        console.log('🎯 INÍCIO DO CORTE - machine.sliced =', machine.sliced);
        
        console.log('✅ Marcada como cortada');
        
        // Atualizar contador ANTES de tudo
        this.totalSlices++;
        this.slicesWithoutInfinitePay++;
        
        console.log(`📊 Total slices: ${this.totalSlices}, Sem InfinitePay: ${this.slicesWithoutInfinitePay}`);
        
        // SISTEMA DE BÔNUS: +5s a cada 5 cortes sem cortar InfinitePay!
        if (this.slicesWithoutInfinitePay >= 5) {
            this.timeLeft += 5;
            this.bonusesEarned++;
            this.slicesWithoutInfinitePay = 0;
            
            // Feedback visual
            this.showBonusMessage('+5 SEGUNDOS!', '#00ff00');
            audioManager.play('checkout'); // Som especial
            
            console.log('🎁 BÔNUS! +5 segundos');
        }
        
        console.log('💥 Criando explosão de partículas...');
        
        // DESINTEGRAÇÃO: Explosão GRANDE de partículas
        this.particles.createSliceExplosion(
            slicePoint,
            machine.colorData.glow,
            60 // Muitas partículas!
        );
        
        // RAIOS DE CURTO-CIRCUITO ao cortar!
        this.createSliceLightning(slicePoint, sliceDirection);
        
        // Faíscas extras no ponto de corte
        for (let i = 0; i < 8; i++) {
            this.createSpark(slicePoint);
        }
        
        console.log('⚔️ Chamando machine.slice() para criar metades...');
        
        // Criar efeito de corte (2 metades + faíscas) - CRÍTICO!
        machine.slice(slicePoint, sliceDirection);
        
        console.log('✂️ machine.slice() executado!');
        
        // Som de SWOOSH ao cortar
        const pitch = 0.9 + Math.min(this.combo * 0.05, 0.3);
        audioManager.play('slice', pitch);
        
        // Som de checkout a cada 5 cortes (AGORA funciona!)
        if (this.totalSlices % 5 === 0) {
            setTimeout(() => {
                audioManager.play('checkout');
            }, 150);
        }
        
        // Vibração no mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Atualizar pontuação
        this.addScore(screenPos);
        
        // Remover da lista IMEDIATAMENTE
        const index = this.machines.indexOf(machine);
        if (index > -1) {
            this.machines.splice(index, 1);
        }
        
        // Destruir o objeto
        setTimeout(() => {
            if (machine && machine.destroy) {
                machine.destroy();
            }
        }, 50);
    }
    
    // Quando corta a InfinitePay (perde vida ou game over)
    onInfinitePaySliced(machine) {
        console.log('❌ CORTOU INFINITEPAY!');
        
        // RESET contador de bônus
        this.slicesWithoutInfinitePay = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.updateComboDisplay();
        
        const wasLastLife = this.lives <= 1;
        
        // Som de erro
        try {
            audioManager.play(wasLastLife ? 'gameOver' : 'ui');
        } catch(e) {}
        
        // Vibração forte
        try {
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 200]);
            }
        } catch(e) {}
        
        // Remover da lista imediatamente
        const index = this.machines.indexOf(machine);
        if (index > -1) {
            this.machines.splice(index, 1);
        }
        
        // Remover mesh da cena imediatamente
        if (machine && machine.mesh) {
            const pos = machine.mesh.position.clone();
            machine.mesh.visible = false;
            this.scene.remove(machine.mesh);
            machine.mesh = null;
            
            // Partículas simples usando o sistema existente
            try {
                this.particles.createSliceExplosion(pos, '#00ff88', 15);
            } catch(e) {}
        }
        
        if (!wasLastLife) {
            this.lives = Math.max(0, this.lives - 1);
            this.updateLivesDisplay();
            this.showWarning(
                `⚠️ Sem a InfinitePay seu negócio perde vantagens! (${this.lives}/${this.maxLives})`,
                '#ff4444'
            );
            return;
        }
        
        this.lives = 0;
        this.updateLivesDisplay();
        this.showWarning('⚠️ Sem InfinitePay o sistema travou! Recarregue para retomar.', '#ff2222');
        // GAME OVER
        this.timeLeft = 0;
        this.end();
    }
    
    // Mostrar mensagem de bônus
    showBonusMessage(text, color) {
        const bonus = document.createElement('div');
        bonus.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 3px solid ${color};
            border-radius: 15px;
            padding: 25px 50px;
            font-size: 2rem;
            font-weight: 900;
            color: ${color};
            text-shadow: 0 0 20px ${color};
            box-shadow: 0 0 40px ${color};
            z-index: 9999;
            pointer-events: none;
            animation: bonusPop 1s ease-out forwards;
        `;
        bonus.textContent = text;
        
        document.body.appendChild(bonus);
        
        setTimeout(() => bonus.remove(), 1000);
        
        if (!document.getElementById('bonus-animation')) {
            const style = document.createElement('style');
            style.id = 'bonus-animation';
            style.textContent = `
                @keyframes bonusPop {
                    0% { 
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    30% { 
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.2);
                    }
                    70% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% { 
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Flash na tela
    flashScreen(color, intensity = 0.7) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color};
            opacity: ${intensity};
            z-index: 9999;
            pointer-events: none;
            animation: flashFade 0.5s ease-out forwards;
        `;
        
        document.body.appendChild(flash);
        
        setTimeout(() => flash.remove(), 500);
        
        // Adicionar keyframe se não existir
        if (!document.getElementById('flash-animation')) {
            const style = document.createElement('style');
            style.id = 'flash-animation';
            style.textContent = `
                @keyframes flashFade {
                    0% { opacity: 0.7; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    applyLevelSettings(level) {
        if (!level) return;
        this.currentLevel = level;
        CONFIG.GAME.spawnRate = level.spawnRate;
        CONFIG.GAME.spawnRateMin = level.spawnRateMin;
        CONFIG.GAME.spawnRateDecrease = level.spawnRateDecrease;
        CONFIG.GAME.gravity = level.gravity;
        CONFIG.GAME.initialVelocity = level.initialVelocity;
        CONFIG.GAME.lateralVelocity = level.lateralVelocity;
        this.spawnRate = level.spawnRate;
        this.spawnTimer = 0;
        this.bossComboThreshold = level.bossCombo || CONFIG.BOSS.comboThreshold;
        this.currentBossHitCooldown = level.bossHitCooldown || CONFIG.BOSS.hitCooldown || 400;
        if (typeof level.pointsToAdvance === 'number') {
            this.pointsToTriggerBoss = level.pointsToAdvance;
        }
        this.bossAvailable = false;
        this.updateLevelDisplay();
    }
    
    updateLevelDisplay() {
        const levelEl = document.getElementById('level');
        if (!levelEl) return;
        if (this.currentLevel) {
            levelEl.textContent = UTILS.padNumber(this.currentLevel.id, 2);
        } else {
            levelEl.textContent = '01';
        }
    }
    
    showLevelBanner(text) {
        if (!text) return;
        const banner = document.createElement('div');
        banner.className = 'level-banner';
        banner.textContent = text;
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 1600);
    }
    
    triggerBoss() {
        if (this.bossActive || !this.bossAvailable || this.bossIncoming) return;
        if (!this.isPlaying) return; // Não trigger se o jogo não está rodando
        
        // Marcar que o boss está chegando (para parar spawn de máquinas)
        this.bossIncoming = true;
        
        this.clearNonBossMachines();
        this.combo = 0;
        this.comboTimer = 0;
        this.updateComboDisplay();
        
        // Criar atmosfera sombria antes do boss aparecer
        this.createBossAtmosphere();
    }
    
    // Criar atmosfera sombria para a chegada do boss
    createBossAtmosphere() {
        // Limpar qualquer atmosfera anterior
        this.removeBossAtmosphere();
        
        // Escurecer o fundo gradualmente
        const overlay = document.createElement('div');
        overlay.id = 'boss-atmosphere';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, transparent 20%, rgba(0, 0, 0, 0.8) 100%);
            pointer-events: none;
            z-index: 50;
            opacity: 0;
            transition: opacity 1.5s ease-in;
        `;
        document.body.appendChild(overlay);
        
        // Fade in do overlay
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 100);
        
        // Adicionar vinheta vermelha pulsante
        const vignette = document.createElement('div');
        vignette.id = 'boss-vignette';
        vignette.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            box-shadow: inset 0 0 150px rgba(255, 0, 0, 0.4);
            pointer-events: none;
            z-index: 51;
            opacity: 0;
            animation: vignettesPulse 2s ease-in-out infinite;
        `;
        document.body.appendChild(vignette);
        
        setTimeout(() => {
            vignette.style.opacity = '1';
        }, 800);
        
        // Adicionar keyframes se não existir
        if (!document.getElementById('boss-atmosphere-style')) {
            const style = document.createElement('style');
            style.id = 'boss-atmosphere-style';
            style.textContent = `
                @keyframes vignettesPulse {
                    0%, 100% { box-shadow: inset 0 0 150px rgba(255, 0, 0, 0.3); }
                    50% { box-shadow: inset 0 0 200px rgba(255, 0, 0, 0.5); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Som sombrio de alerta (começa imediatamente)
        this.playBossAlertSound();
        
        // Mostrar aviso dramático após um pequeno delay
        this.createGameTimeout(() => {
            if (this.bossIncoming) {
                this.showBossIncomingWarning();
            }
        }, 500);
        
        // Spawnar o boss após tempo suficiente para ler
        this.createGameTimeout(() => {
            if (this.bossIncoming) {
                this.bossIncoming = false;
                this.spawnBoss();
            }
        }, 3500); // 3.5 segundos para dar tempo de ler
    }
    
    // Som de alerta do boss (sombrio e mais longo)
    playBossAlertSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Som grave de alerta inicial
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 2);
            gain1.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5);
            osc1.start(audioCtx.currentTime);
            osc1.stop(audioCtx.currentTime + 2.5);
            
            // Segundo tom mais grave e sombrio
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(70, audioCtx.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 1.5);
                gain2.gain.setValueAtTime(0.35, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2);
                osc2.start(audioCtx.currentTime);
                osc2.stop(audioCtx.currentTime + 2);
            }, 800);
            
            // Terceiro tom - mais intenso antes do boss
            setTimeout(() => {
                const osc3 = audioCtx.createOscillator();
                const gain3 = audioCtx.createGain();
                osc3.connect(gain3);
                gain3.connect(audioCtx.destination);
                osc3.type = 'square';
                osc3.frequency.setValueAtTime(60, audioCtx.currentTime);
                osc3.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 1);
                gain3.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
                osc3.start(audioCtx.currentTime);
                osc3.stop(audioCtx.currentTime + 1.2);
            }, 2000);
            
            // Batida de coração (tensão)
            const playHeartbeat = (delay) => {
                setTimeout(() => {
                    const beat = audioCtx.createOscillator();
                    const beatGain = audioCtx.createGain();
                    beat.connect(beatGain);
                    beatGain.connect(audioCtx.destination);
                    beat.type = 'sine';
                    beat.frequency.setValueAtTime(40, audioCtx.currentTime);
                    beatGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
                    beatGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                    beat.start(audioCtx.currentTime);
                    beat.stop(audioCtx.currentTime + 0.15);
                }, delay);
            };
            
            playHeartbeat(1500);
            playHeartbeat(1700);
            playHeartbeat(2500);
            playHeartbeat(2700);
            
        } catch(e) {
            console.warn('Erro ao criar som do boss:', e);
        }
    }
    
    // Aviso dramático de boss chegando
    showBossIncomingWarning() {
        // Remover aviso anterior se existir
        const existingWarning = document.getElementById('boss-incoming-warning');
        if (existingWarning) existingWarning.remove();
        
        const warning = document.createElement('div');
        warning.id = 'boss-incoming-warning';
        warning.innerHTML = `
            <div class="boss-warning-icon">⚠️</div>
            <div class="boss-warning-text">CONCORRÊNCIA DETECTADA</div>
            <div class="boss-warning-subtext">PREPARE-SE PARA O CONFRONTO</div>
        `;
        warning.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 100;
            opacity: 0;
        `;
        
        // Estilizar os elementos internos
        const iconStyle = `
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: warningIconPulse 0.5s ease-in-out infinite;
        `;
        const textStyle = `
            font-family: 'Orbitron', 'Rajdhani', sans-serif;
            font-size: clamp(1.8rem, 5vw, 3rem);
            font-weight: 900;
            color: #ff4422;
            text-shadow: 
                2px 2px 0 #000,
                -2px -2px 0 #000,
                2px -2px 0 #000,
                -2px 2px 0 #000,
                0 0 8px rgba(255, 50, 0, 0.5);
            letter-spacing: 0.15em;
            margin-bottom: 0.8rem;
        `;
        const subtextStyle = `
            font-family: 'Rajdhani', sans-serif;
            font-size: clamp(1rem, 2.5vw, 1.5rem);
            color: #ffcc00;
            text-shadow: 2px 2px 0 #000, 0 0 5px rgba(255, 150, 0, 0.4);
            letter-spacing: 0.2em;
        `;
        
        warning.querySelector('.boss-warning-icon').style.cssText = iconStyle;
        warning.querySelector('.boss-warning-text').style.cssText = textStyle;
        warning.querySelector('.boss-warning-subtext').style.cssText = subtextStyle;
        
        document.body.appendChild(warning);
        
        // Adicionar keyframes
        if (!document.getElementById('boss-warning-style')) {
            const style = document.createElement('style');
            style.id = 'boss-warning-style';
            style.textContent = `
                @keyframes warningIconPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Animação de entrada
        setTimeout(() => {
            warning.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            warning.style.opacity = '1';
        }, 50);
        
        // Remover após 2.5 segundos (antes do boss spawnar)
        setTimeout(() => {
            if (warning.parentNode) {
                warning.style.transition = 'opacity 0.4s';
                warning.style.opacity = '0';
                setTimeout(() => warning.remove(), 400);
            }
        }, 2800);
    }
    
    // Remover atmosfera do boss
    removeBossAtmosphere() {
        const overlay = document.getElementById('boss-atmosphere');
        const vignette = document.getElementById('boss-vignette');
        const warning = document.getElementById('boss-incoming-warning');
        
        if (overlay) {
            overlay.style.transition = 'opacity 0.5s';
            overlay.style.opacity = '0';
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 500);
        }
        
        if (vignette) {
            vignette.style.transition = 'opacity 0.5s';
            vignette.style.opacity = '0';
            setTimeout(() => { if (vignette.parentNode) vignette.remove(); }, 500);
        }
        
        if (warning) {
            warning.style.transition = 'opacity 0.3s';
            warning.style.opacity = '0';
            setTimeout(() => { if (warning.parentNode) warning.remove(); }, 300);
        }
    }
    
    // Limpar todos os popups e overlays do jogo
    clearAllGamePopups() {
        // Remover atmosfera do boss
        this.removeBossAtmosphere();
        
        // Remover mensagem de derrota do boss se existir
        if (this.bossDefeatMessageEl) {
            this.bossDefeatMessageEl.remove();
            this.bossDefeatMessageEl = null;
        }
        
        // Remover mensagem do próximo nível se existir
        if (this.nextLevelMessageEl) {
            this.nextLevelMessageEl.remove();
            this.nextLevelMessageEl = null;
        }
        
        // Remover countdown se existir
        if (this.countdownElement) {
            this.countdownElement.remove();
            this.countdownElement = null;
        }
        
        // Remover outros elementos dinâmicos por ID
        const elementsToRemove = [
            'boss-incoming-warning',
            'boss-atmosphere',
            'boss-vignette',
            'boss-hit-indicator',
            'boss-explosion',
            'boss-defeat-message',
            'level-countdown',
            'next-level-message',
            'mission-complete-overlay'
        ];
        
        elementsToRemove.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        
        // Remover elementos por classe (pega todos que possam ter escapado)
        document.querySelectorAll('.boss-hit-indicator, .score-popup, .boss-explosion, .boss-defeat-message, .level-countdown, .next-level-message').forEach(el => el.remove());
    }
    
    clearNonBossMachines() {
        for (let i = this.machines.length - 1; i >= 0; i--) {
            const machine = this.machines[i];
            if (machine.isBoss) continue;
            if (machine.destroy) machine.destroy();
            this.machines.splice(i, 1);
        }
    }
    
    spawnBoss() {
        if (!this.isPlaying) return; // Não spawnar se o jogo acabou
        
        const level = this.currentLevel || (CONFIG.LEVELS && CONFIG.LEVELS[0]);
        // Boss sempre tem cor aleatória das máquinas da concorrência
        const color = UTILS.randomChoice(CONFIG.MACHINE_COLORS);
        
        const boss = new CardMachine(this.scene, color, false);
        boss.isBoss = true;
        boss.bossHealth = level ? level.bossHealth || 3 : 3;
        boss.maxBossHealth = boss.bossHealth;
        
        // Recriar o mesh agora que isBoss está setado (para incluir a cara malvada)
        boss.recreateMesh();
        
        boss.spawn(0);
        boss.mesh.scale.multiplyScalar(level ? level.bossScale || 1.4 : 1.4);
        boss.velocity.multiplyScalar(0.4); // Mais lento para dar tempo de atacar
        boss.angularVelocity.multiplyScalar(0.3);
        boss.hitCooldown = this.currentBossHitCooldown || CONFIG.BOSS.hitCooldown || 400;
        
        this.machines.push(boss);
        this.currentBoss = boss;
        this.bossActive = true;
        this.bossAvailable = false;
        
        this.updateBossHud(boss.bossHealth, boss.maxBossHealth);
        
        // Som de entrada do boss
        audioManager.play('combo', 1.5);
    }
    
    handleBossHit(machine, slicePoint, sliceDirection, screenPos) {
        const now = performance.now();
        if (machine.nextHitTime && now < machine.nextHitTime) {
            return;
        }
        const cooldown = machine.hitCooldown || this.currentBossHitCooldown || (CONFIG.BOSS && CONFIG.BOSS.hitCooldown) || 400;
        machine.nextHitTime = now + cooldown;
        
        // Som de hit no boss
        audioManager.play('slice', 1.2);
        
        // Explosão de partículas intensa
        this.particles.createSliceExplosion(
            slicePoint || machine.mesh.position,
            machine.colorData ? machine.colorData.glow : '#00ff88',
            100
        );
        
        // Shake leve na tela
        this.shakeScreen(5, 100);
        
        // Efeito visual no boss (piscar e tremer)
        this.bossTakeDamageEffect(machine);
        
        if (screenPos) {
            // Passar true para indicar que é hit no boss (não conta para triggar próximo boss)
            this.addScore(screenPos, true);
        }
        machine.bossHealth = Math.max(0, (machine.bossHealth || 1) - 1);
        this.updateBossHud(machine.bossHealth, machine.maxBossHealth || machine.bossHealth);
        this.showBossHitIndicator(machine);
        
        if (machine.bossHealth <= 0) {
            this.defeatBoss(machine);
        }
    }
    
    // Efeito visual quando o boss leva dano
    bossTakeDamageEffect(machine) {
        if (!machine.mesh) return;
        
        const originalScale = machine.mesh.scale.clone();
        
        // Piscar vermelho
        machine.mesh.traverse((child) => {
            if (child.material && child.material.emissive) {
                const originalEmissive = child.material.emissive.clone();
                child.material.emissive.setHex(0xff0000);
                child.material.emissiveIntensity = 2;
                
                setTimeout(() => {
                    child.material.emissive.copy(originalEmissive);
                    child.material.emissiveIntensity = 0.5;
                }, 100);
            }
        });
        
        // Tremer/pulsar
        const shake = () => {
            const intensity = 0.05;
            machine.mesh.position.x += (Math.random() - 0.5) * intensity;
            machine.mesh.position.y += (Math.random() - 0.5) * intensity;
            machine.mesh.scale.set(
                originalScale.x * (1 + Math.random() * 0.1),
                originalScale.y * (1 + Math.random() * 0.1),
                originalScale.z * (1 + Math.random() * 0.1)
            );
        };
        
        shake();
        setTimeout(shake, 30);
        setTimeout(shake, 60);
        setTimeout(() => {
            machine.mesh.scale.copy(originalScale);
        }, 100);
    }
    
    // Shake na tela
    shakeScreen(intensity = 10, duration = 200) {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        
        const startTime = performance.now();
        const originalTransform = canvas.style.transform || '';
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed < duration) {
                const remaining = 1 - (elapsed / duration);
                const x = (Math.random() - 0.5) * intensity * remaining;
                const y = (Math.random() - 0.5) * intensity * remaining;
                canvas.style.transform = `translate(${x}px, ${y}px)`;
                requestAnimationFrame(animate);
            } else {
                canvas.style.transform = originalTransform;
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // Animação de morte do boss (inchar, tremer, curto-circuito, explodir) - sem flashes na tela para acessibilidade
    bossDeathAnimation(machine, onComplete) {
        if (!machine.mesh) {
            if (onComplete) onComplete();
            return;
        }
        
        const duration = 3500; // 3.5 segundos - mais tempo para drama
        const startTime = performance.now();
        const originalScale = machine.mesh.scale.clone();
        const originalPosition = machine.mesh.position.clone();
        
        // Sons de curto-circuito crescentes (usando timeouts rastreáveis)
        audioManager.play('slice', 0.3);
        this.createGameTimeout(() => audioManager.play('slice', 0.4), 400);
        this.createGameTimeout(() => audioManager.play('slice', 0.5), 800);
        this.createGameTimeout(() => audioManager.play('slice', 0.6), 1200);
        this.createGameTimeout(() => audioManager.play('slice', 0.7), 1600);
        this.createGameTimeout(() => audioManager.play('slice', 0.8), 2000);
        this.createGameTimeout(() => audioManager.play('slice', 0.9), 2400);
        this.createGameTimeout(() => audioManager.play('slice', 1.0), 2800);
        // Som de explosão final
        this.createGameTimeout(() => {
            audioManager.play('combo', 2);
            audioManager.play('slice', 1.5);
        }, 3000);
        
        // Criar raios ao redor da máquina
        const createLightning = () => {
            if (!machine.mesh || !this.isPlaying) return;
            this.createLightningBolt(machine.mesh.position.clone());
        };
        
        // Raios em intervalos (mais frequentes conforme progride)
        const lightningIntervals = [300, 700, 1100, 1500, 1900, 2200, 2500, 2700, 2900, 3100, 3200, 3300];
        lightningIntervals.forEach(time => {
            this.createGameTimeout(createLightning, time);
        });
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1 && machine.mesh) {
                // Fase 1: Sobrecarga lenta e inchar muito (0-85%)
                if (progress < 0.85) {
                    const swellProgress = progress / 0.85;
                    
                    // Incha até 200% com pulsação crescente
                    const swellFactor = 1 + swellProgress * 1.0; // Incha até 200%!
                    const pulseIntensity = 0.02 + swellProgress * 0.08; // Pulsação aumenta
                    const pulseSpeed = 0.01 + swellProgress * 0.03; // Velocidade aumenta
                    const pulse = Math.sin(elapsed * pulseSpeed) * pulseIntensity;
                    
                    machine.mesh.scale.set(
                        originalScale.x * (swellFactor + pulse),
                        originalScale.y * (swellFactor + pulse),
                        originalScale.z * (swellFactor + pulse)
                    );
                    
                    // Tremer (intensidade crescente exponencialmente)
                    const shakeIntensity = Math.pow(swellProgress, 2) * 0.4;
                    machine.mesh.position.x = originalPosition.x + (Math.random() - 0.5) * shakeIntensity;
                    machine.mesh.position.y = originalPosition.y + (Math.random() - 0.5) * shakeIntensity;
                    machine.mesh.rotation.z = (Math.random() - 0.5) * shakeIntensity * 0.5;
                    machine.mesh.rotation.x = (Math.random() - 0.5) * shakeIntensity * 0.2;
                    
                    // Efeito de curto-circuito na máquina (emissive vermelho/laranja) - mais frequente
                    const flickerChance = 0.15 + swellProgress * 0.5;
                    if (Math.random() < flickerChance) {
                        const flickerColors = [0xff3300, 0xff6600, 0xff0000, 0xffaa00];
                        const flickerColor = flickerColors[Math.floor(Math.random() * flickerColors.length)];
                        
                        machine.mesh.traverse((child) => {
                            if (child.material && child.material.emissive) {
                                child.material.emissive.setHex(flickerColor);
                                child.material.emissiveIntensity = 1 + swellProgress * 3;
                            }
                        });
                    }
                    
                    // Criar faíscas ao redor da máquina (mais frequentes conforme progride)
                    if (Math.random() < 0.2 + swellProgress * 0.5) {
                        this.createSpark(machine.mesh.position);
                    }
                    
                    // Criar mais faíscas no final
                    if (swellProgress > 0.7 && Math.random() < 0.4) {
                        this.createSpark(machine.mesh.position);
                        this.createSpark(machine.mesh.position);
                    }
                }
                // Fase 2: Explosão dramática (85-100%)
                else {
                    const explodeProgress = (progress - 0.85) / 0.15;
                    
                    // No início da explosão, criar muitos fragmentos
                    if (explodeProgress < 0.1 && !machine.exploded) {
                        machine.exploded = true;
                        this.createBossExplosionFragments(machine.mesh.position.clone(), machine.colorData);
                        // Som de explosão forte
                        audioManager.play('combo', 3);
                    }
                    
                    // Esconder o mesh original
                    machine.mesh.visible = explodeProgress < 0.05;
                    
                    // Muitos raios durante a explosão
                    if (Math.random() < 0.4) {
                        this.createLightningBolt(originalPosition.clone());
                    }
                    
                    // Muitas faíscas
                    for (let i = 0; i < 4; i++) {
                        this.createSpark(originalPosition);
                    }
                }
                
                requestAnimationFrame(animate);
            } else {
                // Animação completa - destruir o boss
                if (machine.mesh) {
                    machine.mesh.visible = false;
                }
                if (machine.destroy) {
                    machine.destroy();
                }
                const index = this.machines.indexOf(machine);
                if (index > -1) {
                    this.machines.splice(index, 1);
                }
                
                // Shake forte no final
                this.shakeScreen(15, 400);
                
                if (onComplete) onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // Criar fragmentos de explosão do boss
    createBossExplosionFragments(position, colorData) {
        const fragmentCount = 35; // Mais fragmentos
        const color = colorData ? colorData.hex : 0xff6600;
        
        for (let i = 0; i < fragmentCount; i++) {
            // Geometria aleatória para fragmentos (mais variada)
            const size = 0.08 + Math.random() * 0.3;
            let geometry;
            const geoType = Math.random();
            if (geoType < 0.4) {
                geometry = new THREE.BoxGeometry(size, size * 1.5, size * 0.5);
            } else if (geoType < 0.7) {
                geometry = new THREE.TetrahedronGeometry(size);
            } else {
                geometry = new THREE.BoxGeometry(size * 0.5, size * 2, size * 0.3);
            }
            
            // Cores variadas (cor do boss + vermelho/laranja)
            const fragmentColors = [color, 0xff3300, 0xff6600, 0xffaa00];
            const fragmentColor = fragmentColors[Math.floor(Math.random() * fragmentColors.length)];
            
            const material = new THREE.MeshStandardMaterial({
                color: fragmentColor,
                metalness: 0.8,
                roughness: 0.3,
                emissive: 0xff3300,
                emissiveIntensity: 2 + Math.random() * 2
            });
            
            const fragment = new THREE.Mesh(geometry, material);
            fragment.position.copy(position);
            fragment.position.x += (Math.random() - 0.5) * 0.8;
            fragment.position.y += (Math.random() - 0.5) * 0.8;
            
            // Velocidade de explosão para fora (mais forte)
            const angle = Math.random() * Math.PI * 2;
            const upAngle = Math.random() * Math.PI - Math.PI / 2;
            const speed = 10 + Math.random() * 15;
            
            fragment.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(upAngle) * speed,
                Math.sin(upAngle) * speed + 6,
                Math.sin(angle) * Math.cos(upAngle) * speed * 0.5
            );
            fragment.userData.angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );
            fragment.userData.lifetime = 2 + Math.random() * 1.5;
            fragment.userData.age = 0;
            
            this.scene.add(fragment);
            this.debris.push(fragment);
        }
        
        // Criar onda de choque visual
        this.createShockwave(position);
    }
    
    // Criar onda de choque
    createShockwave(position) {
        const geometry = new THREE.RingGeometry(0.1, 0.3, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        
        const startTime = performance.now();
        const duration = 500;
        
        const animateRing = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const scale = 1 + progress * 15;
                ring.scale.set(scale, scale, 1);
                material.opacity = 1 - progress;
                requestAnimationFrame(animateRing);
            } else {
                this.scene.remove(ring);
                geometry.dispose();
                material.dispose();
            }
        };
        
        requestAnimationFrame(animateRing);
    }
    
    // Explosão que transiciona para a mensagem "CONCORRÊNCIA ELIMINADA"
    explosionToMessage(bossPosition, onComplete) {
        const screenPos = this.worldToScreen(bossPosition);
        
        // Container para a animação
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        document.body.appendChild(container);
        
        // Criar anel de explosão inicial
        const ring = document.createElement('div');
        ring.style.cssText = `
            position: absolute;
            left: ${screenPos.x}px;
            top: ${screenPos.y}px;
            width: 20px;
            height: 20px;
            border: 4px solid #ffff00;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 20px #ffff00, inset 0 0 20px rgba(255, 255, 0, 0.3);
            animation: explosionRing 0.6s ease-out forwards;
        `;
        container.appendChild(ring);
        
        // Adicionar keyframes para o anel
        if (!document.getElementById('explosion-ring-style')) {
            const style = document.createElement('style');
            style.id = 'explosion-ring-style';
            style.textContent = `
                @keyframes explosionRing {
                    0% { 
                        width: 20px; 
                        height: 20px; 
                        opacity: 1;
                        border-width: 4px;
                    }
                    100% { 
                        width: 400px; 
                        height: 400px; 
                        opacity: 0;
                        border-width: 1px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Criar partículas de explosão
        const text = 'CONCORRÊNCIA ELIMINADA!';
        const particleCount = 50;
        const particles = [];
        
        // Cores da explosão (mais variadas)
        const colors = ['#ff3300', '#ff6600', '#ffaa00', '#ffff00', '#ffffff', '#00ff88'];
        
        // Criar partículas em múltiplas ondas
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 6 + Math.random() * 14;
            
            // Posição inicial: centro da explosão com pequena variação
            const startX = screenPos.x + (Math.random() - 0.5) * 30;
            const startY = screenPos.y + (Math.random() - 0.5) * 30;
            
            // Velocidade de explosão (mais rápida e variada)
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.8;
            const speed = 150 + Math.random() * 400;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Algumas partículas são quadradas (fragmentos)
            const isSquare = Math.random() > 0.7;
            const rotation = Math.random() * 360;
            
            particle.style.cssText = `
                position: absolute;
                left: ${startX}px;
                top: ${startY}px;
                width: ${size}px;
                height: ${isSquare ? size * 1.5 : size}px;
                background: ${color};
                border-radius: ${isSquare ? '2px' : '50%'};
                box-shadow: 0 0 ${size * 0.8}px ${color};
                transform: translate(-50%, -50%) rotate(${rotation}deg);
                opacity: 1;
            `;
            
            container.appendChild(particle);
            particles.push({
                el: particle,
                x: startX,
                y: startY,
                vx: vx,
                vy: vy,
                size: size,
                color: color,
                rotation: rotation,
                rotationSpeed: (Math.random() - 0.5) * 720
            });
        }
        
        // Animação de explosão (fase 1: partículas voam para fora com rotação)
        const explosionDuration = 500;
        const startTime = performance.now();
        
        const animateExplosion = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / explosionDuration, 1);
            
            particles.forEach(p => {
                // Movimento com desaceleração
                const ease = 1 - Math.pow(1 - progress, 2);
                const currentX = p.x + p.vx * ease * 0.6;
                const currentY = p.y + p.vy * ease * 0.6;
                
                // Rotação contínua
                const currentRotation = p.rotation + p.rotationSpeed * progress;
                
                p.el.style.left = `${currentX}px`;
                p.el.style.top = `${currentY}px`;
                p.el.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
                p.el.style.opacity = 1 - progress * 0.2;
            });
            
            if (progress < 1) {
                requestAnimationFrame(animateExplosion);
            } else {
                // Remover o anel
                ring.remove();
                // Fase 2: Partículas convergem para formar o texto
                this.convergeToText(container, particles, text, onComplete);
            }
        };
        
        requestAnimationFrame(animateExplosion);
    }
    
    // Partículas convergem para formar o texto
    convergeToText(container, particles, text, onComplete) {
        // Criar o texto final (invisível inicialmente)
        const textEl = document.createElement('div');
        textEl.textContent = text;
        textEl.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-family: 'Orbitron', 'Rajdhani', sans-serif;
            font-size: clamp(1.8rem, 5vw, 3.5rem);
            font-weight: 900;
            color: #ff0040;
            text-shadow: 
                -3px -3px 0 #00ff88,
                3px -3px 0 #88ff00,
                -3px 3px 0 #00ff88,
                3px 3px 0 #ffff00,
                -4px 0 0 #00ff88,
                4px 0 0 #ccff00,
                0 -4px 0 #44ff66,
                0 4px 0 #aaff00,
                0 0 20px rgba(255, 0, 64, 0.9),
                0 0 40px rgba(255, 0, 64, 0.6),
                0 0 60px rgba(255, 0, 64, 0.3);
            white-space: nowrap;
            opacity: 0;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        `;
        container.appendChild(textEl);
        
        // Posição central para convergência
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Salvar posições atuais das partículas
        particles.forEach(p => {
            const rect = p.el.getBoundingClientRect();
            p.currentX = rect.left + rect.width / 2;
            p.currentY = rect.top + rect.height / 2;
            p.targetX = centerX + (Math.random() - 0.5) * 200;
            p.targetY = centerY + (Math.random() - 0.5) * 50;
        });
        
        const convergeDuration = 500;
        const startTime = performance.now();
        
        const animateConverge = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / convergeDuration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            particles.forEach(p => {
                const x = p.currentX + (p.targetX - p.currentX) * ease;
                const y = p.currentY + (p.targetY - p.currentY) * ease;
                
                p.el.style.left = `${x}px`;
                p.el.style.top = `${y}px`;
                p.el.style.opacity = 1 - progress * 0.5;
                
                // Diminuir tamanho conforme converge
                const scale = 1 - progress * 0.7;
                p.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
            });
            
            if (progress < 1) {
                requestAnimationFrame(animateConverge);
            } else {
                // Mostrar o texto com efeito de aparição
                this.showFinalText(container, textEl, particles, onComplete);
            }
        };
        
        requestAnimationFrame(animateConverge);
    }
    
    // Mostrar texto final com efeito
    showFinalText(container, textEl, particles, onComplete) {
        // Remover partículas
        particles.forEach(p => p.el.remove());
        
        // Animar texto aparecendo
        textEl.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        textEl.style.opacity = '1';
        textEl.style.transform = 'translate(-50%, -50%) scale(1.1)';
        
        setTimeout(() => {
            textEl.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
        
        // Manter texto visível por 2 segundos
        setTimeout(() => {
            // Fade out
            textEl.style.transition = 'opacity 0.5s ease-out';
            textEl.style.opacity = '0';
            
            setTimeout(() => {
                container.remove();
                if (onComplete) onComplete();
            }, 500);
        }, 2000);
    }
    
    // Criar raio/relâmpago saindo do boss
    createLightningBolt(position) {
        const boltCount = 2 + Math.floor(Math.random() * 3);
        
        for (let b = 0; b < boltCount; b++) {
            const points = [];
            const segments = 6 + Math.floor(Math.random() * 4);
            
            // Ponto inicial (posição do boss)
            let currentPos = position.clone();
            points.push(currentPos.clone());
            
            // Direção aleatória
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5)
            ).normalize();
            
            // Criar segmentos do raio com ziguezague
            for (let i = 0; i < segments; i++) {
                const segmentLength = 0.3 + Math.random() * 0.5;
                const offset = new THREE.Vector3(
                    direction.x * segmentLength + (Math.random() - 0.5) * 0.4,
                    direction.y * segmentLength + (Math.random() - 0.5) * 0.4,
                    direction.z * segmentLength + (Math.random() - 0.5) * 0.2
                );
                currentPos = currentPos.clone().add(offset);
                points.push(currentPos.clone());
            }
            
            // Criar geometria do raio
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: Math.random() > 0.5 ? 0xffff00 : 0x00ffff,
                transparent: true,
                opacity: 1,
                linewidth: 2
            });
            
            const lightning = new THREE.Line(geometry, material);
            this.scene.add(lightning);
            
            // Animar e remover o raio
            const startTime = performance.now();
            const animateBolt = () => {
                const elapsed = performance.now() - startTime;
                const lifetime = 150 + Math.random() * 100;
                
                if (elapsed < lifetime) {
                    material.opacity = 1 - (elapsed / lifetime);
                    // Piscar
                    lightning.visible = Math.random() > 0.3;
                    requestAnimationFrame(animateBolt);
                } else {
                    this.scene.remove(lightning);
                    geometry.dispose();
                    material.dispose();
                }
            };
            
            requestAnimationFrame(animateBolt);
        }
    }
    
    // Criar raios de curto-circuito no corte de máquinas comuns
    createSliceLightning(position, direction) {
        const boltCount = 3 + Math.floor(Math.random() * 3);
        
        for (let b = 0; b < boltCount; b++) {
            const points = [];
            const segments = 4 + Math.floor(Math.random() * 3);
            
            let currentPos = position.clone();
            points.push(currentPos.clone());
            
            // Direção baseada no corte + aleatoriedade
            const boltDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5)
            ).normalize();
            
            for (let i = 0; i < segments; i++) {
                const segmentLength = 0.15 + Math.random() * 0.25;
                const offset = new THREE.Vector3(
                    boltDir.x * segmentLength + (Math.random() - 0.5) * 0.2,
                    boltDir.y * segmentLength + (Math.random() - 0.5) * 0.2,
                    boltDir.z * segmentLength + (Math.random() - 0.5) * 0.1
                );
                currentPos = currentPos.clone().add(offset);
                points.push(currentPos.clone());
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const colors = [0xffff00, 0x00ffff, 0xffffff, 0xff6600];
            const material = new THREE.LineBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1
            });
            
            const lightning = new THREE.Line(geometry, material);
            this.scene.add(lightning);
            
            // Animar e remover
            const startTime = performance.now();
            const lifetime = 80 + Math.random() * 60;
            
            const animateBolt = () => {
                const elapsed = performance.now() - startTime;
                
                if (elapsed < lifetime) {
                    material.opacity = 1 - (elapsed / lifetime);
                    lightning.visible = Math.random() > 0.2;
                    requestAnimationFrame(animateBolt);
                } else {
                    this.scene.remove(lightning);
                    geometry.dispose();
                    material.dispose();
                }
            };
            
            requestAnimationFrame(animateBolt);
        }
    }
    
    // Criar faísca de curto-circuito
    createSpark(position) {
        if (!this.particles) return;
        
        const sparkColors = ['#ffff00', '#ff6600', '#ffffff', '#00ffff', '#ff0000'];
        const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
        
        for (let i = 0; i < 5; i++) {
            const spark = {
                mesh: new THREE.Mesh(
                    new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 8, 8),
                    new THREE.MeshBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: 1
                    })
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 3
                ),
                age: 0,
                lifetime: 0.2 + Math.random() * 0.3
            };
            
            spark.mesh.position.copy(position);
            spark.mesh.position.x += (Math.random() - 0.5) * 0.8;
            spark.mesh.position.y += (Math.random() - 0.5) * 0.8;
            
            this.scene.add(spark.mesh);
            this.particles.particles.push(spark);
        }
    }
    
    updateBossHud(current, max) {
        const hud = document.getElementById('boss-hud');
        const text = document.getElementById('boss-health');
        if (!hud || !text) return;
        hud.style.display = 'flex';
        text.textContent = `${current}/${max}`;
    }
    
    hideBossHud() {
        const hud = document.getElementById('boss-hud');
        if (hud) {
            hud.style.display = 'none';
        }
    }
    
    defeatBoss(machine) {
        if (!this.isPlaying) return; // Não processar se o jogo acabou
        
        const defeatedLevel = this.currentLevel;
        const bossPosition = machine.mesh ? machine.mesh.position.clone() : new THREE.Vector3();
        
        this.combo = 0;
        this.comboTimer = 0;
        this.updateComboDisplay();
        this.currentBoss = null;
        // MANTER bossActive = true para impedir spawn durante transição
        // Será resetado apenas quando o próximo nível começar
        this.hideBossHud();
        
        // Ativar countdown para bloquear spawns durante toda a transição
        this.levelCountdownActive = true;
        
        // Remover atmosfera sombria
        this.removeBossAtmosphere();
        
        // Animação de inchar e explodir o boss (3.5 segundos)
        this.bossDeathAnimation(machine, () => {
            if (!this.isPlaying) return; // Verificar novamente após animação
            
            this.timeLeft += this.bossRewardTime;
            
            // Explosão que transiciona para a mensagem "CONCORRÊNCIA ELIMINADA"
            this.explosionToMessage(bossPosition, () => {
                if (!this.isPlaying) return; // Verificar novamente
                
                // Verificar se derrotou o boss do nível 4 (Optimus) - MISSÃO COMPLETA!
                const isOptimusDefeated = defeatedLevel && defeatedLevel.id === 4;
                const hasNextLevel = CONFIG.LEVELS && this.currentLevelIndex < CONFIG.LEVELS.length - 1;
                
                if (isOptimusDefeated) {
                    // PARABÉNS! Missão completa - mostrar tela especial com opção de continuar
                    this.showMissionCompleteScreen();
                } else if (hasNextLevel) {
                    const nextLevel = CONFIG.LEVELS[this.currentLevelIndex + 1];
                    const detailedMessageDuration = 3000; // "SEU NEGÓCIO AGRADECE" dura 3s
                    
                    // Mostra mensagem detalhada
                    this.showBossDefeatMessage(defeatedLevel, detailedMessageDuration);
                    
                    // Próximo nível começa DEPOIS que a mensagem some completamente
                    this.createGameTimeout(() => {
                        if (this.isPlaying) {
                            this.startLevelCountdown(nextLevel, () => {
                                if (this.isPlaying) {
                                    this.advanceLevel();
                                }
                            }, 0);
                        }
                    }, detailedMessageDuration + 300); // Espera a mensagem sumir + 300ms
                } else {
                    // Loop Infinito - continuar jogando
                    this.bossActive = false;
                    this.levelCountdownActive = false;
                    this.bossAvailable = false;
                    // Resetar levelScore e definir pontos para próximo boss
                    this.levelScore = 0;
                    this.pointsToTriggerBoss = this.currentLevel.pointsToAdvance || 2000;
                    this.showBossDefeatMessage(defeatedLevel, 3000);
                }
            });
        });
    }
    
    // Tela de missão completa após derrotar Optimus
    showMissionCompleteScreen() {
        // Pausar o jogo completamente para liberar os eventos de touch
        this.levelCountdownActive = true;
        this.isPlaying = false; // Isso libera os eventos de touch para os botões
        
        const overlay = document.createElement('div');
        overlay.id = 'mission-complete-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.5s ease-in;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 90%;">
                <div style="font-size: 1.5rem; color: #ffcc00; margin-bottom: 1rem; letter-spacing: 0.3em; font-family: 'Rajdhani', sans-serif;">🏆 PARABÉNS! 🏆</div>
                <div style="font-size: clamp(2rem, 6vw, 4rem); font-weight: 900; color: #00ff88; text-shadow: 0 0 20px #00ff88, 2px 2px 0 #000; margin-bottom: 1rem; font-family: 'Orbitron', sans-serif; letter-spacing: 0.1em;">MISSÃO COMPLETA!</div>
                <div style="font-size: clamp(1rem, 3vw, 1.5rem); color: #ffffff; margin-bottom: 0.5rem; font-family: 'Rajdhani', sans-serif;">Você fez a melhor escolha!</div>
                <div style="font-size: clamp(0.9rem, 2.5vw, 1.3rem); color: #B0CDDF; margin-bottom: 2rem; font-family: 'Rajdhani', sans-serif;">Agora você tem as melhores taxas do mercado.</div>
                <div style="font-size: clamp(0.8rem, 2vw, 1rem); color: #888; margin-bottom: 2rem; font-family: 'Rajdhani', sans-serif;">Pontuação: ${this.score} | Combo Máximo: x${this.maxCombo}</div>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button id="continue-loop-btn" style="
                        padding: 1rem 2rem;
                        font-size: 1.1rem;
                        font-weight: bold;
                        background: linear-gradient(135deg, #00ff88, #00cc66);
                        color: #000;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: 'Orbitron', sans-serif;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
                        transition: transform 0.2s, box-shadow 0.2s;
                        touch-action: manipulation;
                        -webkit-tap-highlight-color: transparent;
                        user-select: none;
                        pointer-events: auto;
                        position: relative;
                        z-index: 10001;
                    ">🔄 Continuar no Loop Infinito</button>
                    <button id="end-game-btn" style="
                        padding: 1rem 2rem;
                        font-size: 1.1rem;
                        font-weight: bold;
                        background: linear-gradient(135deg, #333, #222);
                        color: #fff;
                        border: 2px solid #00ff88;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: 'Orbitron', sans-serif;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        transition: transform 0.2s, box-shadow 0.2s;
                        touch-action: manipulation;
                        -webkit-tap-highlight-color: transparent;
                        user-select: none;
                        pointer-events: auto;
                        position: relative;
                        z-index: 10001;
                    ">🏁 Encerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Fade in
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 50);
        
        // Botão continuar no Loop Infinito
        const continueBtn = document.getElementById('continue-loop-btn');
        const handleContinue = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Remover listeners para evitar duplo clique
            continueBtn.removeEventListener('click', handleContinue);
            continueBtn.removeEventListener('touchstart', handleContinue);
            endBtn.removeEventListener('click', handleEnd);
            endBtn.removeEventListener('touchstart', handleEnd);
            overlay.remove();
            this.continueToLoopInfinito();
        };
        continueBtn.addEventListener('click', handleContinue);
        continueBtn.addEventListener('touchstart', handleContinue, { passive: false });
        
        // Botão encerrar
        const endBtn = document.getElementById('end-game-btn');
        const handleEnd = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Remover listeners para evitar duplo clique
            continueBtn.removeEventListener('click', handleContinue);
            continueBtn.removeEventListener('touchstart', handleContinue);
            endBtn.removeEventListener('click', handleEnd);
            endBtn.removeEventListener('touchstart', handleEnd);
            overlay.remove();
            this.end(true); // Missão completa = true
        };
        endBtn.addEventListener('click', handleEnd);
        endBtn.addEventListener('touchstart', handleEnd, { passive: false });
    }
    
    // Continuar para o Loop Infinito após missão completa
    continueToLoopInfinito() {
        // Reativar o jogo
        this.isPlaying = true;
        
        // Resetar TODOS os estados do boss
        this.levelCountdownActive = false;
        this.bossActive = false;
        this.bossAvailable = false;
        this.bossIncoming = false;
        this.currentBoss = null;
        
        // Avançar para o nível 5 (Loop Infinito)
        if (CONFIG.LEVELS && this.currentLevelIndex < CONFIG.LEVELS.length - 1) {
            this.currentLevelIndex++;
            const loopLevel = CONFIG.LEVELS[this.currentLevelIndex];
            this.applyLevelSettings(loopLevel);
            // Resetar levelScore e definir pontos para boss
            this.levelScore = 0;
            this.pointsToTriggerBoss = loopLevel.pointsToAdvance || 2500;
            this.showLevelBanner('⚡ LOOP INFINITO ⚡');
            
            // Dar um pouco de tempo extra para o desafio
            this.timeLeft += 5;
            
            console.log(`🔄 Loop Infinito iniciado! Pontos para boss: ${this.pointsToTriggerBoss}`);
        } else {
            // Já está no Loop Infinito, apenas resetar para continuar
            this.levelScore = 0;
            this.pointsToTriggerBoss = this.currentLevel.pointsToAdvance || 2500;
            this.showLevelBanner('⚡ LOOP INFINITO ⚡');
            this.timeLeft += 5;
            
            console.log(`🔄 Continuando Loop Infinito! Pontos para boss: ${this.pointsToTriggerBoss}`);
        }
        
        // Reiniciar o loop de animação
        this.lastTime = performance.now();
    }
    
    advanceLevel() {
        // Resetar TODOS os estados para o novo nível - AGORA libera o spawn
        this.bossIncoming = false;
        this.bossActive = false;
        this.bossAvailable = false;
        this.levelCountdownActive = false; // LIBERAR spawn de máquinas
        this.currentBoss = null;
        
        // RESETAR levelScore para o novo nível!
        this.levelScore = 0;
        
        if (CONFIG.LEVELS && this.currentLevelIndex < CONFIG.LEVELS.length - 1) {
            this.currentLevelIndex++;
            const nextLevel = CONFIG.LEVELS[this.currentLevelIndex];
            this.applyLevelSettings(nextLevel);
            // Pontos necessários para triggar o boss neste nível
            this.pointsToTriggerBoss = nextLevel && nextLevel.pointsToAdvance ? nextLevel.pointsToAdvance : 500;
            this.showLevelBanner(`Nível ${nextLevel.id} • ${nextLevel.name}`);
        } else if (this.currentLevel) {
            this.pointsToTriggerBoss = Infinity;
            this.bossAvailable = true;
            this.showLevelBanner('Nível Máximo • Loop Infinito');
        }
    }
    
    checkBossAvailability() {
        if (this.bossActive) return;
        if (this.bossIncoming) return;
        if (!this.currentLevel) return;
        // Usa levelScore (pontos do nível atual) ao invés de score total
        if (this.levelScore >= (this.pointsToTriggerBoss || 350)) {
            this.bossAvailable = true;
            console.log(`🎯 Boss disponível! levelScore: ${this.levelScore}, necessário: ${this.pointsToTriggerBoss}, combo atual: ${this.combo}, combo necessário: ${this.bossComboThreshold}`);
        }
    }
    
    worldToScreen(position) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const projected = position.clone().project(this.camera);
        return {
            x: (projected.x * 0.5 + 0.5) * width,
            y: (-projected.y * 0.5 + 0.5) * height
        };
    }
    
    showBossHitIndicator(machine) {
        // Posição aleatória na tela (evitando bordas)
        const margin = 100;
        const x = margin + Math.random() * (window.innerWidth - margin * 2);
        const y = margin + Math.random() * (window.innerHeight - margin * 2);
        
        // Tamanho aleatório
        const sizes = ['2rem', '2.5rem', '3rem', '3.5rem', '4rem'];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        
        // Cores variadas (tons de vermelho/laranja/amarelo)
        const colors = ['#ff0000', '#ff3300', '#ff6600', '#ffff00', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Rotação aleatória leve
        const rotation = (Math.random() - 0.5) * 30;
        
        const hit = document.createElement('div');
        hit.textContent = 'HIT!';
        hit.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-family: 'Orbitron', 'Rajdhani', sans-serif;
            font-size: ${size};
            font-weight: 900;
            color: ${color};
            text-shadow: 0 0 10px ${color}, 0 0 20px ${color}, 2px 2px 0 #000;
            transform: translate(-50%, -50%) rotate(${rotation}deg) scale(0);
            z-index: 9999;
            pointer-events: none;
            letter-spacing: 0.1em;
            opacity: 1;
        `;
        
        document.body.appendChild(hit);
        
        // Animação manual para controlar a rotação específica
        const startTime = performance.now();
        const duration = 500;
        
        const animateHit = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                let scale;
                if (progress < 0.5) {
                    // Crescer até 1.3
                    scale = (progress / 0.5) * 1.3;
                } else {
                    // Diminuir para 1 e fade out
                    scale = 1.3 - ((progress - 0.5) / 0.5) * 0.3;
                }
                
                const opacity = progress > 0.5 ? 1 - ((progress - 0.5) / 0.5) : 1;
                
                hit.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
                hit.style.opacity = opacity;
                
                requestAnimationFrame(animateHit);
            } else {
                hit.remove();
            }
        };
        
        requestAnimationFrame(animateHit);
    }
    
    spawnBossExplosion(worldPosition) {
        const screenPos = this.worldToScreen(worldPosition);
        const boom = document.createElement('div');
        boom.className = 'boss-explosion';
        boom.style.left = `${screenPos.x}px`;
        boom.style.top = `${screenPos.y}px`;
        document.body.appendChild(boom);
        setTimeout(() => boom.remove(), 900);
    }
    
    showBossDefeatMessage(level, duration = 4000) {
        if (!this.isPlaying) return; // Não mostrar se o jogo acabou
        
        // Remover mensagem anterior se existir
        if (this.bossDefeatMessageEl && this.bossDefeatMessageEl.parentNode) {
            this.bossDefeatMessageEl.remove();
            this.bossDefeatMessageEl = null;
        }
        const existingMessage = document.getElementById('boss-defeat-message');
        if (existingMessage) existingMessage.remove();
        
        const message = document.createElement('div');
        message.className = 'boss-defeat-message';
        message.id = 'boss-defeat-message';
        
        // Título principal - mensagem temática
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = 'SEU NEGÓCIO AGRADECE!';
        message.appendChild(title);
        
        if (level && level.defeatMessage) {
            const subtitle = document.createElement('div');
            subtitle.className = 'subtitle';
            subtitle.textContent = level.defeatMessage;
            message.appendChild(subtitle);
        }
        if (level && level.progressMessage) {
            const progress = document.createElement('div');
            progress.className = 'progress';
            progress.textContent = level.progressMessage;
            message.appendChild(progress);
        }
        
        // Mensagem de tempo bonus
        const bonus = document.createElement('div');
        bonus.className = 'bonus';
        bonus.textContent = `+${this.bossRewardTime}s de tempo!`;
        message.appendChild(bonus);
        
        document.body.appendChild(message);
        
        // Guardar referência para poder remover depois
        this.bossDefeatMessageEl = message;
        
        // Fade out suave antes de remover (usando timeout independente)
        const fadeOutTime = 400;
        const removeMessage = () => {
            if (message.parentNode) {
                message.classList.add('fade-out');
                setTimeout(() => {
                    if (message.parentNode) message.remove();
                    if (this.bossDefeatMessageEl === message) {
                        this.bossDefeatMessageEl = null;
                    }
                }, fadeOutTime);
            }
        };
        
        // Usar createGameTimeout para que seja cancelado se o jogo terminar
        this.createGameTimeout(removeMessage, duration - fadeOutTime);
    }
    
    startLevelCountdown(nextLevel, onComplete, delay = 0) {
        const countdownDuration = (nextLevel && nextLevel.countdownDuration) || (CONFIG.BOSS && CONFIG.BOSS.countdownDuration) || 3;
        if (countdownDuration <= 0) {
            if (typeof onComplete === 'function') onComplete();
            return;
        }
        
        this.clearLevelCountdown();
        this.levelCountdownActive = true;
        this.spawnTimer = 0;
        
        const beginIntro = () => {
            if (!this.isPlaying) return; // Verificar se o jogo ainda está rodando
            this.showNextLevelIntro(nextLevel, () => {
                if (this.isPlaying) {
                    this.beginLevelCountdownNumbers(countdownDuration, nextLevel, onComplete);
                }
            });
        };
        
        if (delay > 0) {
            const delayId = setTimeout(() => {
                if (this.isPlaying) beginIntro();
            }, delay);
            this.levelCountdownTimeouts.push(delayId);
        } else {
            beginIntro();
        }
    }
    
    showNextLevelIntro(nextLevel, afterIntro) {
        // Remover intro anterior se existir
        if (this.nextLevelMessageEl && this.nextLevelMessageEl.parentNode) {
            this.nextLevelMessageEl.remove();
            this.nextLevelMessageEl = null;
        }
        document.querySelectorAll('.next-level-message').forEach(el => el.remove());
        
        const intro = document.createElement('div');
        intro.className = 'next-level-message';
        intro.id = 'next-level-message';
        
        const title = document.createElement('div');
        title.className = 'next-level-title';
        title.textContent = 'PRÓXIMO NÍVEL';
        intro.appendChild(title);
        
        const name = document.createElement('div');
        name.className = 'next-level-name';
        name.textContent = nextLevel ? `Nível ${UTILS.padNumber(nextLevel.id, 2)} • ${nextLevel.name}` : 'Loop Infinito';
        intro.appendChild(name);
        
        document.body.appendChild(intro);
        this.nextLevelMessageEl = intro;
        
        const introTimeout = setTimeout(() => {
            if (this.nextLevelMessageEl) {
                this.nextLevelMessageEl.remove();
                this.nextLevelMessageEl = null;
            }
            if (this.isPlaying && typeof afterIntro === 'function') {
                afterIntro();
            }
        }, 2500);
        this.levelCountdownTimeouts.push(introTimeout);
    }
    
    beginLevelCountdownNumbers(duration, nextLevel, onComplete) {
        const container = document.createElement('div');
        container.className = 'level-countdown';
        
        const title = document.createElement('div');
        title.className = 'countdown-title';
        title.textContent = 'PREPARAR';
        container.appendChild(title);
        
        const subtitle = document.createElement('div');
        subtitle.className = 'countdown-subtitle';
        subtitle.textContent = nextLevel ? `Iniciando ${nextLevel.name}` : 'Loop Infinito';
        container.appendChild(subtitle);
        
        const number = document.createElement('div');
        number.className = 'countdown-number';
        number.textContent = duration;
        container.appendChild(number);
        
        document.body.appendChild(container);
        this.countdownElement = container;
        
        const updateNumber = (value) => {
            if (!this.countdownElement) return;
            const numberEl = this.countdownElement.querySelector('.countdown-number');
            if (numberEl) numberEl.textContent = value;
        };
        
        updateNumber(duration);
        
        this.levelCountdownInterval = setInterval(() => {
            if (!this.isPlaying) {
                this.clearLevelCountdown();
                return;
            }
            duration -= 1;
            if (duration <= 0) {
                this.clearLevelCountdown();
                if (this.isPlaying && typeof onComplete === 'function') onComplete();
            } else {
                updateNumber(duration);
            }
        }, 1000);
    }
    
    clearLevelCountdown() {
        if (this.levelCountdownInterval) {
            clearInterval(this.levelCountdownInterval);
            this.levelCountdownInterval = null;
        }
        if (this.levelCountdownTimeouts && this.levelCountdownTimeouts.length) {
            this.levelCountdownTimeouts.forEach(id => clearTimeout(id));
            this.levelCountdownTimeouts = [];
        }
        if (this.countdownElement) {
            this.countdownElement.remove();
            this.countdownElement = null;
        }
        if (this.nextLevelMessageEl) {
            this.nextLevelMessageEl.remove();
            this.nextLevelMessageEl = null;
        }
        this.levelCountdownActive = false;
    }

    // Adicionar pontuação
    addScore(screenPos, isBossHit = false) {
        // totalSlices já incrementado em onMachineSliced
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.comboTimer = CONFIG.SCORING.comboTimeout;
        
        // Calcular pontos
        let points = CONFIG.SCORING.pointsPerSlice;
        if (this.combo > 1) {
            points *= (1 + (this.combo - 1) * CONFIG.SCORING.comboMultiplier);
            audioManager.play('combo', this.combo);
        }
        
        this.score += Math.floor(points);
        
        // Só incrementa levelScore se NÃO for hit no boss
        // Isso evita que a batalha do boss conte para triggar o próximo boss
        if (!isBossHit) {
            this.levelScore += Math.floor(points);
        }
        
        // Atualizar UI
        this.updateScoreDisplay();
        this.updateComboDisplay();
        this.checkBossAvailability();
        
        if (this.bossAvailable && !this.bossActive && this.combo >= this.bossComboThreshold) {
            this.triggerBoss();
        }
        
        // Criar popup de pontuação
        this.createScorePopup(screenPos, Math.floor(points));
    }

    // Criar popup visual de pontuação
    createScorePopup(screenPos, points) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = `+${points}`;
        popup.style.cssText = `
            position: fixed;
            left: ${screenPos.x}px;
            top: ${screenPos.y}px;
            color: ${CONFIG.SABER.glowColor};
            font-size: ${1.5 + this.combo * 0.2}rem;
            font-weight: 900;
            pointer-events: none;
            z-index: 100;
            text-shadow: 0 0 10px currentColor;
            animation: scorePopup 1s ease-out forwards;
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 1000);
    }

    // Atualizar displays
    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
    }

    updateComboDisplay() {
        const comboDisplay = document.getElementById('combo-display');
        const comboValue = document.getElementById('combo');
        const comboBar = document.getElementById('combo-bar');
        
        if (this.combo > 1) {
            comboDisplay.classList.add('active');
            comboValue.textContent = `x${this.combo}`;
            
            const progress = (this.comboTimer / CONFIG.SCORING.comboTimeout) * 100;
            comboBar.style.width = `${progress}%`;
        } else {
            comboDisplay.classList.remove('active');
        }
    }

    updateTimerDisplay() {
        const seconds = Math.ceil(this.timeLeft);
        document.getElementById('timer').textContent = seconds;
    }

    // Spawnar nova maquininha
    spawnMachine() {
        // Verificar TODOS os estados que impedem spawn
        if (!this.isPlaying) return;
        if (this.bossActive) return;
        if (this.bossIncoming) return;
        if (this.levelCountdownActive) return;
        
        // Chance de spawnar InfinitePay baseada no nível atual
        const infinitePayChance = this.currentLevel && this.currentLevel.infinitePayChance 
            ? this.currentLevel.infinitePayChance 
            : 0.15;
        const isInfinitePay = Math.random() < infinitePayChance;
        
        let machine;
        let x;
        
        if (isInfinitePay) {
            // Logo InfinitePay CIRCULAR (NÃO PODE CORTAR!)
            const infinitePayColor = { 
                name: 'infinitepay', 
                hex: 0x88ff00, // Verde-amarelo
                glow: '#88ff00' 
            };
            machine = new CardMachine(this.scene, infinitePayColor, true);
            
            // DIFICULDADE: às vezes spawna PRÓXIMO de outra máquina!
            if (this.machines.length > 0 && Math.random() < 0.4) {
                const randomMachine = this.machines[Math.floor(Math.random() * this.machines.length)];
                x = randomMachine.mesh.position.x + UTILS.random(-1.5, 1.5);
                x = UTILS.clamp(x, -6, 6); // Mantém dentro dos limites
                console.log('⚠️ InfinitePay próxima de outra máquina!');
            } else {
                x = UTILS.random(-6, 6);
            }
            
            // Aviso visual: NÃO CORTE!
            this.showWarning('⚠️ NÃO CORTE A INFINITEPAY DO SEU NEGÓCIO!', '#88ff00');
        } else {
            // Máquina genérica normal (pode cortar)
            const color = UTILS.randomChoice(CONFIG.MACHINE_COLORS);
            machine = new CardMachine(this.scene, color, false);
            x = UTILS.random(-6, 6);
        }
        
        machine.spawn(x);
        
        this.machines.push(machine);
        
        audioManager.play('spawn');
    }
    
    // Mostrar aviso NO HUD (entre score e tempo)
    showWarning(text, color = '#ffff00') {
        const warningHud = document.getElementById('warning-hud');
        if (warningHud) {
            warningHud.style.display = 'flex';
            warningHud.classList.add('active');
            const textEl = warningHud.querySelector('.warning-text');
            if (textEl) {
                textEl.textContent = text;
                textEl.style.color = color;
            }
            
            // Esconder após 2.5 segundos
            setTimeout(() => {
                warningHud.classList.remove('active');
                setTimeout(() => {
                    warningHud.style.display = 'none';
                }, 300);
            }, 2500);
        }
    }
    
    updateLivesDisplay() {
        const livesEl = document.getElementById('lives');
        if (!livesEl) return;
        livesEl.innerHTML = '';
        for (let i = 0; i < this.maxLives; i++) {
            const icon = document.createElement('span');
            icon.className = 'life-icon';
            if (i >= this.lives) {
                icon.classList.add('lost');
            }
            livesEl.appendChild(icon);
        }
    }

    // Iniciar jogo
    start() {
        this.reset();
        this.currentLevelIndex = 0;
        this.currentLevel = CONFIG.LEVELS ? CONFIG.LEVELS[0] : null;
        this.bossActive = false;
        this.bossAvailable = false;
        this.currentBoss = null;
        this.clearLevelCountdown();
        this.applyLevelSettings(this.currentLevel);
        this.levelScore = 0;
        this.pointsToTriggerBoss = this.currentLevel && this.currentLevel.pointsToAdvance ? this.currentLevel.pointsToAdvance : 350;
        this.checkBossAvailability();
        this.updateLivesDisplay();
        if (this.currentLevel) {
            this.showLevelBanner(`Nível ${this.currentLevel.id} • ${this.currentLevel.name}`);
        }
        this.isPlaying = true;
        this.lastTime = performance.now();
    }

    // Resetar jogo
    reset() {
        // Cancelar todos os timeouts pendentes
        this.clearAllGameTimeouts();
        
        // Limpar todos os popups e overlays primeiro
        this.clearAllGamePopups();
        
        // Limpar máquinas (incluindo InfinitePay travada)
        this.clearLevelCountdown();
        this.machines.forEach(m => {
            if (m && m.mesh) {
                this.scene.remove(m.mesh);
                m.destroy();
            }
        });
        this.machines = [];
        this.hideBossHud();
        this.bossActive = false;
        this.bossIncoming = false;
        this.currentBoss = null;
        this.bossAvailable = false;
        this.currentLevelIndex = 0;
        this.currentLevel = CONFIG.LEVELS ? CONFIG.LEVELS[0] : null;
        this.lives = this.maxLives;
        this.updateLivesDisplay();
        
        // Limpar TODOS os objetos da cena (incluindo InfinitePay travada)
        const objectsToRemove = [];
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.machine) {
                objectsToRemove.push(obj);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));
        
        // Limpar debris
        this.debris.forEach(d => {
            this.scene.remove(d);
            if (d.geometry) d.geometry.dispose();
            if (d.material) {
                if (Array.isArray(d.material)) {
                    d.material.forEach(m => m.dispose());
                } else {
                    d.material.dispose();
                }
            }
        });
        this.debris = [];
        
        // Limpar partículas
        this.particles.clear();
        this.saber.clear();
        
        // Resetar valores
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.totalSlices = 0;
        this.comboTimer = 0;
        this.timeLeft = CONFIG.GAME.duration;
        this.spawnTimer = 0;
        this.spawnRate = CONFIG.GAME.spawnRate;
        this.levelScore = 0;
        this.pointsToTriggerBoss = this.currentLevel && this.currentLevel.pointsToAdvance ? this.currentLevel.pointsToAdvance : CONFIG.LEVELS && CONFIG.LEVELS[0] ? CONFIG.LEVELS[0].pointsToAdvance : 350;
        
        // Resetar bônus
        this.slicesWithoutInfinitePay = 0;
        this.bonusesEarned = 0;
        
        // Atualizar UI
        this.updateScoreDisplay();
        this.updateComboDisplay();
        this.updateTimerDisplay();
    }

    // Pausar jogo
    pause() {
        this.isPaused = true;
    }

    // Continuar jogo
    resume() {
        this.isPaused = false;
        this.lastTime = performance.now();
    }

    // Criar timeout rastreável (será cancelado quando o jogo terminar)
    createGameTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            // Remover da lista quando executar
            const index = this.gameTimeouts.indexOf(timeoutId);
            if (index > -1) this.gameTimeouts.splice(index, 1);
            
            // Só executar se o jogo ainda estiver rodando
            if (this.isPlaying) {
                callback();
            }
        }, delay);
        
        this.gameTimeouts.push(timeoutId);
        return timeoutId;
    }
    
    // Cancelar todos os timeouts do jogo
    clearAllGameTimeouts() {
        if (this.gameTimeouts) {
            this.gameTimeouts.forEach(id => clearTimeout(id));
            this.gameTimeouts = [];
        }
        if (this.levelCountdownTimeouts) {
            this.levelCountdownTimeouts.forEach(id => clearTimeout(id));
            this.levelCountdownTimeouts = [];
        }
    }
    
    // Finalizar jogo
    end(missionComplete = false) {
        // PRIMEIRO: Parar o jogo imediatamente
        this.isPlaying = false;
        this.bossIncoming = false;
        this.bossActive = false;
        this.levelCountdownActive = false;
        
        // Cancelar TODOS os timeouts pendentes
        this.clearAllGameTimeouts();
        
        // Limpar estados do boss
        this.hideBossHud();
        this.currentBoss = null;
        this.clearLevelCountdown();
        
        // Limpar todos os popups e overlays
        this.clearAllGamePopups();
        
        // Limpar todas as máquinas da tela
        this.machines.forEach(m => {
            if (m && m.mesh) {
                this.scene.remove(m.mesh);
            }
            if (m && m.destroy) {
                m.destroy();
            }
        });
        this.machines = [];
        
        audioManager.play('gameOver');
        
        // Mostrar tela de game over com stats
        const finalScore = this.score;
        const isNewRecord = UTILS.saveHighscore(finalScore);
        
        // Missão completa APENAS se passou pelo parâmetro (derrotou boss do Optimus)
        // NÃO é missão completa se simplesmente perdeu no último nível
        const isMissionComplete = missionComplete === true;
        
        // Disparar evento de game over
        window.dispatchEvent(new CustomEvent('gameover', {
            detail: {
                score: finalScore,
                maxCombo: this.maxCombo,
                totalSlices: this.totalSlices,
                isNewRecord: isNewRecord,
                missionComplete: isMissionComplete,
                currentLevel: this.currentLevelIndex + 1
            }
        }));
    }

    // Loop de atualização
    update(deltaTime) {
        if (!this.isPlaying || this.isPaused) return;
        
        // Atualizar timer (pausado durante transição de nível)
        if (!this.levelCountdownActive) {
            this.timeLeft -= deltaTime;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.end();
                return;
            }
        }
        this.updateTimerDisplay();
        
        // Atualizar combo timer
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.comboTimer = 0;
            }
            this.updateComboDisplay();
        }
        
        // Spawnar máquinas (apenas se não estiver em batalha de boss ou countdown)
        if (!this.levelCountdownActive && !this.bossActive && !this.bossIncoming) {
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= this.spawnRate) {
                this.spawnMachine();
                this.spawnTimer = 0;
                
                // Aumentar dificuldade
                this.spawnRate = Math.max(
                    CONFIG.GAME.spawnRateMin,
                    this.spawnRate - CONFIG.GAME.spawnRateDecrease
                );
            }
        }
        
        // Atualizar máquinas
        for (let i = this.machines.length - 1; i >= 0; i--) {
            const machine = this.machines[i];
            machine.update(deltaTime);
            
            // Remover se saiu da tela
            if (machine.isOffScreen()) {
                machine.destroy();
                this.machines.splice(i, 1);
                
                // Perder combo
                if (this.combo > 0) {
                    this.combo = 0;
                    this.comboTimer = 0;
                    this.updateComboDisplay();
                }
            }
        }
        
        // Atualizar debris (com efeito de curto-circuito)
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const debris = this.debris[i];
            
            debris.userData.age += deltaTime;
            
            if (debris.userData.age >= debris.userData.lifetime) {
                this.scene.remove(debris);
                if (debris.geometry) debris.geometry.dispose();
                if (debris.material) {
                    if (Array.isArray(debris.material)) {
                        debris.material.forEach(m => m.dispose());
                    } else {
                        debris.material.dispose();
                    }
                }
                this.debris.splice(i, 1);
                continue;
            }
            
            // Física
            debris.userData.velocity.y += CONFIG.PHYSICS.gravity * deltaTime;
            debris.position.add(
                debris.userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // Rotação
            debris.rotation.x += debris.userData.angularVelocity.x * deltaTime;
            debris.rotation.y += debris.userData.angularVelocity.y * deltaTime;
            debris.rotation.z += debris.userData.angularVelocity.z * deltaTime;
            
            // EFEITO DE CURTO-CIRCUITO INTENSO!
            if (debris.userData.shortCircuit) {
                const progress = debris.userData.age / debris.userData.lifetime;
                
                // TREMOR ELÉTRICO FORTE E RÁPIDO
                const tremor = Math.sin(Date.now() * 0.3) * 0.15 * (1 - progress);
                debris.position.x += tremor;
                debris.position.y += Math.cos(Date.now() * 0.4) * 0.15 * (1 - progress);
                
                // Fade out RÁPIDO
                const alpha = Math.pow(1 - progress, 2);
                
                debris.traverse(child => {
                    if (child.material) {
                        child.material.opacity = alpha;
                        child.material.transparent = true;
                        child.material.depthWrite = false;
                        
                        // FLASH ELÉTRICO CYAN INTENSO (InfinitePay)
                        if (child.material.emissive) {
                            const flash = Math.random() > 0.5 ? 1 : 0; // Flash ON/OFF rápido
                            child.material.emissive.setHex(0x4DD0E1); // Cyan InfinitePay
                            child.material.emissiveIntensity = flash * 3 * (1 - progress);
                        }
                    }
                });
            } else {
                // Fade normal
                const alpha = 1 - (debris.userData.age / debris.userData.lifetime);
                debris.traverse(child => {
                    if (child.material) {
                        child.material.opacity = alpha;
                        child.material.transparent = true;
                    }
                });
            }
        }
        
        // Atualizar sistemas
        this.particles.update(deltaTime);
        this.saber.update();
        this.sliceDetector.updateMachines(this.machines);
    }

    // Resize
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.saber.resize();
    }

    // Loop de animação
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        this.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    // Destruir jogo
    destroy() {
        this.machines.forEach(m => m.destroy());
        this.particles.destroy();
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

