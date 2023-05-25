let tasks: PromiseLike<any>[] = [];
let launched = false;

export function addTask(task: any) {
  if (launched) {
    throw new Error('app launched');
  }
  if (task && typeof task.then === 'function') {
    tasks.push(task);
  }
}

export async function ready() {
  if (launched) {
    throw new Error('app launched');
  }
  launched = true;
  await Promise.all(tasks);
  tasks = [];
}
