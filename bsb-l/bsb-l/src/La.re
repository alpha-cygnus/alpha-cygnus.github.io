type lv = string;
type la =
  | LApp(la, la)
  | LAbs(lv, la)
  | LVar(lv);

module BSS = Belt.Set.String;

let rec lshow: la => string =
  la =>
    switch (la) {
    | LAbs(x, t) => "Abs(" ++ x ++ ", " ++ lshow(t) ++ ")"
    | LApp(l, r) => "App(" ++ lshow(l) ++ ", " ++ lshow(r) ++ ")"
    | LVar(n) => n
    };

module Basic = {
  let rec frees: la => BSS.t =
    la =>
      switch (la) {
      | LVar(n) => BSS.fromArray([|n|])
      | LAbs(n, t) => BSS.remove(frees(t), n)
      | LApp(l, r) => BSS.union(frees(l), frees(r))
      };

  let nextName: string => string = s => s ++ "_";

  let rec makeUniq: (string, BSS.t) => string = (s, set) => BSS.has(set, s) ? makeUniq(nextName(s), set) : s;

  let rec subst: (la, lv, la) => la =
    (la, x, r) =>
      switch (la) {
      | LVar(y) => y == x ? r : la
      | LApp(l, r) => LApp(subst(l, x, r), subst(r, x, r))
      | LAbs(y, t) => y == x ? la : LAbs(makeUniq(y, frees(r)), subst(t, x, r))
      };

  type isSame('a) =
    | Same('a)
    | Changed('a);

  type stepFun = la => isSame(la);

  let rec betaStep: stepFun =
    la =>
      switch (la) {
      | LVar(_) => Same(la)
      | LApp(LAbs(x, t), r) => Changed(subst(t, x, r))
      | LApp(l, r) =>
        switch (betaStep(l)) {
        | Same(l) =>
          switch (betaStep(r)) {
          | Same(_) => Same(la)
          | Changed(r) => Changed(LApp(l, r))
          }
        | Changed(l) => Changed(LApp(l, r))
        }
      | LAbs(x, t) =>
        switch (betaStep(t)) {
        | Same(_) => Same(la)
        | Changed(t) => Changed(LAbs(x, t))
        }
      };

  let etaStep: stepFun =
    la =>
      switch (la) {
      | LAbs(x, LApp(f, LVar(y))) => x == y && !BSS.has(frees(f), x) ? Changed(f) : Same(la)
      | _ => Same(la)
      };

  let rec reduce: (la, list(stepFun), int) => la =
    (la, fs, max) => {
      max > 0
        ? {
          let nla =
            List.fold_left(
              (a, sf) =>
                switch (a) {
                | Changed(_) => a
                | Same(la) => sf(la)
                },
              Same(la),
              fs,
            );
          switch (nla) {
          | Same(la) => la
          | Changed(la) => reduce(la, fs, max - 1)
          };
        }
        : la;
    };
};

module Parser = {
  let string_of_chars = chars => String.concat("", List.map(String.make(1), chars));

  module P = Prsr;

  open P.Infix;

  type token =
    | EOL
    | VAR(string)
    | LAMBDA
    | DOT
    | OPEN
    | CLOSE;

  let tSPACE = P.eq(' ');
  let tSPACES = P.rep(tSPACE);
  let tTrim = p => tSPACES <* p *> tSPACES;

  let tChar: (char, token) => P.t(char, token) =
    (c, t) => P.eq(c) >>= (_ => t) >>! "'" ++ String.make(1, c) ++ "' expected" |> tTrim;

  let tOPEN = tChar('(', OPEN);
  let tCLOSE = tChar(')', CLOSE);
  let tDOT = tChar('.', DOT);
  let tLAMBDA = tChar('\\', LAMBDA);
  let tLETTER = P.iif(c => c >= 'a' && c <= 'z');
  let tDIGIT = P.iif(c => c >= '0' && c <= '9');
  let tVAR =
    tLETTER
    >> P.rep(tLETTER <|> tDIGIT)
    >>= (((f, t)) => VAR(string_of_chars([f, ...t])))
    >>! "VAR expected"
    |> tTrim;
  let tEOL = P.eos(EOL);

  let tokens = tVAR <|> tLAMBDA <|> tDOT <|> tOPEN <|> tCLOSE <|> tEOL;

  let rLAMBDA = P.eq(LAMBDA) >>! "lambda expected";
  let rOPEN = P.eq(OPEN) >>! "( expected";
  let rCLOSE = P.eq(CLOSE) >>! ") expected";
  let rDOT = P.eq(DOT) >>! "dot expected";
  let rVAR =
    P.if_opt(t =>
      switch (t) {
      | VAR(n) => Some(n)
      | _ => None
      }
    )
    >>! "VAR expected";

  let rec r_lambda = inp => {
    let m = ((ns, rhs)) => List.fold_right((n, r) => LAbs(n, r), ns, rhs);
    let p = rLAMBDA <* P.rep1(rVAR) *> rDOT >> r_expr;
    inp |> (p >>= m);
  }
  and r_sub = inp => {
    inp |> (rOPEN <* r_expr *> rCLOSE);
  }
  and r_var = rVAR >>= (v => LVar(v))
  and r_prim = inp => {
    inp |> (r_sub <|> r_lambda <|> r_var);
  }
  and r_expr = inp => {
    let r = (acc, la) =>
      switch (acc) {
      | LVar("") => la
      | lb => LApp(lb, la)
      };
    let m = List.fold_left(r, LVar(""));
    inp |> (P.rep1(r_prim) >>= m);
  };

  let parser = r_expr; // *> P.eos(None);

  let show: P.t(la, string) = P.for_res(la => Belt.Result.Ok(lshow(la)));
};

module Exec = {
  /*module StringMap = Map.Make(String);*/
  module C = Belt.Map.String;
  type ctx = C.t(la);
  /*type lax = (la, ctx);*/

  type redStep = (la, ctx, int) => (la, ctx, int);

  let rec subst: (la, ctx) => la =
    (la, ctx) =>
      switch (la) {
      | LAbs(x, r) => subst(r, C.remove(ctx, x))
      | LApp(f, x) => LApp(subst(f, ctx), subst(x, ctx))
      | LVar(x) =>
        switch (C.get(ctx, x)) {
        | Some(v) => v
        | None => LVar(x)
        }
      };

  let rec norm1 = (la, i) =>
    switch (la) {
    | LApp(LAbs(x, r), t) => (subst(r, C.set(C.empty, x, t)), i - 1)
    | LApp(f, x) =>
      let (l1, i1) = norm(f, i);
      i1 < i
        ? (LApp(l1, x), i1)
        : {
          let (l2, i2) = norm(x, i);
          (LApp(f, l2), i2);
        };
    | _ => (la, i)
    }
  and norm = (la, i) =>
    i <= 0
      ? (la, i)
      : {
        let (l1, i1) = norm1(la, i);
        norm(l1, i1);
      };

  let rec beta1: redStep =
    (la, ctx, i) =>
      i <= 0
        ? (la, ctx, i)
        : (
          switch (la) {
          | LApp(LAbs(x, r), t) => (r, Belt.Map.String.set(ctx, x, t), i - 1)
          | LApp(f, x) =>
            let (l1, _, i1) = beta(f, ctx, i);
            let (l2, _, i2) = beta(x, ctx, i1);
            (LApp(l1, l2), ctx, i2);
          | LVar(x) =>
            switch (Belt.Map.String.get(ctx, x)) {
            | Some(la) => (la, ctx, i - 1)
            | None => (la, ctx, i)
            }
          | _ => (la, ctx, i)
          }
        )
  and beta = (la, ctx, i) =>
    i <= 0
      ? (la, ctx, i)
      : {
        let (l1, c1, i1) = beta1(la, ctx, i);
        beta(l1, c1, i1);
      };
};
