/* THE INK — signature effect.
   revealPlate(url): a WebGL "ink-in-water" dissolve when a plate opens in the lightbox.
   Degrades to a plain image handoff with no WebGL or reduced motion. */

const G = window.gsap;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── WebGL ink-in-water reveal (lightbox) ───────────────────── */
const VERT = "attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.,1.);}";
const FRAG = `precision mediump float;
varying vec2 vUv;uniform sampler2D uTex;uniform float uProgress;uniform float uTime;uniform vec2 uCanvas;uniform vec2 uImg;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}
void main(){
  float ca=uCanvas.x/uCanvas.y, ia=uImg.x/uImg.y;
  vec2 s = ca>ia ? vec2(ia/ca,1.0) : vec2(1.0,ca/ia);
  vec2 uv = (vUv-0.5)/s + 0.5;
  float p = clamp(uProgress,0.0,1.0);
  float flow = 1.0 - p;
  vec2 dir = vec2(fbm(uv*3.5 + uTime*0.06 + 1.7), fbm(uv*3.5 - uTime*0.05 + 9.1)) - 0.5;
  vec2 duv = uv + dir * 0.30 * flow;
  if(duv.x<0.0||duv.x>1.0||duv.y<0.0||duv.y>1.0){ gl_FragColor=vec4(0.0); return; }
  vec4 col = texture2D(uTex, duv);
  float n = fbm(uv*2.5 + 4.0);
  float front = smoothstep(n-0.35, n+0.15, p);            // soft ink front sweeping in
  float alpha = col.a * max(front, smoothstep(0.0,0.6,p)*0.15);
  float g = dot(col.rgb, vec3(0.299,0.587,0.114));
  vec3 rgb = mix(vec3(g*0.82), col.rgb, smoothstep(0.1,0.85,p)); // desaturated ink → true color
  gl_FragColor = vec4(rgb, alpha);
}`;

let plane = null;   // lazy singleton
function getPlane() {
  if (plane !== undefined && plane) return plane;
  const canvas = document.getElementById("lbFx");
  if (!canvas) { plane = null; return null; }
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true }) || canvas.getContext("experimental-webgl");
  if (!gl) { plane = null; return null; }
  try {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    plane = {
      canvas, gl, tex,
      u: { prog, uProgress: gl.getUniformLocation(prog, "uProgress"), uTime: gl.getUniformLocation(prog, "uTime"), uCanvas: gl.getUniformLocation(prog, "uCanvas"), uImg: gl.getUniformLocation(prog, "uImg"), uTex: gl.getUniformLocation(prog, "uTex") },
      raf: 0
    };
    gl.uniform1i(plane.u.uTex, 0);
  } catch (e) { plane = null; }
  return plane;
}

export function revealPlate(url) {
  if (reduced || !G) return;                       // plain image handoff
  const p = getPlane();
  if (!p) return;
  const box = document.querySelector(".lightbox__plate .mat__win") || p.canvas.parentElement;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = box.getBoundingClientRect();
  const w = Math.max(2, Math.round(rect.width)), h = Math.max(2, Math.round(rect.height));
  const { gl, u, canvas } = p;
  const imgEl = document.getElementById("lbImg");
  const img = new Image();
  img.decoding = "async"; img.crossOrigin = "anonymous";
  img.onload = () => {
    if (imgEl) imgEl.style.opacity = "0";               // hide the crisp img so the dissolve shows
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    canvas.style.opacity = ""; canvas.style.transition = "";
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, p.tex);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); } catch (e) { if (imgEl) imgEl.style.opacity = "1"; return; }
    gl.uniform2f(u.uCanvas, canvas.width, canvas.height);
    gl.uniform2f(u.uImg, img.naturalWidth || w, img.naturalHeight || h);
    canvas.classList.add("on");
    cancelAnimationFrame(p.raf);
    const DUR = 1250;                                    // ms — own clock, independent of GSAP
    let start = null, done = false;
    const finish = () => {
      if (done) return; done = true;
      if (imgEl) imgEl.style.opacity = "1";
      canvas.style.transition = "opacity .35s ease";
      requestAnimationFrame(() => { canvas.style.opacity = "0"; });
      setTimeout(() => { cancelAnimationFrame(p.raf); canvas.classList.remove("on"); canvas.style.opacity = ""; canvas.style.transition = ""; }, 400);
    };
    const draw = (ts) => {
      if (start === null) start = ts;
      const el = ts - start;
      let prog = Math.min(1, el / DUR); prog = 1 - Math.pow(1 - prog, 2);
      gl.uniform1f(u.uProgress, prog);
      gl.uniform1f(u.uTime, el / 1000);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (el >= DUR) { finish(); return; }
      p.raf = requestAnimationFrame(draw);
    };
    p.raf = requestAnimationFrame(draw);
  };
  img.onerror = () => { };
  img.src = url;
}
