import {h, html, useState, useEffect, useRef, useCallback} from './common.js';
import {Test0, key2Note} from './audio.js';
import {KLensProvider, useKLens, find, idx, prop, tuple, INSERT, DELETE} from './k-lens.js';


const appState = {
  songs: [
    {
      name: 'name',
      patterns: [
        {
          name: 'ptn1',
          rows: 64,
          cols: 8,
          data: [
            [
              {note: 60, ins: 0}, {}, {note: 62, ins: 0}, {},
              {note: 64, ins: 0}, {}, {note: 66, ins: 0}, {},
              {note: 68, ins: 0}, {}, {note: 70, ins: 0}, {},
              {note: 72, ins: 0}, {}, {note: 74, ins: 0}, {},
            ],
            [],
            [],
            [],
          ],
        },
      ],
      patches: [
        {
          name: 'patch1',
          type: 'Synth',
          nodes: {
            o1: {
              type: 'Osc',
              params: {
                type: 'saw',
                freq: 440,
              },
            },
            gain1: {
              type: 'Gain',
              params: {
                gain: 0,
              },
            },
          },
          matrix: [
            ['inDetune', 'o1.detune'],
            ['inGate', 'gain1.gain'],
            ['o1', 'gain1'],
            ['gain1', 'outAudio'],
          ],
        }
      ],
    },
  ],
  app: {
    tab: 'pattern',
    song: 'name',
    pattern: {
      name: 'ptn1',
      cursor: [1, 2, 3], // row, col, cell-pos
    },
    ins: 0,
    patch: 'patch1',
    octShift: 5,
  },
};

function Hello({what, children, ...props}) {
  const [playing, setPlaying] = useState(false);
  return html`
  <div>
    <span ...${props}>Hello, ${what}</span>
    <div
      style=${{background: playing ? 'green' : 'yellow'}}
      onClick=${() => setPlaying(!playing)}
    >PLAY</div>
    ${playing && children}
  </div>
  `;
}

window.HTML = html;
window.H = h;

const klApp = 'app';
const klSelectedTab = [klApp, 'tab'];
const klSelectedSong = [klApp, 'song'];
const klSelectedPattern = [klApp, 'pattern', 'name'];
const klSelectedPatch = [klApp, 'patch'];
const klSelectedIns = [klApp, 'ins'];
const klOctShift = [klApp, 'octShift'];

const klPatternCursor = [klApp, 'pattern', 'cursor'];

export function TopTab({caption, id}) {
  const [selected, setSelected] = useKLens(klSelectedTab);
  return html`
    <div
      class="top-tab ${selected === id ? 'selected' : ''}"
      onClick=${() => setSelected(id)}
    >${caption}</div>
  `;
}

export function Top() {
  return html`
  <div class="top">
    <${TopTab} caption="Song" id="song"/>
    <${TopTab} caption="Pattern" id="pattern"/>
    <${TopTab} caption="Patch" id="patch"/>
  </div>
  `;
}

export function Bottom() {
  const [cur] = useKLens(klPatternCursor);
  const [oct] = useKLens(klOctShift);
  return html`
    <div class="bottom">
      ${JSON.stringify({cur, oct})}
    </div>
  `;
}

export function UnknownMain() {
  return html`Not found`;
}

export function UnknownLeft() {
  return html`Not found`;
}

export function UnknownRight() {
  return html`Not found`;
}

const klFindByName = (byName) => find(({name}) => name === byName);

const klSongs = 'songs';
const klSongByName = (songName) => [klSongs, klFindByName(songName)];
const klPatterns = 'patterns';
const klPatches = 'patches';

const noteToString = (n) => n
  ? `${['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'][n%12]}${Math.floor(n/12)%10}`
  : (n === 0 ? '===' : '...');

const cmdToString = (cmd) => '...';

const withCursor = (ci, strs) => strs.map((s, i) => html`<span class="${ci === i ? 'cursor' : ''}">${s}</span>`);

export const klPData = prop('data', []);
export const klPCol = (col) => idx(col, []);
export const klPCell = (row) => idx(row, {});

export const klPatternCell = (klPattern, col, row) =>
  [klPattern, klPData, klPCol(col), klPCell(row)];

export function PatternCell({col, row, klPattern}) {
  const [data] = useKLens(klPatternCell(klPattern, col, row));
  const {note, ins, cmds = []} = data || {};
  const [cur, setCur] = useKLens(klPatternCursor);
  const [cc, cr, cci] = cur;
  const curInCell = cr === row && cc === col;
  const ci = curInCell ? cci : -1;
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && curInCell) {
      ref.current.scrollIntoView({block: 'nearest'});
    }
  }, [curInCell]);
  return html`<div class="cell" ref=${ref}>
    <div class="note" onClick=${() => setCur([col, row, 0])}>${
      withCursor(ci, [noteToString(note)])
    }</div>
    <div class="ins" onClick=${() => setCur([col, row, 1])}>${
      withCursor(ci - 1, (ins == null ? '..' : ins.toString().padStart(2, '0')).split(''))
    }</div>
    <div class="cmd" onClick=${() => setCur([col, row, 3])}>${
      withCursor(ci - 3, cmdToString(cmds[0]).split(''))
    }</div>
    <div class="cmd" onClick=${() => setCur([col, row, 6])}>${
      withCursor(ci - 6, cmdToString(cmds[1]).split(''))
    }</div>
  </div>`;
}

export function PatternCol({col, klPattern}) {
  const [rows] = useKLens(klPattern, 'rows');
  const pRows = [];
  for (let row = 0; row < rows; row++) {
    pRows.push(h(PatternCell, {key: col, row, col, klPattern}))
  }
  return html`<div class="col" style=${{height: (14*rows) + 'px'}}>
    ${pRows}
  </div>`
}

export function PatternIdxCol({klPattern}) {
  const [rows] = useKLens(klPattern, 'rows');
  const pRows = [];
  for (let row = 0; row < rows; row++) {
    pRows.push(html`<div class="idx">${row.toString(16).padStart(2, '0').toUpperCase()}</div>`)
  }
  return html`<div class="idx-col" style=${{height: (14*rows) + 'px'}}>
    ${pRows}
  </div>`
}

const CELL_CUR_POS = 9;

const keyDigit = (key) => key.match(/[0-9]/) ? key.charCodeAt(0) - 48 : -1;
const keyHexDigit = (key) => {
  const d = keyDigit(key);
  if (d >= 0) return d;
  if (key.match(/[A-F]/)) return key.charCodeAt(0) - 97;
  if (key.match(/[A-F]/)) return key.charCodeAt(0) - 65;
  return -1;
};

const klNoteIns = tuple('note', 'ins');

export function PatternCursorMover({klPattern}) {
  const [{rows, cols}] = useKLens(klPattern);
  const [[cc, cr, ci], setCursor] = useKLens(klPatternCursor);
  const klCell = klPatternCell(klPattern, cc, cr);
  const [cell, setCell] = useKLens(klCell);
  const [[note, ins], setNoteIns] = useKLens(klCell, klNoteIns);
  const [sIns] = useKLens(klSelectedIns);
  const [octShift, setOctShift, modOctShift] = useKLens(klOctShift);

  const octInc = useCallback(() => {
    modOctShift(oct => oct < 9 ? oct + 1 : oct);
  }, [modOctShift]);
  const octDec = useCallback(() => {
    modOctShift(oct => oct > 1 ? oct - 1 : oct);
  }, [modOctShift]);

  const deps = [cc, cr, ci, rows, cols, note, ins, octShift];

  const moveUp = useCallback(() => {
    const ncr = cr <= 0 ? 0 : cr - 1;
    setCursor([cc, ncr, ci]);
  }, deps);
  const moveDown = useCallback((nci) => () => {
    const ncr = cr < rows - 1 ? cr + 1 : rows - 1;
    setCursor([cc, ncr, nci ?? ci]);
  }, deps);
  const moveLeft = useCallback(() => {
    const [nci, ncc] = ci > 0
      ? [ci - 1, cc]
      : cc > 0
        ? [CELL_CUR_POS - 1, cc - 1]
        : [ci, cc];
    setCursor([ncc, cr, nci]);
  }, deps);
  const moveRight = useCallback(() => {
    const [nci, ncc] = ci < CELL_CUR_POS - 1
      ? [ci + 1, cc]
      : cc < cols - 1
        ? [0, cc + 1]
        : [ci, cc];
    setCursor([ncc, cr, nci]);
  }, deps);
  const moveLeftCol = useCallback(() => {
    const ncc = cc <= 0 ? 0 : cc - 1;
    setCursor([ncc, cr, ci]);
  }, deps);
  const moveRightCol = useCallback(() => {
    const ncc = cc < cols - 1 ? cc + 1 : cc;
    setCursor([ncc, cr, ci]);
  }, deps);

  useEffect(() => {
    const go = (e, ...cmds) => {
      for (const cmd of cmds) cmd(e);
      e.preventDefault();
      return false;
    };

    const onKeyDown = (e) => {
      let key = e.key;
      if (e.metaKey) key = 'meta-' + key;
      if (e.altKey) key = 'alt-' + key;
      if (e.ctrlKey) key = 'ctrl-' + key;
      switch (key) {
        case 'ArrowLeft': return go(e, moveLeft);
        case 'ctrl-ArrowLeft': return go(e, moveLeftCol);
        case 'ArrowRight': return go(e, moveRight);
        case 'ctrl-ArrowRight': return go(e, moveRightCol);
        case 'ArrowUp': return go(e, moveUp);
        case 'ArrowDown': return go(e, moveDown());
        case 'Insert': return go(e,
          () => setCell(INSERT),
        );
        case 'Delete': return go(e,
          () => setCell(DELETE),
        );
        case '[': return go(e, octDec);
        case ']': return go(e, octInc);
      }
      if (ci === 0) {
        const n = key2Note[key] + octShift * 12 - 60;
        if (n) {
          return go(e, () => setNoteIns([n, ins || sIns]), moveDown());
        }
        if (key === '.') {
          return go(e, () => setNoteIns([null, null]), moveDown());
        }
        if (key === '=') {
          return go(e, () => setNoteIns([0, null]), moveDown());
        }
      }
      if ((ci === 1 || ci === 2) && note) {
        const d = keyDigit(key);
        if (d >= 0) {
          if (ci === 1) {
            return go(e,
              () => setNoteIns([note, (ins ? ins % 10 : 0)  + d * 10]),
              moveRight);
          } else {
            return go(e,
              () => setNoteIns([note, (ins ? Math.floor(ins / 10) : 0)*10 + d]),
              moveDown(1));
          }
        }
        if (key === '.') {
          return go(e,
            () => setNoteIns([null, null]),
            moveDown());
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    }
  }, deps);

  return null;
}

export function PatternMain() {
  const [songName] = useKLens(klSelectedSong);
  const [ptnName] = useKLens(klSelectedPattern);
  const klPattern = [klSongs, klFindByName(songName), klPatterns, klFindByName(ptnName)];
  const [{cols, rows}] = useKLens(klPattern);
  const pCols = [];
  for (let col = 0; col < cols; col++) {
    pCols.push(h(PatternCol, {key: col, col, klPattern}));
  }
  return html`<div class="pattern">
    <${PatternIdxCol} klPattern=${klPattern} />
    <div class="cols" style=${{height: (14*rows) + 'px'}}>
      ${pCols}
    </div>  
    <${PatternCursorMover} klPattern=${klPattern} />
  </div>`;
}

export function PatternLeft() {
  const [songName] = useKLens(klSelectedSong);
  const [ptnName] = useKLens(klSelectedPattern);
  const [patterns = []] = useKLens(klSongByName(songName), klPatterns);
  return html`<div class="pattern-list">
    ${patterns.map((p) => html`
      <div class="pattern-item ${ptnName === p.name ? 'selected' : ''}">
        ${p.name}
      </div>
    `)}
  </div>`;
}

export function PatternRight() {
  const [songName] = useKLens(klSelectedSong);
  const [patches = []] = useKLens(klSongByName(songName), klPatches);
  return html`<div class="patch-list">
    ${patches.map((p) => html`
      <div class="patch-item">
        ${p.name}
      </div>
    `)}
  </div>`;
}

export function MainRow() {
  const [selected] = useKLens(klSelectedTab);
  let [Left, Main, Right] = [UnknownLeft, UnknownMain, UnknownRight];
  if (selected === 'pattern') {
    [Left, Main, Right] = [PatternLeft, PatternMain, PatternRight];
  }
  return html`
    <div class="main-row ${selected}-tab">
      <div class="left"><${Left} /></div>
      <div class="main"><${Main} /></div>
      <div class="right"><${Right} /></div>
    </div>
  `;
}

export function App() {
  return html`
  <${KLensProvider} init=${appState}>
    <div class="app">
      <${Top} />
      <${MainRow} />
      <${Bottom} />
    </div>
  <//>
  `;
}

export default html`
<div>
  <${Hello} what=${'wrld'} style=${{color: 'red'}}><${Test0}/></div>
</div>
`;
