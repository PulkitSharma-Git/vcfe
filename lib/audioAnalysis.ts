// Audio analysis utilities for speaking detection
export interface AudioAnalyser {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  getVolume: () => number;
}

export function createAudioAnalyser(stream: MediaStream): AudioAnalyser {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);

  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  const getVolume = () => {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    return sum / bufferLength;
  };

  return { analyser, dataArray, getVolume };
}

export function isUserSpeaking(analyser: AudioAnalyser, threshold: number = 10): boolean {
  const volume = analyser.getVolume();
  return volume > threshold;
}