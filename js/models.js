// =====================================================
// INFINITE SLICE - MODELOS 3D DAS MAQUININHAS
// =====================================================

class CardMachine {
    constructor(scene, color, isInfinitePay = false) {
        this.scene = scene;
        this.colorData = color;
        this.mesh = null;
        this.sliced = false;
        this.velocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();
        this.isInfinitePay = isInfinitePay;
        this.isBoss = false;
        this.bossHealth = 1;
        this.maxBossHealth = 1;
        this.bossFloatTime = 0;
        this.bossBaseY = 0;
        this.bossBaseX = 0;
        
        this.createMesh();
    }
    
    // Recriar mesh (usado para boss após setar isBoss = true)
    recreateMesh() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            // Limpar geometrias e materiais antigos
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        this.createMesh();
    }
    
    // Remove bordas transparentes do PNG para o logo ocupar toda a moeda
    createCroppedTexture(image) {
        if (!image) return null;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(image, 0, 0);
        const data = tempCtx.getImageData(0, 0, image.width, image.height).data;
        
        let minX = image.width, minY = image.height;
        let maxX = 0, maxY = 0;
        
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                const alpha = data[(y * image.width + x) * 4 + 3];
                if (alpha > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        
        if (maxX <= minX || maxY <= minY) {
            return null;
        }
        
        const size = Math.max(maxX - minX, maxY - minY);
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropCanvas.height = size;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(image, minX, minY, size, size, 0, 0, size, size);
        
        return new THREE.CanvasTexture(cropCanvas);
    }

    // Criar mesh 3D da maquininha - VISUAL FUTURISTA METÁLICO
    createMesh() {
        const group = new THREE.Group();
        
        if (this.isInfinitePay) {
            // MAQUININHA INFINITEPAY - NÃO PODE CORTAR!
            this.createInfinitePayMachine(group);
        } else {
            // Máquinas genéricas - pode cortar
            this.createGenericMachine(group);
        }
        
        this.mesh = group;
        this.mesh.userData.machine = this;
        // MESMO TAMANHO para todos!
        this.mesh.scale.set(1.2, 1.2, 1.2);
        
        this.scene.add(this.mesh);
    }
    
    // Logo InfinitePay - moeda 3D igual ao material oficial
    createInfinitePayMachine(group) {
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(
            'Design_sem_nome-removebg-preview.png',
            (logoTexture) => {
                console.log('✅ Logo InfinitePay carregado!');
                
                logoTexture.minFilter = THREE.LinearFilter;
                logoTexture.magFilter = THREE.LinearFilter;
                
                // Remover áreas transparentes para o logo preencher a moeda
                const croppedTexture = this.createCroppedTexture(logoTexture.image) || logoTexture;
                croppedTexture.minFilter = THREE.LinearFilter;
                croppedTexture.magFilter = THREE.LinearFilter;
                
                const radius = 0.65;
                const thickness = 0.24;
                
                // Corpo preto (cilindro fino)
                const bodyGeometry = new THREE.CylinderGeometry(radius, radius, thickness, 64);
                const bodyMaterial = new THREE.MeshStandardMaterial({
                    color: 0x0b0b0b,
                    metalness: 0.9,
                    roughness: 0.2
                });
                const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
                body.rotation.x = Math.PI / 2;
                group.add(body);
                
                // Faces com o logo (frente e trás) - adaptam ao círculo
                const faceGeometry = new THREE.CircleGeometry(radius, 64);
                const faceMaterial = new THREE.MeshBasicMaterial({
                    map: croppedTexture,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                
                const frontFace = new THREE.Mesh(faceGeometry, faceMaterial);
                frontFace.position.z = thickness / 2 + 0.001;
                group.add(frontFace);
                
                const backFace = new THREE.Mesh(faceGeometry, faceMaterial);
                backFace.position.z = -thickness / 2 - 0.001;
                backFace.rotation.y = Math.PI;
                group.add(backFace);
                
                console.log('🪙 Moeda InfinitePay criada!');
            },
            undefined,
            (err) => console.error('❌ Erro:', err)
        );
    }
    
    // Máquina genérica (cortável) - POS REALISTA
    createGenericMachine(group) {
        // Boss usa a cor da máquina (definida no spawnBoss), não preto
        const machineColor = this.colorData.hex;
        const scale = 1.4; // Escala maior para melhor visibilidade
        
        // CORPO PRINCIPAL - Formato de maquininha real (inteiro da mesma cor)
        const bodyGeo = new THREE.BoxGeometry(0.65 * scale, 1.4 * scale, 0.22 * scale);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: machineColor,
            metalness: 0.7,
            roughness: 0.25,
            emissive: machineColor,
            emissiveIntensity: this.isBoss ? 0.3 : 0.15
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);
        
        // SLOT DE CARTÃO NO TOPO (característico de maquininhas)
        const slotTopGeo = new THREE.BoxGeometry(0.5 * scale, 0.08 * scale, 0.25 * scale);
        const slotTopMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0.9,
            roughness: 0.1
        });
        const slotTop = new THREE.Mesh(slotTopGeo, slotTopMat);
        slotTop.position.set(0, 0.74 * scale, 0);
        group.add(slotTop);
        
        // Abertura do slot
        const slotHoleGeo = new THREE.BoxGeometry(0.4 * scale, 0.03 * scale, 0.15 * scale);
        const slotHoleMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            metalness: 0.5,
            roughness: 0.5
        });
        const slotHole = new THREE.Mesh(slotHoleGeo, slotHoleMat);
        slotHole.position.set(0, 0.74 * scale, 0.06 * scale);
        group.add(slotHole);
        
        // TELA/VISOR na parte superior
        const screenGeo = new THREE.PlaneGeometry(0.5 * scale, 0.4 * scale);
        const screenMat = new THREE.MeshStandardMaterial({
            color: this.isBoss ? 0x1a0000 : 0xf5f5f5,
            metalness: 0.1,
            roughness: 0.3,
            emissive: this.isBoss ? 0xff2200 : 0x88ccff,
            emissiveIntensity: this.isBoss ? 1.2 : 0.3
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 0.42 * scale, 0.12 * scale);
        group.add(screen);
        
        // Borda da tela
        const screenBorderGeo = new THREE.BoxGeometry(0.54 * scale, 0.44 * scale, 0.02 * scale);
        const screenBorderMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0.8,
            roughness: 0.2
        });
        const screenBorder = new THREE.Mesh(screenBorderGeo, screenBorderMat);
        screenBorder.position.set(0, 0.42 * scale, 0.11 * scale);
        group.add(screenBorder);
        
        // TECLADO NUMÉRICO (3x4 grid)
        const keySize = 0.11 * scale;
        const keyGap = 0.03 * scale;
        const keyboardStartY = 0.05 * scale;
        const keyboardStartX = -0.17 * scale;
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const keyGeo = new THREE.BoxGeometry(keySize, keySize, 0.03 * scale);
                const keyMat = new THREE.MeshStandardMaterial({
                    color: 0x2a2a2a,
                    metalness: 0.6,
                    roughness: 0.4
                });
                const key = new THREE.Mesh(keyGeo, keyMat);
                key.position.set(
                    keyboardStartX + col * (keySize + keyGap),
                    keyboardStartY - row * (keySize + keyGap),
                    0.12 * scale
                );
                group.add(key);
            }
        }
        
        // BOTÕES DE AÇÃO (verde, amarelo, vermelho) - linha inferior
        const actionBtnGeo = new THREE.BoxGeometry(0.14 * scale, 0.1 * scale, 0.03 * scale);
        
        // Botão vermelho (cancelar)
        const redBtnMat = new THREE.MeshStandardMaterial({
            color: 0xcc0000,
            metalness: 0.5,
            roughness: 0.3,
            emissive: 0xcc0000,
            emissiveIntensity: 0.4
        });
        const redBtn = new THREE.Mesh(actionBtnGeo, redBtnMat);
        redBtn.position.set(-0.2 * scale, -0.55 * scale, 0.12 * scale);
        group.add(redBtn);
        
        // Botão amarelo (corrigir)
        const yellowBtnMat = new THREE.MeshStandardMaterial({
            color: 0xddaa00,
            metalness: 0.5,
            roughness: 0.3,
            emissive: 0xddaa00,
            emissiveIntensity: 0.4
        });
        const yellowBtn = new THREE.Mesh(actionBtnGeo, yellowBtnMat);
        yellowBtn.position.set(0, -0.55 * scale, 0.12 * scale);
        group.add(yellowBtn);
        
        // Botão verde (confirmar)
        const greenBtnMat = new THREE.MeshStandardMaterial({
            color: 0x00aa00,
            metalness: 0.5,
            roughness: 0.3,
            emissive: 0x00aa00,
            emissiveIntensity: 0.5
        });
        const greenBtn = new THREE.Mesh(actionBtnGeo, greenBtnMat);
        greenBtn.position.set(0.2 * scale, -0.55 * scale, 0.12 * scale);
        group.add(greenBtn);
        
        // Boss: adicionar cara malvada
        if (this.isBoss) {
            this.addBossFace(group, scale);
        }
        
        // Luz ambiente da cor da máquina
        const light = new THREE.PointLight(machineColor, this.isBoss ? 4 : 2, this.isBoss ? 8 : 5);
        light.position.set(0, 0, 0.5);
        group.add(light);
        
        console.log(`🎰 POS ${this.colorData.name} criado!`);
    }
    
    // Adicionar partículas brilhantes ao redor
    addGlowParticles(group, color) {
        const particleCount = 8;
        const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 0.9;
            particle.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0.4
            );
            particle.userData.angle = angle;
            particle.userData.radius = radius;
            group.add(particle);
        }
    }
    
    addBossFace(group, scale = 1) {
        const s = scale;
        
        // Olhos vermelhos brilhantes (na tela)
        const eyeGeo = new THREE.SphereGeometry(0.06 * s, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 2.5
        });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12 * s, 0.48 * s, 0.13 * s);
        group.add(leftEye);
        const rightEye = leftEye.clone();
        rightEye.position.x = 0.12 * s;
        group.add(rightEye);
        
        // Sobrancelhas inclinadas (cara de bravo)
        const browGeo = new THREE.BoxGeometry(0.15 * s, 0.03 * s, 0.02 * s);
        const browMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.5
        });
        const leftBrow = new THREE.Mesh(browGeo, browMat);
        leftBrow.position.set(-0.12 * s, 0.56 * s, 0.13 * s);
        leftBrow.rotation.z = 0.35;
        group.add(leftBrow);
        
        const rightBrow = leftBrow.clone();
        rightBrow.position.x = 0.12 * s;
        rightBrow.rotation.z = -0.35;
        group.add(rightBrow);
        
        // Boca malvada (sorriso sinistro)
        const mouthGeo = new THREE.BoxGeometry(0.2 * s, 0.03 * s, 0.02 * s);
        const mouthMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.2
        });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 0.32 * s, 0.13 * s);
        group.add(mouth);
    }

    // Posicionar na posição inicial (fora da tela, embaixo)
    spawn(x) {
        if (this.isBoss) {
            this.mesh.position.set(0, 0, 0);
            this.velocity.set(0, 0, 0);
            this.angularVelocity.set(0, 0, 0);
            this.bossFloatTime = 0;
            this.bossBaseY = 0;
            this.bossBaseX = 0;
            this.sliced = false;
            return;
        }
        
        this.mesh.position.set(x, -10, 0); // Mais embaixo
        this.mesh.rotation.set(
            UTILS.random(-0.5, 0.5),
            UTILS.random(-0.5, 0.5),
            UTILS.random(-Math.PI, Math.PI)
        );
        
        // Velocidade inicial ALTA para subir até o topo
        const vy = UTILS.random(
            CONFIG.GAME.initialVelocity.min,
            CONFIG.GAME.initialVelocity.max
        );
        const vx = UTILS.random(
            CONFIG.GAME.lateralVelocity.min,
            CONFIG.GAME.lateralVelocity.max
        );
        
        this.velocity.set(vx, vy, 0);
        
        // Rotação suave
        this.angularVelocity.set(
            UTILS.random(-1.5, 1.5),
            UTILS.random(-1.5, 1.5),
            UTILS.random(-1.5, 1.5)
        );
        
        this.sliced = false;
    }

    // Atualizar física
    update(deltaTime) {
        if (!this.mesh || this.sliced) return;
        
        if (this.isBoss) {
            this.bossFloatTime += deltaTime;
            const swayX = Math.sin(this.bossFloatTime * 0.8) * 1.2;
            const swayY = Math.sin(this.bossFloatTime * 1.3) * 1.3;
            this.mesh.position.set(swayX, swayY, 0);
            this.mesh.rotation.y += deltaTime * 0.4;
            this.mesh.rotation.x = Math.sin(this.bossFloatTime * 0.7) * 0.15;
            return;
        }
        
        // LIMITE DE ALTURA: não passa do HUD
        if (this.mesh.position.y >= CONFIG.GAME.maxHeight && this.velocity.y > 0) {
            this.velocity.y = -Math.abs(this.velocity.y) * 0.5; // Inverte e reduz
        }
        
        // Gravidade
        this.velocity.y += CONFIG.GAME.gravity * deltaTime;
        
        // Posição
        this.mesh.position.add(
            this.velocity.clone().multiplyScalar(deltaTime)
        );
        
        // Rotação
        this.mesh.rotation.x += this.angularVelocity.x * deltaTime;
        this.mesh.rotation.y += this.angularVelocity.y * deltaTime;
        this.mesh.rotation.z += this.angularVelocity.z * deltaTime;
        
        // Animar partículas brilhantes (orbitando)
        const time = Date.now() * 0.001;
        this.mesh.children.forEach(child => {
            if (child.userData.angle !== undefined) {
                const newAngle = child.userData.angle + time;
                child.position.x = Math.cos(newAngle) * child.userData.radius;
                child.position.y = Math.sin(newAngle) * child.userData.radius;
            }
        });
    }

    // Verificar se está fora da tela
    isOffScreen() {
        if (this.isBoss) return false;
        // Saiu pela parte de baixo ou laterais
        return this.mesh.position.y < -12 || 
               Math.abs(this.mesh.position.x) > 15;
    }

    // Marcar como cortado - VERSÃO SIMPLIFICADA QUE FUNCIONA!
    slice(slicePoint, sliceDirection) {
        if (this.isBoss) return;
        console.log('🔪🔪🔪 SLICE CHAMADO! 🔪🔪🔪');
        
        // ESCONDER O MESH ORIGINAL IMEDIATAMENTE!
        this.mesh.visible = false;
        console.log('👻 Mesh original escondido');
        
        const position = this.mesh.position.clone();
        const rotation = this.mesh.rotation.clone();
        
        // Calcular direção perpendicular ao corte
        const perpendicular = new THREE.Vector3(
            -sliceDirection.y,
            sliceDirection.x,
            0
        ).normalize();
        
        console.log('✂️ Criando 2 METADES VISÍVEIS...');
        
        // CRIAR 2 METADES BEM SEPARADAS!
        for (let i = 0; i < 2; i++) {
            const dir = i === 0 ? 1 : -1;
            
            // LIMPAR userData.machine para evitar referência circular
            const originalMachine = this.mesh.userData.machine;
            this.mesh.userData.machine = null;
            
            // Clonar o mesh SEM referências circulares
            const half = this.mesh.clone(true);
            half.visible = true;
            
            // Restaurar referência original
            this.mesh.userData.machine = originalMachine;
            
            // LIMPAR userData do clone para evitar problemas
            half.userData = {};
            
            // Posição inicial - JÁ SEPARADO!
            half.position.copy(position);
            half.position.add(perpendicular.clone().multiplyScalar(0.5 * dir));
            half.rotation.copy(rotation);
            
            // Velocidade de separação RÁPIDA
            half.userData.velocity = this.velocity.clone();
            half.userData.velocity.add(perpendicular.clone().multiplyScalar(8 * dir));
            
            // Rotação dramática
            half.userData.angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                dir * 12
            );
            
            // Configurar para desaparecer RÁPIDO (não atrapalhar)
            half.userData.lifetime = 0.5; // MEIO SEGUNDO!
            half.userData.age = 0;
            half.userData.shortCircuit = true;
            half.userData.isDebris = true;
            
            // Adicionar à cena
            this.scene.add(half);
            
            // Adicionar aos debris
            if (window.gameInstance) {
                window.gameInstance.debris.push(half);
                console.log(`✅ Metade ${i + 1} adicionada! Total debris: ${window.gameInstance.debris.length}`);
            }
        }
        
        console.log('🎉 CORTE COMPLETO - 2 metades voando!');
        
        // Faíscas elétricas
        this.createElectricSparks(position, sliceDirection);
    }
    
    // Criar faíscas elétricas no corte
    createElectricSparks(position, direction) {
        if (!window.gameInstance || !window.gameInstance.particles) return;
        
        const sparkCount = 15;
        const particles = window.gameInstance.particles;
        
        for (let i = 0; i < sparkCount; i++) {
            const spark = particles.getParticle();
            
            spark.mesh.position.copy(position);
            spark.mesh.position.add(new THREE.Vector3(
                direction.x * UTILS.random(-0.3, 0.3),
                direction.y * UTILS.random(-0.3, 0.3),
                UTILS.random(-0.2, 0.2)
            ));
            
            // Velocidade das faíscas
            spark.velocity = new THREE.Vector3(
                UTILS.random(-4, 4),
                UTILS.random(1, 5),
                UTILS.random(-2, 2)
            );
            
            spark.lifetime = UTILS.random(0.3, 0.6); // MAIS LONGO!
            spark.age = 0;
            spark.color = new THREE.Color(0x00ffff); // Cyan elétrico
            
            console.log(`⚡ Faísca ${i + 1} criada!`);
            
            if (!spark.mesh.geometry) {
                const geo = new THREE.SphereGeometry(0.05, 4, 4);
                const mat = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 1,
                    blending: THREE.AdditiveBlending
                });
                spark.mesh = new THREE.Mesh(geo, mat);
                particles.scene.add(spark.mesh);
            } else {
                spark.mesh.material.color.set(0x00ffff);
                spark.mesh.material.opacity = 1;
                spark.mesh.visible = true;
            }
            
            particles.particles.push(spark);
        }
    }

    // Destruir objeto
    destroy() {
        if (this.mesh && this.mesh.parent) {
            this.scene.remove(this.mesh);
            
            // Dispose geometry e materials recursivamente
            this.mesh.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat.map) mat.map.dispose();
                            mat.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            });
            
            this.mesh = null;
        }
    }
}

