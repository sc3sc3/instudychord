// CVD simulation (Machado 2009, severity 1.0) + CIEDE2000 pairwise distance.
export const MATS = {
  normal: [[1,0,0],[0,1,0],[0,0,1]],
  protan: [[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
  deutan: [[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
  tritan: [[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]],
};
const hex = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16) / 255);
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const gam = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.max(c, 0) ** (1/2.4) - 0.055;
const mul = (m, v) => m.map(r => r[0]*v[0] + r[1]*v[1] + r[2]*v[2]);
export function simulate(h, type) { const l = hex(h).map(lin); return mul(MATS[type], l).map(x => Math.min(1, Math.max(0, x))); }
export const luminance = l => 0.2126*l[0] + 0.7152*l[1] + 0.0722*l[2];
export function lab(l) {
  const [r,g,b] = l;
  const X = (0.4124564*r + 0.3575761*g + 0.1804375*b) / 0.95047, Y = 0.2126729*r + 0.7151522*g + 0.0721750*b, Z = (0.0193339*r + 0.1191920*g + 0.9503041*b) / 1.08883;
  const f = t => t > 216/24389 ? Math.cbrt(t) : (24389/27*t + 16) / 116;
  return [116*f(Y) - 16, 500*(f(X) - f(Y)), 200*(f(Y) - f(Z))];
}
export function de2000(a, b) {
  const [L1,a1,b1] = a, [L2,a2,b2] = b, rad = Math.PI/180, deg = 180/Math.PI;
  const C1 = Math.hypot(a1,b1), C2 = Math.hypot(a2,b2), Cb = (C1+C2)/2;
  const G = 0.5*(1 - Math.sqrt(Cb**7/(Cb**7 + 25**7)));
  const a1p = (1+G)*a1, a2p = (1+G)*a2, C1p = Math.hypot(a1p,b1), C2p = Math.hypot(a2p,b2);
  const h1 = (Math.atan2(b1,a1p)*deg + 360) % 360, h2 = (Math.atan2(b2,a2p)*deg + 360) % 360;
  const dL = L2-L1, dC = C2p-C1p; let dh = h2-h1; if (C1p*C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2*Math.sqrt(C1p*C2p)*Math.sin(dh*rad/2), Lb = (L1+L2)/2, Cbp = (C1p+C2p)/2;
  let hb = h1+h2; if (C1p*C2p === 0) hb = h1+h2; else if (Math.abs(h1-h2) > 180) hb += (h1+h2 < 360 ? 360 : -360); hb /= 2;
  const T = 1 - 0.17*Math.cos((hb-30)*rad) + 0.24*Math.cos(2*hb*rad) + 0.32*Math.cos((3*hb+6)*rad) - 0.20*Math.cos((4*hb-63)*rad);
  const dTh = 30*Math.exp(-(((hb-275)/25)**2)), Rc = 2*Math.sqrt(Cbp**7/(Cbp**7 + 25**7));
  const Sl = 1 + 0.015*(Lb-50)**2/Math.sqrt(20 + (Lb-50)**2), Sc = 1 + 0.045*Cbp, Sh = 1 + 0.015*Cbp*T, Rt = -Math.sin(2*dTh*rad)*Rc;
  return Math.sqrt((dL/Sl)**2 + (dC/Sc)**2 + (dH/Sh)**2 + Rt*(dC/Sc)*(dH/Sh));
}
// min pairwise distance of a palette (object role->hex) under each vision type
export function report(pal) {
  const roles = Object.keys(pal), out = {};
  for (const type of Object.keys(MATS)) {
    let min = Infinity, pair = '';
    for (let i = 0; i < roles.length; i++) for (let j = i+1; j < roles.length; j++) {
      const d = de2000(lab(simulate(pal[roles[i]], type)), lab(simulate(pal[roles[j]], type)));
      if (d < min) { min = d; pair = roles[i] + '/' + roles[j]; }
    }
    out[type] = { min: +min.toFixed(1), pair };
  }
  return out;
}
