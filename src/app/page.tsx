'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 8);
    router.push(`/room/${id}`);
  };

  const joinRoom = () => {
    if (roomId.trim()) router.push(`/room/${roomId.trim()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-3xl text-gray-800 mb-2">Domino Retro</h1>
      <p className="text-sm text-gray-600 mb-4">90s Latino Edition</p>

      <button
        onClick={createRoom}
        className="bg-green-700 text-white px-8 py-4 text-lg border-b-4 border-green-900 active:border-b-0"
      >
        Crear Sala
      </button>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Código de sala"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="p-2 text-base border-2 border-gray-800 bg-white"
        />
        <button
          onClick={joinRoom}
          className="bg-blue-600 text-white px-6 py-2 border-b-4 border-blue-800 active:border-b-0"
        >
          Unirse
        </button>
      </div>
    </div>
  );
}
