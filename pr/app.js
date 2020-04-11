import {h, html, useState, createContext, useContext} from './common.js';
import {Test0} from './audio.js';
import {ILensProvider, ILensContext, compose, prop, useLens, find} from './ilens.js';
import {useImmer} from './common';


const appState = {
  songs: [
    {
      name: 'name',
      patterns: [
        {
          name: 'ptn1',
          rows: 16,
          cols: 4,
          data: [
            [{note: 'C4', ins: 'Ins1'}, {}, {}, {}],
            [{}, {}, {}, {}],
            [{note: 'D4', ins: 'Ins1'}, {}, {}, {}],
            [{}, {}, {}, {}],
            [{note: 'E4', ins: 'Ins1'}, {}, {}, {}],
            [{}, {}, {}, {}],
            [{note: 'F4', ins: 'Ins1'}, {}, {}, {}],
            [{}, {}, {}, {}],
            [{note: 'G4', ins: 'Ins1'}, {}, {}, {}],
            [{}, {}, {}, {}],
            [{note: 'A4', ins: 'Ins1'}, {}, {}, {}],
            [{}, {}, {}, {}],
            [{note: 'B4', ins: 'Ins1'}, {}, {}, {}],
            [{}, {}, {}, {}],
            [{note: 'C5', ins: 'Ins1'}, {}, {}, {}],
            [{}, {}, {}, {}],
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
    pattern: 'ptn1',
    patch: 'patch1',
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

const ilApp = 'app';
const ilSelectedTab = [ilApp, 'tab'];
const ilSelectedSong = [ilApp, 'song'];
const ilSelectedPattern = [ilApp, 'pattern'];
const ilSelectedPatch = [ilApp, 'pattern'];

export function TopTab({caption, id}) {
  const [selected, setSelected] = useLens(ilSelectedTab);
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
  return html`
    <div class="bottom">
    Status goes here
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

const ilFindByName = (byName) => find(({name}) => name === byName);

const ilSongs = 'songs';
const ilSongByName = (songName) => [ilSongs, ilFindByName(songName)];
const ilPatterns = 'patterns';
const ilPatches = 'patches';

export function PatternCell({row, col, ilPattern}) {
  const [data] = useLens(ilPattern, 'data', row, col);
  return html`<div class="cell">
     ${JSON.stringify(data)}
  </div>`;
}

export function PatternRow({row, ilPattern}) {
  const [cols] = useLens(ilPattern, 'cols');
  const pCols = [];
  for (let col = 0; col < cols; col++) {
    pCols.push(h(PatternCell, {key: col, row, col, ilPattern}))
  }
  return html`<div class="row">
    <div class="idx">${row.toString(16).padStart(2, '0').toUpperCase()}</div>
    ${cols}
    ${pCols}
  </div>`
}

export function PatternMain() {
  const [songName] = useLens(ilSelectedSong);
  const [ptnName] = useLens(ilSelectedPattern);
  const ilPattern = [ilSongs, ilFindByName(songName), ilPatterns, ilFindByName(ptnName)];
  const [rows] = useLens(ilPattern, 'rows');
  const pRows = [];
  for (let row = 0; row < rows; row++) {
    pRows.push(h(PatternRow, {key: row, row, ilPattern}));
  }
  return html`<div class="pattern">
     ${pRows}
  </div>`;
}

export function PatternLeft() {
  const [songName] = useLens(ilSelectedSong);
  const [ptnName] = useLens(ilSelectedPattern);
  const [patterns = []] = useLens(ilSongByName(songName), ilPatterns);
  return html`<div class="pattern-list">
    ${patterns.map((p) => html`
      <div class="pattern-item ${ptnName === p.name ? 'selected' : ''}">
        ${p.name}
      </div>
    `)}
  </div>`;
}

export function PatternRight() {
  const [songName] = useLens(ilSelectedSong);
  const [patches = []] = useLens(ilSongByName(songName), ilPatches);
  return html`<div class="patch-list">
    ${patches.map((p) => html`
      <div class="patch-item">
        ${p.name}
      </div>
    `)}
  </div>`;
}

export function MainRow() {
  const [selected] = useLens(ilSelectedTab);
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
  <${ILensProvider} init=${appState}>
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
