class LTerm {
  constructor(term) {
    //this.term = term;
  }
  bind(bindings) {
    return this;
  }
  beta() {
    return this;
  }
  subst(arg, term) {
    return this;
  }
  betaStep(ctx) {
    return this;
  }
  toStr(mode) {
    return '?';
  }
  asDb(nestMap = new Map()) {
    throw new Error('Wrong way!');
  }
  getDbx(nestMap = new Map()) {
    if (!this.dbx) this.dbx = this.asDb(nestMap);
    return this.dbx;
  }
  toRefs(invDefs) {
    const ref = invDefs[this.dbx];
    if (ref) return new LRef(ref);
  }
}

class LAbs extends LTerm {
  constructor(arg, term) { // : LVar, LTerm
    super();
    this.arg = arg;
    this.term = term;
  }
  bind(bindings) {
    bindings = {
      ...bindings,
      [this.arg.name]: this.arg,
    };
    this.nesting = bindings.$nesting;
    this.term = this.term.bind(bindings);
    return this;
  }
  toStr(mode) {
    const pref = {
      'js': this.arg.name + ' => ',
      'hs': '\\' + this.arg.name + ' -> ',
      'lc': 'λ' + this.arg.name + '. ',
    }[mode];
    return pref + this.term.toStr(mode);
  }
  betaStep(ctx) {
    const nt = this.term.betaStep(ctx);
    if (nt === this.term) return this;
    return new LAbs(this.arg, nt);
  }
  apply(t) {
    return this.term.subst(this.arg, t);
  }
  subst(arg, term) {
    const nt = this.term.subst(arg, term);
    if (nt !== this.term) return new LAbs(this.arg, nt);
    return this;
  }
  asDb(nestMap = new Map()) {
    nestMap.set('level', (nestMap.get('level') || 0) + 1);
    nestMap.set(this.arg, nestMap.get('level'));
    return 'λ' + this.term.getDbx(nestMap);
  }
  toRefs(invDefs) {
    return super.toRefs(invDefs) || new LAbs(this.arg, this.term.toRefs(invDefs));
  }
}

let varIdx = 0;

class LVar extends LTerm {
  constructor(term) {
    super(term);
    this.name = term;
  }
  bind(bindings) {
    this.bound = bindings[this.name];
    return this;
  }
  toStr(mode) {
    return this.name;
  }
  betaStep(ctx) {
    return this;
  }
  subst(arg, term) {
    if (this.bound === arg) return term;
    return this;
  }
  asDb(nestMap = new Map()) {
    const l1 = nestMap.get('level');
    const l0 = nestMap.get(this.bound);
    return l1 - l0 + 1;
  }
  toRefs(invDefs) {
    return this;
  }
}

class LApp extends LTerm {
  constructor(f, x) {
    super();
    this.f = f;
    this.x = x;
  }
  bind(bindings) {
    return new LApp(this.f.bind(bindings), this.x.bind(bindings));
  }
  toStr(mode) {
    let fs = this.f.toStr(mode);
    let xs = this.x.toStr(mode);
    if (this.f instanceof LAbs) fs = `(${fs})`;
    if (mode === 'js' || this.x instanceof LAbs || this.x instanceof LApp) xs = `(${xs})`;
    return [fs, xs].join(mode === 'js' ? '' : ' ');
  }
  betaStep(ctx) {
    const from = this.toStr('hs');
    if (this.f instanceof LAbs) {
      const res = this.f.apply(this.x);
      // console.log(from, '=>', res.toStr('hs'));
      return res;
    }
    const nf = this.f.betaStep(ctx);
    if (nf !== this.f) {
      const res = new LApp(nf, this.x);
      // console.log(from, '=>', res.toStr('hs'));
      return res;
    }
    const nx = this.x.betaStep(ctx);
    if (nx !== this.x) {
      const res = new LApp(nf, nx);
      // console.log(from, '=>', res.toStr('hs'));
      return res;
    }
    // console.log(from, '=> SAME!');
    return this;
  }
  subst(arg, term) {
    const nf = this.f.subst(arg, term);
    const nx = this.x.subst(arg, term);
    if (this.f !== nf || this.x !== nx) return new LApp(nf, nx);
    return this;
  }
  asDb(nestMap) {
    return '(' + this.f.getDbx(nestMap) + ',' + this.x.getDbx(nestMap) + ')';
  }
  toRefs(invDefs) {
    return super.toRefs(invDefs) || new LApp(this.f.toRefs(invDefs), this.x.toRefs(invDefs));
  }
}

class LRef extends LTerm {
  constructor(term) {
    super();
    this.name = term;
  }
  toStr(mode) {
    return this.name;
  }
  bind(bindings) {
    if (bindings[this.name]) return bindings[this.name];
    throw new Error('Undefined ref: ' + this.name);
  }
}

class LUnknown extends LTerm {
}

export function classify(term) {
  if (term instanceof LTerm) return term;
  // console.log('classifying', JSON.stringify(term));
  switch(termKind(term)) {
    case 'abs': {
      for (const arg in term) {
        return new LAbs(new LVar(arg), classify(term[arg]));
      }
    }
    case 'var': return new LVar(term);
    case 'ref': return new LRef(term);
    case 'app': return new LApp(classify(term[0]), classify(term[1]));
    default: return new LUnknown(term);
  }
}

export function termKind(term) {
  if (typeof term === 'string') {
    return term.match(/^[A-Z_]/) ? 'ref' : 'var';
  }
  if (typeof term === 'object') {
    if (Array.isArray(term)) {
      return 'app';
    }
    for (const arg in term) {
      return 'abs';
    }
  }
  return '?';
}

export function stringifyJsLike(term) {
  const ss = term => {
    const tk = termKind(term);
    switch(tk) {
      case 'app':
        const [t1, t2] = term;
        const tk1 = termKind(t1);
        if (tk1 in {abs: 1}) {
          return `(${ss(t1)})(${ss(t2)})`;
        } else {
          return `${ss(t1)}(${ss(t2)})`;
        }
      case 'abs':
        for (const arg in term) {
          return `${arg} => ${ss(term[arg])}`;
        }
      default:
        return term;
    }
  }
  return ss(term);
}

export function stringifyHsLike(term) {
  const ss = term => {
    const tk = termKind(term);
    switch(tk) {
      case 'app':
        const [t1, t2] = term;
        let ts1 = ss(t1);
        if (termKind(t1) in {abs: 1}) ts1 = `(${ts1})`;
        let ts2 = ss(t2);
        if (termKind(t2) in {abs: 1, app: 1}) ts2 = `(${ts2})`;
        return `${ts1} ${ts2}`;
      case 'abs':
        for (const arg in term) {
          return `\\${arg} -> ${ss(term[arg])}`;
        }
      default:
        return term;
    }
  }
  return ss(term);
}
