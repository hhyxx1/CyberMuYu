// 赛博木鱼主类
class CyberMuYu {
    constructor() {
        this.counter = 0;
        this.audioContext = null;
        this.soundType = 'wood';
        this.init();
    }

    init() {
        try {
            console.log('Initializing CyberMuYu app...');
            
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
            
            // 调试：检查关键元素是否存在
            console.log('DOM元素获取结果:');
            console.log('counterElement:', this.counterElement);
            console.log('fishElement:', this.fishElement);
            console.log('rippleContainer:', this.rippleContainer);
            console.log('particleContainer:', this.particleContainer);
            console.log('soundSelectElement:', this.soundSelectElement);
            console.log('themeSelectElement:', this.themeSelectElement);
            console.log('whiteNoiseToggleBtn:', this.whiteNoiseToggleBtn);
            console.log('customMusicBtn:', this.customMusicBtn);
            console.log('restoreDefaultMusicBtn:', this.restoreDefaultMusicBtn);
            this.breathModeBtn = document.getElementById('breathMode');
            this.achievementsBtn = document.getElementById('achievementsBtn');
            this.achievementsPanel = document.getElementById('achievementsPanel');
            this.achievementsContent = document.getElementById('achievementsContent');
            this.achievementsClose = document.getElementById('achievementsClose');
            this.meditationModeBtn = document.getElementById('meditationMode');
            this.meditationDurationSelect = document.getElementById('meditationDuration');
            this.customDurationInput = document.getElementById('customDuration');
            this.customDurationBtn = document.getElementById('customDurationBtn');
            this.consecutiveCountElement = document.getElementById('consecutiveCount');
            this.todayCountElement = document.getElementById('todayCount');
            
            console.log('DOM elements loaded successfully');
            
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
            this.isWhiteNoisePlaying = false;
            this.whiteNoiseAudio = null;
            this.customMusicUri = null; // 自定义音乐文件URI
            this.customMusicName = null; // 自定义音乐名称
            this.fishStyle = 'cyber'; // 默认木鱼样式
            
            // 添加事件监听器，监听键盘返回键
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' || e.keyCode === 27) {
                    this.handleBackKey();
                }
            });
            
            // 成就系统相关状态变量
            this.breathUsageCount = 0;
            this.totalMeditationMinutes = 0;
            this.whiteNoiseActivationCount = 0;
            this.allFeaturesUsed = new Set();
            this.lastMeditationMinutes = 0; // 记录本次冥想时长（分钟）
            
            // 从本地存储加载成就统计数据
            this.loadAchievementStats();
            
            console.log('State variables initialized');
            
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
            
            console.log('CyberMuYu app initialized successfully!');
        } catch (error) {
            console.error('Error during initialization:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                line: error.lineNumber,
                column: error.columnNumber
            });
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
            if (this.todayCountElement) {
            this.todayCountElement.textContent = this.todayCount;
        }
        }
        
        // 保存到本地存储
        this.saveStats();
    }

    // 成就系统初始化
    initAchievements() {
        // 定义成就列表
        this.achievements = [
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
                this.deviceMotionX = e.gamma || 0;
                this.deviceMotionY = e.beta || 0;
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

    // 检查成就
    checkAchievements() {
        // 检查连续点击成就
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked) {
                let unlocked = false;
                
                switch(achievement.condition.type) {
                    case 'consecutive':
                        unlocked = this.consecutiveCount >= achievement.condition.value;
                        break;
                    case 'total':
                        unlocked = this.counter >= achievement.condition.value;
                        break;
                    case 'daily':
                        unlocked = this.todayCount >= achievement.condition.value;
                        break;
                    case 'themes':
                        unlocked = this.experiencedThemes.size >= achievement.condition.value;
                        break;
                    case 'sounds':
                        unlocked = this.experiencedSounds.size >= achievement.condition.value;
                        break;
                    case 'breath':
                        unlocked = this.breathUsageCount >= achievement.condition.value;
                        break;
                    case 'meditation':
                        // 单次冥想达到指定分钟数
                        unlocked = this.lastMeditationMinutes >= achievement.condition.value;
                        break;
                    case 'meditation-total':
                        unlocked = this.totalMeditationMinutes >= achievement.condition.value;
                        break;
                    case 'white-noise':
                        unlocked = this.whiteNoiseActivationCount >= achievement.condition.value;
                        break;
                    case 'all-features':
                        unlocked = this.allFeaturesUsed.size >= achievement.condition.value;
                        break;
                }
                
                if (unlocked) {
                    this.unlockAchievement(achievement);
                    // 保存成就统计数据
                    this.saveAchievementStats();
                }
            }
        });
    }

    // 解锁成就
    unlockAchievement(achievement) {
        achievement.unlocked = true;
        this.saveAchievements();
        this.showAchievementNotification(achievement);
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
        } else {
            // 停止白噪音
            this.stopWhiteNoise();
            this.whiteNoiseToggleBtn.classList.remove('active');
            this.whiteNoiseToggleBtn.textContent = '白噪音';
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
        let audioSrc = '1.aac';
        
        // 如果有自定义音乐，使用自定义音乐
        if (this.customMusicUri) {
            audioSrc = this.customMusicUri;
            console.log('使用自定义音乐:', audioSrc);
        } else {
            console.log('使用默认白噪音');
        }
        
        this.whiteNoiseAudio = new Audio(audioSrc);
        // 启用loop属性，实现循环播放
        this.whiteNoiseAudio.loop = true;
        this.whiteNoiseAudio.volume = 1.0;
        this.whiteNoiseAudio.preload = 'auto';
        
        // 监听音频加载完成事件，获取真实时长
        this.whiteNoiseAudio.addEventListener('loadedmetadata', () => {
            // 获取音频的真实时长
            let duration = this.whiteNoiseAudio.duration;
            console.log('音频加载完成，真实时长:', duration);
            
            // 确保获取到有效的时长
            if (isNaN(duration) || duration <= 0) {
                duration = 5299; // 默认1小时28分19秒
                console.log('时长无效，使用默认值:', duration);
            }
            
            // 通知Android端音频时长
            if (window.AndroidWhiteNoiseInterface) {
                try {
                    console.log('通知Android端时长:', duration);
                    window.AndroidWhiteNoiseInterface.onWhiteNoiseDurationChanged(duration);
                } catch (error) {
                    console.error('Error calling Android interface:', error);
                }
            }
        });
        
        // 监听play事件，确保在播放开始时再次通知时长
        this.whiteNoiseAudio.addEventListener('play', () => {
            let duration = this.whiteNoiseAudio.duration;
            if (isNaN(duration) || duration <= 0) {
                duration = 5299; // 默认1小时28分19秒
            }
            console.log('播放开始，通知Android端时长:', duration);
            if (window.AndroidWhiteNoiseInterface) {
                try {
                    window.AndroidWhiteNoiseInterface.onWhiteNoiseDurationChanged(duration);
                } catch (error) {
                    console.error('Error calling Android interface:', error);
                }
            }
        });
        
        // 监听播放进度变化
        this.whiteNoiseAudio.addEventListener('timeupdate', () => {
            let currentTime = this.whiteNoiseAudio.currentTime;
            let duration = this.whiteNoiseAudio.duration;
            
            // 确保获取到有效的时长
            if (isNaN(duration) || duration <= 0) {
                duration = 5299; // 默认1小时28分19秒
            }
            
            // 循环播放时，不需要检查currentTime是否超过duration
            // 因为loop属性会自动处理循环
            
            console.log('当前播放时间:', currentTime, '/', duration);
            // 通知Android端当前播放位置
            if (window.AndroidWhiteNoiseInterface) {
                try {
                    window.AndroidWhiteNoiseInterface.onWhiteNoiseCurrentTimeChanged(currentTime);
                } catch (error) {
                    console.error('Error calling Android interface:', error);
                }
            }
        });
        
        // 监听ended事件，循环播放时ended事件可能不会触发
        // 如果触发，不需要做任何事情，因为loop=true会自动循环
        
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
    triggerVibration() {
        // 检查设备是否支持振动API
        if ('vibrate' in navigator) {
            // 触发短振动
            navigator.vibrate(30); // 振动30毫秒
        }
    }

    // 切换成就面板显示状态
    toggleAchievementsPanel() {
        if (this.achievementsPanel.style.display === 'block') {
            this.hideAchievementsPanel();
        } else {
            this.showAchievementsPanel();
        }
    }

    // 显示成就面板
    showAchievementsPanel() {
        this.achievementsPanel.style.display = 'flex';
        this.generateAchievementsList();
    }

    // 隐藏成就面板
    hideAchievementsPanel() {
        this.achievementsPanel.style.display = 'none';
    }

    // 生成成就列表
    generateAchievementsList() {
        // 清空现有内容
        this.achievementsContent.innerHTML = '';
        
        // 遍历所有成就，生成列表项
        this.achievements.forEach(achievement => {
            const achievementItem = document.createElement('div');
            achievementItem.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            
            achievementItem.innerHTML = `
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
                <div class="achievement-status">
                    ${achievement.unlocked ? '✅' : '🔒'}
                </div>
            `;
            
            this.achievementsContent.appendChild(achievementItem);
        });
    }

    handleClick(e) {
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
        this.triggerVibration();
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
    }

    resetConsecutiveCount() {
        this.consecutiveCount = 0;
        this.consecutiveCountElement.textContent = this.consecutiveCount;
    }

    // 检查连击特效
    checkComboEffect() {
        const comboLevels = [10, 25, 50, 100];
        const comboLevel = comboLevels.find(level => this.consecutiveCount === level);
        
        if (comboLevel) {
            this.createComboEffect(comboLevel);
            this.playComboSound(comboLevel);
        }
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
                break;
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 将CyberMuYu对象赋值给全局变量，以便Android端调用
    window.cyberMuYu = new CyberMuYu();
});