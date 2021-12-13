import { Fragment } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { Config } from './CustomField';
import { AddButton, Field } from './Conditions';

export interface ActionsProps {
  config: Config;
  name: string;
}

export function Actions({ config, name }: ActionsProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const removeable = fields.length > 1;

  return (
    <div className="border border-[#ebeff3] rounded shadow-sm">
      <div className="bg-[#f5f7f9]">
        {fields.map(({ id }, i) => (
          <Fragment key={id}>
            {i > 0 && <div className="h-px border-[#cfd7df] border-t" />}
            <Field
              config={config}
              path={`${name}.${i}`}
              removeable={removeable}
              onRemove={() => remove(i)}
              typeSelectPlaceholder="选择操作"
            />
          </Fragment>
        ))}
      </div>

      <div className="px-4 py-1 border-[#dadfe3] border-t">
        <AddButton type="button" onClick={() => append({})}>
          添加操作
        </AddButton>
      </div>
    </div>
  );
}
