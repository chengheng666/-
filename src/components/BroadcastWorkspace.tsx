import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Mic, Upload, Volume2, Sliders, RotateCcw, Sparkles, Check, HelpCircle, Activity, Globe, Info } from 'lucide-react';
import { PRESET_TEMPLATES } from '../data/dictionary';
import { TrainInfo, AudioClip, BroadcastTemplate, DictItem } from '../types';
import { getAnalyser, updateReverbParams, playSplicedQueue, stopAllPlayback } from '../utils/audioEngine';

interface BroadcastWorkspaceProps {
  initialScript: { chinese: string; english: string };
  dictionary: DictItem[];
  customAudioClips: { [word: string]: AudioClip };
  onAddCustomAudio: (word: string, clip: AudioClip) => void;
  onClearCustomAudio: (word: string) => void;
}

export default function BroadcastWorkspace({
  initialScript,
  dictionary,
  customAudioClips,
  onAddCustomAudio,
  onClearCustomAudio,
}: BroadcastWorkspaceProps) {
  const [chineseScript, setChineseScript] = useState(initialScript.chinese);
  const [englishScript, setEnglishScript] = useState(initialScript.english);
  const [activeTab, setActiveTab] = useState<'chinese' | 'english'>('chinese');

  // 调音台参数
  const [volume, setVolume] = useState(80);
  const [speechRate, setSpeechRate] = useState(0.85); // 慢速沉稳
  const [speechPitch, setSpeechPitch] = useState(1.05); // 略微清脆高昂
  const [reverbWet, setReverbWet] = useState(45); // 45%混响
  const [reverbDelay, setReverbDelay] = useState(300); // 300ms回声
  const [chimeType, setChimeType] = useState<'none' | 'normal' | 'emergency' | 'departure'>('normal');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');

  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [currentSegmentLanguage, setCurrentSegmentLanguage] = useState<'zh' | 'en'>('zh');

  // 录音状态
  const [recordingWord, setRecordingWord] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // 动效与可视化
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 监听外部脚本传输 (例如在 TrainSchedule 改变了车次状态)
  useEffect(() => {
    if (initialScript.chinese) {
      setChineseScript(initialScript.chinese);
    }
    if (initialScript.english) {
      setEnglishScript(initialScript.english);
    }
  }, [initialScript]);

  // 更新混响参数
  useEffect(() => {
    updateReverbParams(0.45, reverbDelay / 1000, reverbWet / 100);
  }, [reverbWet, reverbDelay]);

  // 绘制音轨示波器 canvas 频谱
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    let analyser: AnalyserNode | null = null;
    try {
      analyser = getAnalyser();
    } catch (e) {
      // 避免某些环境限制
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      const width = canvas.width;
      const height = canvas.height;
      canvasCtx.clearRect(0, 0, width, height);

      // 背景栅格
      canvasCtx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      canvasCtx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(x, 0);
        canvasCtx.lineTo(x, height);
        canvasCtx.stroke();
      }
      for (let y = 0; y < height; y += 15) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, y);
        canvasCtx.lineTo(width, y);
        canvasCtx.stroke();
      }

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);

        // 绘制频谱柱
        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.85;

          const r = 59 + (barHeight * 0.7);
          const g = 130 + (barHeight * 0.3);
          const b = 246;

          canvasCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${isPlaying ? 0.82 : 0.25})`;
          canvasCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }

        // 绘制示波中心正弦波
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.beginPath();
        canvasCtx.lineWidth = 2.5;
        canvasCtx.strokeStyle = '#22c55e'; // 经典翠绿雷达色
        
        const sliceWidth = width / bufferLength;
        let waveX = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const waveY = (v * height) / 2;

          if (i === 0) {
            canvasCtx.moveTo(waveX, waveY);
          } else {
            canvasCtx.lineTo(waveX, waveY);
          }

          waveX += sliceWidth;
        }
        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();
      } else {
        // 静态横波
        canvasCtx.beginPath();
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#475569';
        canvasCtx.moveTo(0, height / 2);
        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // 提取词典中的已知词
  const getDictWords = () => dictionary.map(d => d.word);

  // 贪婪最大匹配中文分词算法
  const parseChineseToBlocks = (text: string) => {
    if (!text) return [];
    // 过滤符号
    const cleanStr = text.replace(/[\,\.\?，。？！_、：]/g, ' ');
    const dictWords = getDictWords();
    const result: string[] = [];

    // 先按空格切割，保持原词格式与数字的分隔
    const slices = cleanStr.split(/\s+/).filter(item => item.trim().length > 0);

    for (const slice of slices) {
      let temp = slice;
      while (temp.length > 0) {
        let matched = false;
        // 回溯寻找最长词
        for (let len = Math.min(temp.length, 12); len > 0; len--) {
          const sub = temp.substring(0, len);
          if (dictWords.includes(sub) || /^[A-Za-z0-9]+$/.test(sub)) {
            result.push(sub);
            temp = temp.substring(len);
            matched = true;
            break;
          }
        }
        if (!matched) {
          result.push(temp.charAt(0));
          temp = temp.substring(1);
        }
      }
    }
    return result;
  };

  // 英文按照单词/缩写分词
  const parseEnglishToBlocks = (text: string) => {
    if (!text) return [];
    const cleanStr = text.replace(/[\,\.\?，。？！_、：]/g, ' ');
    return cleanStr.split(/\s+/).filter(item => item.trim().length > 0);
  };

  const chineseBlocks = parseChineseToBlocks(chineseScript);
  const englishBlocks = parseEnglishToBlocks(englishScript);

  // 一键预设模板点击
  const handleApplyTemplate = (temp: BroadcastTemplate) => {
    setChineseScript(temp.chinese);
    setEnglishScript(temp.english);
  };

  // 拼接音频片段播放执行！
  const handlePlayBroadcast = () => {
    if (isPlaying) {
      handleStopBroadcast();
      return;
    }

    // 组合队列
    const activeBlocks = activeTab === 'chinese' ? chineseBlocks : englishBlocks;
    if (activeBlocks.length === 0) return;

    const queue = activeBlocks.map((word) => {
      const clip = customAudioClips[word];
      return {
        word,
        blobUrl: clip && clip.blobUrl ? clip.blobUrl : undefined,
      };
    });

    setIsPlaying(true);
    setCurrentSegmentLanguage(activeTab === 'chinese' ? 'zh' : 'en');

    playSplicedQueue(queue, {
      speechRate,
      speechPitch,
      chimeType,
      voiceGender,
      onSegmentStart: (idx) => {
        setCurrentWordIndex(idx);
      },
      onSegmentEnd: (idx) => {
        // 完成
      },
      onComplete: () => {
        setIsPlaying(false);
        setCurrentWordIndex(null);
      },
    });
  };

  const handleStopBroadcast = () => {
    stopAllPlayback();
    setIsPlaying(false);
    setCurrentWordIndex(null);
  };

  // 语音现场录制控制
  const startRecording = async (word: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const blobUrl = URL.createObjectURL(audioBlob);
        
        const clip: AudioClip = {
          word,
          blob: audioBlob,
          blobUrl,
          type: 'recorded',
          duration: audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0) / 100, // 估算
          createdAt: Date.now()
        };
        onAddCustomAudio(word, clip);
        setIsRecording(false);
        setRecordingWord(null);

        // 关闭音轨输入
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingWord(word);
    } catch (err) {
      console.error('获取麦克风失败:', err);
      alert('无法开启麦克风。请在浏览器上方或系统设置中允许本页面使用麦克风权限！');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // 上传外部音频素材绑定
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, word: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    const clip: AudioClip = {
      word,
      blob: file,
      blobUrl,
      type: 'uploaded',
      createdAt: Date.now()
    };
    onAddCustomAudio(word, clip);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl flex flex-col h-full text-slate-100 select-none" id="broadcast-terminal">
      {/* 模块头部栏 */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
            广播实时拼接对讲合成器 (ANNOUNCEMENT WORKBENCH)
          </h2>
        </div>

        {/* 广播红绿指示灯 */}
        <div>
          {isPlaying ? (
            <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded border border-red-500/20 animate-pulse flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
              ON AIR 放送中
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-slate-950 text-slate-500 text-[10px] font-bold rounded border border-slate-800 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></span>
              STANDBY 网联就绪
            </span>
          )}
        </div>
      </div>

      {/* 预设高铁场景一键广播 */}
      <div className="mb-4">
        <span className="text-xs font-bold text-slate-400 block mb-1.5">快捷场景对讲模板器:</span>
        <div className="flex flex-wrap gap-1.5" id="presets-container">
          {PRESET_TEMPLATES.map((temp) => (
            <button
              key={temp.id}
              onClick={() => handleApplyTemplate(temp)}
              className="px-2 py-1 text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-slate-300 transition-all flex items-center gap-1 text-left"
              title={`${temp.description}\n\n${temp.chinese}`}
            >
              <Sparkles size={11} className="text-blue-400 shrink-0" />
              <span>{temp.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 双视窗选项卡：中英文双卡 */}
      <div className="flex items-center gap-2 mb-3 bg-slate-950 p-1 rounded-lg border border-slate-850" id="lang-switch-tabs">
        <button
          onClick={() => { setActiveTab('chinese'); handleStopBroadcast(); }}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'chinese'
              ? 'bg-slate-800 text-white shadow font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe size={13} className="text-red-400" />
          <span>中文客运提示词排布</span>
        </button>
        <button
          onClick={() => { setActiveTab('english'); handleStopBroadcast(); }}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'english'
              ? 'bg-slate-800 text-white shadow font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe size={13} className="text-blue-400" />
          <span>英文客运提示词排布</span>
        </button>
      </div>

      {/* 文本输入修改区 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* 输入与拼接展示 9列 */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative">
            <textarea
              value={activeTab === 'chinese' ? chineseScript : englishScript}
              onChange={(e) => activeTab === 'chinese' ? setChineseScript(e.target.value) : setEnglishScript(e.target.value)}
              placeholder={activeTab === 'chinese' ? '输入广播文字段，用空格区分单词更有利于录音切片拼接...' : 'Enter English broadcast script here...'}
              className="w-full h-24 bg-slate-950 text-slate-100 rounded-lg p-3 text-sm border border-slate-800 focus:border-blue-500 focus:outline-none font-sans leading-relaxed resize-none shadow-inner"
              id="script-input-textarea"
            />
            {/* 快捷清除 */}
            <button
              onClick={() => activeTab === 'chinese' ? setChineseScript('') : setEnglishScript('')}
              className="absolute right-2 bottom-2 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded font-mono text-[10px]"
            >
              清空文本
            </button>
          </div>

          {/* 可视化切片显示 (100% 拼接原理模拟区域) */}
          <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex flex-col gap-2 shadow-inner" id="splicing-bricks-box">
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span className="font-bold flex items-center gap-1">
                <Sliders size={12} className="text-yellow-400" />
                按词句走向自动匹配的声元切片 (共 {activeTab === 'chinese' ? chineseBlocks.length : englishBlocks.length} 个):
              </span>
              <span className="flex gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 已录音/上传
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 系统TTS补全
                </span>
              </span>
            </div>

            {/* 切片砖展示行 */}
            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 border border-slate-900 bg-slate-950/40 rounded">
              {(activeTab === 'chinese' ? chineseBlocks : englishBlocks).map((word, idx) => {
                const isPlayingCurrent = isPlaying && currentWordIndex === idx;
                const hasClip = !!customAudioClips[word];
                const clipType = hasClip ? customAudioClips[word].type : 'system';

                return (
                  <div
                    key={idx}
                    className={`relative p-2.5 rounded-md border flex flex-col items-center justify-between min-w-[70px] select-none transition-all group ${
                      isPlayingCurrent
                        ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-lg scale-105 font-bold animate-bounce'
                        : hasClip
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {/* 字词内容 */}
                    <span className="text-xs font-bold leading-none">{word}</span>
                    
                    {/* 录制/上传等快捷按钮悬浮 (仅当不播放时可见) */}
                    {!isPlaying && (
                      <div className="absolute inset-0 bg-slate-950/90 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity px-1">
                        {/* 录音按键 */}
                        <button
                          onClick={() => recordingWord === word ? stopRecording() : startRecording(word)}
                          className={`p-1 rounded-full transition-colors ${
                            recordingWord === word
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-400'
                          }`}
                          title={recordingWord === word ? '停止录音' : '现场录制自身声元'}
                        >
                          <Mic size={11} />
                        </button>

                        {/* 上传音频 */}
                        <label className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 cursor-pointer">
                          <Upload size={11} />
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleFileUpload(e, word)}
                            className="hidden"
                          />
                        </label>

                        {/* 摘除已上传 */}
                        {hasClip && (
                          <button
                            onClick={() => onClearCustomAudio(word)}
                            className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-red-400"
                            title="恢复到系统语音"
                          >
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* 切片类型小尾标 */}
                    <div className="text-[8px] font-mono mt-1 text-slate-500 scale-90">
                      {isPlayingCurrent ? '📢 放送中' : hasClip ? '🟢 录制声' : '🔵 系统音'}
                    </div>
                  </div>
                );
              })}
              {(activeTab === 'chinese' ? chineseBlocks : englishBlocks).length === 0 && (
                <div className="w-full text-center py-6 text-xs text-slate-600">
                  请在上方输入文字片段，系统将瞬时切片。
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 调皮的模拟音调面板 4列 */}
        <div className="lg:col-span-4 bg-slate-950 p-4 rounded-lg border border-slate-850 flex flex-col gap-4 text-xs font-sans">
          <div className="font-bold text-slate-400 border-b border-slate-850 pb-1 flex items-center gap-1.5">
            <Sliders size={13} className="text-blue-400" />
            <span>车站调音及频响均衡器</span>
          </div>

          {/* 默认预设前调铃声音 */}
          <div>
            <label className="block text-slate-400 pb-1 font-medium">广播起始铃声风格</label>
            <select
              value={chimeType}
              onChange={(e) => setChimeType(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1.5 text-white text-xs"
            >
              <option value="normal">经典的4声高铁进站/检票铃声</option>
              <option value="departure">离站简短双音铃声</option>
              <option value="emergency">防灾紧急双音急哨</option>
              <option value="none">无铃声（直达对讲）</option>
            </select>
          </div>

          {/* 默认音轨合成性别 */}
          <div>
            <label className="block text-slate-400 pb-1 font-medium">系统合成发音音色</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setVoiceGender('female')}
                className={`py-1.5 rounded border text-xs font-medium transition-all ${
                  voiceGender === 'female'
                    ? 'bg-rose-950 text-rose-300 border-rose-800 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                标准播音女声 (推荐)
              </button>
              <button
                onClick={() => setVoiceGender('male')}
                className={`py-1.5 rounded border text-xs font-medium transition-all ${
                  voiceGender === 'male'
                    ? 'bg-blue-950 text-blue-300 border-blue-800 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                浑厚客服男声
              </button>
            </div>
          </div>

          {/* 混响效果控制 (空灵回音模拟) */}
          <div className="space-y-3 p-2.5 bg-slate-900/60 rounded border border-slate-850">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300">立体站厅混响模拟 (Echo)</span>
              <span className="text-[10px] text-blue-400 font-mono font-bold">{reverbWet}% Wet</span>
            </div>
            
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>混响音量 (Wet Mix)</span>
                <span>{reverbWet}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={reverbWet}
                onChange={(e) => setReverbWet(Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-1 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>反射延迟时间 (Delay)</span>
                <span>{reverbDelay} ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="700"
                step="20"
                value={reverbDelay}
                onChange={(e) => setReverbDelay(Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-1 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* 语速语调控制 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-medium">
                <span>播音速度 (Rate)</span>
                <span>{speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="w-full accent-red-500 bg-slate-800 h-1 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-medium">
                <span>音频音调 (Pitch)</span>
                <span>{speechPitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(Number(e.target.value))}
                className="w-full accent-green-500 bg-slate-800 h-1 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 实时雷达电讯波谱监控 canvas */}
      <div className="mt-4 bg-slate-950 rounded-lg p-2.5 border border-slate-850 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0 select-none">
          <Activity size={15} className={`text-emerald-500 ${isPlaying ? 'animate-spin' : ''}`} />
          <span>频响频带雷达监听屏 (Live Analyser):</span>
        </div>
        <canvas
          ref={canvasRef}
          width="480"
          height="32"
          className="flex-1 w-full bg-slate-900 border border-slate-850 rounded h-8"
        />

        {/* 核心播放指令键 */}
        <div className="flex gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
          <button
            onClick={handleStopBroadcast}
            disabled={!isPlaying}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 flex-1 md:flex-none transition-colors border ${
              isPlaying
                ? 'bg-slate-900 hover:bg-zinc-800 text-red-500 border-red-900/60 active:bg-zinc-900'
                : 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed'
            }`}
          >
            <Square size={13} className="fill-current" />
            <span>紧急切断(静音)</span>
          </button>
          
          <button
            onClick={handlePlayBroadcast}
            disabled={(activeTab === 'chinese' ? chineseBlocks : englishBlocks).length === 0}
            className={`px-6 py-2 text-xs font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 flex-1 md:flex-none transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-900/30'
            }`}
          >
            <Play size={13} className="fill-current" />
            <span>{isPlaying ? '暂停/切断' : '拼接后播音 (Play)'}</span>
          </button>
        </div>
      </div>

      {/* 现场录音中悬浮条 */}
      {isRecording && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-900 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-red-950 border border-red-600 flex items-center justify-center text-red-500 animate-pulse">
              <Mic size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5">
                正在录制专属词: <strong className="text-red-400 font-sans">“{recordingWord}”</strong>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                请对着麦克风清晰朗读上述字词短句，点击下方“停止录音并保存”完成本段声元的采集绑定。
              </p>
            </div>
            <button
              onClick={stopRecording}
              className="w-full py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-lg shadow-lg"
            >
              停止录音并保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
