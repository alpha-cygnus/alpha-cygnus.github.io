import Html exposing (..)
import Html.Events exposing (..)
import Html.Attributes exposing (..)
import Random
import List exposing (..)
import Array exposing (..)

stylesheet =
  node "link"
    [ attribute "rel"       "stylesheet"
    , attribute "property"  "stylesheet"
    , attribute "href"      "0.css"
    ]
  []

main : Program Never Model Msg
main =
  Html.program
    { init = init
    , view = view
    , update = update
    , subscriptions = subscriptions
    }

-- MODEL
type alias Field = {w: Int, h: Int, rows: Array Row}
type alias Row = Array Cell
type alias Cell = {bomb: Bool, flag: Bool, count: Int, open: Bool}
type alias Model =
  {
    w: Int,
    h: Int,
    b: Int,
    field: Field,
    err: String
  }

changeElem : Int -> (e -> e) -> Array e -> Array e
changeElem i changer arr =
  case Array.get i arr of
    Just e -> Array.set i (changer e) arr
    Nothing -> arr

newCell bomb = {flag = False, count = 0, bomb = bomb, open = False}
newField w h = {w = w, h = h, rows = Array.repeat h <| Array.repeat w <| newCell False}
changeCell : Int -> Int -> (Cell -> Cell) -> Field -> Field
changeCell x y changer field = let
    changeRows = changeElem y (changeElem x changer)
  in {field | rows = changeRows field.rows}
getCell : Int -> Int -> Field -> Maybe Cell
getCell x y {rows} =
  case Array.get y rows of
    Just row -> Array.get x row
    Nothing -> Nothing
putBomb : Int -> Int -> Field -> Field
putBomb x y field = field
  |> changeCell x y (\c -> {c | bomb = True}) 
  |> changeCell (x + 1) (y + 1) (\c -> {c | count = c.count + 1})
  |> changeCell (x + 1) (y - 1) (\c -> {c | count = c.count + 1})
  |> changeCell (x - 1) (y - 1) (\c -> {c | count = c.count + 1})
  |> changeCell (x - 1) (y + 1) (\c -> {c | count = c.count + 1})
  |> changeCell (x + 1) y (\c -> {c | count = c.count + 1})
  |> changeCell (x - 1) y (\c -> {c | count = c.count + 1})
  |> changeCell x (y + 1) (\c -> {c | count = c.count + 1})
  |> changeCell x (y - 1) (\c -> {c | count = c.count + 1})

  

-- randomizeField w h = Random.generate 
--   (\rows -> SetField {w = w, h = h, rows = rows})
--   (Random.list h (Random.list w (Random.map (\bomb -> newCell bomb) Random.bool)))

init : (Model, Cmd Msg)
init =
  ({w = 10, h = 10, b = 20, field = newField 10 10, err = ""}, Cmd.none)

-- UPDATE
type Msg
  = InitField
  | SetField Field
  | SetH Int
  | SetW Int
  | SetB Int
  | SetErr String
  | SetBomb Int (Int, Int)
  | SetBombs Int
  | OpenCell Int Int

setIntFromString : (String -> Msg) -> (Int -> Msg) -> String -> Msg
setIntFromString eSetter setter s =
  case String.toInt s of
    Err s -> eSetter s
    Ok n -> setter n

setRndBombs : Field -> Int -> Cmd Msg
setRndBombs {w, h} n =
  if n > 0 then
    Random.generate (SetBomb (n - 1)) (Random.pair (Random.int 0 (w - 1)) (Random.int 0 (h - 1)))
  else
    Cmd.none

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    InitField -> ({model | field = newField model.w model.h}, setRndBombs model.field model.b)
    SetField newField -> ({model | field = newField}, Cmd.none)
    SetW w -> ({model | w = w, err = ""}, Cmd.none)
    SetH h -> ({model | h = h, err = ""}, Cmd.none)
    SetB b -> ({model | b = b, err = ""}, Cmd.none)
    SetErr err -> ({model | err = err}, Cmd.none)
    SetBombs n -> (model, setRndBombs model.field n)
    SetBomb n (x, y) -> case getCell x y model.field of
      Just {bomb} ->
        if bomb then
          (model, setRndBombs model.field n) -- try again
        else
          ({model | field = putBomb x y model.field}, setRndBombs model.field (n - 1))
      Nothing -> (model, Cmd.none)
    OpenCell x y -> ({model | field = changeCell x y (\c -> {c | open = True}) model.field}, Cmd.none)

-- SUBSCRIPTIONS
subscriptions : Model -> Sub Msg
subscriptions model =
  Sub.none

-- VIEW
-- table = node "table"
-- tr = node "tr"
-- td = node "td"

showField : Field -> Html Msg
showField {w, h, rows} = let
    showRow y = Array.indexedMap (showCell y) >> Array.toList >> div []
    showCell y x {open, flag, bomb, count} =
      let
        content = if open then (if bomb then "x" else toString count) else "."
        attrs =
          (if open then [class "open"] else [class "closed", class <| if flag then "flag" else ""])
            ++ (if bomb then [class "bomb"] else [])
      in
        span (attrs ++ [onClick <| OpenCell x y, class ("count-" ++ toString count)]) [text content]
  in div [class "field", width (w*22), height (h*22)] <| Array.toList <| Array.indexedMap showRow rows

view : Model -> Html Msg
view model = let
    br = node "br" [] []
    intField na getter setter = div [] [
      text (na ++ "="), input [type_ "text", name na, class "int", onInput (setIntFromString SetErr setter), value (toString (getter model))] []
    ]
  in
    div []
      [ stylesheet
      , div [class "main"]
        [ h1 [] [text "MS"]
        , intField "w" .w SetW
        , intField "h" .h SetH
        , intField "b" .b SetB
        , button [ onClick InitField ] [ text "init" ]
        , showField model.field
        , div [class "error"] [text model.err]
        ]
      ]
