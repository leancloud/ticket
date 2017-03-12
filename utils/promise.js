export const tap = interceptor => value => ((interceptor(value), value))
export const wait = time => new Promise(resolve => setTimeout(resolve, time))
export const hold = time => result => wait(time).then(() => result)
export const series = promiseGens => promiseGens.reduce(
  (m, p) => m.then(v => Promise.all([...v, p()])),
  Promise.resolve([])
)
