const tasks = []

function addTask(task) {
  if (typeof task !== 'function') {
    throw new TypeError('The task must be a function')
  }
  tasks.push(task)
}

async function ready() {
  Object.freeze(tasks)
  if (tasks.length) {
    await Promise.all(tasks.map((task) => task()))
  }
}

module.exports = {
  addTask,
  ready,
}
