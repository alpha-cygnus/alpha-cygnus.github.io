const eat1 = s => s.slice(1);
function eatWhite(s) {
  while (s.match(/^\s/)) s = eat1(s);
  return s;
}
function parseXMLLike(s) {
  s = eatWhite(s);
  
}