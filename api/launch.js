const { ready: nextReady } = require('./next-shim')

const tasks = []

function addTask(task) {
  if (task && typeof task.then === 'function') {
    tasks.push(task)
  }
}

async function ready() {
  Object.freeze(tasks)
  await nextReady()
  await Promise.all(tasks)
}

module.exports = {
  addTask,
  ready,
}
