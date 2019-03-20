class LTerm {
  constructor(term) {
    //this.term = term;
  }
  bind(v, dbx) {
    return this;
  }
  asDB() {
    return '?';
  }
}

class LAbs extends LTerm {
  constructor(term) { // : LVar, LTerm
    super(term);
    for (const arg in term) {
      this.arg = arg;
      //this.arg.bound = true;
      this.term = classify(term[arg]).bind(new LVar(arg), 1);
    }
  }
  bind(v, dbx) {
    if (this.arg.name === v.name) return this;
    this.term = this.term.bind(v, dbx + 1);
    return this;
  }
  asDB() {
    return 'λ ' + this.term.asDB();
  }
}

let varIdx = 0;

class LVar extends LTerm {
  constructor(term) {
    super(term);
    this.name = term;
    //this.bound = null;
    //this.idx = varIdx++;
  }
  bind(v, dbx) {
    if (v.name === this.name) this.dbx = dbx;
    return this;
  }
  asDB() {
    return this.dbx;
  }
}

class LApp extends LTerm {
  constructor(term) {
    super(term);
    this.f = classify(term[0]);
    this.x = classify(term[1]);
  }
  bind(v, dbx) {
    this.f = this.f.bind(v, dbx);
    this.x = this.x.bind(v, dbx);
    return this;
  }
  asDB() {
    let fs = this.f.asDB();
    let xs = this.x.asDB();
    if (this.f instanceof LAbs) fs = `(${fs})`;
    if (this.x instanceof LAbs) xs = `(${xs})`;
    if (this.x instanceof LApp) xs = `(${xs})`;
    return `${fs} ${xs}`;
  }
}

class LRef extends LTerm {
  constructor(term) {
    super(term);
    this.name = term;
  }
}

class LUnknown extends LTerm {
}

export function classify(term) {
  if (term instanceof LTerm) return term;
  // console.log('classifying', JSON.stringify(term));
  switch(termKind(term)) {
    case 'abs': return new LAbs(term);
    case 'var': return new LVar(term);
    case 'ref': return new LRef(term);
    case 'app': return new LApp(term);
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
