/**
 * main.js - 应用入口
 * 初始化所有模块并协调它们之间的交互（瀑布流版本）
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

// 全局变量，保存本次会话使用的预设照片列表（供"清空"时恢复）
let presetPhotos = [];

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
        presetPhotos = (localPhotos && localPhotos.length > 0) ? localPhotos : fallbackPhotos;

        // 2. 初始化照片管理器
        photoManager = new PhotoManager();

        // 同步预设照片到当前的清单：
        // - 第一次访问 → 添加预设照片
        // - 后续访问，如果 images/manifest.json 内容有变化 → 自动替换旧的预设
        // - 用户自己上传的照片始终保留
        photoManager.syncPresetPhotos(presetPhotos);

        // 2. 初始化瀑布流相册
        const albumContainer = document.getElementById('masonryContainer');
        if (!albumContainer) {
            throw new Error('未找到瀑布流容器');
        }

        masonryAlbum = new MasonryAlbum(albumContainer, photoManager.getPhotos());

        // 3. 初始化大图查看器
        lightbox = new Lightbox();

        // 4. 关联：点击照片打开 Lightbox
        masonryAlbum.setOnPhotoClick((index) => {
            lightbox.open(photoManager.getPhotos(), index);
        });

        // 5. 初始化爱心动画
        const heartContainer = document.getElementById('heartAnimationContainer');
        if (!heartContainer) {
            throw new Error('未找到爱心动画容器');
        }

        heartAnimation = new HeartAnimation(heartContainer);
        heartAnimation.start();

        // 6. 绑定 UI 事件
        bindUIEvents();

        // 7. 检查存储信息
        logStorageInfo();

        console.log('=== 应用初始化完成 ===');
    } catch (error) {
        console.error('应用初始化失败:', error);
        alert('应用初始化失败: ' + error.message);
    }
}

/**
 * 绑定 UI 事件
 */
function bindUIEvents() {
    // 添加照片按钮
    const addPhotoBtn = document.getElementById('addPhotoBtn');
    const photoInput = document.getElementById('photoInput');

    if (addPhotoBtn && photoInput) {
        addPhotoBtn.addEventListener('click', () => {
            photoInput.click();
        });

        photoInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                await handlePhotoUpload(files);
                photoInput.value = '';
            }
        });
    }

    // 设置按钮
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.add('active');
        });
    }

    if (closeSettingsBtn && settingsPanel) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('active');
        });

        settingsPanel.addEventListener('click', (e) => {
            if (e.target === settingsPanel) {
                settingsPanel.classList.remove('active');
            }
        });
    }

    // 背景动画开关
    const toggleAnimation = document.getElementById('toggleAnimation');
    if (toggleAnimation) {
        toggleAnimation.addEventListener('change', (e) => {
            if (e.target.checked) {
                heartAnimation.start();
            } else {
                heartAnimation.stop();
            }
        });
    }

    // 导出按钮
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    // 导入按钮
    const importBtn = document.getElementById('importBtn');
    const importInput = document.getElementById('importInput');

    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => {
            importInput.click();
        });

        importInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await handleImport(file);
                importInput.value = '';
            }
        });
    }

    // 清空照片按钮
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', handleClearAll);
    }
}

/**
 * 处理照片上传
 */
async function handlePhotoUpload(files) {
    try {
        const loadingToast = showToast('正在上传照片...', 'info');

        const results = await photoManager.uploadPhotos(files);

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        hideToast(loadingToast);

        if (successCount > 0) {
            showToast(`成功上传 ${successCount} 张照片`, 'success');
            masonryAlbum.updatePhotos(photoManager.getPhotos());
            lightbox.updatePhotos(photoManager.getPhotos());
        }

        if (failCount > 0) {
            const failedFiles = results
                .filter(r => !r.success)
                .map(r => r.file)
                .join(', ');
            showToast(`${failCount} 张照片上传失败: ${failedFiles}`, 'error');
        }

        logStorageInfo();
    } catch (error) {
        console.error('上传照片失败:', error);
        showToast('上传照片失败: ' + error.message, 'error');
    }
}

/**
 * 处理导出
 */
function handleExport() {
    try {
        const data = photoManager.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `romantic-album-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('数据导出成功', 'success');
    } catch (error) {
        console.error('导出失败:', error);
        showToast('导出失败: ' + error.message, 'error');
    }
}

/**
 * 处理导入
 */
async function handleImport(file) {
    try {
        const text = await file.text();
        const success = photoManager.importData(text);

        if (success) {
            masonryAlbum.updatePhotos(photoManager.getPhotos());
            lightbox.updatePhotos(photoManager.getPhotos());
            logStorageInfo();
            showToast('数据导入成功', 'success');
        }
    } catch (error) {
        console.error('导入失败:', error);
        showToast('导入失败: ' + error.message, 'error');
    }
}

/**
 * 处理清空所有照片
 */
function handleClearAll() {
    if (!confirm('确定要清空所有照片吗？此操作不可恢复！')) {
        return;
    }

    try {
        photoManager.clearAll();
        photoManager.syncPresetPhotos(presetPhotos);

        masonryAlbum.updatePhotos(photoManager.getPhotos());
        lightbox.updatePhotos(photoManager.getPhotos());

        logStorageInfo();
        showToast('所有照片已清空', 'success');
    } catch (error) {
        console.error('清空照片失败:', error);
        showToast('清空照片失败: ' + error.message, 'error');
    }
}

/**
 * 显示提示消息
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        animation: fadeIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        hideToast(toast);
    }, 3000);

    return toast;
}

/**
 * 隐藏提示消息
 */
function hideToast(toast) {
    if (toast && toast.parentNode) {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

/**
 * 输出存储信息
 */
function logStorageInfo() {
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
