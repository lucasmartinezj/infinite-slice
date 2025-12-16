// =====================================================
// INFINITE SLICE - INICIALIZAÇÃO
// =====================================================

let game = null;
let uiManager = null;

// Inicializar quando o DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
    init();
});

// Função principal de inicialização
async function init() {
    console.log('🎮 Infinite Slice - Iniciando...');
    
    try {
        // Inicializar áudio
        audioManager.init();
        
        // Inicializar UI
        uiManager = new UIManager();
        
        // Inicializar jogo
        game = new Game();
        game.init();
        
        // Configurar event listeners
        setupGameEvents();
        
        // Esconder loading
        setTimeout(() => {
            uiManager.hideLoading();
            console.log('✅ Jogo carregado com sucesso!');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao inicializar jogo:', error);
        alert('Erro ao carregar o jogo. Por favor, recarregue a página.');
    }
}

// Configurar eventos do jogo
function setupGameEvents() {
    // Evento de iniciar jogo
    window.addEventListener('startgame', () => {
        console.log('🎯 Iniciando partida...');
        game.start();
    });
    
    // Evento de game over já está no UIManager
    
    // Prevenir comportamentos padrão em mobile
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());
    
    // Prevenir zoom em iOS
    document.addEventListener('touchmove', (e) => {
        if (e.scale !== 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevenir menu de contexto
    window.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Função auxiliar para debug
window.debugGame = () => {
    console.log('=== DEBUG INFO ===');
    console.log('Jogo ativo:', game.isPlaying);
    console.log('Máquinas na tela:', game.machines.length);
    console.log('Pontuação:', game.score);
    console.log('Combo:', game.combo);
    console.log('Tempo restante:', game.timeLeft.toFixed(2));
    console.log('FPS:', Math.round(1000 / (performance.now() - game.lastTime)));
    console.log('==================');
};

// Atalhos de teclado (para debug/desenvolvimento)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'r': // Reiniciar
                if (game.isPlaying) {
                    game.reset();
                    console.log('🔄 Jogo resetado');
                }
                break;
            case 'p': // Pausar
                if (game.isPlaying) {
                    if (game.isPaused) {
                        game.resume();
                        console.log('▶️ Jogo retomado');
                    } else {
                        game.pause();
                        console.log('⏸️ Jogo pausado');
                    }
                }
                break;
            case 'd': // Debug
                window.debugGame();
                break;
            case 's': // Spawn manual
                if (game.isPlaying) {
                    game.spawnMachine();
                    console.log('🎯 Máquina spawnada');
                }
                break;
            case 'm': // Toggle som
                const enabled = audioManager.toggle();
                console.log(enabled ? '🔊 Som ativado' : '🔇 Som desativado');
                break;
        }
    });
    
    console.log(`
    🎮 INFINITE SLICE - Atalhos de Desenvolvimento
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    [R] - Resetar jogo
    [P] - Pausar/Retomar
    [D] - Mostrar debug info
    [S] - Spawnar máquina
    [M] - Toggle som
    
    window.debugGame() - Ver informações do jogo
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
}

// Log inicial
console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║        🎮 INFINITE SLICE 🎮               ║
║                                           ║
║        Powered by InfinitePay             ║
║        Desenvolvido com Three.js          ║
║                                           ║
╚═══════════════════════════════════════════╝
`);

