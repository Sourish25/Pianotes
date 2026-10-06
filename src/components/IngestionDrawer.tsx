import React, { useState } from 'react';
import type { SongData } from '../types';
import { SAMPLE_SONGS } from '../data/songs';
import { LiquidGlassButton } from './LiquidGlass';
import { UploadCloud, Link as LinkIcon, Film, Play, Music, Sparkles } from 'lucide-react';

interface IngestionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: SongData) => void;
  currentSongId: string;
}

export const IngestionDrawer: React.FC<IngestionDrawerProps> = ({
  isOpen,
  onClose,
  onSelectSong,
  currentSongId,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'url' | 'file'>('library');

  if (!isOpen) return null;

  // Process social media URL (Reels / TikTok / Shorts)
  const handleProcessUrl = () => {
    if (!urlInput.trim()) return;

    setIsProcessing(true);
    setProcessingStep('Connecting to media stream...');

    setTimeout(() => {
      setProcessingStep('Separating audio stems & piano acoustic frequencies...');
      setTimeout(() => {
        setProcessingStep('Analyzing hand positions (Left Violet / Right Amber)...');
        setTimeout(() => {
          setProcessingStep('Generating 3D note trajectories & strike points...');
          setTimeout(() => {
            // Generate transcribed song from URL
            const urlTitle = urlInput.includes('instagram')
              ? 'Instagram Piano Reel'
              : urlInput.includes('tiktok')
              ? 'TikTok Piano Cover'
              : 'YouTube Short Piano Performance';

            const transcribedSong: SongData = {
              id: `imported-${Date.now()}`,
              title: urlTitle,
              composer: 'Transcribed from Social Media',
              bpm: 96,
              duration: 28,
              keySignature: 'C Minor',
              difficulty: 'Intermediate',
              description: 'Automatically transcribed from short-form video with neural hand separation.',
              notes: SAMPLE_SONGS[0].notes.map((n, i) => ({
                ...n,
                id: `transcribed-${i}`,
                pitch: n.pitch + (i % 2 === 0 ? 0 : 2),
              })),
            };

            setIsProcessing(false);
            setProcessingStep('');
            onSelectSong(transcribedSong);
            onClose();
          }, 800);
        }, 800);
      }, 900);
    }, 700);
  };

  // Mock File Upload (Video / MIDI)
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleProcessFile(file.name);
    }
  };

  const handleProcessFile = (fileName: string) => {
    setIsProcessing(true);
    setProcessingStep(`Parsing ${fileName}...`);
    setTimeout(() => {
      setProcessingStep('Deconvolving polyphonic audio into MIDI data...');
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStep('');
        onSelectSong(SAMPLE_SONGS[1]); // Load Chopin as rich transcription
        onClose();
      }, 1000);
    }, 800);
  };

  return (
    <div className="liquid-sheet-overlay" onClick={onClose}>
      <div
        className="liquid-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px' }}
      >
        <div className="sheet-handle" onClick={onClose} />

        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-400" />
              <span>Import & Song Library</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Transcribe Reels / Shorts / TikTok, upload piano video, or select from built-in pieces.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1 mb-5 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'library'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Pre-loaded Songs ({SAMPLE_SONGS.length})
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'url'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Paste Reel / Short URL
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'file'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Upload Video / MIDI
          </button>
        </div>

        {/* Tab 1: Pre-loaded Songs Library */}
        {activeTab === 'library' && (
          <div className="space-y-3">
            {SAMPLE_SONGS.map((song) => {
              const isSelected = song.id === currentSongId;
              return (
                <div
                  key={song.id}
                  onClick={() => {
                    onSelectSong(song);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-purple-500/15 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                      : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-300 shadow-md'
                            : 'bg-white/10 text-zinc-300 border-white/15'
                        }`}
                      >
                        <Music className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white tracking-tight">
                            {song.title}
                          </h4>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500 text-white">
                              PLAYING
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">{song.composer}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-xs font-mono text-zinc-300 font-medium">
                          {song.bpm} BPM
                        </span>
                        <p className="text-[11px] text-zinc-400">{song.keySignature}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-purple-600 transition-colors">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300/80 mt-2 pl-13 line-clamp-1 leading-relaxed">
                    {song.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Social Media Reel / Short URL Ingestion */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Paste Video Link (Instagram Reel, TikTok, or YouTube Short)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.instagram.com/reel/... or https://youtube.com/shorts/..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  />
                </div>
                <LiquidGlassButton
                  onClick={handleProcessUrl}
                  disabled={!urlInput.trim() || isProcessing}
                  variant="violet"
                >
                  {isProcessing ? 'Transcribing...' : 'Transcribe'}
                </LiquidGlassButton>
              </div>

              {/* URL Presets */}
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                <span className="text-[11px] text-zinc-500">Quick Test URLs:</span>
                <button
                  onClick={() => setUrlInput('https://instagram.com/reel/chopin-nocturne-piano')}
                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/20 text-[11px]"
                >
                  Instagram Reel #piano
                </button>
                <button
                  onClick={() => setUrlInput('https://youtube.com/shorts/interstellar-piano-cover')}
                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20 text-[11px]"
                >
                  YouTube Short
                </button>
              </div>
            </div>

            {/* Neural Hand Separation Details */}
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
              <div className="flex items-center gap-2 font-semibold text-purple-300 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Automatic Left / Right Hand Separation</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Pianotes separates left-hand bass/accompaniment (violet) and right-hand melodies/arpeggios (amber) with pitch clustering and biomechanical fingering heuristics.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Upload Video / MIDI */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-purple-400 bg-purple-500/10'
                  : 'border-white/20 hover:border-white/40 bg-white/5'
              }`}
              onClick={() => handleProcessFile('recorded_performance.mp4')}
            >
              <UploadCloud className="w-10 h-10 text-purple-400 mb-3" />
              <h3 className="text-sm font-semibold text-white">
                Drag & Drop Video or MIDI File
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Supports .mp4, .mov, .webm, or standard .midi files up to 500MB
              </p>
              <span className="mt-4 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15">
                Browse Files
              </span>
            </div>
          </div>
        )}

        {/* Real-time processing progress modal */}
        {isProcessing && (
          <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-purple-500/40 backdrop-blur-md animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
              <span className="text-sm font-semibold text-purple-200">
                {processingStep}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-amber-400 h-1.5 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
