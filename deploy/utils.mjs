export const step = (name) => {
  console.log()
  console.log('---------------------------')
  console.log(name)
  console.log('---------------------------')
}

export const task = async (name, initializer) => {
  process.stdout.write(name)
  const result = await initializer()
  process.stdout.cursorTo(0)
  console.log(name + ' ✔')
  return result
}
