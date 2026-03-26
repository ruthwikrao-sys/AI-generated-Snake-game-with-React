import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Terminal } from 'lucide-react';

const TRACKS = [
  { id: 1, title: 'DATA_STREAM_01.WAV', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'CORRUPT_SECTOR_02.WAV', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'VOID_PROTOCOL_03.WAV', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

type Point = { x: number; y: number };
const GRID_SIZE = 20;
const CELL_SIZE = 20;

export default function App() {
  // --- Snake Game State ---
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Point>({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const directionRef = useRef(direction);
  const foodRef = useRef(food);

  // --- Music Player State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [visualizerData, setVisualizerData] = useState<number[]>(Array(12).fill(10));
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Refs Sync ---
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { foodRef.current = food; }, [food]);

  // --- Keyboard Controls ---
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === ' ' && gameStarted && !gameOver) {
      setIsPaused(p => !p);
      return;
    }

    if (gameOver || isPaused || !gameStarted) return;

    const currentDir = directionRef.current;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (currentDir.y !== 1) setDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (currentDir.y !== -1) setDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (currentDir.x !== 1) setDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (currentDir.x !== -1) setDirection({ x: 1, y: 0 });
        break;
    }
  }, [gameOver, isPaused, gameStarted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // --- Game Loop ---
  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = {
        x: head.x + directionRef.current.x,
        y: head.y + directionRef.current.y
      };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      const currentFood = foodRef.current;

      // Eat food
      if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
        setScore(s => {
          const newScore = s + 10;
          setHighScore(h => Math.max(h, newScore));
          return newScore;
        });
        
        let newFood;
        while (true) {
          newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          };
          if (!newSnake.some(s => s.x === newFood.x && s.y === newFood.y)) {
            break;
          }
        }
        setFood(newFood);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, []);

  useEffect(() => {
    if (gameOver || isPaused || !gameStarted) return;
    const intervalId = setInterval(moveSnake, 100); // Slightly faster for glitch aesthetic
    return () => clearInterval(intervalId);
  }, [gameOver, isPaused, gameStarted, moveSnake]);

  // --- Canvas Rendering ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (glitchy/techy)
    ctx.strokeStyle = '#003333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food (Magenta)
    ctx.fillStyle = '#ff00ff';
    // Add a slight glitch offset randomly
    const glitchOffsetX = Math.random() > 0.9 ? (Math.random() * 4 - 2) : 0;
    const glitchOffsetY = Math.random() > 0.9 ? (Math.random() * 4 - 2) : 0;
    ctx.fillRect(food.x * CELL_SIZE + 2 + glitchOffsetX, food.y * CELL_SIZE + 2 + glitchOffsetY, CELL_SIZE - 4, CELL_SIZE - 4);

    // Draw snake (Cyan)
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#ffffff' : '#00ffff';
      // Head glitch effect
      const sOffsetX = (index === 0 && Math.random() > 0.8) ? (Math.random() * 2 - 1) : 0;
      ctx.fillRect(segment.x * CELL_SIZE + 1 + sOffsetX, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });
  }, [snake, food]);

  // --- Music Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch(e => {
        console.error("Audio play failed:", e);
        setIsPlaying(false);
      });
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (!isPlaying) {
      setVisualizerData(Array(12).fill(10));
      return;
    }
    const interval = setInterval(() => {
      setVisualizerData(Array(12).fill(0).map(() => Math.random() * 80 + 20));
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setGameStarted(true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-mono relative overflow-hidden selection:bg-[#f0f] selection:text-black">
      {/* CRT Effects */}
      <div className="scanlines" />
      <div className="scanline-bar" />
      <div className="bg-static" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-5xl">
        {/* Header */}
        <div className="glitch-wrapper mb-4">
          <h1 className="text-5xl md:text-7xl font-bold glitch-text uppercase tracking-tighter" data-text="SNAKE_OS.EXE">
            SNAKE_OS.EXE
          </h1>
        </div>

        {/* Main Console */}
        <div className="border-4 border-[#0ff] bg-black p-6 md:p-8 flex flex-col lg:flex-row gap-8 w-full relative shadow-[8px_8px_0px_#f0f]">
          
          {/* Game Area */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex justify-between w-full max-w-[400px] mb-2 px-2 font-bold text-xl md:text-2xl uppercase">
              <div className="text-[#0ff]">
                DATA_MINED: {score.toString().padStart(4, '0')}
              </div>
              <div className="text-[#f0f]">
                MAX_YIELD: {highScore.toString().padStart(4, '0')}
              </div>
            </div>
            
            <div className="relative border-4 border-[#f0f] bg-black p-1 shadow-[-8px_-8px_0px_#0ff]">
              <canvas 
                ref={canvasRef} 
                width={GRID_SIZE * CELL_SIZE} 
                height={GRID_SIZE * CELL_SIZE} 
                className="bg-black block"
              />
              
              {!gameStarted && !gameOver && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center border-2 border-[#0ff] m-1">
                  <button 
                    onClick={resetGame} 
                    className="px-6 py-2 bg-black border-2 border-[#0ff] text-[#0ff] font-bold text-2xl hover:bg-[#0ff] hover:text-black transition-none uppercase"
                  >
                    [ INITIALIZE_SEQUENCE ]
                  </button>
                  <p className="mt-4 text-[#f0f] text-xl uppercase animate-pulse">AWAITING_INPUT...</p>
                </div>
              )}

              {isPaused && gameStarted && !gameOver && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center border-2 border-[#f0f] m-1">
                  <div className="text-[#0ff] text-5xl font-bold uppercase glitch-text" data-text="SYS_HALT">
                    SYS_HALT
                  </div>
                </div>
              )}

              {gameOver && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center border-2 border-[#f0f] m-1">
                  <div className="text-[#f0f] text-5xl font-bold mb-6 uppercase glitch-text text-center leading-tight" data-text="FATAL_EXCEPTION">
                    FATAL_EXCEPTION
                  </div>
                  <button 
                    onClick={resetGame} 
                    className="px-6 py-2 bg-black border-2 border-[#0ff] text-[#0ff] font-bold text-2xl hover:bg-[#0ff] hover:text-black transition-none flex items-center gap-3 uppercase"
                  >
                    <Terminal size={24} /> REBOOT_CORE
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Music Player Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-6 bg-black p-6 border-4 border-[#0ff] shadow-[8px_8px_0px_#f0f]">
            <div className="flex items-center justify-between border-b-4 border-[#f0f] pb-2">
              <h2 className="text-[#0ff] text-3xl font-bold uppercase">
                AUDIO_DAEMON
              </h2>
              <div className={`w-4 h-4 border-2 border-[#0ff] ${isPlaying ? 'bg-[#f0f]' : 'bg-black'}`} />
            </div>

            <div className="flex-1 flex flex-col justify-center gap-8">
              <div className="text-center space-y-2">
                <div className="text-lg text-[#f0f] font-bold uppercase">ACTIVE_STREAM</div>
                <div className="text-2xl text-[#0ff] font-bold truncate px-2 bg-[#003333] py-2 border-2 border-[#0ff]">
                  {TRACKS[currentTrackIndex].title}
                </div>
              </div>

              {/* Visualizer */}
              <div className="flex items-end justify-center gap-1 h-20 px-2 border-b-4 border-[#0ff]">
                {visualizerData.map((height, i) => (
                  <div 
                    key={i} 
                    className={`w-full ${i % 2 === 0 ? 'bg-[#0ff]' : 'bg-[#f0f]'}`}
                    style={{ 
                      height: `${height}%`, 
                      transition: 'height 0.05s steps(2)'
                    }} 
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={prevTrack} 
                  className="p-2 bg-black text-[#0ff] border-4 border-[#0ff] hover:bg-[#0ff] hover:text-black transition-none"
                >
                  <SkipBack size={28} />
                </button>
                <button 
                  onClick={togglePlay} 
                  className="p-4 bg-black text-[#f0f] border-4 border-[#f0f] hover:bg-[#f0f] hover:text-black transition-none"
                >
                  {isPlaying ? <Pause size={36} /> : <Play size={36} />}
                </button>
                <button 
                  onClick={nextTrack} 
                  className="p-2 bg-black text-[#0ff] border-4 border-[#0ff] hover:bg-[#0ff] hover:text-black transition-none"
                >
                  <SkipForward size={28} />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-4 bg-black p-3 border-4 border-[#0ff]">
                <button onClick={() => setVolume(v => v === 0 ? 0.5 : 0)} className="text-[#f0f] hover:text-[#0ff] transition-none">
                  {volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-3 bg-[#003333] appearance-none cursor-pointer accent-[#f0f]"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src={TRACKS[currentTrackIndex].url} 
        onEnded={nextTrack} 
        crossOrigin="anonymous"
      />
    </div>
  );
}
