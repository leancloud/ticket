import AV from 'leancloud-storage';

export function Pointer(className: string, objectId: string) {
  return { __type: 'Pointer', className, objectId };
}

export function assertAVObjectHasBeenSaved(
  object: AV.Object
): asserts object is AV.Object & { id: string } {
  if (!object.id) {
    throw new Error('The AV.Object is unsaved');
  }
}

export function assertAVObjectHasTimestamps(
  object: AV.Object
): asserts object is AV.Object & {
  createdAt: Date;
  updatedAt: Date;
} {
  if (!object.createdAt) {
    throw new Error(
      `The createdAt is missing in ${object.className}(${object.id})`
    );
  }
  if (!object.updatedAt) {
    throw new Error(
      `The updatedAt is missing in ${object.className}(${object.id})`
    );
  }
}

export function assertAVObjectHasAttributes(
  object: AV.Object,
  attributes: string[]
): void | never;
export function assertAVObjectHasAttributes(
  object: AV.Object,
  ...attributes: string[]
): void | never;
export function assertAVObjectHasAttributes(
  object: AV.Object,
  attribute: string | string[],
  ...attributes: string[]
) {
  for (const attr of attributes.concat(attribute)) {
    if (!object.has(attr)) {
      throw new Error(
        `The ${attr} is missing in ${object.className}(${object.id})`
      );
    }
  }
}
