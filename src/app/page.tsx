'use client';

import { useRouter } from 'next/navigation';
import Lobby from '@/components/Lobby';

export default function Home() {
  const router = useRouter();

  const handleStart = (name: string) => {
    const id = Math.random().toString(36).substring(2, 8);
    router.push(`/room/${id}?name=${encodeURIComponent(name)}`);
  };

  return <Lobby onStart={handleStart} />;
}
