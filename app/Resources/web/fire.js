'use strict';

// Fire for the "on fire" moments (five hours of work in a day), drawn like a game's on-fire effect: a fragment shader
// of crisp flame tongues rising from a canvas's edges, red-orange behind and yellow-white in front, with embers flying
// up. The leaderboard and the friends list light a burning card with it, flames rising from its bottom behind its
// text; the notices panel lights the screen's edges for a few seconds.
window.Fire = (() => {
  const VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAGMENT = `
precision mediump float;
uniform vec2 res;
uniform vec3 reach;
uniform float t, k, scale;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.1 + 13.1;
    a *= 0.5;
  }
  return v;
}
// A row of flame tongues for a distance d from the burning edge (0 there, 1 at its reach): tall shapes rising and
// wavering, above 0 where they burn.
float tongues(vec2 q, float d, float speed) {
  vec2 p = vec2(q.x + sin(q.y * 0.8 - t * 6.0) * 0.1, q.y * 0.42 - t * speed);
  float n = fbm(p + vec2(fbm(p * 0.7 + t * 0.5) * 0.9, 0.0));
  return n * 1.5 - d - 0.05;
}
void main() {
  vec2 px = gl_FragCoord.xy;
  float d = 9.0;
  if (reach.x > 0.0) d = min(d, px.y / reach.x);
  if (reach.y > 0.0) d = min(d, min(px.x, res.x - px.x) / reach.y);
  if (reach.z > 0.0) d = min(d, (res.y - px.y) / reach.z);
  if (d > 1.5) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec2 q = px / scale;
  float fade = (1.0 - k) * 0.9;
  // Two layers, drawn like a game's on-fire effect: crisp-edged red-orange tongues behind, yellow-white ones in front.
  float back = tongues(q, d, 2.7) - fade;
  float front = tongues(q * 1.3 + 7.3, d * 1.5, 3.5) - fade;
  float aBack = smoothstep(0.0, 0.06, back);
  float aFront = smoothstep(0.0, 0.06, front);
  vec3 c = mix(vec3(0.92, 0.14, 0.0), vec3(1.0, 0.47, 0.02), smoothstep(0.0, 0.45, back));
  c = mix(c, mix(vec3(1.0, 0.64, 0.06), vec3(1.0, 0.96, 0.74), smoothstep(0.05, 0.5, front)), aFront);
  float a = max(aBack * 0.9, aFront);
  // A hot line along the burning edge.
  float base = smoothstep(0.22, 0.0, d) * k;
  c = mix(c, vec3(1.0, 0.82, 0.4), base * (1.0 - aFront) * 0.6);
  a = max(a, base * 0.75);
  // Embers rising past the flames, fading as they go.
  vec2 cell = vec2(px.x, px.y - t * scale * 2.4) / (scale * 0.85);
  vec2 id = floor(cell);
  vec2 off = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
  float ember = step(0.88, hash(id)) * smoothstep(0.13, 0.0, length(fract(cell) - 0.5 + off * 0.6)) * clamp(1.5 - d, 0.0, 1.0) * k;
  c = mix(c, vec3(1.0, 0.85, 0.45), ember);
  a = max(a, ember);
  a *= k;
  gl_FragColor = vec4(c * a, a);
}`;

  // Lights `canvas` until it leaves the page or the returned stop is called. reach: how far flames rise from the
  // bottom, the sides and the top, in CSS px (0: that edge doesn't burn), or a function giving them each frame;
  // scale: the size of the flames' detail (CSS px); life: ms until it has died down (0: it burns on); res: canvas
  // pixels per CSS px.
  function burn(canvas, { reach, scale, life = 0, res = Math.min(2, devicePixelRatio || 1) }) {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return () => {};
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return () => {};
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const u = (name) => gl.getUniformLocation(prog, name);
    const uRes = u('res'), uReach = u('reach'), uT = u('t'), uK = u('k'), uScale = u('scale');
    // Each fire starts somewhere else in the noise, so two cards don't burn alike.
    const seed = Math.random() * 100;
    const start = performance.now();
    let raf = 0, stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    };
    const frame = (now) => {
      if (!canvas.isConnected) return stop();
      const w = Math.max(1, Math.round(canvas.clientWidth * res)), h = Math.max(1, Math.round(canvas.clientHeight * res));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ms = now - start;
      // Catches in 0.6 s; with a life, dies down over its last 1.4 s.
      const k = Math.min(1, ms / 600) * (life ? Math.max(0, Math.min(1, (life - ms) / 1400)) : 1);
      const r = typeof reach === 'function' ? reach() : reach;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, w, h);
      gl.uniform3f(uReach, r[0] * res, r[1] * res, r[2] * res);
      gl.uniform1f(uT, seed + ms / 1000);
      gl.uniform1f(uK, k);
      gl.uniform1f(uScale, scale * res);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (life && ms >= life) return stop();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return stop;
  }

  return { burn };
})();
