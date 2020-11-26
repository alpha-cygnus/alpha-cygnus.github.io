import SerialPort from 'serialport';

import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

const ARGV = yargs(hideBin(process.argv))
  .alias('d', 'device')
  .argv;

console.log(ARGV);

const delay = (ms) => new Promise(resolve => {
  setTimeout(resolve, ms);
});

const {ByteLength} = SerialPort.parsers;

const [port, err] = await new Promise(resolve => {
  let port = null;
  port = new SerialPort(ARGV.device || '/dev/ttyUSB0', (err) => resolve([port, err]));
});

if (err) {
  console.error(err);
  process.exit(1);
}

// port.write([171, 2, 0, 0, 5, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 193, 172]);

const STTX = 171;
const SPTX = 172;
const STRX = 173;
const SPRX = 174;

const MODE = {
  nooLiteTX: 0,
  nooLiteRX: 1,
  nooLiteFTX: 2,
  nooLiteFRX: 3,
  nooLiteFService: 4,
  nooLiteFUpdate: 5,
}

const CTR = {
  cmd: 0,
  broadcast: 1,
  read: 2,
  bind: 3,
  unbind: 4,
  clearChannel: 5,
  clearAll: 6,
  unbindAddr: 7,
  sendFAddr: 8,
}

const CMD = {
  Off: 0,
  Bright_Down: 1,
  On: 2,
  Bright_Up: 3,
  Switch: 4,
  Bright_Back: 5,
  Set_Brightness: 6,
  Load_Preset: 7,
  Save_Preset: 8,
  Unbind: 9,
  Stop_Reg: 10,
  Bright_Step_Down: 11,
  Bright_Step_Up: 12,
  Bright_Reg: 13,
  Bind: 15,
  Roll_Colour: 16,
  Switch_Colour: 17,
  Switch_Mode: 18,
  Speed_Mode_Back: 19,
  Battery_Low: 20,
  Sens_Temp_Humi: 21,
  Temporary_On: 25,
  Modes: 26,
  Read_State: 128,
  Write_State: 129,
  Send_State: 130,
  Service: 131,
  Clear_memory: 132,
}

const CMD_NAME = {
  0: 'Off',
  1: 'Bright_Down',
  2: 'On',
  3: 'Bright_Up',
  4: 'Switch',
  5: 'Bright_Back',
  6: 'Set_Brightness',
  7: 'Load_Preset',
  8: 'Save_Preset',
  9: 'Unbind',
  10: 'Stop_Reg',
  11: 'Bright_Step_Down',
  12: 'Bright_Step_Up',
  13: 'Bright_Reg',
  15: 'Bind',
  16: 'Roll_Colour',
  17: 'Switch_Colour',
  18: 'Switch_Mode',
  19: 'Speed_Mode_Back',
  20: 'Battery_Low',
  21: 'Sens_Temp_Humi',
  25: 'Temporary_On',
  26: 'Modes',
  128: 'Read_State',
  129: 'Write_State',
  130: 'Send_State',
  131: 'Service',
  132: 'Clear_memory',
}

function make17({rx = false, mode = 2, ctr = 0, rep = 0, res = 0, ch = 0, cmd = 0, fmt = 5, d0 = 0, d1 = 0, d2 = 0, d3 = 0, id0 = 0, id1 = 0, id2 = 0, id3 = 0}) {
  const data15 = [rx ? STRX : STTX, mode, ctr & 63 + (rep << 6), res, ch, cmd, fmt, d0, d1, d2, d3, id0, id1, id2, id3];
  const crc = data15.reduce((sum, x) => sum + x) & 0xFF;
  return [...data15, crc, rx ? SPRX : SPTX];
}

function send17(data) {
  const data17 = make17({...data, rx: false});
  port.write(data17);
}

function sendCmdF(ch = 0, cmd = CMD.Off, fmt = 5) {
  if (cmd === undefined) throw 'Invalid command';
  send17({
    ctr: CTR.cmd,
    mode: MODE.nooLiteFTX,
    cmd,
    ch,
    fmt,
  });
}

function sendCmdNL(ch = 0, cmd = CMD.Off, fmt = 0) {
  if (cmd === undefined) throw 'Invalid command';
  send17({
    ctr: CTR.cmd,
    mode: MODE.nooLiteTX,
    cmd,
    ch,
    fmt,
  });
}

let onRecv = new Set();

function onData(buf) {
  const bytes = [...buf];
  const [st, mode, ctr, togl, ch, cmd, fmt, d0, d1, d2, d3, id0, id1, id2, id3, crc, sp] = bytes;
  const data = {mode, ctr, togl, ch, cmd, cmdName: CMD_NAME[cmd] || cmd, fmt, d0, d1, d2, d3, id0, id1, id2, id3};
  for (const res of onRecv) res(data);
  switch (cmd) {
    case CMD.Send_State:
      const [devType, fwVer] = [d0, d1];
      switch (fmt) {
        case 0:
          const [state, curBright] = [d2, d3];
          return console.log('STATE0', {ch, devType, fwVer, state, curBright});
        case 1:
          const [wireState, recvState] = [d2, d3];
          return console.log('STATE1', {ch, devType, fwVer, wireState, recvState});
        case 2:
          const [free1, free2] = [d2, d3];
          return console.log('STATE2', {ch, devType, fwVer, free1, free2});
      }
      break;
  }
  console.log('DATA', JSON.stringify(data));
}

function recv(opts = {}) {
  const {timeout = 1000, filter = () => true} = opts;
  return new Promise((resolve) => {
    let tmId;
    const on = (data) => {
      if (!filter(data)) return;
      if (tmId) clearTimeout(tmId);
      tmId = null;
      onRecv.delete(on);
      resolve(data);
    }
    tmId = setTimeout(() => {
      if (!tmId) return;
      tmId = null;
      onRecv.delete(on);
      resolve(null);
    }, timeout);
    onRecv.add(on);
  });
}

async function fetchState(ch) {
  const result = [];
  for (let fmt = 0; fmt < 3; fmt++) {
    sendCmdF(ch, CMD.Read_State, fmt);
    result.push(await recv({filter: ({cmd}) => cmd === CMD.Send_State}));
  }
  return result;
}

async function bindChannel(ch) {
  sendCmdF(ch, CMD.Bind, 0);
  return recv();
}

async function unbindChannel(ch) {
  sendCmdF(ch, CMD.Unbind, 0);
  return recv();
}

async function onChannel(ch) {
  sendCmdF(ch, CMD.On);
  return recv();
}

async function offChannel(ch) {
  sendCmdF(ch, CMD.Off);
  return recv();
}

const parser = port.pipe(new ByteLength({length: 17}))
parser.on('data', onData);

parser.on('error', console.log);

// console.log(await fetchState(5));

const [argCmd, argCh] = ARGV._;

function help() {
  console.log('wrong arguments');
}

async function main() {
  switch (argCmd) {
    case 'state':
      if (argCh === undefined) return help();
      return await fetchState(argCh);
    case 'bind':
      if (argCh === undefined) return help();
      return await bindChannel(argCh);
    case 'on':
      if (argCh === undefined) return help();
      return await onChannel(argCh);
    case 'off':
      if (argCh === undefined) return help();
      return await offChannel(argCh);
    case 'unbind':
      if (argCh === undefined) return help();
      return await unbindChannel(argCh);
    default:
      return help();
  }
}

await main();
process.exit(0);
