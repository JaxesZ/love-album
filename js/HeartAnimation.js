/**
 * HeartAnimation - 爱心动画类
 * 负责生成和管理背景飘落的爱心动画
 */
class HeartAnimation {
    constructor(container) {
        this.container = container;
        this.hearts = [];
        this.maxHearts = 20; // 同时存在的最大爱心数量
        this.isRunning = false;
        this.generationInterval = null;
        this.generationDelay = 800; // 生成新爱心的间隔（毫秒）
        this.heartColors = ['pink', 'red', 'light']; // 爱心颜色变体
    }

    /**
     * 启动动画
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.generationInterval = setInterval(() => {
            this.generateHeart();
        }, this.generationDelay);
        
        // 立即生成几个爱心
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.generateHeart(), i * 200);
        }
        
        console.log('爱心动画已启动');
    }

    /**
     * 停止动画
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.generationInterval) {
            clearInterval(this.generationInterval);
            this.generationInterval = null;
        }
        
        // 清除所有爱心
        this.hearts.forEach(heart => {
            if (heart.element && heart.element.parentNode) {
                heart.element.remove();
            }
        });
        this.hearts = [];
        
        console.log('爱心动画已停止');
    }

    /**
     * 生成一个爱心
     */
    generateHeart() {
        // 检查数量限制
        if (this.hearts.length >= this.maxHearts) {
            // 移除最老的爱心
            const oldHeart = this.hearts.shift();
            if (oldHeart && oldHeart.element && oldHeart.element.parentNode) {
                oldHeart.element.remove();
            }
        }
        
        // 创建爱心元素
        const heart = document.createElement('div');
        heart.className = 'heart falling';
        
        // 随机颜色
        const color = this.heartColors[Math.floor(Math.random() * this.heartColors.length)];
        heart.classList.add(color);
        
        // 随机参数
        const size = this.randomRange(15, 30); // 爱心大小
        const startX = this.randomRange(0, 100); // 起始水平位置（百分比）
        const duration = this.randomRange(6, 10); // 飘落时长（秒）
        const delay = this.randomRange(0, 2); // 延迟（秒）
        const swingX = this.randomRange(-50, 50); // 水平摆动距离
        const rotate = this.randomRange(0, 720); // 旋转角度
        
        // 应用样式
        heart.style.left = `${startX}%`;
        heart.style.width = `${size}px`;
        heart.style.height = `${size}px`;
        heart.style.setProperty('--duration', `${duration}s`);
        heart.style.setProperty('--delay', `${delay}s`);
        heart.style.setProperty('--swing-x', `${swingX}px`);
        heart.style.setProperty('--rotate', `${rotate}deg`);
        
        // 添加到容器
        this.container.appendChild(heart);
        
        // 记录爱心
        const heartData = {
            element: heart,
            createdTime: Date.now()
        };
        this.hearts.push(heartData);
        
        // 动画结束后移除
        const totalDuration = (duration + delay) * 1000;
        setTimeout(() => {
            this.removeHeart(heartData);
        }, totalDuration);
    }

    /**
     * 移除爱心
     * @param {Object} heartData - 爱心数据对象
     */
    removeHeart(heartData) {
        const index = this.hearts.indexOf(heartData);
        if (index !== -1) {
            this.hearts.splice(index, 1);
        }
        
        if (heartData.element && heartData.element.parentNode) {
            heartData.element.remove();
        }
    }

    /**
     * 生成随机数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机数
     */
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * 设置生成速度
     * @param {string} speed - 速度等级 ('slow', 'normal', 'fast')
     */
    setSpeed(speed) {
        const speedMap = {
            slow: 1200,
            normal: 800,
            fast: 400
        };
        
        this.generationDelay = speedMap[speed] || 800;
        
        // 如果正在运行，重启以应用新速度
        if (this.isRunning) {
            const wasRunning = this.isRunning;
            this.stop();
            if (wasRunning) {
                this.start();
            }
        }
        
        console.log(`爱心生成速度已设置为: ${speed} (${this.generationDelay}ms)`);
    }

    /**
     * 设置最大爱心数量
     * @param {number} count - 最大数量
     */
    setMaxHearts(count) {
        this.maxHearts = Math.max(5, Math.min(50, count));
        console.log(`最大爱心数量已设置为: ${this.maxHearts}`);
    }

    /**
     * 立即生成一批爱心
     * @param {number} count - 生成数量
     */
    burst(count = 5) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.generateHeart();
            }, i * 100);
        }
    }

    /**
     * 清除所有爱心（不停止动画）
     */
    clear() {
        this.hearts.forEach(heart => {
            if (heart.element && heart.element.parentNode) {
                heart.element.remove();
            }
        });
        this.hearts = [];
    }

    /**
     * 获取当前爱心数量
     * @returns {number} 当前爱心数量
     */
    getHeartCount() {
        return this.hearts.length;
    }

    /**
     * 检查动画是否正在运行
     * @returns {boolean} 是否正在运行
     */
    isAnimating() {
        return this.isRunning;
    }

    /**
     * 切换动画状态
     */
    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
}
