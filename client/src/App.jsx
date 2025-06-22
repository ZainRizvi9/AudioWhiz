
import React, { useState } from "react";

function App() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(0);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const fetchTracks = async () => {
    setMessage("Loading...");
    setGameStarted(false);
    setShowAnswer(false);
    setCurrent(0);
    setTracks([]);
    setGuess("");
    const res = await fetch(`/api/tracks?url=${encodeURIComponent(playlistUrl)}`);
    const data = await res.json();
    setTracks(data);
    setGameStarted(true);
    setMessage("");
  };

  const checkGuess = () => {
    const track = tracks[current];
    const match =
      guess.toLowerCase().includes(track.name.toLowerCase()) ||
      guess.toLowerCase().includes(track.artist.toLowerCase());
    if (match) {
      setMessage("✅ Correct!");
      setShowAnswer(true);
    } else {
      setMessage("❌ Try again!");
    }
  };

  const nextTrack = () => {
    setCurrent(current + 1);
    setGuess("");
    setShowAnswer(false);
    setMessage("");
  };

  if (!gameStarted) {
    return (
      <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
        <h1>🎵 Guessify 🎵</h1>
        <input
          style={{ width: "80%" }}
          type="text"
          placeholder="Paste Spotify playlist link"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
        />
        <br />
        <button style={{ marginTop: 20 }} onClick={fetchTracks}>Start Game</button>
        <p>{message}</p>
      </div>
    );
  }

  const track = tracks[current];
  if (!track) return <div>Game over!</div>;

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <h2>Guess the Song!</h2>
      <audio controls autoPlay src={track.preview_url} />
      <br />
      <input
        style={{ width: "80%", marginTop: 20 }}
        type="text"
        placeholder="Song or artist"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        disabled={showAnswer}
      />
      <br />
      {!showAnswer ? (
        <button style={{ marginTop: 10 }} onClick={checkGuess}>Submit</button>
      ) : (
        <button style={{ marginTop: 10 }} onClick={nextTrack}>Next</button>
      )}
      <div style={{ marginTop: 20 }}>{message}</div>
      {showAnswer && <div><b>{track.name} – {track.artist}</b></div>}
      <div style={{ marginTop: 30 }}>Track {current + 1} / {tracks.length}</div>
    </div>
  );
}

export default App;
