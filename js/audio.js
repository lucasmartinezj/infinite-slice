// =====================================================
// INFINITE SLICE - SISTEMA DE ÁUDIO
// =====================================================

class AudioManager {
    constructor() {
        this.context = null;
        this.sounds = {};
        this.audioFiles = {};
        this.enabled = true;
        this.masterVolume = 0.3;
    }

    // Inicializar AudioContext
    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
            this.loadAudioFiles();
        } catch (e) {
            console.warn('Web Audio API não suportada:', e);
            this.enabled = false;
        }
    }

    // Carregar arquivos de áudio oficiais
    loadAudioFiles() {
        // Som de checkout InfinitePay oficial
        this.audioFiles.checkout = new Audio('assets/sounds/som_checkout.mp3');
        this.audioFiles.checkout.volume = this.masterVolume;
        this.audioFiles.checkout.preload = 'auto';
        
        // Som de espada (referência do usuário)
        this.audioFiles.sword = new Audio('assets/sounds/sword-slash.mp3');
        this.audioFiles.sword.volume = this.masterVolume * 0.7;
        this.audioFiles.sword.preload = 'auto';
        
        console.log('💳 Sons oficiais carregados!');
    }

    // Criar sons procedurais (futuristas)
    createSounds() {
        // Sons serão gerados proceduralmente usando Web Audio API
        this.sounds = {
            slice: this.playSwordSound.bind(this),
            combo: this.createComboSound.bind(this),
            spawn: this.createSpawnSound.bind(this),
            gameOver: this.createGameOverSound.bind(this),
            ui: this.createUISound.bind(this),
            checkout: this.playCheckoutSound.bind(this)
        };
    }
    
    // Tocar som de espada (arquivo .mp3)
    playSwordSound(pitch = 1.0) {
        if (!this.enabled || !this.audioFiles.sword) {
            // Fallback para som procedural
            this.createSliceSound(pitch);
            return;
        }
        
        try {
            const sound = this.audioFiles.sword.cloneNode();
            sound.volume = this.masterVolume * 0.7;
            sound.playbackRate = pitch;
            sound.play().catch(e => console.warn('Erro sword:', e));
        } catch (e) {
            console.warn('Erro ao tocar espada:', e);
            this.createSliceSound(pitch);
        }
    }
    
    // Tocar som de checkout (oficial InfinitePay)
    playCheckoutSound() {
        if (!this.enabled || !this.audioFiles.checkout) return;
        
        try {
            const sound = this.audioFiles.checkout.cloneNode();
            sound.volume = this.masterVolume * 0.8;
            sound.play().catch(e => console.warn('Erro checkout:', e));
            console.log('💳 CHECKOUT!');
        } catch (e) {
            console.warn('Erro ao tocar checkout:', e);
        }
    }

    // Som de corte SWOOSH (espada cortando o ar)
    createSliceSound(pitch = 1.0) {
        if (!this.enabled || !this.context) return;

        try {
            const now = this.context.currentTime;
            
            // SWOOSH principal - som de ar sendo cortado
            const osc1 = this.context.createOscillator();
            const gain1 = this.context.createGain();
            const filter1 = this.context.createBiquadFilter();
            
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(1200 * pitch, now);
            osc1.frequency.exponentialRampToValueAtTime(100 * pitch, now + 0.15);
            
            filter1.type = 'highpass';
            filter1.frequency.setValueAtTime(800, now);
            filter1.frequency.exponentialRampToValueAtTime(200, now + 0.15);
            filter1.Q.setValueAtTime(1, now);
            
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(this.masterVolume * 0.7, now + 0.01);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            
            osc1.connect(filter1);
            filter1.connect(gain1);
            gain1.connect(this.context.destination);
            
            osc1.start(now);
            osc1.stop(now + 0.15);
            
            // Impacto (som de corte)
            const osc2 = this.context.createOscillator();
            const gain2 = this.context.createGain();
            const filter2 = this.context.createBiquadFilter();
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(600, now + 0.05);
            osc2.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            
            filter2.type = 'lowpass';
            filter2.frequency.setValueAtTime(2000, now + 0.05);
            
            gain2.gain.setValueAtTime(this.masterVolume * 0.5, now + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            osc2.connect(filter2);
            filter2.connect(gain2);
            gain2.connect(this.context.destination);
            
            osc2.start(now + 0.05);
            osc2.stop(now + 0.1);
            
            // Ruído branco (ar sendo cortado)
            const bufferSize = this.context.sampleRate * 0.1;
            const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.3;
            }
            
            const noise = this.context.createBufferSource();
            noise.buffer = buffer;
            
            const noiseGain = this.context.createGain();
            const noiseFilter = this.context.createBiquadFilter();
            
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(2000, now);
            noiseFilter.Q.setValueAtTime(5, now);
            
            noiseGain.gain.setValueAtTime(this.masterVolume * 0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.context.destination);
            
            noise.start(now);
            noise.stop(now + 0.1);
            
            console.log('⚔️ SWOOSH! Som de espada tocado');
        } catch (e) {
            console.error('Erro ao tocar som:', e);
        }
    }

    // Som de combo (energético, ascendente)
    createComboSound(comboLevel = 1) {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        // Pitch aumenta com combo
        const basePitch = 400 + (comboLevel * 50);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(basePitch, now);
        oscillator.frequency.exponentialRampToValueAtTime(basePitch * 2, now + 0.2);

        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        // Conectar
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        // Tocar
        oscillator.start(now);
        oscillator.stop(now + 0.2);
    }

    // Som de spawn (pop futurista)
    createSpawnSound() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }

    // Som de game over (descendente dramático)
    createGameOverSound() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;
        
        // Primeiro tom
        const osc1 = this.context.createOscillator();
        const gain1 = this.context.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.exponentialRampToValueAtTime(220, now + 0.5);
        
        gain1.gain.setValueAtTime(this.masterVolume * 0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc1.connect(gain1);
        gain1.connect(this.context.destination);
        
        osc1.start(now);
        osc1.stop(now + 0.5);

        // Segundo tom (harmônico)
        const osc2 = this.context.createOscillator();
        const gain2 = this.context.createGain();
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(330, now + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(165, now + 0.6);
        
        gain2.gain.setValueAtTime(this.masterVolume * 0.2, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        osc2.connect(gain2);
        gain2.connect(this.context.destination);
        
        osc2.start(now + 0.1);
        osc2.stop(now + 0.6);
    }

    // Som de UI (clique suave)
    createUISound() {
        if (!this.enabled || !this.context) return;

        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, now);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.03);
    }

    // Tocar som
    play(soundName, ...args) {
        if (!this.sounds[soundName]) {
            console.warn(`Som "${soundName}" não existe`);
            return;
        }
        
        // Resume AudioContext se necessário (política de navegadores)
        if (this.context && this.context.state === 'suspended') {
            this.context.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }
        
        if (this.enabled && this.context) {
            this.sounds[soundName](...args);
        }
    }

    // Toggle som
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Ajustar volume master
    setVolume(volume) {
        this.masterVolume = UTILS.clamp(volume, 0, 1);
    }
}

// Instância global
const audioManager = new AudioManager();

