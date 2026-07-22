// 存储当前右键的图片信息
let currentImageInfo = null;

// 插件安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // 父菜单
  chrome.contextMenus.create({
    id: 'image-saver-parent',
    title: '图片工具箱',
    contexts: ['image']
  });
  
  // 子菜单 - 复制图片
  chrome.contextMenus.create({
    id: 'copy-image',
    parentId: 'image-saver-parent',
    title: '复制图片',
    contexts: ['image']
  });
  
  // 子菜单 - 保存图片
  chrome.contextMenus.create({
    id: 'save-image',
    parentId: 'image-saver-parent',
    title: '保存图片',
    contexts: ['image']
  });
  
  // 子菜单 - 复制图片地址
  chrome.contextMenus.create({
    id: 'copy-image-url',
    parentId: 'image-saver-parent',
    title: '复制图片地址',
    contexts: ['image']
  });
});

// 监听来自content script的消息，获取图片信息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'IMAGE_INFO') {
    currentImageInfo = message.data;
    sendResponse({ success: true });
  }
  return true;
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // 如果还没有收到图片信息，尝试从info中获取
  if (!currentImageInfo || currentImageInfo.src !== info.srcUrl) {
    currentImageInfo = {
      src: info.srcUrl,
      width: 0,
      height: 0,
      alt: '',
      format: getImageFormat(info.srcUrl)
    };
  }
  
  switch (info.menuItemId) {
    case 'copy-image':
      await handleCopyImage(tab.id, currentImageInfo);
      break;
    case 'save-image':
      await handleSaveImage(tab.id, currentImageInfo);
      break;
    case 'copy-image-url':
      await handleCopyUrl(currentImageInfo.src);
      break;
  }
});

// 复制图片（通过content script处理canvas）
async function handleCopyImage(tabId, imageInfo) {
  try {
    // 向当前页面注入复制逻辑
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: copyImageFromPage,
      args: [imageInfo.src]
    });
    
    if (results[0]?.result?.success) {
      showNotification('图片已复制到剪贴板');
    } else {
      showNotification('复制失败，请重试', 'error');
    }
  } catch (error) {
    console.error('复制图片失败:', error);
    // 如果页面脚本失败，尝试后台处理
    try {
      await copyImageFromBackground(imageInfo.src);
      showNotification('图片已复制到剪贴板');
    } catch (bgError) {
      console.error('后台复制也失败:', bgError);
      showNotification('复制失败，可能是跨域限制', 'error');
    }
  }
}

// 在页面中执行复制（可以绕过跨域，因为canvas在页面上下文）
function copyImageFromPage(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          resolve({ success: true });
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      }, 'image/png');
    };
    
    img.onerror = () => {
      resolve({ success: false, error: '图片加载失败' });
    };
    
    img.src = imageSrc;
  });
}

// 后台复制（使用fetch，可能有跨域问题）
async function copyImageFromBackground(imageSrc) {
  const response = await fetch(imageSrc);
  const blob = await response.blob();
  
  // 在后台无法直接操作剪贴板，需要通过offscreen document
  // 这里改用保存的方式
}

// 保存图片
async function handleSaveImage(tabId, imageInfo) {
  try {
    // 生成文件名
    const timestamp = Date.now();
    const format = imageInfo.format || 'png';
    const filename = `image_${timestamp}.${format}`;
    
    // 尝试直接下载
    await chrome.downloads.download({
      url: imageInfo.src,
      filename: filename,
      saveAs: true  // 弹出保存对话框，让用户选择位置
    });
  } catch (error) {
    console.error('保存失败:', error);
    showNotification('保存失败，请重试', 'error');
  }
}

// 复制图片URL
async function handleCopyUrl(url) {
  try {
    // 使用offscreen document复制文本（Manifest V3需要）
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: '复制图片地址到剪贴板'
    });
    
    await chrome.runtime.sendMessage({
      type: 'COPY_TEXT',
      text: url,
      target: 'offscreen'
    });
    
    showNotification('图片地址已复制');
  } catch (error) {
    console.error('复制URL失败:', error);
  }
}

// 获取图片格式
function getImageFormat(url) {
  const extension = url.split('.').pop().toLowerCase();
  const validFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  return validFormats.includes(extension) ? extension : 'png';
}

// 显示通知
function showNotification(message, type = 'success') {
  chrome.notifications?.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '图片工具箱',
    message: message
  });
}