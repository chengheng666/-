import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TrainSchedule from './components/TrainSchedule';
import BroadcastWorkspace from './components/BroadcastWorkspace';
import DictionaryManager from './components/DictionaryManager';
import { INITIAL_TRAINS, DEFAULT_DICTIONARY } from './data/dictionary';
import { TrainInfo, DictItem, AudioClip, CategoryType } from './types';
import { Download, Upload, Info, FileAudio, RotateCcw, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  // 1. 数据状态
  const [trains, setTrains] = useState<TrainInfo[]>(INITIAL_TRAINS);
  const [dictionary, setDictionary] = useState<DictItem[]>(DEFAULT_DICTIONARY);
  const [customAudioClips, setCustomAudioClips] = useState<{ [word: string]: AudioClip }>({});
  
  // 当前输送给广播台编辑区的脚本
  const [activeScript, setActiveScript] = useState<{ chinese: string; english: string }>({
    chinese: "各位旅客 请注意 由本站始发 开往 上海虹桥 的 G 1 0 1 次 列车 开始检票了 请前往 第 2 检票口 检票 祝您旅途愉快",
    english: "Dear passengers, attention please. Train G 1 0 1 originating from this station bound for Shanghai Hongqiao is now checking tickets. Please go to Ticket Gate No. 2. We wish you a pleasant journey.",
  });

  // 状态标记
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  // 2. 根据车次状态变化一键合成标准高铁客运广播稿
  const handleSelectTrainBroadcast = (
    train: TrainInfo,
    actionType: 'start_checking' | 'stop_checking' | 'arriving' | 'delayed'
  ) => {
    // 高铁标准车次中文数字分解，如将 G101 分解成 G 1 0 1
    const trainNumSpaced = train.trainNumber.split('').join(' ');
    const checkGateSpaced = train.checkGate.split('').join(' ');
    const platformSpaced = train.platform.split('').join(' ');
    const delaySpaced = String(train.delayMinutes || 15).split('').join(' ');

    let cn = "";
    let en = "";

    switch (actionType) {
      case 'start_checking':
        cn = `各位旅客 请注意 由 ${train.origin === train.route[0] ? '本站始发' : train.origin} 开往 ${train.destination} 的 ${trainNumSpaced} 次 列车 开始检票了 请前往 第 ${checkGateSpaced} 检票口 检票 祝您旅途愉快`;
        en = `Dear passengers, attention please. Train ${trainNumSpaced} from ${train.origin} bound for ${train.destination} is now checking tickets. Please go to Ticket Gate No. ${checkGateSpaced}. We wish you a pleasant journey.`;
        break;
      case 'stop_checking':
        cn = `各位旅客 请注意 开往 ${train.destination} 的 ${trainNumSpaced} 次 列车 停止检票了 已经检票的旅客 请前往 第 ${platformSpaced} 站台 乘车 祝您旅途愉快`;
        en = `Dear passengers, attention please. Train ${trainNumSpaced} bound for ${train.destination} has stopped checking tickets. Checked passengers please go to Platform No. ${platformSpaced} to board.`;
        break;
      case 'arriving':
        cn = `各位旅客 请注意 由 ${train.origin} 开往 ${train.destination} 的 ${trainNumSpaced} 次 列车 准备进站 请在 候车室 候车的旅客 请到 第 ${platformSpaced} 站台 准备乘车 注意列车与站台的空隙 注意安全`;
        en = `Dear passengers, attention please. Train ${trainNumSpaced} from ${train.origin} bound for ${train.destination} is arriving at Platform No. ${platformSpaced}. Passengers waiting in the hall please go to Platform No. ${platformSpaced} to board. Please mind the gap.`;
        break;
      case 'delayed':
        cn = `各位旅客 请注意 开往 ${train.destination} 的 ${trainNumSpaced} 次 列车 晚点 预计晚点 ${delaySpaced} 分钟 列车 晚点 给您带来不便 铁路部门 敬请谅解`;
        en = `Dear passengers, attention please. Train ${trainNumSpaced} bound for ${train.destination} is delayed. The expected delay time is ${delaySpaced} minutes. We apologize for the delay.`;
        break;
    }

    setActiveScript({ chinese: cn, english: en });
  };

  // 3. 词典词包拓展
  const handleAddWordToDict = (word: string, pinyin: string, category: CategoryType) => {
    // 检查是否已包含该词
    if (dictionary.some((item) => item.word === word)) {
      alert(`声元库中已包含词汇: "${word}"，请勿重复添加。`);
      return;
    }
    const item: DictItem = { word, pinyin, category, isCustom: true };
    setDictionary([...dictionary, item]);
  };

  const handleAddCustomAudio = (word: string, clip: AudioClip) => {
    setCustomAudioClips((prev) => ({
      ...prev,
      [word]: clip,
    }));
  };

  const handleClearCustomAudio = (word: string) => {
    setCustomAudioClips((prev) => {
      const copy = { ...prev };
      delete copy[word];
      return copy;
    });
  };

  // 4. 重磅离线特技：声元词包Base64备份打包导出
  const handleExportVoicePack = async () => {
    try {
      const exportData: { [word: string]: string } = {};
      const wordsWithClips = Object.keys(customAudioClips);

      if (wordsWithClips.length === 0) {
        alert("当前还没有录制或上传任何自定义声源。请到下方词库中录制或上传几个声音后再导出备份包！");
        return;
      }

      // 将每个 Blob 编码转换为 Base64 字符串
      for (const word of wordsWithClips) {
        const clip = customAudioClips[word];
        if (clip.blob) {
          const base64 = await blockToDataURL(clip.blob);
          exportData[word] = base64;
        }
      }

      // 创建下载
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataUri);
      downloadAnchor.setAttribute("download", `GaoTie_Station_VoicePack_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error(e);
      alert("导出由于浏览器安全等限制失败，请重试。");
    }
  };

  // 5. 词包备份导入还原
  const handleImportVoicePack = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBackupLoading(true);
    setBackupSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const importedClips: { [word: string]: AudioClip } = {};

        for (const [word, base64] of Object.entries(json)) {
          if (typeof base64 === 'string') {
            const blob = await dataURLtoBlob(base64);
            const blobUrl = URL.createObjectURL(blob);
            importedClips[word] = {
              word,
              blob,
              blobUrl,
              type: 'recorded', // 还原成已导入的录制音轨
              createdAt: Date.now()
            };

            // 如果该词在预设词汇中不存在，自动追加到辞库
            if (!dictionary.some(d => d.word === word)) {
              dictionary.push({
                word,
                pinyin: "dǎo rù yīn pǐn",
                category: "station",
                isCustom: true
              });
            }
          }
        }

        setCustomAudioClips((prev) => ({
          ...prev,
          ...importedClips
        }));

        setBackupSuccessMsg(`成功导入 ${Object.keys(importedClips).length} 个专有声音，声元词库已重构！`);
        setTimeout(() => setBackupSuccessMsg(null), 4000);
      } catch (err) {
        console.error(err);
        alert("导入备份包失败，请检查文件格式是否是由本软件导出的规范 JSON。");
      } finally {
        setIsBackupLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Blob 转 Base64 DataURL Helper
  const blockToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Base64 DataURL 转 Blob Helper
  const dataURLtoBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none antialiased" id="global-layout">
      {/* 顶部总控台标题和数字时钟 */}
      <Header />

      {/* 核心工作流容器 */}
      <main className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-7xl mx-auto w-full" id="main-grid">
        
        {/* 左侧：车次调度网状大屏 (占用 5/12 宽度) */}
        <section className="xl:col-span-5 h-[560px] flex flex-col" id="trains-section">
          <TrainSchedule
            trains={trains}
            onSelectTrainBroadcast={handleSelectTrainBroadcast}
            onUpdateTrains={setTrains}
          />
        </section>

        {/* 右侧：广播文字切片拼接 workbench 与调音台 (占用 7/12 宽度) */}
        <section className="xl:col-span-7 h-[560px] flex flex-col mt-4 xl:mt-0" id="workbench-section">
          <BroadcastWorkspace
            initialScript={activeScript}
            dictionary={dictionary}
            customAudioClips={customAudioClips}
            onAddCustomAudio={handleAddCustomAudio}
            onClearCustomAudio={handleClearCustomAudio}
          />
        </section>

        {/* 下方全宽：声汇辞库总览与导入导出备份 (占用 12/12 宽度) */}
        <section className="col-span-1 bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-2xl flex flex-col xl:col-span-12 mt-4" id="dict-hub-section">
          {/* 同步栏及声元包备份仓 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 mb-4 gap-3">
            <div className="flex items-center gap-2">
              <FileAudio className="text-violet-500" size={18} />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                声源云备份与多端离线词包打包控制 (OFFLINE BACKUP)
              </h3>
            </div>

            {/* 词包导入导出 */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {backupSuccessMsg && (
                <span className="text-emerald-400 font-medium bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800 flex items-center gap-1 animate-fadeIn">
                  <ShieldCheck size={14} />
                  {backupSuccessMsg}
                </span>
              )}

              {/* 导出 JSON */}
              <button
                onClick={handleExportVoicePack}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-slate-600 transition-all flex items-center gap-1 cursor-pointer"
                title="导出现场录制/上传的所有音频切片内容，备份为一个离线语料 JSON 包"
              >
                <Download size={12} />
                <span>导出我的专属广播音词包</span>
              </button>

              {/* 导入 JSON */}
              <label className="px-2.5 py-1 text-[11px] font-bold bg-violet-950/50 hover:bg-violet-900/60 text-violet-300 rounded border border-violet-800 hover:border-violet-700 transition-all flex items-center gap-1 cursor-pointer">
                <Upload size={12} />
                <span>导入备份播音词包 (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportVoicePack}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 声源词典主体卡片格组 */}
          <DictionaryManager
            dictionary={dictionary}
            customAudioClips={customAudioClips}
            onAddWordToDict={handleAddWordToDict}
            onAddCustomAudio={handleAddCustomAudio}
            onClearCustomAudio={handleClearCustomAudio}
          />
        </section>
      </main>

      {/* 底部高密电讯指示器和状态栏 */}
      <footer className="bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row items-center px-6 py-2.5 justify-between text-[10px] font-mono text-slate-500 gap-2 shrink-0 select-none">
        <div className="flex flex-wrap gap-4 md:gap-6 justify-center md:justify-start">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 模拟车载功放系统: 正常</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> WebAudio引擎核心: 正常</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 专用声源体: 1.2GB Free</span>
          <span className="flex items-center gap-1.5 text-slate-400 font-sans">● CTCS-3 联锁保护中</span>
        </div>
        <div className="flex gap-4 justify-center md:justify-end">
          <span>CPU utilization: 12%</span>
          <span>RAM allocation: 442MB / 2.0GB</span>
          <span className="text-slate-400 hidden xl:inline">LOG: [Sensing Engine] GaoTie announcements compiled on-the-fly</span>
        </div>
      </footer>
    </div>
  );
}
