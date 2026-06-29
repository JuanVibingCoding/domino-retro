import { useRef, useCallback } from 'react';

export const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = 'square', volume = 0.2) => {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playClick = useCallback(() => playTone(220, 0.1, 'square', 0.2), [playTone]);
  const playPass = useCallback(() => {
    playTone(150, 0.2, 'sine', 0.3);
    setTimeout(() => playTone(100, 0.2, 'sine', 0.3), 150);
  }, [playTone]);
  const playTranque = useCallback(() => {
    playTone(80, 0.5, 'sawtooth', 0.4);
    setTimeout(() => playTone(60, 0.5, 'sawtooth', 0.4), 200);
  }, [playTone]);

  return { playClick, playPass, playTranque };
};
