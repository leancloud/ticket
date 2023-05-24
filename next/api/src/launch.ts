const tasks: PromiseLike<any>[] = [];

export function addTask(task: any) {
  if (task && typeof task.then === 'function') {
    tasks.push(task);
  }
}

export function ready() {
  Object.freeze(tasks);
  return Promise.all(tasks);
}
