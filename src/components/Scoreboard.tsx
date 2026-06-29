import React from 'react';

export default function Scoreboard({ scores, teamNames }: { scores: [number, number], teamNames: [string, string] }) {
  return (
    <div className="scorebook p-4 pl-6 w-64 h-56 absolute top-4 right-4 transform rotate-2 z-10 flex flex-col">
      <h2 className="text-handwritten text-xl text-gray-800 mb-2 border-b border-gray-400">Marcador</h2>
      <div className="flex-1 flex flex-col justify-around" style={{ lineHeight: '25px' }}>
        <div className="flex justify-between items-baseline">
          <span className="text-handwritten text-lg text-blue-900">{teamNames[0]}</span>
          <span className="text-handwritten text-2xl text-blue-600 font-bold">{scores[0]}</span>
        </div>
        <div className="flex justify-between items-baseline mt-2">
          <span className="text-handwritten text-lg text-red-900">{teamNames[1]}</span>
          <span className="text-handwritten text-2xl text-red-600 font-bold">{scores[1]}</span>
        </div>
      </div>
      <p className="text-handwritten text-sm text-gray-500 mt-2 text-right">Meta: 100 pts</p>
    </div>
  );
}
