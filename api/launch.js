const { ready: nextReady } = require('./next-shim')

const tasks = []

function addTask(task) {
  if (task && typeof task.then === 'function') {
    tasks.push(task)
  }
}

async function ready() {
  await nextReady()
  Object.freeze(tasks)
  await Promise.all(tasks)
}

module.exports = {
  addTask,
  ready,
}
