export interface TrainInfo {
  id: string;
  trainNumber: string; // 车次, e.g. G101
  type: 'G' | 'D' | 'C' | 'K' | 'T' | 'Z';
  origin: string; // 始发站
  destination: string; // 终点站
  route: string[]; // 途经主要车站
  arrivalTime: string; // 进站/到达时间
  departureTime: string; // 出发时间
  platform: string; // 站台
  checkGate: string; // 检票口
  status: 'waiting' | 'checking' | 'checking_end' | 'arriving' | 'delayed'; // 状态: 候车中/开始检票/检票结束/列车进站/列车晚点
  delayMinutes?: number; // 晚点时间(分钟)
}

export type CategoryType = 'train' | 'station' | 'action' | 'number' | 'courtesy' | 'warning';

export interface DictItem {
  word: string;
  pinyin: string;
  category: CategoryType;
  isCustom?: boolean; // 是否是用户自定义添加的词
}

export interface AudioClip {
  word: string;
  blob?: Blob;
  blobUrl?: string; // 录音/上传后的本地临时URL
  type: 'recorded' | 'uploaded' | 'system';
  duration?: number; // 持续时间，毫秒
  createdAt?: number;
}

export interface BroadcastTemplate {
  id: string;
  title: string;
  description: string;
  chinese: string;
  english: string;
  category: 'boarding' | 'arrival' | 'delay' | 'emergency' | 'general';
}

export interface BroadcastQueueItem {
  id: string;
  word: string;
  type: 'recorded' | 'uploaded' | 'system';
  blobUrl?: string;
  status: 'pending' | 'playing' | 'completed';
}
