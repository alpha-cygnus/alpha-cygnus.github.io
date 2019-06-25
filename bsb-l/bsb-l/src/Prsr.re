module BR = Belt.Result;

type t('t, 'r) = Strm.mapper('t, 'r);

let parse = Strm.map;

let err: string => Strm.res('r) = s => BR.Error(Err.make(s));
let err2: (Err.t, Err.t) => Strm.res('r) = (e1, e2) => BR.Error(Err.concat(e1, e2));

let for_res: ('t => Strm.res('r)) => t('t, 'r) =
  (pred, inp) =>
    switch (Strm.peek(inp)) {
    | Some(t) => (pred(t), Strm.next(inp))
    | None =>
      switch (Strm.get_err(inp)) {
      | Some(e) => (Error(e), inp)
      | None => (err("unexpected end of input"), inp)
      }
    };
let iif: ('t => bool) => t('t, 't) = pred => for_res(t => pred(t) ? Ok(t) : err("unexpected"));
let if_opt: ('t => option('r)) => t('t, 'r) =
  f =>
    for_res(t =>
      switch (f(t)) {
      | Some(r) => Ok(r)
      | None => err("unexpected")
      }
    );
let eq = t => iif(tt => tt == t);

let eos: 'r => t('t, 'r) =
  (r, inp) =>
    switch (Strm.peek(inp)) {
    | None =>
      switch (Strm.get_err(inp)) {
      | Some(e) => (Error(e), inp)
      | None => (Ok(r), inp)
      }
    | _ => (err("EOS expected"), inp)
    };

let var: (t('t, 'r), t('t, 'r)) => t('t, 'r) =
  (p1, p2, inp) =>
    switch (p1(inp)) {
    | (Error(e1), _) =>
      switch (p2(inp)) {
      | (Error(e2), _) => (err2(e1, e2), inp)
      | ok => ok
      }
    | ok => ok
    };

let seq: (t('t, 'r1), t('t, 'r2)) => t('t, 'r3) =
  (p1, p2, inp) =>
    switch (p1(inp)) {
    | (Ok(r1), n1) =>
      switch (p2(n1)) {
      | (Ok(r2), n2) => (Ok((r1, r2)), n2)
      | (Error(e), n2) => (Error(e), n2)
      }
    | (Error(e), n1) => (Error(e), n1)
    };

let map: ('r1 => 'r2, t('t, 'r1)) => t('t, 'r2) =
  (f, p, inp) =>
    switch (p(inp)) {
    | (Ok(r), n) => (Ok(f(r)), n)
    | (Error(e), n) => (Error(e), n)
    };

let map_e: (string, t('t, 'r)) => t('t, 'r) =
  (e, p, inp) =>
    switch (p(inp)) {
    | (Error(_), n) => (err(e), n)
    | ok => ok
    };

let rec rep: t('t, 'r) => t('t, list('r)) =
  (p, inp) =>
    switch (p(inp)) {
    | (Error(_), _) => (Ok([]), inp)
    | (Ok(r), n) =>
      switch (rep(p, n)) {
      | (Ok(tail), n2) => (Ok([r, ...tail]), n2)
      | (Error(e), n2) => (Error(e), n2)
      }
    };
let opt: t('t, 'r) => t('t, option('r)) =
  (p, inp) =>
    switch (p(inp)) {
    | (Error(_), _) => (Ok(None), inp)
    | (Ok(r), n) => (Ok(Some(r)), n)
    };

module Infix = {
  let (>>) = seq;
  let (>>=) = (p, f) => map(f, p);
  let (>>!) = (p, e) => map_e(e, p);
  let ( *> ) = (p1, p2) => p1 >> p2 >>= fst;
  let ( <* ) = (p1, p2) => p1 >> p2 >>= snd;
  let (<|>) = var;
};

open Infix;

let rep1: t('t, 'r) => t('t, list('r)) = p => p >> rep(p) >>= (((h, t)) => [h, ...t]);
