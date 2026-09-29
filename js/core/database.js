// ============================================================
// BASE DE DATOS local (localStorage + imágenes en memoria)
// ============================================================

class Database {
  constructor() {
    this.db = null;
    this.images = new Map();
  }
  init() {
    const stored = localStorage.getItem('ods_data');
    this.db = stored ? JSON.parse(stored) : { orders: [], counter: 1 };
    const storedImages = localStorage.getItem('ods_images');
    if (storedImages) {
      this.images = new Map(JSON.parse(storedImages));
    }
  }
  save() {
    localStorage.setItem('ods_data', JSON.stringify(this.db));
  }
  getAllOrders() {
    return this.db.orders;
  }
  getOrder(id) {
    return this.db.orders.find(o => o.id === id);
  }
  createOrder(order) {
    const newOrder = Object.assign({}, order, { id: this.db.counter++ });
    this.db.orders.push(newOrder);
    this.save();
    return newOrder;
  }
  updateOrder(id, data) {
    const idx = this.db.orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.db.orders[idx] = Object.assign({}, this.db.orders[idx], data);
      this.save();
      return this.db.orders[idx];
    }
    return null;
  }
  deleteOrder(id) {
    const order = this.getOrder(id);
    if (order && order.images) {
      Object.keys(order.images).forEach(key => {
        (order.images[key] || []).forEach(imgId => this.images.delete(imgId));
      });
    }
    this.db.orders = this.db.orders.filter(o => o.id !== id);
    this.save();
  }
  duplicateOrder(id) {
    const original = this.getOrder(id);
    if (!original) return null;
    const newOrder = Object.assign({}, original, { id: this.db.counter++ });
    delete newOrder.firmaCliente;
    delete newOrder.firmaIngeniero;
    if (original.images) {
      newOrder.images = {};
      Object.keys(original.images).forEach(key => {
        newOrder.images[key] = original.images[key].map(imgId => {
          const imgData = this.images.get(imgId);
          if (imgData) {
            const newId = 'img_' + Date.now() + '_' + Math.random();
            this.images.set(newId, imgData);
            return newId;
          }
          return null;
        }).filter(Boolean);
      });
    }
    this.db.orders.push(newOrder);
    this.save();
    return newOrder;
  }
  saveImage(id, data) {
    this.images.set(id, data);
    this.save();
  }
  getImage(id) {
    // Primero buscar en cache temporal en memoria (para imágenes de nube, no persiste en localStorage)
    if (window._tmpImgCache && window._tmpImgCache.has(id)) {
      return window._tmpImgCache.get(id);
    }
    return this.images.get(id);
  }
}
const db = new Database();
