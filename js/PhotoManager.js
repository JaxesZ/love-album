/**
 * PhotoManager - 照片管理类
 * 负责照片的上传、存储、读取和管理
 */
class PhotoManager {
    constructor() {
        this.storageKey = 'romanticAlbum_photos';
        this.maxPhotoSize = 1200; // 最大照片尺寸（像素）
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB 存储限制
        this.photos = this.loadPhotos();
    }

    /**
     * 从 LocalStorage 加载照片
     */
    loadPhotos() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const photos = JSON.parse(data);
                console.log(`已加载 ${photos.length} 张照片`);
                return photos;
            }
        } catch (error) {
            console.error('加载照片失败:', error);
        }
        return [];
    }

    /**
     * 保存照片到 LocalStorage
     */
    savePhotos() {
        try {
            const data = JSON.stringify(this.photos);
            const sizeInBytes = new Blob([data]).size;
            
            // 检查存储空间
            if (sizeInBytes > this.maxStorageSize) {
                throw new Error('存储空间不足，请删除一些照片');
            }
            
            localStorage.setItem(this.storageKey, data);
            console.log(`已保存 ${this.photos.length} 张照片 (${(sizeInBytes / 1024).toFixed(2)} KB)`);
            return true;
        } catch (error) {
            console.error('保存照片失败:', error);
            alert('保存失败: ' + error.message);
            return false;
        }
    }

    /**
     * 上传照片
     * @param {File} file - 照片文件
     * @returns {Promise<Object>} 照片对象
     */
    async uploadPhoto(file) {
        return new Promise((resolve, reject) => {
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                reject(new Error('请选择图片文件'));
                return;
            }

            // 验证文件大小（最大 10MB 原始文件）
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('图片文件太大，请选择小于 10MB 的图片'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    try {
                        // 压缩图片
                        const compressedDataUrl = this.compressImage(img);
                        
                        // 创建照片对象
                        const photo = {
                            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            dataUrl: compressedDataUrl,
                            uploadTime: new Date().toISOString(),
                            originalName: file.name
                        };
                        
                        // 添加到照片列表
                        this.photos.push(photo);
                        
                        // 保存到 LocalStorage
                        if (this.savePhotos()) {
                            console.log('照片上传成功:', photo.id);
                            resolve(photo);
                        } else {
                            // 保存失败，回滚
                            this.photos.pop();
                            reject(new Error('保存照片失败'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => {
                    reject(new Error('图片加载失败'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * 压缩图片
     * @param {HTMLImageElement} img - 图片元素
     * @returns {string} 压缩后的 DataURL
     */
    compressImage(img) {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 计算缩放比例
        if (width > this.maxPhotoSize || height > this.maxPhotoSize) {
            if (width > height) {
                height = (height / width) * this.maxPhotoSize;
                width = this.maxPhotoSize;
            } else {
                width = (width / height) * this.maxPhotoSize;
                height = this.maxPhotoSize;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为 JPEG，质量 0.8
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    /**
     * 获取所有照片
     * @returns {Array} 照片列表
     */
    getPhotos() {
        return [...this.photos];
    }

    /**
     * 根据 ID 获取照片
     * @param {string} id - 照片 ID
     * @returns {Object|null} 照片对象
     */
    getPhotoById(id) {
        return this.photos.find(photo => photo.id === id) || null;
    }

    /**
     * 删除照片
     * @param {string} id - 照片 ID
     * @returns {boolean} 是否删除成功
     */
    deletePhoto(id) {
        const index = this.photos.findIndex(photo => photo.id === id);
        if (index !== -1) {
            this.photos.splice(index, 1);
            this.savePhotos();
            console.log('照片已删除:', id);
            return true;
        }
        return false;
    }

    /**
     * 清空所有照片
     * @returns {boolean} 是否清空成功
     */
    clearAll() {
        this.photos = [];
        try {
            localStorage.removeItem(this.storageKey);
            console.log('所有照片已清空');
            return true;
        } catch (error) {
            console.error('清空照片失败:', error);
            return false;
        }
    }

    /**
     * 导出数据
     * @returns {string} JSON 格式的数据
     */
    exportData() {
        return JSON.stringify({
            version: '1.0',
            exportTime: new Date().toISOString(),
            photos: this.photos
        }, null, 2);
    }

    /**
     * 导入数据
     * @param {string} jsonData - JSON 格式的数据
     * @returns {boolean} 是否导入成功
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // 验证数据格式
            if (!data.photos || !Array.isArray(data.photos)) {
                throw new Error('数据格式不正确');
            }
            
            // 验证每张照片的格式
            for (const photo of data.photos) {
                if (!photo.id || !photo.dataUrl) {
                    throw new Error('照片数据不完整');
                }
            }
            
            // 合并照片（避免重复）
            const existingIds = new Set(this.photos.map(p => p.id));
            const newPhotos = data.photos.filter(p => !existingIds.has(p.id));
            
            if (newPhotos.length === 0) {
                alert('没有新照片需要导入');
                return false;
            }
            
            this.photos.push(...newPhotos);
            
            if (this.savePhotos()) {
                console.log(`成功导入 ${newPhotos.length} 张照片`);
                alert(`成功导入 ${newPhotos.length} 张照片`);
                return true;
            } else {
                // 回滚
                this.photos = this.photos.slice(0, -newPhotos.length);
                return false;
            }
        } catch (error) {
            console.error('导入数据失败:', error);
            alert('导入失败: ' + error.message);
            return false;
        }
    }

    /**
     * 批量上传照片
     * @param {FileList} files - 文件列表
     * @returns {Promise<Array>} 上传结果数组
     */
    async uploadPhotos(files) {
        const results = [];
        const fileArray = Array.from(files);
        
        for (let i = 0; i < fileArray.length; i++) {
            try {
                const photo = await this.uploadPhoto(fileArray[i]);
                results.push({ success: true, photo });
            } catch (error) {
                results.push({ success: false, error: error.message, file: fileArray[i].name });
            }
        }
        
        return results;
    }

    /**
     * 获取存储信息
     * @returns {Object} 存储统计信息
     */
    getStorageInfo() {
        const data = localStorage.getItem(this.storageKey) || '';
        const sizeInBytes = new Blob([data]).size;
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        const usagePercent = ((sizeInBytes / this.maxStorageSize) * 100).toFixed(1);
        
        return {
            photoCount: this.photos.length,
            sizeInBytes,
            sizeInKB,
            sizeInMB,
            usagePercent,
            maxSize: (this.maxStorageSize / (1024 * 1024)).toFixed(2) + ' MB'
        };
    }

    /**
     * 添加预设照片
     * @param {Array<string>} urls - 照片 URL 数组
     */
    addPresetPhotos(urls) {
        const presetPhotos = urls.map((url, index) => ({
            id: 'preset_' + index,
            dataUrl: url,
            uploadTime: new Date().toISOString(),
            originalName: `预设照片 ${index + 1}`,
            isPreset: true
        }));

        // 过滤已存在的预设照片
        const existingIds = new Set(this.photos.map(p => p.id));
        const newPresets = presetPhotos.filter(p => !existingIds.has(p.id));

        if (newPresets.length > 0) {
            this.photos.unshift(...newPresets);
            console.log(`添加了 ${newPresets.length} 张预设照片`);
        }
    }

    /**
     * 同步预设照片到给定的 URL 列表
     * - 移除所有旧的 isPreset 照片
     * - 用 urls 重新生成预设照片
     * - 用户上传的照片（无 isPreset 标记）完全不动
     * 适用于：本地 images/manifest.json 内容更新后，用户刷新时自动看到新照片
     * @param {Array<string>} urls
     * @returns {boolean} 预设照片列表是否发生了变化
     */
    syncPresetPhotos(urls) {
        const newSignature = JSON.stringify(urls);

        // 取出现有的预设照片，对比签名
        const oldPresets = this.photos.filter(p => p.isPreset);
        const oldSignature = JSON.stringify(oldPresets.map(p => p.dataUrl));

        if (newSignature === oldSignature) {
            // 没变化，跳过，避免无意义的写入
            return false;
        }

        // 保留用户自己上传的照片
        const userPhotos = this.photos.filter(p => !p.isPreset);

        // 重新生成预设照片
        const newPresets = urls.map((url, index) => ({
            id: 'preset_' + index,
            dataUrl: url,
            uploadTime: new Date().toISOString(),
            originalName: `预设照片 ${index + 1}`,
            isPreset: true
        }));

        // 预设照片放前面，用户上传的放后面
        this.photos = [...newPresets, ...userPhotos];
        this.savePhotos();
        console.log(`预设照片已同步：${newPresets.length} 张`);
        return true;
    }
}
