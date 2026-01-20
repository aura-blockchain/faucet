var FaucetWallet = (() => {
  var Io = Object.create;
  var Fe = Object.defineProperty;
  var Co = Object.getOwnPropertyDescriptor;
  var _o = Object.getOwnPropertyNames;
  var To = Object.getPrototypeOf,
    Oo = Object.prototype.hasOwnProperty;
  var No = (e, t) => () => (
      t || e((t = { exports: {} }).exports, t), t.exports
    ),
    Ko = (e, t) => {
      for (var r in t) Fe(e, r, { get: t[r], enumerable: !0 });
    },
    Ro = (e, t, r, n) => {
      if ((t && typeof t == "object") || typeof t == "function")
        for (let o of _o(t))
          !Oo.call(e, o) &&
            o !== r &&
            Fe(e, o, {
              get: () => t[o],
              enumerable: !(n = Co(t, o)) || n.enumerable,
            });
      return e;
    };
  var Do = (e, t, r) => (
    (r = e != null ? Io(To(e)) : {}),
    Ro(
      t || !e || !e.__esModule
        ? Fe(r, "default", { value: e, enumerable: !0 })
        : r,
      e,
    )
  );
  var So = No((ne) => {
    "use strict";
    Object.defineProperty(ne, "__esModule", { value: !0 });
    ne.bech32m = ne.bech32 = void 0;
    var We = "qpzry9x8gf2tvdw0s3jn54khce6mua7l",
      ko = {};
    for (let e = 0; e < We.length; e++) {
      let t = We.charAt(e);
      ko[t] = e;
    }
    function re(e) {
      let t = e >> 25;
      return (
        ((e & 33554431) << 5) ^
        (-((t >> 0) & 1) & 996825010) ^
        (-((t >> 1) & 1) & 642813549) ^
        (-((t >> 2) & 1) & 513874426) ^
        (-((t >> 3) & 1) & 1027748829) ^
        (-((t >> 4) & 1) & 705979059)
      );
    }
    function Ao(e) {
      let t = 1;
      for (let r = 0; r < e.length; ++r) {
        let n = e.charCodeAt(r);
        if (n < 33 || n > 126) return "Invalid prefix (" + e + ")";
        t = re(t) ^ (n >> 5);
      }
      t = re(t);
      for (let r = 0; r < e.length; ++r) {
        let n = e.charCodeAt(r);
        t = re(t) ^ (n & 31);
      }
      return t;
    }
    function Vr(e, t, r, n) {
      let o = 0,
        s = 0,
        i = (1 << r) - 1,
        c = [];
      for (let a = 0; a < e.length; ++a)
        for (o = (o << t) | e[a], s += t; s >= r; )
          (s -= r), c.push((o >> s) & i);
      if (n) s > 0 && c.push((o << (r - s)) & i);
      else {
        if (s >= t) return "Excess padding";
        if ((o << (r - s)) & i) return "Non-zero padding";
      }
      return c;
    }
    function ic(e) {
      return Vr(e, 8, 5, !0);
    }
    function cc(e) {
      let t = Vr(e, 5, 8, !1);
      if (Array.isArray(t)) return t;
    }
    function ac(e) {
      let t = Vr(e, 5, 8, !1);
      if (Array.isArray(t)) return t;
      throw new Error(t);
    }
    function Lo(e) {
      let t;
      e === "bech32" ? (t = 1) : (t = 734539939);
      function r(i, c, a) {
        if (((a = a || 90), i.length + 7 + c.length > a))
          throw new TypeError("Exceeds length limit");
        i = i.toLowerCase();
        let l = Ao(i);
        if (typeof l == "string") throw new Error(l);
        let u = i + "1";
        for (let f = 0; f < c.length; ++f) {
          let h = c[f];
          if (h >> 5) throw new Error("Non 5-bit word");
          (l = re(l) ^ h), (u += We.charAt(h));
        }
        for (let f = 0; f < 6; ++f) l = re(l);
        l ^= t;
        for (let f = 0; f < 6; ++f) {
          let h = (l >> ((5 - f) * 5)) & 31;
          u += We.charAt(h);
        }
        return u;
      }
      function n(i, c) {
        if (((c = c || 90), i.length < 8)) return i + " too short";
        if (i.length > c) return "Exceeds length limit";
        let a = i.toLowerCase(),
          l = i.toUpperCase();
        if (i !== a && i !== l) return "Mixed-case string " + i;
        i = a;
        let u = i.lastIndexOf("1");
        if (u === -1) return "No separator character for " + i;
        if (u === 0) return "Missing prefix for " + i;
        let f = i.slice(0, u),
          h = i.slice(u + 1);
        if (h.length < 6) return "Data too short";
        let p = Ao(f);
        if (typeof p == "string") return p;
        let y = [];
        for (let d = 0; d < h.length; ++d) {
          let b = h.charAt(d),
            g = ko[b];
          if (g === void 0) return "Unknown character " + b;
          (p = re(p) ^ g), !(d + 6 >= h.length) && y.push(g);
        }
        return p !== t ? "Invalid checksum for " + i : { prefix: f, words: y };
      }
      function o(i, c) {
        let a = n(i, c);
        if (typeof a == "object") return a;
      }
      function s(i, c) {
        let a = n(i, c);
        if (typeof a == "object") return a;
        throw new Error(a);
      }
      return {
        decodeUnsafe: o,
        decode: s,
        encode: r,
        toWords: ic,
        fromWordsUnsafe: cc,
        fromWords: ac,
      };
    }
    ne.bech32 = Lo("bech32");
    ne.bech32m = Lo("bech32m");
  });
  function ht(e) {
    if (!Number.isSafeInteger(e) || e < 0)
      throw new Error(`positive integer expected, not ${e}`);
  }
  function jo(e) {
    return (
      e instanceof Uint8Array ||
      (e != null && typeof e == "object" && e.constructor.name === "Uint8Array")
    );
  }
  function _t(e, ...t) {
    if (!jo(e)) throw new Error("Uint8Array expected");
    if (t.length > 0 && !t.includes(e.length))
      throw new Error(
        `Uint8Array expected of length ${t}, not of length=${e.length}`,
      );
  }
  function xe(e) {
    if (typeof e != "function" || typeof e.create != "function")
      throw new Error("Hash should be wrapped by utils.wrapConstructor");
    ht(e.outputLen), ht(e.blockLen);
  }
  function Pt(e, t = !0) {
    if (e.destroyed) throw new Error("Hash instance has been destroyed");
    if (t && e.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function Fr(e, t) {
    _t(e);
    let r = t.outputLen;
    if (e.length < r)
      throw new Error(
        `digestInto() expects output buffer of length at least ${r}`,
      );
  }
  var ye =
    typeof globalThis == "object" && "crypto" in globalThis
      ? globalThis.crypto
      : void 0;
  var Gt = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength),
    Q = (e, t) => (e << (32 - t)) | (e >>> t);
  var gc = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
  function qo(e) {
    if (typeof e != "string")
      throw new Error(`utf8ToBytes expected string, got ${typeof e}`);
    return new Uint8Array(new TextEncoder().encode(e));
  }
  function dt(e) {
    return typeof e == "string" && (e = qo(e)), _t(e), e;
  }
  var Vt = class {
      clone() {
        return this._cloneInto();
      }
    },
    $o = {}.toString;
  function Yr(e, t) {
    if (t !== void 0 && $o.call(t) !== "[object Object]")
      throw new Error("Options should be object or undefined");
    return Object.assign(e, t);
  }
  function ge(e) {
    let t = (n) => e().update(dt(n)).digest(),
      r = e();
    return (
      (t.outputLen = r.outputLen),
      (t.blockLen = r.blockLen),
      (t.create = () => e()),
      t
    );
  }
  function Xr(e = 32) {
    if (ye && typeof ye.getRandomValues == "function")
      return ye.getRandomValues(new Uint8Array(e));
    throw new Error("crypto.getRandomValues must be defined");
  }
  var me = class extends Vt {
      constructor(t, r) {
        super(), (this.finished = !1), (this.destroyed = !1), xe(t);
        let n = dt(r);
        if (((this.iHash = t.create()), typeof this.iHash.update != "function"))
          throw new Error(
            "Expected instance of class which extends utils.Hash",
          );
        (this.blockLen = this.iHash.blockLen),
          (this.outputLen = this.iHash.outputLen);
        let o = this.blockLen,
          s = new Uint8Array(o);
        s.set(n.length > o ? t.create().update(n).digest() : n);
        for (let i = 0; i < s.length; i++) s[i] ^= 54;
        this.iHash.update(s), (this.oHash = t.create());
        for (let i = 0; i < s.length; i++) s[i] ^= 106;
        this.oHash.update(s), s.fill(0);
      }
      update(t) {
        return Pt(this), this.iHash.update(t), this;
      }
      digestInto(t) {
        Pt(this),
          _t(t, this.outputLen),
          (this.finished = !0),
          this.iHash.digestInto(t),
          this.oHash.update(t),
          this.oHash.digestInto(t),
          this.destroy();
      }
      digest() {
        let t = new Uint8Array(this.oHash.outputLen);
        return this.digestInto(t), t;
      }
      _cloneInto(t) {
        t || (t = Object.create(Object.getPrototypeOf(this), {}));
        let {
          oHash: r,
          iHash: n,
          finished: o,
          destroyed: s,
          blockLen: i,
          outputLen: c,
        } = this;
        return (
          (t = t),
          (t.finished = o),
          (t.destroyed = s),
          (t.blockLen = i),
          (t.outputLen = c),
          (t.oHash = r._cloneInto(t.oHash)),
          (t.iHash = n._cloneInto(t.iHash)),
          t
        );
      }
      destroy() {
        (this.destroyed = !0), this.oHash.destroy(), this.iHash.destroy();
      }
    },
    Ye = (e, t, r) => new me(e, t).update(r).digest();
  Ye.create = (e, t) => new me(e, t);
  function Po(e, t, r, n) {
    xe(e);
    let o = Yr({ dkLen: 32, asyncTick: 10 }, n),
      { c: s, dkLen: i, asyncTick: c } = o;
    if ((ht(s), ht(i), ht(c), s < 1))
      throw new Error("PBKDF2: iterations (c) should be >= 1");
    let a = dt(t),
      l = dt(r),
      u = new Uint8Array(i),
      f = Ye.create(e, a),
      h = f._cloneInto().update(l);
    return { c: s, dkLen: i, asyncTick: c, DK: u, PRF: f, PRFSalt: h };
  }
  function Vo(e, t, r, n, o) {
    return e.destroy(), t.destroy(), n && n.destroy(), o.fill(0), r;
  }
  function Qr(e, t, r, n) {
    let { c: o, dkLen: s, DK: i, PRF: c, PRFSalt: a } = Po(e, t, r, n),
      l,
      u = new Uint8Array(4),
      f = Gt(u),
      h = new Uint8Array(c.outputLen);
    for (let p = 1, y = 0; y < s; p++, y += c.outputLen) {
      let d = i.subarray(y, y + c.outputLen);
      f.setInt32(0, p, !1),
        (l = a._cloneInto(l)).update(u).digestInto(h),
        d.set(h.subarray(0, d.length));
      for (let b = 1; b < o; b++) {
        c._cloneInto(l).update(h).digestInto(h);
        for (let g = 0; g < d.length; g++) d[g] ^= h[g];
      }
    }
    return Vo(c, a, i, l, h);
  }
  function Go(e, t, r, n) {
    if (typeof e.setBigUint64 == "function") return e.setBigUint64(t, r, n);
    let o = BigInt(32),
      s = BigInt(4294967295),
      i = Number((r >> o) & s),
      c = Number(r & s),
      a = n ? 4 : 0,
      l = n ? 0 : 4;
    e.setUint32(t + a, i, n), e.setUint32(t + l, c, n);
  }
  var Jr = (e, t, r) => (e & t) ^ (~e & r),
    tn = (e, t, r) => (e & t) ^ (e & r) ^ (t & r),
    zt = class extends Vt {
      constructor(t, r, n, o) {
        super(),
          (this.blockLen = t),
          (this.outputLen = r),
          (this.padOffset = n),
          (this.isLE = o),
          (this.finished = !1),
          (this.length = 0),
          (this.pos = 0),
          (this.destroyed = !1),
          (this.buffer = new Uint8Array(t)),
          (this.view = Gt(this.buffer));
      }
      update(t) {
        Pt(this);
        let { view: r, buffer: n, blockLen: o } = this;
        t = dt(t);
        let s = t.length;
        for (let i = 0; i < s; ) {
          let c = Math.min(o - this.pos, s - i);
          if (c === o) {
            let a = Gt(t);
            for (; o <= s - i; i += o) this.process(a, i);
            continue;
          }
          n.set(t.subarray(i, i + c), this.pos),
            (this.pos += c),
            (i += c),
            this.pos === o && (this.process(r, 0), (this.pos = 0));
        }
        return (this.length += t.length), this.roundClean(), this;
      }
      digestInto(t) {
        Pt(this), Fr(t, this), (this.finished = !0);
        let { buffer: r, view: n, blockLen: o, isLE: s } = this,
          { pos: i } = this;
        (r[i++] = 128),
          this.buffer.subarray(i).fill(0),
          this.padOffset > o - i && (this.process(n, 0), (i = 0));
        for (let f = i; f < o; f++) r[f] = 0;
        Go(n, o - 8, BigInt(this.length * 8), s), this.process(n, 0);
        let c = Gt(t),
          a = this.outputLen;
        if (a % 4)
          throw new Error("_sha2: outputLen should be aligned to 32bit");
        let l = a / 4,
          u = this.get();
        if (l > u.length) throw new Error("_sha2: outputLen bigger than state");
        for (let f = 0; f < l; f++) c.setUint32(4 * f, u[f], s);
      }
      digest() {
        let { buffer: t, outputLen: r } = this;
        this.digestInto(t);
        let n = t.slice(0, r);
        return this.destroy(), n;
      }
      _cloneInto(t) {
        t || (t = new this.constructor()), t.set(...this.get());
        let {
          blockLen: r,
          buffer: n,
          length: o,
          finished: s,
          destroyed: i,
          pos: c,
        } = this;
        return (
          (t.length = o),
          (t.pos = c),
          (t.finished = s),
          (t.destroyed = i),
          o % r && t.buffer.set(n),
          t
        );
      }
    };
  var zo = new Uint32Array([
      1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993,
      2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987,
      1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774,
      264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
      2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711,
      113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
      1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
      3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
      430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
      1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424,
      2428436474, 2756734187, 3204031479, 3329325298,
    ]),
    pt = new Uint32Array([
      1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924,
      528734635, 1541459225,
    ]),
    bt = new Uint32Array(64),
    Xe = class extends zt {
      constructor() {
        super(64, 32, 8, !1),
          (this.A = pt[0] | 0),
          (this.B = pt[1] | 0),
          (this.C = pt[2] | 0),
          (this.D = pt[3] | 0),
          (this.E = pt[4] | 0),
          (this.F = pt[5] | 0),
          (this.G = pt[6] | 0),
          (this.H = pt[7] | 0);
      }
      get() {
        let { A: t, B: r, C: n, D: o, E: s, F: i, G: c, H: a } = this;
        return [t, r, n, o, s, i, c, a];
      }
      set(t, r, n, o, s, i, c, a) {
        (this.A = t | 0),
          (this.B = r | 0),
          (this.C = n | 0),
          (this.D = o | 0),
          (this.E = s | 0),
          (this.F = i | 0),
          (this.G = c | 0),
          (this.H = a | 0);
      }
      process(t, r) {
        for (let f = 0; f < 16; f++, r += 4) bt[f] = t.getUint32(r, !1);
        for (let f = 16; f < 64; f++) {
          let h = bt[f - 15],
            p = bt[f - 2],
            y = Q(h, 7) ^ Q(h, 18) ^ (h >>> 3),
            d = Q(p, 17) ^ Q(p, 19) ^ (p >>> 10);
          bt[f] = (d + bt[f - 7] + y + bt[f - 16]) | 0;
        }
        let { A: n, B: o, C: s, D: i, E: c, F: a, G: l, H: u } = this;
        for (let f = 0; f < 64; f++) {
          let h = Q(c, 6) ^ Q(c, 11) ^ Q(c, 25),
            p = (u + h + Jr(c, a, l) + zo[f] + bt[f]) | 0,
            d = ((Q(n, 2) ^ Q(n, 13) ^ Q(n, 22)) + tn(n, o, s)) | 0;
          (u = l),
            (l = a),
            (a = c),
            (c = (i + p) | 0),
            (i = s),
            (s = o),
            (o = n),
            (n = (p + d) | 0);
        }
        (n = (n + this.A) | 0),
          (o = (o + this.B) | 0),
          (s = (s + this.C) | 0),
          (i = (i + this.D) | 0),
          (c = (c + this.E) | 0),
          (a = (a + this.F) | 0),
          (l = (l + this.G) | 0),
          (u = (u + this.H) | 0),
          this.set(n, o, s, i, c, a, l, u);
      }
      roundClean() {
        bt.fill(0);
      }
      destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
      }
    };
  var en = ge(() => new Xe());
  var we = BigInt(4294967295),
    Qe = BigInt(32);
  function rn(e, t = !1) {
    return t
      ? { h: Number(e & we), l: Number((e >> Qe) & we) }
      : { h: Number((e >> Qe) & we) | 0, l: Number(e & we) | 0 };
  }
  function Mo(e, t = !1) {
    let r = new Uint32Array(e.length),
      n = new Uint32Array(e.length);
    for (let o = 0; o < e.length; o++) {
      let { h: s, l: i } = rn(e[o], t);
      [r[o], n[o]] = [s, i];
    }
    return [r, n];
  }
  var Wo = (e, t) => (BigInt(e >>> 0) << Qe) | BigInt(t >>> 0),
    Zo = (e, t, r) => e >>> r,
    Fo = (e, t, r) => (e << (32 - r)) | (t >>> r),
    Yo = (e, t, r) => (e >>> r) | (t << (32 - r)),
    Xo = (e, t, r) => (e << (32 - r)) | (t >>> r),
    Qo = (e, t, r) => (e << (64 - r)) | (t >>> (r - 32)),
    Jo = (e, t, r) => (e >>> (r - 32)) | (t << (64 - r)),
    ts = (e, t) => t,
    es = (e, t) => e,
    rs = (e, t, r) => (e << r) | (t >>> (32 - r)),
    ns = (e, t, r) => (t << r) | (e >>> (32 - r)),
    os = (e, t, r) => (t << (r - 32)) | (e >>> (64 - r)),
    ss = (e, t, r) => (e << (r - 32)) | (t >>> (64 - r));
  function is(e, t, r, n) {
    let o = (t >>> 0) + (n >>> 0);
    return { h: (e + r + ((o / 2 ** 32) | 0)) | 0, l: o | 0 };
  }
  var cs = (e, t, r) => (e >>> 0) + (t >>> 0) + (r >>> 0),
    as = (e, t, r, n) => (t + r + n + ((e / 2 ** 32) | 0)) | 0,
    fs = (e, t, r, n) => (e >>> 0) + (t >>> 0) + (r >>> 0) + (n >>> 0),
    ls = (e, t, r, n, o) => (t + r + n + o + ((e / 2 ** 32) | 0)) | 0,
    us = (e, t, r, n, o) =>
      (e >>> 0) + (t >>> 0) + (r >>> 0) + (n >>> 0) + (o >>> 0),
    hs = (e, t, r, n, o, s) => (t + r + n + o + s + ((e / 2 ** 32) | 0)) | 0;
  var ds = {
      fromBig: rn,
      split: Mo,
      toBig: Wo,
      shrSH: Zo,
      shrSL: Fo,
      rotrSH: Yo,
      rotrSL: Xo,
      rotrBH: Qo,
      rotrBL: Jo,
      rotr32H: ts,
      rotr32L: es,
      rotlSH: rs,
      rotlSL: ns,
      rotlBH: os,
      rotlBL: ss,
      add: is,
      add3L: cs,
      add3H: as,
      add4L: fs,
      add4H: ls,
      add5H: hs,
      add5L: us,
    },
    H = ds;
  var [ps, bs] = H.split(
      [
        "0x428a2f98d728ae22",
        "0x7137449123ef65cd",
        "0xb5c0fbcfec4d3b2f",
        "0xe9b5dba58189dbbc",
        "0x3956c25bf348b538",
        "0x59f111f1b605d019",
        "0x923f82a4af194f9b",
        "0xab1c5ed5da6d8118",
        "0xd807aa98a3030242",
        "0x12835b0145706fbe",
        "0x243185be4ee4b28c",
        "0x550c7dc3d5ffb4e2",
        "0x72be5d74f27b896f",
        "0x80deb1fe3b1696b1",
        "0x9bdc06a725c71235",
        "0xc19bf174cf692694",
        "0xe49b69c19ef14ad2",
        "0xefbe4786384f25e3",
        "0x0fc19dc68b8cd5b5",
        "0x240ca1cc77ac9c65",
        "0x2de92c6f592b0275",
        "0x4a7484aa6ea6e483",
        "0x5cb0a9dcbd41fbd4",
        "0x76f988da831153b5",
        "0x983e5152ee66dfab",
        "0xa831c66d2db43210",
        "0xb00327c898fb213f",
        "0xbf597fc7beef0ee4",
        "0xc6e00bf33da88fc2",
        "0xd5a79147930aa725",
        "0x06ca6351e003826f",
        "0x142929670a0e6e70",
        "0x27b70a8546d22ffc",
        "0x2e1b21385c26c926",
        "0x4d2c6dfc5ac42aed",
        "0x53380d139d95b3df",
        "0x650a73548baf63de",
        "0x766a0abb3c77b2a8",
        "0x81c2c92e47edaee6",
        "0x92722c851482353b",
        "0xa2bfe8a14cf10364",
        "0xa81a664bbc423001",
        "0xc24b8b70d0f89791",
        "0xc76c51a30654be30",
        "0xd192e819d6ef5218",
        "0xd69906245565a910",
        "0xf40e35855771202a",
        "0x106aa07032bbd1b8",
        "0x19a4c116b8d2d0c8",
        "0x1e376c085141ab53",
        "0x2748774cdf8eeb99",
        "0x34b0bcb5e19b48a8",
        "0x391c0cb3c5c95a63",
        "0x4ed8aa4ae3418acb",
        "0x5b9cca4f7763e373",
        "0x682e6ff3d6b2b8a3",
        "0x748f82ee5defb2fc",
        "0x78a5636f43172f60",
        "0x84c87814a1f0ab72",
        "0x8cc702081a6439ec",
        "0x90befffa23631e28",
        "0xa4506cebde82bde9",
        "0xbef9a3f7b2c67915",
        "0xc67178f2e372532b",
        "0xca273eceea26619c",
        "0xd186b8c721c0c207",
        "0xeada7dd6cde0eb1e",
        "0xf57d4f7fee6ed178",
        "0x06f067aa72176fba",
        "0x0a637dc5a2c898a6",
        "0x113f9804bef90dae",
        "0x1b710b35131c471b",
        "0x28db77f523047d84",
        "0x32caab7b40c72493",
        "0x3c9ebe0a15c9bebc",
        "0x431d67c49c100d4c",
        "0x4cc5d4becb3e42b6",
        "0x597f299cfc657e2a",
        "0x5fcb6fab3ad6faec",
        "0x6c44198c4a475817",
      ].map((e) => BigInt(e)),
    ),
    xt = new Uint32Array(80),
    yt = new Uint32Array(80),
    Je = class extends zt {
      constructor() {
        super(128, 64, 16, !1),
          (this.Ah = 1779033703),
          (this.Al = -205731576),
          (this.Bh = -1150833019),
          (this.Bl = -2067093701),
          (this.Ch = 1013904242),
          (this.Cl = -23791573),
          (this.Dh = -1521486534),
          (this.Dl = 1595750129),
          (this.Eh = 1359893119),
          (this.El = -1377402159),
          (this.Fh = -1694144372),
          (this.Fl = 725511199),
          (this.Gh = 528734635),
          (this.Gl = -79577749),
          (this.Hh = 1541459225),
          (this.Hl = 327033209);
      }
      get() {
        let {
          Ah: t,
          Al: r,
          Bh: n,
          Bl: o,
          Ch: s,
          Cl: i,
          Dh: c,
          Dl: a,
          Eh: l,
          El: u,
          Fh: f,
          Fl: h,
          Gh: p,
          Gl: y,
          Hh: d,
          Hl: b,
        } = this;
        return [t, r, n, o, s, i, c, a, l, u, f, h, p, y, d, b];
      }
      set(t, r, n, o, s, i, c, a, l, u, f, h, p, y, d, b) {
        (this.Ah = t | 0),
          (this.Al = r | 0),
          (this.Bh = n | 0),
          (this.Bl = o | 0),
          (this.Ch = s | 0),
          (this.Cl = i | 0),
          (this.Dh = c | 0),
          (this.Dl = a | 0),
          (this.Eh = l | 0),
          (this.El = u | 0),
          (this.Fh = f | 0),
          (this.Fl = h | 0),
          (this.Gh = p | 0),
          (this.Gl = y | 0),
          (this.Hh = d | 0),
          (this.Hl = b | 0);
      }
      process(t, r) {
        for (let x = 0; x < 16; x++, r += 4)
          (xt[x] = t.getUint32(r)), (yt[x] = t.getUint32((r += 4)));
        for (let x = 16; x < 80; x++) {
          let L = xt[x - 15] | 0,
            E = yt[x - 15] | 0,
            v = H.rotrSH(L, E, 1) ^ H.rotrSH(L, E, 8) ^ H.shrSH(L, E, 7),
            S = H.rotrSL(L, E, 1) ^ H.rotrSL(L, E, 8) ^ H.shrSL(L, E, 7),
            k = xt[x - 2] | 0,
            T = yt[x - 2] | 0,
            _ = H.rotrSH(k, T, 19) ^ H.rotrBH(k, T, 61) ^ H.shrSH(k, T, 6),
            I = H.rotrSL(k, T, 19) ^ H.rotrBL(k, T, 61) ^ H.shrSL(k, T, 6),
            K = H.add4L(S, I, yt[x - 7], yt[x - 16]),
            D = H.add4H(K, v, _, xt[x - 7], xt[x - 16]);
          (xt[x] = D | 0), (yt[x] = K | 0);
        }
        let {
          Ah: n,
          Al: o,
          Bh: s,
          Bl: i,
          Ch: c,
          Cl: a,
          Dh: l,
          Dl: u,
          Eh: f,
          El: h,
          Fh: p,
          Fl: y,
          Gh: d,
          Gl: b,
          Hh: g,
          Hl: w,
        } = this;
        for (let x = 0; x < 80; x++) {
          let L = H.rotrSH(f, h, 14) ^ H.rotrSH(f, h, 18) ^ H.rotrBH(f, h, 41),
            E = H.rotrSL(f, h, 14) ^ H.rotrSL(f, h, 18) ^ H.rotrBL(f, h, 41),
            v = (f & p) ^ (~f & d),
            S = (h & y) ^ (~h & b),
            k = H.add5L(w, E, S, bs[x], yt[x]),
            T = H.add5H(k, g, L, v, ps[x], xt[x]),
            _ = k | 0,
            I = H.rotrSH(n, o, 28) ^ H.rotrBH(n, o, 34) ^ H.rotrBH(n, o, 39),
            K = H.rotrSL(n, o, 28) ^ H.rotrBL(n, o, 34) ^ H.rotrBL(n, o, 39),
            D = (n & s) ^ (n & c) ^ (s & c),
            Z = (o & i) ^ (o & a) ^ (i & a);
          (g = d | 0),
            (w = b | 0),
            (d = p | 0),
            (b = y | 0),
            (p = f | 0),
            (y = h | 0),
            ({ h: f, l: h } = H.add(l | 0, u | 0, T | 0, _ | 0)),
            (l = c | 0),
            (u = a | 0),
            (c = s | 0),
            (a = i | 0),
            (s = n | 0),
            (i = o | 0);
          let m = H.add3L(_, K, Z);
          (n = H.add3H(m, T, I, D)), (o = m | 0);
        }
        ({ h: n, l: o } = H.add(this.Ah | 0, this.Al | 0, n | 0, o | 0)),
          ({ h: s, l: i } = H.add(this.Bh | 0, this.Bl | 0, s | 0, i | 0)),
          ({ h: c, l: a } = H.add(this.Ch | 0, this.Cl | 0, c | 0, a | 0)),
          ({ h: l, l: u } = H.add(this.Dh | 0, this.Dl | 0, l | 0, u | 0)),
          ({ h: f, l: h } = H.add(this.Eh | 0, this.El | 0, f | 0, h | 0)),
          ({ h: p, l: y } = H.add(this.Fh | 0, this.Fl | 0, p | 0, y | 0)),
          ({ h: d, l: b } = H.add(this.Gh | 0, this.Gl | 0, d | 0, b | 0)),
          ({ h: g, l: w } = H.add(this.Hh | 0, this.Hl | 0, g | 0, w | 0)),
          this.set(n, o, s, i, c, a, l, u, f, h, p, y, d, b, g, w);
      }
      roundClean() {
        xt.fill(0), yt.fill(0);
      }
      destroy() {
        this.buffer.fill(0),
          this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      }
    };
  var nn = ge(() => new Je());
  function Tt(e) {
    if (!Number.isSafeInteger(e)) throw new Error(`Wrong integer: ${e}`);
  }
  function Ee(e) {
    return (
      e instanceof Uint8Array ||
      (e != null && typeof e == "object" && e.constructor.name === "Uint8Array")
    );
  }
  function rr(...e) {
    let t = (s) => s,
      r = (s, i) => (c) => s(i(c)),
      n = e.map((s) => s.encode).reduceRight(r, t),
      o = e.map((s) => s.decode).reduce(r, t);
    return { encode: n, decode: o };
  }
  function on(e) {
    return {
      encode: (t) => {
        if (!Array.isArray(t) || (t.length && typeof t[0] != "number"))
          throw new Error(
            "alphabet.encode input should be an array of numbers",
          );
        return t.map((r) => {
          if (r < 0 || r >= e.length)
            throw new Error(
              `Digit index outside alphabet: ${r} (alphabet: ${e.length})`,
            );
          return e[r];
        });
      },
      decode: (t) => {
        if (!Array.isArray(t) || (t.length && typeof t[0] != "string"))
          throw new Error("alphabet.decode input should be array of strings");
        return t.map((r) => {
          if (typeof r != "string")
            throw new Error(`alphabet.decode: not string element=${r}`);
          let n = e.indexOf(r);
          if (n === -1)
            throw new Error(`Unknown letter: "${r}". Allowed: ${e}`);
          return n;
        });
      },
    };
  }
  function sn(e = "") {
    if (typeof e != "string")
      throw new Error("join separator should be string");
    return {
      encode: (t) => {
        if (!Array.isArray(t) || (t.length && typeof t[0] != "string"))
          throw new Error("join.encode input should be array of strings");
        for (let r of t)
          if (typeof r != "string")
            throw new Error(`join.encode: non-string input=${r}`);
        return t.join(e);
      },
      decode: (t) => {
        if (typeof t != "string")
          throw new Error("join.decode input should be string");
        return t.split(e);
      },
    };
  }
  function xs(e, t = "=") {
    if (typeof t != "string") throw new Error("padding chr should be string");
    return {
      encode(r) {
        if (!Array.isArray(r) || (r.length && typeof r[0] != "string"))
          throw new Error("padding.encode input should be array of strings");
        for (let n of r)
          if (typeof n != "string")
            throw new Error(`padding.encode: non-string input=${n}`);
        for (; (r.length * e) % 8; ) r.push(t);
        return r;
      },
      decode(r) {
        if (!Array.isArray(r) || (r.length && typeof r[0] != "string"))
          throw new Error("padding.encode input should be array of strings");
        for (let o of r)
          if (typeof o != "string")
            throw new Error(`padding.decode: non-string input=${o}`);
        let n = r.length;
        if ((n * e) % 8)
          throw new Error(
            "Invalid padding: string should have whole number of bytes",
          );
        for (; n > 0 && r[n - 1] === t; n--)
          if (!(((n - 1) * e) % 8))
            throw new Error("Invalid padding: string has too much padding");
        return r.slice(0, n);
      },
    };
  }
  function tr(e, t, r) {
    if (t < 2)
      throw new Error(
        `convertRadix: wrong from=${t}, base cannot be less than 2`,
      );
    if (r < 2)
      throw new Error(
        `convertRadix: wrong to=${r}, base cannot be less than 2`,
      );
    if (!Array.isArray(e))
      throw new Error("convertRadix: data should be array");
    if (!e.length) return [];
    let n = 0,
      o = [],
      s = Array.from(e);
    for (
      s.forEach((i) => {
        if (i < 0 || i >= t) throw new Error(`Wrong integer: ${i}`);
      });
      ;

    ) {
      let i = 0,
        c = !0;
      for (let a = n; a < s.length; a++) {
        let l = s[a],
          u = t * i + l;
        if (!Number.isSafeInteger(u) || (t * i) / t !== i || u - l !== t * i)
          throw new Error("convertRadix: carry overflow");
        i = u % r;
        let f = Math.floor(u / r);
        if (((s[a] = f), !Number.isSafeInteger(f) || f * r + i !== u))
          throw new Error("convertRadix: carry overflow");
        if (c) f ? (c = !1) : (n = a);
        else continue;
      }
      if ((o.push(i), c)) break;
    }
    for (let i = 0; i < e.length - 1 && e[i] === 0; i++) o.push(0);
    return o.reverse();
  }
  var cn = (e, t) => (t ? cn(t, e % t) : e),
    ve = (e, t) => e + (t - cn(e, t));
  function er(e, t, r, n) {
    if (!Array.isArray(e))
      throw new Error("convertRadix2: data should be array");
    if (t <= 0 || t > 32) throw new Error(`convertRadix2: wrong from=${t}`);
    if (r <= 0 || r > 32) throw new Error(`convertRadix2: wrong to=${r}`);
    if (ve(t, r) > 32)
      throw new Error(
        `convertRadix2: carry overflow from=${t} to=${r} carryBits=${ve(t, r)}`,
      );
    let o = 0,
      s = 0,
      i = 2 ** r - 1,
      c = [];
    for (let a of e) {
      if (a >= 2 ** t)
        throw new Error(`convertRadix2: invalid data word=${a} from=${t}`);
      if (((o = (o << t) | a), s + t > 32))
        throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
      for (s += t; s >= r; s -= r) c.push(((o >> (s - r)) & i) >>> 0);
      o &= 2 ** s - 1;
    }
    if (((o = (o << (r - s)) & i), !n && s >= t))
      throw new Error("Excess padding");
    if (!n && o) throw new Error(`Non-zero padding: ${o}`);
    return n && s > 0 && c.push(o >>> 0), c;
  }
  function an(e) {
    return {
      encode: (t) => {
        if (!Ee(t)) throw new Error("radix.encode input should be Uint8Array");
        return tr(Array.from(t), 2 ** 8, e);
      },
      decode: (t) => {
        if (!Array.isArray(t) || (t.length && typeof t[0] != "number"))
          throw new Error("radix.decode input should be array of numbers");
        return Uint8Array.from(tr(t, e, 2 ** 8));
      },
    };
  }
  function ys(e, t = !1) {
    if (e <= 0 || e > 32) throw new Error("radix2: bits should be in (0..32]");
    if (ve(8, e) > 32 || ve(e, 8) > 32)
      throw new Error("radix2: carry overflow");
    return {
      encode: (r) => {
        if (!Ee(r)) throw new Error("radix2.encode input should be Uint8Array");
        return er(Array.from(r), 8, e, !t);
      },
      decode: (r) => {
        if (!Array.isArray(r) || (r.length && typeof r[0] != "number"))
          throw new Error("radix2.decode input should be array of numbers");
        return Uint8Array.from(er(r, e, 8, t));
      },
    };
  }
  function fn(e, t) {
    if (typeof t != "function")
      throw new Error("checksum fn should be function");
    return {
      encode(r) {
        if (!Ee(r))
          throw new Error("checksum.encode: input should be Uint8Array");
        let n = t(r).slice(0, e),
          o = new Uint8Array(r.length + e);
        return o.set(r), o.set(n, r.length), o;
      },
      decode(r) {
        if (!Ee(r))
          throw new Error("checksum.decode: input should be Uint8Array");
        let n = r.slice(0, -e),
          o = t(n).slice(0, e),
          s = r.slice(-e);
        for (let i = 0; i < e; i++)
          if (o[i] !== s[i]) throw new Error("Invalid checksum");
        return n;
      },
    };
  }
  var se = {
    alphabet: on,
    chain: rr,
    checksum: fn,
    convertRadix: tr,
    convertRadix2: er,
    radix: an,
    radix2: ys,
    join: sn,
    padding: xs,
  };
  var gs = (e) => rr(an(58), on(e), sn("")),
    ms = gs("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
  var ln = (e) =>
    rr(
      fn(4, (t) => e(e(t))),
      ms,
    );
  var ws = (e) => e[0] === "\u3042\u3044\u3053\u304F\u3057\u3093";
  function un(e) {
    if (typeof e != "string")
      throw new TypeError(`Invalid mnemonic type: ${typeof e}`);
    return e.normalize("NFKD");
  }
  function Es(e) {
    let t = un(e),
      r = t.split(" ");
    if (![12, 15, 18, 21, 24].includes(r.length))
      throw new Error("Invalid mnemonic");
    return { nfkd: t, words: r };
  }
  function vs(e) {
    _t(e, 16, 20, 24, 28, 32);
  }
  function hn(e, t = 128) {
    if ((ht(t), t % 32 !== 0 || t > 256))
      throw new TypeError("Invalid entropy");
    return ks(Xr(t / 8), e);
  }
  var Bs = (e) => {
    let t = 8 - e.length / 4;
    return new Uint8Array([(en(e)[0] >> t) << t]);
  };
  function As(e) {
    if (!Array.isArray(e) || e.length !== 2048 || typeof e[0] != "string")
      throw new Error("Wordlist: expected array of 2048 strings");
    return (
      e.forEach((t) => {
        if (typeof t != "string")
          throw new Error(`Wordlist: non-string element: ${t}`);
      }),
      se.chain(se.checksum(1, Bs), se.radix2(11, !0), se.alphabet(e))
    );
  }
  function ks(e, t) {
    return (
      vs(e),
      As(t)
        .encode(e)
        .join(ws(t) ? "\u3000" : " ")
    );
  }
  var Ls = (e) => un(`mnemonic${e}`);
  function dn(e, t = "") {
    return Qr(nn, Es(e).nfkd, Ls(t), { c: 2048, dkLen: 64 });
  }
  var pn = `abandon
ability
able
about
above
absent
absorb
abstract
absurd
abuse
access
accident
account
accuse
achieve
acid
acoustic
acquire
across
act
action
actor
actress
actual
adapt
add
addict
address
adjust
admit
adult
advance
advice
aerobic
affair
afford
afraid
again
age
agent
agree
ahead
aim
air
airport
aisle
alarm
album
alcohol
alert
alien
all
alley
allow
almost
alone
alpha
already
also
alter
always
amateur
amazing
among
amount
amused
analyst
anchor
ancient
anger
angle
angry
animal
ankle
announce
annual
another
answer
antenna
antique
anxiety
any
apart
apology
appear
apple
approve
april
arch
arctic
area
arena
argue
arm
armed
armor
army
around
arrange
arrest
arrive
arrow
art
artefact
artist
artwork
ask
aspect
assault
asset
assist
assume
asthma
athlete
atom
attack
attend
attitude
attract
auction
audit
august
aunt
author
auto
autumn
average
avocado
avoid
awake
aware
away
awesome
awful
awkward
axis
baby
bachelor
bacon
badge
bag
balance
balcony
ball
bamboo
banana
banner
bar
barely
bargain
barrel
base
basic
basket
battle
beach
bean
beauty
because
become
beef
before
begin
behave
behind
believe
below
belt
bench
benefit
best
betray
better
between
beyond
bicycle
bid
bike
bind
biology
bird
birth
bitter
black
blade
blame
blanket
blast
bleak
bless
blind
blood
blossom
blouse
blue
blur
blush
board
boat
body
boil
bomb
bone
bonus
book
boost
border
boring
borrow
boss
bottom
bounce
box
boy
bracket
brain
brand
brass
brave
bread
breeze
brick
bridge
brief
bright
bring
brisk
broccoli
broken
bronze
broom
brother
brown
brush
bubble
buddy
budget
buffalo
build
bulb
bulk
bullet
bundle
bunker
burden
burger
burst
bus
business
busy
butter
buyer
buzz
cabbage
cabin
cable
cactus
cage
cake
call
calm
camera
camp
can
canal
cancel
candy
cannon
canoe
canvas
canyon
capable
capital
captain
car
carbon
card
cargo
carpet
carry
cart
case
cash
casino
castle
casual
cat
catalog
catch
category
cattle
caught
cause
caution
cave
ceiling
celery
cement
census
century
cereal
certain
chair
chalk
champion
change
chaos
chapter
charge
chase
chat
cheap
check
cheese
chef
cherry
chest
chicken
chief
child
chimney
choice
choose
chronic
chuckle
chunk
churn
cigar
cinnamon
circle
citizen
city
civil
claim
clap
clarify
claw
clay
clean
clerk
clever
click
client
cliff
climb
clinic
clip
clock
clog
close
cloth
cloud
clown
club
clump
cluster
clutch
coach
coast
coconut
code
coffee
coil
coin
collect
color
column
combine
come
comfort
comic
common
company
concert
conduct
confirm
congress
connect
consider
control
convince
cook
cool
copper
copy
coral
core
corn
correct
cost
cotton
couch
country
couple
course
cousin
cover
coyote
crack
cradle
craft
cram
crane
crash
crater
crawl
crazy
cream
credit
creek
crew
cricket
crime
crisp
critic
crop
cross
crouch
crowd
crucial
cruel
cruise
crumble
crunch
crush
cry
crystal
cube
culture
cup
cupboard
curious
current
curtain
curve
cushion
custom
cute
cycle
dad
damage
damp
dance
danger
daring
dash
daughter
dawn
day
deal
debate
debris
decade
december
decide
decline
decorate
decrease
deer
defense
define
defy
degree
delay
deliver
demand
demise
denial
dentist
deny
depart
depend
deposit
depth
deputy
derive
describe
desert
design
desk
despair
destroy
detail
detect
develop
device
devote
diagram
dial
diamond
diary
dice
diesel
diet
differ
digital
dignity
dilemma
dinner
dinosaur
direct
dirt
disagree
discover
disease
dish
dismiss
disorder
display
distance
divert
divide
divorce
dizzy
doctor
document
dog
doll
dolphin
domain
donate
donkey
donor
door
dose
double
dove
draft
dragon
drama
drastic
draw
dream
dress
drift
drill
drink
drip
drive
drop
drum
dry
duck
dumb
dune
during
dust
dutch
duty
dwarf
dynamic
eager
eagle
early
earn
earth
easily
east
easy
echo
ecology
economy
edge
edit
educate
effort
egg
eight
either
elbow
elder
electric
elegant
element
elephant
elevator
elite
else
embark
embody
embrace
emerge
emotion
employ
empower
empty
enable
enact
end
endless
endorse
enemy
energy
enforce
engage
engine
enhance
enjoy
enlist
enough
enrich
enroll
ensure
enter
entire
entry
envelope
episode
equal
equip
era
erase
erode
erosion
error
erupt
escape
essay
essence
estate
eternal
ethics
evidence
evil
evoke
evolve
exact
example
excess
exchange
excite
exclude
excuse
execute
exercise
exhaust
exhibit
exile
exist
exit
exotic
expand
expect
expire
explain
expose
express
extend
extra
eye
eyebrow
fabric
face
faculty
fade
faint
faith
fall
false
fame
family
famous
fan
fancy
fantasy
farm
fashion
fat
fatal
father
fatigue
fault
favorite
feature
february
federal
fee
feed
feel
female
fence
festival
fetch
fever
few
fiber
fiction
field
figure
file
film
filter
final
find
fine
finger
finish
fire
firm
first
fiscal
fish
fit
fitness
fix
flag
flame
flash
flat
flavor
flee
flight
flip
float
flock
floor
flower
fluid
flush
fly
foam
focus
fog
foil
fold
follow
food
foot
force
forest
forget
fork
fortune
forum
forward
fossil
foster
found
fox
fragile
frame
frequent
fresh
friend
fringe
frog
front
frost
frown
frozen
fruit
fuel
fun
funny
furnace
fury
future
gadget
gain
galaxy
gallery
game
gap
garage
garbage
garden
garlic
garment
gas
gasp
gate
gather
gauge
gaze
general
genius
genre
gentle
genuine
gesture
ghost
giant
gift
giggle
ginger
giraffe
girl
give
glad
glance
glare
glass
glide
glimpse
globe
gloom
glory
glove
glow
glue
goat
goddess
gold
good
goose
gorilla
gospel
gossip
govern
gown
grab
grace
grain
grant
grape
grass
gravity
great
green
grid
grief
grit
grocery
group
grow
grunt
guard
guess
guide
guilt
guitar
gun
gym
habit
hair
half
hammer
hamster
hand
happy
harbor
hard
harsh
harvest
hat
have
hawk
hazard
head
health
heart
heavy
hedgehog
height
hello
helmet
help
hen
hero
hidden
high
hill
hint
hip
hire
history
hobby
hockey
hold
hole
holiday
hollow
home
honey
hood
hope
horn
horror
horse
hospital
host
hotel
hour
hover
hub
huge
human
humble
humor
hundred
hungry
hunt
hurdle
hurry
hurt
husband
hybrid
ice
icon
idea
identify
idle
ignore
ill
illegal
illness
image
imitate
immense
immune
impact
impose
improve
impulse
inch
include
income
increase
index
indicate
indoor
industry
infant
inflict
inform
inhale
inherit
initial
inject
injury
inmate
inner
innocent
input
inquiry
insane
insect
inside
inspire
install
intact
interest
into
invest
invite
involve
iron
island
isolate
issue
item
ivory
jacket
jaguar
jar
jazz
jealous
jeans
jelly
jewel
job
join
joke
journey
joy
judge
juice
jump
jungle
junior
junk
just
kangaroo
keen
keep
ketchup
key
kick
kid
kidney
kind
kingdom
kiss
kit
kitchen
kite
kitten
kiwi
knee
knife
knock
know
lab
label
labor
ladder
lady
lake
lamp
language
laptop
large
later
latin
laugh
laundry
lava
law
lawn
lawsuit
layer
lazy
leader
leaf
learn
leave
lecture
left
leg
legal
legend
leisure
lemon
lend
length
lens
leopard
lesson
letter
level
liar
liberty
library
license
life
lift
light
like
limb
limit
link
lion
liquid
list
little
live
lizard
load
loan
lobster
local
lock
logic
lonely
long
loop
lottery
loud
lounge
love
loyal
lucky
luggage
lumber
lunar
lunch
luxury
lyrics
machine
mad
magic
magnet
maid
mail
main
major
make
mammal
man
manage
mandate
mango
mansion
manual
maple
marble
march
margin
marine
market
marriage
mask
mass
master
match
material
math
matrix
matter
maximum
maze
meadow
mean
measure
meat
mechanic
medal
media
melody
melt
member
memory
mention
menu
mercy
merge
merit
merry
mesh
message
metal
method
middle
midnight
milk
million
mimic
mind
minimum
minor
minute
miracle
mirror
misery
miss
mistake
mix
mixed
mixture
mobile
model
modify
mom
moment
monitor
monkey
monster
month
moon
moral
more
morning
mosquito
mother
motion
motor
mountain
mouse
move
movie
much
muffin
mule
multiply
muscle
museum
mushroom
music
must
mutual
myself
mystery
myth
naive
name
napkin
narrow
nasty
nation
nature
near
neck
need
negative
neglect
neither
nephew
nerve
nest
net
network
neutral
never
news
next
nice
night
noble
noise
nominee
noodle
normal
north
nose
notable
note
nothing
notice
novel
now
nuclear
number
nurse
nut
oak
obey
object
oblige
obscure
observe
obtain
obvious
occur
ocean
october
odor
off
offer
office
often
oil
okay
old
olive
olympic
omit
once
one
onion
online
only
open
opera
opinion
oppose
option
orange
orbit
orchard
order
ordinary
organ
orient
original
orphan
ostrich
other
outdoor
outer
output
outside
oval
oven
over
own
owner
oxygen
oyster
ozone
pact
paddle
page
pair
palace
palm
panda
panel
panic
panther
paper
parade
parent
park
parrot
party
pass
patch
path
patient
patrol
pattern
pause
pave
payment
peace
peanut
pear
peasant
pelican
pen
penalty
pencil
people
pepper
perfect
permit
person
pet
phone
photo
phrase
physical
piano
picnic
picture
piece
pig
pigeon
pill
pilot
pink
pioneer
pipe
pistol
pitch
pizza
place
planet
plastic
plate
play
please
pledge
pluck
plug
plunge
poem
poet
point
polar
pole
police
pond
pony
pool
popular
portion
position
possible
post
potato
pottery
poverty
powder
power
practice
praise
predict
prefer
prepare
present
pretty
prevent
price
pride
primary
print
priority
prison
private
prize
problem
process
produce
profit
program
project
promote
proof
property
prosper
protect
proud
provide
public
pudding
pull
pulp
pulse
pumpkin
punch
pupil
puppy
purchase
purity
purpose
purse
push
put
puzzle
pyramid
quality
quantum
quarter
question
quick
quit
quiz
quote
rabbit
raccoon
race
rack
radar
radio
rail
rain
raise
rally
ramp
ranch
random
range
rapid
rare
rate
rather
raven
raw
razor
ready
real
reason
rebel
rebuild
recall
receive
recipe
record
recycle
reduce
reflect
reform
refuse
region
regret
regular
reject
relax
release
relief
rely
remain
remember
remind
remove
render
renew
rent
reopen
repair
repeat
replace
report
require
rescue
resemble
resist
resource
response
result
retire
retreat
return
reunion
reveal
review
reward
rhythm
rib
ribbon
rice
rich
ride
ridge
rifle
right
rigid
ring
riot
ripple
risk
ritual
rival
river
road
roast
robot
robust
rocket
romance
roof
rookie
room
rose
rotate
rough
round
route
royal
rubber
rude
rug
rule
run
runway
rural
sad
saddle
sadness
safe
sail
salad
salmon
salon
salt
salute
same
sample
sand
satisfy
satoshi
sauce
sausage
save
say
scale
scan
scare
scatter
scene
scheme
school
science
scissors
scorpion
scout
scrap
screen
script
scrub
sea
search
season
seat
second
secret
section
security
seed
seek
segment
select
sell
seminar
senior
sense
sentence
series
service
session
settle
setup
seven
shadow
shaft
shallow
share
shed
shell
sheriff
shield
shift
shine
ship
shiver
shock
shoe
shoot
shop
short
shoulder
shove
shrimp
shrug
shuffle
shy
sibling
sick
side
siege
sight
sign
silent
silk
silly
silver
similar
simple
since
sing
siren
sister
situate
six
size
skate
sketch
ski
skill
skin
skirt
skull
slab
slam
sleep
slender
slice
slide
slight
slim
slogan
slot
slow
slush
small
smart
smile
smoke
smooth
snack
snake
snap
sniff
snow
soap
soccer
social
sock
soda
soft
solar
soldier
solid
solution
solve
someone
song
soon
sorry
sort
soul
sound
soup
source
south
space
spare
spatial
spawn
speak
special
speed
spell
spend
sphere
spice
spider
spike
spin
spirit
split
spoil
sponsor
spoon
sport
spot
spray
spread
spring
spy
square
squeeze
squirrel
stable
stadium
staff
stage
stairs
stamp
stand
start
state
stay
steak
steel
stem
step
stereo
stick
still
sting
stock
stomach
stone
stool
story
stove
strategy
street
strike
strong
struggle
student
stuff
stumble
style
subject
submit
subway
success
such
sudden
suffer
sugar
suggest
suit
summer
sun
sunny
sunset
super
supply
supreme
sure
surface
surge
surprise
surround
survey
suspect
sustain
swallow
swamp
swap
swarm
swear
sweet
swift
swim
swing
switch
sword
symbol
symptom
syrup
system
table
tackle
tag
tail
talent
talk
tank
tape
target
task
taste
tattoo
taxi
teach
team
tell
ten
tenant
tennis
tent
term
test
text
thank
that
theme
then
theory
there
they
thing
this
thought
three
thrive
throw
thumb
thunder
ticket
tide
tiger
tilt
timber
time
tiny
tip
tired
tissue
title
toast
tobacco
today
toddler
toe
together
toilet
token
tomato
tomorrow
tone
tongue
tonight
tool
tooth
top
topic
topple
torch
tornado
tortoise
toss
total
tourist
toward
tower
town
toy
track
trade
traffic
tragic
train
transfer
trap
trash
travel
tray
treat
tree
trend
trial
tribe
trick
trigger
trim
trip
trophy
trouble
truck
true
truly
trumpet
trust
truth
try
tube
tuition
tumble
tuna
tunnel
turkey
turn
turtle
twelve
twenty
twice
twin
twist
two
type
typical
ugly
umbrella
unable
unaware
uncle
uncover
under
undo
unfair
unfold
unhappy
uniform
unique
unit
universe
unknown
unlock
until
unusual
unveil
update
upgrade
uphold
upon
upper
upset
urban
urge
usage
use
used
useful
useless
usual
utility
vacant
vacuum
vague
valid
valley
valve
van
vanish
vapor
various
vast
vault
vehicle
velvet
vendor
venture
venue
verb
verify
version
very
vessel
veteran
viable
vibrant
vicious
victory
video
view
village
vintage
violin
virtual
virus
visa
visit
visual
vital
vivid
vocal
voice
void
volcano
volume
vote
voyage
wage
wagon
wait
walk
wall
walnut
want
warfare
warm
warrior
wash
wasp
waste
water
wave
way
wealth
weapon
wear
weasel
weather
web
wedding
weekend
weird
welcome
west
wet
whale
what
wheat
wheel
when
where
whip
whisper
wide
width
wife
wild
will
win
window
wine
wing
wink
winner
winter
wire
wisdom
wise
wish
witness
wolf
woman
wonder
wood
wool
word
work
world
worry
worth
wrap
wreck
wrestle
wrist
write
wrong
yard
year
yellow
you
young
youth
zebra
zero
zone
zoo`.split(`
`);
  function bn(e) {
    if (!Number.isSafeInteger(e) || e < 0)
      throw new Error(`positive integer expected, not ${e}`);
  }
  function Ss(e) {
    return (
      e instanceof Uint8Array ||
      (e != null && typeof e == "object" && e.constructor.name === "Uint8Array")
    );
  }
  function z(e, ...t) {
    if (!Ss(e)) throw new Error("Uint8Array expected");
    if (t.length > 0 && !t.includes(e.length))
      throw new Error(
        `Uint8Array expected of length ${t}, not of length=${e.length}`,
      );
  }
  function xn(e) {
    if (typeof e != "function" || typeof e.create != "function")
      throw new Error("Hash should be wrapped by utils.wrapConstructor");
    bn(e.outputLen), bn(e.blockLen);
  }
  function Mt(e, t = !0) {
    if (e.destroyed) throw new Error("Hash instance has been destroyed");
    if (t && e.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function yn(e, t) {
    z(e);
    let r = t.outputLen;
    if (e.length < r)
      throw new Error(
        `digestInto() expects output buffer of length at least ${r}`,
      );
  }
  var gt = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength),
    J = (e, t) => (e << (32 - t)) | (e >>> t),
    ie = (e, t) => (e << t) | ((e >>> (32 - t)) >>> 0),
    Xc = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
  var Hs = Array.from({ length: 256 }, (e, t) =>
    t.toString(16).padStart(2, "0"),
  );
  function mn(e) {
    z(e);
    let t = "";
    for (let r = 0; r < e.length; r++) t += Hs[e[r]];
    return t;
  }
  var ot = { _0: 48, _9: 57, _A: 65, _F: 70, _a: 97, _f: 102 };
  function gn(e) {
    if (e >= ot._0 && e <= ot._9) return e - ot._0;
    if (e >= ot._A && e <= ot._F) return e - (ot._A - 10);
    if (e >= ot._a && e <= ot._f) return e - (ot._a - 10);
  }
  function wn(e) {
    if (typeof e != "string")
      throw new Error("hex string expected, got " + typeof e);
    let t = e.length,
      r = t / 2;
    if (t % 2)
      throw new Error(
        "padded hex string expected, got unpadded hex of length " + t,
      );
    let n = new Uint8Array(r);
    for (let o = 0, s = 0; o < r; o++, s += 2) {
      let i = gn(e.charCodeAt(s)),
        c = gn(e.charCodeAt(s + 1));
      if (i === void 0 || c === void 0) {
        let a = e[s] + e[s + 1];
        throw new Error(
          'hex string expected, got non-hex character "' +
            a +
            '" at index ' +
            s,
        );
      }
      n[o] = i * 16 + c;
    }
    return n;
  }
  function nr(e) {
    if (typeof e != "string")
      throw new Error(`utf8ToBytes expected string, got ${typeof e}`);
    return new Uint8Array(new TextEncoder().encode(e));
  }
  function ce(e) {
    return typeof e == "string" && (e = nr(e)), z(e), e;
  }
  function ae(...e) {
    let t = 0;
    for (let n = 0; n < e.length; n++) {
      let o = e[n];
      z(o), (t += o.length);
    }
    let r = new Uint8Array(t);
    for (let n = 0, o = 0; n < e.length; n++) {
      let s = e[n];
      r.set(s, o), (o += s.length);
    }
    return r;
  }
  var Wt = class {
      clone() {
        return this._cloneInto();
      }
    },
    Qc = {}.toString;
  function Zt(e) {
    let t = (n) => e().update(ce(n)).digest(),
      r = e();
    return (
      (t.outputLen = r.outputLen),
      (t.blockLen = r.blockLen),
      (t.create = () => e()),
      t
    );
  }
  var Be = class extends Wt {
      constructor(t, r) {
        super(), (this.finished = !1), (this.destroyed = !1), xn(t);
        let n = ce(r);
        if (((this.iHash = t.create()), typeof this.iHash.update != "function"))
          throw new Error(
            "Expected instance of class which extends utils.Hash",
          );
        (this.blockLen = this.iHash.blockLen),
          (this.outputLen = this.iHash.outputLen);
        let o = this.blockLen,
          s = new Uint8Array(o);
        s.set(n.length > o ? t.create().update(n).digest() : n);
        for (let i = 0; i < s.length; i++) s[i] ^= 54;
        this.iHash.update(s), (this.oHash = t.create());
        for (let i = 0; i < s.length; i++) s[i] ^= 106;
        this.oHash.update(s), s.fill(0);
      }
      update(t) {
        return Mt(this), this.iHash.update(t), this;
      }
      digestInto(t) {
        Mt(this),
          z(t, this.outputLen),
          (this.finished = !0),
          this.iHash.digestInto(t),
          this.oHash.update(t),
          this.oHash.digestInto(t),
          this.destroy();
      }
      digest() {
        let t = new Uint8Array(this.oHash.outputLen);
        return this.digestInto(t), t;
      }
      _cloneInto(t) {
        t || (t = Object.create(Object.getPrototypeOf(this), {}));
        let {
          oHash: r,
          iHash: n,
          finished: o,
          destroyed: s,
          blockLen: i,
          outputLen: c,
        } = this;
        return (
          (t = t),
          (t.finished = o),
          (t.destroyed = s),
          (t.blockLen = i),
          (t.outputLen = c),
          (t.oHash = r._cloneInto(t.oHash)),
          (t.iHash = n._cloneInto(t.iHash)),
          t
        );
      }
      destroy() {
        (this.destroyed = !0), this.oHash.destroy(), this.iHash.destroy();
      }
    },
    Ae = (e, t, r) => new Be(e, t).update(r).digest();
  Ae.create = (e, t) => new Be(e, t);
  function Us(e, t, r, n) {
    if (typeof e.setBigUint64 == "function") return e.setBigUint64(t, r, n);
    let o = BigInt(32),
      s = BigInt(4294967295),
      i = Number((r >> o) & s),
      c = Number(r & s),
      a = n ? 4 : 0,
      l = n ? 0 : 4;
    e.setUint32(t + a, i, n), e.setUint32(t + l, c, n);
  }
  var En = (e, t, r) => (e & t) ^ (~e & r),
    vn = (e, t, r) => (e & t) ^ (e & r) ^ (t & r),
    mt = class extends Wt {
      constructor(t, r, n, o) {
        super(),
          (this.blockLen = t),
          (this.outputLen = r),
          (this.padOffset = n),
          (this.isLE = o),
          (this.finished = !1),
          (this.length = 0),
          (this.pos = 0),
          (this.destroyed = !1),
          (this.buffer = new Uint8Array(t)),
          (this.view = gt(this.buffer));
      }
      update(t) {
        Mt(this);
        let { view: r, buffer: n, blockLen: o } = this;
        t = ce(t);
        let s = t.length;
        for (let i = 0; i < s; ) {
          let c = Math.min(o - this.pos, s - i);
          if (c === o) {
            let a = gt(t);
            for (; o <= s - i; i += o) this.process(a, i);
            continue;
          }
          n.set(t.subarray(i, i + c), this.pos),
            (this.pos += c),
            (i += c),
            this.pos === o && (this.process(r, 0), (this.pos = 0));
        }
        return (this.length += t.length), this.roundClean(), this;
      }
      digestInto(t) {
        Mt(this), yn(t, this), (this.finished = !0);
        let { buffer: r, view: n, blockLen: o, isLE: s } = this,
          { pos: i } = this;
        (r[i++] = 128),
          this.buffer.subarray(i).fill(0),
          this.padOffset > o - i && (this.process(n, 0), (i = 0));
        for (let f = i; f < o; f++) r[f] = 0;
        Us(n, o - 8, BigInt(this.length * 8), s), this.process(n, 0);
        let c = gt(t),
          a = this.outputLen;
        if (a % 4)
          throw new Error("_sha2: outputLen should be aligned to 32bit");
        let l = a / 4,
          u = this.get();
        if (l > u.length) throw new Error("_sha2: outputLen bigger than state");
        for (let f = 0; f < l; f++) c.setUint32(4 * f, u[f], s);
      }
      digest() {
        let { buffer: t, outputLen: r } = this;
        this.digestInto(t);
        let n = t.slice(0, r);
        return this.destroy(), n;
      }
      _cloneInto(t) {
        t || (t = new this.constructor()), t.set(...this.get());
        let {
          blockLen: r,
          buffer: n,
          length: o,
          finished: s,
          destroyed: i,
          pos: c,
        } = this;
        return (
          (t.length = o),
          (t.pos = c),
          (t.finished = s),
          (t.destroyed = i),
          o % r && t.buffer.set(n),
          t
        );
      }
    };
  var Is = new Uint8Array([
      7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
    ]),
    An = new Uint8Array(new Array(16).fill(0).map((e, t) => t)),
    Cs = An.map((e) => (9 * e + 5) % 16),
    sr = [An],
    ir = [Cs];
  for (let e = 0; e < 4; e++)
    for (let t of [sr, ir]) t.push(t[e].map((r) => Is[r]));
  var kn = [
      [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
      [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
      [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
      [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
      [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
    ].map((e) => new Uint8Array(e)),
    _s = sr.map((e, t) => e.map((r) => kn[t][r])),
    Ts = ir.map((e, t) => e.map((r) => kn[t][r])),
    Os = new Uint32Array([0, 1518500249, 1859775393, 2400959708, 2840853838]),
    Ns = new Uint32Array([1352829926, 1548603684, 1836072691, 2053994217, 0]);
  function Bn(e, t, r, n) {
    return e === 0
      ? t ^ r ^ n
      : e === 1
        ? (t & r) | (~t & n)
        : e === 2
          ? (t | ~r) ^ n
          : e === 3
            ? (t & n) | (r & ~n)
            : t ^ (r | ~n);
  }
  var ke = new Uint32Array(16),
    or = class extends mt {
      constructor() {
        super(64, 20, 8, !0),
          (this.h0 = 1732584193),
          (this.h1 = -271733879),
          (this.h2 = -1732584194),
          (this.h3 = 271733878),
          (this.h4 = -1009589776);
      }
      get() {
        let { h0: t, h1: r, h2: n, h3: o, h4: s } = this;
        return [t, r, n, o, s];
      }
      set(t, r, n, o, s) {
        (this.h0 = t | 0),
          (this.h1 = r | 0),
          (this.h2 = n | 0),
          (this.h3 = o | 0),
          (this.h4 = s | 0);
      }
      process(t, r) {
        for (let p = 0; p < 16; p++, r += 4) ke[p] = t.getUint32(r, !0);
        let n = this.h0 | 0,
          o = n,
          s = this.h1 | 0,
          i = s,
          c = this.h2 | 0,
          a = c,
          l = this.h3 | 0,
          u = l,
          f = this.h4 | 0,
          h = f;
        for (let p = 0; p < 5; p++) {
          let y = 4 - p,
            d = Os[p],
            b = Ns[p],
            g = sr[p],
            w = ir[p],
            x = _s[p],
            L = Ts[p];
          for (let E = 0; E < 16; E++) {
            let v = (ie(n + Bn(p, s, c, l) + ke[g[E]] + d, x[E]) + f) | 0;
            (n = f), (f = l), (l = ie(c, 10) | 0), (c = s), (s = v);
          }
          for (let E = 0; E < 16; E++) {
            let v = (ie(o + Bn(y, i, a, u) + ke[w[E]] + b, L[E]) + h) | 0;
            (o = h), (h = u), (u = ie(a, 10) | 0), (a = i), (i = v);
          }
        }
        this.set(
          (this.h1 + c + u) | 0,
          (this.h2 + l + h) | 0,
          (this.h3 + f + o) | 0,
          (this.h4 + n + i) | 0,
          (this.h0 + s + a) | 0,
        );
      }
      roundClean() {
        ke.fill(0);
      }
      destroy() {
        (this.destroyed = !0), this.buffer.fill(0), this.set(0, 0, 0, 0, 0);
      }
    },
    Ln = Zt(() => new or());
  var Ks = new Uint32Array([
      1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993,
      2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987,
      1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774,
      264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
      2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711,
      113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
      1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
      3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
      430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
      1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424,
      2428436474, 2756734187, 3204031479, 3329325298,
    ]),
    wt = new Uint32Array([
      1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924,
      528734635, 1541459225,
    ]),
    Et = new Uint32Array(64),
    cr = class extends mt {
      constructor() {
        super(64, 32, 8, !1),
          (this.A = wt[0] | 0),
          (this.B = wt[1] | 0),
          (this.C = wt[2] | 0),
          (this.D = wt[3] | 0),
          (this.E = wt[4] | 0),
          (this.F = wt[5] | 0),
          (this.G = wt[6] | 0),
          (this.H = wt[7] | 0);
      }
      get() {
        let { A: t, B: r, C: n, D: o, E: s, F: i, G: c, H: a } = this;
        return [t, r, n, o, s, i, c, a];
      }
      set(t, r, n, o, s, i, c, a) {
        (this.A = t | 0),
          (this.B = r | 0),
          (this.C = n | 0),
          (this.D = o | 0),
          (this.E = s | 0),
          (this.F = i | 0),
          (this.G = c | 0),
          (this.H = a | 0);
      }
      process(t, r) {
        for (let f = 0; f < 16; f++, r += 4) Et[f] = t.getUint32(r, !1);
        for (let f = 16; f < 64; f++) {
          let h = Et[f - 15],
            p = Et[f - 2],
            y = J(h, 7) ^ J(h, 18) ^ (h >>> 3),
            d = J(p, 17) ^ J(p, 19) ^ (p >>> 10);
          Et[f] = (d + Et[f - 7] + y + Et[f - 16]) | 0;
        }
        let { A: n, B: o, C: s, D: i, E: c, F: a, G: l, H: u } = this;
        for (let f = 0; f < 64; f++) {
          let h = J(c, 6) ^ J(c, 11) ^ J(c, 25),
            p = (u + h + En(c, a, l) + Ks[f] + Et[f]) | 0,
            d = ((J(n, 2) ^ J(n, 13) ^ J(n, 22)) + vn(n, o, s)) | 0;
          (u = l),
            (l = a),
            (a = c),
            (c = (i + p) | 0),
            (i = s),
            (s = o),
            (o = n),
            (n = (p + d) | 0);
        }
        (n = (n + this.A) | 0),
          (o = (o + this.B) | 0),
          (s = (s + this.C) | 0),
          (i = (i + this.D) | 0),
          (c = (c + this.E) | 0),
          (a = (a + this.F) | 0),
          (l = (l + this.G) | 0),
          (u = (u + this.H) | 0),
          this.set(n, o, s, i, c, a, l, u);
      }
      roundClean() {
        Et.fill(0);
      }
      destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
      }
    };
  var ar = Zt(() => new cr());
  var Le = BigInt(4294967295),
    fr = BigInt(32);
  function Sn(e, t = !1) {
    return t
      ? { h: Number(e & Le), l: Number((e >> fr) & Le) }
      : { h: Number((e >> fr) & Le) | 0, l: Number(e & Le) | 0 };
  }
  function Rs(e, t = !1) {
    let r = new Uint32Array(e.length),
      n = new Uint32Array(e.length);
    for (let o = 0; o < e.length; o++) {
      let { h: s, l: i } = Sn(e[o], t);
      [r[o], n[o]] = [s, i];
    }
    return [r, n];
  }
  var Ds = (e, t) => (BigInt(e >>> 0) << fr) | BigInt(t >>> 0),
    js = (e, t, r) => e >>> r,
    qs = (e, t, r) => (e << (32 - r)) | (t >>> r),
    $s = (e, t, r) => (e >>> r) | (t << (32 - r)),
    Ps = (e, t, r) => (e << (32 - r)) | (t >>> r),
    Vs = (e, t, r) => (e << (64 - r)) | (t >>> (r - 32)),
    Gs = (e, t, r) => (e >>> (r - 32)) | (t << (64 - r)),
    zs = (e, t) => t,
    Ms = (e, t) => e,
    Ws = (e, t, r) => (e << r) | (t >>> (32 - r)),
    Zs = (e, t, r) => (t << r) | (e >>> (32 - r)),
    Fs = (e, t, r) => (t << (r - 32)) | (e >>> (64 - r)),
    Ys = (e, t, r) => (e << (r - 32)) | (t >>> (64 - r));
  function Xs(e, t, r, n) {
    let o = (t >>> 0) + (n >>> 0);
    return { h: (e + r + ((o / 2 ** 32) | 0)) | 0, l: o | 0 };
  }
  var Qs = (e, t, r) => (e >>> 0) + (t >>> 0) + (r >>> 0),
    Js = (e, t, r, n) => (t + r + n + ((e / 2 ** 32) | 0)) | 0,
    ti = (e, t, r, n) => (e >>> 0) + (t >>> 0) + (r >>> 0) + (n >>> 0),
    ei = (e, t, r, n, o) => (t + r + n + o + ((e / 2 ** 32) | 0)) | 0,
    ri = (e, t, r, n, o) =>
      (e >>> 0) + (t >>> 0) + (r >>> 0) + (n >>> 0) + (o >>> 0),
    ni = (e, t, r, n, o, s) => (t + r + n + o + s + ((e / 2 ** 32) | 0)) | 0;
  var oi = {
      fromBig: Sn,
      split: Rs,
      toBig: Ds,
      shrSH: js,
      shrSL: qs,
      rotrSH: $s,
      rotrSL: Ps,
      rotrBH: Vs,
      rotrBL: Gs,
      rotr32H: zs,
      rotr32L: Ms,
      rotlSH: Ws,
      rotlSL: Zs,
      rotlBH: Fs,
      rotlBL: Ys,
      add: Xs,
      add3L: Qs,
      add3H: Js,
      add4L: ti,
      add4H: ei,
      add5H: ni,
      add5L: ri,
    },
    U = oi;
  var [si, ii] = U.split(
      [
        "0x428a2f98d728ae22",
        "0x7137449123ef65cd",
        "0xb5c0fbcfec4d3b2f",
        "0xe9b5dba58189dbbc",
        "0x3956c25bf348b538",
        "0x59f111f1b605d019",
        "0x923f82a4af194f9b",
        "0xab1c5ed5da6d8118",
        "0xd807aa98a3030242",
        "0x12835b0145706fbe",
        "0x243185be4ee4b28c",
        "0x550c7dc3d5ffb4e2",
        "0x72be5d74f27b896f",
        "0x80deb1fe3b1696b1",
        "0x9bdc06a725c71235",
        "0xc19bf174cf692694",
        "0xe49b69c19ef14ad2",
        "0xefbe4786384f25e3",
        "0x0fc19dc68b8cd5b5",
        "0x240ca1cc77ac9c65",
        "0x2de92c6f592b0275",
        "0x4a7484aa6ea6e483",
        "0x5cb0a9dcbd41fbd4",
        "0x76f988da831153b5",
        "0x983e5152ee66dfab",
        "0xa831c66d2db43210",
        "0xb00327c898fb213f",
        "0xbf597fc7beef0ee4",
        "0xc6e00bf33da88fc2",
        "0xd5a79147930aa725",
        "0x06ca6351e003826f",
        "0x142929670a0e6e70",
        "0x27b70a8546d22ffc",
        "0x2e1b21385c26c926",
        "0x4d2c6dfc5ac42aed",
        "0x53380d139d95b3df",
        "0x650a73548baf63de",
        "0x766a0abb3c77b2a8",
        "0x81c2c92e47edaee6",
        "0x92722c851482353b",
        "0xa2bfe8a14cf10364",
        "0xa81a664bbc423001",
        "0xc24b8b70d0f89791",
        "0xc76c51a30654be30",
        "0xd192e819d6ef5218",
        "0xd69906245565a910",
        "0xf40e35855771202a",
        "0x106aa07032bbd1b8",
        "0x19a4c116b8d2d0c8",
        "0x1e376c085141ab53",
        "0x2748774cdf8eeb99",
        "0x34b0bcb5e19b48a8",
        "0x391c0cb3c5c95a63",
        "0x4ed8aa4ae3418acb",
        "0x5b9cca4f7763e373",
        "0x682e6ff3d6b2b8a3",
        "0x748f82ee5defb2fc",
        "0x78a5636f43172f60",
        "0x84c87814a1f0ab72",
        "0x8cc702081a6439ec",
        "0x90befffa23631e28",
        "0xa4506cebde82bde9",
        "0xbef9a3f7b2c67915",
        "0xc67178f2e372532b",
        "0xca273eceea26619c",
        "0xd186b8c721c0c207",
        "0xeada7dd6cde0eb1e",
        "0xf57d4f7fee6ed178",
        "0x06f067aa72176fba",
        "0x0a637dc5a2c898a6",
        "0x113f9804bef90dae",
        "0x1b710b35131c471b",
        "0x28db77f523047d84",
        "0x32caab7b40c72493",
        "0x3c9ebe0a15c9bebc",
        "0x431d67c49c100d4c",
        "0x4cc5d4becb3e42b6",
        "0x597f299cfc657e2a",
        "0x5fcb6fab3ad6faec",
        "0x6c44198c4a475817",
      ].map((e) => BigInt(e)),
    ),
    vt = new Uint32Array(80),
    Bt = new Uint32Array(80),
    lr = class extends mt {
      constructor() {
        super(128, 64, 16, !1),
          (this.Ah = 1779033703),
          (this.Al = -205731576),
          (this.Bh = -1150833019),
          (this.Bl = -2067093701),
          (this.Ch = 1013904242),
          (this.Cl = -23791573),
          (this.Dh = -1521486534),
          (this.Dl = 1595750129),
          (this.Eh = 1359893119),
          (this.El = -1377402159),
          (this.Fh = -1694144372),
          (this.Fl = 725511199),
          (this.Gh = 528734635),
          (this.Gl = -79577749),
          (this.Hh = 1541459225),
          (this.Hl = 327033209);
      }
      get() {
        let {
          Ah: t,
          Al: r,
          Bh: n,
          Bl: o,
          Ch: s,
          Cl: i,
          Dh: c,
          Dl: a,
          Eh: l,
          El: u,
          Fh: f,
          Fl: h,
          Gh: p,
          Gl: y,
          Hh: d,
          Hl: b,
        } = this;
        return [t, r, n, o, s, i, c, a, l, u, f, h, p, y, d, b];
      }
      set(t, r, n, o, s, i, c, a, l, u, f, h, p, y, d, b) {
        (this.Ah = t | 0),
          (this.Al = r | 0),
          (this.Bh = n | 0),
          (this.Bl = o | 0),
          (this.Ch = s | 0),
          (this.Cl = i | 0),
          (this.Dh = c | 0),
          (this.Dl = a | 0),
          (this.Eh = l | 0),
          (this.El = u | 0),
          (this.Fh = f | 0),
          (this.Fl = h | 0),
          (this.Gh = p | 0),
          (this.Gl = y | 0),
          (this.Hh = d | 0),
          (this.Hl = b | 0);
      }
      process(t, r) {
        for (let x = 0; x < 16; x++, r += 4)
          (vt[x] = t.getUint32(r)), (Bt[x] = t.getUint32((r += 4)));
        for (let x = 16; x < 80; x++) {
          let L = vt[x - 15] | 0,
            E = Bt[x - 15] | 0,
            v = U.rotrSH(L, E, 1) ^ U.rotrSH(L, E, 8) ^ U.shrSH(L, E, 7),
            S = U.rotrSL(L, E, 1) ^ U.rotrSL(L, E, 8) ^ U.shrSL(L, E, 7),
            k = vt[x - 2] | 0,
            T = Bt[x - 2] | 0,
            _ = U.rotrSH(k, T, 19) ^ U.rotrBH(k, T, 61) ^ U.shrSH(k, T, 6),
            I = U.rotrSL(k, T, 19) ^ U.rotrBL(k, T, 61) ^ U.shrSL(k, T, 6),
            K = U.add4L(S, I, Bt[x - 7], Bt[x - 16]),
            D = U.add4H(K, v, _, vt[x - 7], vt[x - 16]);
          (vt[x] = D | 0), (Bt[x] = K | 0);
        }
        let {
          Ah: n,
          Al: o,
          Bh: s,
          Bl: i,
          Ch: c,
          Cl: a,
          Dh: l,
          Dl: u,
          Eh: f,
          El: h,
          Fh: p,
          Fl: y,
          Gh: d,
          Gl: b,
          Hh: g,
          Hl: w,
        } = this;
        for (let x = 0; x < 80; x++) {
          let L = U.rotrSH(f, h, 14) ^ U.rotrSH(f, h, 18) ^ U.rotrBH(f, h, 41),
            E = U.rotrSL(f, h, 14) ^ U.rotrSL(f, h, 18) ^ U.rotrBL(f, h, 41),
            v = (f & p) ^ (~f & d),
            S = (h & y) ^ (~h & b),
            k = U.add5L(w, E, S, ii[x], Bt[x]),
            T = U.add5H(k, g, L, v, si[x], vt[x]),
            _ = k | 0,
            I = U.rotrSH(n, o, 28) ^ U.rotrBH(n, o, 34) ^ U.rotrBH(n, o, 39),
            K = U.rotrSL(n, o, 28) ^ U.rotrBL(n, o, 34) ^ U.rotrBL(n, o, 39),
            D = (n & s) ^ (n & c) ^ (s & c),
            Z = (o & i) ^ (o & a) ^ (i & a);
          (g = d | 0),
            (w = b | 0),
            (d = p | 0),
            (b = y | 0),
            (p = f | 0),
            (y = h | 0),
            ({ h: f, l: h } = U.add(l | 0, u | 0, T | 0, _ | 0)),
            (l = c | 0),
            (u = a | 0),
            (c = s | 0),
            (a = i | 0),
            (s = n | 0),
            (i = o | 0);
          let m = U.add3L(_, K, Z);
          (n = U.add3H(m, T, I, D)), (o = m | 0);
        }
        ({ h: n, l: o } = U.add(this.Ah | 0, this.Al | 0, n | 0, o | 0)),
          ({ h: s, l: i } = U.add(this.Bh | 0, this.Bl | 0, s | 0, i | 0)),
          ({ h: c, l: a } = U.add(this.Ch | 0, this.Cl | 0, c | 0, a | 0)),
          ({ h: l, l: u } = U.add(this.Dh | 0, this.Dl | 0, l | 0, u | 0)),
          ({ h: f, l: h } = U.add(this.Eh | 0, this.El | 0, f | 0, h | 0)),
          ({ h: p, l: y } = U.add(this.Fh | 0, this.Fl | 0, p | 0, y | 0)),
          ({ h: d, l: b } = U.add(this.Gh | 0, this.Gl | 0, d | 0, b | 0)),
          ({ h: g, l: w } = U.add(this.Hh | 0, this.Hl | 0, g | 0, w | 0)),
          this.set(n, o, s, i, c, a, l, u, f, h, p, y, d, b, g, w);
      }
      roundClean() {
        vt.fill(0), Bt.fill(0);
      }
      destroy() {
        this.buffer.fill(0),
          this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      }
    };
  var ur = Zt(() => new lr());
  function Hn(e) {
    if (!Number.isSafeInteger(e) || e < 0)
      throw new Error(`positive integer expected, not ${e}`);
  }
  function ci(e) {
    return (
      e instanceof Uint8Array ||
      (e != null && typeof e == "object" && e.constructor.name === "Uint8Array")
    );
  }
  function Ft(e, ...t) {
    if (!ci(e)) throw new Error("Uint8Array expected");
    if (t.length > 0 && !t.includes(e.length))
      throw new Error(
        `Uint8Array expected of length ${t}, not of length=${e.length}`,
      );
  }
  function Un(e) {
    if (typeof e != "function" || typeof e.create != "function")
      throw new Error("Hash should be wrapped by utils.wrapConstructor");
    Hn(e.outputLen), Hn(e.blockLen);
  }
  function Yt(e, t = !0) {
    if (e.destroyed) throw new Error("Hash instance has been destroyed");
    if (t && e.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function In(e, t) {
    Ft(e);
    let r = t.outputLen;
    if (e.length < r)
      throw new Error(
        `digestInto() expects output buffer of length at least ${r}`,
      );
  }
  var Se =
    typeof globalThis == "object" && "crypto" in globalThis
      ? globalThis.crypto
      : void 0;
  var He = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength),
    tt = (e, t) => (e << (32 - t)) | (e >>> t);
  var Ea = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
  function ai(e) {
    if (typeof e != "string")
      throw new Error(`utf8ToBytes expected string, got ${typeof e}`);
    return new Uint8Array(new TextEncoder().encode(e));
  }
  function fe(e) {
    return typeof e == "string" && (e = ai(e)), Ft(e), e;
  }
  function Cn(...e) {
    let t = 0;
    for (let n = 0; n < e.length; n++) {
      let o = e[n];
      Ft(o), (t += o.length);
    }
    let r = new Uint8Array(t);
    for (let n = 0, o = 0; n < e.length; n++) {
      let s = e[n];
      r.set(s, o), (o += s.length);
    }
    return r;
  }
  var Xt = class {
      clone() {
        return this._cloneInto();
      }
    },
    va = {}.toString;
  function _n(e) {
    let t = (n) => e().update(fe(n)).digest(),
      r = e();
    return (
      (t.outputLen = r.outputLen),
      (t.blockLen = r.blockLen),
      (t.create = () => e()),
      t
    );
  }
  function Tn(e = 32) {
    if (Se && typeof Se.getRandomValues == "function")
      return Se.getRandomValues(new Uint8Array(e));
    throw new Error("crypto.getRandomValues must be defined");
  }
  function fi(e, t, r, n) {
    if (typeof e.setBigUint64 == "function") return e.setBigUint64(t, r, n);
    let o = BigInt(32),
      s = BigInt(4294967295),
      i = Number((r >> o) & s),
      c = Number(r & s),
      a = n ? 4 : 0,
      l = n ? 0 : 4;
    e.setUint32(t + a, i, n), e.setUint32(t + l, c, n);
  }
  var On = (e, t, r) => (e & t) ^ (~e & r),
    Nn = (e, t, r) => (e & t) ^ (e & r) ^ (t & r),
    Ue = class extends Xt {
      constructor(t, r, n, o) {
        super(),
          (this.blockLen = t),
          (this.outputLen = r),
          (this.padOffset = n),
          (this.isLE = o),
          (this.finished = !1),
          (this.length = 0),
          (this.pos = 0),
          (this.destroyed = !1),
          (this.buffer = new Uint8Array(t)),
          (this.view = He(this.buffer));
      }
      update(t) {
        Yt(this);
        let { view: r, buffer: n, blockLen: o } = this;
        t = fe(t);
        let s = t.length;
        for (let i = 0; i < s; ) {
          let c = Math.min(o - this.pos, s - i);
          if (c === o) {
            let a = He(t);
            for (; o <= s - i; i += o) this.process(a, i);
            continue;
          }
          n.set(t.subarray(i, i + c), this.pos),
            (this.pos += c),
            (i += c),
            this.pos === o && (this.process(r, 0), (this.pos = 0));
        }
        return (this.length += t.length), this.roundClean(), this;
      }
      digestInto(t) {
        Yt(this), In(t, this), (this.finished = !0);
        let { buffer: r, view: n, blockLen: o, isLE: s } = this,
          { pos: i } = this;
        (r[i++] = 128),
          this.buffer.subarray(i).fill(0),
          this.padOffset > o - i && (this.process(n, 0), (i = 0));
        for (let f = i; f < o; f++) r[f] = 0;
        fi(n, o - 8, BigInt(this.length * 8), s), this.process(n, 0);
        let c = He(t),
          a = this.outputLen;
        if (a % 4)
          throw new Error("_sha2: outputLen should be aligned to 32bit");
        let l = a / 4,
          u = this.get();
        if (l > u.length) throw new Error("_sha2: outputLen bigger than state");
        for (let f = 0; f < l; f++) c.setUint32(4 * f, u[f], s);
      }
      digest() {
        let { buffer: t, outputLen: r } = this;
        this.digestInto(t);
        let n = t.slice(0, r);
        return this.destroy(), n;
      }
      _cloneInto(t) {
        t || (t = new this.constructor()), t.set(...this.get());
        let {
          blockLen: r,
          buffer: n,
          length: o,
          finished: s,
          destroyed: i,
          pos: c,
        } = this;
        return (
          (t.length = o),
          (t.pos = c),
          (t.finished = s),
          (t.destroyed = i),
          o % r && t.buffer.set(n),
          t
        );
      }
    };
  var li = new Uint32Array([
      1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993,
      2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987,
      1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774,
      264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
      2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711,
      113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
      1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
      3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
      430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
      1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424,
      2428436474, 2756734187, 3204031479, 3329325298,
    ]),
    At = new Uint32Array([
      1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924,
      528734635, 1541459225,
    ]),
    kt = new Uint32Array(64),
    hr = class extends Ue {
      constructor() {
        super(64, 32, 8, !1),
          (this.A = At[0] | 0),
          (this.B = At[1] | 0),
          (this.C = At[2] | 0),
          (this.D = At[3] | 0),
          (this.E = At[4] | 0),
          (this.F = At[5] | 0),
          (this.G = At[6] | 0),
          (this.H = At[7] | 0);
      }
      get() {
        let { A: t, B: r, C: n, D: o, E: s, F: i, G: c, H: a } = this;
        return [t, r, n, o, s, i, c, a];
      }
      set(t, r, n, o, s, i, c, a) {
        (this.A = t | 0),
          (this.B = r | 0),
          (this.C = n | 0),
          (this.D = o | 0),
          (this.E = s | 0),
          (this.F = i | 0),
          (this.G = c | 0),
          (this.H = a | 0);
      }
      process(t, r) {
        for (let f = 0; f < 16; f++, r += 4) kt[f] = t.getUint32(r, !1);
        for (let f = 16; f < 64; f++) {
          let h = kt[f - 15],
            p = kt[f - 2],
            y = tt(h, 7) ^ tt(h, 18) ^ (h >>> 3),
            d = tt(p, 17) ^ tt(p, 19) ^ (p >>> 10);
          kt[f] = (d + kt[f - 7] + y + kt[f - 16]) | 0;
        }
        let { A: n, B: o, C: s, D: i, E: c, F: a, G: l, H: u } = this;
        for (let f = 0; f < 64; f++) {
          let h = tt(c, 6) ^ tt(c, 11) ^ tt(c, 25),
            p = (u + h + On(c, a, l) + li[f] + kt[f]) | 0,
            d = ((tt(n, 2) ^ tt(n, 13) ^ tt(n, 22)) + Nn(n, o, s)) | 0;
          (u = l),
            (l = a),
            (a = c),
            (c = (i + p) | 0),
            (i = s),
            (s = o),
            (o = n),
            (n = (p + d) | 0);
        }
        (n = (n + this.A) | 0),
          (o = (o + this.B) | 0),
          (s = (s + this.C) | 0),
          (i = (i + this.D) | 0),
          (c = (c + this.E) | 0),
          (a = (a + this.F) | 0),
          (l = (l + this.G) | 0),
          (u = (u + this.H) | 0),
          this.set(n, o, s, i, c, a, l, u);
      }
      roundClean() {
        kt.fill(0);
      }
      destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
      }
    };
  var Kn = _n(() => new hr());
  var Ie = class extends Xt {
      constructor(t, r) {
        super(), (this.finished = !1), (this.destroyed = !1), Un(t);
        let n = fe(r);
        if (((this.iHash = t.create()), typeof this.iHash.update != "function"))
          throw new Error(
            "Expected instance of class which extends utils.Hash",
          );
        (this.blockLen = this.iHash.blockLen),
          (this.outputLen = this.iHash.outputLen);
        let o = this.blockLen,
          s = new Uint8Array(o);
        s.set(n.length > o ? t.create().update(n).digest() : n);
        for (let i = 0; i < s.length; i++) s[i] ^= 54;
        this.iHash.update(s), (this.oHash = t.create());
        for (let i = 0; i < s.length; i++) s[i] ^= 106;
        this.oHash.update(s), s.fill(0);
      }
      update(t) {
        return Yt(this), this.iHash.update(t), this;
      }
      digestInto(t) {
        Yt(this),
          Ft(t, this.outputLen),
          (this.finished = !0),
          this.iHash.digestInto(t),
          this.oHash.update(t),
          this.oHash.digestInto(t),
          this.destroy();
      }
      digest() {
        let t = new Uint8Array(this.oHash.outputLen);
        return this.digestInto(t), t;
      }
      _cloneInto(t) {
        t || (t = Object.create(Object.getPrototypeOf(this), {}));
        let {
          oHash: r,
          iHash: n,
          finished: o,
          destroyed: s,
          blockLen: i,
          outputLen: c,
        } = this;
        return (
          (t = t),
          (t.finished = o),
          (t.destroyed = s),
          (t.blockLen = i),
          (t.outputLen = c),
          (t.oHash = r._cloneInto(t.oHash)),
          (t.iHash = n._cloneInto(t.iHash)),
          t
        );
      }
      destroy() {
        (this.destroyed = !0), this.oHash.destroy(), this.iHash.destroy();
      }
    },
    dr = (e, t, r) => new Ie(e, t).update(r).digest();
  dr.create = (e, t) => new Ie(e, t);
  var yr = {};
  Ko(yr, {
    abytes: () => Qt,
    bitGet: () => yi,
    bitLen: () => xi,
    bitMask: () => le,
    bitSet: () => gi,
    bytesToHex: () => Ot,
    bytesToNumberBE: () => it,
    bytesToNumberLE: () => _e,
    concatBytes: () => Jt,
    createHmacDrbg: () => xr,
    ensureBytes: () => M,
    equalBytes: () => pi,
    hexToBytes: () => Nt,
    hexToNumber: () => br,
    isBytes: () => Lt,
    numberToBytesBE: () => St,
    numberToBytesLE: () => Te,
    numberToHexUnpadded: () => qn,
    numberToVarBytesBE: () => di,
    utf8ToBytes: () => bi,
    validateObject: () => Ht,
  });
  var jn = BigInt(0),
    Ce = BigInt(1),
    ui = BigInt(2);
  function Lt(e) {
    return (
      e instanceof Uint8Array ||
      (e != null && typeof e == "object" && e.constructor.name === "Uint8Array")
    );
  }
  function Qt(e) {
    if (!Lt(e)) throw new Error("Uint8Array expected");
  }
  var hi = Array.from({ length: 256 }, (e, t) =>
    t.toString(16).padStart(2, "0"),
  );
  function Ot(e) {
    Qt(e);
    let t = "";
    for (let r = 0; r < e.length; r++) t += hi[e[r]];
    return t;
  }
  function qn(e) {
    let t = e.toString(16);
    return t.length & 1 ? `0${t}` : t;
  }
  function br(e) {
    if (typeof e != "string")
      throw new Error("hex string expected, got " + typeof e);
    return BigInt(e === "" ? "0" : `0x${e}`);
  }
  var st = { _0: 48, _9: 57, _A: 65, _F: 70, _a: 97, _f: 102 };
  function Rn(e) {
    if (e >= st._0 && e <= st._9) return e - st._0;
    if (e >= st._A && e <= st._F) return e - (st._A - 10);
    if (e >= st._a && e <= st._f) return e - (st._a - 10);
  }
  function Nt(e) {
    if (typeof e != "string")
      throw new Error("hex string expected, got " + typeof e);
    let t = e.length,
      r = t / 2;
    if (t % 2)
      throw new Error(
        "padded hex string expected, got unpadded hex of length " + t,
      );
    let n = new Uint8Array(r);
    for (let o = 0, s = 0; o < r; o++, s += 2) {
      let i = Rn(e.charCodeAt(s)),
        c = Rn(e.charCodeAt(s + 1));
      if (i === void 0 || c === void 0) {
        let a = e[s] + e[s + 1];
        throw new Error(
          'hex string expected, got non-hex character "' +
            a +
            '" at index ' +
            s,
        );
      }
      n[o] = i * 16 + c;
    }
    return n;
  }
  function it(e) {
    return br(Ot(e));
  }
  function _e(e) {
    return Qt(e), br(Ot(Uint8Array.from(e).reverse()));
  }
  function St(e, t) {
    return Nt(e.toString(16).padStart(t * 2, "0"));
  }
  function Te(e, t) {
    return St(e, t).reverse();
  }
  function di(e) {
    return Nt(qn(e));
  }
  function M(e, t, r) {
    let n;
    if (typeof t == "string")
      try {
        n = Nt(t);
      } catch (s) {
        throw new Error(
          `${e} must be valid hex string, got "${t}". Cause: ${s}`,
        );
      }
    else if (Lt(t)) n = Uint8Array.from(t);
    else throw new Error(`${e} must be hex string or Uint8Array`);
    let o = n.length;
    if (typeof r == "number" && o !== r)
      throw new Error(`${e} expected ${r} bytes, got ${o}`);
    return n;
  }
  function Jt(...e) {
    let t = 0;
    for (let n = 0; n < e.length; n++) {
      let o = e[n];
      Qt(o), (t += o.length);
    }
    let r = new Uint8Array(t);
    for (let n = 0, o = 0; n < e.length; n++) {
      let s = e[n];
      r.set(s, o), (o += s.length);
    }
    return r;
  }
  function pi(e, t) {
    if (e.length !== t.length) return !1;
    let r = 0;
    for (let n = 0; n < e.length; n++) r |= e[n] ^ t[n];
    return r === 0;
  }
  function bi(e) {
    if (typeof e != "string")
      throw new Error(`utf8ToBytes expected string, got ${typeof e}`);
    return new Uint8Array(new TextEncoder().encode(e));
  }
  function xi(e) {
    let t;
    for (t = 0; e > jn; e >>= Ce, t += 1);
    return t;
  }
  function yi(e, t) {
    return (e >> BigInt(t)) & Ce;
  }
  function gi(e, t, r) {
    return e | ((r ? Ce : jn) << BigInt(t));
  }
  var le = (e) => (ui << BigInt(e - 1)) - Ce,
    pr = (e) => new Uint8Array(e),
    Dn = (e) => Uint8Array.from(e);
  function xr(e, t, r) {
    if (typeof e != "number" || e < 2)
      throw new Error("hashLen must be a number");
    if (typeof t != "number" || t < 2)
      throw new Error("qByteLen must be a number");
    if (typeof r != "function") throw new Error("hmacFn must be a function");
    let n = pr(e),
      o = pr(e),
      s = 0,
      i = () => {
        n.fill(1), o.fill(0), (s = 0);
      },
      c = (...f) => r(o, n, ...f),
      a = (f = pr()) => {
        (o = c(Dn([0]), f)),
          (n = c()),
          f.length !== 0 && ((o = c(Dn([1]), f)), (n = c()));
      },
      l = () => {
        if (s++ >= 1e3) throw new Error("drbg: tried 1000 values");
        let f = 0,
          h = [];
        for (; f < t; ) {
          n = c();
          let p = n.slice();
          h.push(p), (f += n.length);
        }
        return Jt(...h);
      };
    return (f, h) => {
      i(), a(f);
      let p;
      for (; !(p = h(l())); ) a();
      return i(), p;
    };
  }
  var mi = {
    bigint: (e) => typeof e == "bigint",
    function: (e) => typeof e == "function",
    boolean: (e) => typeof e == "boolean",
    string: (e) => typeof e == "string",
    stringOrUint8Array: (e) => typeof e == "string" || Lt(e),
    isSafeInteger: (e) => Number.isSafeInteger(e),
    array: (e) => Array.isArray(e),
    field: (e, t) => t.Fp.isValid(e),
    hash: (e) => typeof e == "function" && Number.isSafeInteger(e.outputLen),
  };
  function Ht(e, t, r = {}) {
    let n = (o, s, i) => {
      let c = mi[s];
      if (typeof c != "function")
        throw new Error(`Invalid validator "${s}", expected function`);
      let a = e[o];
      if (!(i && a === void 0) && !c(a, e))
        throw new Error(
          `Invalid param ${String(o)}=${a} (${typeof a}), expected ${s}`,
        );
    };
    for (let [o, s] of Object.entries(t)) n(o, s, !1);
    for (let [o, s] of Object.entries(r)) n(o, s, !0);
    return e;
  }
  var j = BigInt(0),
    R = BigInt(1),
    Kt = BigInt(2),
    wi = BigInt(3),
    gr = BigInt(4),
    $n = BigInt(5),
    Pn = BigInt(8),
    Ei = BigInt(9),
    vi = BigInt(16);
  function $(e, t) {
    let r = e % t;
    return r >= j ? r : t + r;
  }
  function Bi(e, t, r) {
    if (r <= j || t < j) throw new Error("Expected power/modulo > 0");
    if (r === R) return j;
    let n = R;
    for (; t > j; ) t & R && (n = (n * e) % r), (e = (e * e) % r), (t >>= R);
    return n;
  }
  function W(e, t, r) {
    let n = e;
    for (; t-- > j; ) (n *= n), (n %= r);
    return n;
  }
  function Oe(e, t) {
    if (e === j || t <= j)
      throw new Error(
        `invert: expected positive integers, got n=${e} mod=${t}`,
      );
    let r = $(e, t),
      n = t,
      o = j,
      s = R,
      i = R,
      c = j;
    for (; r !== j; ) {
      let l = n / r,
        u = n % r,
        f = o - i * l,
        h = s - c * l;
      (n = r), (r = u), (o = i), (s = c), (i = f), (c = h);
    }
    if (n !== R) throw new Error("invert: does not exist");
    return $(o, t);
  }
  function Ai(e) {
    let t = (e - R) / Kt,
      r,
      n,
      o;
    for (r = e - R, n = 0; r % Kt === j; r /= Kt, n++);
    for (o = Kt; o < e && Bi(o, t, e) !== e - R; o++);
    if (n === 1) {
      let i = (e + R) / gr;
      return function (a, l) {
        let u = a.pow(l, i);
        if (!a.eql(a.sqr(u), l)) throw new Error("Cannot find square root");
        return u;
      };
    }
    let s = (r + R) / Kt;
    return function (c, a) {
      if (c.pow(a, t) === c.neg(c.ONE))
        throw new Error("Cannot find square root");
      let l = n,
        u = c.pow(c.mul(c.ONE, o), r),
        f = c.pow(a, s),
        h = c.pow(a, r);
      for (; !c.eql(h, c.ONE); ) {
        if (c.eql(h, c.ZERO)) return c.ZERO;
        let p = 1;
        for (let d = c.sqr(h); p < l && !c.eql(d, c.ONE); p++) d = c.sqr(d);
        let y = c.pow(u, R << BigInt(l - p - 1));
        (u = c.sqr(y)), (f = c.mul(f, y)), (h = c.mul(h, u)), (l = p);
      }
      return f;
    };
  }
  function ki(e) {
    if (e % gr === wi) {
      let t = (e + R) / gr;
      return function (n, o) {
        let s = n.pow(o, t);
        if (!n.eql(n.sqr(s), o)) throw new Error("Cannot find square root");
        return s;
      };
    }
    if (e % Pn === $n) {
      let t = (e - $n) / Pn;
      return function (n, o) {
        let s = n.mul(o, Kt),
          i = n.pow(s, t),
          c = n.mul(o, i),
          a = n.mul(n.mul(c, Kt), i),
          l = n.mul(c, n.sub(a, n.ONE));
        if (!n.eql(n.sqr(l), o)) throw new Error("Cannot find square root");
        return l;
      };
    }
    return e % vi, Ai(e);
  }
  var Li = [
    "create",
    "isValid",
    "is0",
    "neg",
    "inv",
    "sqrt",
    "sqr",
    "eql",
    "add",
    "sub",
    "mul",
    "pow",
    "div",
    "addN",
    "subN",
    "mulN",
    "sqrN",
  ];
  function mr(e) {
    let t = {
        ORDER: "bigint",
        MASK: "bigint",
        BYTES: "isSafeInteger",
        BITS: "isSafeInteger",
      },
      r = Li.reduce((n, o) => ((n[o] = "function"), n), t);
    return Ht(e, r);
  }
  function Si(e, t, r) {
    if (r < j) throw new Error("Expected power > 0");
    if (r === j) return e.ONE;
    if (r === R) return t;
    let n = e.ONE,
      o = t;
    for (; r > j; ) r & R && (n = e.mul(n, o)), (o = e.sqr(o)), (r >>= R);
    return n;
  }
  function Hi(e, t) {
    let r = new Array(t.length),
      n = t.reduce(
        (s, i, c) => (e.is0(i) ? s : ((r[c] = s), e.mul(s, i))),
        e.ONE,
      ),
      o = e.inv(n);
    return (
      t.reduceRight(
        (s, i, c) => (e.is0(i) ? s : ((r[c] = e.mul(s, r[c])), e.mul(s, i))),
        o,
      ),
      r
    );
  }
  function wr(e, t) {
    let r = t !== void 0 ? t : e.toString(2).length,
      n = Math.ceil(r / 8);
    return { nBitLength: r, nByteLength: n };
  }
  function Vn(e, t, r = !1, n = {}) {
    if (e <= j) throw new Error(`Expected Field ORDER > 0, got ${e}`);
    let { nBitLength: o, nByteLength: s } = wr(e, t);
    if (s > 2048)
      throw new Error("Field lengths over 2048 bytes are not supported");
    let i = ki(e),
      c = Object.freeze({
        ORDER: e,
        BITS: o,
        BYTES: s,
        MASK: le(o),
        ZERO: j,
        ONE: R,
        create: (a) => $(a, e),
        isValid: (a) => {
          if (typeof a != "bigint")
            throw new Error(
              `Invalid field element: expected bigint, got ${typeof a}`,
            );
          return j <= a && a < e;
        },
        is0: (a) => a === j,
        isOdd: (a) => (a & R) === R,
        neg: (a) => $(-a, e),
        eql: (a, l) => a === l,
        sqr: (a) => $(a * a, e),
        add: (a, l) => $(a + l, e),
        sub: (a, l) => $(a - l, e),
        mul: (a, l) => $(a * l, e),
        pow: (a, l) => Si(c, a, l),
        div: (a, l) => $(a * Oe(l, e), e),
        sqrN: (a) => a * a,
        addN: (a, l) => a + l,
        subN: (a, l) => a - l,
        mulN: (a, l) => a * l,
        inv: (a) => Oe(a, e),
        sqrt: n.sqrt || ((a) => i(c, a)),
        invertBatch: (a) => Hi(c, a),
        cmov: (a, l, u) => (u ? l : a),
        toBytes: (a) => (r ? Te(a, s) : St(a, s)),
        fromBytes: (a) => {
          if (a.length !== s)
            throw new Error(`Fp.fromBytes: expected ${s}, got ${a.length}`);
          return r ? _e(a) : it(a);
        },
      });
    return Object.freeze(c);
  }
  function Gn(e) {
    if (typeof e != "bigint") throw new Error("field order must be bigint");
    let t = e.toString(2).length;
    return Math.ceil(t / 8);
  }
  function Er(e) {
    let t = Gn(e);
    return t + Math.ceil(t / 2);
  }
  function zn(e, t, r = !1) {
    let n = e.length,
      o = Gn(t),
      s = Er(t);
    if (n < 16 || n < s || n > 1024)
      throw new Error(`expected ${s}-1024 bytes of input, got ${n}`);
    let i = r ? it(e) : _e(e),
      c = $(i, t - R) + R;
    return r ? Te(c, o) : St(c, o);
  }
  var Ii = BigInt(0),
    vr = BigInt(1);
  function Mn(e, t) {
    let r = (o, s) => {
        let i = s.negate();
        return o ? i : s;
      },
      n = (o) => {
        let s = Math.ceil(t / o) + 1,
          i = 2 ** (o - 1);
        return { windows: s, windowSize: i };
      };
    return {
      constTimeNegate: r,
      unsafeLadder(o, s) {
        let i = e.ZERO,
          c = o;
        for (; s > Ii; ) s & vr && (i = i.add(c)), (c = c.double()), (s >>= vr);
        return i;
      },
      precomputeWindow(o, s) {
        let { windows: i, windowSize: c } = n(s),
          a = [],
          l = o,
          u = l;
        for (let f = 0; f < i; f++) {
          (u = l), a.push(u);
          for (let h = 1; h < c; h++) (u = u.add(l)), a.push(u);
          l = u.double();
        }
        return a;
      },
      wNAF(o, s, i) {
        let { windows: c, windowSize: a } = n(o),
          l = e.ZERO,
          u = e.BASE,
          f = BigInt(2 ** o - 1),
          h = 2 ** o,
          p = BigInt(o);
        for (let y = 0; y < c; y++) {
          let d = y * a,
            b = Number(i & f);
          (i >>= p), b > a && ((b -= h), (i += vr));
          let g = d,
            w = d + Math.abs(b) - 1,
            x = y % 2 !== 0,
            L = b < 0;
          b === 0 ? (u = u.add(r(x, s[g]))) : (l = l.add(r(L, s[w])));
        }
        return { p: l, f: u };
      },
      wNAFCached(o, s, i, c) {
        let a = o._WINDOW_SIZE || 1,
          l = s.get(o);
        return (
          l || ((l = this.precomputeWindow(o, a)), a !== 1 && s.set(o, c(l))),
          this.wNAF(a, l, i)
        );
      },
    };
  }
  function Br(e) {
    return (
      mr(e.Fp),
      Ht(
        e,
        { n: "bigint", h: "bigint", Gx: "field", Gy: "field" },
        { nBitLength: "isSafeInteger", nByteLength: "isSafeInteger" },
      ),
      Object.freeze({ ...wr(e.n, e.nBitLength), ...e, p: e.Fp.ORDER })
    );
  }
  function Ci(e) {
    let t = Br(e);
    Ht(
      t,
      { a: "field", b: "field" },
      {
        allowedPrivateKeyLengths: "array",
        wrapPrivateKey: "boolean", // pragma: allowlist secret
        isTorsionFree: "function",
        clearCofactor: "function",
        allowInfinityPoint: "boolean",
        fromBytes: "function",
        toBytes: "function",
      },
    );
    // pragma: allowlist secret - identifiers reference key validation only
    let { endo: r, Fp: n, a: o } = t;
    if (r) {
      if (!n.eql(o, n.ZERO))
        throw new Error(
          "Endomorphism can only be defined for Koblitz curves that have a=0",
        );
      if (
        typeof r != "object" ||
        typeof r.beta != "bigint" ||
        typeof r.splitScalar != "function"
      )
        throw new Error(
          "Expected endomorphism with beta: bigint and splitScalar: function",
        );
    }
    return Object.freeze({ ...t });
  }
  var { bytesToNumberBE: _i, hexToBytes: Ti } = yr,
    Rt = {
      Err: class extends Error {
        constructor(t = "") {
          super(t);
        }
      },
      _parseInt(e) {
        let { Err: t } = Rt;
        if (e.length < 2 || e[0] !== 2)
          throw new t("Invalid signature integer tag");
        let r = e[1],
          n = e.subarray(2, r + 2);
        if (!r || n.length !== r)
          throw new t("Invalid signature integer: wrong length");
        if (n[0] & 128) throw new t("Invalid signature integer: negative");
        if (n[0] === 0 && !(n[1] & 128))
          throw new t("Invalid signature integer: unnecessary leading zero");
        return { d: _i(n), l: e.subarray(r + 2) };
      },
      toSig(e) {
        let { Err: t } = Rt,
          r = typeof e == "string" ? Ti(e) : e;
        Qt(r);
        let n = r.length;
        if (n < 2 || r[0] != 48) throw new t("Invalid signature tag");
        if (r[1] !== n - 2) throw new t("Invalid signature: incorrect length");
        let { d: o, l: s } = Rt._parseInt(r.subarray(2)),
          { d: i, l: c } = Rt._parseInt(s);
        if (c.length)
          throw new t("Invalid signature: left bytes after parsing");
        return { r: o, s: i };
      },
      hexFromSig(e) {
        let t = (l) => (Number.parseInt(l[0], 16) & 8 ? "00" + l : l),
          r = (l) => {
            let u = l.toString(16);
            return u.length & 1 ? `0${u}` : u;
          },
          n = t(r(e.s)),
          o = t(r(e.r)),
          s = n.length / 2,
          i = o.length / 2,
          c = r(s),
          a = r(i);
        return `30${r(i + s + 4)}02${a}${o}02${c}${n}`;
      },
    },
    ct = BigInt(0),
    F = BigInt(1),
    qa = BigInt(2),
    Wn = BigInt(3),
    $a = BigInt(4);
  function Oi(e) {
    let t = Ci(e),
      { Fp: r } = t,
      n =
        t.toBytes ||
        ((y, d, b) => {
          let g = d.toAffine();
          return Jt(Uint8Array.from([4]), r.toBytes(g.x), r.toBytes(g.y));
        }),
      o =
        t.fromBytes ||
        ((y) => {
          let d = y.subarray(1),
            b = r.fromBytes(d.subarray(0, r.BYTES)),
            g = r.fromBytes(d.subarray(r.BYTES, 2 * r.BYTES));
          return { x: b, y: g };
        });
    function s(y) {
      let { a: d, b } = t,
        g = r.sqr(y),
        w = r.mul(g, y);
      return r.add(r.add(w, r.mul(y, d)), b);
    }
    if (!r.eql(r.sqr(t.Gy), s(t.Gx)))
      throw new Error("bad generator point: equation left != right");
    function i(y) {
      return typeof y == "bigint" && ct < y && y < t.n;
    }
    function c(y) {
      if (!i(y)) throw new Error("Expected valid bigint: 0 < bigint < curve.n");
    }
    function a(y) {
      let {
        allowedPrivateKeyLengths: d,
        nByteLength: b,
        wrapPrivateKey: g,
        n: w,
      } = t;
      if (d && typeof y != "bigint") {
        if (
          (Lt(y) && (y = Ot(y)), typeof y != "string" || !d.includes(y.length))
        )
          throw new Error("Invalid key");
        y = y.padStart(b * 2, "0");
      }
      let x;
      try {
        x = typeof y == "bigint" ? y : it(M("private key", y, b));
      } catch {
        throw new Error(
          `private key must be ${b} bytes, hex or bigint, not ${typeof y}`,
        );
      }
      return g && (x = $(x, w)), c(x), x;
    }
    let l = new Map();
    function u(y) {
      if (!(y instanceof f)) throw new Error("ProjectivePoint expected");
    }
    class f {
      constructor(d, b, g) {
        if (
          ((this.px = d),
          (this.py = b),
          (this.pz = g),
          d == null || !r.isValid(d))
        )
          throw new Error("x required");
        if (b == null || !r.isValid(b)) throw new Error("y required");
        if (g == null || !r.isValid(g)) throw new Error("z required");
      }
      static fromAffine(d) {
        let { x: b, y: g } = d || {};
        if (!d || !r.isValid(b) || !r.isValid(g))
          throw new Error("invalid affine point");
        if (d instanceof f) throw new Error("projective point not allowed");
        let w = (x) => r.eql(x, r.ZERO);
        return w(b) && w(g) ? f.ZERO : new f(b, g, r.ONE);
      }
      get x() {
        return this.toAffine().x;
      }
      get y() {
        return this.toAffine().y;
      }
      static normalizeZ(d) {
        let b = r.invertBatch(d.map((g) => g.pz));
        return d.map((g, w) => g.toAffine(b[w])).map(f.fromAffine);
      }
      static fromHex(d) {
        let b = f.fromAffine(o(M("pointHex", d)));
        return b.assertValidity(), b;
      }
      static fromPrivateKey(d) {
        return f.BASE.multiply(a(d));
      }
      _setWindowSize(d) {
        (this._WINDOW_SIZE = d), l.delete(this);
      }
      assertValidity() {
        if (this.is0()) {
          if (t.allowInfinityPoint && !r.is0(this.py)) return;
          throw new Error("bad point: ZERO");
        }
        let { x: d, y: b } = this.toAffine();
        if (!r.isValid(d) || !r.isValid(b))
          throw new Error("bad point: x or y not FE");
        let g = r.sqr(b),
          w = s(d);
        if (!r.eql(g, w)) throw new Error("bad point: equation left != right");
        if (!this.isTorsionFree())
          throw new Error("bad point: not in prime-order subgroup");
      }
      hasEvenY() {
        let { y: d } = this.toAffine();
        if (r.isOdd) return !r.isOdd(d);
        throw new Error("Field doesn't support isOdd");
      }
      equals(d) {
        u(d);
        let { px: b, py: g, pz: w } = this,
          { px: x, py: L, pz: E } = d,
          v = r.eql(r.mul(b, E), r.mul(x, w)),
          S = r.eql(r.mul(g, E), r.mul(L, w));
        return v && S;
      }
      negate() {
        return new f(this.px, r.neg(this.py), this.pz);
      }
      double() {
        let { a: d, b } = t,
          g = r.mul(b, Wn),
          { px: w, py: x, pz: L } = this,
          E = r.ZERO,
          v = r.ZERO,
          S = r.ZERO,
          k = r.mul(w, w),
          T = r.mul(x, x),
          _ = r.mul(L, L),
          I = r.mul(w, x);
        return (
          (I = r.add(I, I)),
          (S = r.mul(w, L)),
          (S = r.add(S, S)),
          (E = r.mul(d, S)),
          (v = r.mul(g, _)),
          (v = r.add(E, v)),
          (E = r.sub(T, v)),
          (v = r.add(T, v)),
          (v = r.mul(E, v)),
          (E = r.mul(I, E)),
          (S = r.mul(g, S)),
          (_ = r.mul(d, _)),
          (I = r.sub(k, _)),
          (I = r.mul(d, I)),
          (I = r.add(I, S)),
          (S = r.add(k, k)),
          (k = r.add(S, k)),
          (k = r.add(k, _)),
          (k = r.mul(k, I)),
          (v = r.add(v, k)),
          (_ = r.mul(x, L)),
          (_ = r.add(_, _)),
          (k = r.mul(_, I)),
          (E = r.sub(E, k)),
          (S = r.mul(_, T)),
          (S = r.add(S, S)),
          (S = r.add(S, S)),
          new f(E, v, S)
        );
      }
      add(d) {
        u(d);
        let { px: b, py: g, pz: w } = this,
          { px: x, py: L, pz: E } = d,
          v = r.ZERO,
          S = r.ZERO,
          k = r.ZERO,
          T = t.a,
          _ = r.mul(t.b, Wn),
          I = r.mul(b, x),
          K = r.mul(g, L),
          D = r.mul(w, E),
          Z = r.add(b, g),
          m = r.add(x, L);
        (Z = r.mul(Z, m)),
          (m = r.add(I, K)),
          (Z = r.sub(Z, m)),
          (m = r.add(b, w));
        let B = r.add(x, E);
        return (
          (m = r.mul(m, B)),
          (B = r.add(I, D)),
          (m = r.sub(m, B)),
          (B = r.add(g, w)),
          (v = r.add(L, E)),
          (B = r.mul(B, v)),
          (v = r.add(K, D)),
          (B = r.sub(B, v)),
          (k = r.mul(T, m)),
          (v = r.mul(_, D)),
          (k = r.add(v, k)),
          (v = r.sub(K, k)),
          (k = r.add(K, k)),
          (S = r.mul(v, k)),
          (K = r.add(I, I)),
          (K = r.add(K, I)),
          (D = r.mul(T, D)),
          (m = r.mul(_, m)),
          (K = r.add(K, D)),
          (D = r.sub(I, D)),
          (D = r.mul(T, D)),
          (m = r.add(m, D)),
          (I = r.mul(K, m)),
          (S = r.add(S, I)),
          (I = r.mul(B, m)),
          (v = r.mul(Z, v)),
          (v = r.sub(v, I)),
          (I = r.mul(Z, K)),
          (k = r.mul(B, k)),
          (k = r.add(k, I)),
          new f(v, S, k)
        );
      }
      subtract(d) {
        return this.add(d.negate());
      }
      is0() {
        return this.equals(f.ZERO);
      }
      wNAF(d) {
        return p.wNAFCached(this, l, d, (b) => {
          let g = r.invertBatch(b.map((w) => w.pz));
          return b.map((w, x) => w.toAffine(g[x])).map(f.fromAffine);
        });
      }
      multiplyUnsafe(d) {
        let b = f.ZERO;
        if (d === ct) return b;
        if ((c(d), d === F)) return this;
        let { endo: g } = t;
        if (!g) return p.unsafeLadder(this, d);
        let { k1neg: w, k1: x, k2neg: L, k2: E } = g.splitScalar(d),
          v = b,
          S = b,
          k = this;
        for (; x > ct || E > ct; )
          x & F && (v = v.add(k)),
            E & F && (S = S.add(k)),
            (k = k.double()),
            (x >>= F),
            (E >>= F);
        return (
          w && (v = v.negate()),
          L && (S = S.negate()),
          (S = new f(r.mul(S.px, g.beta), S.py, S.pz)),
          v.add(S)
        );
      }
      multiply(d) {
        c(d);
        let b = d,
          g,
          w,
          { endo: x } = t;
        if (x) {
          let { k1neg: L, k1: E, k2neg: v, k2: S } = x.splitScalar(b),
            { p: k, f: T } = this.wNAF(E),
            { p: _, f: I } = this.wNAF(S);
          (k = p.constTimeNegate(L, k)),
            (_ = p.constTimeNegate(v, _)),
            (_ = new f(r.mul(_.px, x.beta), _.py, _.pz)),
            (g = k.add(_)),
            (w = T.add(I));
        } else {
          let { p: L, f: E } = this.wNAF(b);
          (g = L), (w = E);
        }
        return f.normalizeZ([g, w])[0];
      }
      multiplyAndAddUnsafe(d, b, g) {
        let w = f.BASE,
          x = (E, v) =>
            v === ct || v === F || !E.equals(w)
              ? E.multiplyUnsafe(v)
              : E.multiply(v),
          L = x(this, b).add(x(d, g));
        return L.is0() ? void 0 : L;
      }
      toAffine(d) {
        let { px: b, py: g, pz: w } = this,
          x = this.is0();
        d == null && (d = x ? r.ONE : r.inv(w));
        let L = r.mul(b, d),
          E = r.mul(g, d),
          v = r.mul(w, d);
        if (x) return { x: r.ZERO, y: r.ZERO };
        if (!r.eql(v, r.ONE)) throw new Error("invZ was invalid");
        return { x: L, y: E };
      }
      isTorsionFree() {
        let { h: d, isTorsionFree: b } = t;
        if (d === F) return !0;
        if (b) return b(f, this);
        throw new Error(
          "isTorsionFree() has not been declared for the elliptic curve",
        );
      }
      clearCofactor() {
        let { h: d, clearCofactor: b } = t;
        return d === F ? this : b ? b(f, this) : this.multiplyUnsafe(t.h);
      }
      toRawBytes(d = !0) {
        return this.assertValidity(), n(f, this, d);
      }
      toHex(d = !0) {
        return Ot(this.toRawBytes(d));
      }
    }
    (f.BASE = new f(t.Gx, t.Gy, r.ONE)),
      (f.ZERO = new f(r.ZERO, r.ONE, r.ZERO));
    let h = t.nBitLength,
      p = Mn(f, t.endo ? Math.ceil(h / 2) : h);
    return {
      CURVE: t,
      ProjectivePoint: f,
      normPrivateKeyToScalar: a,
      weierstrassEquation: s,
      isWithinCurveOrder: i,
    };
  }
  function Ni(e) {
    let t = Br(e);
    return (
      Ht(
        t,
        { hash: "hash", hmac: "function", randomBytes: "function" },
        { bits2int: "function", bits2int_modN: "function", lowS: "boolean" },
      ),
      Object.freeze({ lowS: !0, ...t })
    );
  }
  function Zn(e) {
    let t = Ni(e),
      { Fp: r, n } = t,
      o = r.BYTES + 1,
      s = 2 * r.BYTES + 1;
    function i(m) {
      return ct < m && m < r.ORDER;
    }
    function c(m) {
      return $(m, n);
    }
    function a(m) {
      return Oe(m, n);
    }
    let {
        ProjectivePoint: l,
        normPrivateKeyToScalar: u,
        weierstrassEquation: f,
        isWithinCurveOrder: h,
      } = Oi({
        ...t,
        toBytes(m, B, C) {
          let N = B.toAffine(),
            O = r.toBytes(N.x),
            q = Jt;
          return C
            ? q(Uint8Array.from([B.hasEvenY() ? 2 : 3]), O)
            : q(Uint8Array.from([4]), O, r.toBytes(N.y));
        },
        fromBytes(m) {
          let B = m.length,
            C = m[0],
            N = m.subarray(1);
          if (B === o && (C === 2 || C === 3)) {
            let O = it(N);
            if (!i(O)) throw new Error("Point is not on curve");
            let q = f(O),
              V;
            try {
              V = r.sqrt(q);
            } catch (X) {
              let lt = X instanceof Error ? ": " + X.message : "";
              throw new Error("Point is not on curve" + lt);
            }
            let G = (V & F) === F;
            return ((C & 1) === 1) !== G && (V = r.neg(V)), { x: O, y: V };
          } else if (B === s && C === 4) {
            let O = r.fromBytes(N.subarray(0, r.BYTES)),
              q = r.fromBytes(N.subarray(r.BYTES, 2 * r.BYTES));
            return { x: O, y: q };
          } else
            throw new Error(
              `Point of length ${B} was invalid. Expected ${o} compressed bytes or ${s} uncompressed bytes`,
            );
        },
      }),
      p = (m) => Ot(St(m, t.nByteLength));
    function y(m) {
      let B = n >> F;
      return m > B;
    }
    function d(m) {
      return y(m) ? c(-m) : m;
    }
    let b = (m, B, C) => it(m.slice(B, C));
    class g {
      constructor(B, C, N) {
        (this.r = B), (this.s = C), (this.recovery = N), this.assertValidity();
      }
      static fromCompact(B) {
        let C = t.nByteLength;
        return (
          (B = M("compactSignature", B, C * 2)),
          new g(b(B, 0, C), b(B, C, 2 * C))
        );
      }
      static fromDER(B) {
        let { r: C, s: N } = Rt.toSig(M("DER", B));
        return new g(C, N);
      }
      assertValidity() {
        if (!h(this.r)) throw new Error("r must be 0 < r < CURVE.n");
        if (!h(this.s)) throw new Error("s must be 0 < s < CURVE.n");
      }
      addRecoveryBit(B) {
        return new g(this.r, this.s, B);
      }
      recoverPublicKey(B) {
        let { r: C, s: N, recovery: O } = this,
          q = S(M("msgHash", B));
        if (O == null || ![0, 1, 2, 3].includes(O))
          throw new Error("recovery id invalid");
        let V = O === 2 || O === 3 ? C + t.n : C;
        if (V >= r.ORDER) throw new Error("recovery id 2 or 3 invalid");
        let G = O & 1 ? "03" : "02",
          ft = l.fromHex(G + p(V)),
          X = a(V),
          lt = c(-q * X),
          oe = c(N * X),
          ut = l.BASE.multiplyAndAddUnsafe(ft, lt, oe);
        if (!ut) throw new Error("point at infinify");
        return ut.assertValidity(), ut;
      }
      hasHighS() {
        return y(this.s);
      }
      normalizeS() {
        return this.hasHighS()
          ? new g(this.r, c(-this.s), this.recovery)
          : this;
      }
      toDERRawBytes() {
        return Nt(this.toDERHex());
      }
      toDERHex() {
        return Rt.hexFromSig({ r: this.r, s: this.s });
      }
      toCompactRawBytes() {
        return Nt(this.toCompactHex());
      }
      toCompactHex() {
        return p(this.r) + p(this.s);
      }
    }
    let w = {
      isValidPrivateKey(m) {
        try {
          return u(m), !0;
        } catch {
          return !1;
        }
      },
      normPrivateKeyToScalar: u,
      randomPrivateKey: () => {
        let m = Er(t.n);
        return zn(t.randomBytes(m), t.n);
      },
      precompute(m = 8, B = l.BASE) {
        return B._setWindowSize(m), B.multiply(BigInt(3)), B;
      },
    };
    function x(m, B = !0) {
      return l.fromPrivateKey(m).toRawBytes(B);
    }
    function L(m) {
      let B = Lt(m),
        C = typeof m == "string",
        N = (B || C) && m.length;
      return B
        ? N === o || N === s
        : C
          ? N === 2 * o || N === 2 * s
          : m instanceof l;
    }
    function E(m, B, C = !0) {
      if (L(m)) throw new Error("first arg must be private key");
      if (!L(B)) throw new Error("second arg must be public key");
      return l.fromHex(B).multiply(u(m)).toRawBytes(C);
    }
    let v =
        t.bits2int ||
        function (m) {
          let B = it(m),
            C = m.length * 8 - t.nBitLength;
          return C > 0 ? B >> BigInt(C) : B;
        },
      S =
        t.bits2int_modN ||
        function (m) {
          return c(v(m));
        },
      k = le(t.nBitLength);
    function T(m) {
      if (typeof m != "bigint") throw new Error("bigint expected");
      if (!(ct <= m && m < k))
        throw new Error(`bigint expected < 2^${t.nBitLength}`);
      return St(m, t.nByteLength);
    }
    function _(m, B, C = I) {
      if (["recovered", "canonical"].some((Ct) => Ct in C))
        throw new Error("sign() legacy options not supported");
      let { hash: N, randomBytes: O } = t,
        { lowS: q, prehash: V, extraEntropy: G } = C;
      q == null && (q = !0),
        (m = M("msgHash", m)),
        V && (m = M("prehashed msgHash", N(m)));
      let ft = S(m),
        X = u(B),
        lt = [T(X), T(ft)];
      if (G != null && G !== !1) {
        let Ct = G === !0 ? O(r.BYTES) : G;
        lt.push(M("extraEntropy", Ct));
      }
      let oe = Jt(...lt),
        ut = ft;
      function Ze(Ct) {
        let qt = v(Ct);
        if (!h(qt)) return;
        let Mr = a(qt),
          nt = l.BASE.multiply(qt).toAffine(),
          $t = c(nt.x);
        if ($t === ct) return;
        let be = c(Mr * c(ut + $t * X));
        if (be === ct) return;
        let Wr = (nt.x === $t ? 0 : 2) | Number(nt.y & F),
          Zr = be;
        return q && y(be) && ((Zr = d(be)), (Wr ^= 1)), new g($t, Zr, Wr);
      }
      return { seed: oe, k2sig: Ze };
    }
    let I = { lowS: t.lowS, prehash: !1 },
      K = { lowS: t.lowS, prehash: !1 };
    function D(m, B, C = I) {
      let { seed: N, k2sig: O } = _(m, B, C),
        q = t;
      return xr(q.hash.outputLen, q.nByteLength, q.hmac)(N, O);
    }
    l.BASE._setWindowSize(8);
    function Z(m, B, C, N = K) {
      let O = m;
      if (((B = M("msgHash", B)), (C = M("publicKey", C)), "strict" in N))
        throw new Error("options.strict was renamed to lowS");
      let { lowS: q, prehash: V } = N,
        G,
        ft;
      try {
        if (typeof O == "string" || Lt(O))
          try {
            G = g.fromDER(O);
          } catch (nt) {
            if (!(nt instanceof Rt.Err)) throw nt;
            G = g.fromCompact(O);
          }
        else if (
          typeof O == "object" &&
          typeof O.r == "bigint" &&
          typeof O.s == "bigint"
        ) {
          let { r: nt, s: $t } = O;
          G = new g(nt, $t);
        } else throw new Error("PARSE");
        ft = l.fromHex(C);
      } catch (nt) {
        if (nt.message === "PARSE")
          throw new Error(
            "signature must be Signature instance, Uint8Array or hex string",
          );
        return !1;
      }
      if (q && G.hasHighS()) return !1;
      V && (B = t.hash(B));
      let { r: X, s: lt } = G,
        oe = S(B),
        ut = a(lt),
        Ze = c(oe * ut),
        Ct = c(X * ut),
        qt = l.BASE.multiplyAndAddUnsafe(ft, Ze, Ct)?.toAffine();
      return qt ? c(qt.x) === X : !1;
    }
    return {
      CURVE: t,
      getPublicKey: x,
      getSharedSecret: E,
      sign: D,
      verify: Z,
      ProjectivePoint: l,
      Signature: g,
      utils: w,
    };
  }
  function Ki(e) {
    return { hash: e, hmac: (t, ...r) => dr(e, t, Cn(...r)), randomBytes: Tn };
  }
  function Fn(e, t) {
    let r = (n) => Zn({ ...e, ...Ki(n) });
    return Object.freeze({ ...r(t), create: r });
  }
  var Qn = BigInt(
      "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f",
    ),
    Yn = BigInt(
      "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
    ),
    Ri = BigInt(1),
    Ar = BigInt(2),
    Xn = (e, t) => (e + t / Ar) / t;
  function Di(e) {
    let t = Qn,
      r = BigInt(3),
      n = BigInt(6),
      o = BigInt(11),
      s = BigInt(22),
      i = BigInt(23),
      c = BigInt(44),
      a = BigInt(88),
      l = (e * e * e) % t,
      u = (l * l * e) % t,
      f = (W(u, r, t) * u) % t,
      h = (W(f, r, t) * u) % t,
      p = (W(h, Ar, t) * l) % t,
      y = (W(p, o, t) * p) % t,
      d = (W(y, s, t) * y) % t,
      b = (W(d, c, t) * d) % t,
      g = (W(b, a, t) * b) % t,
      w = (W(g, c, t) * d) % t,
      x = (W(w, r, t) * u) % t,
      L = (W(x, i, t) * y) % t,
      E = (W(L, n, t) * l) % t,
      v = W(E, Ar, t);
    if (!kr.eql(kr.sqr(v), e)) throw new Error("Cannot find square root");
    return v;
  }
  var kr = Vn(Qn, void 0, void 0, { sqrt: Di }),
    et = Fn(
      {
        a: BigInt(0),
        b: BigInt(7),
        Fp: kr,
        n: Yn,
        Gx: BigInt(
          "55066263022277343669578718895168534326250603453777594175500187360389116729240",
        ),
        Gy: BigInt(
          "32670510020758816978083085130507043184471273380659243275938904335757337482424",
        ),
        h: BigInt(1),
        lowS: !0,
        endo: {
          beta: BigInt(
            "0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee",
          ),
          splitScalar: (e) => {
            let t = Yn,
              r = BigInt("0x3086d221a7d46bcde86c90e49284eb15"),
              n = -Ri * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"),
              o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"),
              s = r,
              i = BigInt("0x100000000000000000000000000000000"),
              c = Xn(s * e, t),
              a = Xn(-n * e, t),
              l = $(e - c * r - a * o, t),
              u = $(-c * n - a * s, t),
              f = l > i,
              h = u > i;
            if ((f && (l = t - l), h && (u = t - u), l > i || u > i))
              throw new Error("splitScalar: Endomorphism failed, k=" + e);
            return { k1neg: f, k1: l, k2neg: h, k2: u };
          },
        },
      },
      Kn,
    ),
    Ya = BigInt(0);
  var Xa = et.ProjectivePoint;
  var Ne = et.ProjectivePoint,
    Lr = ln(ar);
  function Jn(e) {
    return BigInt(`0x${mn(e)}`);
  }
  function ji(e) {
    return wn(e.toString(16).padStart(64, "0"));
  }
  var qi = nr("Bitcoin seed"),
    Sr = { private: 76066276, public: 76067358 },
    Hr = 2147483648,
    $i = (e) => Ln(ar(e)),
    Pi = (e) => gt(e).getUint32(0, !1),
    Ke = (e) => {
      if (!Number.isSafeInteger(e) || e < 0 || e > 2 ** 32 - 1)
        throw new Error(`Invalid number=${e}. Should be from 0 to 2 ** 32 - 1`);
      let t = new Uint8Array(4);
      return gt(t).setUint32(0, e, !1), t;
    },
    Re = class e {
      get fingerprint() {
        if (!this.pubHash) throw new Error("No publicKey set!");
        return Pi(this.pubHash);
      }
      get identifier() {
        return this.pubHash;
      }
      get pubKeyHash() {
        return this.pubHash;
      }
      get privateKey() {
        return this.privKeyBytes || null;
      }
      get publicKey() {
        return this.pubKey || null;
      }
      get privateExtendedKey() {
        let t = this.privateKey;
        if (!t) throw new Error("No private key");
        return Lr.encode(
          this.serialize(this.versions.private, ae(new Uint8Array([0]), t)),
        );
      }
      get publicExtendedKey() {
        if (!this.pubKey) throw new Error("No public key");
        return Lr.encode(this.serialize(this.versions.public, this.pubKey));
      }
      static fromMasterSeed(t, r = Sr) {
        if ((z(t), 8 * t.length < 128 || 8 * t.length > 512))
          throw new Error(
            `HDKey: wrong seed length=${t.length}. Should be between 128 and 512 bits; 256 bits is advised)`,
          );
        let n = Ae(ur, qi, t);
        return new e({
          versions: r,
          chainCode: n.slice(32),
          privateKey: n.slice(0, 32),
        });
      }
      static fromExtendedKey(t, r = Sr) {
        let n = Lr.decode(t),
          o = gt(n),
          s = o.getUint32(0, !1),
          i = {
            versions: r,
            depth: n[4],
            parentFingerprint: o.getUint32(5, !1),
            index: o.getUint32(9, !1),
            chainCode: n.slice(13, 45),
          },
          c = n.slice(45),
          a = c[0] === 0;
        if (s !== r[a ? "private" : "public"])
          throw new Error("Version mismatch");
        return a
          ? new e({ ...i, privateKey: c.slice(1) })
          : new e({ ...i, publicKey: c });
      }
      static fromJSON(t) {
        return e.fromExtendedKey(t.xpriv);
      }
      constructor(t) {
        if (
          ((this.depth = 0),
          (this.index = 0),
          (this.chainCode = null),
          (this.parentFingerprint = 0),
          !t || typeof t != "object")
        )
          throw new Error("HDKey.constructor must not be called directly");
        if (
          ((this.versions = t.versions || Sr),
          (this.depth = t.depth || 0),
          (this.chainCode = t.chainCode || null),
          (this.index = t.index || 0),
          (this.parentFingerprint = t.parentFingerprint || 0),
          !this.depth && (this.parentFingerprint || this.index))
        )
          throw new Error(
            "HDKey: zero depth with non-zero index/parent fingerprint",
          );
        if (t.publicKey && t.privateKey)
          throw new Error("HDKey: publicKey and privateKey at same time.");
        if (t.privateKey) {
          if (!et.utils.isValidPrivateKey(t.privateKey))
            throw new Error("Invalid private key");
          (this.privKey =
            typeof t.privateKey == "bigint" ? t.privateKey : Jn(t.privateKey)),
            (this.privKeyBytes = ji(this.privKey)),
            (this.pubKey = et.getPublicKey(t.privateKey, !0));
        } else if (t.publicKey)
          this.pubKey = Ne.fromHex(t.publicKey).toRawBytes(!0);
        else throw new Error("HDKey: no public or private key provided");
        this.pubHash = $i(this.pubKey);
      }
      derive(t) {
        if (!/^[mM]'?/.test(t))
          throw new Error('Path must start with "m" or "M"');
        if (/^[mM]'?$/.test(t)) return this;
        let r = t.replace(/^[mM]'?\//, "").split("/"),
          n = this;
        for (let o of r) {
          let s = /^(\d+)('?)$/.exec(o),
            i = s && s[1];
          if (!s || s.length !== 3 || typeof i != "string")
            throw new Error(`Invalid child index: ${o}`);
          let c = +i;
          if (!Number.isSafeInteger(c) || c >= Hr)
            throw new Error("Invalid index");
          s[2] === "'" && (c += Hr), (n = n.deriveChild(c));
        }
        return n;
      }
      deriveChild(t) {
        if (!this.pubKey || !this.chainCode)
          throw new Error("No publicKey or chainCode set");
        let r = Ke(t);
        if (t >= Hr) {
          let c = this.privateKey;
          if (!c) throw new Error("Could not derive hardened child key");
          r = ae(new Uint8Array([0]), c, r);
        } else r = ae(this.pubKey, r);
        let n = Ae(ur, this.chainCode, r),
          o = Jn(n.slice(0, 32)),
          s = n.slice(32);
        if (!et.utils.isValidPrivateKey(o))
          throw new Error("Tweak bigger than curve order");
        let i = {
          versions: this.versions,
          chainCode: s,
          depth: this.depth + 1,
          parentFingerprint: this.fingerprint,
          index: t,
        };
        try {
          if (this.privateKey) {
            let c = $(this.privKey + o, et.CURVE.n);
            if (!et.utils.isValidPrivateKey(c))
              throw new Error(
                "The tweak was out of range or the resulted private key is invalid",
              );
            i.privateKey = c;
          } else {
            let c = Ne.fromHex(this.pubKey).add(Ne.fromPrivateKey(o));
            if (c.equals(Ne.ZERO))
              throw new Error(
                "The tweak was equal to negative P, which made the result key invalid",
              );
            i.publicKey = c.toRawBytes(!0);
          }
          return new e(i);
        } catch {
          return this.deriveChild(t + 1);
        }
      }
      sign(t) {
        if (!this.privateKey) throw new Error("No privateKey set!");
        return z(t, 32), et.sign(t, this.privKey).toCompactRawBytes();
      }
      verify(t, r) {
        if ((z(t, 32), z(r, 64), !this.publicKey))
          throw new Error("No publicKey set!");
        let n;
        try {
          n = et.Signature.fromCompact(r);
        } catch {
          return !1;
        }
        return et.verify(n, t, this.publicKey);
      }
      wipePrivateData() {
        return (
          (this.privKey = void 0),
          this.privKeyBytes &&
            (this.privKeyBytes.fill(0), (this.privKeyBytes = void 0)),
          this
        );
      }
      toJSON() {
        return { xpriv: this.privateExtendedKey, xpub: this.publicExtendedKey };
      }
      serialize(t, r) {
        if (!this.chainCode) throw new Error("No chainCode set");
        return (
          z(r, 33),
          ae(
            Ke(t),
            new Uint8Array([this.depth]),
            Ke(this.parentFingerprint),
            Ke(this.index),
            this.chainCode,
            r,
          )
        );
      }
    };
  var Cr = 2n ** 256n,
    jt = Cr - 0x1000003d1n,
    _r = Cr - 0x14551231950b75fc4402da1732fc9bebfn,
    co = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    ao = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
    fo = { p: jt, n: _r, a: 0n, b: 7n, Gx: co, Gy: ao },
    te = 32,
    to = (e) => A(A(e * e) * e + fo.b),
    P = (e = "") => {
      throw new Error(e);
    },
    qe = (e) => typeof e == "bigint",
    lo = (e) => typeof e == "string",
    Ur = (e) => qe(e) && 0n < e && e < jt,
    uo = (e) => qe(e) && 0n < e && e < _r,
    Vi = (e) =>
      e instanceof Uint8Array ||
      (e != null &&
        typeof e == "object" &&
        e.constructor.name === "Uint8Array"),
    Ir = (e, t) =>
      !Vi(e) || (typeof t == "number" && t > 0 && e.length !== t)
        ? P("Uint8Array expected")
        : e,
    he = (e) => new Uint8Array(e),
    Tr = (e, t) => Ir(lo(e) ? $e(e) : he(Ir(e)), t),
    A = (e, t = jt) => {
      let r = e % t;
      return r >= 0n ? r : t + r;
    },
    eo = (e) => (e instanceof at ? e : P("Point expected")),
    at = class e {
      constructor(t, r, n) {
        (this.px = t), (this.py = r), (this.pz = n);
      }
      static fromAffine(t) {
        return t.x === 0n && t.y === 0n ? e.ZERO : new e(t.x, t.y, 1n);
      }
      static fromHex(t) {
        t = Tr(t);
        let r,
          n = t[0],
          o = t.subarray(1),
          s = ro(o, 0, te),
          i = t.length;
        if (i === 33 && [2, 3].includes(n)) {
          Ur(s) || P("Point hex invalid: x not FE");
          let c = Gi(to(s)),
            a = (c & 1n) === 1n;
          ((n & 1) === 1) !== a && (c = A(-c)), (r = new e(s, c, 1n));
        }
        return (
          i === 65 && n === 4 && (r = new e(s, ro(o, te, 2 * te), 1n)),
          r ? r.ok() : P("Point is not on curve")
        );
      }
      static fromPrivateKey(t) {
        return ue.mul(zi(t));
      }
      get x() {
        return this.aff().x;
      }
      get y() {
        return this.aff().y;
      }
      equals(t) {
        let { px: r, py: n, pz: o } = this,
          { px: s, py: i, pz: c } = eo(t),
          a = A(r * c),
          l = A(s * o),
          u = A(n * c),
          f = A(i * o);
        return a === l && u === f;
      }
      negate() {
        return new e(this.px, A(-this.py), this.pz);
      }
      double() {
        return this.add(this);
      }
      add(t) {
        let { px: r, py: n, pz: o } = this,
          { px: s, py: i, pz: c } = eo(t),
          { a, b: l } = fo,
          u = 0n,
          f = 0n,
          h = 0n,
          p = A(l * 3n),
          y = A(r * s),
          d = A(n * i),
          b = A(o * c),
          g = A(r + n),
          w = A(s + i);
        (g = A(g * w)), (w = A(y + d)), (g = A(g - w)), (w = A(r + o));
        let x = A(s + c);
        return (
          (w = A(w * x)),
          (x = A(y + b)),
          (w = A(w - x)),
          (x = A(n + o)),
          (u = A(i + c)),
          (x = A(x * u)),
          (u = A(d + b)),
          (x = A(x - u)),
          (h = A(a * w)),
          (u = A(p * b)),
          (h = A(u + h)),
          (u = A(d - h)),
          (h = A(d + h)),
          (f = A(u * h)),
          (d = A(y + y)),
          (d = A(d + y)),
          (b = A(a * b)),
          (w = A(p * w)),
          (d = A(d + b)),
          (b = A(y - b)),
          (b = A(a * b)),
          (w = A(w + b)),
          (y = A(d * w)),
          (f = A(f + y)),
          (y = A(x * w)),
          (u = A(g * u)),
          (u = A(u - y)),
          (y = A(g * d)),
          (h = A(x * h)),
          (h = A(h + y)),
          new e(u, f, h)
        );
      }
      mul(t, r = !0) {
        if (!r && t === 0n) return De;
        if ((uo(t) || P("invalid scalar"), this.equals(ue))) return Fi(t).p;
        let n = De,
          o = ue;
        for (let s = this; t > 0n; s = s.double(), t >>= 1n)
          t & 1n ? (n = n.add(s)) : r && (o = o.add(s));
        return n;
      }
      mulAddQUns(t, r, n) {
        return this.mul(r, !1).add(t.mul(n, !1)).ok();
      }
      toAffine() {
        let { px: t, py: r, pz: n } = this;
        if (this.equals(De)) return { x: 0n, y: 0n };
        if (n === 1n) return { x: t, y: r };
        let o = po(n);
        return (
          A(n * o) !== 1n && P("invalid inverse"), { x: A(t * o), y: A(r * o) }
        );
      }
      assertValidity() {
        let { x: t, y: r } = this.aff();
        return (
          (!Ur(t) || !Ur(r)) && P("Point invalid: x or y"),
          A(r * r) === to(t) ? this : P("Point invalid: not on curve")
        );
      }
      multiply(t) {
        return this.mul(t);
      }
      aff() {
        return this.toAffine();
      }
      ok() {
        return this.assertValidity();
      }
      toHex(t = !0) {
        let { x: r, y: n } = this.aff();
        return (
          (t ? ((n & 1n) === 0n ? "02" : "03") : "04") +
          no(r) +
          (t ? "" : no(n))
        );
      }
      toRawBytes(t = !0) {
        return $e(this.toHex(t));
      }
    };
  at.BASE = new at(co, ao, 1n);
  at.ZERO = new at(0n, 1n, 0n);
  var { BASE: ue, ZERO: De } = at,
    ho = (e, t) => e.toString(16).padStart(t, "0"),
    Or = (e) =>
      Array.from(e)
        .map((t) => ho(t, 2))
        .join(""),
    $e = (e) => {
      let t = e.length;
      (!lo(e) || t % 2) && P("hex invalid 1");
      let r = he(t / 2);
      for (let n = 0; n < r.length; n++) {
        let o = n * 2,
          s = e.slice(o, o + 2),
          i = Number.parseInt(s, 16);
        (Number.isNaN(i) || i < 0) && P("hex invalid 2"), (r[n] = i);
      }
      return r;
    },
    Pe = (e) => BigInt("0x" + (Or(e) || "0")),
    ro = (e, t, r) => Pe(e.slice(t, r)),
    Nr = (e) =>
      qe(e) && e >= 0n && e < Cr ? $e(ho(e, 2 * te)) : P("bigint expected"),
    no = (e) => Or(Nr(e)),
    oo = (...e) => {
      let t = he(e.reduce((n, o) => n + Ir(o).length, 0)),
        r = 0;
      return (
        e.forEach((n) => {
          t.set(n, r), (r += n.length);
        }),
        t
      );
    },
    po = (e, t = jt) => {
      (e === 0n || t <= 0n) && P("no inverse n=" + e + " mod=" + t);
      let r = A(e, t),
        n = t,
        o = 0n,
        s = 1n,
        i = 1n,
        c = 0n;
      for (; r !== 0n; ) {
        let a = n / r,
          l = n % r,
          u = o - i * a,
          f = s - c * a;
        (n = r), (r = l), (o = i), (s = c), (i = u), (c = f);
      }
      return n === 1n ? A(o, t) : P("no inverse");
    },
    Gi = (e) => {
      let t = 1n;
      for (let r = e, n = (jt + 1n) / 4n; n > 0n; n >>= 1n)
        n & 1n && (t = (t * r) % jt), (r = (r * r) % jt);
      return A(t * t) === e ? t : P("sqrt invalid");
    },
    zi = (e) => (
      qe(e) || (e = Pe(Tr(e, te))), uo(e) ? e : P("private key out of range")
    );
  var bo = (e, t = !0) => at.fromPrivateKey(e).toRawBytes(t);
  var so = () =>
      typeof globalThis == "object" && "crypto" in globalThis
        ? globalThis.crypto
        : void 0,
    je;
  var Mi = (e) => {
      e = Tr(e);
      let t = te + 8;
      (e.length < t || e.length > 1024) && P("expected proper params");
      let r = A(Pe(e), _r - 1n) + 1n;
      return Nr(r);
    },
    Wi = {
      hexToBytes: $e,
      bytesToHex: Or,
      concatBytes: oo,
      bytesToNumberBE: Pe,
      numberToBytesBE: Nr,
      mod: A,
      invert: po,
      hmacSha256Async: async (e, ...t) => {
        let r = so(),
          n = r && r.subtle;
        if (!n) return P("etc.hmacSha256Async not set");
        let o = await n.importKey(
          "raw",
          e,
          { name: "HMAC", hash: { name: "SHA-256" } },
          !1,
          ["sign"],
        );
        return he(await n.sign("HMAC", o, oo(...t)));
      },
      hmacSha256Sync: je,
      hashToPrivateKey: Mi,
      randomBytes: (e = 32) => {
        let t = so();
        return (
          (!t || !t.getRandomValues) &&
            P("crypto.getRandomValues must be defined"),
          t.getRandomValues(he(e))
        );
      },
    };
  Object.defineProperties(Wi, {
    hmacSha256Sync: {
      configurable: !1,
      get() {
        return je;
      },
      set(e) {
        je || (je = e);
      },
    },
  });
  var Dt = 8,
    Zi = () => {
      let e = [],
        t = 256 / Dt + 1,
        r = ue,
        n = r;
      for (let o = 0; o < t; o++) {
        (n = r), e.push(n);
        for (let s = 1; s < 2 ** (Dt - 1); s++) (n = n.add(r)), e.push(n);
        r = n.double();
      }
      return e;
    },
    io,
    Fi = (e) => {
      let t = io || (io = Zi()),
        r = (u, f) => {
          let h = f.negate();
          return u ? h : f;
        },
        n = De,
        o = ue,
        s = 1 + 256 / Dt,
        i = 2 ** (Dt - 1),
        c = BigInt(2 ** Dt - 1),
        a = 2 ** Dt,
        l = BigInt(Dt);
      for (let u = 0; u < s; u++) {
        let f = u * i,
          h = Number(e & c);
        (e >>= l), h > i && ((h -= a), (e += 1n));
        let p = f,
          y = f + Math.abs(h) - 1,
          d = u % 2 !== 0,
          b = h < 0;
        h === 0 ? (o = o.add(r(d, t[p]))) : (n = n.add(r(b, t[y])));
      }
      return { p: n, f: o };
    };
  function Yi(e) {
    return (
      e instanceof Uint8Array ||
      (ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array")
    );
  }
  function Kr(e, ...t) {
    if (!Yi(e)) throw new Error("Uint8Array expected");
    if (t.length > 0 && !t.includes(e.length))
      throw new Error(
        "Uint8Array expected of length " + t + ", got length=" + e.length,
      );
  }
  function Rr(e, t = !0) {
    if (e.destroyed) throw new Error("Hash instance has been destroyed");
    if (t && e.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function xo(e, t) {
    Kr(e);
    let r = t.outputLen;
    if (e.length < r)
      throw new Error(
        "digestInto() expects output buffer of length at least " + r,
      );
  }
  var Ge = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength),
    rt = (e, t) => (e << (32 - t)) | (e >>> t),
    de = (e, t) => (e << t) | ((e >>> (32 - t)) >>> 0);
  function Xi(e) {
    if (typeof e != "string")
      throw new Error("utf8ToBytes expected string, got " + typeof e);
    return new Uint8Array(new TextEncoder().encode(e));
  }
  function Dr(e) {
    return typeof e == "string" && (e = Xi(e)), Kr(e), e;
  }
  var Ve = class {
    clone() {
      return this._cloneInto();
    }
  };
  function ze(e) {
    let t = (n) => e().update(Dr(n)).digest(),
      r = e();
    return (
      (t.outputLen = r.outputLen),
      (t.blockLen = r.blockLen),
      (t.create = () => e()),
      t
    );
  }
  function Qi(e, t, r, n) {
    if (typeof e.setBigUint64 == "function") return e.setBigUint64(t, r, n);
    let o = BigInt(32),
      s = BigInt(4294967295),
      i = Number((r >> o) & s),
      c = Number(r & s),
      a = n ? 4 : 0,
      l = n ? 0 : 4;
    e.setUint32(t + a, i, n), e.setUint32(t + l, c, n);
  }
  var yo = (e, t, r) => (e & t) ^ (~e & r),
    go = (e, t, r) => (e & t) ^ (e & r) ^ (t & r),
    ee = class extends Ve {
      constructor(t, r, n, o) {
        super(),
          (this.blockLen = t),
          (this.outputLen = r),
          (this.padOffset = n),
          (this.isLE = o),
          (this.finished = !1),
          (this.length = 0),
          (this.pos = 0),
          (this.destroyed = !1),
          (this.buffer = new Uint8Array(t)),
          (this.view = Ge(this.buffer));
      }
      update(t) {
        Rr(this);
        let { view: r, buffer: n, blockLen: o } = this;
        t = Dr(t);
        let s = t.length;
        for (let i = 0; i < s; ) {
          let c = Math.min(o - this.pos, s - i);
          if (c === o) {
            let a = Ge(t);
            for (; o <= s - i; i += o) this.process(a, i);
            continue;
          }
          n.set(t.subarray(i, i + c), this.pos),
            (this.pos += c),
            (i += c),
            this.pos === o && (this.process(r, 0), (this.pos = 0));
        }
        return (this.length += t.length), this.roundClean(), this;
      }
      digestInto(t) {
        Rr(this), xo(t, this), (this.finished = !0);
        let { buffer: r, view: n, blockLen: o, isLE: s } = this,
          { pos: i } = this;
        (r[i++] = 128),
          this.buffer.subarray(i).fill(0),
          this.padOffset > o - i && (this.process(n, 0), (i = 0));
        for (let f = i; f < o; f++) r[f] = 0;
        Qi(n, o - 8, BigInt(this.length * 8), s), this.process(n, 0);
        let c = Ge(t),
          a = this.outputLen;
        if (a % 4)
          throw new Error("_sha2: outputLen should be aligned to 32bit");
        let l = a / 4,
          u = this.get();
        if (l > u.length) throw new Error("_sha2: outputLen bigger than state");
        for (let f = 0; f < l; f++) c.setUint32(4 * f, u[f], s);
      }
      digest() {
        let { buffer: t, outputLen: r } = this;
        this.digestInto(t);
        let n = t.slice(0, r);
        return this.destroy(), n;
      }
      _cloneInto(t) {
        t || (t = new this.constructor()), t.set(...this.get());
        let {
          blockLen: r,
          buffer: n,
          length: o,
          finished: s,
          destroyed: i,
          pos: c,
        } = this;
        return (
          (t.length = o),
          (t.pos = c),
          (t.finished = s),
          (t.destroyed = i),
          o % r && t.buffer.set(n),
          t
        );
      }
    };
  var Ji = new Uint32Array([
      1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993,
      2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987,
      1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774,
      264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
      2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711,
      113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
      1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
      3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
      430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
      1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424,
      2428436474, 2756734187, 3204031479, 3329325298,
    ]),
    Ut = new Uint32Array([
      1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924,
      528734635, 1541459225,
    ]),
    It = new Uint32Array(64),
    jr = class extends ee {
      constructor() {
        super(64, 32, 8, !1),
          (this.A = Ut[0] | 0),
          (this.B = Ut[1] | 0),
          (this.C = Ut[2] | 0),
          (this.D = Ut[3] | 0),
          (this.E = Ut[4] | 0),
          (this.F = Ut[5] | 0),
          (this.G = Ut[6] | 0),
          (this.H = Ut[7] | 0);
      }
      get() {
        let { A: t, B: r, C: n, D: o, E: s, F: i, G: c, H: a } = this;
        return [t, r, n, o, s, i, c, a];
      }
      set(t, r, n, o, s, i, c, a) {
        (this.A = t | 0),
          (this.B = r | 0),
          (this.C = n | 0),
          (this.D = o | 0),
          (this.E = s | 0),
          (this.F = i | 0),
          (this.G = c | 0),
          (this.H = a | 0);
      }
      process(t, r) {
        for (let f = 0; f < 16; f++, r += 4) It[f] = t.getUint32(r, !1);
        for (let f = 16; f < 64; f++) {
          let h = It[f - 15],
            p = It[f - 2],
            y = rt(h, 7) ^ rt(h, 18) ^ (h >>> 3),
            d = rt(p, 17) ^ rt(p, 19) ^ (p >>> 10);
          It[f] = (d + It[f - 7] + y + It[f - 16]) | 0;
        }
        let { A: n, B: o, C: s, D: i, E: c, F: a, G: l, H: u } = this;
        for (let f = 0; f < 64; f++) {
          let h = rt(c, 6) ^ rt(c, 11) ^ rt(c, 25),
            p = (u + h + yo(c, a, l) + Ji[f] + It[f]) | 0,
            d = ((rt(n, 2) ^ rt(n, 13) ^ rt(n, 22)) + go(n, o, s)) | 0;
          (u = l),
            (l = a),
            (a = c),
            (c = (i + p) | 0),
            (i = s),
            (s = o),
            (o = n),
            (n = (p + d) | 0);
        }
        (n = (n + this.A) | 0),
          (o = (o + this.B) | 0),
          (s = (s + this.C) | 0),
          (i = (i + this.D) | 0),
          (c = (c + this.E) | 0),
          (a = (a + this.F) | 0),
          (l = (l + this.G) | 0),
          (u = (u + this.H) | 0),
          this.set(n, o, s, i, c, a, l, u);
      }
      roundClean() {
        It.fill(0);
      }
      destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
      }
    };
  var mo = ze(() => new jr());
  var tc = new Uint8Array([
      7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
    ]),
    Eo = new Uint8Array(new Array(16).fill(0).map((e, t) => t)),
    ec = Eo.map((e) => (9 * e + 5) % 16),
    $r = [Eo],
    Pr = [ec];
  for (let e = 0; e < 4; e++)
    for (let t of [$r, Pr]) t.push(t[e].map((r) => tc[r]));
  var vo = [
      [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
      [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
      [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
      [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
      [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
    ].map((e) => new Uint8Array(e)),
    rc = $r.map((e, t) => e.map((r) => vo[t][r])),
    nc = Pr.map((e, t) => e.map((r) => vo[t][r])),
    oc = new Uint32Array([0, 1518500249, 1859775393, 2400959708, 2840853838]),
    sc = new Uint32Array([1352829926, 1548603684, 1836072691, 2053994217, 0]);
  function wo(e, t, r, n) {
    return e === 0
      ? t ^ r ^ n
      : e === 1
        ? (t & r) | (~t & n)
        : e === 2
          ? (t | ~r) ^ n
          : e === 3
            ? (t & n) | (r & ~n)
            : t ^ (r | ~n);
  }
  var Me = new Uint32Array(16),
    qr = class extends ee {
      constructor() {
        super(64, 20, 8, !0),
          (this.h0 = 1732584193),
          (this.h1 = -271733879),
          (this.h2 = -1732584194),
          (this.h3 = 271733878),
          (this.h4 = -1009589776);
      }
      get() {
        let { h0: t, h1: r, h2: n, h3: o, h4: s } = this;
        return [t, r, n, o, s];
      }
      set(t, r, n, o, s) {
        (this.h0 = t | 0),
          (this.h1 = r | 0),
          (this.h2 = n | 0),
          (this.h3 = o | 0),
          (this.h4 = s | 0);
      }
      process(t, r) {
        for (let p = 0; p < 16; p++, r += 4) Me[p] = t.getUint32(r, !0);
        let n = this.h0 | 0,
          o = n,
          s = this.h1 | 0,
          i = s,
          c = this.h2 | 0,
          a = c,
          l = this.h3 | 0,
          u = l,
          f = this.h4 | 0,
          h = f;
        for (let p = 0; p < 5; p++) {
          let y = 4 - p,
            d = oc[p],
            b = sc[p],
            g = $r[p],
            w = Pr[p],
            x = rc[p],
            L = nc[p];
          for (let E = 0; E < 16; E++) {
            let v = (de(n + wo(p, s, c, l) + Me[g[E]] + d, x[E]) + f) | 0;
            (n = f), (f = l), (l = de(c, 10) | 0), (c = s), (s = v);
          }
          for (let E = 0; E < 16; E++) {
            let v = (de(o + wo(y, i, a, u) + Me[w[E]] + b, L[E]) + h) | 0;
            (o = h), (h = u), (u = de(a, 10) | 0), (a = i), (i = v);
          }
        }
        this.set(
          (this.h1 + c + u) | 0,
          (this.h2 + l + h) | 0,
          (this.h3 + f + o) | 0,
          (this.h4 + n + i) | 0,
          (this.h0 + s + a) | 0,
        );
      }
      roundClean() {
        Me.fill(0);
      }
      destroy() {
        (this.destroyed = !0), this.buffer.fill(0), this.set(0, 0, 0, 0, 0);
      }
    },
    Bo = ze(() => new qr());
  var zr = Do(So(), 1),
    fc = 118,
    lc = 256;
  function Ho(e) {
    return Array.from(e, (t) => t.toString(16).padStart(2, "0")).join("");
  }
  function uc(e, t) {
    let r = mo(t),
      n = Bo(r),
      o = zr.bech32.toWords(n);
    return zr.bech32.encode(e, o);
  }
  function Uo(e, t) {
    let r = hn(pn, lc),
      n = dn(r),
      o = Re.fromMasterSeed(n),
      s = `m/44'/${t}'/0'/0/0`,
      i = o.derive(s);
    if (!i.privateKey) throw new Error("Failed to derive private key.");
    let c = bo(i.privateKey, !0),
      a = uc(e, c);
    return {
      mnemonic: r,
      address: a,
      publicKey: Ho(c),
      privateKey: Ho(i.privateKey),
      derivationPath: s,
    };
  }
  function Y(e) {
    return document.getElementById(e);
  }
  async function Gr(e) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(e);
      return;
    }
    let t = document.createElement("textarea");
    (t.value = e),
      (t.style.position = "fixed"),
      (t.style.opacity = "0"),
      document.body.appendChild(t),
      t.focus(),
      t.select(),
      document.execCommand("copy"),
      document.body.removeChild(t);
  }
  function pe(e, t) {
    let r = Y("statusMessage");
    r &&
      ((r.textContent = e),
      (r.className = `status-message ${t}`),
      (r.style.display = "block"));
  }
  function hc() {
    let e = Y("statusMessage");
    e && (e.style.display = "none");
  }
  document.addEventListener("DOMContentLoaded", () => {
    let e = document.body.dataset.addressPrefix || "cosmos",
      t = Number(document.body.dataset.coinType || fc),
      r = Y("generateBtn"),
      n = Y("walletOutput"),
      o = Y("mnemonicOutput"),
      s = Y("addressOutput"),
      i = Y("publicKeyOutput"),
      c = Y("derivationPathOutput"),
      a = Y("copyMnemonicBtn"),
      l = Y("copyAddressBtn"),
      u = Y("copyPublicKeyBtn"),
      f = Y("useFaucetBtn"),
      h = null;
    r.addEventListener("click", () => {
      hc();
      try {
        (h = Uo(e, t)),
          (o.value = h.mnemonic),
          (s.value = h.address),
          (i.value = h.publicKey),
          (c.textContent = h.derivationPath),
          (f.href = `/?address=${encodeURIComponent(h.address)}`),
          (n.style.display = "block"),
          pe("Wallet generated locally in your browser.", "success");
      } catch (p) {
        console.error(p),
          pe(
            "Failed to generate wallet. Please refresh and try again.",
            "error",
          );
      }
    }),
      a.addEventListener("click", async () => {
        h &&
          (await Gr(h.mnemonic),
          pe("Recovery phrase copied to clipboard.", "success"));
      }),
      l.addEventListener("click", async () => {
        h &&
          (await Gr(h.address), pe("Address copied to clipboard.", "success"));
      }),
      u.addEventListener("click", async () => {
        h &&
          (await Gr(h.publicKey),
          pe("Public key copied to clipboard.", "success"));
      });
  });
  window.FaucetWallet = { generateWallet: Uo };
})();
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@scure/base/lib/esm/index.js:
  (*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@scure/bip39/esm/index.js:
  (*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/modular.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/curve.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/weierstrass.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/_shortw_utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@scure/bip32/lib/esm/index.js:
  (*! scure-bip32 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) *)

@noble/secp256k1/index.js:
  (*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
