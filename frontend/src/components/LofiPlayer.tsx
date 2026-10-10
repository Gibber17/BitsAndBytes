import React, { useState } from 'react';
import { lofiTracks, type Track } from '../data/LofiTracks';

export const LofiPlayer: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState<Track>(lofiTracks[0]);

  return (
    <div>
      <h3>Now Playing: {currentTrack.title} - {currentTrack.artist}</h3>
      <audio controls src={currentTrack.audioUrl} autoPlay style={{ width: '100%' }} />
      
      <ul>
        {lofiTracks.map((track) => (
          <li key={track.id}>
            <button onClick={() => setCurrentTrack(track)}>
              {track.title} by {track.artist}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};