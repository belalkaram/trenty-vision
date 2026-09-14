/**
 * Trenty Vision Health Care CRM - Core Client Application
 */

const API = {
  async request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && !window.location.pathname.includes('/login')) {
          // Redirect to login if unauthorized
          window.location.href = '/login';
          return null;
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      Toast.error(err.message);
      throw err;
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};

// Toast notification manager
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-xs w-full';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info') {
    this.init();
    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      info: 'bg-slate-800 text-white',
      warning: 'bg-amber-600 text-white',
    };

    toast.className = `p-4 rounded-xl shadow-lg font-medium text-sm transition-all transform duration-300 pointer-events-auto flex items-center justify-between ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="ml-3 text-white/80 hover:text-white" onclick="this.parentElement.remove()">&times;</button>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); },
};

// Auth State Helper
const Auth = {
  async getProfile() {
    try {
      const res = await API.get('/api/v1/auth/me');
      return res?.data || null;
    } catch {
      return null;
    }
  },

  async logout() {
    try {
      await API.post('/api/v1/auth/logout', {});
    } finally {
      window.location.href = '/login';
    }
  }
};

// Register Service Worker & Offline sync listeners
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/public/sw.js').catch(console.error);
  });
}

// Network Status Observers
window.addEventListener('online', () => {
  Toast.success('تمت استعادة الاتصال بالإنترنت بنجاح 🟢');
});

window.addEventListener('offline', () => {
  Toast.warning('انقطع الاتصال بالإنترنت، يعمل النظام في وضع عدم الاتصال (Offline) ⚠️');
});
