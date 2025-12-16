// =====================================================
// INFINITE SLICE - DETECÇÃO DE CORTE
// =====================================================

class SliceDetector {
    constructor(camera, machines) {
        this.camera = camera;
        this.machines = machines;
        this.raycaster = new THREE.Raycaster();
        this.sliceThreshold = 1.5; // Distância máxima para considerar corte
    }

    // Verificar se o movimento do sabre cortou alguma maquininha - CORRIGIDO
    checkSlice(saberTrail) {
        if (saberTrail.length < 3) return []; // Precisa de pelo menos 3 pontos
        
        const slicedMachines = [];
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Para cada máquina ativa
        for (let machine of this.machines) {
            // Verificar se a máquina é válida e não foi cortada
            if (!machine || machine.sliced || !machine.mesh || !machine.mesh.visible) continue;
            
            // Projetar posição 3D da máquina para 2D na tela
            const screenPos = this.worldToScreen(machine.mesh.position, width, height);
            
            // IMPORTANTE: Verificar se está na tela visível
            if (!screenPos || screenPos.x < 0 || screenPos.x > width || 
                screenPos.y < 0 || screenPos.y > height) {
                continue;
            }
            
            // Verificar apenas os últimos 5 pontos do rastro (mais recentes)
            const recentTrail = saberTrail.slice(-5);
            
            for (let i = 1; i < recentTrail.length; i++) {
                const point = recentTrail[i];
                const prevPoint = recentTrail[i - 1];
                
                // Calcular distância do ponto ao segmento de linha
                const distance = this.pointToSegmentDistance(
                    screenPos.x, screenPos.y,
                    prevPoint.x, prevPoint.y,
                    point.x, point.y
                );
                
                // Tolerância MENOR e mais precisa - 60px
                if (distance < 60) {
                    // Calcular direção do corte
                    const sliceDirection = new THREE.Vector2(
                        point.x - prevPoint.x,
                        point.y - prevPoint.y
                    ).normalize();
                    
                    // Calcular ponto de intersecção real
                    const intersectionPoint = this.getIntersectionPoint(
                        screenPos.x, screenPos.y,
                        prevPoint.x, prevPoint.y,
                        point.x, point.y
                    );
                    
                    slicedMachines.push({
                        machine: machine,
                        slicePoint: machine.mesh.position.clone(),
                        sliceDirection: sliceDirection,
                        screenPos: intersectionPoint,
                        distance: distance
                    });
                    
                    console.log(`✂️ CORTOU! Distância: ${distance.toFixed(1)}px`);
                    
                    break; // Já cortou esta máquina
                }
            }
        }
        
        return slicedMachines;
    }
    
    // Calcular ponto de intersecção mais próximo
    getIntersectionPoint(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        if (dx === 0 && dy === 0) {
            return { x: x1, y: y1 };
        }
        
        const t = Math.max(0, Math.min(1, 
            ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
        ));
        
        return {
            x: x1 + t * dx,
            y: y1 + t * dy
        };
    }

    // Converter posição 3D do mundo para 2D na tela
    worldToScreen(position, width, height) {
        const vector = position.clone();
        vector.project(this.camera);
        
        // Verificar se está na frente da câmera
        if (vector.z > 1) return null;
        
        const x = (vector.x * 0.5 + 0.5) * width;
        const y = (vector.y * -0.5 + 0.5) * height;
        
        return { x, y };
    }

    // Calcular distância de um ponto a um segmento de linha
    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        if (dx === 0 && dy === 0) {
            // Segmento é um ponto
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }
        
        // Calcular projeção do ponto no segmento
        const t = Math.max(0, Math.min(1, 
            ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
        ));
        
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }

    // Verificar corte usando raycast (método alternativo mais preciso)
    checkSliceRaycast(screenX, screenY) {
        // Normalizar coordenadas
        const mouse = new THREE.Vector2();
        mouse.x = (screenX / window.innerWidth) * 2 - 1;
        mouse.y = -(screenY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // Coletar todos os meshes das máquinas
        const meshes = this.machines
            .filter(m => !m.sliced && m.mesh.visible)
            .map(m => m.mesh);
        
        const intersects = this.raycaster.intersectObjects(meshes, true);
        
        if (intersects.length > 0) {
            // Encontrar a máquina correspondente
            let targetMesh = intersects[0].object;
            while (targetMesh.parent && !targetMesh.userData.machine) {
                targetMesh = targetMesh.parent;
            }
            
            if (targetMesh.userData.machine) {
                return {
                    machine: targetMesh.userData.machine,
                    point: intersects[0].point,
                    distance: intersects[0].distance
                };
            }
        }
        
        return null;
    }

    // Atualizar lista de máquinas
    updateMachines(machines) {
        this.machines = machines;
    }
}

