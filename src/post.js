// 自包含后处理：亮度提取 Bloom + 暗角 Vignette + ACES 色调映射 + sRGB 输出。
// 无 CDN / 无 examples/jsm 依赖，仅用 three.js 渲染目标 + 全屏四边形。
import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT_FRAG = `
uniform sampler2D tDiffuse;
uniform float threshold;
uniform float soft;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  float k = smoothstep(threshold, threshold + soft, l);
  gl_FragColor = vec4(c.rgb * k, 1.0);
}`;

const BLUR_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 texel;
uniform vec2 dir;
varying vec2 vUv;
void main(){
  vec2 off = texel * dir;
  vec4 sum = texture2D(tDiffuse, vUv) * 0.227027;
  sum += texture2D(tDiffuse, vUv + off * 1.3846154) * 0.3162162;
  sum += texture2D(tDiffuse, vUv - off * 1.3846154) * 0.3162162;
  sum += texture2D(tDiffuse, vUv + off * 3.2307692) * 0.0702703;
  sum += texture2D(tDiffuse, vUv - off * 3.2307692) * 0.0702703;
  gl_FragColor = sum;
}`;

const FINAL_FRAG = `
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform float bloomStrength;
uniform float vignette;
uniform float exposure;
varying vec2 vUv;

vec3 ACESFilm(vec3 x){
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
}
vec3 linearTosRGB(vec3 c){
  return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(vec3(0.0031308), c));
}
void main(){
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  color += bloom * bloomStrength;
  color = ACESFilm(color * exposure);
  vec2 uv = vUv - 0.5;
  float d = length(uv);
  color *= 1.0 - vignette * smoothstep(0.25, 0.9, d);
  gl_FragColor = vec4(linearTosRGB(color), 1.0);
}`;

export function createPost(renderer, scene, camera) {
  // 后处理统一负责色调映射与色彩空间转换，渲染器自身关闭。
  renderer.toneMapping = THREE.NoToneMapping;

  const buf = new THREE.Vector2();
  renderer.getDrawingBufferSize(buf);
  const w = buf.x, h = buf.y;

  function makeTarget(w, h, depth) {
    const t = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: depth,
      stencilBuffer: false,
    });
    t.texture.generateMipmaps = false;
    return t;
  }

  const rtScene = makeTarget(w, h, true);
  const bw = Math.max(1, w >> 1), bh = Math.max(1, h >> 1);
  const rtA = makeTarget(bw, bh, false);
  const rtB = makeTarget(bw, bh, false);

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const brightMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, threshold: { value: 0.62 }, soft: { value: 0.4 } },
    vertexShader: VERT, fragmentShader: BRIGHT_FRAG,
    depthTest: false, depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      texel: { value: new THREE.Vector2(1 / bw, 1 / bh) },
      dir: { value: new THREE.Vector2(1, 0) },
    },
    vertexShader: VERT, fragmentShader: BLUR_FRAG,
    depthTest: false, depthWrite: false,
  });
  const finalMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tBloom: { value: null },
      bloomStrength: { value: 0.4 },
      vignette: { value: 0.55 },
      exposure: { value: 0.95 },
    },
    vertexShader: VERT, fragmentShader: FINAL_FRAG,
    depthTest: false, depthWrite: false,
  });

  function render() {
    renderer.setRenderTarget(rtScene);
    renderer.render(scene, camera);

    brightMat.uniforms.tDiffuse.value = rtScene.texture;
    quad.material = brightMat;
    renderer.setRenderTarget(rtA);
    renderer.render(quadScene, quadCam);

    blurMat.uniforms.tDiffuse.value = rtA.texture;
    blurMat.uniforms.dir.value.set(1, 0);
    quad.material = blurMat;
    renderer.setRenderTarget(rtB);
    renderer.render(quadScene, quadCam);

    blurMat.uniforms.tDiffuse.value = rtB.texture;
    blurMat.uniforms.dir.value.set(0, 1);
    renderer.setRenderTarget(rtA);
    renderer.render(quadScene, quadCam);

    finalMat.uniforms.tDiffuse.value = rtScene.texture;
    finalMat.uniforms.tBloom.value = rtA.texture;
    quad.material = finalMat;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }

  function resize() {
    renderer.getDrawingBufferSize(buf);
    const w2 = buf.x, h2 = buf.y;
    rtScene.setSize(w2, h2);
    const b2 = Math.max(1, w2 >> 1), bh2 = Math.max(1, h2 >> 1);
    rtA.setSize(b2, bh2);
    rtB.setSize(b2, bh2);
    blurMat.uniforms.texel.value.set(1 / b2, 1 / bh2);
  }

  return { render, resize };
}
