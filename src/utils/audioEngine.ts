// 音频引擎：控制提示音合成、站厅混响模拟、多段音频顺序拼接、支持麦克风录音

let audioCtx: AudioContext | null = null;
let delayNode: DelayNode | null = null;
let feedbackNode: GainNode | null = null;
let wetGain: GainNode | null = null;
let dryGain: GainNode | null = null;
let analyserNode: AnalyserNode | null = null;
let activeSourceNode: AudioScheduledSourceNode | HTMLAudioElement | null = null;
let isCurrentlyPlaying = false;
let currentSpeechSynthesisUtterance: SpeechSynthesisUtterance | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getAnalyser(): AnalyserNode {
  const ctx = getAudioContext();
  if (!analyserNode) {
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
  }
  return analyserNode;
}

// 初始化效果链：混响（由延迟和反馈产生车站大厅空旷的回音效果）
export function initAudioChain() {
  const ctx = getAudioContext();
  const analyser = getAnalyser();

  if (!dryGain) {
    dryGain = ctx.createGain();
    dryGain.gain.value = 1.0;
  }
  if (!wetGain) {
    wetGain = ctx.createGain();
    wetGain.gain.value = 0.4; // 混响音量默认40%
  }
  if (!delayNode) {
    delayNode = ctx.createDelay(1.5);
    delayNode.delayTime.value = 0.28; // 高铁站通常有着 280ms 左右的反射反馈延迟
  }
  if (!feedbackNode) {
    feedbackNode = ctx.createGain();
    feedbackNode.gain.value = 0.45; // 45% 的混响衰减
  }

  // 连接混响环路: Input -> Delay -> Feedback -> Delay
  delayNode.connect(feedbackNode);
  feedbackNode.connect(delayNode);

  // 连接混响通道到 wetGain
  feedbackNode.connect(wetGain);

  // 主输出连到 analyser
  dryGain.connect(analyser);
  wetGain.connect(analyser);

  // analyser 连到扬声器
  analyser.connect(ctx.destination);
}

// 设置混响参数：
// feedback: 混响衰减度 (0 - 0.9)
// delayTime: 混响延迟时间 (0 - 1.0s)
// wetVolume: 混响湿声比 (0 - 1.0)
export function updateReverbParams(feedback: number, delayTime: number, wetVolume: number) {
  try {
    getAudioContext();
    initAudioChain();
    if (feedbackNode) feedbackNode.gain.setValueAtTime(feedback, audioCtx!.currentTime);
    if (delayNode) delayNode.delayTime.setValueAtTime(delayTime, audioCtx!.currentTime);
    if (wetGain) wetGain.gain.setValueAtTime(wetVolume, audioCtx!.currentTime);
  } catch (e) {
    console.error('更新效果链失败:', e);
  }
}

// 发送音频源到音轨：分为直达(Dry)和效果器(Wet)
export function connectAudioSource(source: AudioNode) {
  initAudioChain();
  if (dryGain && delayNode) {
    source.connect(dryGain);      // 直达
    source.connect(delayNode);    // 送入混响
  }
}

// 播放经典的中国高速铁路提示音
// 提示音调式：标准 C 调五声音阶，由 F5 - A5 - D5 - A4 的舒缓铜铃乐音
export function playRailwayChime(type: 'normal' | 'emergency' | 'departure', onComplete: () => void) {
  const ctx = getAudioContext();
  initAudioChain();

  const now = ctx.currentTime;

  if (type === 'normal') {
    // 经典的4声进站提示音：F5(698.46Hz) -> A5(880Hz) -> D5(587.33Hz) -> A4(440Hz)
    const tones = [
      { freq: 698.46, delay: 0.0, duration: 0.35 },
      { freq: 880.00, delay: 0.32, duration: 0.35 },
      { freq: 587.33, delay: 0.64, duration: 0.35 },
      { freq: 440.00, delay: 0.96, duration: 0.70 }
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, now + tone.delay);

      // 包络线：淡入淡出，带有金属共振感
      gain.gain.setValueAtTime(0, now + tone.delay);
      gain.gain.linearRampToValueAtTime(0.2, now + tone.delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.delay + tone.duration);

      osc.connect(gain);
      connectAudioSource(gain);

      osc.start(now + tone.delay);
      osc.stop(now + tone.delay + tone.duration);
    });

    setTimeout(() => {
      onComplete();
    }, 1800);

  } else if (type === 'emergency') {
    // 紧急双音口哨提请：1000Hz + 800Hz 双音交替
    const beats = [0.0, 0.4, 0.8];
    beats.forEach((bt) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(1200, now + bt);
      osc2.frequency.setValueAtTime(950, now + bt);
      osc1.type = 'sawtooth';
      osc1.type = 'sine';

      gain.gain.setValueAtTime(0, now + bt);
      gain.gain.linearRampToValueAtTime(0.12, now + bt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + bt + 0.30);

      osc1.connect(gain);
      osc2.connect(gain);
      connectAudioSource(gain);

      osc1.start(now + bt);
      osc1.stop(now + bt + 0.30);
      osc2.start(now + bt);
      osc2.stop(now + bt + 0.30);
    });

    setTimeout(() => {
      onComplete();
    }, 1300);

  } else {
    // 简短2声提示音（离站/提示）：880Hz -> 659.25Hz
    const tones = [
      { freq: 880.00, delay: 0.0, duration: 0.4 },
      { freq: 659.25, delay: 0.35, duration: 0.6 }
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';

      osc.frequency.setValueAtTime(tone.freq, now + tone.delay);
      gain.gain.setValueAtTime(0, now + tone.delay);
      gain.gain.linearRampToValueAtTime(0.15, now + tone.delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.delay + tone.duration);

      osc.connect(gain);
      connectAudioSource(gain);

      osc.start(now + tone.delay);
      osc.stop(now + tone.delay + tone.duration);
    });

    setTimeout(() => {
      onComplete();
    }, 1100);
  }
}

// 停止当前所有播放
export function stopAllPlayback() {
  isCurrentlyPlaying = false;
  if (activeSourceNode) {
    try {
      if ('stop' in activeSourceNode) {
        activeSourceNode.stop();
      } else {
        activeSourceNode.pause();
      }
    } catch (e) {}
    activeSourceNode = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentSpeechSynthesisUtterance = null;
}

// 音频片断顺序拼接播放核心算法
export async function playSplicedQueue(
  queue: { word: string; blobUrl?: string }[],
  options: {
    speechRate: number;
    speechPitch: number;
    chimeType: 'none' | 'normal' | 'emergency' | 'departure';
    voiceGender: 'female' | 'male';
    onSegmentStart: (index: number) => void;
    onSegmentEnd: (index: number) => void;
    onComplete: () => void;
  }
) {
  stopAllPlayback();
  isCurrentlyPlaying = true;
  const ctx = getAudioContext();

  const runQueue = async () => {
    for (let i = 0; i < queue.length; i++) {
      if (!isCurrentlyPlaying) return;
      options.onSegmentStart(i);
      const segment = queue[i];

      if (segment.blobUrl) {
        // 场景 A: 存在录音或上传的音频切片，使用 Web Audio / Audio 节点播放实现完美混响
        await new Promise<void>((resolve, reject) => {
          if (!isCurrentlyPlaying) {
            resolve();
            return;
          }
          const audio = new Audio(segment.blobUrl);
          activeSourceNode = audio;
          if ('preservesPitch' in audio) {
            audio.preservesPitch = false;
          } else if ('preservePitch' in audio) {
            (audio as any).preservePitch = false;
          }
          audio.playbackRate = options.speechRate;
          
          const source = ctx.createMediaElementSource(audio);
          connectAudioSource(source);

          audio.addEventListener('ended', () => {
            options.onSegmentEnd(i);
            resolve();
          });

          audio.addEventListener('error', (err) => {
            console.error('音频切片播放失败:', segment.word, err);
            options.onSegmentEnd(i);
            resolve(); // 容错，继续下一段
          });

          audio.play().catch((err) => {
            console.warn('播放被阻止或取消:', err);
            resolve();
          });
        });
      } else {
        // 场景 B: 没有录音，使用本地 SpeechSynthesis 回退系统补全播放
        await new Promise<void>((resolve) => {
          if (!isCurrentlyPlaying) {
            resolve();
            return;
          }
          // 在播发文字前，可以通过播放一个短的正弦余振，配合让合成音带有对讲机质鸣
          playRadioClickHum(ctx, 0.08);

          // 开启原生语音合成
          const u = new SpeechSynthesisUtterance(segment.word);
          currentSpeechSynthesisUtterance = u;
          u.rate = options.speechRate * 0.82; // 调整语速，使其更加沉稳迟缓 (高铁风格)
          u.pitch = options.speechPitch;
          u.lang = detectLanguage(segment.word);

          // 尝试匹配合适的中英文男女音色
          if (window.speechSynthesis) {
            const voices = window.speechSynthesis.getVoices();
            const filteredVoices = voices.filter(v => v.lang.startsWith(u.lang.substring(0, 2)));
            let selectedVoice = null;
            
            if (options.voiceGender === 'male') {
              // 找男声优先
              selectedVoice = filteredVoices.find(v => v.name.toLowerCase().includes('kangkang') || v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('yunxi'));
            } else {
              // 找女声优先
              selectedVoice = filteredVoices.find(v => v.name.toLowerCase().includes('xiaoxiao') || v.name.toLowerCase().includes('tingting') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('huihui'));
            }
            if (selectedVoice) {
              u.voice = selectedVoice;
            } else if (filteredVoices.length > 0) {
              u.voice = filteredVoices[0];
            }
          }

          u.onend = () => {
            options.onSegmentEnd(i);
            resolve();
          };

          u.onerror = (e) => {
            console.error('TTS播放错误:', e);
            options.onSegmentEnd(i);
            resolve();
          };

          window.speechSynthesis.speak(u);
        });
      }
    }

    // 所有队列播放结束
    if (isCurrentlyPlaying) {
      // 尾音对讲机电讯“喀哒”声
      playRadioClickHum(ctx, 0.15, true);
      isCurrentlyPlaying = false;
      options.onComplete();
    }
  };

  // 是否先播放提示前奏铃声
  if (options.chimeType !== 'none') {
    playRailwayChime(options.chimeType, () => {
      if (isCurrentlyPlaying) {
        runQueue();
      }
    });
  } else {
    runQueue();
  }
}

// 简单判定字符中英文，TTS使用对应语音包
function detectLanguage(text: string): string {
  const englishRegex = /^[A-Z a-z0-9\.,!?\-]+$/;
  if (englishRegex.test(text.replace(/\s+/g, ''))) {
    return 'en-US';
  }
  return 'zh-CN';
}

// 模拟手风琴/无线列车广播关闭启动时的“喀嚓/沙沙”电台声，让系统拟真度炸裂
function playRadioClickHum(ctx: AudioContext, gainVal: number, isEnding = false) {
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const bandpass = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    osc.type = isEnding ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isEnding ? 180 : 320, now);
    
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(250, now);
    bandpass.Q.setValueAtTime(10, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
}

// 导出生成本地语音文件片段的工具 (方便用户直接自动合成本地合成声元)
export function synthesizeTTSBlob(word: string, options: { speechRate: number; speechPitch: number; gender: 'female' | 'male' }): Promise<Blob> {
  // 由于SpeechSynthesis直接录波涉及多轨道与高延时，我们通过创设OfflineAudioContext自研简单的物理钟声组合
  // 加上标准 HTML5 Speech API 运行时的简易语音转接
  // 供提示：离线下我们推荐用户直接使用麦克风直接现场录取“真实录制词包”，这是本系统的最大乐趣
  // 这里我们使用一个逼真的合成波作为自定义文字声源的占位生成
  return new Promise((resolve) => {
    const offlineCtx = new OfflineAudioContext(1, 44100 * 0.8, 44100);
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    
    osc.type = 'sine';
    // 依拼音长短与笔画设定特定基波，让不同词生成不同频率的轻柔电子乐，好比车站电讯拟真
    let charSum = 0;
    for (let c = 0; c < word.length; c++) charSum += word.charCodeAt(c);
    const freq = 200 + (charSum % 600);
    
    osc.frequency.setValueAtTime(freq, 0);
    osc.frequency.exponentialRampToValueAtTime(freq / 1.5, 0.6);
    
    gain.gain.setValueAtTime(0.18, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.7);
    
    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    
    osc.start(0);
    osc.stop(0.8);
    
    offlineCtx.startRendering().then((renderedBuffer) => {
      // 写入 WAV blob 格式返回
      const wavBlob = audioBufferToWavBlob(renderedBuffer);
      resolve(wavBlob);
    });
  });
}

// AudioBuffer 转 WAV 格式 Blob 辅助函数
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * 2;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + bufferLength);
  const view = new DataView(arrayBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength, true);
  
  writeFloatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: 'audio/wav' });
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeFloatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
