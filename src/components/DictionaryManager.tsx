import React, { useState, useRef } from 'react';
import { DictItem, CategoryType, AudioClip } from '../types';
import { Search, Plus, Trash2, Volume2, Mic, Upload, ArrowRightLeft, Sparkles, Filter, Check, ShieldAlert, Heart, Radio, RotateCcw, Info } from 'lucide-react';

interface DictionaryManagerProps {
  dictionary: DictItem[];
  customAudioClips: { [word: string]: AudioClip };
  onAddWordToDict: (word: string, pinyin: string, category: CategoryType) => void;
  onAddCustomAudio: (word: string, clip: AudioClip) => void;
  onClearCustomAudio: (word: string) => void;
}

export default function DictionaryManager({
  dictionary,
  customAudioClips,
  onAddWordToDict,
  onAddCustomAudio,
  onClearCustomAudio,
}: DictionaryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  
  // 新建词汇
  const [newWord, setNewWord] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryType>('station');

  // 用于现场录音
  const [recordingWord, setRecordingWord] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const categories: { [key in CategoryType]: { name: string; color: string; bg: string } } = {
    courtesy: { name: '礼貌称呼', color: 'text-violet-400 border-violet-800', bg: 'bg-violet-950/40' },
    train: { name: '车次类型', color: 'text-blue-400 border-blue-800', bg: 'bg-blue-950/40' },
    station: { name: '站名库', color: 'text-rose-400 border-rose-800', bg: 'bg-rose-950/40' },
    action: { name: '运营动作', color: 'text-emerald-400 border-emerald-800', bg: 'bg-emerald-950/40' },
    number: { name: '编号数字', color: 'text-cyan-400 border-cyan-800', bg: 'bg-cyan-950/40' },
    warning: { name: '防护警示', color: 'text-amber-400 border-amber-800', bg: 'bg-amber-950/40' },
  };

  const handleAddNewWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    // 简单匹配拼音如果为空
    const pinyin = newPinyin.trim() || 'zì dòng píng yīn';
    onAddWordToDict(newWord.trim(), pinyin, newCategory);
    setNewWord('');
    setNewPinyin('');
  };

  // 播放单音预览
  const testPlaySingleWord = (item: DictItem) => {
    const hasClip = !!customAudioClips[item.word];
    if (hasClip && customAudioClips[item.word].blobUrl) {
      const audio = new Audio(customAudioClips[item.word].blobUrl);
      audio.play().catch(e => console.error(e));
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(item.word);
        u.rate = 0.85;
        u.lang = 'zh-CN';
        window.speechSynthesis.speak(u);
      }
    }
  };

  // 现场一键录音
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
          duration: audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0) / 100,
          createdAt: Date.now()
        };
        onAddCustomAudio(word, clip);
        setIsRecording(false);
        setRecordingWord(null);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingWord(word);
    } catch (err) {
      alert('录音开启异常，请核对是否赋予其本平台多媒体控制话筒许可。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

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

  // 搜索和分类双模过滤
  const filteredDict = dictionary.filter((item) => {
    const matchesSearch = item.word.includes(searchTerm) || item.pinyin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full text-slate-100" id="dictionary-hub">
      {/* 模块头部 (高密样式) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            离线高保真广播声元词典库 (AUDIO DATABASE)
          </h2>
        </div>
      </div>

      {/* 新增词汇输入区 */}
      <form onSubmit={handleAddNewWord} className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
        <div>
          <label className="block text-slate-400 pb-1 font-medium">新增广播词汇 (e.g. 南京东)</label>
          <input
            type="text"
            required
            placeholder="例如: 重庆北"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 pb-1 font-medium">罗马拼音助念 (用空格分写)</label>
          <input
            type="text"
            placeholder="例如: chóng qìng běi"
            value={newPinyin}
            onChange={(e) => setNewPinyin(e.target.value)}
            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 pb-1 font-medium">应用分类属性</label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as CategoryType)}
            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-white focus:outline-none cursor-pointer"
          >
            <option value="station">站名库 (Station Names)</option>
            <option value="train">车次类型 (Train Prefix)</option>
            <option value="courtesy">礼貌称呼 (Polite / Titles)</option>
            <option value="action">运营动作 (Actions / Verb)</option>
            <option value="number">编号数字 (Numbers)</option>
            <option value="warning">防护警示 (Safety Notices)</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold shadow-md flex items-center justify-center gap-1 transition-colors"
          >
            <Plus size={14} />
            <span>录入此广播声词</span>
          </button>
        </div>
      </form>

      {/* 搜索与检索项控制 */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center mb-4 text-xs">
        {/* 搜索框 */}
        <div className="relative flex-1 w-full" id="search-box-wrap">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550" />
          <input
            type="text"
            placeholder="检索拼音或汉词... (如: 上海, běi)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* 快捷过滤器 */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-slate-100 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            全部
          </button>
          {Object.entries(categories).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as CategoryType)}
              className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap font-medium transition-all ${
                selectedCategory === key
                  ? 'bg-slate-800 text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {value.name}
            </button>
          ))}
        </div>
      </div>

      {/* 字典卡片网格列表 */}
      <div className="flex-1 overflow-y-auto max-h-[380px] pr-1" id="dict-words-grid">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredDict.map((item, idx) => {
            const catInfo = categories[item.category];
            const hasClip = !!customAudioClips[item.word];
            const clipInfo = customAudioClips[item.word];

            return (
              <div
                key={item.word + idx}
                className={`p-2.5 bg-slate-950/45 rounded-lg border border-slate-800 hover:border-slate-700/60 transition-all flex flex-col justify-between gap-2.5 ${
                  hasClip ? 'ring-1 ring-emerald-900/50 border-emerald-500/30' : ''
                }`}
                id={`dict-word-card-${item.word}`}
              >
                {/* 文本字词详情 */}
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-sm font-bold text-slate-100">{item.word}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border ${catInfo.color} ${catInfo.bg} font-mono uppercase`}>
                      {catInfo.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.pinyin}</p>
                </div>

                {/* 播发状态标志：录制或默认 */}
                <div className="flex items-center justify-between gap-1 text-[10px]" id="clip-status-indicator">
                  {hasClip ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>已存专属声 {clipInfo.type === 'recorded' ? '(录制)' : '(上传)'}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                      <span>默认系统发音</span>
                    </span>
                  )}
                </div>

                {/* 控制条：录像、测试播放、删除 */}
                <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-900 bg-slate-950/20">
                  {/* 单音试听 */}
                  <button
                    onClick={() => testPlaySingleWord(item)}
                    className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-slate-100 rounded flex items-center justify-center transition-colors border border-slate-800"
                    title="点击试听此段声元"
                  >
                    <Volume2 size={12} />
                  </button>

                  {/* 现场录制 */}
                  <button
                    onClick={() => recordingWord === item.word ? stopRecording() : startRecording(item.word)}
                    className={`p-1 rounded flex items-center justify-center transition-colors border ${
                      recordingWord === item.word
                        ? 'bg-red-600 text-white animate-pulse border-red-500'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-red-400 border-slate-800'
                    }`}
                    title={recordingWord === item.word ? '停止录音并保存' : '录制自身声源'}
                  >
                    <Mic size={12} />
                  </button>

                  {/* 外部素材上传 / 恢复 */}
                  {hasClip ? (
                    <button
                      onClick={() => onClearCustomAudio(item.word)}
                      className="p-1 bg-slate-900 hover:bg-rose-950 hover:text-rose-400 text-slate-500 rounded flex items-center justify-center transition-colors border border-slate-800"
                      title="重置！清除专属声，恢复标准系统音色"
                    >
                      <RotateCcw size={12} />
                    </button>
                  ) : (
                    <label className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-blue-400 rounded flex items-center justify-center transition-colors border border-slate-800 cursor-pointer text-center">
                      <Upload size={12} />
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleFileUpload(e, item.word)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
          {filteredDict.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-600 text-xs font-sans">
              没有搜索到符合过滤条件的广播声元。
            </div>
          )}
        </div>
      </div>

      {/* 底部词库原理简要图释 */}
      <div className="mt-3 bg-slate-950 p-2.5 rounded border border-slate-850 text-[11px] text-slate-500 flex gap-2 items-center">
        <Info size={14} className="text-violet-400 shrink-0" />
        <p className="leading-tight">
          <strong className="text-slate-400">词库拼盘合成原则 (Offline Principle):</strong> 当广播面板中输入某词时，系统将精准检测本库并调用对应的“专属录音文件”进行 WebAudio 拼接播放；如有词汇未录制专属声，系统将平滑交会给内置合成音色以资互补。
        </p>
      </div>

      {/* 现场录制模态 */}
      {isRecording && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-900 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-950 border border-red-600 flex items-center justify-center text-red-500 animate-pulse">
              <Mic size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                正在录音: <strong className="text-red-400 font-sans">“{recordingWord}”</strong>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                请清晰、富有客容量、舒缓地朗读上面的字词短句，点击下方“停止录音并保存”完成本段音效的本地采集。
              </p>
            </div>
            <button
              onClick={stopRecording}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg"
            >
              停止录音并保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


