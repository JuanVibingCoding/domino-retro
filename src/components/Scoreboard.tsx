import React from 'react';

function TallyMarks({ count }: { count: number }) {
  const groups: string[] = [];
  let remaining = count;

  while (remaining > 0) {
    const batch = Math.min(remaining, 5);
    let marks = '';
    for (let i = 0; i < batch; i++) {
      if (i < 4) marks += '|';
      else marks += '/';
    }
    groups.push(marks);
    remaining -= batch;
  }

  return (
    <span className="tally text-lg tracking-widest">
      {groups.map((g, i) => (
        <span key={i} className="inline-block mx-1">{g}</span>
      ))}
    </span>
  );
}

export default function Scoreboard({ scores, teamNames }: { scores: [number, number]; teamNames: [string, string] }) {
  return (
    <div className="scorebook p-3 pl-6 w-56 absolute top-2 left-2 z-10 flex flex-col" style={{ minHeight: '160px' }}>
      {/* Notebook header */}
      <h2 className="text-handwritten text-base text-gray-700 mb-2 border-b-2 border-gray-300 pb-1" style={{ fontSize: '16px' }}>
        Marcador
      </h2>

      <div className="flex-1 flex flex-col justify-around">
        {/* Team 0 */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-handwritten text-sm text-blue-800" style={{ fontSize: '14px' }}>{teamNames[0]}</span>
            <span className="text-handwritten text-lg text-blue-600 font-bold" style={{ fontSize: '18px' }}>{scores[0]}</span>
          </div>
          <div className="text-gray-600" style={{ fontSize: '10px' }}>
            <TallyMarks count={scores[0]} />
          </div>
        </div>

        {/* Team 1 */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-handwritten text-sm text-red-800" style={{ fontSize: '14px' }}>{teamNames[1]}</span>
            <span className="text-handwritten text-lg text-red-600 font-bold" style={{ fontSize: '18px' }}>{scores[1]}</span>
          </div>
          <div className="text-gray-600" style={{ fontSize: '10px' }}>
            <TallyMarks count={scores[1]} />
          </div>
        </div>
      </div>

      <p className="text-handwritten text-xs text-gray-400 mt-2 text-right border-t border-gray-200 pt-1" style={{ fontSize: '11px' }}>
        Meta: 100 pts
      </p>
    </div>
  );
}
