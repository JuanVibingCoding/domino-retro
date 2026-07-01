import { useRef, useCallback } from 'react';

export const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) => {
    try {
      const ctx = initAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Silently fail if audio not available
    }
  }, [initAudio]);

  const playClick = useCallback(() => {
    playTone(800, 0.05, 'square', 0.12);
    setTimeout(() => playTone(600, 0.03, 'square', 0.08), 30);
  }, [playTone]);

  const playPass = useCallback(() => {
    playTone(300, 0.15, 'triangle', 0.15);
    setTimeout(() => playTone(200, 0.2, 'triangle', 0.12), 100);
  }, [playTone]);

  const playTranque = useCallback(() => {
    playTone(150, 0.3, 'sawtooth', 0.2);
    setTimeout(() => playTone(100, 0.4, 'sawtooth', 0.15), 150);
    setTimeout(() => playTone(80, 0.5, 'sawtooth', 0.1), 350);
  }, [playTone]);

  const playVictory = useCallback(() => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'square', 0.12), i * 120);
    });
  }, [playTone]);

  const playDefeat = useCallback(() => {
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'triangle', 0.1), i * 200);
    });
  }, [playTone]);

  const playTurn = useCallback(() => {
    playTone(440, 0.08, 'square', 0.08);
  }, [playTone]);

  return { playClick, playPass, playTranque, playVictory, playDefeat, playTurn };
};
