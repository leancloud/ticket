export function findTreeNode<T extends { children?: T[] }>(rootNodes: T[], test: (node: T) => any) {
  const queue = rootNodes.slice();
  while (queue.length) {
    const node = queue.shift()!;
    if (test(node)) {
      return node;
    }
    node.children?.forEach((node) => queue.push(node));
  }
}
