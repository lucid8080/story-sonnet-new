import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Play, Pause, ListMusic, Sparkles } from 'lucide-react';
import { fetchStoryBySlug } from '../lib/api/stories.js';
import { getTranscriptLines } from '../transcripts';
import SubscriptionGate from '../components/auth/SubscriptionGate.jsx';

export default function Story() {
  const { slug } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef(null);
  const transcriptScrollerRef = useRef(null);
  const lineRefs = useRef([]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchStoryBySlug(slug);
        if (!ignore) {
          setStory(data);
          setActiveEpisodeIndex(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [slug]);

  const activeEpisode = story?.episodes?.[activeEpisodeIndex];
  const transcriptLines = useMemo(
    () => (story && activeEpisode ? getTranscriptLines(story.slug, activeEpisode.id) : []),
    [story, activeEpisode]
  );

  useEffect(() => {
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    lineRefs.current = [];
  }, [activeEpisodeIndex, slug]);

  const currentLineIndex = useMemo(() => {
    if (!transcriptLines.length || !duration || !audioRef.current) return 0;
    const currentTime = audioRef.current.currentTime || 0;
    const normalized = currentTime / duration;
    return Math.min(transcriptLines.length - 1, Math.max(0, Math.floor(normalized * transcriptLines.length)));
  }, [progress, duration, transcriptLines]);

  useEffect(() => {
    if (!showTranscript || !transcriptScrollerRef.current || !transcriptLines.length) return;
    const container = transcriptScrollerRef.current;
    const activeLine = lineRefs.current[currentLineIndex];
    if (!activeLine) return;
    const targetTop = activeLine.offsetTop - container.clientHeight * 0.38;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [currentLineIndex, showTranscript, transcriptLines.length, progress]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-medium text-slate-500 shadow-lg shadow-slate-200 ring-1 ring-slate-100">
          Loading story…
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Story not found</h1>
          <p className="mt-3 text-slate-600">That page wandered off into the moon bushes.</p>
          <Link to="/" className="mt-6 inline-flex rounded-full bg-rose-500 px-5 py-3 font-bold text-white">Back to stories</Link>
        </div>
      </div>
    );
  }

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.log('Playback could not start yet:', error);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime || 0;
    const total = audioRef.current.duration || 0;
    setProgress(total ? (current / total) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const value = Number(e.target.value);
    const newTime = duration ? (value / 100) * duration : 0;
    audioRef.current.currentTime = newTime;
    setProgress(value);
  };

  const formatTime = (time) => {
    if (!time || Number.isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50 text-slate-800">
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-5 sm:px-7 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-6">
        <section>
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-100">
            <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: story.accent }}>
              <img src={story.cover} alt={`${story.title} cover art`} className="h-full w-full object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-transparent p-5 sm:p-6">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/70">Now Playing</div>
                    <div className="mt-1 text-lg font-black leading-snug text-white sm:text-xl">{activeEpisode.title}</div>
                  </div>
                  <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur">
                    {activeEpisode.duration}
                  </div>
                </div>

                <SubscriptionGate isPremium={activeEpisode?.isPremium || story.isPremium}>
                  <audio
                    ref={audioRef}
                    src={activeEpisode.audioSrc}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                  />
                </SubscriptionGate>

                <input type="range" min="0" max="100" value={progress} onChange={handleSeek} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-rose-400" />
                <div className="mt-2 flex justify-between text-[11px] font-mono text-white/75">
                  <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <button onClick={togglePlay} className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-900/20 transition hover:scale-105 active:scale-95">
                    {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">Play from the cover</div>
                    <div className="text-xs leading-5 text-white/75">Pick an episode on the right, then hit play here.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 px-1">
            <input
              id="transcript-toggle"
              type="checkbox"
              checked={showTranscript}
              onChange={(e) => setShowTranscript(e.target.checked)}
              className="switch"
            />
            <label htmlFor="transcript-toggle" className="text-sm font-medium text-slate-600 cursor-pointer">
              Auto-scrolling transcript
            </label>
          </div>
        </section>

        <section>
          {showTranscript && transcriptLines.length > 0 ? (
            <div className="rounded-[1.6rem] bg-white shadow-lg ring-1 ring-slate-100 aspect-[4/5] overflow-hidden self-start">
              <div className="flex h-full flex-col p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Transcript</div>
                    <h2 className="mt-2 text-2xl font-black leading-tight text-slate-900">{activeEpisode.title}</h2>
                  </div>
                  <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-rose-500">
                    Live Follow
                  </div>
                </div>
                <div ref={transcriptScrollerRef} className="mt-2 flex-1 overflow-y-auto pr-2 scroll-smooth">
                  <div className="space-y-4 pb-24">
                    {transcriptLines.map((line, index) => (
                      <p
                        key={line.id}
                        ref={(el) => (lineRefs.current[index] = el)}
                        className="text-[15px] leading-7 text-slate-700"
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-[1.6rem] bg-white p-5 shadow-lg ring-1 ring-slate-100">
                <div className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Story Series</div>
                <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900 lg:text-[2.1rem]">{story.seriesTitle}</h1>
                <p className="mt-3 text-base leading-7 text-slate-600">{story.summary}</p>
              </div>

              <div className="mb-4 mt-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                  <ListMusic className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Episodes</h2>
                  <p className="text-sm text-slate-500">Choose an episode and play it from the cover.</p>
                </div>
              </div>

              <div className="space-y-3">
                {story.episodes.map((episode, index) => {
                  const active = index === activeEpisodeIndex;
                  return (
                    <button type="button" key={episode.id} onClick={() => setActiveEpisodeIndex(index)} className={`w-full rounded-[1.5rem] border p-4 text-left transition ${active ? 'border-rose-200 bg-white shadow-lg shadow-rose-100' : 'border-slate-100 bg-white/70 hover:border-slate-200 hover:bg-white'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{episode.label}</div>
                          <div className="mt-1 text-lg font-black leading-snug text-slate-900">{episode.title}</div>
                          <p className="mt-2 text-sm leading-5 text-slate-600">{episode.description}</p>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${active ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                          {episode.duration}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
