(function() {
  'use strict';

  // ========== 工具函数 ==========
  
  // 提取图片信息
  function extractImageInfo(element) {
    let src = '';
    let alt = '';
    let isSVG = false;
    let backgroundImage = false;

    // 处理 <img> 标签
    if (element.tagName === 'IMG') {
      src = element.src || element.dataset.src || '';
      alt = element.alt || '';
    }
    // 处理 <picture> 标签内的 <img>
    else if (element.tagName === 'PICTURE') {
      const img = element.querySelector('img');
      if (img) {
        src = img.src || img.dataset.src || '';
        alt = img.alt || '';
      }
    }
    // 处理 SVG 元素
    else if (element.tagName === 'SVG' || element.closest('svg')) {
      const svg = element.tagName === 'SVG' ? element : element.closest('svg');
      try {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        isSVG = true;
      } catch (e) {
        console.error('SVG序列化失败:', e);
      }
    }
    // 处理 CSS 背景图
    else {
      const style = window.getComputedStyle(element);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const match = bgImage.match(/url\(['"]?([^'"]*)['"]?\)/);
        if (match) {
          src = match[1];
          backgroundImage = true;
        }
      }
    }

    return { src, alt, isSVG, backgroundImage };
  }

  // 获取图片格式
  function getImageFormat(src) {
    if (!src) return 'png';
    if (src.startsWith('data:image/svg+xml')) return 'svg';
    if (src.startsWith('data:')) {
      const match = src.match(/^data:image\/(\w+)/);
      return match ? match[1] : 'png';
    }
    const url = src.split('?')[0].split('#')[0];
    const ext = url.split('.').pop().toLowerCase();
    const validFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    return validFormats.includes(ext) ? ext : 'png';
  }

  // ========== 自定义右键菜单 UI ==========
  
  const menuHTML = `
    <div id="custom-image-menu" class="custom-image-menu" style="display: none;">
      <div class="menu-item copy-image-btn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>复制图片</span>
      </div>
      <div class="menu-item save-image-btn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>保存图片</span>
      </div>
      <div class="menu-item copy-url-btn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        <span>复制图片地址</span>
      </div>
      <div class="menu-item open-image-btn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        <span>在新标签打开</span>
      </div>
    </div>
  `;

  // 注入菜单到页面
  const menuContainer = document.createElement('div');
  menuContainer.innerHTML = menuHTML;
  document.body.appendChild(menuContainer.firstElementChild);
  
  const menu = document.getElementById('custom-image-menu');
  let currentImageInfo = null;
  let menuVisible = false;

  // ========== 菜单定位与显示（增强动画版）==========

  function showMenu(x, y, imageInfo) {
    if (!imageInfo || !imageInfo.src) return;
    
    // 如果菜单已显示，先隐藏
    if (menuVisible) {
      hideMenu(true); // 立即隐藏不带动画
    }
    
    currentImageInfo = imageInfo;
    
    // 计算菜单位置
    const menuWidth = menu.offsetWidth || 220;
    const menuHeight = menu.offsetHeight || 180;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let posX = x;
    let posY = y;
    
    // 防止菜单溢出屏幕右侧
    if (x + menuWidth > windowWidth) {
      posX = windowWidth - menuWidth - 10;
    }
    
    // 防止菜单溢出屏幕底部
    if (y + menuHeight > windowHeight) {
      posY = windowHeight - menuHeight - 10;
    }
    
    // 确保不超出左边界和上边界
    if (posX < 5) posX = 5;
    if (posY < 5) posY = 5;
    
    // 先清除所有动画类
    menu.classList.remove('show', 'hide');
    
    // 设置位置
    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';
    menu.style.display = 'block';
    
    // 强制回流，确保动画重新开始
    menu.offsetHeight;
    
    // 添加显示类，触发入场动画
    menu.classList.add('show');
    menuVisible = true;
    
    // 清空之前的隐藏定时器
    clearTimeout(menu._hideTimeout);
    clearTimeout(menu._leaveTimeout);
    
    // 重置菜单项的动画
    const menuItems = menu.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.style.animation = 'none';
      item.offsetHeight; // 强制回流
      item.style.animation = '';
    });
  }

  function hideMenu(instant = false) {
    if (!menuVisible) return;
    
    if (instant) {
      // 立即隐藏，无动画
      menu.classList.remove('show', 'hide');
      menu.style.display = 'none';
      menuVisible = false;
      currentImageInfo = null;
      clearTimeout(menu._hideTimeout);
      clearTimeout(menu._leaveTimeout);
      return;
    }
    
    // 移除显示类
    menu.classList.remove('show');
    
    // 添加隐藏类，触发出场动画
    menu.classList.add('hide');
    
    // 动画结束后彻底隐藏
    clearTimeout(menu._hideTimeout);
    menu._hideTimeout = setTimeout(() => {
      menu.style.display = 'none';
      menu.classList.remove('hide');
      menuVisible = false;
      currentImageInfo = null;
    }, 250); // 匹配动画时长 0.25s
  }

  // ========== 图片操作 ==========
  
  // 复制图片到剪贴板
  async function copyImage(imageSrc) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = imageSrc;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const blob = await new Promise(resolve => 
        canvas.toBlob(resolve, 'image/png')
      );
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      showToast('✅ 图片已复制到剪贴板');
      return true;
    } catch (error) {
      console.error('复制图片失败:', error);
      
      // 降级方案：尝试直接 fetch 复制
      try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        showToast('✅ 图片已复制');
        return true;
      } catch (e) {
        console.error('降级复制也失败:', e);
        showToast('❌ 复制失败，请尝试保存图片');
        return false;
      }
    }
  }

  // 保存图片
  async function saveImage(imageSrc, filename) {
    try {
      // 通过创建隐藏链接触发下载
      const a = document.createElement('a');
      a.href = imageSrc;
      a.download = filename || 'image.' + getImageFormat(imageSrc);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // 延迟移除，确保下载触发
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      
      showToast('💾 图片开始下载');
      return true;
    } catch (error) {
      console.error('保存失败:', error);
      
      // 降级方案：打开新标签保存
      try {
        window.open(imageSrc, '_blank');
        showToast('💾 已在新标签打开，请右键保存');
        return true;
      } catch (e) {
        showToast('❌ 保存失败，请重试');
        return false;
      }
    }
  }

  // 复制URL
  async function copyURL(url) {
    try {
      await navigator.clipboard.writeText(url);
      showToast('📋 图片地址已复制');
      return true;
    } catch (error) {
      console.error('复制URL失败:', error);
      
      // 降级方案：使用传统方法
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        showToast('📋 地址已复制');
      } catch (e) {
        showToast('❌ 复制失败');
      }
      
      document.body.removeChild(textarea);
      return true;
    }
  }

  // 新标签打开
  function openInNewTab(url) {
    window.open(url, '_blank');
    showToast('🔗 已在新标签打开');
  }

  // Toast提示
  function showToast(message) {
    // 移除旧toast
    const oldToast = document.querySelector('.image-menu-toast');
    if (oldToast) {
      oldToast.classList.remove('show');
      setTimeout(() => oldToast.remove(), 300);
    }
    
    const toast = document.createElement('div');
    toast.className = 'image-menu-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 强制回流后添加动画
    toast.offsetHeight;
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // 自动移除
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 2000);
  }

  // ========== 事件监听 ==========
  
  // 右键事件
  document.addEventListener('contextmenu', (event) => {
    const target = event.target;
    
    // 如果点击的是我们的菜单，不做处理
    if (menu.contains(target)) {
      return;
    }
    
    let imageElement = null;
    
    // 检查是否点击的是图片相关元素
    if (target.tagName === 'IMG' || 
        target.tagName === 'PICTURE' ||
        target.tagName === 'SVG' ||
        target.closest('svg')) {
      imageElement = target;
    } else {
      // 检查是否有背景图
      const style = window.getComputedStyle(target);
      if (style.backgroundImage && style.backgroundImage !== 'none') {
        imageElement = target;
      }
    }
    
    if (imageElement) {
      const imageInfo = extractImageInfo(imageElement);
      if (imageInfo.src) {
        event.preventDefault();
        event.stopPropagation();
        showMenu(event.clientX, event.clientY, imageInfo);
        return;
      }
    }
    
    // 非图片区域，隐藏菜单
    if (menuVisible) {
      hideMenu();
    }
  }, true);

  // 左键点击空白隐藏
  document.addEventListener('click', (event) => {
    if (menuVisible && !menu.contains(event.target)) {
      hideMenu();
    }
  });

  // 鼠标离开菜单区域延迟隐藏
  menu.addEventListener('mouseleave', () => {
    clearTimeout(menu._leaveTimeout);
    menu._leaveTimeout = setTimeout(() => {
      if (menuVisible) hideMenu();
    }, 400); // 400ms延迟，防止误触
  });

  menu.addEventListener('mouseenter', () => {
    clearTimeout(menu._leaveTimeout);
  });

  // ESC隐藏
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuVisible) {
      hideMenu();
    }
  });

  // 滚动时立即隐藏
  window.addEventListener('scroll', () => {
    if (menuVisible) hideMenu(true);
  }, true);

  // 窗口大小改变时立即隐藏
  window.addEventListener('resize', () => {
    if (menuVisible) hideMenu(true);
  });

  // 失去焦点时隐藏
  window.addEventListener('blur', () => {
    if (menuVisible) hideMenu();
  });

  // 菜单项点击事件
  menu.addEventListener('click', async (event) => {
    const menuItem = event.target.closest('.menu-item');
    if (!menuItem || !currentImageInfo) return;
    
    const imageSrc = currentImageInfo.src;
    const format = getImageFormat(imageSrc);
    const timestamp = Date.now();
    
    // 先隐藏菜单
    hideMenu();
    
    if (menuItem.classList.contains('copy-image-btn')) {
      await copyImage(imageSrc);
    } 
    else if (menuItem.classList.contains('save-image-btn')) {
      const filename = `image_${timestamp}.${format}`;
      await saveImage(imageSrc, filename);
    }
    else if (menuItem.classList.contains('copy-url-btn')) {
      await copyURL(imageSrc);
    }
    else if (menuItem.classList.contains('open-image-btn')) {
      openInNewTab(imageSrc);
    }
  });

  // 阻止菜单上的右键事件
  menu.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  // 阻止菜单上的鼠标事件冒泡
  menu.addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });

  console.log('✅ 图片右键增强插件已加载');
})();