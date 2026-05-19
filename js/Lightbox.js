/**
 * Lightbox - 大图查看器
 * 提供点击照片放大查看 + 左右切换的功能
 */
class Lightbox {
    constructor() {
        this.photos = [];
        this.currentIndex = 0;
        this.overlay = null;
        this.imgElement = null;
        this.captionElement = null;
        this.counterElement = null;
        this.isOpen = false;
        this.touchStartX = 0;
        this.touchEndX = 0;

        this.createDOM();
        this.bindEvents();
    }

    /**
     * 创建 DOM 结构
     */
    createDOM() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'lightbox-overlay';
        this.overlay.innerHTML = `
            <button class="lightbox-close" aria-label="关闭">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <button class="lightbox-nav lightbox-prev" aria-label="上一张">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>
            <button class="lightbox-nav lightbox-next" aria-label="下一张">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>
            <div class="lightbox-content">
                <img class="lightbox-img" alt="照片">
                <div class="lightbox-caption"></div>
                <div class="lightbox-counter"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.imgElement = this.overlay.querySelector('.lightbox-img');
        this.captionElement = this.overlay.querySelector('.lightbox-caption');
        this.counterElement = this.overlay.querySelector('.lightbox-counter');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const closeBtn = this.overlay.querySelector('.lightbox-close');
        const prevBtn = this.overlay.querySelector('.lightbox-prev');
        const nextBtn = this.overlay.querySelector('.lightbox-next');

        closeBtn.addEventListener('click', () => this.close());
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.prev();
        });
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.next();
        });

        // 点击背景关闭
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay || e.target.classList.contains('lightbox-content')) {
                this.close();
            }
        });

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.key === 'Escape') this.close();
            else if (e.key === 'ArrowLeft') this.prev();
            else if (e.key === 'ArrowRight') this.next();
        });

        // 触摸滑动
        this.overlay.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
        }, { passive: true });

        this.overlay.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].clientX;
            const diff = this.touchEndX - this.touchStartX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) this.prev();
                else this.next();
            }
        }, { passive: true });
    }

    /**
     * 打开 Lightbox
     */
    open(photos, index) {
        this.photos = photos;
        this.currentIndex = index;
        this.update();
        this.overlay.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    }

    /**
     * 关闭 Lightbox
     */
    close() {
        this.overlay.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
    }

    /**
     * 上一张
     */
    prev() {
        if (this.photos.length <= 1) return;
        this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
        this.update();
    }

    /**
     * 下一张
     */
    next() {
        if (this.photos.length <= 1) return;
        this.currentIndex = (this.currentIndex + 1) % this.photos.length;
        this.update();
    }

    /**
     * 更新显示内容
     */
    update() {
        const photo = this.photos[this.currentIndex];
        if (!photo) return;

        // 加淡入动画
        this.imgElement.classList.remove('loaded');
        this.imgElement.src = photo.dataUrl;
        this.imgElement.onload = () => {
            this.imgElement.classList.add('loaded');
        };

        this.captionElement.textContent = photo.originalName || '甜蜜瞬间';
        this.counterElement.textContent = `${this.currentIndex + 1} / ${this.photos.length}`;
    }

    /**
     * 更新照片数据（外部数据变更时同步）
     */
    updatePhotos(photos) {
        this.photos = photos;
        if (this.isOpen) {
            if (this.currentIndex >= photos.length) {
                this.currentIndex = Math.max(0, photos.length - 1);
            }
            this.update();
        }
    }
}
