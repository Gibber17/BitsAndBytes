export interface Track {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
}

export const lofiTracks: Track[] = [
  {
    id: '1',
    title: 'Coffee Shop Study',
    artist: 'Lofi Generator',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '2',
    title: 'Midnight Rain',
    artist: 'Lofi Generator',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
];