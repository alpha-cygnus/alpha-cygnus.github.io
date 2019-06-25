type t = list(string);

let make: string => t = e => [e];

let concat: (t, t) => t = (e1, e2) => List.append(e1, e2);

let show: t => string = e => String.concat(" or ", e);
