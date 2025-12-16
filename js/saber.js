// =====================================================
// INFINITE SLICE - SABRE DE LUZ INFINITEPAY
// =====================================================

class LightSaber {
    constructor(scene, slashCanvas) {
        this.scene = scene;
        this.slashCanvas = slashCanvas;
        this.slashCtx = slashCanvas.getContext('2d');
        
        this.trail = [];
        this.maxTrailLength = CONFIG.SABER.trailLength;
        this.isActive = false;
        
        this.currentPos = { x: 0, y: 0 };
        this.prevPos = { x: 0, y: 0 };
        
        this.setupCanvas();
    }

    // Configurar canvas de slash
    setupCanvas() {
        this.slashCanvas.width = window.innerWidth;
        this.slashCanvas.height = window.innerHeight;
        
        this.slashCtx.lineCap = 'round';
        this.slashCtx.lineJoin = 'round';
    }

    // Iniciar movimento
    start(x, y) {
        this.isActive = true;
        this.currentPos = { x, y };
        this.prevPos = { x, y };
        this.trail = [{ x, y, time: Date.now() }];
    }

    // Mover sabre
    move(x, y) {
        if (!this.isActive) return;
        
        this.prevPos = { ...this.currentPos };
        this.currentPos = { x, y };
        
        // Adicionar ao rastro
        this.trail.push({ x, y, time: Date.now() });
        
        // Limitar tamanho do rastro
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Desenhar
        this.draw();
    }

    // Parar movimento
    stop() {
        this.isActive = false;
        
        // Fade out do rastro
        setTimeout(() => {
            this.trail = [];
        }, 100);
    }

    // Desenhar rastro do sabre
    draw() {
        // Limpar canvas
        this.slashCtx.clearRect(0, 0, this.slashCanvas.width, this.slashCanvas.height);
        
        if (this.trail.length < 2) return;
        
        const now = Date.now();
        
        // Desenhar rastro com gradiente
        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            const prevPoint = this.trail[i - 1];
            
            // Calcular opacidade baseada no tempo
            const age = now - point.time;
            const opacity = Math.max(0, 1 - age / 500);
            
            // Calcular largura baseada na posição no rastro
            const widthRatio = i / this.trail.length;
            const width = 15 + widthRatio * 10;
            
            // Desenhar linha principal (azul serenity)
            this.slashCtx.beginPath();
            this.slashCtx.moveTo(prevPoint.x, prevPoint.y);
            this.slashCtx.lineTo(point.x, point.y);
            this.slashCtx.strokeStyle = `rgba(176, 205, 223, ${opacity})`;
            this.slashCtx.lineWidth = width;
            this.slashCtx.stroke();
            
            // Desenhar glow (brilho adicional)
            this.slashCtx.beginPath();
            this.slashCtx.moveTo(prevPoint.x, prevPoint.y);
            this.slashCtx.lineTo(point.x, point.y);
            this.slashCtx.strokeStyle = `rgba(77, 208, 225, ${opacity * 0.5})`;
            this.slashCtx.lineWidth = width + 10;
            this.slashCtx.stroke();
            
            // Core brilhante
            this.slashCtx.beginPath();
            this.slashCtx.moveTo(prevPoint.x, prevPoint.y);
            this.slashCtx.lineTo(point.x, point.y);
            this.slashCtx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
            this.slashCtx.lineWidth = width * 0.3;
            this.slashCtx.stroke();
        }
    }

    // Atualizar (remover pontos antigos do rastro)
    update() {
        const now = Date.now();
        this.trail = this.trail.filter(point => now - point.time < 500);
        
        // Redesenhar se houver rastro
        if (this.trail.length > 0) {
            this.draw();
        } else {
            this.slashCtx.clearRect(0, 0, this.slashCanvas.width, this.slashCanvas.height);
        }
    }

    // Obter direção do movimento
    getDirection() {
        if (this.trail.length < 2) {
            return new THREE.Vector2(0, 0);
        }
        
        const last = this.trail[this.trail.length - 1];
        const prev = this.trail[Math.max(0, this.trail.length - 3)];
        
        return new THREE.Vector2(
            last.x - prev.x,
            last.y - prev.y
        ).normalize();
    }

    // Obter velocidade do movimento
    getVelocity() {
        if (this.trail.length < 2) return 0;
        
        const last = this.trail[this.trail.length - 1];
        const prev = this.trail[this.trail.length - 2];
        
        const dx = last.x - prev.x;
        const dy = last.y - prev.y;
        const dt = (last.time - prev.time) / 1000;
        
        if (dt === 0) return 0;
        
        return Math.sqrt(dx * dx + dy * dy) / dt;
    }

    // Redimensionar canvas
    resize() {
        this.slashCanvas.width = window.innerWidth;
        this.slashCanvas.height = window.innerHeight;
    }

    // Limpar
    clear() {
        this.slashCtx.clearRect(0, 0, this.slashCanvas.width, this.slashCanvas.height);
        this.trail = [];
    }
}

