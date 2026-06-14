import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown, ArrowUp, Zap, Play, RotateCcw, Share2, Activity, MapPin, CheckCircle2 } from 'lucide-react';
import { SpeedTestEngine, TestPhase, getClientInfo } from './lib/engine';

type TestState = TestPhase;

export default function App() {
  const [testState, setTestState] = useState<TestState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [clientInfo, setClientInfo] = useState({ ip: '', loc: 'Connecting...' });
  const [copied, setCopied] = useState(false);
  
  const [metrics, setMetrics] = useState({
    ping: { value: 0 },
    jitter: { value: 0 },
    download: { value: 0 },
    upload: { value: 0 },
  });

  const engineRef = useRef<SpeedTestEngine | null>(null);

  useEffect(() => {
    getClientInfo().then(info => {
      // Small delay just to make UI state transition look clean
      setTimeout(() => setClientInfo(info), 600);
    });

    const engine = new SpeedTestEngine();
    engineRef.current = engine;

    engine.onPhaseChange = (phase) => {
      setTestState(phase);
      if (phase === 'pinging') {
        setProgress(0);
        setCurrentSpeed(0);
        setMetrics({ ping: { value: 0 }, jitter: { value: 0 }, download: { value: 0 }, upload: { value: 0 } });
      } else if (phase === 'downloading' || phase === 'uploading') {
        setProgress(0);
        setCurrentSpeed(0);
      }
    };

    engine.onProgress = (speed, prog) => {
      setProgress(prog);
      setCurrentSpeed(speed);
      
      const phase = engine.getCurrentPhase();
      if (phase === 'pinging') setMetrics(p => ({ ...p, ping: { value: speed } }));
      if (phase === 'downloading') setMetrics(p => ({ ...p, download: { value: speed } }));
      if (phase === 'uploading') setMetrics(p => ({ ...p, upload: { value: speed } }));
    };

    engine.onJitterProgress = (jitter) => {
      setMetrics(p => ({ ...p, jitter: { value: jitter } }));
    };

    engine.onResult = (m) => {
      setMetrics({
        ping: { value: m.ping },
        jitter: { value: m.jitter },
        download: { value: m.download },
        upload: { value: m.upload }
      });
      setProgress(100);
    };

    return () => {
      engine.stop();
    };
  }, []);

  const handleStart = () => {
    setCopied(false);
    engineRef.current?.start();
  };

  const handleShare = async () => {
    const text = `🚀 Speedify Test Result:\n\n⬇️ ${metrics.download.value} Mbps\n⬆️ ${metrics.upload.value} Mbps\n🏓 ${metrics.ping.value} ms (Ping)\n\n📍 ${clientInfo.loc.replace('\n', ' ')}\nTested via Cloudflare Edge Network`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy result.");
    }
  };

  const isTesting = testState !== 'idle' && testState !== 'completed';
  const displaySpeed = testState === 'completed' ? metrics.download.value : currentSpeed;
  
  const getThemeColor = () => {
    if (testState === 'downloading') return '#34d399'; // Emerald-400
    if (testState === 'uploading') return '#a855f7'; // Purple-400
    if (testState === 'pinging') return '#38bdf8'; // Sky-400
    return '#10b981'; // Default Emerald-500
  };

  const themeColor = getThemeColor();

  // Pseudo-calculation for viral comparative metric
  const getPercentile = (mbps: number) => {
    if (mbps >= 1000) return 99;
    if (mbps >= 500) return 95;
    if (mbps >= 250) return 88;
    if (mbps >= 100) return 75;
    if (mbps >= 50) return 50;
    if (mbps >= 25) return 30;
    return 10;
  };

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-white flex flex-col items-center p-4 sm:p-6 font-sans overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* Header Area */}
      <header className="w-full max-w-md flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-neutral-100">Speedify</span>
        </div>
        {testState === 'idle' && clientInfo.loc !== '' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-1.5 text-xs font-mono text-neutral-400 bg-neutral-900/60 px-3 py-1.5 rounded-full border border-neutral-800"
          >
            <MapPin className="h-3 w-3" />
            <span>{clientInfo.loc}</span>
          </motion.div>
        )}
      </header>

      {/* Main Experience Engine */}
      <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-8 sm:gap-12 pb-8">
        
        <AnimatePresence mode="wait">
          
          {/* Detailed Viral Result Card */}
          {testState === 'completed' ? (
            <motion.div 
              key="results-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full bg-neutral-900/40 border border-neutral-800/60 rounded-[32px] p-6 sm:p-8 flex flex-col items-center backdrop-blur-2xl relative overflow-hidden shadow-2xl"
            >
              {/* Premium Gradient Top Border */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-400 via-emerald-400 to-purple-500" />
              
              <div className="text-center mb-8 w-full">
                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 block">Test Completed</span>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 text-sm font-medium">
                  🚀 Faster than {getPercentile(metrics.download.value)}% of users
                </div>
              </div>

              {/* Main Core Metrics Grid */}
              <div className="grid grid-cols-2 w-full gap-4 mb-6">
                <div className="bg-neutral-950/50 border border-neutral-800/40 rounded-3xl p-5 flex flex-col items-start relative overflow-hidden">
                   <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <ArrowDown className="text-emerald-400 h-3 w-3" /> Download
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-semibold tabular-nums tracking-tight">{metrics.download.value}</span>
                    <span className="text-neutral-500 text-xs font-mono">Mbps</span>
                  </div>
                </div>
                
                <div className="bg-neutral-950/50 border border-neutral-800/40 rounded-3xl p-5 flex flex-col items-start relative overflow-hidden">
                   <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <ArrowUp className="text-purple-400 h-3 w-3" /> Upload
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-semibold tabular-nums tracking-tight">{metrics.upload.value}</span>
                    <span className="text-neutral-500 text-xs font-mono">Mbps</span>
                  </div>
                </div>
              </div>

              {/* Secondary Technical Metrics Grid */}
              <div className="grid grid-cols-2 w-full gap-4 mb-8">
                 <div className="flex flex-col border-t border-neutral-800/60 pt-4">
                    <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mb-1">Ping</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-medium text-neutral-200">{metrics.ping.value}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">ms</span>
                    </div>
                 </div>
                 <div className="flex flex-col border-t border-neutral-800/60 pt-4">
                    <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mb-1">Jitter</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-medium text-neutral-200">{metrics.jitter.value}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">ms</span>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={handleShare}
                  className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-neutral-200 shadow-xl shadow-white/5'}`}
                >
                  {copied ? <CheckCircle2 className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                  {copied ? 'Result Copied!' : 'Share Result'}
                </button>
                <button 
                  onClick={handleStart}
                  className="w-full py-3 rounded-2xl text-neutral-400 font-medium text-sm hover:text-white transition-colors flex items-center justify-center gap-2 group"
                >
                  <RotateCcw className="h-4 w-4 group-hover:-rotate-90 transition-transform duration-300" />
                  Test Again
                </button>
              </div>

            </motion.div>
          ) : (
            <motion.div 
              key="live-test-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col w-full items-center gap-8 sm:gap-12"
            >
              
              {/* Speedometer Centerpiece */}
              <div className="relative flex items-center justify-center w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" className="stroke-neutral-800/60" strokeWidth="2.5" fill="none" />
                  <motion.circle
                    cx="50" cy="50" r="46"
                    stroke={themeColor}
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: isTesting ? progress / 100 : 0 }}
                    transition={{ duration: 0.15, ease: "linear" }}
                  />
                </svg>
                
                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                  <motion.span 
                    layout="position"
                    className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.25em] mb-2"
                  >
                    {testState === 'idle' ? 'Ready' : 
                     testState === 'pinging' ? 'Measuring Ping' :
                     testState === 'downloading' ? 'Downloading' :
                     testState === 'uploading' ? 'Uploading' : ''}
                  </motion.span>
                  
                  <motion.div 
                    layout="position"
                    className="text-7xl sm:text-8xl font-medium tracking-tighter tabular-nums"
                    style={{ color: isTesting ? themeColor : '#fff' }}
                  >
                    {displaySpeed.toFixed(1)}
                  </motion.div>
                  
                  <span className="text-neutral-500 mt-2 font-mono text-[10px] font-medium tracking-widest uppercase">
                    {testState === 'pinging' ? 'Milliseconds' : 'Mbps'}
                  </span>
                </div>

                {/* Animated Inner Glow */}
                {isTesting && (
                  <motion.div 
                    className="absolute inset-0 -z-10 rounded-full blur-[60px] opacity-20 pointer-events-none"
                    style={{ backgroundColor: themeColor }}
                    animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                )}
              </div>

              {/* Status Grid Cards */}
              <div className="flex w-full justify-between gap-3 px-1 sm:px-0">
                <div className="flex-1 bg-neutral-900/30 rounded-[24px] p-4 flex flex-col border border-neutral-800/40 relative overflow-hidden backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5 mb-2">
                    <Zap className="h-3 w-3 text-sky-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Ping</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-semibold tabular-nums ${testState === 'pinging' ? 'text-sky-400' : 'text-neutral-200'}`}>
                      {metrics.ping.value || '--'}
                    </span>
                    <span className="text-[10px] text-neutral-600 font-mono border-l border-neutral-800 ml-1 pl-1 border-opacity-50">ms</span>
                  </div>
                  {testState === 'pinging' && (
                     <div className="absolute top-0 left-0 w-full h-[2px] bg-sky-400 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 bg-neutral-900/30 rounded-[24px] p-4 flex flex-col border border-neutral-800/40 relative overflow-hidden backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5 mb-2">
                    <ArrowDown className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Down</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-semibold tabular-nums ${testState === 'downloading' ? 'text-emerald-400' : 'text-neutral-200'}`}>
                      {metrics.download.value || '--'}
                    </span>
                    <span className="text-[10px] text-neutral-600 font-mono border-l border-neutral-800 ml-1 pl-1 border-opacity-50">Mbps</span>
                  </div>
                  {testState === 'downloading' && (
                     <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 bg-neutral-900/30 rounded-[24px] p-4 flex flex-col border border-neutral-800/40 relative overflow-hidden backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5 mb-2">
                    <ArrowUp className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Up</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-semibold tabular-nums ${testState === 'uploading' ? 'text-purple-400' : 'text-neutral-200'}`}>
                      {metrics.upload.value || '--'}
                    </span>
                    <span className="text-[10px] text-neutral-600 font-mono border-l border-neutral-800 ml-1 pl-1 border-opacity-50">Mbps</span>
                  </div>
                  {testState === 'uploading' && (
                     <div className="absolute top-0 left-0 w-full h-[2px] bg-purple-500 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Start Button Area */}
              <div className="h-24 flex items-center justify-center">
                {!isTesting && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStart}
                    className="relative flex items-center justify-center h-16 w-16 bg-white text-black rounded-full shadow-2xl shadow-emerald-500/10 z-10"
                  >
                   <Play className="h-6 w-6 ml-1 stroke-[2.5]" fill="currentColor" />
                    <div className="absolute inset-0 rounded-full border border-white/20 -z-10 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  </motion.button>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </main>
    </div>
  );
}
