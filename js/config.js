// =====================================================
// INFINITE SLICE - CONFIGURAÇÕES DO JOGO
// =====================================================

const CONFIG = {
    // Cores das maquininhas - CORES INFINITEPAY OFICIAIS
    MACHINE_COLORS: [
        { name: 'yellow', hex: 0xFFEE00, glow: '#FFEE00' },      // Amarelo InfinitePay
        { name: 'blue', hex: 0xB0CDDF, glow: '#B0CDDF' },        // Azul Serenity InfinitePay
        { name: 'green', hex: 0x00EE26, glow: '#00EE26' },       // Verde InfinitePay
        { name: 'cyan', hex: 0x4DD0E1, glow: '#4DD0E1' },        // Cyan InfinitePay
        { name: 'orange', hex: 0xFF8833, glow: '#FF8833' }       // Laranja
    ],

    // Sabre InfinitePay - COR OFICIAL
    SABER: {
        color: 0xB0CDDF,        // Azul Serenity
        glowColor: '#B0CDDF',
        trailLength: 20,
        width: 0.15,
        length: 3
    },

    // Game Settings (serão sobrescritos pelos níveis)
    GAME: {
        duration: 20, // segundos - mais tensão ainda
        spawnRate: 0.9,
        spawnRateMin: 0.65,
        spawnRateDecrease: 0.012,
        gravity: -6.5,
        initialVelocity: { min: 14, max: 18 },
        lateralVelocity: { min: -1.8, max: 1.8 },
        maxHeight: 7 // LIMITE: não passa do HUD!
    },

    // Pontuação
    SCORING: {
        pointsPerSlice: 10,
        comboMultiplier: 1.5,
        comboTimeout: 1.5, // segundos para manter combo
        perfectSliceBonus: 5 // corte perfeito (centro da maquininha)
    },

    // Física
    PHYSICS: {
        gravity: -6.5, // Mesma gravidade do game
        rotationSpeed: 2,
        sliceForce: 5
    },

    // Efeitos visuais
    VFX: {
        particleCount: 30,
        particleLifetime: 1.0,
        glowIntensity: 2,
        trailFadeSpeed: 0.1
    },
    
    LIVES: 3,
    
    LEVELS: [
        {
            id: 1,
            name: 'Crescere',
            spawnRate: 0.95,
            spawnRateMin: 0.70,
            spawnRateDecrease: 0.008,
            gravity: -6.2,
            initialVelocity: { min: 12, max: 15 },
            lateralVelocity: { min: -1.4, max: 1.4 },
            bossColor: 'yellow',
            bossHealth: 10,
            bossScale: 2.0,
            bossCombo: 5,
            pointsToAdvance: 500,
            infinitePayChance: 0.15, // 15% - Nível fácil
            defeatMessage: 'Você abriu caminho para taxas mais inteligentes.',
            progressMessage: 'Seu negócio já sente a diferença!'
        },
        {
            id: 2,
            name: 'Novus',
            spawnRate: 0.85,
            spawnRateMin: 0.55,
            spawnRateDecrease: 0.010,
            gravity: -6.5,
            initialVelocity: { min: 13, max: 17 },
            lateralVelocity: { min: -1.8, max: 1.8 },
            bossColor: 'green',
            bossHealth: 14,
            bossScale: 2.2,
            bossCombo: 5,
            pointsToAdvance: 800,
            infinitePayChance: 0.20, // 20%
            defeatMessage: 'Concorrência confusa, taxas limpas para você.',
            progressMessage: 'Cada golpe derruba custos desnecessários.'
        },
        {
            id: 3,
            name: 'Magnus',
            spawnRate: 0.70,
            spawnRateMin: 0.45,
            spawnRateDecrease: 0.012,
            gravity: -7.0,
            initialVelocity: { min: 14, max: 19 },
            lateralVelocity: { min: -2.2, max: 2.2 },
            bossColor: 'orange',
            bossHealth: 18,
            bossScale: 2.4,
            bossCombo: 5,
            pointsToAdvance: 1200,
            infinitePayChance: 0.25, // 25%
            defeatMessage: 'Os gigantes das taxas altas sentiram o golpe.',
            progressMessage: 'Você está muito perto de zerar o desperdício.'
        },
        {
            id: 4,
            name: 'Optimus',
            spawnRate: 0.60,
            spawnRateMin: 0.38,
            spawnRateDecrease: 0.015,
            gravity: -7.5,
            initialVelocity: { min: 15, max: 21 },
            lateralVelocity: { min: -2.5, max: 2.5 },
            bossColor: 'cyan',
            bossHealth: 22,
            bossScale: 2.6,
            bossCombo: 5,
            pointsToAdvance: 1800,
            infinitePayChance: 0.30, // 30%
            defeatMessage: 'Você dominou o mercado premium da concorrência.',
            progressMessage: 'Falta pouco para eliminar de vez taxas abusivas!'
        },
        {
            id: 5,
            name: 'Loop Infinito',
            spawnRate: 0.40,
            spawnRateMin: 0.22,
            spawnRateDecrease: 0.025,
            gravity: -8.5,
            initialVelocity: { min: 17, max: 25 },
            lateralVelocity: { min: -3.2, max: 3.2 },
            bossColor: 'orange',
            bossHealth: 30,
            bossScale: 2.8,
            bossCombo: 5,
            pointsToAdvance: 2500,
            infinitePayChance: 0.38, // 38% - MUITO DIFÍCIL!
            defeatMessage: 'Impossível! Você é imparável!',
            progressMessage: 'Continue acumulando pontos!'
        }
    ],
    
    BOSS: {
        comboThreshold: 5,
        rewardTime: 4,  // Reduzido para 4 segundos
        hitCooldown: 350,
        countdownDuration: 3,
        explosionTitle: 'CONCORRÊNCIA ELIMINADA, SEU NEGÓCIO AGRADECE.'
    },

    // Canvas e Rendering
    CANVAS: {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
    }
};

// Utilitários
const UTILS = {
    // Número aleatório entre min e max
    random: (min, max) => Math.random() * (max - min) + min,
    
    // Escolher elemento aleatório de array
    randomChoice: (array) => array[Math.floor(Math.random() * array.length)],
    
    // Clamp valor entre min e max
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    
    // Lerp (interpolação linear)
    lerp: (start, end, t) => start + (end - start) * t,
    
    // Distância 2D
    distance2D: (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    // Converter coordenadas de tela para Three.js
    screenToWorld: (x, y, camera, width, height) => {
        const vec = new THREE.Vector3();
        vec.x = (x / width) * 2 - 1;
        vec.y = -(y / height) * 2 + 1;
        vec.z = 0.5;
        vec.unproject(camera);
        return vec;
    },
    
    // Formatar número com zeros à esquerda
    padNumber: (num, length) => String(num).padStart(length, '0'),
    
    // Salvar highscore
    saveHighscore: (score) => {
        const current = UTILS.getHighscore();
        if (score > current) {
            localStorage.setItem('infiniteSliceHighscore', score.toString());
            return true; // novo recorde
        }
        return false;
    },
    
    // Obter highscore
    getHighscore: () => {
        const stored = localStorage.getItem('infiniteSliceHighscore');
        return stored ? parseInt(stored, 10) : 0;
    }
};

