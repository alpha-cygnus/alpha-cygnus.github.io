const NOTES = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const DEF_CMD = 'V';

export function parsePtnTxt(txt) {
  function parsePtn(ptn) {
    return ptn.split('\n').filter(Boolean).map(parseRow);
  }
  function parseRow(row) {
    return row.split('|').map(parseCell);
  }
  function parseCell(cell) {
    const [note, ins, ...cmds] = cell.split(' ');
    return {
      note: parseNote(note),
      ins: parseIns(ins),
      cmds: cmds.map(parseCmd).filter(Boolean),
    }
  }
  function parseNote(note) {
    note = note.replace(/\./g, '');
    if (!note) return null;
    const m = note.match(/^([a-g])(-|#|b)?(\d)$/i);
    if (!m) throw new Error(`invalid note ${note}`);
    let n = m[1];
    n = n.toUpperCase();
    n = NOTES[n];
    if (m[2] === '#') n++;
    if (m[2] === 'b') n--;
    n += parseInt(m[3])*12;
    return n;
  }
  function parseIns(ins) {
    ins = ins.replace(/\./g, '');
    if (!ins) return null;
    const m = ins.match(/^(\d\d?\d?)$/);
    if (!m) throw new Error(`invalid ins ${ins}`);
    return parseInt(ins);
  }
  function parseCmd(cmd) {
    cmd = cmd.replace(/\./g, '');
    if (!cmd) return null;
    const m = cmd.match(/^([a-z])?([a-f0-9]{1,4})/i);
    if (!m) throw new Error(`invalid cmd ${cmd}`);
    return [m[1] || DEF_CMD, m[2].split('').map(c => parseInt(c, 16))];
  }
  return parsePtn(txt);
}
