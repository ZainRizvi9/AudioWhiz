import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, Search } from 'lucide-react';

function App() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStage, setGameStage] = useState(1);
  const [score, setScore] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(1);
  const [debugInfo, setDebugInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  const stageTimes = [1, 2, 4, 7, 11, 16];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('loadedmetadata', () => {
        setCurrentTime(0);
        setMaxTime(stageTimes[gameStage - 1]);
      });
    }
  }, [gameStage]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      intervalRef.current = setInterval(() => {
        const audio = audioRef.current;
        if (audio && audio.currentTime >= maxTime) {
          audio.pause();
          setIsPlaying(false);
          audio.currentTime = 0;
        }
        setCurrentTime(audio ? audio.currentTime : 0);
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, maxTime]);

  const testAPI = async () => {
    try {
      setDebugInfo("Testing API connection...");
      const res = await fetch('/api/test');
      const data = await res.json();
      setDebugInfo(`API Test: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setDebugInfo(`API Test Error: ${error.message}`);
    }
  };

  const fetchTracks = async () => {
    if (!playlistUrl.trim()) {
      setMessage("Please enter a playlist URL");
      return;
    }

    setMessage("");
    setDebugInfo("");
    setIsLoading(true);
    setGameStarted(false);
    
    try {
      setDebugInfo(`Step 1: Making request to /api/tracks with URL: ${playlistUrl}`);
      
      const apiUrl = `/api/tracks?url=${encodeURIComponent(playlistUrl)}`;
      setDebugInfo(prev => prev + `\nStep 2: Full API URL: ${apiUrl}`);
      
      const res = await fetch(apiUrl);
      setDebugInfo(prev => prev + `\nStep 3: Response status: ${res.status}`);
      
      const data = await res.json();
      setDebugInfo(prev => prev + `\nStep 4: Response data: ${JSON.stringify(data, null, 2)}`);
      
      if (data.error) {
        setMessage(`Error: ${data.error}`);
        setIsLoading(false);
        return;
      }
      
      if (!Array.isArray(data)) {
        setMessage("Invalid response format from API");
        setDebugInfo(prev => prev + `\nError: Expected array, got ${typeof data}`);
        setIsLoading(false);
        return;
      }
      
      if (data.length === 0) {
        setMessage("No tracks with previews found in this playlist.");
        setIsLoading(false);
        return;
      }
      
      setTracks(data);
      setGameStarted(true);
      setMessage(`Loaded ${data.length} tracks successfully!`);
      setDebugInfo(prev => prev + `\nSuccess: ${data.length} tracks loaded`);
      resetGame();
    } catch (error) {
      setMessage(`Network error: ${error.message}`);
      setDebugInfo(prev => prev + `\nNetwork Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    setCurrentTrack(0);
    setGameStage(1);
    setScore(0);
    setGuess("");
    setSkipped(false);
    setAnswered(false);
    setCurrentTime(0);
    setMaxTime(stageTimes[0]);
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const checkGuess = () => {
    const track = tracks[currentTrack];
    const guessLower = guess.toLowerCase().trim();
    const trackNameLower = track.name.toLowerCase();
    const artistLower = track.artist.toLowerCase();
    
    const isCorrect = guessLower === trackNameLower || 
                     guessLower === artistLower ||
                     guessLower === `${trackNameLower} ${artistLower}` ||
                     guessLower === `${artistLower} ${trackNameLower}` ||
                     trackNameLower.includes(guessLower) ||
                     artistLower.includes(guessLower);
    
    if (isCorrect) {
      const points = Math.max(600 - (gameStage - 1) * 100, 100);
      setScore(score + points);
      setMessage(`✅ Correct! +${points} points`);
      setAnswered(true);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setMessage("❌ Try again!");
    }
  };

  const skipTrack = () => {
    setSkipped(true);
    setAnswered(true);
    setMessage("⏭️ Skipped");
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const nextTrack = () => {
    if (currentTrack + 1 >= tracks.length) {
      setGameStarted(false);
      setMessage(`Game Over! Final Score: ${score}`);
      return;
    }
    
    setCurrentTrack(currentTrack + 1);
    setGameStage(1);
    setGuess("");
    setSkipped(false);
    setAnswered(false);
    setMessage("");
    setCurrentTime(0);
    setMaxTime(stageTimes[0]);
    setIsPlaying(false);
  };

  const nextStage = () => {
    if (gameStage < stageTimes.length) {
      setGameStage(gameStage + 1);
      setMaxTime(stageTimes[gameStage]);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
  };

  // Start screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-green-400">🎵 AudioWhiz</h1>
            <p className="text-gray-300">Guess the song from your Spotify playlist</p>
          </div>
          
          <div className="space-y-4">
            <input
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
              type="text"
              placeholder="Paste Spotify playlist link (e.g., https://open.spotify.com/playlist/...)"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
            />
            
            <div className="flex gap-4">
              <button
                className="flex-1 p-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
                onClick={testAPI}
              >
                Test API
              </button>
              <button
                className="flex-1 p-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                onClick={fetchTracks}
                disabled={!playlistUrl.trim() || isLoading}
              >
                {isLoading ? "Loading..." : "Start Game"}
              </button>
            </div>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="bg-gray-800 p-4 rounded-lg text-left">
              <h3 className="text-green-400 font-bold mb-2">Debug Info:</h3>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                {debugInfo}
              </pre>
            </div>
          )}
          
          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('Error') || message.includes('error') 
                ? 'bg-red-900 text-red-300' 
                : 'bg-green-900 text-green-300'
            }`}>
              {message}
            </div>
          )}
          
          {score > 0 && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-xl font-bold text-green-400">Final Score: {score}</h3>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-800 p-4 rounded-lg text-left">
            <h3 className="text-green-400 font-bold mb-2">How to use:</h3>
            <ol className="text-sm text-gray-300 space-y-1">
              <li>1. Go to Spotify and find a public playlist</li>
              <li>2. Copy the playlist URL (should start with https://open.spotify.com/playlist/)</li>
              <li>3. Paste it above and click "Start Game"</li>
              <li>4. If it doesn't work, click "Test API" first to check connection</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const track = tracks[currentTrack];
  if (!track) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Game Over!</h2>
          <p className="text-xl text-green-400">Final Score: {score}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="text-center py-6 border-b border-gray-800">
        <h1 className="text-3xl font-bold">AudioWhiz</h1>
        <div className="mt-2 text-gray-300">
          Score: {score} | Track {currentTrack + 1} / {tracks.length}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Track Progress Bars */}
        <div className="space-y-3">
          {stageTimes.map((time, index) => (
            <div
              key={index}
              className={`h-12 rounded-lg border-2 transition-all ${
                index + 1 === gameStage
                  ? 'border-green-400 bg-gray-700'
                  : index + 1 < gameStage
                  ? 'border-green-600 bg-green-900'
                  : 'border-gray-600 bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* Stage Info */}
        <div className="text-center">
          <div className="text-green-400 font-bold text-lg">
            Stage {gameStage}
          </div>
          <div className="text-gray-300">
            {stageTimes[gameStage - 1]} second{stageTimes[gameStage - 1] !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Audio Player */}
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {Math.floor(currentTime)}:{(currentTime % 1 * 100).toFixed(0).padStart(2, '0')}
            </span>
            <span className="text-sm text-gray-400">
              {Math.floor(maxTime)}:{((maxTime % 1) * 100).toFixed(0).padStart(2, '0')}
            </span>
          </div>
          
          <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-green-400 h-full transition-all duration-100"
              style={{ width: `${(currentTime / maxTime) * 100}%` }}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={playAudio}
              className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
          </div>

          <audio ref={audioRef} src={track.preview_url} />
        </div>

        {/* Guess Input */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
              type="text"
              placeholder="Know it? Search for the title"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={answered}
              onKeyDown={(e) => e.key === 'Enter' && !answered && checkGuess()}
            />
          </div>

          <div className="flex gap-4">
            {!answered ? (
              <>
                <button
                  onClick={skipTrack}
                  className="flex-1 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  SKIP
                </button>
                <button
                  onClick={checkGuess}
                  className="flex-1 p-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition-colors"
                  disabled={!guess.trim()}
                >
                  SUBMIT
                </button>
              </>
            ) : (
              <div className="flex gap-4 w-full">
                {gameStage < stageTimes.length && !skipped && (
                  <button
                    onClick={nextStage}
                    className="flex-1 p-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
                  >
                    NEXT STAGE
                  </button>
                )}
                <button
                  onClick={nextTrack}
                  className="flex-1 p-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition-colors"
                >
                  NEXT TRACK
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="text-center text-lg font-semibold">
            {message}
          </div>
        )}

        {/* Answer Reveal */}
        {answered && (
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-xl font-bold">{track.name}</div>
            <div className="text-lg text-gray-300">{track.artist}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;