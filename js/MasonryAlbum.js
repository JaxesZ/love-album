/**
 * MasonryAlbum - 瀑布流相册类
 *
 * 实现：逐列独立循环 + 整体旋转
 * - inner 内部横向排列 N 个 .masonry-col，每列是一条长长的照片列表
 * - 每列独立维护 offsetY，沿 Y 轴负向平移，到达"一个循环单元高度"时重置
 * - 外层 track 旋转 --flow-angle，使纵向滚动呈现为斜向流动
 * - 砖墙错位：奇数列的初始 offsetY 比偶数列额外多偏移半张高度
 */
class MasonryAlbum {
    constructor(container, photos = []) {
        this.container = container;
        this.photos = photos;
        this.columnCount = this.getColumnCount();
        this.onPhotoClick = null;
        this.resizeTimer = null;

        // 自动滚动相关
        this.autoScroll = true;          // 是否启用自动滚动
        this.scrollSpeed = 0.4;          // 每帧位移（像素），值越大越快
        this.rafId = null;
        this.isPaused = false;

        // 列相关运行时数据
        this.columns = [];               // 每项: { el, offsetY, cycleHeight }
        this.cardSize = { w: 0, h: 0, gap: 0 };

        // DOM 层
        this.track = null;
        this.inner = null;
        this.viewport = null;

        this.init();
        this.bindEvents();
    }

    /**
     * 初始化：构建 viewport > track（旋转层）> inner（容器层）
     */
    init() {
        this.container.innerHTML = '';
        this.container.classList.add('masonry-scroll-viewport');
        this.viewport = this.container;

        this.track = document.createElement('div');
        this.track.className = 'masonry-scroll-track';

        this.inner = document.createElement('div');
        this.inner.className = 'masonry-scroll-inner';

        this.track.appendChild(this.inner);
        this.viewport.appendChild(this.track);

        this.render();
    }

    /**
     * 监听窗口尺寸变化 + 鼠标悬浮暂停
     */
    bindEvents() {
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                const newCount = this.getColumnCount();
                if (newCount !== this.columnCount) {
                    this.columnCount = newCount;
                    this.render();
                } else {
                    this.measureColumns();
                }
            }, 200);
        });

        // 悬浮 / 触摸时暂停，方便用户点击查看
        this.viewport.addEventListener('mouseenter', () => { this.isPaused = true; });
        this.viewport.addEventListener('mouseleave', () => { this.isPaused = false; });
        this.viewport.addEventListener('touchstart', () => { this.isPaused = true; }, { passive: true });
        this.viewport.addEventListener('touchend', () => {
            setTimeout(() => { this.isPaused = false; }, 1500);
        });

        // 页面不可见时停止动画，节省性能
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopLoop();
            } else if (this.autoScroll && this.photos.length > 0) {
                this.startLoop();
            }
        });
    }

    /**
     * 根据屏幕宽度计算列数
     */
    getColumnCount() {
        const width = window.innerWidth;
        if (width < 480) return 6;
        if (width < 768) return 7;
        if (width < 1024) return 8;
        return 10;
    }

    /**
     * 计算每列需要放多少张照片
     * 需要保证：
     *   1. "一个循环单元高度" 远超视口对角线（避免重置被看到）
     *   2. 是 photos.length 的整数倍（循环重置时序列无缝衔接）
     *   3. 至少 photos.length * 2，让用户滚动看到的内容富有变化
     */
    getPhotosPerColumn() {
        const cardH = this.getCardSize().h;
        const gap = this.getCardSize().gap;
        const cardUnit = cardH + gap;
        const viewportH = this.viewport.clientHeight || 600;
        const viewportW = this.viewport.clientWidth || 1080;
        const photoCount = Math.max(1, this.photos.length);

        // 旋转后需要覆盖的纵向距离（保守估计为对角线长度）
        const needCover = Math.sqrt(viewportH * viewportH + viewportW * viewportW);
        // 至少需要 needCover * 2 的列高度（一份循环单元 + 视口余量）
        const minByViewport = Math.ceil((needCover * 2) / cardUnit);
        // 保底：至少 photoCount * 2，且不少于 12
        const minCount = Math.max(minByViewport, photoCount * 2, 12);
        // 向上取整到 photoCount 的整数倍，保证循环无缝
        const fullCycles = Math.ceil(minCount / photoCount);
        return fullCycles * photoCount;
    }

    /**
     * 从 CSS 变量读取卡片尺寸与间距
     */
    getCardSize() {
        const style = getComputedStyle(document.documentElement);
        const w = parseFloat(style.getPropertyValue('--card-w')) || 155;
        const h = parseFloat(style.getPropertyValue('--card-h')) || 207;
        const gap = parseFloat(style.getPropertyValue('--grid-gap')) || 10;
        return { w, h, gap };
    }

    /**
     * 渲染整个瀑布流：逐列生成，每列是独立的照片列表
     */
    render() {
        this.stopLoop();
        this.inner.innerHTML = '';
        this.columns = [];

        if (this.photos.length === 0) {
            this.renderEmpty();
            this.updatePageIndicator();
            return;
        }

        this.cardSize = this.getCardSize();
        const photosPerCol = this.getPhotosPerColumn();
        const photoCount = this.photos.length;
        // photosPerCol 一定是 photoCount 的整数倍（见 getPhotosPerColumn）
        const cyclesPerCol = photosPerCol / photoCount;

        // 记录上一列的"末尾索引"，用来避免列间衔接处出现相同照片
        let prevColLastIdx = -1;

        for (let c = 0; c < this.columnCount; c++) {
            const col = document.createElement('div');
            col.className = 'masonry-col';
            const isOdd = c % 2 === 1;
            col.dataset.parity = isOdd ? 'odd' : 'even';

            // 为这一列生成乱序序列：把 [0..photoCount-1] 洗牌 cyclesPerCol 次拼起来
            // 这样每列照片完全打乱，但仍然是 photos 的完整副本，循环依然无缝
            const colIndices = this.buildShuffledColumn(
                photoCount,
                cyclesPerCol,
                prevColLastIdx,
                c
            );

            for (let r = 0; r < photosPerCol; r++) {
                const photoIdx = colIndices[r];
                const photo = this.photos[photoIdx];
                const card = this.createPhotoCard(photo, photoIdx, c, r);
                col.appendChild(card);
            }

            prevColLastIdx = colIndices[colIndices.length - 1];

            this.inner.appendChild(col);
            this.columns.push({
                el: col,
                isOdd,
                offsetY: 0,
                cycleHeight: 0,
            });
        }

        this.updatePageIndicator();

        // 等图片初步排版后测量并启动滚动
        requestAnimationFrame(() => {
            this.measureColumns();
            this.applyColumnTransforms();
            if (this.autoScroll) {
                this.startLoop();
            }
        });

        // 图片加载完成后重新测量，保证循环长度准确
        const imgs = this.inner.querySelectorAll('.masonry-img');
        let loadedCount = 0;
        imgs.forEach((img) => {
            const handler = () => {
                loadedCount++;
                if (loadedCount % 6 === 0 || loadedCount === imgs.length) {
                    this.measureColumns();
                }
            };
            if (img.complete) {
                handler();
            } else {
                img.addEventListener('load', handler, { once: true });
                img.addEventListener('error', handler, { once: true });
            }
        });
    }

    /**
     * 测量每列的"循环单元高度"
     * 因为 getPhotosPerColumn() 已保证 photosPerCol 是 photos.length 的整数倍，
     * 所以 cycleHeight 直接 = 列内实际卡片数 * cardUnit，循环重置时无缝衔接。
     */
    measureColumns() {
        const photosPerCol = this.getPhotosPerColumn();
        const cardUnit = this.cardSize.h + this.cardSize.gap;
        const cycleHeight = photosPerCol * cardUnit;

        this.columns.forEach((c) => {
            c.cycleHeight = cycleHeight;
        });
    }

    /**
     * 应用每列的 Y 平移
     * - 偶数列：translateY(offsetY)
     * - 奇数列：translateY(offsetY + halfCard) 形成砖墙错位
     */
    applyColumnTransforms() {
        const halfCard = (this.cardSize.h + this.cardSize.gap) / 2;
        this.columns.forEach((c) => {
            const y = c.isOdd ? c.offsetY - halfCard : c.offsetY;
            c.el.style.transform = `translate3d(0, ${y}px, 0)`;
        });
    }

    /**
     * 创建一张照片卡片
     */
    createPhotoCard(photo, photoIdx, colIdx, rowIdx) {
        const card = document.createElement('div');
        card.className = 'masonry-item';
        card.dataset.index = photoIdx;
        // 仅给首屏可见的前几张加入场动画
        if (rowIdx < 6) {
            card.style.animationDelay = `${Math.min((colIdx * 6 + rowIdx) * 40, 800)}ms`;
        } else {
            card.style.animation = 'none';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }

        const inner = document.createElement('div');
        inner.className = 'masonry-item-inner';

        const img = document.createElement('img');
        img.className = 'masonry-img';
        // 异步解码，避免阻塞主线程
        img.decoding = 'async';
        // 首屏可见的前 2 行用 eager + high 优先级，让浏览器尽快下载；
        // 其余用 lazy + low，让浏览器排队下载，减小并发拥塞
        const isFirstScreen = rowIdx < 2;
        img.loading = isFirstScreen ? 'eager' : 'lazy';
        if ('fetchPriority' in img) {
            img.fetchPriority = isFirstScreen ? 'high' : 'low';
        } else {
            // 兼容老浏览器
            img.setAttribute('fetchpriority', isFirstScreen ? 'high' : 'low');
        }
        // 明确尺寸：避免加载时回流，也给浏览器更多调度信息
        img.width = Math.round(this.cardSize.w || 155);
        img.height = Math.round(this.cardSize.h || 207);
        img.alt = photo.originalName || '浪漫照片';
        img.src = photo.dataUrl;

        img.onload = () => {
            img.classList.add('loaded');
        };

        img.onerror = () => {
            img.src = 'data:image/svg+xml,' + encodeURIComponent(`
                <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#FFE4E1"/>
                            <stop offset="100%" stop-color="#FFB6C1"/>
                        </linearGradient>
                    </defs>
                    <rect width="400" height="500" fill="url(#g)"/>
                    <text x="200" y="250" text-anchor="middle" fill="#FF69B4" font-size="22">图片加载失败</text>
                </svg>
            `);
            img.classList.add('loaded');
        };

        const overlay = document.createElement('div');
        overlay.className = 'masonry-overlay';
        overlay.innerHTML = `
            <div class="masonry-heart">💗</div>
            <div class="masonry-caption">${this.escapeHtml(photo.originalName || '甜蜜瞬间')}</div>
        `;

        inner.appendChild(img);
        inner.appendChild(overlay);
        card.appendChild(inner);

        card.addEventListener('click', () => {
            if (typeof this.onPhotoClick === 'function') {
                this.onPhotoClick(photoIdx, photo);
            }
        });

        return card;
    }

    /**
     * 启动主滚动循环：所有列同步沿 Y 轴负向平移
     * 每列各自到达 cycleHeight 时重置到 0，形成无缝循环
     */
    startLoop() {
        if (this.rafId) return;

        const step = () => {
            if (!this.isPaused) {
                let needApply = false;
                this.columns.forEach((c) => {
                    if (c.cycleHeight <= 0) return;
                    c.offsetY -= this.scrollSpeed;
                    if (-c.offsetY >= c.cycleHeight) {
                        c.offsetY += c.cycleHeight;
                    }
                    needApply = true;
                });
                if (needApply) {
                    this.applyColumnTransforms();
                }
            }
            this.rafId = requestAnimationFrame(step);
        };
        this.rafId = requestAnimationFrame(step);
    }

    /**
     * 停止滚动循环
     */
    stopLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * 切换自动滚动开关
     */
    setAutoScroll(enabled) {
        this.autoScroll = enabled;
        if (enabled) {
            this.startLoop();
        } else {
            this.stopLoop();
        }
    }

    /**
     * 渲染空状态
     */
    renderEmpty() {
        const empty = document.createElement('div');
        empty.className = 'masonry-empty';
        empty.innerHTML = `
            <div class="masonry-empty-icon">💞</div>
            <div class="masonry-empty-text">还没有照片</div>
            <div class="masonry-empty-hint">点击下方"添加照片"开始记录甜蜜瞬间</div>
        `;
        this.inner.appendChild(empty);
    }

    /**
     * 更新页脚的数量指示
     */
    updatePageIndicator() {
        const currentPage = document.getElementById('currentPage');
        const totalPages = document.getElementById('totalPages');
        if (currentPage && totalPages) {
            currentPage.textContent = this.photos.length;
            totalPages.textContent = this.photos.length;
        }
    }

    /**
     * 更新照片数据并重新渲染
     */
    updatePhotos(photos) {
        this.photos = photos;
        this.render();
    }

    /**
     * 设置照片点击回调
     */
    setOnPhotoClick(callback) {
        this.onPhotoClick = callback;
    }

    /**
     * 为一列生成乱序的照片索引序列
     * - 把 [0..photoCount-1] 独立洗牌 cycles 次，拼成长度 = photoCount * cycles 的序列
     * - 保证：序列首项 ≠ prevColLastIdx（避免与左邻列首尾撞图）
     * - 保证：相邻位置不重复（包括两段洗牌的拼接处、以及循环回首尾的衔接处）
     * 因为序列仍是 photos 的完整副本拼接，循环重置时不会破坏无缝性。
     */
    buildShuffledColumn(photoCount, cycles, prevColLastIdx, colIdx) {
        if (photoCount <= 0) return [];
        if (photoCount === 1) {
            return new Array(cycles).fill(0);
        }

        const segments = [];
        for (let i = 0; i < cycles; i++) {
            segments.push(this.shuffleRange(photoCount, colIdx * 131 + i * 17));
        }

        // 在拼接处 / 与左邻列衔接处避免连续相同：
        // 若 segments[i] 的首元素 == 上一段尾元素（或 prevColLastIdx），就把它跟段内某个安全位置交换
        const fixBoundary = (seg, forbiddenIdx) => {
            if (seg[0] !== forbiddenIdx) return;
            for (let k = 1; k < seg.length; k++) {
                // 找一个交换后两边都不撞的位置
                const prevOfK = k - 1 >= 0 ? seg[k - 1] : -1;
                const nextOfK = k + 1 < seg.length ? seg[k + 1] : -1;
                if (
                    seg[k] !== forbiddenIdx &&
                    seg[k] !== prevOfK &&
                    seg[0] !== nextOfK
                ) {
                    [seg[0], seg[k]] = [seg[k], seg[0]];
                    return;
                }
            }
        };

        // 处理与左邻列的衔接
        fixBoundary(segments[0], prevColLastIdx);

        // 处理段与段的衔接 + 循环首尾衔接
        for (let i = 1; i < segments.length; i++) {
            const prevTail = segments[i - 1][segments[i - 1].length - 1];
            fixBoundary(segments[i], prevTail);
        }

        const flat = [].concat(...segments);

        // 处理"循环到顶部"的衔接：列底部最后一张 ≠ 列顶部第一张
        if (flat.length > 1 && flat[flat.length - 1] === flat[0]) {
            // 在序列中找一个可以跟末尾交换的位置
            for (let k = flat.length - 2; k >= 1; k--) {
                if (
                    flat[k] !== flat[0] &&
                    flat[k] !== flat[flat.length - 2] &&
                    flat[flat.length - 1] !== flat[k - 1] &&
                    flat[flat.length - 1] !== flat[k + 1 < flat.length ? k + 1 : 0]
                ) {
                    [flat[k], flat[flat.length - 1]] = [flat[flat.length - 1], flat[k]];
                    break;
                }
            }
        }

        return flat;
    }

    /**
     * 生成 [0..n-1] 的洗牌数组（Fisher-Yates）
     * seed 仅用于在 dev 调试时打散不同列的随机性，实际使用 Math.random
     */
    shuffleRange(n, _seed = 0) {
        const arr = new Array(n);
        for (let i = 0; i < n; i++) arr[i] = i;
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * HTML 转义
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 销毁
     */
    destroy() {
        this.stopLoop();
        this.container.innerHTML = '';
        this.photos = [];
        this.columns = [];
    }
}
