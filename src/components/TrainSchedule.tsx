import React, { useState } from 'react';
import { TrainInfo } from '../types';
import { Plus, Flame, Clock, Radio, Shield, AlertTriangle, Trash2, Edit2, Play, CornerDownRight } from 'lucide-react';

interface TrainScheduleProps {
  trains: TrainInfo[];
  onSelectTrainBroadcast: (train: TrainInfo, actionType: 'start_checking' | 'stop_checking' | 'arriving' | 'delayed') => void;
  onUpdateTrains: (updated: TrainInfo[]) => void;
}

export default function TrainSchedule({
  trains,
  onSelectTrainBroadcast,
  onUpdateTrains,
}: TrainScheduleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTrain, setNewTrain] = useState<Partial<TrainInfo>>({
    trainNumber: 'G',
    type: 'G',
    origin: '北京南',
    destination: '上海虹桥',
    route: ['北京南', '上海虹桥'],
    arrivalTime: '14:00',
    departureTime: '14:15',
    platform: '4',
    checkGate: '4A',
    status: 'waiting',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [delayInput, setDelayInput] = useState<{ [id: string]: number }>({});

  const handleStatusChange = (id: string, status: TrainInfo['status'], delayMins?: number) => {
    const updated = trains.map((t) => {
      if (t.id === id) {
        const item: TrainInfo = { ...t, status };
        if (status === 'delayed') {
          item.delayMinutes = delayMins || 15;
        } else {
          delete item.delayMinutes;
        }
        return item;
      }
      return t;
    });
    onUpdateTrains(updated);
    
    // 自动推送对应广播
    const targetTrain = updated.find(t => t.id === id);
    if (targetTrain) {
      let actionType: 'start_checking' | 'stop_checking' | 'arriving' | 'delayed' = 'start_checking';
      if (status === 'checking') actionType = 'start_checking';
      else if (status === 'checking_end') actionType = 'stop_checking';
      else if (status === 'arriving') actionType = 'arriving';
      else if (status === 'delayed') actionType = 'delayed';

      onSelectTrainBroadcast(targetTrain, actionType);
    }
  };

  const handleAddTrain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrain.trainNumber || newTrain.trainNumber.length < 2) return;

    const code = newTrain.trainNumber.trim().toUpperCase();
    const firstChar = code.charAt(0) as TrainInfo['type'];
    const type: TrainInfo['type'] = ['G', 'D', 'C', 'K', 'T', 'Z'].includes(firstChar) ? firstChar : 'G';

    const item: TrainInfo = {
      id: 'train_' + Date.now(),
      trainNumber: code,
      type,
      origin: newTrain.origin || '北京南',
      destination: newTrain.destination || '上海虹桥',
      route: [newTrain.origin || '北京南', newTrain.destination || '上海虹桥'],
      arrivalTime: newTrain.arrivalTime || '14:00',
      departureTime: newTrain.departureTime || '14:15',
      platform: newTrain.platform || '1',
      checkGate: newTrain.checkGate || '1',
      status: 'waiting',
    };

    onUpdateTrains([...trains, item]);
    setShowAddForm(false);
    setNewTrain({
      trainNumber: 'G',
      type: 'G',
      origin: '北京南',
      destination: '上海虹桥',
      route: ['北京南', '上海虹桥'],
      arrivalTime: '14:00',
      departureTime: '14:15',
      platform: '4',
      checkGate: '4A',
      status: 'waiting',
    });
  };

  const handleDeleteTrain = (id: string) => {
    const filtered = trains.filter((t) => t.id !== id);
    onUpdateTrains(filtered);
  };

  const statusMap = {
    waiting: { name: '候车中', color: 'bg-blue-900/50 text-blue-400 border-blue-500/30 font-medium' },
    checking: { name: '正在检票', color: 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30 font-bold animate-pulse' },
    checking_end: { name: '停止检票', color: 'bg-slate-800 text-slate-500 border-slate-700 font-medium' },
    arriving: { name: '列车进站', color: 'bg-indigo-900/40 text-indigo-400 border-indigo-500/30 font-bold' },
    delayed: { name: '列车晚点', color: 'bg-amber-900/50 text-amber-400 border-amber-500/30 font-bold' },
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl flex flex-col h-full" id="train-dispatch-card">
      {/* 模块头部 (高密样式) */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            发车时刻调度系统 (SCENE CONSOLE)
          </h2>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded flex items-center gap-1 transition-colors shadow-md shadow-blue-950/20"
          id="add-train-toggle"
        >
          <Plus size={12} />
          <span>+ 增开临客 (ADD_TRN)</span>
        </button>
      </div>

      {/* 新增列车表单 */}
      {showAddForm && (
        <form onSubmit={handleAddTrain} className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-4 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fadeIn">
          <div>
            <label className="block text-slate-400 pb-1 font-medium">车次 (首字母拼音+英文)</label>
            <input
              type="text"
              required
              placeholder="例如: G102"
              value={newTrain.trainNumber}
              onChange={(e) => setNewTrain({ ...newTrain, trainNumber: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 uppercase font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-400 pb-1 font-medium">始发站</label>
            <input
              type="text"
              required
              value={newTrain.origin}
              onChange={(e) => setNewTrain({ ...newTrain, origin: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-slate-400 pb-1 font-medium">终到站</label>
            <input
              type="text"
              required
              value={newTrain.destination}
              onChange={(e) => setNewTrain({ ...newTrain, destination: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-slate-400 pb-1 font-medium">进站时间(始发车写发车前时间)</label>
            <input
              type="text"
              required
              value={newTrain.arrivalTime}
              onChange={(e) => setNewTrain({ ...newTrain, arrivalTime: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 pb-1 font-medium">开车时间</label>
            <input
              type="text"
              required
              value={newTrain.departureTime}
              onChange={(e) => setNewTrain({ ...newTrain, departureTime: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 pb-1 font-medium">检票口</label>
            <input
              type="text"
              required
              value={newTrain.checkGate}
              onChange={(e) => setNewTrain({ ...newTrain, checkGate: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-bold text-center"
            />
          </div>
          <div>
            <label className="block text-slate-400 pb-1 font-medium">候车站台</label>
            <input
              type="text"
              required
              value={newTrain.platform}
              onChange={(e) => setNewTrain({ ...newTrain, platform: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-bold text-center"
            />
          </div>
          <div className="col-span-2 flex items-end justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium shadow-md"
            >
              确认增开 (G/D)
            </button>
          </div>
        </form>
      )}

      {/* 列车信息网状表格 */}
      <div className="flex-1 overflow-y-auto max-h-[460px] pr-1" id="train-table-wrapper">
        <div className="min-w-full divide-y divide-slate-800 text-slate-200">
          {trains.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs font-sans">
              暂无运行列车，请点击上方“增开临客列车”手动录入列车。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5" id="trains-list">
              {trains.map((train) => {
                const badge = statusMap[train.status];
                const isDelayed = train.status === 'delayed';

                return (
                  <div
                    key={train.id}
                    className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 hover:border-slate-700/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px]"
                    id={`train-row-${train.trainNumber}`}
                  >
                    {/* 左侧：车次细节 */}
                    <div className="flex items-center gap-3 flex-1">
                      {/* 车次图标代号 */}
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 font-bold shrink-0">
                        <span className="text-sm tracking-tight text-white">{train.trainNumber}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{train.platform} 站台</span>
                      </div>

                      {/* 起止行程 */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Route</span>
                          <span className="font-semibold text-slate-100 flex items-center gap-1">
                            {train.origin} <CornerDownRight size={10} className="text-slate-500 inline" /> {train.destination}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Gate / Plat</span>
                          <span className="font-mono text-slate-200">
                            检票口 <strong className="text-yellow-400">{train.checkGate}</strong> | 站台 <strong className="text-blue-400">{train.platform}</strong>
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-slate-500 block text-[10px] uppercase">Time / Status</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-300">{train.arrivalTime} - {train.departureTime}</span>
                            {isDelayed && (
                              <span className="text-orange-400 font-mono font-medium animate-pulse">
                                +{train.delayMinutes}′
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 中间：生动状态徽章 */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold border ${badge.color} inline-block shadow-inner`}>
                        ● {badge.name}
                      </span>
                    </div>

                    {/* 右侧：车站调度指令台 */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                      <button
                        onClick={() => handleStatusChange(train.id, 'checking')}
                        disabled={train.status === 'checking'}
                        className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-0.5 transition-all ${
                          train.status === 'checking'
                            ? 'bg-slate-950 text-slate-600 cursor-not-allowed'
                            : 'bg-red-950 hover:bg-red-900 text-red-200 border border-red-800'
                        }`}
                        title="发布检票开始广播，列车状态设为“正在检票”"
                      >
                        <Play size={10} className="fill-current" />
                        <span>开始检票</span>
                      </button>

                      <button
                        onClick={() => handleStatusChange(train.id, 'checking_end')}
                        disabled={train.status === 'checking_end'}
                        className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-0.5 transition-all ${
                          train.status === 'checking_end'
                            ? 'bg-slate-950 text-slate-600 cursor-not-allowed'
                            : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700'
                        }`}
                        title="发布停止检票广播，列车状态设为“停止检票”"
                      >
                        <span>停止检票</span>
                      </button>

                      <button
                        onClick={() => handleStatusChange(train.id, 'arriving')}
                        disabled={train.status === 'arriving'}
                        className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-0.5 transition-all ${
                          train.status === 'arriving'
                            ? 'bg-slate-950 text-slate-600 cursor-not-allowed'
                            : 'bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-805'
                        }`}
                        title="发布进站避险通知，列车状态设为“列车进站”"
                      >
                        <span>进站广播</span>
                      </button>

                      {/* 模拟晚点下拉值选择 */}
                      <div className="relative group flex items-center justify-center">
                        <button
                          onClick={() => {
                            const delayMins = delayInput[train.id] || 20;
                            handleStatusChange(train.id, 'delayed', delayMins);
                          }}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1 ${
                            train.status === 'delayed'
                              ? 'bg-orange-950/60 text-orange-400 border border-orange-800'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <Clock size={10} />
                          <span>晚点G</span>
                        </button>
                        {/* 晚点分钟切换选择口 */}
                        <select
                          value={delayInput[train.id] || 20}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDelayInput({ ...delayInput, [train.id]: val });
                            if (train.status === 'delayed') {
                              handleStatusChange(train.id, 'delayed', val);
                            }
                          }}
                          className="bg-slate-950 text-orange-400 border border-slate-800 rounded text-[10px] pl-1 font-mono focus:outline-none ml-1 cursor-pointer"
                        >
                          <option value="10">10分</option>
                          <option value="20">20分</option>
                          <option value="30">30分</option>
                          <option value="60">60分</option>
                          <option value="120">120分</option>
                        </select>
                      </div>

                      {/* 彻底摘除列车 */}
                      <button
                        onClick={() => handleDeleteTrain(train.id)}
                        className="p-1 text-slate-500 hover:text-red-400 active:text-red-500 hover:bg-slate-950 rounded transition-colors"
                        title="删除该列车（复位调度）"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 联锁防灾模块说明 */}
      <div className="mt-3 bg-slate-950 p-2.5 rounded border border-slate-850 text-[11px] text-slate-500 flex gap-2 items-start shadow-inner">
        <Shield size={14} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
        <p className="leading-normal">
          <strong className="text-slate-400 font-sans">离线安全连锁规则:</strong>
          改变列车发车状态将一键驱动下方广播切片工作台，合成专属提示词序列（含：车次、终点、检票口、站台）。旅客候车安全重于泰山，请严格审查文字内容后广播。
        </p>
      </div>
    </div>
  );
}
