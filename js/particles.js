// =====================================================
// INFINITE SLICE - SISTEMA DE PARTÍCULAS
// =====================================================

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.particlePool = [];
        this.maxParticles = 500;
        
        // Background particles (ambiente)
        this.createBackgroundParticles();
    }

    // Criar partículas de fundo flutuantes - VISUAL MELHORADO
    createBackgroundParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const sizes = [];
        
        // Fundo mais discreto (referência do menu principal)
        const particleCount = 60;
        const neonGreen = new THREE.Color(0x00ff7a);
        const softWhite = new THREE.Color(0xe5f6ff);
        
        for (let i = 0; i < particleCount; i++) {
            vertices.push(
                UTILS.random(-18, 18),
                UTILS.random(-10, 10),
                UTILS.random(-8, 3)
            );
            
            // Mistura de verde neon e branco suave
            const color = (Math.random() < 0.55) ? neonGreen : softWhite;
            
            colors.push(color.r, color.g, color.b);
            sizes.push(UTILS.random(0.04, 0.12));
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
            sizeAttenuation: true
        });
        
        this.bgParticles = new THREE.Points(geometry, material);
        this.scene.add(this.bgParticles);
    }

    // Animar partículas de fundo
    updateBackground(deltaTime) {
        if (!this.bgParticles) return;
        
        this.bgParticles.rotation.y += deltaTime * 0.01;
        
        const positions = this.bgParticles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            // Movimento sutil de flutuação
            positions[i + 1] += Math.sin(Date.now() * 0.0008 + i) * 0.004;
        }
        this.bgParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Criar explosão de DESINTEGRAÇÃO ao cortar
    createSliceExplosion(position, color, count = 50) {
        const colorObj = new THREE.Color(color);
        
        // MUITO MAIS PARTÍCULAS para efeito de desintegração
        for (let i = 0; i < count; i++) {
            const particle = this.getParticle();
            
            particle.mesh.position.copy(position);
            
            // Velocidades variadas em todas as direções
            const angle = (i / count) * Math.PI * 2;
            const speed = UTILS.random(3, 10);
            const upSpeed = UTILS.random(1, 6);
            
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                upSpeed,
                Math.sin(angle) * speed * 0.5
            );
            
            particle.lifetime = UTILS.random(0.6, 1.2);
            particle.age = 0;
            particle.color = colorObj;
            
            // Criar mesh se não existir
            if (!particle.mesh.geometry) {
                // Partículas maiores para desintegração
                const size = UTILS.random(0.1, 0.2);
                const geo = new THREE.SphereGeometry(size, 6, 6);
                const mat = new THREE.MeshBasicMaterial({
                    color: colorObj,
                    transparent: true,
                    opacity: 1,
                    blending: THREE.AdditiveBlending
                });
                particle.mesh = new THREE.Mesh(geo, mat);
                this.scene.add(particle.mesh);
            } else {
                particle.mesh.material.color.copy(colorObj);
                particle.mesh.material.opacity = 1;
                particle.mesh.visible = true;
            }
            
            this.particles.push(particle);
        }
        
        console.log(`💥 Criadas ${count} partículas de desintegração`);
    }

    // Criar rastro do sabre
    createSaberTrail(position, velocity) {
        const particle = this.getParticle();
        
        particle.mesh.position.copy(position);
        particle.velocity = velocity.clone().multiplyScalar(0.1);
        particle.lifetime = 0.3;
        particle.age = 0;
        particle.color = new THREE.Color(CONFIG.SABER.color);
        
        if (!particle.mesh.geometry) {
            const geo = new THREE.SphereGeometry(0.08, 6, 6);
            const mat = new THREE.MeshBasicMaterial({
                color: CONFIG.SABER.color,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            particle.mesh = new THREE.Mesh(geo, mat);
            this.scene.add(particle.mesh);
        } else {
            particle.mesh.material.opacity = 0.8;
            particle.mesh.visible = true;
        }
        
        this.particles.push(particle);
    }

    // Obter partícula do pool ou criar nova
    getParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        
        return {
            mesh: new THREE.Mesh(),
            velocity: new THREE.Vector3(),
            lifetime: 1,
            age: 0,
            color: new THREE.Color()
        };
    }

    // Retornar partícula ao pool
    returnParticle(particle) {
        particle.mesh.visible = false;
        this.particlePool.push(particle);
    }

    // Atualizar todas as partículas
    update(deltaTime) {
        this.updateBackground(deltaTime);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Atualizar idade
            particle.age += deltaTime;
            
            // Remover se expirou
            if (particle.age >= particle.lifetime) {
                this.returnParticle(particle);
                this.particles.splice(i, 1);
                continue;
            }
            
            // Física
            particle.velocity.y += CONFIG.PHYSICS.gravity * deltaTime * 0.5;
            particle.mesh.position.add(
                particle.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // Fade out
            const lifeRatio = 1 - (particle.age / particle.lifetime);
            if (particle.mesh.material) {
                particle.mesh.material.opacity = lifeRatio;
            }
            
            // Escala
            const scale = lifeRatio * 0.5 + 0.5;
            particle.mesh.scale.setScalar(scale);
        }
    }

    // Limpar todas as partículas
    clear() {
        this.particles.forEach(particle => {
            this.returnParticle(particle);
        });
        this.particles = [];
    }

    // Destruir sistema
    destroy() {
        this.clear();
        if (this.bgParticles) {
            this.scene.remove(this.bgParticles);
            this.bgParticles.geometry.dispose();
            this.bgParticles.material.dispose();
        }
    }
}

