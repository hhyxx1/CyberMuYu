// 赛博木鱼主类
class CyberMuYu {
    constructor() {
        this.counter = 0;
        this.audioContext = null;
        this.soundType = 'wood';
        // 用户名
        this.username = null;
        // 待同步的成就队列
        this.pendingAchievements = [];
        // 音乐播放时长记录相关变量
        this.musicPlayTime = 0; // 音乐总播放时长（秒）
        this.isCountingMusicTime = false; // 是否正在计数
        this.musicTimeInterval = null; // 计时定时器
        this.uploadInterval = null; // 上传定时器（独立运行）
        // 想念樊事诚数组
        this.meritTexts = [
            "想樊事诚了",
            "樊事诚，何时见？",
            "远方的樊事诚，念你",
            "樊事诚，盼相逢",
            "惦记樊事诚",
            "樊事诚，别来无恙？",
            "见字如面，樊事诚",
            "樊事诚，甚是想念",
            "樊事诚，念矣",
            "思，樊事诚",
            "樊事诚，何日逢？",
            "念樊事诚，无歇",
            "樊事诚，近来安否？",
            "远方樊事诚，念之",
            "盼见樊事诚。",
            "樊事诚，久念",
            "心中念，樊事诚",
            "樊事诚，相逢有期？",
            "樊事诚，念君",
            "思矣，樊事诚",
            "樊事诚，盼晤",
            "念樊事诚，良久",
            "樊事诚，何日见？",
            "遥念樊事诚",
            "樊事诚，念如故",
            "思樊事诚，切切",
            "樊事诚，相逢盼",
            "念，唯樊事诚",
            "樊事诚，念之",
            "思樊事诚，不已",
            "樊事诚，何日聚？",
            "念，只樊事诚",
            "樊事诚，盼相逢",
            "遥思樊事诚",
            "樊事诚，别来安？",
            "惦樊事诚，良久",
            "樊事诚，相见盼",
            "思矣，唯樊事诚",
            "樊事诚，念无休",
            "远方樊事诚，惦之",
            "樊事诚，何时晤？",
            "念樊事诚，深切",
            "樊事诚，盼晤面",
            "心中惦，樊事诚",
            "樊事诚，久未见",
            "思樊事诚，朝暮",
            "樊事诚，相逢有期？",
            "念樊事诚，如初"
        ];
        // 新成就相关变量
        this.shownMeritIndices = new Map(); // 记录每个句子的显示次数
        this.dailyMeritAchieveCount = 0; // 当日成就达成次数
        this.nextMeritResetTime = null; // 下次重置时间
        this.serverTimeOffset = null; // 服务器时间与本地时间的偏移量（初始化为null）
        this.init();
    }

    // 设置用户名
    async setUsername(username) {
        this.username = username;
        console.log('用户名已设置:', username);

        // 用户名设置后，先从服务器获取已有数据并同步到本地
        try {
            await this.fetchAndSyncServerData();
        } catch (error) {
            console.error('同步服务器数据失败:', error);
        }
        
        // 同步待同步队列中的成就
        if (this.pendingAchievements.length > 0) {
            console.log('开始同步待同步队列中的成就，共', this.pendingAchievements.length, '个成就');
            
            // 遍历待同步队列并发送到后端（使用异步循环确保所有调用完成）
            for (const achievementData of this.pendingAchievements) {
                console.log('同步待同步成就:', achievementData.achievementId);
                try {
                    await this.callBackendAPI('/achievement', 'POST', achievementData);
                    console.log('待同步成就同步成功:', achievementData.achievementId);
                } catch (error) {
                    console.error('待同步成就同步失败:', achievementData.achievementId, error);
                }
            }
            
            // 清空待同步队列
            this.pendingAchievements = [];
            console.log('待同步队列已清空');
        }
    }

    // 从服务器获取数据并同步到本地
    async fetchAndSyncServerData() {
        if (!this.username) {
            console.log('用户名未设置，跳过服务器数据同步');
            return;
        }

        console.log('开始从服务器获取用户数据...');

        try {
            // 从服务器获取用户成就数据
            const achievementsData = await this.callBackendAPI('/achievements', 'GET', { username: this.username });

            if (achievementsData && achievementsData.success) {
                console.log('成功获取服务器成就数据');
                // 同步成就数据到本地
                this.syncAchievementsFromServer(achievementsData);
            } else {
                console.log('未获取到服务器成就数据');
            }

            // 从服务器获取敲击次数数据
            const hitsData = await this.callBackendAPI('/hits', 'GET', { username: this.username });

            if (hitsData && hitsData.success) {
                console.log('成功获取服务器敲击次数数据');
                // 同步敲击次数数据到本地
                this.syncHitsFromServer(hitsData);
            } else {
                console.log('未获取到服务器敲击次数数据');
            }

            // 从服务器获取音乐播放时长数据
            const musicTimeData = await this.callBackendAPI('/music-time', 'GET', { username: this.username });

            if (musicTimeData && musicTimeData.success) {
                console.log('成功获取服务器音乐播放时长数据');
                // 同步音乐播放时长数据到本地
                this.syncMusicTimeFromServer(musicTimeData);
            } else {
                console.log('未获取到服务器音乐播放时长数据');
            }

            // 从服务器获取应用使用时长数据
            const appUsageTimeData = await this.callBackendAPI('/app-usage-time', 'GET', { username: this.username });

            if (appUsageTimeData && appUsageTimeData.success) {
                console.log('成功获取服务器应用使用时长数据');
                // 同步应用使用时长数据到本地
                this.syncAppUsageTimeFromServer(appUsageTimeData);
            } else {
                console.log('未获取到服务器应用使用时长数据');
            }

            // 所有数据同步完成后，将本地数据同步到服务器（确保最新数据）
            await this.syncAchievements();
            
            // 同步功德成就次数
            await this.syncMeritAchievements();

            console.log('服务器数据同步完成');
        } catch (error) {
            console.error('同步服务器数据失败:', error);
        }
    }

    // 切换震动开关
    toggleVibration() {
        this.isVibrationEnabled = !this.isVibrationEnabled;

        if (this.isVibrationEnabled) {
            // 开启震动
            this.vibrationToggleBtn.classList.add('active');
            this.vibrationToggleBtn.textContent = '关闭震动';
        } else {
            // 关闭震动
            this.vibrationToggleBtn.classList.remove('active');
            this.vibrationToggleBtn.textContent = '震动';
        }

        // 保存震动状态到本地存储
        localStorage.setItem('isVibrationEnabled', this.isVibrationEnabled);
    }

    // 执行震动
    vibrate(duration = 110) {
        if (!this.isVibrationEnabled) return;

        try {
            if (typeof AndroidVibrationInterface !== 'undefined') {
                // Android平台
                AndroidVibrationInterface.vibrate(duration);
            } else if ('vibrate' in navigator) {
                // Web平台支持震动API
                navigator.vibrate(duration);
            } else if ('webkitVibrate' in navigator) {
                // Safari兼容
                navigator.webkitVibrate(duration);
            }
        } catch (error) {
            console.error('震动功能执行失败:', error);
        }
    }

    async init() {
        try {
            // 获取DOM元素
            this.counterElement = document.querySelector('.counter');
            this.fishElement = document.getElementById('fish');
            this.rippleContainer = document.getElementById('rippleContainer');
            this.particleContainer = document.getElementById('particleContainer');
            this.soundSelectElement = document.getElementById('soundType');
            this.themeSelectElement = document.getElementById('theme');
            this.fishStyleSelectElement = document.getElementById('fishStyle');
            this.whiteNoiseToggleBtn = document.getElementById('whiteNoiseToggle');
            this.customMusicBtn = document.getElementById('customMusicBtn');
            this.restoreDefaultMusicBtn = document.getElementById('restoreDefaultMusicBtn');
            this.breathModeBtn = document.getElementById('breathMode');
            this.achievementsBtn = document.getElementById('achievementsBtn');
            this.achievementsPanel = document.getElementById('achievementsPanel');
            this.achievementsContent = document.getElementById('achievementsContent');
            this.achievementsClose = document.getElementById('achievementsClose');
            this.vibrationToggleBtn = document.getElementById('vibrationToggle');
            this.meditationModeBtn = document.getElementById('meditationMode');
            this.meditationDurationSelect = document.getElementById('meditationDuration');
            this.customDurationInput = document.getElementById('customDuration');
            this.customDurationBtn = document.getElementById('customDurationBtn');
            this.consecutiveCountElement = document.getElementById('consecutiveCount');
            this.todayCountElement = document.getElementById('todayCount');

            // 音乐播放控件元素
            this.musicPlayPauseBtn = document.getElementById('musicPlayPause');
            this.musicProgress = document.getElementById('musicProgress');
            this.musicProgressContainer = document.querySelector('.music-progress-container');
            this.musicMuteBtn = document.getElementById('musicMute');
            this.currentTimeElement = document.getElementById('currentTime');
            this.totalTimeElement = document.getElementById('totalTime');
            this.musicTitleElement = document.querySelector('.music-title');
            this.selectMusicText = document.getElementById('selectMusicText');
            this.autoPlayToggleBtn = document.getElementById('autoPlayToggle');
            this.musicSelectorDialog = document.getElementById('musicSelectorDialog');
            this.musicSelectorClose = document.getElementById('musicSelectorClose');
            this.musicSelectorList = document.getElementById('musicSelectorList');

            // 初始化状态变量
            this.isLongPress = false;
            this.longPressTimer = null;
            this.longPressInterval = null;
            this.isBreathMode = false;
            this.breathTimer = null;
            this.breathIndicator = null;
            this.isMeditationMode = false;
            this.meditationTimer = null;
            this.meditationStartTime = null;
            this.meditationDuration = 300; // 默认5分钟
            this.consecutiveCount = 0;
            this.consecutiveTimer = null;
            this.triggeredComboLevels = []; // 已触发的连击等级列表
            this.isWhiteNoisePlaying = false;
            this.whiteNoiseAudio = null;
            this.customMusicUri = null; // 自定义音乐文件URI
            this.customMusicName = null; // 自定义音乐名称
            this.fishStyle = 'cyber'; // 默认木鱼样式
            this.isVibrationEnabled = true; // 默认开启震动

            // 音乐播放相关状态
            this.musicAudio = null;
            this.isMusicPlaying = false;
            this.isMusicMuted = false;
            this.isAutoPlayEnabled = true; // 默认开启自动播放
            this.currentMusicIndex = 0;
            this.musicList = [
                { title: '悔过诗-樊事诚', src: 'media/悔过诗-樊事诚.mp3' },
                { title: '默认', src: 'media/默认.aac' },
                { title: '不吐不快-樊事诚', src: 'media/不吐不快-樊事诚.mp3' },
                { title: '俏郎君-樊事诚', src: 'media/俏郎君-樊事诚.mp3' },
                { title: '壮举-樊事诚', src: 'media/壮举-樊事诚.mp3' },
                { title: '我的天-樊事诚', src: 'media/我的天-樊事诚.mp3' },
                { title: '春秋-樊事诚', src: 'media/春秋-樊事诚.mp3' },
                { title: '樱花树下-樊事诚', src: 'media/樱花树下-樊事诚.mp3' },
                { title: '百年树木-樊事诚', src: 'media/百年树木-樊事诚.aac' },
                { title: '遇见神-樊事诚', src: 'media/遇见神-樊事诚.mp3' },
                { title: '骚灵情歌-樊事诚', src: 'media/骚灵情歌-樊事诚.mp3' }
            ];

            // 添加事件监听器，监听键盘返回键
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' || e.keyCode === 27) {
                    this.handleBackKey();
                }
            });

            // 为所有按钮添加震动效果
            document.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    this.vibrate();
                }
            });

            // 成就系统相关状态变量
            this.breathUsageCount = 0;
            this.totalMeditationMinutes = 0;
            this.whiteNoiseActivationCount = 0;
            this.allFeaturesUsed = new Set();
            this.lastMeditationMinutes = 0; // 记录本次冥想时长（分钟）

            // 初始化新成就相关变量
            const savedMeritIndices = JSON.parse(localStorage.getItem('shownMeritIndices') || '{}');
            this.shownMeritIndices = new Map(Object.entries(savedMeritIndices));
            const meritStats = JSON.parse(localStorage.getItem('meritAchievementStats') || '{}');
            this.dailyMeritAchieveCount = meritStats.dailyCount || 0;
            this.nextMeritResetTime = meritStats.nextResetTime ? new Date(meritStats.nextResetTime) : null;

            // 加载震动开关状态
            const savedVibrationState = localStorage.getItem('isVibrationEnabled');
            if (savedVibrationState !== null) {
                this.isVibrationEnabled = JSON.parse(savedVibrationState);
            }

            // 加载自动播放开关状态
            const savedAutoPlayState = localStorage.getItem('isAutoPlayEnabled');
            if (savedAutoPlayState !== null) {
                this.isAutoPlayEnabled = JSON.parse(savedAutoPlayState);
            }

            // 更新震动开关按钮的状态
            if (this.vibrationToggleBtn) {
                if (this.isVibrationEnabled) {
                    this.vibrationToggleBtn.classList.add('active');
                    this.vibrationToggleBtn.textContent = '关闭震动';
                } else {
                    this.vibrationToggleBtn.classList.remove('active');
                    this.vibrationToggleBtn.textContent = '震动';
                }
            }

            // 更新自动播放开关按钮的状态
            if (this.autoPlayToggleBtn) {
                this.autoPlayToggleBtn.textContent = this.isAutoPlayEnabled ? '自动播放：开' : '自动播放：关';
            }
            // 初始化对话气泡
            this.speechBubble = document.getElementById('speechBubble');
            this.bubbleClose = document.getElementById('bubbleClose');

            // 检查是否需要显示对话气泡
            if (!localStorage.getItem('speechBubbleClosed')) {
                // 延迟显示对话气泡，让页面完全加载
                setTimeout(() => {
                    if (this.speechBubble) {
                        this.speechBubble.style.display = 'block';
                    }
                }, 1000);
            }

            // 为关闭按钮添加事件监听器
            if (this.bubbleClose) {
                this.bubbleClose.addEventListener('click', () => {
                    if (this.speechBubble) {
                        this.speechBubble.style.display = 'none';
                        // 记录到localStorage，以后不再显示
                        localStorage.setItem('speechBubbleClosed', 'true');
                    }
                });
            }

            if (this.vibrationToggleBtn) {
                if (this.isVibrationEnabled) {
                    this.vibrationToggleBtn.classList.add('active');
                    this.vibrationToggleBtn.textContent = '关闭震动';
                } else {
                    this.vibrationToggleBtn.classList.remove('active');
                    this.vibrationToggleBtn.textContent = '震动';
                }
            }

            // 从本地存储加载成就统计数据
            this.loadAchievementStats();

            // 初始化成就系统
            this.initAchievements();

            // 初始化统计数据
            this.initStats();

            // 添加事件监听器，只在元素存在时添加
            if (this.fishElement) {
                this.fishElement.addEventListener('click', (e) => this.handleClick(e));
                this.fishElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
                this.fishElement.addEventListener('mouseup', (e) => this.handleMouseUp(e));
                this.fishElement.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
                this.fishElement.addEventListener('touchstart', (e) => this.handleMouseDown(e));
                this.fishElement.addEventListener('touchend', (e) => this.handleMouseUp(e));
            }

            document.addEventListener('keydown', (e) => this.handleKeyPress(e));
            document.addEventListener('keyup', (e) => this.handleKeyUp(e));

            // 音乐播放控件事件监听器
            if (this.musicPlayPauseBtn) {
                this.musicPlayPauseBtn.addEventListener('click', () => this.toggleMusicPlayPause());
            }

            if (this.musicProgressContainer) {
                this.musicProgressContainer.addEventListener('click', (e) => this.seekMusic(e));
            }

            if (this.musicMuteBtn) {
                this.musicMuteBtn.addEventListener('click', () => this.toggleMusicMute());
            }

            // 音乐选择事件监听器
            if (this.selectMusicText) {
                this.selectMusicText.addEventListener('click', () => this.showMusicSelector());
            }

            if (this.musicSelectorClose) {
                this.musicSelectorClose.addEventListener('click', () => this.hideMusicSelector());
            }

            // 自动播放切换事件监听器
            if (this.autoPlayToggleBtn) {
                this.autoPlayToggleBtn.addEventListener('click', () => this.toggleAutoPlay());
            }

            // 点击对话框外部关闭
            this.musicSelectorDialog.addEventListener('click', (e) => {
                if (e.target === this.musicSelectorDialog) {
                    this.hideMusicSelector();
                }
            });

            // 初始化音乐播放
            this.initMusicPlayer();

            // 初始化音乐播放时长上传定时器（独立运行，不受播放状态影响）
            this.initMusicTimeUpload();

            if (this.soundSelectElement) {
                this.soundSelectElement.addEventListener('change', (e) => this.handleSoundChange(e));
            }

            if (this.themeSelectElement) {
                this.themeSelectElement.addEventListener('change', (e) => this.handleThemeChange(e));
            }

            if (this.fishStyleSelectElement) {
                this.fishStyleSelectElement.addEventListener('change', (e) => this.handleFishStyleChange(e));
            }

            if (this.whiteNoiseToggleBtn) {
                this.whiteNoiseToggleBtn.addEventListener('click', () => this.toggleWhiteNoise());
            }
            if (this.vibrationToggleBtn) {
                this.vibrationToggleBtn.addEventListener('click', () => this.toggleVibration());
            }

            if (this.customMusicBtn) {
                this.customMusicBtn.addEventListener('click', () => this.selectCustomMusic());
            }

            if (this.restoreDefaultMusicBtn) {
                this.restoreDefaultMusicBtn.addEventListener('click', () => this.restoreDefaultMusic());
            }

            if (this.breathModeBtn) {
                this.breathModeBtn.addEventListener('click', () => this.toggleBreathMode());
            }

            if (this.achievementsBtn) {
                this.achievementsBtn.addEventListener('click', () => this.toggleAchievementsPanel());
            }

            if (this.achievementsClose) {
                this.achievementsClose.addEventListener('click', () => this.hideAchievementsPanel());
            }

            if (this.meditationModeBtn) {
                this.meditationModeBtn.addEventListener('click', () => this.toggleMeditationMode());
            }

            if (this.meditationDurationSelect) {
                this.meditationDurationSelect.addEventListener('change', (e) => this.handleMeditationDurationChange(e));
            }

            if (this.customDurationInput) {
                this.customDurationInput.addEventListener('input', (e) => this.handleCustomDurationInput(e));
            }

            if (this.customDurationBtn) {
                this.customDurationBtn.addEventListener('click', () => this.selectCustomMeditationDuration());
            }

            // 点击面板外部关闭成就面板
            if (this.achievementsPanel) {
                this.achievementsPanel.addEventListener('click', (e) => {
                    if (e.target === this.achievementsPanel) {
                        this.hideAchievementsPanel();
                    }
                });
            }

            // 初始化主题和木鱼样式
            this.handleThemeChange({ target: { value: 'cyber' } });
            this.handleFishStyleChange({ target: { value: 'cyber' } });

            // 初始化功德成就重置系统
            this.initializeMeritAchievementReset();

            // 绑定小惊喜点击事件
            const surpriseText = document.getElementById('surpriseText');
            if (surpriseText) {
                surpriseText.addEventListener('click', () => {
                    // 调用Android接口
                    if (window.AndroidSurpriseInterface) {
                        window.AndroidSurpriseInterface.showSurprise();
                    } else {
                        console.log('AndroidSurpriseInterface not available');
                    }
                });
            }



            // 初始化离线数据存储
            this.initOfflineData();

            // 添加网络状态变化监听器
            window.addEventListener('online', () => {
                console.log('Network status: online');
                // 网络恢复时，尝试提交离线数据
                this.submitOfflineData();
            });

            window.addEventListener('offline', () => {
                console.log('Network status: offline');
            });

            // 设置定时器，定期检查并提交离线数据（每5分钟）
            setInterval(() => {
                this.submitOfflineData();
            }, 300000);

            // 应用启动时，尝试提交离线数据
            this.submitOfflineData();

            // 应用启动时，同步已解锁的成就到后端
            this.syncAchievements();
            
            // 应用启动时，立即执行一次所有数据的检查和同步
            if (this.username) {
                console.log('应用启动，立即执行数据同步');
                await this.syncAllData();
            }
            
            // 设置30秒定时上传点击次数
            this.setupClickUploadTimer();
            
            // 设置5分钟定时同步数据
            this.setupDataSyncTimer();
            
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }
    
    // 设置30秒定时上传点击次数
    setupClickUploadTimer() {
        console.log('设置30秒定时上传点击次数');
        
        // 记录上次上传的点击次数
        this.lastUploadedCount = this.counter;
        
        this.uploadTimer = setInterval(async () => {
            if (this.username && this.counter > this.lastUploadedCount) {
                // 计算自上次上传以来增加的次数
                const diff = this.counter - this.lastUploadedCount;
                console.log('定时上传点击次数增加量:', diff);
                
                // 上传增加的次数
                await this.callBackendAPI('/hit', 'POST', { count: diff });
                
                // 更新上次上传的点击次数
                this.lastUploadedCount = this.counter;
            }
        }, 30000); // 30秒
    }
    
    // 设置5分钟定时同步数据
    setupDataSyncTimer() {
        console.log('设置5分钟定时同步数据');
        this.syncTimer = setInterval(async () => {
            if (this.username) {
                console.log('开始定时同步数据');
                await this.syncAllData();
            }
        }, 300000); // 5分钟
    }
    
    // 同步所有数据
    async syncAllData() {
        try {
            // 同步总敲击次数
            await this.syncHits();
            
            // 同步功德成就次数
            await this.syncMeritAchievements();
            
            // 同步成就达成情况
            await this.syncAchievementsStatus();
            
            console.log('数据同步完成');
        } catch (error) {
            console.error('数据同步失败:', error);
        }
    }
    
    // 同步总敲击次数
    async syncHits() {
        try {
            // 获取后端敲击次数
            const response = await this.callBackendAPI('/hits', 'GET', { username: this.username });
            if (response && response.success) {
                const backendCount = response.totalHits;
                console.log('后端敲击次数:', backendCount, '本地敲击次数:', this.counter);
                
                if (this.counter > backendCount) {
                    // 前端大于后端，上传差值
                    const diff = this.counter - backendCount;
                    console.log('前端敲击次数大于后端，上传差值:', diff);
                    await this.callBackendAPI('/hit', 'POST', { count: diff });
                    
                    // 更新上次上传的点击次数，避免定时器重复上传
                    this.lastUploadedCount = this.counter;
                } else if (backendCount > this.counter) {
                    // 后端大于前端，更新本地
                    console.log('后端敲击次数大于前端，更新本地:', backendCount);
                    this.counter = backendCount;
                    this.counterElement.textContent = this.counter;
                    localStorage.setItem('cyberMuYuCounter', this.counter);
                    
                    // 同时更新上次上传的点击次数，确保数据一致性
                    this.lastUploadedCount = this.counter;
                }
            }
        } catch (error) {
            console.error('同步敲击次数失败:', error);
        }
    }
    
    // 同步功德成就次数
    async syncMeritAchievements() {
        try {
            // 获取后端功德成就次数
            const response = await this.callBackendAPI('/merit-achievements', 'GET', { username: this.username });
            if (response && response.success && response.meritAchievements) {
                const today = new Date().toISOString().split('T')[0];
                // 获取今日的后端次数
                const backendTodayCount = response.meritAchievements[today] || 0;
                console.log('今日后端功德成就次数:', backendTodayCount, '本地今日功德成就次数:', this.dailyMeritAchieveCount);
                
                if (this.dailyMeritAchieveCount > backendTodayCount) {
                    // 本地今日次数大于后端今日次数，上传差值
                    const diff = this.dailyMeritAchieveCount - backendTodayCount;
                    console.log('本地今日功德成就次数大于后端，上传差值:', diff);
                    await this.callBackendAPI('/achievement', 'POST', {
                        achievementId: 'merit-all',
                        unlocked: true,
                        count: diff
                    });
                } else if (backendTodayCount > this.dailyMeritAchieveCount) {
                    // 后端今日次数大于本地今日次数，更新本地
                    console.log('后端今日功德成就次数大于本地，更新本地:', backendTodayCount);
                    this.dailyMeritAchieveCount = backendTodayCount;
                    this.saveMeritAchievementStats();
                }
            }
        } catch (error) {
            console.error('同步功德成就次数失败:', error);
        }
    }
    
    // 同步成就达成情况
    async syncAchievementsStatus() {
        try {
            // 获取后端成就数据
            const response = await this.callBackendAPI('/achievements', 'GET', { username: this.username });
            if (response && response.success && response.achievements) {
                console.log('开始同步成就达成情况');
                
                // 遍历本地成就
                for (const localAchievement of this.achievements) {
                    const backendAchievement = response.achievements[localAchievement.id];
                    
                    if (backendAchievement) {
                        // 比较解锁状态
                        if (localAchievement.unlocked && !backendAchievement.unlocked) {
                            // 本地已解锁，后端未解锁，上传解锁状态
                            console.log('本地成就已解锁，后端未解锁，上传解锁状态:', localAchievement.id);
                            await this.callBackendAPI('/achievement', 'POST', {
                                achievementId: localAchievement.id,
                                unlocked: true
                            });
                        } else if (!localAchievement.unlocked && backendAchievement.unlocked) {
                            // 本地未解锁，后端已解锁，更新本地解锁状态
                            console.log('本地成就未解锁，后端已解锁，更新本地解锁状态:', localAchievement.id);
                            localAchievement.unlocked = true;
                            if (backendAchievement.unlockedAt) {
                                localAchievement.unlockedAt = backendAchievement.unlockedAt;
                            }
                        }
                    } else if (localAchievement.unlocked) {
                        // 后端没有该成就记录，本地已解锁，上传解锁状态
                        console.log('后端没有该成就记录，本地已解锁，上传解锁状态:', localAchievement.id);
                        await this.callBackendAPI('/achievement', 'POST', {
                            achievementId: localAchievement.id,
                            unlocked: true
                        });
                    }
                }
                
                // 保存同步后的成就数据
                this.saveAchievements();
            }
        } catch (error) {
            console.error('同步成就达成情况失败:', error);
        }
    }

    initStats() {
        // 获取今日日期
        const today = new Date().toDateString();
        const savedData = localStorage.getItem('cyberMuYuStats');
        const stats = savedData ? JSON.parse(savedData) : {};

        // 检查是否为新的一天
        if (stats.lastDate !== today) {
            stats.todayCount = 0;
            stats.lastDate = today;
        }

        this.todayCount = stats.todayCount || 0;
        if (this.todayCountElement) {
            this.todayCountElement.textContent = this.todayCount;
        }

        // 保存到本地存储
        this.saveStats();
    }

    // 成就系统初始化
    initAchievements() {
        // 定义成就列表
        this.achievements = [
            {
                id: 'merit-all',
                name: '每日体会侯宇轩对樊事诚的思念',
                description: '显示所有50句关于樊事诚的思念',
                unlocked: false,
                condition: { type: 'merit-all', value: 50 }
            },
            {
                id: 'total-usage-1h',
                name: '累计使用一小时',
                description: '累计使用应用一小时',
                unlocked: false,
                condition: { type: 'time', value: 3600 }
            },
            {
                id: 'first-combo',
                name: '初次连击',
                description: '连续点击10次',
                unlocked: false,
                condition: { type: 'consecutive', value: 10 }
            },
            {
                id: 'total-clicks',
                name: '点击大师',
                description: '累计点击1000次',
                unlocked: false,
                condition: { type: 'total', value: 1000 }
            },
            {
                id: 'daily-champion',
                name: '每日达人',
                description: '单日点击500次',
                unlocked: false,
                condition: { type: 'daily', value: 500 }
            },
            {
                id: 'theme-explorer',
                name: '主题探索者',
                description: '体验所有主题',
                unlocked: false,
                condition: { type: 'themes', value: 4 }
            },
            {
                id: 'sound-collector',
                name: '音效收藏家',
                description: '体验所有音效',
                unlocked: false,
                condition: { type: 'sounds', value: 4 }
            },
            {
                id: 'zen-master',
                name: '禅意大师',
                description: '累计点击10000次',
                unlocked: false,
                condition: { type: 'total', value: 10000 }
            },
            // 新添加的成就
            {
                id: 'first-breath',
                name: '初次呼吸',
                description: '使用呼吸引导功能一次',
                unlocked: false,
                condition: { type: 'breath', value: 1 }
            },
            {
                id: 'breath-master',
                name: '呼吸大师',
                description: '累计使用呼吸引导功能10次',
                unlocked: false,
                condition: { type: 'breath', value: 10 }
            },
            {
                id: 'first-meditation',
                name: '初次冥想',
                description: '完成一次5分钟冥想',
                unlocked: false,
                condition: { type: 'meditation', value: 5 }
            },
            {
                id: 'meditation-expert',
                name: '冥想专家',
                description: '累计冥想时间达到1小时',
                unlocked: false,
                condition: { type: 'meditation-total', value: 60 }
            },
            {
                id: 'white-noise-fan',
                name: '白噪音爱好者',
                description: '使用白噪音功能3次',
                unlocked: false,
                condition: { type: 'white-noise', value: 3 }
            },
            {
                id: 'perfect-combo',
                name: '完美连击',
                description: '连续点击50次',
                unlocked: false,
                condition: { type: 'consecutive', value: 50 }
            },
            {
                id: 'click-maniac',
                name: '点击狂人',
                description: '单日点击2000次',
                unlocked: false,
                condition: { type: 'daily', value: 2000 }
            },
            {
                id: 'all-in-one',
                name: '全能用户',
                description: '同时使用呼吸引导、冥想和白噪音功能',
                unlocked: false,
                condition: { type: 'all-features', value: 3 }
            }
        ];

        // 从本地存储加载成就
        this.loadAchievements();

        // 初始化体验过的主题和音效
        this.experiencedThemes = new Set(JSON.parse(localStorage.getItem('experiencedThemes') || '[]'));
        this.experiencedSounds = new Set(JSON.parse(localStorage.getItem('experiencedSounds') || '[]'));

        // 添加主题和音效体验记录
        this.experiencedThemes.add('cyber');
        this.experiencedSounds.add('wood');
        this.saveExperienceData();

        // 初始化主题动态元素
        this.themeElements = document.getElementById('themeElements');
        this.currentTheme = 'cyber';
        this.stars = [];
        this.sakura = [];
        this.mouseX = 0;
        this.mouseY = 0;
        // 移动设备动作变量
        this.deviceMotionX = 0;
        this.deviceMotionY = 0;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // 监听鼠标移动，用于星空跟随效果
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // 监听设备动作，用于移动端星空跟随效果
        if (this.isMobile) {
            // 添加设备动作监听器
            const handleDeviceOrientation = (e) => {
                // 使用gamma和beta值来控制星空移动
                // gamma: 左右倾斜 (-90到90度)
                // beta: 前后倾斜 (-180到180度)

                // 获取屏幕方向
                const orientation = window.screen.orientation || window.orientation;
                const isLandscape = orientation.type ? orientation.type.includes('landscape') : (Math.abs(orientation) === 90);

                let motionX = e.gamma || 0;
                let motionY = e.beta || 0;

                // 平板横屏时，交换x和y轴
                if (isLandscape) {
                    // 横屏时，gamma控制上下，beta控制左右，所以交换并调整方向
                    [motionX, motionY] = [motionY, -motionX];
                }

                this.deviceMotionX = motionX;
                this.deviceMotionY = motionY;
            };

            window.addEventListener('deviceorientation', handleDeviceOrientation);

            // 添加触摸事件监听器，用于触发设备方向事件权限
            const handleTouchStart = () => {
                // 尝试获取设备方向权限
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(response => {
                            if (response === 'granted') {
                                console.log('Device orientation permission granted');
                            }
                        })
                        .catch(error => {
                            console.error('Error requesting device orientation permission:', error);
                        });
                }

                // 移除触摸事件监听器，只需要触发一次
                document.removeEventListener('touchstart', handleTouchStart);
            };

            // 添加触摸事件监听器
            document.addEventListener('touchstart', handleTouchStart);
        }
    }

    // 加载成就
    loadAchievements() {
        const savedAchievements = localStorage.getItem('cyberMuYuAchievements');
        if (savedAchievements) {
            const unlockedIds = JSON.parse(savedAchievements);
            this.achievements.forEach(achievement => {
                if (unlockedIds.includes(achievement.id)) {
                    achievement.unlocked = true;
                }
            });
        }
    }

    // 保存成就
    saveAchievements() {
        const unlockedIds = this.achievements.filter(achievement => achievement.unlocked).map(achievement => achievement.id);
        localStorage.setItem('cyberMuYuAchievements', JSON.stringify(unlockedIds));
    }

    // 保存体验数据
    saveExperienceData() {
        localStorage.setItem('experiencedThemes', JSON.stringify([...this.experiencedThemes]));
        localStorage.setItem('experiencedSounds', JSON.stringify([...this.experiencedSounds]));
    }

    // 保存成就统计数据
    saveAchievementStats() {
        const stats = {
            breathUsageCount: this.breathUsageCount,
            totalMeditationMinutes: this.totalMeditationMinutes,
            whiteNoiseActivationCount: this.whiteNoiseActivationCount,
            allFeaturesUsed: Array.from(this.allFeaturesUsed)
        };
        localStorage.setItem('cyberMuYuAchievementStats', JSON.stringify(stats));
    }

    // 加载成就统计数据
    loadAchievementStats() {
        const savedStats = localStorage.getItem('cyberMuYuAchievementStats');
        if (savedStats) {
            const stats = JSON.parse(savedStats);
            this.breathUsageCount = stats.breathUsageCount || 0;
            this.totalMeditationMinutes = stats.totalMeditationMinutes || 0;
            this.whiteNoiseActivationCount = stats.whiteNoiseActivationCount || 0;
            this.allFeaturesUsed = new Set(stats.allFeaturesUsed || []);
        }
    }

    // 获取网络时间（使用后端服务器时间）
    async getNetworkTime() {
        try {
            // 使用后端health端点获取当前时间，添加超时处理
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

            const response = await fetch(`${CONFIG.API_BASE_URL.replace('/api', '')}/health`, {
                signal: controller.signal,
                cache: 'no-cache' // 禁用缓存，确保获取最新时间
            });

            clearTimeout(timeoutId);

            // 检查响应状态
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return new Date(data.timestamp);
        } catch (error) {
            console.error('获取网络时间失败:', error);
            // 如果网络时间获取失败，回退到本地时间
            return new Date();
        }
    }

    // 获取当前时间（优先使用网络时间）
    async getCurrentTime() {
        if (this.serverTimeOffset) {
            // 如果已经有服务器时间偏移，直接计算
            return new Date(Date.now() + this.serverTimeOffset);
        } else {
            // 否则获取网络时间并计算偏移
            const networkTime = await this.getNetworkTime();
            this.serverTimeOffset = networkTime.getTime() - Date.now();
            return networkTime;
        }
    }

    // 检查成就
    checkAchievements() {
        // 检查连续点击成就
        this.achievements.forEach(achievement => {
            switch(achievement.condition.type) {
                case 'consecutive':
                    if (this.consecutiveCount >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'total':
                    if (this.counter >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'daily':
                    if (this.todayCount >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'themes':
                    if (this.experiencedThemes.size >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'sounds':
                    if (this.experiencedSounds.size >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'breath':
                    if (this.breathUsageCount >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'meditation':
                    // 单次冥想达到指定分钟数
                    if (this.lastMeditationMinutes >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'meditation-total':
                    if (this.totalMeditationMinutes >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'white-noise':
                    if (this.whiteNoiseActivationCount >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'all-features':
                    if (this.allFeaturesUsed.size >= achievement.condition.value && !achievement.unlocked) {
                        this.unlockAchievement(achievement);
                        this.saveAchievementStats();
                    }
                    break;
                case 'merit-all':
                    // 功德成就特殊处理，按句子显示次数计算达成次数
                    this.handleMeritAchievementCheck();
                    break;
            }
        });
    }

    // 处理功德成就检查
    async handleMeritAchievementCheck() {
        // 添加锁机制，避免并发调用导致计数翻倍
        if (this.isMeritAchievementChecking) {
            console.log('功德成就检查已在进行中，跳过本次调用');
            return;
        }
        this.isMeritAchievementChecking = true;
        
        try {
            // 计算当前所有句子的最小显示次数
            let minCount = Infinity;
            for (let i = 0; i < this.meritTexts.length; i++) {
                const count = this.shownMeritIndices.get(i) || 0;
                minCount = Math.min(minCount, count);
            }

            // 如果当前最小显示次数大于已记录的达成次数，更新计数
            if (minCount > this.dailyMeritAchieveCount) {
                // 计算本次增加的次数
                const increaseCount = minCount - this.dailyMeritAchieveCount;
                
                // 更新成就达成次数
                this.dailyMeritAchieveCount = minCount;

                // 计算下次重置时间
                const currentTime = await this.getCurrentTime();
                let resetTime = new Date(currentTime);
                resetTime.setHours(4, 0, 0, 0);
                if (currentTime > resetTime) {
                    resetTime.setDate(resetTime.getDate() + 1);
                }
                this.nextMeritResetTime = resetTime;

                // 保存统计数据
                this.saveMeritAchievementStats();

                // 查找功德成就
                const meritAchievement = this.achievements.find(a => a.id === 'merit-all');

                // 如果成就存在
                if (meritAchievement) {
                    // 如果是第一次达成成就，解锁成就并同步增加的次数
                    if (!meritAchievement.unlocked) {
                        // 准备成就数据，包含本次增加的次数
                        const achievementData = {
                            achievementId: meritAchievement.id,
                            unlocked: true,
                            count: increaseCount
                        };
                        
                        // 解锁成就，将传递包含增加次数的数据
                        this.unlockAchievement(meritAchievement, achievementData);
                        this.saveAchievementStats();
                    } else {
                        // 后续每次达成，显示提示并同步到后端
                        this.showMeritAchievementNotification(meritAchievement);
                        
                        // 准备成就数据，包含本次增加的次数
                        const achievementData = {
                            achievementId: meritAchievement.id,
                            unlocked: true,
                            count: increaseCount
                        };
                        
                        // 如果用户名已设置，立即发送到后端
                        if (this.username) {
                            console.log('用户名已设置，同步功德成就达成次数到后端:', meritAchievement.id, '增加次数:', increaseCount);
                            // 使用await确保上传完成后再继续执行
                            await this.callBackendAPI('/achievement', 'POST', achievementData)
                                .then(response => {
                                    console.log('功德成就达成次数同步成功:', meritAchievement.id, JSON.stringify(response));
                                })
                                .catch(error => {
                                    console.error('功德成就达成次数同步失败:', meritAchievement.id, error);
                                });
                        }
                    }
                }
            }
        } finally {
            // 无论成功或失败，都释放锁
            this.isMeritAchievementChecking = false;
            console.log('功德成就检查完成，释放锁');
        }
    }



    // 初始化功德成就重置系统
    async initializeMeritAchievementReset() {
        // 检查是否需要重置
        await this.checkMeritReset();

        // 设置定时器，每秒检查一次是否需要重置
        setInterval(async () => {
            await this.checkMeritReset();
        }, 1000); // 1秒检查一次

        // 设置定时器，每秒更新一次剩余时间显示
        setInterval(() => {
            this.updateMeritAchievementDisplay();
        }, 1000); // 每秒更新一次
    }

    // 更新功德成就的显示
    async updateMeritAchievementDisplay() {
        // 如果成就面板正在显示，更新剩余时间
        if (this.achievementsPanel && this.achievementsPanel.style.display === 'block') {
            // 重新生成成就列表，这样剩余时间会更新
            await this.generateAchievementsList();
        }
    }

    // 检查是否需要重置功德成就
    async checkMeritReset() {
        const currentTime = await this.getCurrentTime();

        // 如果没有设置下次重置时间，计算并设置
        if (!this.nextMeritResetTime) {
            let resetTime = new Date(currentTime);
            resetTime.setHours(4, 0, 0, 0);
            if (currentTime > resetTime) {
                resetTime.setDate(resetTime.getDate() + 1);
            }
            this.nextMeritResetTime = resetTime;
            this.saveMeritAchievementStats();
            return;
        }

        // 如果当前时间已经超过了重置时间，执行重置
        if (currentTime >= this.nextMeritResetTime) {
            this.resetMeritAchievement();
        }
    }

    // 重置功德成就
    async resetMeritAchievement() {
        // 重置达成次数
        this.dailyMeritAchieveCount = 0;

        // 重置显示过的句子次数记录
        this.shownMeritIndices.clear();
        localStorage.setItem('shownMeritIndices', JSON.stringify({}));

        // 计算下次重置时间
        const currentTime = await this.getCurrentTime();
        let resetTime = new Date(currentTime);
        resetTime.setHours(4, 0, 0, 0);
        resetTime.setDate(resetTime.getDate() + 1); // 下次重置时间为明天4点
        this.nextMeritResetTime = resetTime;

        // 保存统计数据
        this.saveMeritAchievementStats();
    }

    // 解锁成就
    unlockAchievement(achievement, achievementData = null) {
        achievement.unlocked = true;
        this.saveAchievements();
        this.showAchievementNotification(achievement);

        // 如果没有传入成就数据，准备默认数据
        if (!achievementData) {
            achievementData = {
                achievementId: achievement.id,
                unlocked: true
            };
            
            // 功德成就特殊处理，发送达成次数
            if (achievement.id === 'merit-all') {
                achievementData.count = 1;
            }
        } else {
            // 如果已经传入成就数据，不要覆盖count值
            // 确保功德成就的数据中包含count字段
            if (achievement.id === 'merit-all' && !achievementData.count) {
                achievementData.count = 1;
            }
        }

        // 如果用户名已设置，立即发送到后端
        if (this.username) {
            console.log('用户名已设置，立即同步成就:', achievement.id, JSON.stringify(achievementData));
            this.callBackendAPI('/achievement', 'POST', achievementData)
                .then(response => {
                    console.log('成就同步成功:', achievement.id, JSON.stringify(response));
                })
                .catch(error => {
                    console.error('成就同步失败:', achievement.id, error);
                });
        } else {
            // 如果用户名未设置，将成就添加到待同步队列
            console.log('用户名未设置，将成就添加到待同步队列:', achievement.id);
            this.pendingAchievements.push(achievementData);
        }
    }

    // 显示成就通知
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div class="achievement-content">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        `;

        document.body.appendChild(notification);

        // 自动移除通知
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // 显示功德成就后续达成通知
    showMeritAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div class="achievement-content">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">已达成${this.dailyMeritAchieveCount}次</div>
            </div>
        `;

        document.body.appendChild(notification);

        // 自动移除通知
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // 初始化离线数据存储
    initOfflineData() {
        if (!localStorage.getItem('offlineData')) {
            localStorage.setItem('offlineData', JSON.stringify([]));
        }
    }

    // 检测网络状态
    isOnline() {
        return navigator.onLine;
    }

    // 保存数据到本地存储
    saveOfflineData(endpoint, method, data) {
        const offlineData = JSON.parse(localStorage.getItem('offlineData') || '[]');
        const dataToSave = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            endpoint,
            method,
            data,
            timestamp: new Date().toISOString()
        };
        offlineData.push(dataToSave);
        localStorage.setItem('offlineData', JSON.stringify(offlineData));
        console.log('Data saved offline:', dataToSave);
    }

    // 从本地存储获取离线数据
    getOfflineData() {
        return JSON.parse(localStorage.getItem('offlineData') || '[]');
    }

    // 清除已提交的离线数据
    clearOfflineData(idsToClear) {
        let offlineData = JSON.parse(localStorage.getItem('offlineData') || '[]');
        offlineData = offlineData.filter(item => !idsToClear.includes(item.id));
        localStorage.setItem('offlineData', JSON.stringify(offlineData));
    }

    // 提交离线数据到服务器
    async submitOfflineData() {
        if (!this.isOnline()) {
            return;
        }

        const offlineData = this.getOfflineData();
        if (offlineData.length === 0) {
            return;
        }

        console.log('Submitting offline data:', offlineData.length, 'items');
        const successfullySubmitted = [];

        for (const item of offlineData) {
            try {
                await this.actualAPICall(item.endpoint, item.method, item.data);
                successfullySubmitted.push(item.id);
                console.log('Successfully submitted offline data:', item.id);
            } catch (error) {
                console.error('Failed to submit offline data:', item.id, error);
                // 如果提交失败，保留该数据以便下次尝试
            }
        }

        // 清除已成功提交的数据
        if (successfullySubmitted.length > 0) {
            this.clearOfflineData(successfullySubmitted);
            console.log('Cleared', successfullySubmitted.length, 'offline data items');
        }
    }

    // 实际的API调用函数
    async actualAPICall(endpoint, method = 'GET', data = null) {
        let url = `${CONFIG.API_BASE_URL}${endpoint}`;
        console.log('开始API调用:', method, url, '数据:', JSON.stringify(data)); // 使用JSON.stringify正确显示数据

        // 对于GET请求，如果有数据且包含用户名，则添加到URL参数中
        if (method === 'GET' && data && this.username) {
            // 如果URL已经有查询参数，使用&连接，否则使用?连接
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}username=${encodeURIComponent(this.username)}`;
            console.log('GET请求URL:', url);
        }

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                // GET请求不包含body
                body: (method === 'GET' || method === 'HEAD') ? null : (data ? JSON.stringify(data) : null)
            });
            
            console.log('API响应状态:', response.status, response.statusText);
            const responseData = await response.json();
            console.log('API响应数据:', responseData);
            return responseData;
        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }

    // 后端API调用工具函数（包含离线处理）
    async callBackendAPI(endpoint, method = 'GET', data = null) {
        try {
            // 在所有请求数据中添加用户名
            if (data && this.username) {
                data.username = this.username;
            }

            // 无论网络状态如何，都尝试直接调用API
            console.log('无论网络状态如何，都尝试直接调用API:', method, endpoint, data);
            return await this.actualAPICall(endpoint, method, data);
        } catch (error) {
            console.error('Backend API error:', error);
            // 调用失败时保存到离线数据
            this.saveOfflineData(endpoint, method, data);
            return null;
        }
    }

    // 同步本地已解锁的成就到后端
    async syncAchievements() {
        // 获取所有已解锁的成就
        const unlockedAchievements = this.achievements.filter(achievement => achievement.unlocked);
        
        if (unlockedAchievements.length === 0) {
            console.log('没有已解锁的成就需要同步');
            return;
        }

        console.log(`开始同步已解锁的成就到后端，共${unlockedAchievements.length}个成就`);

        // 用户名已设置，立即同步所有成就
        if (this.username) {
            console.log('用户名已设置，立即同步所有成就');
            
            // 遍历所有已解锁的成就并发送到后端
            for (const achievement of unlockedAchievements) {
                console.log(`同步成就: ${achievement.id}`);

                try {
                    // 向后端发送成就解锁信息
                    await this.callBackendAPI('/achievement', 'POST', {
                        achievementId: achievement.id,
                        unlocked: true
                    });

                    console.log(`成就${achievement.id}同步成功`);
                } catch (error) {
                    console.error(`成就${achievement.id}同步失败:`, error);
                    // 错误会在callBackendAPI中处理（保存到离线数据）
                }
            }

            console.log('成就同步完成');
        } else {
            // 用户名未设置，将所有已解锁成就添加到待同步队列
            console.log('用户名未设置，将所有已解锁成就添加到待同步队列');
            
            // 遍历所有已解锁的成就并添加到待同步队列
            for (const achievement of unlockedAchievements) {
                console.log(`将成就添加到待同步队列: ${achievement.id}`);
                
                // 检查是否已经在队列中，避免重复
                const isAlreadyInQueue = this.pendingAchievements.some(item => item.achievementId === achievement.id);
                if (!isAlreadyInQueue) {
                    this.pendingAchievements.push({
                        achievementId: achievement.id,
                        unlocked: true
                    });
                }
            }
            
            console.log(`已将${unlockedAchievements.length}个成就添加到待同步队列`);
        }
    }

    // 从服务器同步成就数据到本地
    syncAchievementsFromServer(data) {
        if (!data.achievements) return;

        console.log('开始同步服务器成就数据到本地...');

        // 同步普通成就
        Object.entries(data.achievements).forEach(([achievementId, achievementData]) => {
            const localAchievement = this.achievements.find(achievement => achievement.id === achievementId);

            if (localAchievement) {
                // 更新本地成就的解锁状态
                localAchievement.unlocked = achievementData.unlocked;

                // 如果有解锁时间，保存到本地
                if (achievementData.unlockedAt) {
                    localAchievement.unlockedAt = achievementData.unlockedAt;
                }

                console.log(`同步成就${achievementId}: ${achievementData.unlocked ? '已解锁' : '未解锁'}`);
            }
        });

        // 同步功德成就数据
        if (data.meritAchievements) {
            console.log('开始同步服务器功德成就数据到本地...');
            
            // 计算功德成就总次数
            const totalMeritCount = Object.values(data.meritAchievements).reduce((sum, count) => sum + count, 0);
            
            console.log(`服务器功德成就总次数: ${totalMeritCount}, 本地当前次数: ${this.dailyMeritAchieveCount}`);
            
            // 如果服务器次数大于本地次数，更新本地次数
            if (totalMeritCount > this.dailyMeritAchieveCount) {
                console.log('服务器功德成就次数大于本地，更新本地次数');
                this.dailyMeritAchieveCount = totalMeritCount;
                
                // 保存更新后的统计数据
                this.saveMeritAchievementStats();
            }
            
            // 检查功德成就解锁状态
            const meritAchievement = this.achievements.find(a => a.id === 'merit-all');
            if (meritAchievement && totalMeritCount > 0 && !meritAchievement.unlocked) {
                console.log('服务器功德成就次数大于0，解锁成就');
                
                // 准备成就数据，包含总次数
                const achievementData = {
                    achievementId: meritAchievement.id,
                    unlocked: true,
                    count: totalMeritCount
                };
                
                // 解锁成就，传递包含总次数的数据
                this.unlockAchievement(meritAchievement, achievementData);
                this.saveAchievementStats();
            }
        }

        // 保存同步后的成就数据
        this.saveAchievements();

        console.log('服务器成就数据同步到本地完成');
    }

    // 从服务器同步敲击次数数据到本地
    syncHitsFromServer(data) {
        if (!data.totalHits) return;

        console.log(`同步服务器敲击次数数据到本地: ${data.totalHits}`);

        // 更新本地敲击次数
        this.counter = data.totalHits;

        // 保存同步后的敲击次数
        localStorage.setItem('cyberMuYuCounter', this.counter);

        // 更新显示（仅更新显示，不增加计数）
        if (this.counterElement) {
            this.counterElement.textContent = this.counter;
        }
    }

    // 从服务器同步音乐播放时长数据到本地
    syncMusicTimeFromServer(data) {
        if (!data.totalMusicTime) return;

        console.log(`同步服务器音乐播放时长数据到本地: ${data.totalMusicTime}分钟`);

        // 更新本地音乐播放时长
        this.totalMusicTime = data.totalMusicTime;

        // 保存同步后的音乐播放时长
        this.saveAchievementStats();
    }

    // 从服务器同步应用使用时长数据到本地
    syncAppUsageTimeFromServer(data) {
        if (!data.totalAppUsageTime) return;

        console.log(`同步服务器应用使用时长数据到本地: ${data.totalAppUsageTime}分钟`);

        // 更新本地应用使用时长
        this.totalAppUsageTime = data.totalAppUsageTime;

        // 保存同步后的应用使用时长
        localStorage.setItem('totalAppUsageTime', this.totalAppUsageTime);
    }

    // 处理返回键事件
    handleBackKey() {
        // 如果成就面板打开，关闭成就面板
        if (this.achievementsPanel && this.achievementsPanel.style.display === 'flex') {
            this.hideAchievementsPanel();
            return true;
        }
        // 如果冥想模式打开，关闭冥想模式
        else if (this.isMeditationMode) {
            this.stopMeditationMode();
            return true;
        }
        // 如果呼吸模式打开，关闭呼吸模式
        else if (this.isBreathMode) {
            this.stopBreathMode();
            return true;
        }
        // 其他情况，返回false，让Android端处理
        else {
            return false;
        }
    }

    saveStats() {
        const stats = {
            todayCount: this.todayCount,
            lastDate: new Date().toDateString()
        };
        localStorage.setItem('cyberMuYuStats', JSON.stringify(stats));
    }

    // 白噪音功能
    toggleWhiteNoise() {
        this.isWhiteNoisePlaying = !this.isWhiteNoisePlaying;

        if (this.isWhiteNoisePlaying) {
            // 开始白噪音
            this.startWhiteNoise();
            this.whiteNoiseToggleBtn.classList.add('active');
            this.whiteNoiseToggleBtn.textContent = '关闭白噪音';

            // 成就系统：增加白噪音使用次数
            this.whiteNoiseActivationCount++;
            this.allFeaturesUsed.add('white-noise');

            // 保存成就统计数据
            this.saveAchievementStats();

            // 检查成就
            this.checkAchievements();

            // 开始计时
            this.startMusicTimeCounting();
        } else {
            // 停止白噪音
            this.stopWhiteNoise();
            this.whiteNoiseToggleBtn.classList.remove('active');
            this.whiteNoiseToggleBtn.textContent = '白噪音';

            // 检查是否需要停止计时
            if (!this.isMusicPlaying && !this.isWhiteNoisePlaying) {
                this.stopMusicTimeCounting();
            }
        }

        // 通知Android端白噪音状态变化
        if (window.AndroidWhiteNoiseInterface) {
            try {
                window.AndroidWhiteNoiseInterface.onWhiteNoiseStateChanged(this.isWhiteNoisePlaying);
            } catch (error) {
                console.error('Error calling Android interface:', error);
            }
        }
    }

    // 选择自定义音乐
    selectCustomMusic() {
        console.log('选择自定义音乐');
        if (window.AndroidWhiteNoiseInterface) {
            try {
                window.AndroidWhiteNoiseInterface.selectCustomMusic();
            } catch (error) {
                console.error('Error calling Android interface:', error);
            }
        }
    }

    // 从URI中提取文件名
    getFileNameFromUri(uri) {
        console.log('从URI提取文件名:', uri);
        let fileName = '自定义音乐';
        try {
            // 处理file:// URI
            if (uri.startsWith('file://')) {
                // 提取文件名
                fileName = uri.substring(uri.lastIndexOf('/') + 1);
                // 解码URI
                fileName = decodeURIComponent(fileName);
            }
            // 处理content:// URI
            else if (uri.startsWith('content://')) {
                // 对于content URI，我们只能使用默认名称或从URI路径中提取部分信息
                const path = uri.split('/');
                fileName = path[path.length - 1] || '自定义音乐';
                // 解码URI
                fileName = decodeURIComponent(fileName);
            }
            console.log('提取到的文件名:', fileName);
        } catch (error) {
            console.error('提取文件名失败:', error);
        }
        return fileName;
    }

    // 自定义音乐选择完成回调
    onCustomMusicSelected(uri) {
        console.log('自定义音乐选择完成，URI:', uri);
        this.customMusicUri = uri;

        // 提取文件名
        const fileName = this.getFileNameFromUri(uri);
        this.customMusicName = fileName;

        // 通知Android端音乐名称
        if (window.AndroidWhiteNoiseInterface) {
            try {
                console.log('通知Android端音乐名称:', fileName);
                window.AndroidWhiteNoiseInterface.onWhiteNoiseNameChanged(fileName);
            } catch (error) {
                console.error('Error calling Android interface:', error);
            }
        }

        // 显示恢复默认音乐按钮
        if (this.restoreDefaultMusicBtn) {
            this.restoreDefaultMusicBtn.style.display = 'inline-block';
        }

        // 显示选择成功提示
        this.showNotification('自定义音乐已选择', '点击白噪音按钮开始播放');
    }

    // 恢复默认音乐
    restoreDefaultMusic() {
        console.log('恢复默认音乐');

        // 重置自定义音乐相关变量
        this.customMusicUri = null;
        this.customMusicName = null;

        // 显示提示信息
        this.showNotification('已恢复默认白噪音音乐', '');

        // 隐藏恢复默认音乐按钮
        if (this.restoreDefaultMusicBtn) {
            this.restoreDefaultMusicBtn.style.display = 'none';
        }

        // 通知Android端恢复默认音乐名称
        if (window.AndroidWhiteNoiseInterface) {
            try {
                console.log('通知Android端恢复默认音乐名称');
                window.AndroidWhiteNoiseInterface.onWhiteNoiseNameChanged('白噪音');
            } catch (error) {
                console.error('Error calling Android interface:', error);
            }
        }

        // 如果当前正在播放，需要重新开始播放默认音乐
        if (this.isWhiteNoisePlaying && this.whiteNoiseAudio) {
            // 停止当前播放
            this.whiteNoiseAudio.pause();
            // 重新开始播放默认音乐
            this.startWhiteNoise();
        }
    }

    startWhiteNoise() {
        // 每次都重新创建音频对象，确保正确获取时长
        let audioSrc = 'media/默认.aac';

        // 如果有自定义音乐，使用自定义音乐
        if (this.customMusicUri) {
            audioSrc = this.customMusicUri;
        }

        this.whiteNoiseAudio = new Audio(audioSrc);
        // 启用loop属性，实现循环播放
        this.whiteNoiseAudio.loop = true;
        this.whiteNoiseAudio.volume = 1.0;
        this.whiteNoiseAudio.preload = 'auto';

        // 获取并通知音频时长的辅助函数
        const notifyDuration = () => {
            let duration = this.whiteNoiseAudio.duration;
            // 确保获取到有效的时长
            if (isNaN(duration) || duration <= 0) {
                duration = 5299; // 默认1小时28分19秒
            }

            // 通知Android端音频时长
            if (window.AndroidWhiteNoiseInterface) {
                try {
                    window.AndroidWhiteNoiseInterface.onWhiteNoiseDurationChanged(duration);
                } catch (error) {
                    console.error('Error calling Android interface:', error);
                }
            }
        };

        // 监听音频加载完成事件，获取真实时长
        this.whiteNoiseAudio.addEventListener('loadedmetadata', notifyDuration);

        // 监听play事件，确保在播放开始时再次通知时长
        this.whiteNoiseAudio.addEventListener('play', notifyDuration);

        // 监听播放进度变化
        this.whiteNoiseAudio.addEventListener('timeupdate', () => {
            let currentTime = this.whiteNoiseAudio.currentTime;

            // 通知Android端当前播放位置
            if (window.AndroidWhiteNoiseInterface) {
                try {
                    window.AndroidWhiteNoiseInterface.onWhiteNoiseCurrentTimeChanged(currentTime);
                } catch (error) {
                    console.error('Error calling Android interface:', error);
                }
            }
        });

        // 立即通知当前播放位置（初始值）
        if (window.AndroidWhiteNoiseInterface) {
            try {
                window.AndroidWhiteNoiseInterface.onWhiteNoiseCurrentTimeChanged(0);
            } catch (error) {
                console.error('Error calling Android interface:', error);
            }
        }

        this.whiteNoiseAudio.play().catch(error => {
            console.error('播放音频失败:', error);
            // 显示播放失败提示
            this.showNotification('播放失败', '无法播放所选音频文件');
            // 重置状态
            this.isWhiteNoisePlaying = false;
            this.whiteNoiseToggleBtn.classList.remove('active');
            this.whiteNoiseToggleBtn.textContent = '白噪音';
        });
    }

    stopWhiteNoise() {
        if (this.whiteNoiseAudio) {
            this.whiteNoiseAudio.pause();
            // 移除重置currentTime的代码，这样暂停后再次播放会从暂停的位置继续
            // this.whiteNoiseAudio.currentTime = 0;
        }
    }

    handleThemeChange(e) {
        const theme = e.target.value;
        document.body.className = `theme-${theme}`;

        // 根据主题更新CSS变量，确保primary-color正确同步
        const themeColors = {
            cyber: { primary: '#00ff41', bg: '#0a0a0a', text: '#00ff41' },
            pastel: { primary: '#ff6b9d', bg: '#f8f0f5', text: '#ff6b9d' },
            ocean: { primary: '#38bdf8', bg: '#0f172a', text: '#38bdf8' },
            sunset: { primary: '#fb923c', bg: '#1a1110', text: '#fb923c' }
        };

        const colors = themeColors[theme];
        if (colors) {
            document.body.style.setProperty('--primary-color', colors.primary);
            document.body.style.setProperty('--bg-color', colors.bg);
            document.body.style.setProperty('--text-color', colors.text);
        }

        // 主题与木鱼样式的映射关系
        const themeFishStyleMap = {
            cyber: 'cyber',      // 赛博朋克对应赛博
            pastel: 'crystal',   // 柔和粉对应水晶
            ocean: 'ice',        // 深海蓝对应寒冰
            sunset: 'fire'       // 日落橙对应火焰
        };

        // 根据主题自动切换木鱼样式
        const fishStyle = themeFishStyleMap[theme];
        if (fishStyle && this.fishStyleSelectElement) {
            // 更新木鱼样式选择器的值
            this.fishStyleSelectElement.value = fishStyle;
            // 调用木鱼样式变更处理函数
            this.handleFishStyleChange({ target: { value: fishStyle } });
        }

        // 记录体验过的主题
        this.experiencedThemes.add(theme);
        this.saveExperienceData();
        this.checkAchievements();

        // 更新主题动态元素
        this.updateThemeElements(theme);
    }

    handleSoundChange(e) {
        this.soundType = e.target.value;

        // 记录体验过的音效
        this.experiencedSounds.add(e.target.value);
        this.saveExperienceData();
        this.checkAchievements();
    }

    // 处理木鱼样式变更
    handleFishStyleChange(e) {
        this.fishStyle = e.target.value;
        this.fishElement.className = `fish ${this.fishStyle}`;
    }

    // 更新主题动态元素
    updateThemeElements(theme) {
        // 移除现有主题元素和动画
        this.clearThemeElements();

        // 根据主题创建新元素
        switch(theme) {
            case 'cyber':
                this.createCyberStars();
                break;
            case 'pastel':
                this.createSakura();
                break;
            case 'ocean':
                // 深海蓝主题无背景效果
                break;
            case 'sunset':
                this.createSun();
                break;
        }

        this.currentTheme = theme;

        // 如果没有主题动画，启动默认背景动画
        if (!this.themeAnimationInterval) {
            this.startBackgroundAnimation();
        }
    }

    // 清除现有主题元素
    clearThemeElements() {
        this.themeElements.innerHTML = '';
        this.stars = [];
        this.sakura = [];

        // 清除可能存在的动画定时器
        if (this.themeAnimationInterval) {
            clearInterval(this.themeAnimationInterval);
            this.themeAnimationInterval = null;
        }
    }

    // 创建赛博朋克主题的动态星空
    createCyberStars() {
        const starCount = 100;

        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';

            // 随机位置
            const x = Math.random() * 100;
            const y = Math.random() * 100;

            // 随机大小
            const size = Math.random() * 3 + 1;

            // 随机亮度
            const opacity = Math.random() * 0.8 + 0.2;

            // 随机闪烁速度
            const blinkSpeed = Math.random() * 3 + 1;

            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.opacity = opacity;
            star.style.animationDuration = `${blinkSpeed}s`;

            this.themeElements.appendChild(star);
            this.stars.push({ element: star, x, y });
        }

        // 启动背景动画
        this.startBackgroundAnimation();
    }

    // 启动背景动画
    startBackgroundAnimation() {
        // 清除现有定时器，确保只有一个动画循环运行
        if (this.themeAnimationInterval) {
            clearInterval(this.themeAnimationInterval);
            this.themeAnimationInterval = null;
        }

        // 启动新的定时器
        this.themeAnimationInterval = setInterval(() => {
            try {
                this.updateBackgroundElements();
            } catch (error) {
                // 忽略初始化阶段的错误，直到themeElements完全初始化
                if (this.themeElements) {
                    console.error('Error in updateBackgroundElements:', error);
                }
            }
        }, 50);
    }

    // 更新背景元素位置，实现跟随鼠标或设备动作效果
    updateBackgroundElements() {
        // 确保所有必要的属性都已初始化
        if (!this.currentOffsetX) this.currentOffsetX = 0;
        if (!this.currentOffsetY) this.currentOffsetY = 0;
        if (!this.deviceMotionX) this.deviceMotionX = 0;
        if (!this.deviceMotionY) this.deviceMotionY = 0;
        if (!this.mouseX) this.mouseX = window.innerWidth / 2;
        if (!this.mouseY) this.mouseY = window.innerHeight / 2;
        if (!this.isMobile) this.isMobile = false;
        if (!this.stars) this.stars = [];
        if (!this.sakura) this.sakura = [];

        let targetOffsetX = 0;
        let targetOffsetY = 0;

        if (this.isMobile) {
            // 移动端使用设备动作数据
            // 将gamma(-90到90)映射到-20到20的偏移量，并限制范围（增大为两倍）
            targetOffsetX = Math.max(-20, Math.min(20, this.deviceMotionX / 90 * 20));
            // 将beta(-180到180)映射到-20到20的偏移量，并限制范围（增大为两倍）
            targetOffsetY = Math.max(-20, Math.min(20, this.deviceMotionY / 180 * 20));
        } else {
            // 电脑端使用鼠标位置
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            targetOffsetX = (this.mouseX - centerX) / centerX * 20; // 增大为两倍
            targetOffsetY = (this.mouseY - centerY) / centerY * 20; // 增大为两倍
        }

        // 平滑过渡效果
        const smoothFactor = 0.1; // 平滑因子，值越小过渡越平滑
        this.currentOffsetX += (targetOffsetX - this.currentOffsetX) * smoothFactor;
        this.currentOffsetY += (targetOffsetY - this.currentOffsetY) * smoothFactor;

        // 更新星星位置（赛博朋克主题）
        if (this.stars && this.stars.length > 0) {
            this.stars.forEach(star => {
                const element = star.element;
                const adjustedX = star.x + this.currentOffsetX;
                const adjustedY = star.y + this.currentOffsetY;
                element.style.left = `${adjustedX}%`;
                element.style.top = `${adjustedY}%`;
            });
        }

        // 更新樱花位置（柔和粉主题）
        if (this.sakura && this.sakura.length > 0) {
            this.sakura.forEach((petal, index) => {
                // 樱花花瓣根据重力感应产生明显的偏移
                const offsetX = this.currentOffsetX * 1.0;
                const offsetY = this.currentOffsetY * 1.0;
                petal.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            });
        }

        // 更新太阳位置（日落橙主题）
        if (this.themeElements) {
            const sunElement = this.themeElements.querySelector('.sun');
            if (sunElement) {
                const offsetX = this.currentOffsetX * 1.0;
                const offsetY = this.currentOffsetY * 1.0;
                sunElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            }
        }
    }

    // 创建柔和粉主题的樱花飘落效果
    createSakura() {
        const sakuraCount = 300; // 大幅增加花瓣数量，让画面更饱满

        for (let i = 0; i < sakuraCount; i++) {
            const petal = document.createElement('div');
            petal.className = 'sakura-petal';

            // 随机位置 - 确保所有花瓣从屏幕上方开始
            const x = Math.random() * 100;
            const y = Math.random() * 80 - 100; // 从屏幕上方外开始 (-100% 到 -50%)

            // 随机大小 - 恢复到原来的尺寸
            const size = Math.random() * 10 + 5;

            // 随机旋转角度
            const rotation = Math.random() * 360;

            // 随机飘落速度
            const fallSpeed = Math.random() * 5 + 3;

            // 随机摇摆幅度
            const swayAmount = Math.random() * 10 + 5;

            // 透明度 - 设置为80%
            const opacity = 0.2;

            petal.style.left = `${x}%`;
            petal.style.top = `${y}%`;
            petal.style.width = `${size}px`;
            petal.style.height = `${size}px`;
            petal.style.rotate = `${rotation}deg`;
            petal.style.opacity = opacity;
            petal.style.animationDuration = `${fallSpeed}s`;
            petal.style.setProperty('--sway-amount', `${swayAmount}px`);
            petal.style.setProperty('--initial-rotation', `${rotation}deg`);

            this.themeElements.appendChild(petal);
            this.sakura.push(petal);
        }

        // 启动背景动画
        this.startBackgroundAnimation();
    }

    // 创建日落橙主题的太阳
    createSun() {
        const sun = document.createElement('div');
        sun.className = 'sun';
        this.themeElements.appendChild(sun);

        // 启动背景动画
        this.startBackgroundAnimation();
    }

    // 处理冥想时长变化
    handleMeditationDurationChange(e) {
        const value = e.target.value;
        if (value === 'custom') {
            // 显示自定义时长选择按钮
            if (this.customDurationBtn) {
                this.customDurationBtn.style.display = 'inline-block';
            }
        } else {
            // 隐藏自定义时长选择按钮，使用预设值
            if (this.customDurationBtn) {
                this.customDurationBtn.style.display = 'none';
            }
            this.meditationDuration = parseInt(value);
        }
    }

    // 选择自定义冥想时长
    selectCustomMeditationDuration() {
        console.log('选择自定义冥想时长，调用Android原生时长选择器');

        // 调用Android原生时长选择器
        if (window.AndroidMeditationInterface) {
            try {
                // 获取当前时长作为默认值
                const currentHours = Math.floor(this.meditationDuration / 3600) || 0;
                const currentMinutes = Math.floor((this.meditationDuration % 3600) / 60) || 0;
                const currentSeconds = this.meditationDuration % 60 || 0;

                // 调用Android方法显示时长选择器
                window.AndroidMeditationInterface.showDurationPicker(currentHours, currentMinutes, currentSeconds);
            } catch (error) {
                console.error('调用Android原生时长选择器失败:', error);
            }
        }
    }

    // Android原生时长选择器回调
    onDurationSelected(hours, minutes, seconds) {
        console.log('Android原生时长选择器回调，时长:', hours, '小时', minutes, '分钟', seconds, '秒');

        // 计算总秒数
        this.meditationDuration = hours * 3600 + minutes * 60 + seconds;

        // 显示选择成功提示
        this.showNotification('时长已更新', `${hours}小时 ${minutes}分钟 ${seconds}秒`);
    }





    // 旧的Android端回调（保留兼容）
    setCustomMeditationDuration(hours, minutes, seconds) {
        // 计算总秒数
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        this.meditationDuration = totalSeconds;
        console.log('自定义冥想时长设置为:', hours, '小时', minutes, '分钟', seconds, '秒');

        // 更新按钮显示
        if (this.customDurationBtn) {
            this.customDurationBtn.textContent = `${hours}时${minutes}分${seconds}秒`;
        }

        // 显示设置成功提示
        this.showNotification('时长设置成功', `冥想时长: ${hours}时${minutes}分${seconds}秒`);
    }
    handleCustomDurationInput(e) {
        const minutes = parseInt(e.target.value);
        if (minutes && minutes >= 1 && minutes <= 1440) {
            this.meditationDuration = minutes * 60; // 转换为秒数
        } else {
            this.meditationDuration = 300; // 默认5分钟
        }
    }





    // 音乐搜索


















    // 显示通知，调用Android原生Toast
    showNotification(title, message) {
        console.log('显示通知:', title, message);

        // 调用Android原生Toast提示
        if (window.AndroidNotificationInterface) {
            try {
                // 如果有message，合并title和message，否则只显示title
                const fullMessage = message ? `${title}: ${message}` : title;
                window.AndroidNotificationInterface.showToast(fullMessage);
            } catch (error) {
                console.error('调用Android Toast失败:', error);
            }
        } else {
            // 后备方案：如果Android接口不可用，使用console.log
            console.log('AndroidNotificationInterface不可用，使用console.log显示通知:', title, message);
        }
    }

    // 冥想模式切换
    toggleMeditationMode() {
        this.isMeditationMode = !this.isMeditationMode;

        if (this.isMeditationMode) {
            this.startMeditationMode();
        } else {
            this.stopMeditationMode();
        }
    }

    // 开始冥想模式
    startMeditationMode() {
        this.meditationModeBtn.classList.add('active');
        this.meditationModeBtn.textContent = '停止冥想';
        this.meditationStartTime = Date.now();

        // 禁用其他控制
        this.disableControls();

        // 创建冥想界面
        this.createMeditationInterface();

        // 启动白噪音
        if (!this.isWhiteNoisePlaying) {
            this.toggleWhiteNoise();
        }

        // 开始冥想计时器
        this.meditationTimer = setInterval(() => {
            this.updateMeditationTimer();
        }, 1000);

        // 成就系统：记录使用冥想功能
        this.allFeaturesUsed.add('meditation');

        // 显示开始通知
        this.showMeditationNotification('冥想开始', '专注于呼吸，放松身心');
    }

    // 停止冥想模式
    stopMeditationMode() {
        this.isMeditationMode = false;
        this.meditationModeBtn.classList.remove('active');
        this.meditationModeBtn.textContent = '开始冥想';

        // 清除计时器
        clearInterval(this.meditationTimer);
        this.meditationTimer = null;

        // 计算冥想时间（分钟）
        const meditationTimeMinutes = Math.round((Date.now() - this.meditationStartTime) / 60000);

        // 更新总冥想时间和本次冥想时间
        this.totalMeditationMinutes += meditationTimeMinutes;
        this.lastMeditationMinutes = meditationTimeMinutes;

        // 保存成就统计数据
        this.saveAchievementStats();

        // 启用其他控制
        this.enableControls();

        // 移除冥想界面
        this.removeMeditationInterface();

        // 停止白噪音
        if (this.isWhiteNoisePlaying) {
            this.toggleWhiteNoise();
        }

        // 播放结束音效
        this.playMeditationEndSound();

        // 检查成就
        this.checkAchievements();

        // 显示结束通知
        this.showMeditationNotification('冥想结束', `冥想时长: ${meditationTimeMinutes} 分钟`);
    }

    // 更新冥想计时器
    updateMeditationTimer() {
        const elapsedTime = Math.floor((Date.now() - this.meditationStartTime) / 1000);
        const remainingTime = this.meditationDuration - elapsedTime;

        // 更新显示
        if (this.meditationTimerElement) {
            this.meditationTimerElement.textContent = this.formatTime(remainingTime);
        }

        // 检查是否结束
        if (remainingTime <= 0) {
            this.endMeditation();
        }
    }

    // 结束冥想
    endMeditation() {
        // 停止冥想模式（stopMeditationMode已包含所有逻辑）
        this.stopMeditationMode();
    }

    // 格式化时间（秒 -> mm:ss）
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 创建冥想界面
    createMeditationInterface() {
        // 创建冥想容器
        this.meditationContainer = document.createElement('div');
        this.meditationContainer.className = 'meditation-container';

        // 创建渐变背景
        this.meditationGradient = document.createElement('div');
        this.meditationGradient.className = 'meditation-gradient';
        this.meditationContainer.appendChild(this.meditationGradient);

        // 创建计时器显示
        this.meditationTimerElement = document.createElement('div');
        this.meditationTimerElement.className = 'meditation-timer';
        this.meditationTimerElement.textContent = this.formatTime(this.meditationDuration);
        this.meditationContainer.appendChild(this.meditationTimerElement);

        // 创建呼吸指示器
        this.meditationBreathIndicator = document.createElement('div');
        this.meditationBreathIndicator.className = 'meditation-breath-indicator';
        this.meditationContainer.appendChild(this.meditationBreathIndicator);

        // 创建停止按钮
        this.meditationStopBtn = document.createElement('button');
        this.meditationStopBtn.className = 'meditation-stop-btn';
        this.meditationStopBtn.textContent = '停止冥想';
        this.meditationContainer.appendChild(this.meditationStopBtn);

        // 绑定停止按钮事件
        this.meditationStopBtn.addEventListener('click', () => {
            this.toggleMeditationMode();
        });

        // 添加到页面
        document.body.appendChild(this.meditationContainer);
    }

    // 移除冥想界面
    removeMeditationInterface() {
        if (this.meditationContainer) {
            this.meditationContainer.remove();
            this.meditationContainer = null;
            this.meditationTimerElement = null;
            this.meditationBreathIndicator = null;
            this.meditationGradient = null;
            this.meditationStopBtn = null;
        }
    }

    // 禁用其他控制
    disableControls() {
        this.soundSelectElement.disabled = true;
        this.themeSelectElement.disabled = true;
        this.fishStyleSelectElement.disabled = true;
        this.breathModeBtn.disabled = true;
        this.whiteNoiseToggleBtn.disabled = true;
    }

    // 启用其他控制
    enableControls() {
        this.soundSelectElement.disabled = false;
        this.themeSelectElement.disabled = false;
        this.fishStyleSelectElement.disabled = false;
        this.breathModeBtn.disabled = false;
        this.whiteNoiseToggleBtn.disabled = false;
    }

    // 显示冥想通知
    showMeditationNotification(title, message) {
        const notification = document.createElement('div');
        notification.className = 'meditation-notification';
        notification.innerHTML = `
            <div class="meditation-notification-title">${title}</div>
            <div class="meditation-notification-message">${message}</div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // 播放冥想结束音效
    playMeditationEndSound() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // 创建一个和谐的结束音效
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator1.frequency.setValueAtTime(261.63, this.audioContext.currentTime); // C4
        oscillator2.frequency.setValueAtTime(392.00, this.audioContext.currentTime); // G4

        oscillator1.type = 'sine';
        oscillator2.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 3);

        oscillator1.start(this.audioContext.currentTime);
        oscillator1.stop(this.audioContext.currentTime + 3);

        oscillator2.start(this.audioContext.currentTime);
        oscillator2.stop(this.audioContext.currentTime + 3);
    }

    // 触发振动反馈（移动端）


    // 切换成就面板显示状态
    toggleAchievementsPanel() {
        if (this.achievementsPanel.style.display === 'block') {
            this.hideAchievementsPanel();
        } else {
            this.showAchievementsPanel();
        }
    }

    // 显示成就面板
    async showAchievementsPanel() {
        this.achievementsPanel.style.display = 'flex';
        await this.generateAchievementsList();
    }

    // 隐藏成就面板
    hideAchievementsPanel() {
        this.achievementsPanel.style.display = 'none';
    }

    // 生成成就列表
    async generateAchievementsList() {
        // 清空现有内容
        this.achievementsContent.innerHTML = '';

        // 遍历所有成就，生成列表项
        for (const achievement of this.achievements) {
            const achievementItem = document.createElement('div');
            achievementItem.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;

            let achievementHTML = `
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
            `;

            // 如果是功德成就，添加额外信息
            if (achievement.id === 'merit-all') {
                const remainingTime = await this.getRemainingTime();
                achievementHTML += `
                    <div class="achievement-merit-info">
                        <div class="merit-count">当日达成次数: ${this.dailyMeritAchieveCount}</div>
                        <div class="merit-remaining">下次重置: ${remainingTime}</div>
                    </div>
                `;
            }

            achievementHTML += `
                </div>
                <div class="achievement-status">
                    ${achievement.unlocked ? '✅' : '🔒'}
                </div>
            `;

            achievementItem.innerHTML = achievementHTML;
            this.achievementsContent.appendChild(achievementItem);
        }
    }

    // 计算剩余时间
    async getRemainingTime() {
        if (!this.nextMeritResetTime) {
            return '计算中...';
        }

        // 使用最新的服务器时间计算剩余时间
        const currentTime = await this.getCurrentTime();
        const remaining = this.nextMeritResetTime.getTime() - currentTime.getTime();

        if (remaining <= 0) {
            return '即将重置';
        }

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}小时${minutes}分钟`;
    }

    handleClick(e) {
        // 如果是长按，不执行点击效果
        if (this.isLongPress) {
            return;
        }

        // 获取正确的点击坐标，同时支持鼠标和触摸事件
        let x, y;
        if (e.touches && e.touches.length > 0) {
            // 触摸事件 - touchstart, touchmove
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // 触摸事件 - touchend, touchcancel
            x = e.changedTouches[0].clientX;
            y = e.changedTouches[0].clientY;
        } else if ('clientX' in e && 'clientY' in e) {
            // 鼠标事件或自定义事件对象
            x = e.clientX;
            y = e.clientY;
        } else {
            // 无法获取坐标，使用默认值（木鱼中心）
            const rect = this.fishElement.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }

        this.playSound();
        this.updateCounter();
        this.createRipple(x, y);
        this.createParticles(x, y);

        // 触发震动反馈（已包含双重保障）
        this.vibrate();

        // 创建并触发"功德+1"文字动画
        this.createMeritText(x, y);
    }

    // 创建功德文字动画
    createMeritText(x, y) {
        const meritText = document.createElement('div');
        meritText.className = 'merit-text';
        // 随机选择一个句子
        const randomIndex = Math.floor(Math.random() * this.meritTexts.length);
        meritText.textContent = this.meritTexts[randomIndex];

        // 记录显示过的句子索引和次数
        const currentCount = this.shownMeritIndices.get(randomIndex) || 0;
        this.shownMeritIndices.set(randomIndex, currentCount + 1);
        // 保存到本地存储
        localStorage.setItem('shownMeritIndices', JSON.stringify(Object.fromEntries(this.shownMeritIndices)));

        // 设置文字位置为点击坐标
        meritText.style.left = `${x}px`;
        meritText.style.top = `${y}px`;

        // 添加到文档中
        document.body.appendChild(meritText);

        // 动画结束后移除元素，避免内存泄漏
        setTimeout(() => {
            meritText.remove();
        }, 1800); // 与CSS动画时长保持一致

        // 检查是否达成所有句子显示的成就
        this.checkAchievements();
    }

    // 保存功德成就统计数据
    saveMeritAchievementStats() {
        const stats = {
            dailyCount: this.dailyMeritAchieveCount,
            nextResetTime: this.nextMeritResetTime ? this.nextMeritResetTime.toISOString() : null
        };
        localStorage.setItem('meritAchievementStats', JSON.stringify(stats));
    }

    handleKeyPress(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!this.isLongPress) {
                const rect = this.fishElement.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                this.handleMouseDown({ clientX: x, clientY: y });
            }
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.handleMouseUp();
        }
    }

    handleMouseDown(e) {
        this.isLongPress = false;
        // 清除可能存在的旧计时器和间隔器
        clearTimeout(this.longPressTimer);
        clearInterval(this.longPressInterval);

        // 获取正确的点击坐标，同时支持鼠标和触摸事件
        let x, y;
        if (e.touches && e.touches.length > 0) {
            // 触摸事件 - touchstart, touchmove
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // 触摸事件 - touchend, touchcancel
            x = e.changedTouches[0].clientX;
            y = e.changedTouches[0].clientY;
        } else if ('clientX' in e && 'clientY' in e) {
            // 鼠标事件或自定义事件对象
            x = e.clientX;
            y = e.clientY;
        } else {
            // 无法获取坐标，使用默认值（木鱼中心）
            const rect = this.fishElement.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }

        this.longPressTimer = setTimeout(() => {
            this.isLongPress = true;
            this.startLongPress({ clientX: x, clientY: y });
        }, 300);
    }

    handleMouseUp(e) {
        clearTimeout(this.longPressTimer);
        this.stopLongPress();
    }

    handleMouseLeave(e) {
        this.handleMouseUp(e);
    }

    startLongPress(e) {
        // 确保没有重复的间隔计时器
        clearInterval(this.longPressInterval);

        // 保存点击坐标到局部变量，避免事件对象被回收后坐标丢失
        const x = e.clientX;
        const y = e.clientY;

        this.longPressInterval = setInterval(() => {
            this.playSound();
            this.updateCounter();
            this.createRipple(x, y);
            this.createParticles(x, y);
            this.vibrate();
            this.createMeritText(x, y);
        }, 150);
    }

    createParticles(x, y) {
        const particleCount = 12;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = 50 + Math.random() * 50;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;

            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);

            this.particleContainer.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 1000);
        }
    }

    toggleBreathMode() {
        this.isBreathMode = !this.isBreathMode;

        if (this.isBreathMode) {
            this.startBreathMode();
        } else {
            this.stopBreathMode();
        }
    }

    startBreathMode() {
        // 避免重复创建
        if (this.breathTimer || this.breathIndicator) return;

        this.breathModeBtn.classList.add('active');
        this.breathModeBtn.textContent = '停止引导';

        // 成就系统：增加呼吸引导使用次数
        this.breathUsageCount++;
        this.allFeaturesUsed.add('breath');

        // 保存成就统计数据
        this.saveAchievementStats();

        // 创建呼吸指示器
        this.breathIndicator = document.createElement('div');
        this.breathIndicator.className = 'breath-indicator';
        document.body.appendChild(this.breathIndicator);

        // 开始呼吸节奏
        this.breathTimer = setInterval(() => {
            this.playBreathSound();
        }, 4000); // 4秒呼吸周期

        // 检查成就
        this.checkAchievements();
    }

    stopBreathMode() {
        this.breathModeBtn.classList.remove('active');
        this.breathModeBtn.textContent = '呼吸引导';

        if (this.breathIndicator) {
            this.breathIndicator.remove();
            this.breathIndicator = null;
        }

        if (this.breathTimer) {
            clearInterval(this.breathTimer);
            this.breathTimer = null;
        }
    }

    playBreathSound() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // 吸气音效
        setTimeout(() => {
            this.playSound();
            const rect = this.fishElement.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            this.createRipple(x, y);
            this.createParticles(x, y);
        }, 0);

        // 呼气音效
        setTimeout(() => {
            this.playSound();
            const rect = this.fishElement.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            this.createRipple(x, y);
            this.createParticles(x, y);
        }, 2000);
    }

    stopLongPress() {
        clearInterval(this.longPressInterval);
        this.isLongPress = false;
    }

    playSound() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        switch (this.soundType) {
            case 'wood':
                this.playWoodSound();
                break;
            case 'bell':
                this.playBellSound();
                break;
            case 'water':
                this.playWaterSound();
                break;
            case 'chime':
                this.playChimeSound();
                break;
            default:
                this.playWoodSound();
        }
    }

    playWoodSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.2);

        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.9, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.03, this.audioContext.currentTime + 0.2);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    playBellSound() {
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator1.frequency.setValueAtTime(440, this.audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.3);

        oscillator2.frequency.setValueAtTime(880, this.audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.3);

        oscillator1.type = 'sine';
        oscillator2.type = 'sine';

        gainNode.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.03, this.audioContext.currentTime + 0.3);

        oscillator1.start(this.audioContext.currentTime);
        oscillator1.stop(this.audioContext.currentTime + 0.3);
        oscillator2.start(this.audioContext.currentTime);
        oscillator2.stop(this.audioContext.currentTime + 0.3);
    }

    playWaterSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.15);

        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.75, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.015, this.audioContext.currentTime + 0.15);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    playChimeSound() {
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator1.frequency.setValueAtTime(523, this.audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(261, this.audioContext.currentTime + 0.4);

        oscillator2.frequency.setValueAtTime(659, this.audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(329, this.audioContext.currentTime + 0.4);

        oscillator1.type = 'triangle';
        oscillator2.type = 'triangle';

        gainNode.gain.setValueAtTime(0.85, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.03, this.audioContext.currentTime + 0.4);

        oscillator1.start(this.audioContext.currentTime);
        oscillator1.stop(this.audioContext.currentTime + 0.4);
        oscillator2.start(this.audioContext.currentTime);
        oscillator2.stop(this.audioContext.currentTime + 0.4);
    }

    updateCounter() {
        this.counter++;
        this.counterElement.textContent = this.counter;

        // 更新连续点击计数
        this.consecutiveCount++;
        if (this.consecutiveCountElement) {
            this.consecutiveCountElement.textContent = this.consecutiveCount;
        }

        // 更新今日次数
        this.todayCount++;
        this.todayCountElement.textContent = this.todayCount;
        this.saveStats();

        // 重置连续点击计时器
        clearTimeout(this.consecutiveTimer);
        this.consecutiveTimer = setTimeout(() => {
            this.resetConsecutiveCount();
        }, 2000); // 2秒内无点击则重置连续计数

        // 检查连击特效触发条件
        this.checkComboEffect();

        // 检查成就解锁条件
        this.checkAchievements();

        // 点击次数在本地保存，由定时任务上传
        // this.callBackendAPI('/hit', 'POST', { count: 1 });
    }

    resetConsecutiveCount() {
        this.consecutiveCount = 0;
        this.consecutiveCountElement.textContent = this.consecutiveCount;
        this.triggeredComboLevels = []; // 清空已触发的连击等级列表
    }

    // 检查连击特效
    checkComboEffect() {
        const comboLevels = [10, 25, 50, 100];

        // 检查每个连击等级，确保只触发一次
        comboLevels.forEach(level => {
            if (this.consecutiveCount >= level && !this.triggeredComboLevels.includes(level)) {
                this.triggeredComboLevels.push(level);
                this.createComboEffect(level);
                this.playComboSound(level);
            }
        });
    }

    // 创建连击特效
    createComboEffect(level) {
        const rect = this.fishElement.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // 根据不同连击等级创建不同特效
        switch(level) {
            case 10:
                this.createComboParticles(x, y, 20, 'gold');
                break;
            case 25:
                this.createComboParticles(x, y, 30, 'purple');
                this.createRippleBurst(x, y);
                break;
            case 50:
                this.createComboParticles(x, y, 40, 'cyan');
                this.createRippleBurst(x, y);
                this.flashScreen();
                break;
            case 100:
                this.createComboParticles(x, y, 50, 'pink');
                this.createRippleBurst(x, y, 3);
                this.flashScreen();
                this.showComboText(level);
                break;
        }
    }

    // 创建连击粒子效果
    createComboParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle combo-particle';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            const angle = (Math.PI * 2 * i) / count;
            const distance = 80 + Math.random() * 40;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;

            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);
            particle.style.setProperty('--color', color);

            this.particleContainer.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 1500);
        }
    }

    // 创建波纹爆发效果
    createRippleBurst(x, y, count = 2) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.createRipple(x, y);
            }, i * 100);
        }
    }

    // 创建波纹效果
    createRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        this.rippleContainer.appendChild(ripple);

        // 动画结束后移除元素
        setTimeout(() => {
            ripple.remove();
        }, 1000);
    }

    // 屏幕闪烁效果
    flashScreen() {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.remove();
        }, 300);
    }

    // 显示连击文字
    showComboText(level) {
        const comboText = document.createElement('div');
        comboText.className = 'combo-text';
        comboText.textContent = `${level} COMBO!`;
        document.body.appendChild(comboText);

        setTimeout(() => {
            comboText.remove();
        }, 1500);
    }

    // 播放连击音效
    playComboSound(level) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // 根据不同连击等级创建不同音效
        switch(level) {
            case 10:
                this.playWoodSound();
                break;
            case 25:
                this.playBellSound();
                break;
            case 50:
                this.playChimeSound();
                break;
            case 100:
                this.playBellSound();
                setTimeout(() => {
                    this.playChimeSound();
            }, 100);
        }
    }

    // 初始化音乐播放器
    initMusicPlayer() {
        // 创建音频对象
        this.musicAudio = new Audio();
        this.musicAudio.loop = true; // 循环播放

        // 调试信息
        console.log('初始化音乐播放器');
        console.log('当前音乐索引:', this.currentMusicIndex);
        console.log('音乐列表:', this.musicList);

        // 加载默认音乐
        this.loadMusic(this.currentMusicIndex);

        // 更新音乐标题
        if (this.musicTitleElement) {
            this.musicTitleElement.textContent = this.musicList[this.currentMusicIndex].title;
        }

        // 事件监听器
        this.musicAudio.addEventListener('timeupdate', () => this.updateMusicProgress());
        this.musicAudio.addEventListener('loadedmetadata', () => {
            this.updateMusicDuration();
        });

        // 添加页面加载完成事件监听器
        window.addEventListener('load', () => {
            console.log('页面加载完成，尝试播放音乐');
            this.tryPlayMusic();
        });

        // 尝试播放音乐的方法
        this.tryPlayMusic = () => {
            // 只有在自动播放开启时才尝试播放
            if (!this.isAutoPlayEnabled) {
                console.log('自动播放已关闭，不自动播放音乐');
                return;
            }

            // 尝试播放
            this.musicAudio.play().then(() => {
                // 播放成功
                console.log('播放成功');
                this.isMusicPlaying = true;
                if (this.musicPlayPauseBtn) {
                    this.musicPlayPauseBtn.textContent = '⏸';
                }
                // 启动音乐播放时长计时
                this.startMusicTimeCounting();
            }).catch((e) => {
                // 播放失败
                console.error('播放失败:', e);
                this.isMusicPlaying = false;
                if (this.musicPlayPauseBtn) {
                    this.musicPlayPauseBtn.textContent = '▶';
                }

                // 添加全局用户交互事件监听器
                const handleUserInteraction = () => {
                    console.log('用户交互，尝试播放音乐');
                    this.musicAudio.play().then(() => {
                        this.isMusicPlaying = true;
                        if (this.musicPlayPauseBtn) {
                            this.musicPlayPauseBtn.textContent = '⏸';
                        }
                        // 启动音乐播放时长计时
                        this.startMusicTimeCounting();
                    }).catch((e) => {
                        console.error('用户交互后播放失败:', e);
                    });

                    // 移除所有用户交互事件监听器
                    document.removeEventListener('click', handleUserInteraction);
                    document.removeEventListener('touchstart', handleUserInteraction);
                    document.removeEventListener('keydown', handleUserInteraction);
                    document.removeEventListener('mousedown', handleUserInteraction);
                    document.removeEventListener('mouseup', handleUserInteraction);
                    document.removeEventListener('touchmove', handleUserInteraction);
                };

                // 添加多种用户交互事件监听器
                document.addEventListener('click', handleUserInteraction);
                document.addEventListener('touchstart', handleUserInteraction);
                document.addEventListener('keydown', handleUserInteraction);
                document.addEventListener('mousedown', handleUserInteraction);
                document.addEventListener('mouseup', handleUserInteraction);
                document.addEventListener('touchmove', handleUserInteraction);
            });
        };

        // 立即尝试播放（不延迟）
        this.tryPlayMusic();
        this.musicAudio.addEventListener('error', (e) => {
            console.error('音乐加载失败:', e);
            console.error('音频错误信息:', this.musicAudio.error);
        });

        // 添加更多调试事件监听器
        this.musicAudio.addEventListener('loadstart', () => {
            console.log('开始加载音频');
        });

        this.musicAudio.addEventListener('loadeddata', () => {
            console.log('音频数据加载完成');
        });

        this.musicAudio.addEventListener('canplaythrough', () => {
            console.log('音频可以播放');
        });

        this.musicAudio.addEventListener('play', () => {
            console.log('音频开始播放');
            this.isMusicPlaying = true;
        });

        this.musicAudio.addEventListener('pause', () => {
            console.log('音频暂停');
            this.isMusicPlaying = false;
        });

        this.musicAudio.addEventListener('ended', () => {
            console.log('音频播放结束');
        });
    }

    // 初始化音乐播放时长上传定时器（独立运行，不受播放状态影响）
    initMusicTimeUpload() {
        // 如果上传定时器已经在运行，就不再创建
        if (this.uploadInterval) return;

        // 开始上传定时器（每60秒上传一次）
        this.uploadInterval = setInterval(() => {
            this.uploadCurrentMusicTime();
        }, 60000); // 60秒 = 1分钟

        console.log('音乐播放时长上传定时器已初始化并启动');
    }

    // 开始记录音乐播放时长（只控制计时，不控制上传）
    startMusicTimeCounting() {
        if (this.isCountingMusicTime) return;

        this.isCountingMusicTime = true;

        // 开始计时定时器
        this.musicTimeInterval = setInterval(() => {
            // 检查是否有音乐或白噪音在播放
            if (this.isMusicPlaying || this.isWhiteNoisePlaying) {
                this.musicPlayTime++;
            }
        }, 1000);

        console.log('音乐播放时长计时已启动');
    }

    // 停止记录音乐播放时长（只控制计时，不控制上传）
    stopMusicTimeCounting() {
        if (!this.isCountingMusicTime) return;

        this.isCountingMusicTime = false;

        // 清除计时定时器
        if (this.musicTimeInterval) {
            clearInterval(this.musicTimeInterval);
            this.musicTimeInterval = null;
        }

        console.log('音乐播放时长计时已停止');
    }

    // 上传当前分钟的音乐播放时长
    uploadCurrentMusicTime() {
        // 记录当前时间，用于调试
        const now = new Date();
        console.log('上传检查时间:', now.toLocaleTimeString(), '当前播放时长:', this.musicPlayTime);

        // 如果当前分钟有播放时长，就上传
        if (this.musicPlayTime > 0) {
            this.uploadMusicTime();
        } else {
            console.log('当前分钟没有播放音乐，不需要上传');
        }

        // 重置本地计时，开始记录新分钟的播放时长
        this.musicPlayTime = 0;
    }

    // 停止音乐播放时长上传定时器（仅在应用关闭时调用）
    stopMusicTimeUpload() {
        if (this.uploadInterval) {
            clearInterval(this.uploadInterval);
            this.uploadInterval = null;
            console.log('音乐播放时长上传定时器已停止');
        }
    }

    // 上传音乐播放时长到后端服务器
    uploadMusicTime() {
        // 只上传当前分钟内增加的播放时长
        const uploadTime = this.musicPlayTime;

        // 如果没有播放时长，就不上传
        if (uploadTime <= 0) {
            console.log('当前分钟没有播放音乐，不需要上传');
            return;
        }

        // 使用callBackendAPI方法上传音乐播放时长，确保包含用户名
        this.callBackendAPI('/music-time', 'POST', {
            time: uploadTime,
            timestamp: Date.now()
        })
        .then(data => {
            if (data) {
                console.log('音乐播放时长上传成功:', data);
            } else {
                console.error('音乐播放时长上传失败: 未获取到数据');
            }
        })
        .catch(error => {
            console.error('音乐播放时长上传失败:', error);
        });
    }

    // 加载音乐
    loadMusic(index) {
        const music = this.musicList[index];
        if (music && this.musicAudio) {
            console.log('加载音乐:', music.title, '路径:', music.src);
            this.musicAudio.src = music.src;
            this.currentMusicIndex = index;

            // 更新音乐标题
            if (this.musicTitleElement) {
                this.musicTitleElement.textContent = music.title;
            }
        }
    }

    // 切换音乐播放/暂停
    toggleMusicPlayPause() {
        if (!this.musicAudio) return;

        if (this.isMusicPlaying) {
            this.musicAudio.pause();
            this.musicPlayPauseBtn.textContent = '▶';
        } else {
            this.musicAudio.play().catch((e) => {
                console.error('音乐播放失败:', e);
            });
            this.musicPlayPauseBtn.textContent = '⏸';
            // 开始计时
            this.startMusicTimeCounting();
        }
        this.isMusicPlaying = !this.isMusicPlaying;

        // 检查是否需要停止计时
        if (!this.isMusicPlaying && !this.isWhiteNoisePlaying) {
            this.stopMusicTimeCounting();
        }
    }

    // 切换音乐静音
    toggleMusicMute() {
        if (!this.musicAudio) return;

        this.isMusicMuted = !this.isMusicMuted;
        this.musicAudio.muted = this.isMusicMuted;

        if (this.isMusicMuted) {
            this.musicMuteBtn.textContent = '🔇';
        } else {
            this.musicMuteBtn.textContent = '🔊';
        }
    }

    // 切换自动播放功能
    toggleAutoPlay() {
        this.isAutoPlayEnabled = !this.isAutoPlayEnabled;

        // 更新按钮文本
        if (this.autoPlayToggleBtn) {
            this.autoPlayToggleBtn.textContent = this.isAutoPlayEnabled ? '自动播放：开' : '自动播放：关';
        }

        // 显示toast提示
        this.showToast(this.isAutoPlayEnabled ? '已开启自动播放' : '已关闭自动播放');

        // 保存自动播放状态到本地存储
        localStorage.setItem('isAutoPlayEnabled', this.isAutoPlayEnabled);

        console.log('自动播放状态:', this.isAutoPlayEnabled ? '开启' : '关闭');
    }

    // 显示toast提示
    showToast(message) {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        // 设置样式
        toast.style.position = 'fixed';
        toast.style.bottom = '150px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(0, 0, 0, 0.8)';
        toast.style.color = 'white';
        toast.style.padding = '8px 16px';
        toast.style.borderRadius = '20px';
        toast.style.fontSize = '14px';
        toast.style.zIndex = '9999';
        toast.style.transition = 'opacity 0.3s ease';

        // 添加到页面
        document.body.appendChild(toast);

        // 2秒后自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    // 显示留言对话框
    showMessageDialog() {
        const messageDialog = document.getElementById('messageDialog');
        if (messageDialog) {
            messageDialog.classList.add('active');
        }
    }

    // 隐藏留言对话框
    hideMessageDialog() {
        const messageDialog = document.getElementById('messageDialog');
        if (messageDialog) {
            messageDialog.classList.remove('active');
        }
        // 清空文本框内容
        const messageTextarea = document.getElementById('messageTextarea');
        if (messageTextarea) {
            messageTextarea.value = '';
        }
    }

    // 提交留言
    submitMessage() {
        const messageTextarea = document.getElementById('messageTextarea');
        if (!messageTextarea) return;

        const message = messageTextarea.value.trim();
        if (!message) {
            this.showToast('请输入留言内容');
            return;
        }

        // 保存留言到本地存储
        this.saveMessage(message);

        // 显示成功提示
        this.showToast('留言提交成功，感谢你的反馈！');

        // 隐藏对话框并清空内容
        this.hideMessageDialog();
    }

    // 保存留言到本地存储
    saveMessage(message) {
        const messages = JSON.parse(localStorage.getItem('cyberMuYuMessages') || '[]');
        messages.push({
            id: Date.now(),
            content: message,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('cyberMuYuMessages', JSON.stringify(messages));
    }

    // 跳转到指定位置
    seekMusic(e) {
        if (!this.musicAudio || !this.musicProgressContainer) return;

        const rect = this.musicProgressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const seekTime = pos * this.musicAudio.duration;
        this.musicAudio.currentTime = seekTime;
    }

    // 更新音乐进度条
    updateMusicProgress() {
        if (!this.musicAudio || !this.musicProgress) return;

        const progress = (this.musicAudio.currentTime / this.musicAudio.duration) * 100;
        this.musicProgress.style.width = progress + '%';

        // 更新当前时间
        this.currentTimeElement.textContent = this.formatTime(this.musicAudio.currentTime);
    }

    // 更新音乐总时长
    updateMusicDuration() {
        if (!this.musicAudio || !this.totalTimeElement) return;

        this.totalTimeElement.textContent = this.formatTime(this.musicAudio.duration);
    }

    // 格式化时间
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // 显示音乐选择对话框
    showMusicSelector() {
        this.musicSelectorDialog.classList.add('active');
        this.renderMusicSelectorList();
    }

    // 隐藏音乐选择对话框
    hideMusicSelector() {
        this.musicSelectorDialog.classList.remove('active');
    }

    // 渲染音乐选择列表
    renderMusicSelectorList() {
        if (!this.musicSelectorList) return;

        // 清空列表
        this.musicSelectorList.innerHTML = '';

        // 添加音乐列表项
        this.musicList.forEach((music, index) => {
            const li = document.createElement('li');
            li.className = `music-selector-item ${index === this.currentMusicIndex ? 'selected' : ''}`;
            li.dataset.index = index;

            const titleSpan = document.createElement('span');
            titleSpan.className = 'music-selector-item-title';
            titleSpan.textContent = music.title;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'music-selector-item-icon';
            iconSpan.textContent = index === this.currentMusicIndex ? '✓' : '';

            li.appendChild(titleSpan);
            li.appendChild(iconSpan);

            // 添加点击事件
            li.addEventListener('click', () => this.selectMusic(index));

            this.musicSelectorList.appendChild(li);
        });
    }

    // 选择音乐
    selectMusic(index) {
        // 保存当前播放状态
        const wasPlaying = this.isMusicPlaying;

        // 加载新音乐
        this.loadMusic(index);

        // 根据保存的播放状态处理新音乐
        if (wasPlaying) {
            // 如果之前是播放状态，立即播放新音乐
            this.musicAudio.play().catch((e) => {
                console.error('播放失败:', e);
                // 播放失败时，更新状态为暂停
                this.isMusicPlaying = false;
                if (this.musicPlayPauseBtn) {
                    this.musicPlayPauseBtn.textContent = '▶';
                }
            });
            // 保持播放状态标记为true
            this.isMusicPlaying = true;
            if (this.musicPlayPauseBtn) {
                this.musicPlayPauseBtn.textContent = '⏸';
            }
        } else {
            // 如果之前是暂停状态，保持暂停
            this.isMusicPlaying = false;
            if (this.musicPlayPauseBtn) {
                this.musicPlayPauseBtn.textContent = '▶';
            }
        }

        // 更新音乐标题
        if (this.musicTitleElement) {
            this.musicTitleElement.textContent = this.musicList[this.currentMusicIndex].title;
        }

        // 隐藏对话框
        this.hideMusicSelector();

        // 重新渲染列表以更新选中状态
        this.renderMusicSelectorList();
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 将CyberMuYu对象赋值给全局变量，以便Android端调用
    window.cyberMuYu = new CyberMuYu();
});