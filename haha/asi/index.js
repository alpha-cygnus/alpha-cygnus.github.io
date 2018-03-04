const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function * audioTicks(ctx, tps = 50, aot = 10) {
  console.log('starting audio ticks');
  const int = 1/tps;
  console.log(int);
  aot = aot/1000;
  let lastCT = ctx.currentTime + aot;
  yield lastCT;
  lastCT += int;
  for (;;) {
    const ct = ctx.currentTime;
    while (lastCT < ct + aot) {
      yield lastCT;
      lastCT += int;
    }
    await delay(int*1000);
  }
}

export async function * fromEventLast(target, event) {
  let lastEvent = null;
  let waiter = null;
  const callback = e => {
    lastEvent = e;
    if (waiter) waiter(e);
  };
  target.addEventListener(event, callback);
  for (;;) {
    if (lastEvent) {
      const e = lastEvent;
      lastEvent = null;
      yield e;
      continue;
    }
    await new Promise(resolve => waiter = resolve);
  }
}

export async function * combineWithIndex(...iterators) {
  let toWait = iterators.map((it, i) => it.next().then(v => [i, v]));
  for (;;) {
    const [i, v] = await Promise.race(toWait);
    toWait[i] = iterators[i].next().then(v => [i, v]);
    yield [i, v.value];
  }
}

export async function * combine(...iterators) {
  for await (const [i, v] of combineWithIndex(...iterators)) {
    yield v;
  }
}

export async function * zip(...iterators) {
  let toWait = iterators.map(it => it.next());
  for (;;) {
    const vals = await Promise.all(toWait);
    toWait = iterators.map(it => it.next());
    yield vals.map(v => v.value);
  }
}

export async function * sampleLastBy(by, ...iterators) {
  const values = iterators.map(() => null);
  (async () => {
    for await (const [i, v] of combineWithIndex(...iterators)) {
      values[i] = v;
    }
  })();
  for await (const v0 of by) {
    yield [v0, ...values];
  }
}

export async function * take(num, iter) {
  let left = num;
  for await (const v of iter) {
    left--;
    if (left < 0) break;
    yield v;
  }
}