import { useEffect, useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BrainCircuit,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Theater,
  UploadCloud,
} from 'lucide-react';

// ✅ FIX 1: Use .env variable instead of hardcoded key
const API_KEY = import.meta.env.VITE_GEMINI_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const tones = ['Funny', 'Dramatic', 'Kids', 'Detective'];

const promptTemplate = (tone) => `
Analyze the uploaded image and respond with ONLY valid JSON.
Required JSON schema:
{
  "caption": "Exactly one sentence.",
  "summary": ["Line 1", "Line 2", "Line 3"],
  "objects": ["tag1", "tag2", "tag3"],
  "emotion": "single short label",
  "sceneType": "single short label",
  "qualityReport": {
    "score": 0,
    "verdict": "short phrase",
    "notes": ["short note", "short note", "short note"]
  },
  "story": "A short creative story in a ${tone.toLowerCase()} tone."
}
Rules: Return JSON only. No markdown. No explanation.
`.trim();

const initialHighlights = [
  { label: 'Vision Model', value: 'Gemini 2.5 Flash', icon: BrainCircuit },
  { label: 'Response Mode', value: 'Structured JSON', icon: ScanSearch },
  { label: 'Creative Layer', value: 'Story Engine', icon: Theater },
];

function App() {
  const [selectedTone, setSelectedTone] = useState('Funny');
  const [previewUrl, setPreviewUrl] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // ✅ FIX 5: Cleanup object URL to prevent memory leak
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const parseGeminiResponse = (rawText) => {
    try {
      const cleanText = rawText.replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanText);
    } catch (e) {
      throw new Error('Failed to parse AI response. Try again.');
    }
  };

const analyzeImage = async (file, retryCount = 0) => {
  if (!file) return;
  setIsLoading(true);
  setErrorMessage('');
  setAnalysis(null);
  
  let shouldStopLoading = true; // ✅ flag track karega

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const base64Data = await readFileAsBase64(file);
    const imagePart = {
      inlineData: {
        data: base64Data.split(',')[1],
        mimeType: file.type,
      },
    };

    const prompt = promptTemplate(selectedTone);
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const data = parseGeminiResponse(response.text());

    setAnalysis(data);

    const historyItem = {
      id: Date.now(),
      image: base64Data,
      name: file.name,
      caption: data.caption,
      tone: selectedTone,
      emotion: data.emotion,
      sceneType: data.sceneType,
      qualityScore: data.qualityReport?.score || 0,
    };
    setHistory((prev) => [historyItem, ...prev].slice(0, 6));

  } catch (error) {
    console.error('Analysis Error:', error);

    if (error.message.includes('503') && retryCount < 3) {
      setErrorMessage(`Server busy, retrying... (${retryCount + 1}/3)`);
      shouldStopLoading = false; // ✅ retry ho raha hai, loading mat rokna
      setTimeout(() => analyzeImage(file, retryCount + 1), 3000);
    } else if (error.message.includes('404')) {
      setErrorMessage('Model not found. Check model name.');
    } else if (error.message.includes('quota') || error.message.includes('429')) {
      setErrorMessage('API quota exceeded. Please wait and try again.');
    } else if (error.message.includes('503')) {
      setErrorMessage('Gemini servers are overloaded. Please try again in a minute.');
    } else if (error.message.includes('parse')) {
      setErrorMessage('AI returned unexpected response. Try uploading again.');
    } else {
      setErrorMessage('Something went wrong. Please try again.');
    }

  } finally {
    if (shouldStopLoading) setIsLoading(false); // ✅ sirf tab band karo jab retry nahi
  }
};

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setCurrentFile(file);
    setAnalysis(null);
    await analyzeImage(file);
  };

  const onFileChange = (e) => processFile(e.target.files?.[0]);

  // ✅ FIX 2: Re-analyze with new tone
  const handleReAnalyze = () => {
    if (currentFile) analyzeImage(currentFile);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-md"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest mb-4">
                <Sparkles size={14} /> TECHMESH '26 FINALS
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Vision Intelligence Engine</h1>
              <p className="text-slate-400 mt-1 text-sm">Upload any image — AI will analyze, tag, and narrate it.</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              {initialHighlights.map((h, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h.icon className="text-cyan-400 mb-2" size={20} />
                  <p className="text-[10px] uppercase text-slate-500 font-bold">{h.label}</p>
                  <p className="text-sm font-medium">{h.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Input Panel */}
          <div className="lg:col-span-4 space-y-6">
            <section className="p-6 rounded-[28px] border border-white/10 bg-white/5">
              <h2 className="text-xl font-bold mb-4">Source Image</h2>

              <div
                onClick={() => fileInputRef.current.click()}
                className={`relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                  previewUrl
                    ? 'border-transparent'
                    : 'border-white/10 hover:border-cyan-500/50 bg-white/5'
                }`}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                    alt="Preview"
                  />
                ) : (
                  <>
                    <UploadCloud size={48} className="text-slate-500 mb-4" />
                    <p className="text-sm text-slate-400">Click to upload image</p>
                    <p className="text-xs text-slate-600 mt-1">PNG, JPG, WEBP supported</p>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={onFileChange}
                  accept="image/*"
                />
              </div>

              {/* Tone Selection */}
              <div className="mt-6 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Select Story Tone
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {tones.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTone(t)}
                      className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                        selectedTone === t
                          ? 'bg-cyan-500 border-cyan-400 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* ✅ FIX 2: Re-Analyze Button */}
              {previewUrl && !isLoading && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleReAnalyze}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 border border-white/20 text-sm font-medium hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all"
                >
                  <RefreshCw size={15} />
                  Re-Analyze with <span className="text-cyan-400">{selectedTone}</span> tone
                </motion.button>
              )}
            </section>
          </div>

          {/* Center: Analysis Results */}
          <div className="lg:col-span-5">
            <section className="p-6 rounded-[28px] border border-white/10 bg-white/5 min-h-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Analysis Results</h2>
                {isLoading && <LoaderCircle className="animate-spin text-cyan-400" />}
              </div>

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-64 text-center"
                  >
                    <BrainCircuit size={48} className="text-cyan-500 animate-pulse mb-4" />
                    <p className="text-slate-400">Gemini is processing visual tokens...</p>
                    <p className="text-slate-600 text-sm mt-1">This may take a few seconds</p>
                  </motion.div>
                ) : analysis ? (
                  <motion.div
                    key="results"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Caption */}
                    <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-cyan-400 uppercase mb-2">Caption</p>
                      <p className="text-lg font-medium">{analysis.caption}</p>
                    </div>

                    {/* ✅ FIX 3: Summary displayed */}
                    {analysis.summary?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-3">Summary</p>
                        <ul className="space-y-1.5">
                          {analysis.summary.map((line, i) => (
                            <li key={i} className="text-sm text-slate-300 flex gap-2">
                              <span className="text-cyan-500">•</span> {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Mood + Quality */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Mood</p>
                        <p className="text-lg capitalize">{analysis.emotion}</p>
                        <p className="text-xs text-slate-500 mt-1">{analysis.sceneType}</p>
                      </div>

                      {/* ✅ FIX 4: Quality with progress bar */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Quality</p>
                        <p className="text-lg text-emerald-400 font-bold">
                          {analysis.qualityReport?.score}%
                        </p>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${analysis.qualityReport?.score}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="bg-emerald-400 h-1.5 rounded-full"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {analysis.qualityReport?.verdict}
                        </p>
                      </div>
                    </div>

                    {/* Detected Objects */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-3">
                        Detected Objects
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.objects?.map((obj) => (
                          <span key={obj} className="px-3 py-1 rounded-full bg-white/10 text-xs">
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Story */}
                    <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3 text-amber-400">
                        <Theater size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">
                          The Narrative — {selectedTone}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-300 italic">
                        "{analysis.story}"
                      </p>
                    </div>

                    {/* Quality Notes */}
                    {analysis.qualityReport?.notes?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">
                          Quality Notes
                        </p>
                        <ul className="space-y-1">
                          {analysis.qualityReport.notes.map((note, i) => (
                            <li key={i} className="text-xs text-slate-400 flex gap-2">
                              <span className="text-slate-600">—</span> {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    className="flex flex-col items-center justify-center h-64 text-slate-500"
                  >
                    <LayoutDashboard size={48} className="mb-4 opacity-20" />
                    <p>Upload an image to start inference</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {errorMessage && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </section>
          </div>

          {/* Right: History */}
          <div className="lg:col-span-3">
            <aside className="p-6 rounded-[28px] border border-white/10 bg-white/5 h-full">
              <div className="flex items-center gap-2 mb-6">
                <Clock3 size={18} className="text-cyan-400" />
                <h2 className="text-xl font-bold">Recent Scans</h2>
              </div>

              {history.length === 0 ? (
                <p className="text-slate-600 text-sm text-center mt-12">
                  No scans yet. Upload an image!
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all"
                    >
                      <img src={item.image} className="w-full h-24 object-cover" alt="" />
                      <div className="p-3">
                        <p className="text-xs font-bold truncate">{item.caption}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                            {item.emotion}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-slate-600">{item.tone}</span>
                            <span className="text-[10px] font-bold text-cyan-400">
                              {item.qualityScore}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;