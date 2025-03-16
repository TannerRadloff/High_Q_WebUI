'use client';

import React, { useState } from 'react';

interface SpreadsheetEditorProps {
  initialData?: string[][];
  onChange?: (data: string[][]) => void;
  className?: string;
}

export function SpreadsheetEditor({
  initialData = [['', '', ''], ['', '', ''], ['', '', '']],
  onChange,
  className = ''
}: SpreadsheetEditorProps) {
  const [data, setData] = useState(initialData);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    newData[rowIndex][colIndex] = value;
    setData(newData);
    onChange?.(newData);
  };

  return (
    <div className={`spreadsheet-editor-container ${className}`}>
      <table className="spreadsheet-table">
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, colIndex) => (
                <td key={`cell-${rowIndex}-${colIndex}`}>
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    className="spreadsheet-cell"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 