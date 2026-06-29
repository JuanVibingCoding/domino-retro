import React from 'react';

export default function Scoreboard({ scores }: { scores: [number, number] }) {
  return (
    <div className="scorebook p-4 w-64 h-48 absolute top-4 right-4 transform rotate-2 z-10">
      <h2 className="text-handwritten text-2xl text-gray-800 mb-4 border-b border-gray-400">Marcador</h2>
      <ul>
        <li className="flex justify-between items-center mb-2">
          <span className="text-handwritten text-xl text-gray-700">Equipo A</span>
          <span className="text-handwritten text-xl text-blue-600">{scores[0]}</span>
        </li>
        <li className="flex justify-between items-center mb-2">
          <span className="text-handwritten text-xl text-gray-700">Equipo B</span>
          <span className="text-handwritten text-xl text-red-600">{scores[1]}</span>
        </li>
      </ul>
      <p className="text-handwritten text-xs text-gray-500 mt-4 absolute bottom-2 right-4">Meta: 100 pts</p>
    </div>
  );
}
