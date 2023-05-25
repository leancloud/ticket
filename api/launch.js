const { ready: nextReady } = require('./next-shim')

let tasks = []
let launched = false

function addTask(task) {
  if (launched) {
    throw new Error('app launched')
  }
  if (task && typeof task.then === 'function') {
    tasks.push(task)
  }
}

async function ready() {
  if (launched) {
    throw new Error('app launched')
  }
  launched = true
  await nextReady()
  await Promise.all(tasks)
  tasks = []
}

module.exports = {
  addTask,
  ready,
}
