/**
 * main.js - 应用入口
 * 初始化所有模块（瀑布流版本，纯展示模式）
 */

// 全局实例
let photoManager = null;
let masonryAlbum = null;
let lightbox = null;
let heartAnimation = null;

// 远程兜底照片（当本地 images/manifest.json 缺失或为空时使用）
const fallbackPhotos = [
    'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&fit=crop',
    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&fit=crop',
    'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=800&fit=crop',
    'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=800&fit=crop',
    'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=800&fit=crop',
    'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?w=800&fit=crop',
    'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&fit=crop',
    'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?w=800&fit=crop',
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&fit=crop'
];

// 本地照片清单文件路径（相对于 index.html）
const LOCAL_MANIFEST_URL = 'images/manifest.json';

/**
 * 加载本地 images/manifest.json 中列出的照片
 * 如果文件不存在 / 为空 / 解析失败，返回 null，由调用方决定是否回退
 * @returns {Promise<string[]|null>}
 */
async function loadLocalManifest() {
    try {
        const resp = await fetch(LOCAL_MANIFEST_URL, { cache: 'no-cache' });
        if (!resp.ok) {
            console.log('未找到本地照片清单，使用远程示例照片');
            return null;
        }
        const data = await resp.json();
        if (!data || !Array.isArray(data.photos) || data.photos.length === 0) {
            console.log('本地照片清单为空，使用远程示例照片');
            return null;
        }
        // 把文件名拼成相对 URL，对中文做编码避免 GitHub Pages 上 404
        const urls = data.photos
            .filter((name) => typeof name === 'string' && name.trim().length > 0)
            .map((name) => 'images/' + encodeURIComponent(name.trim()));
        console.log(`从本地清单加载了 ${urls.length} 张照片`);
        return urls.length > 0 ? urls : null;
    } catch (error) {
        console.warn('读取本地照片清单失败，使用远程示例照片:', error);
        return null;
    }
}

/**
 * 初始化应用
 */
async function initApp() {
    try {
        console.log('=== 浪漫相册应用启动 (瀑布流版) ===');

        // 1. 决定预设照片来源：优先本地 images/manifest.json，否则远程兜底
        const localPhotos = await loadLocalManifest();
        const presetPhotos = (localPhotos && localPhotos.length > 0) ? localPhotos : fallbackPhotos;

        // 2. 初始化照片管理器
        photoManager = new PhotoManager();

        // 同步预设照片到当前的清单：
        // - 第一次访问 → 添加预设照片
        // - 后续访问，如果 images/manifest.json 内容有变化 → 自动替换旧的预设
        photoManager.syncPresetPhotos(presetPhotos);

        // 3. 初始化瀑布流相册
        const albumContainer = document.getElementById('masonryContainer');
        if (!albumContainer) {
            throw new Error('未找到瀑布流容器');
        }

        masonryAlbum = new MasonryAlbum(albumContainer, photoManager.getPhotos());

        // 4. 初始化大图查看器
        lightbox = new Lightbox();

        // 5. 关联：点击照片打开 Lightbox
        masonryAlbum.setOnPhotoClick((index) => {
            lightbox.open(photoManager.getPhotos(), index);
        });

        // 6. 初始化爱心动画
        const heartContainer = document.getElementById('heartAnimationContainer');
        if (!heartContainer) {
            throw new Error('未找到爱心动画容器');
        }

        heartAnimation = new HeartAnimation(heartContainer);
        heartAnimation.start();

        // 7. 输出存储信息
        logStorageInfo();

        console.log('=== 应用初始化完成 ===');
    } catch (error) {
        console.error('应用初始化失败:', error);
        alert('应用初始化失败: ' + error.message);
    }
}

/**
 * 输出存储信息
 */
function logStorageInfo() {
    if (!photoManager) {
        return;
    }
    const info = photoManager.getStorageInfo();
    console.log('=== 存储信息 ===');
    console.log(`照片数量: ${info.photoCount}`);
    console.log(`存储大小: ${info.sizeInKB} KB (${info.sizeInMB} MB)`);
    console.log(`使用率: ${info.usagePercent}%`);
    console.log(`最大容量: ${info.maxSize}`);
}

/**
 * 页面加载完成后初始化
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

/**
 * 页面卸载时清理资源
 */
window.addEventListener('beforeunload', () => {
    if (masonryAlbum) {
        masonryAlbum.destroy();
    }
    if (heartAnimation) {
        heartAnimation.stop();
    }
});

window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的 Promise 错误:', e.reason);
});
