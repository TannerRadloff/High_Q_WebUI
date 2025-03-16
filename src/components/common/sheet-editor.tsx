'use client';

import { useState } from 'react';

interface SheetEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function SheetEditor({ value, onChange, readOnly = false }: SheetEditorProps) {
  const [data, setData] = useState<string[][]>(() => {
    try {
      return JSON.parse(value || '[]');
    } catch (e) {
      return [['']];
    }
  });

  const updateCell = (rowIndex: number, colIndex: number, cellValue: string) => {
    if (readOnly) return;
    
    const newData = [...data];
    if (!newData[rowIndex]) {
      newData[rowIndex] = [];
    }
    newData[rowIndex][colIndex] = cellValue;
    
    setData(newData);
    if (onChange) {
      onChange(JSON.stringify(newData));
    }
  };

  const addRow = () => {
    if (readOnly) return;
    
    const cols = data[0]?.length || 1;
    const newRow = Array(cols).fill('');
    setData([...data, newRow]);
    
    if (onChange) {
      onChange(JSON.stringify([...data, newRow]));
    }
  };

  const addColumn = () => {
    if (readOnly) return;
    
    const newData = data.map(row => [...row, '']);
    setData(newData);
    
    if (onChange) {
      onChange(JSON.stringify(newData));
    }
  };

  return (
    <div className="border rounded-md p-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border p-2">
                    {readOnly ? (
                      <div>{cell}</div>
                    ) : (
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        className="w-full focus:outline-none"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {!readOnly && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={addRow}
            className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Add Row
          </button>
          <button
            onClick={addColumn}
            className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Add Column
          </button>
        </div>
      )}
    </div>
  );
} 