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
  betaStep() {
    return this;
  }
  toStr(mode, uncurry) {
    return '?';
  }
  asDb(nestMap = new Map()) {
    //throw new Error('Wrong way!');
    return '???';
  }
  getDbx(nestMap = new Map()) {
    if (!this.dbx) this.dbx = this.asDb(nestMap);
    return this.dbx;
  }
  toRefs(invDefs) {
    if (!this.dbx) this.getDbx();
    const ref = invDefs[this.dbx];
    if (ref) return new LRef(ref);
  }
  revar(vars) {
    return this;
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
  toStr(mode, uncurry) {
    const pref = {
      'js': args => (args.length > 1 ? '(' + args.join(', ') + ')' : args[0]) + ' => ',
      'hs': args => '\\' + args.join(' ') + ' -> ',
      'lc': args => 'λ' + args.join(' ') + '. ',
    }[mode];
    let args = [this.arg.name];
    let term = this.term;
    while (uncurry && term instanceof LAbs) {
      args.push(term.arg.name);
      term = term.term;
    }
    return pref(args) + term.toStr(mode, uncurry);
  }
  betaStep() {
    const nt = this.term.betaStep();
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
    return super.toRefs(invDefs) || this.change(this.arg, this.term.toRefs(invDefs));
  }
  change(na, nt) {
    if (na === this.arg && nt === this.term) return this;
    return new LAbs(na, nt);
  }
  revar(vars) {
    // let nn = this.arg.name;
    // while (vars[nn]) nn += "'";
    // this.arg.name = nn;
    return this.change(this.arg, this.term.revar({...vars, [this.arg.name]: this.arg}));
  }
}

let varIdx = 0;

class LVar extends LTerm {
  constructor(name) {
    super();
    this.name = name;
  }
  bind(bindings) {
    const bound = bindings[this.name];
    if (bound) return bound;
    // this.bound = ;
    return this;
  }
  toStr(mode, uncurry) {
    return this.name;
  }
  betaStep(ctx) {
    return this;
  }
  subst(arg, term) {
    if (this === arg) return term;
    //if (this.bound === arg) return term;
    return this;
  }
  asDb(nestMap = new Map()) {
    const l1 = nestMap.get('level');
    const l0 = nestMap.get(this); //.bound);
    return l1 - l0 + 1;
  }
  toRefs(invDefs) {
    return this;
  }
  revar(vars) {
    if (vars[this.name] && vars[this.name] !== this) {
      let nn = this.name;
      while (vars[nn]) nn += "'";
      this.name = nn;
    } else {
      vars[this.name] = this;
    }
    return this;
  }
}

class LArg extends LVar {}

class LApp extends LTerm {
  constructor(f, x) {
    super();
    this.f = f;
    this.x = x;
  }
  bind(bindings) {
    return new LApp(this.f.bind(bindings), this.x.bind(bindings));
  }
  toStr(mode, uncurry) {
    let ff = this.f;
    const xx = [this.x];
    while (uncurry && ff instanceof LApp) {
      xx.unshift(ff.x);
      ff = ff.f;
    }
    let ffs = ff.toStr(mode, uncurry);
    if (ff instanceof LAbs) ffs = `(${ffs})`;
    return mode === 'js'
      ? ffs + '(' + xx.map(x => x.toStr(mode, uncurry)).join(', ') + ')'
      : ffs + ' ' + xx.map(x => (x instanceof LAbs || x instanceof LApp) ? '(' + x.toStr(mode, uncurry) + ')' : x.toStr(mode, uncurry)).join(' ');
    // let fs = this.f.toStr(mode);
    // if (this.f instanceof LAbs) fs = `(${fs})`;
    // let xs = this.x.toStr(mode);
    // if (mode === 'js' || this.x instanceof LAbs || this.x instanceof LApp) xs = `(${xs})`;
    // return [fs, xs].join(mode === 'js' ? '' : ' ');
  }
  betaStep() {
    const from = this.toStr('hs');
    if (this.f instanceof LAbs) {
      const res = this.f.apply(this.x);
      // console.log(from, '=>', res.toStr('hs'));
      return res;
    }
    const nf = this.f.betaStep();
    if (nf !== this.f) {
      const res = new LApp(nf, this.x);
      // console.log(from, '=>', res.toStr('hs'));
      return res;
    }
    const nx = this.x.betaStep();
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
    return super.toRefs(invDefs) || this.change(this.f.toRefs(invDefs), this.x.toRefs(invDefs));
  }
  change(nf, nx) {
    if (nf === this.f && nx === this.x) return this;
    return new LApp(nf, nx);
  }
  revar(vars) {
    return this.change(this.f.revar(vars), this.x.revar(vars));
  }
}

class LRef extends LTerm {
  constructor(term) {
    super();
    this.name = term;
  }
  toStr(mode, uncurry) {
    return this.name;
  }
  bind(bindings) {
    if (bindings[this.name]) return bindings[this.name];
    throw new Error('Undefined ref: ' + this.name);
  }
  asDb() {
    return this.name;
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
        return new LAbs(new LArg(arg), classify(term[arg]));
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
