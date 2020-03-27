import {h, html, useState} from './common.js';
import {Test0} from './audio.js';


const appState = {
  songs: [
    {
      name: 'name',
      patterns: [
        {
          name: 'Ptn1',
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
      instruments: [
        {
          name: 'Ins1',
          type: 'patch',
          patch: 'patch1',
          voices: 4,
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
  ]
}

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
  `
}

window.HTML = html;
window.H = h;

export default html`
<div>
  <${Hello} what=${'wrld'} style=${{color: 'red'}}><${Test0}/></div>
</div>
`;
