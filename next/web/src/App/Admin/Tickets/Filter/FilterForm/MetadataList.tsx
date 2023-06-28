import { useEffect, useState } from 'react';
import { Button, Input } from 'antd';
import { AiOutlineDelete, AiOutlinePlus } from 'react-icons/ai';

const prefix = 'metaData.';

interface MetadataListProps {
  value?: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}

export function MetadataList({ value, onChange }: MetadataListProps) {
  const [tempValue, setTempValue] = useState<[string, string][]>([]);
  useEffect(() => {
    if (value) {
      setTempValue(
        Object.entries(value).map(([key, value]) => [
          key.slice(prefix.length),
          JSON.stringify(value),
        ])
      );
    } else {
      setTempValue([]);
    }
  }, []);

  const handleAdd = () => {
    setTempValue((prev) => [...prev, ['', '']]);
  };

  const handleRemove = (index: number) => {
    setTempValue((prev) => [
      ...prev.slice(0, index),
      // removed
      ...prev.slice(index + 1),
    ]);
    handleEmitChange();
  };

  const handleChange = (index: number, key: string, value: string) => {
    setTempValue((prev) => [
      ...prev.slice(0, index),
      [key, value], // changed
      ...prev.slice(index + 1),
    ]);
  };

  const handleEmitChange = () => {
    const map = tempValue
      .map(([key, value]) => {
        let jsonVal: any = value;
        try {
          jsonVal = JSON.parse(value);
        } catch {}
        return [key, jsonVal];
      })
      .filter(([key, value]) => !!key && value !== undefined)
      .reduce<Record<string, any>>((map, [key, value]) => {
        map[`${prefix}${key}`] = value;
        return map;
      }, {});
    onChange(map);
  };

  return (
    <div>
      {tempValue.map(([key, value], i) => (
        <div className="grid grid-cols-[1fr_1fr_24px] gap-1 mb-2">
          <Input
            placeholder="key"
            value={key}
            onChange={(e) => handleChange(i, e.target.value, value)}
            onBlur={handleEmitChange}
          />
          <Input
            placeholder="value"
            value={value}
            onChange={(e) => handleChange(i, key, e.target.value)}
            onBlur={handleEmitChange}
          />
          <button onClick={() => handleRemove(i)}>
            <AiOutlineDelete className="w-4 h-4 m-auto" />
          </button>
        </div>
      ))}
      <Button size="small" onClick={handleAdd}>
        <AiOutlinePlus className="m-auto w-4 h-4" />
      </Button>
    </div>
  );
}
