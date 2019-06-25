Js.log(
  "\\x y z.x y \z" |> Strm.from_string |> Prsr.parse(La.Parser.tokens) |> Prsr.parse(La.Parser.parser) |> Prsr.parse(La.Parser.show) |> Strm.to_log,
);

open Tea;

type model = {
  hello: string,
};

let init = {
  hello: "world",
}

type msg =
| Nothing;

let update = (model, msg) => switch(msg) {
| Nothing => {...model, hello: model.hello ++ "?"}
}

let view = model => Html.(<h1 onClick=Nothing>"HELLO, " model.hello->text "."</h1>)

let main = App.beginnerProgram({model: init, update, view});
