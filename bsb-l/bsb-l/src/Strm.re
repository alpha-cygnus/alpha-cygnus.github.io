type err = Err.t;

module Loc = {
  type pos = int;
  type t = {
    p0: pos,
    p1: pos,
  };
  let make = (p0, p1) => {p0, p1};
  let show_pos = string_of_int;
  let show = l =>
    switch (l) {
    | {p0, p1} => p0 == p1 ? show_pos(p0) : show_pos(p0) ++ "--" ++ show_pos(p1)
    };
  let make2: (t, t) => t = (l1, l2) => make(l1.p0, l2.p0);
};

type state('a) =
  | Next('a, unit => t('a))
  | End
  | Err(err)
and t('a) = (state('a), Loc.t);

let get_state: t('t) => state('t) = fst;
let get_loc: t('t) => Loc.t = snd;
let make: (state('t), Loc.t) => t('t) = (s, l) => (s, l);

module BR = Belt.Result;

type res('r) = BR.t('r, err);

type mapper('t, 'r) = t('t) => (res('r), t('t));

let from_string: string => t(char) =
  s => {
    let len = String.length(s);
    let rec next: (string, int) => t(char) =
      (s, i) => {
        i >= len ? make(End, Loc.make(i, i)) : make(Next(s.[i], () => next(s, i + 1)), Loc.make(i, i + 1));
      };
    next(s, 0);
  };

let rec to_log: t('r) => unit =
  inp =>
    switch (inp) {
    | (Next(x, next), loc) =>
      Js.log2(x, Loc.show(loc));
      to_log(next());
    | (End, _) => ()
    | (Err(e), loc) => Js.log2(Err.show(e), " at position " ++ Loc.show(loc))
    };
let rec to_list: t('r) => list('r) =
  inp =>
    switch (get_state(inp)) {
    | Next(x, next) => [x, ...to_list(next())]
    | _ => []
    };

let peek: t('t) => option('t) =
  s =>
    switch (get_state(s)) {
    | Next(x, _) => Some(x)
    | _ => None
    };

let next: t('t) => t('t) =
  s =>
    switch (get_state(s)) {
    | Next(_, next) => next()
    | _ => s
    };

let get_err: t('t) => option(err) =
  s =>
    switch (get_state(s)) {
    | Err(e) => Some(e)
    | _ => None
    };

let rec map: (mapper('t, 'r), t('t)) => t('r) =
  (p, inp) =>
    switch (get_state(inp)) {
    | Next(_, _) =>
      switch (p(inp)) {
      | (Ok(r), next) => make(Next(r, () => map(p, next)), Loc.make2(get_loc(inp), get_loc(next)))
      | (Error(e), next) => make(Err(e), Loc.make2(get_loc(inp), get_loc(next)))
      }
    | End => make(End, get_loc(inp))
    | Err(e) => make(Err(e), get_loc(inp))
    };
