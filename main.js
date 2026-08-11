/**
 * L'Éther Alchimique - Award-Winning 3D Scrollytelling Experience
 * Built with Three.js, GSAP, and Lenis
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const CONFIG = {
    colors: {
        background: 0x0a0a0c,
        gold: 0xd4af37,
        goldLight: 0xf4d03f
    },
    camera: { fov: 45, near: 0.1, far: 100, z: 5 },
    bottle: { height: 2, radius: 0.6, segments: 32, transmission: 0.9, roughness: 0.05, ior: 1.5 },
    particles: { count: 2000, size: 0.02, spread: 8 },
    mobile: { particleMultiplier: 0.5, pixelRatio: 1.2 }
};

const state = { mouse: new THREE.Vector2(), prevMouse: new THREE.Vector2(), time: 0 };

class StringSynth {
    constructor() { this.ctx = null; }
    
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const master = this.ctx.createGain();
        master.gain.value = 0.4;
        const reverb = this.ctx.createConvolver();
        const rate = this.ctx.sampleRate;
        const len = rate * 2;
        const impulse = this.ctx.createBuffer(2, len, rate);
        for (let c = 0; c < 2; c++) {
            const data = impulse.getChannelData(c);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        }
        reverb.buffer = impulse;
        master.connect(reverb);
        reverb.connect(this.ctx.destination);
        master.connect(this.ctx.destination);
        this.master = master;
    }
    
    pluck(freq, intensity = 0.5) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(intensity * 0.4, this.ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.5);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.6);
    }
}

const synth = new StringSynth();

function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.mobile.pixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(CONFIG.colors.background, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    console.log('✓ WebGL renderer initialized');
    return renderer;
}

function createScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.08);
    return scene;
}

function createCamera() {
    const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, CONFIG.camera.near, CONFIG.camera.far);
    camera.position.set(0, 0, CONFIG.camera.z);
    return camera;
}

function setupLighting(scene) {
    const ambient = new THREE.AmbientLight(CONFIG.colors.gold, 0.3);
    scene.add(ambient);
    const main = new THREE.DirectionalLight(0xffffff, 1.5);
    main.position.set(5, 5, 5);
    scene.add(main);
    const rim = new THREE.SpotLight(CONFIG.colors.goldLight, 2);
    rim.position.set(-5, 3, -5);
    rim.lookAt(0, 0, 0);
    scene.add(rim);
    const fill = new THREE.PointLight(CONFIG.colors.gold, 0.8);
    fill.position.set(0, -2, 3);
    scene.add(fill);
}

function createPerfumeBottle() {
    const group = new THREE.Group();
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0.1, roughness: CONFIG.bottle.roughness,
        transmission: CONFIG.bottle.transmission, ior: CONFIG.bottle.ior,
        thickness: 0.5, clearcoat: 1, clearcoatRoughness: 0.03
    });
    
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(CONFIG.bottle.radius, CONFIG.bottle.radius * 0.9, CONFIG.bottle.height * 0.7, CONFIG.bottle.segments),
        glassMat
    );
    body.castShadow = true;
    group.add(body);
    
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(CONFIG.bottle.radius * 0.3, CONFIG.bottle.radius * 0.35, CONFIG.bottle.height * 0.2, CONFIG.bottle.segments),
        glassMat
    );
    neck.position.y = CONFIG.bottle.height * 0.45;
    group.add(neck);
    
    const capMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.gold, metalness: 0.9, roughness: 0.15 });
    const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(CONFIG.bottle.radius * 0.4, CONFIG.bottle.radius * 0.45, CONFIG.bottle.height * 0.25, CONFIG.bottle.segments),
        capMat
    );
    cap.position.y = CONFIG.bottle.height * 0.6;
    cap.name = 'cap';
    group.add(cap);
    
    const atomizerMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
    const atomizer = new THREE.Mesh(
        new THREE.CylinderGeometry(CONFIG.bottle.radius * 0.15, CONFIG.bottle.radius * 0.2, CONFIG.bottle.height * 0.08, CONFIG.bottle.segments),
        atomizerMat
    );
    atomizer.position.y = CONFIG.bottle.height * 0.55;
    atomizer.name = 'atomizer';
    group.add(atomizer);
    
    const liquidMat = new THREE.MeshPhysicalMaterial({
        color: CONFIG.colors.gold, metalness: 0.2, roughness: 0.1,
        transmission: 0.6, ior: 1.4, thickness: 0.3
    });
    const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(CONFIG.bottle.radius * 0.85, CONFIG.bottle.radius * 0.8, CONFIG.bottle.height * 0.5, CONFIG.bottle.segments),
        liquidMat
    );
    liquid.position.y = CONFIG.bottle.height * 0.1;
    liquid.name = 'liquid';
    group.add(liquid);
    
    return { group, cap, atomizer, liquid };
}

function createParticles() {
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(CONFIG.particles.count * CONFIG.mobile.particleMultiplier) : CONFIG.particles.count;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const palette = [new THREE.Color(CONFIG.colors.gold), new THREE.Color(0xffaa88), new THREE.Color(0xffddaa), new THREE.Color(0xcc88ff)];
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * CONFIG.particles.spread;
        positions[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.particles.spread;
        positions[i * 3 + 2] = (Math.random() - 0.5) * CONFIG.particles.spread;
        const c = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        sizes[i] = Math.random() * CONFIG.particles.size + CONFIG.particles.size * 0.3;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const mat = new THREE.ShaderMaterial({
        vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float uTime;
            void main() { vColor = color; vec3 p = position; p.y += sin(uTime * 0.5 + position.x * 2.0) * 0.1;
                vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = size * (300.0 / -mv.z);
                gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying vec3 vColor; void main() { float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard; gl_FragColor = vec4(vColor, (1.0 - smoothstep(0.3, 0.5, r)) * 0.8); }`,
        uniforms: { uTime: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true
    });
    
    const particles = new THREE.Points(geo, mat);
    particles.visible = false;
    return { particles, mat };
}

function setupScrollAnimations(camera, bottle, particles) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.scroll-container', start: 'top top', end: 'bottom bottom', scrub: 0.5 } });
    
    tl.to(bottle.cap.position, { y: bottle.cap.position.y + 3, rotationZ: 0.5, duration: 2, ease: 'power2.inOut' }, 'explode')
      .to(bottle.atomizer.position, { y: bottle.atomizer.position.y + 2, x: 1, duration: 2, ease: 'power2.inOut' }, 'explode')
      .to(bottle.liquid.position, { y: bottle.liquid.position.y + 1.5, duration: 2, ease: 'power2.inOut' }, 'explode')
      .to(camera.position, { z: 7, y: 1, duration: 2, ease: 'power2.inOut' }, 'explode')
      
      .to(bottle.group.scale, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power2.in' }, 'dissolve')
      .to(particles.mat, { opacity: 1, duration: 0.5 }, 'dissolve+=0.5')
      .call(() => { particles.particles.visible = true; })
      .to(camera.position, { z: 4, duration: 2, ease: 'power1.inOut' }, 'flyThrough')
      .to(particles.particles.rotation, { y: Math.PI * 2, duration: 3 }, 'flyThrough')
      
      .to(particles.mat, { opacity: 0, duration: 0.5 }, 'reassemble')
      .call(() => { particles.particles.visible = false; })
      .to(bottle.group.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: 'elastic.out(1, 0.5)' }, 'reassemble')
      .to(bottle.cap.position, { y: CONFIG.bottle.height * 0.6, x: 0, rotationZ: 0, duration: 1.5, ease: 'power2.out' }, 'reassemble')
      .to(bottle.atomizer.position, { y: CONFIG.bottle.height * 0.55, x: 0, duration: 1.5, ease: 'power2.out' }, 'reassemble')
      .to(bottle.liquid.position, { y: CONFIG.bottle.height * 0.1, duration: 1.5, ease: 'power2.out' }, 'reassemble')
      
      .to(camera.position, { z: 3, y: 0, duration: 2, ease: 'power2.inOut' });
    
    return tl;
}

function animateHTML() {
    gsap.to('.hero-section .headline', { scrollTrigger: { trigger: '.hero-section', start: 'top center', toggleActions: 'play none none reverse' }, opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' });
    gsap.utils.toArray('.info-card').forEach((card, i) => {
        gsap.to(card, { scrollTrigger: { trigger: '.exploded-section', start: 'top center', toggleActions: 'play none none reverse' }, opacity: 1, x: 0, duration: 1.2, delay: i * 0.2, ease: 'power3.out' });
    });
    gsap.to('.nebula-section .center-text', { scrollTrigger: { trigger: '.nebula-section', start: 'top center', toggleActions: 'play none none reverse' }, opacity: 1, duration: 1.5, ease: 'power3.out' });
    gsap.utils.toArray('.bento-item').forEach((item, i) => {
        gsap.to(item, { scrollTrigger: { trigger: '.alchemist-section', start: 'top center', toggleActions: 'play none none reverse' }, opacity: 1, y: 0, duration: 0.8, delay: i * 0.1, ease: 'power3.out' });
    });
    gsap.to('.footer-content', { scrollTrigger: { trigger: '.footer-section', start: 'top center', toggleActions: 'play none none reverse' }, opacity: 1, duration: 1.5, ease: 'power3.out' });
}

function setupStringInteraction() {
    document.querySelectorAll('.bento-item.interactive').forEach(el => {
        const note = parseFloat(el.dataset.stringNote) || 220;
        el.querySelectorAll('path, circle').forEach(path => {
            path.addEventListener('mouseenter', () => {
                const s = { amp: 25, speed: 15 };
                gsap.killTweensOf(s);
                gsap.to(s, { amp: 0, speed: 0, duration: 1.2, ease: 'expo.out' });
                synth.pluck(note, 0.6);
            });
        });
        el.addEventListener('click', () => synth.pluck(note, 0.8));
    });
}

function disposeMesh(mesh) {
    if (!mesh) return;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => { Object.values(m).forEach(p => { if (p && p.isTexture) { if (p.source?.data?.close) p.source.data.close(); p.dispose(); } }); m.dispose(); });
    }
    if (mesh.parent) mesh.parent.remove(mesh);
}

async function init() {
    console.log('🌟 L\'Éther Alchimique - Initializing...');
    const canvas = document.getElementById('webgl-canvas');
    const renderer = createRenderer(canvas);
    const scene = createScene();
    const camera = createCamera();
    setupLighting(scene);
    const bottle = createPerfumeBottle();
    scene.add(bottle.group);
    const particles = createParticles();
    scene.add(particles.particles);
    
    window.addEventListener('mousemove', e => {
        state.prevMouse.copy(state.mouse);
        state.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        state.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, smoothTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    
    setupScrollAnimations(camera, bottle, particles);
    animateHTML();
    setupStringInteraction();
    
    setTimeout(() => document.querySelector('.loading-screen').classList.add('hidden'), 1000);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.mobile.pixelRatio));
    });
    
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        state.time = clock.getElapsedTime();
        if (particles.mat.uniforms) particles.mat.uniforms.uTime.value = state.time;
        bottle.group.rotation.y += state.mouse.x * 0.002;
        bottle.group.rotation.x += state.mouse.y * 0.001;
        renderer.render(scene, camera);
    }
    animate();
    
    console.log('✓ Experience ready');
    
    window.addEventListener('beforeunload', () => {
        disposeMesh(bottle.group);
        disposeMesh(particles.particles);
        renderer.dispose();
        lenis.destroy();
    });
}

init().catch(console.error);
