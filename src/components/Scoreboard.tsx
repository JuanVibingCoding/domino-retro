import React from 'react';

export default function Scoreboard({ scores, teamNames }: { scores: [number, number], teamNames: [string, string] }) {
  return (
    <div className="scorebook p-3 pl-5 w-52 h-44 absolute top-2 left-2 z-10 flex flex-col shadow-[4px_4px_0px_#000]">
      <h2 className="text-handwritten text-lg text-gray-800 mb-1 border-b border-gray-400">Marcador</h2>
      <div className="flex-1 flex flex-col justify-around" style={{ lineHeight: '22px' }}>
        <div className="flex justify-between items-baseline">
          <span className="text-handwritten text-base text-blue-900">{teamNames[0]}</span>
          <span className="text-handwritten text-xl text-blue-600 font-bold">{scores[0]}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-handwritten text-base text-red-900">{teamNames[1]}</span>
          <span className="text-handwritten text-xl text-red-600 font-bold">{scores[1]}</span>
        </div>
      </div>
      <p className="text-handwritten text-xs text-gray-500 mt-1 text-right">Meta: 100 pts</p>
    </div>
  );
}
