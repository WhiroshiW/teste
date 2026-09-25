// ============================================================
// ECOS DO VAZIO - Pós-processamento PS1
// Renderiza a cena em baixa resolução e aplica:
// dithering Bayer, cor 15-bit, scanlines, vinheta, ruído,
// dano (vermelho), fade, flash branco e tremor de câmera.
// Também aplica "vertex snap" nos materiais (wobble de PS1).
// ============================================================

const POST_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const POST_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tD;
uniform float uTime;
uniform float uDamage;
uniform float uFade;
uniform float uWhite;
uniform vec2 uShake;
uniform float uCrt;
uniform float uFlash;
uniform float uBrightness;
uniform float uFilter;

float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int idx = x + y * 4;
  // matriz Bayer 4x4 desenrolada
  if (idx == 0) return 0.0/16.0; if (idx == 1) return 8.0/16.0;
  if (idx == 2) return 2.0/16.0; if (idx == 3) return 10.0/16.0;
  if (idx == 4) return 12.0/16.0; if (idx == 5) return 4.0/16.0;
  if (idx == 6) return 14.0/16.0; if (idx == 7) return 6.0/16.0;
  if (idx == 8) return 3.0/16.0; if (idx == 9) return 11.0/16.0;
  if (idx == 10) return 1.0/16.0; if (idx == 11) return 9.0/16.0;
  if (idx == 12) return 15.0/16.0; if (idx == 13) return 7.0/16.0;
  if (idx == 14) return 13.0/16.0;
  return 5.0/16.0;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv + uShake;
  vec3 col = texture2D(tD, uv).rgb;

  // ruído sutil de fita
  float n = hash(vUv * vec2(320.0, 180.0) + fract(uTime) * 7.0);
  col += (n - 0.5) * 0.045;

  // dithering ordenado (falso banding suave)
  vec2 px = vUv * vec2(320.0, 180.0);
  col += (bayer(px) - 0.5) * 0.06;

  // quantização 15-bit (PS1)
  col = floor(col * 31.0 + 0.5) / 31.0;

  // ajuste de brilho / visibilidade
  col *= max(0.5, uBrightness);

  // filtros retrô (loja de pontos)
  if (uFilter > 1.5) { // sepia
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = vec3(gray * 1.18, gray * 0.95, gray * 0.70);
  } else if (uFilter > 0.5) { // vhs
    float track = sin(vUv.y * 25.0 + uTime * 6.0) * 0.06;
    col.r += track;
    col.b -= track * 0.7;
  }

  // scanlines + vinheta (CRT)
  if (uCrt > 0.5) {
    col *= 0.94 + 0.06 * sin(vUv.y * 180.0 * 3.14159);
    vec2 d = vUv - 0.5;
    col *= 1.0 - dot(d, d) * 0.45;
    //_grade RGB sutil
    col.r *= 0.98 + 0.02 * sin(vUv.x * 320.0 * 3.14159);
    col.b *= 0.98 + 0.02 * sin(vUv.x * 320.0 * 3.14159 + 2.0);
  } else {
    vec2 d = vUv - 0.5;
    col *= 1.0 - dot(d, d) * 0.25;
  }

  // flash de clarão (relâmpago/tiro)
  col += vec3(uFlash);

  // dano: bordas vermelhas pulsantes
  if (uDamage > 0.003) {
    vec2 d = vUv - 0.5;
    float m = smoothstep(0.15, 0.75, length(d) * (1.2 + 0.3 * sin(uTime * 9.0)));
    col = mix(col, vec3(0.55, 0.02, 0.02), m * clamp(uDamage, 0.0, 1.0));
  }

  // fades
  col = mix(col, vec3(0.0), clamp(uFade, 0.0, 1.0));
  col = mix(col, vec3(1.0), clamp(uWhite, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}`;

export function createPSX(THREE, renderer) {
  let rtW = 320, rtH = 180;
  let rt = new THREE.WebGLRenderTarget(rtW, rtH, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
  });

  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    tD: { value: rt.texture },
    uTime: { value: 0 },
    uDamage: { value: 0 },
    uFade: { value: 1 },
    uWhite: { value: 0 },
    uShake: { value: new THREE.Vector2(0, 0) },
    uCrt: { value: 1 },
    uFlash: { value: 0 },
    uBrightness: { value: 1.55 }, // Brilho calibrado para excelente visibilidade
    uFilter: { value: 0 },
  };
  const postMat = new THREE.ShaderMaterial({
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
  quad.frustumCulled = false;
  postScene.add(quad);

  let shakeAmp = 0;
  let aspect = 16 / 9;
  let high = false;
  function fit() {
    const h = high ? 270 : 180;
    const w = Math.max(240, Math.min(640, Math.round(h * aspect)));
    rt.setSize(w, h);
    return w / h;
  }

  function snapMaterial(mat) {
    if (!mat || mat.userData.psxSnapped) return;
    mat.userData.psxSnapped = true;
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        if (gl_Position.w > 0.001) {
          vec4 p = gl_Position;
          p.xyz /= p.w;
          vec2 res = vec2(160.0, 90.0);
          p.xy = floor(p.xy * res) / res;
          p.xyz *= p.w;
          gl_Position = p;
        }`
      );
    };
    mat.customProgramCacheKey = () => 'psx-snap-' + (mat.map ? 'map' : 'nomap') + '-' + mat.type;
    mat.needsUpdate = true;
  }

  return {
    render(scene, camera, dt) {
      uniforms.uTime.value += dt;
      // tremor residual
      if (shakeAmp > 0.0005) {
        uniforms.uShake.value.set(
          (Math.random() - 0.5) * shakeAmp,
          (Math.random() - 0.5) * shakeAmp
        );
        shakeAmp *= Math.pow(0.02, dt); // decaimento rápido
      } else {
        uniforms.uShake.value.set(0, 0);
      }
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    },
    snapScene(scene) {
      scene.traverse((o) => {
        if (o.isMesh && o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            if (m.isMeshLambertMaterial || m.isMeshBasicMaterial || m.isMeshStandardMaterial) {
              snapMaterial(m);
            }
          });
        }
      });
    },
    shake(amp) { shakeAmp = Math.min(0.05, shakeAmp + amp); },
    setDamage(v) { uniforms.uDamage.value = v; },
    setFade(v) { uniforms.uFade.value = v; },
    setWhite(v) { uniforms.uWhite.value = v; },
    setFlash(v) { uniforms.uFlash.value = v; },
    setBrightness(v) { uniforms.uBrightness.value = v; },
    setFilter(v) { uniforms.uFilter.value = v; },
    setCrt(b) { uniforms.uCrt.value = b ? 1 : 0; },
    setQuality(h) {
      high = h;
      return fit();
    },
    fitAspect(a) {
      aspect = Math.max(0.5, Math.min(3, a));
      return fit();
    },
  };
}
