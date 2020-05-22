import {h} from './common.js';


export function TextBuf({chars, colors, stride, r0 = 0, c0 = 0, width, height}) {
    const getBuf = (buf, r, c) => {
        const i = (r0 + r)*stride + c0 + c;
        if (i < buf.length) return buf[i];
        return 0;
    };
    const rows = [];
    for (let r = 0; r < height; r++) {
        const row = [];
        for (let c = 0; c < width; c++) {
            const code = getBuf(chars, r, c);
            const color = getBuf(colors, r, c);
            const fc = color & 0xF;
            const bc = color >> 4 & 0xF;
            const char = code >= 32 && code < 128 ? String.fromCharCode(code) : ' ';
            row.push(h('div',
              {class: ['char', 'fc-' + fc.toString(16), 'bc-' + bc.toString(16), 'c-' + code.toString(16)].join(' ')},
              h('span', {}, char)
            ));
        }
        rows.push(row);
    }
    return h('div', {class: 'text-buf'},
        rows.map(row => h('div', {class: 'row'}, row))
    );
}

export function allocBuf({width, height, fill = 0}) {
    const res = new Uint8Array(width*height);
    res.fill(fill);
    return res;
}

export function putText({text, chars, stride, r, c, len}) {
    const i0 = r*stride + c;
    len = len || text.length;
    for (let i = 0; i < len; i++) {
        if (i0 + i > chars.length) return;
        chars[i0 + i] = i < text.length ? text.charCodeAt(i) : 0;
    }
}

export function putChar({code, chars, stride, r, c}) {
    const i = r*stride + c;
    if (i > chars.length) return;
    chars[i] = code;
}

export function putHLine({chars, stride, r, c, len, code}) {
    const i0 = r*stride + c;
    for (let i = 0; i < len; i++) {
        if (i0 + i > chars.length) return;
        chars[i0 + i] = code;
    }
}

export function putVLine({chars, stride, r, c, len, code}) {
    let i0 = r*stride + c;
    for (let i = 0; i < len; i++) {
        if (i0 > chars.length) return;
        chars[i0] = code;
        i0 += stride;
    }
}

export function putFrame({chars, stride, r, c, width, height, codes}) {
    const [
      lt, tt, rt,
      ll,     rr,
      lb, bb, rb,
    ] = codes.map(c => typeof c === 'string' ? c.charCodeAt(0) : c);
    putHLine({chars, stride, r, c: c + 1, len: width, code: tt});
    putHLine({chars, stride, r: r + height + 1, c: c + 1, len: width, code: bb});
    putVLine({chars, stride, r: r + 1, c, len: height, code: ll});
    putVLine({chars, stride, r: r + 1, c: c + width + 1, len: height, code: rr});
    putChar({chars, stride, r, c, code: lt});
    putChar({chars, stride, r, c: c + width + 1, code: rt});
    putChar({chars, stride, r: r + height + 1, c, code: lb});
    putChar({chars, stride, r: r + height + 1, c: c + width + 1, code: rb});
}
