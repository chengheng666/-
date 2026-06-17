import React, { useState, useEffect } from 'react';
import { Volume2, ShieldAlert, Cpu, Radio, ListMusic, BellRing } from 'lucide-react';
import { playRailwayChime } from '../utils/audioEngine';

export default function Header() {
  const [time, setTime] = useState<Date>(new Date());
  const [chimeStatus, setChimeStatus] = useState<string>('就绪');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerChime = (type: 'normal' | 'emergency' | 'departure') => {
    const typeNames = { normal: '开始/进站铃', emergency: '紧急铃声', departure: '简短离站铃' };
    setChimeStatus(`正在播放 ${typeNames[type]}...`);
    playRailwayChime(type, () => {
      setChimeStatus('就绪');
    });
  };

  const formatTime = (t: Date) => {
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const ss = String(t.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const formatDate = (t: Date) => {
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const w = weekDays[t.getDay()];
    return `${y}年${m}月${d}日 ${w}`;
  };

  return (
    <header className="flex flex-col xl:flex-row items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shadow-xl text-slate-300 select-none" id="sys-header">
      {/* 标题 */}
      <div className="flex items-center gap-4 w-full xl:w-auto pb-3 xl:pb-0 border-b xl:border-b-0 border-slate-800">
        <div className="p-2 bg-blue-600 rounded-lg text-white shrink-0 shadow-lg" id="header-logo-container">
          <Radio size={22} className="stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans" id="title-cn">
            高铁车站广播与防灾一体化调度控制台
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-mono mt-0.5" id="title-en">
            Integrated Rail Broadcast & Civil Defense Dispatch Console
          </p>
        </div>
      </div>

      {/* 实时铃声测试、状态与数字客用大摆钟 */}
      <div className="flex flex-wrap items-center justify-between xl:justify-end gap-5 xl:gap-8 w-full xl:w-auto pt-3 xl:pt-0">
        {/* 系统状态 */}
        <div className="flex flex-col items-start xl:items-end">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono leading-none">系统状态 System Mode</span>
          <span className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            离线本地集成模式 (OFFLINE)
          </span>
        </div>

        <div className="hidden md:block h-8 w-[1px] bg-slate-800"></div>

        {/* 快捷物理铃声测试栏 */}
        <div className="flex flex-col items-start xl:items-end">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono leading-none">提示声测试 Chime Trigger</span>
          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800 gap-1 mt-1 shrink-0" id="quick-chimes">
            <button
              onClick={() => triggerChime('normal')}
              className="px-2 py-0.5 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-slate-600 transition-all flex items-center gap-1 cursor-pointer"
              title="播放经典的4声高铁进站/检票揭示提示音"
              id="chime-normal-btn"
            >
              <BellRing size={10} className="text-emerald-400 shrink-0" />
              <span>进站铃</span>
            </button>
            <button
              onClick={() => triggerChime('departure')}
              className="px-2 py-0.5 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-slate-600 transition-all flex items-center gap-1 cursor-pointer"
              title="简短2声离站提示铃"
              id="chime-dep-btn"
            >
              <Volume2 size={10} className="text-cyan-400 shrink-0" />
              <span>提示铃</span>
            </button>
            <button
              onClick={() => triggerChime('emergency')}
              className="px-2 py-0.5 text-[10px] font-bold bg-slate-900 hover:bg-amber-950/60 hover:text-amber-300 text-slate-400 rounded border border-slate-800 hover:border-amber-900 transition-all flex items-center gap-1 cursor-pointer"
              title="紧急警笛提示铃"
              id="chime-emerg-btn"
            >
              <ShieldAlert size={10} className="text-red-400 animate-pulse shrink-0" />
              <span>防灾警笛</span>
            </button>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-slate-800"></div>

        {/* 电子时钟 (标准三色灯效高密精美板) */}
        <div className="flex items-center gap-3 bg-slate-950 px-3 py-1 rounded border border-slate-800 shadow-inner">
          <div className="flex flex-col text-right select-none justify-center">
            <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase leading-none">SYS_RTC_CLOCK</span>
            <span className="text-[10px] text-blue-400 font-mono font-bold mt-1 leading-none">{formatDate(time)}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <div className="text-2xl font-mono text-white tracking-widest leading-none font-bold tabular-nums min-w-[100px] text-center" id="station-time">
            {formatTime(time)}
          </div>
        </div>
      </div>
    </header>
  );
}
