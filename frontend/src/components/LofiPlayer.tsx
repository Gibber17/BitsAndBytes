import React, { useState } from 'react';
import { lofiTracks, type Track } from '../data/LofiTracks';
import { lofiImages } from "../data/LofiImages";


export const LofiPlayer: React.FC = () => {
 const [currentTrack, setCurrentTrack] = useState<Track>(lofiTracks[0]);


 const [randomImage, setRandomImage] = useState(
   () => lofiImages[Math.floor(Math.random() * lofiImages.length)]
 );


 return (
   <div>
     <h3>Now Playing: {currentTrack.title} - {currentTrack.artist}</h3>


     <img
       src={randomImage}
       alt="Lo-fi artwork"
       style=
       {{
         width: "250px",
         height: "250px",
         objectFit: "cover",
         borderRadius: "12px",
       }}
/>
     <audio controls src={currentTrack.audioUrl} autoPlay style={{ width: '100%' }} />
    
     <ul>
       {lofiTracks.map((track) => (
         <li key={track.id}>
           <button onClick={() => {
             setCurrentTrack(track);
             setRandomImage(
               lofiImages[Math.floor(Math.random() * lofiImages.length)]
             );
           }}
         >
             {track.title} by {track.artist}
           </button>
         </li>
       ))}
     </ul>
   </div>
 );
};
