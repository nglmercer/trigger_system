// src/Discovery.ts
import { EventEmitter as EventEmitter3 } from "events";
import os2 from "os";
import crypto from "crypto";

// src/modules/Registry.ts
import { EventEmitter } from "events";

class Registry extends EventEmitter {
  services = new Map;
  update(serviceId, discoveredService) {
    const existing = this.services.get(serviceId);
    if (!existing) {
      this.services.set(serviceId, discoveredService);
      this.emit("online", discoveredService);
    } else {
      let changed = false;
      if (existing.ip !== discoveredService.ip || existing.port !== discoveredService.port || existing.version !== discoveredService.version) {
        changed = true;
      }
      this.services.set(serviceId, discoveredService);
      if (changed) {
        this.emit("online", discoveredService);
      }
    }
  }
  remove(serviceId) {
    const existing = this.services.get(serviceId);
    if (existing) {
      this.services.delete(serviceId);
      this.emit("offline", existing);
    }
  }
  get(serviceId) {
    return this.services.get(serviceId);
  }
  getAll() {
    return Array.from(this.services.values());
  }
  checkOffline(timeoutMs) {
    const now = Date.now();
    for (const [id, service] of this.services.entries()) {
      if (now - service.lastSeen > timeoutMs) {
        this.services.delete(id);
        this.emit("offline", service);
      }
    }
  }
  filter(criteria) {
    const results = [];
    for (const service of this.services.values()) {
      let match = true;
      if (criteria.id && criteria.id !== service.id)
        match = false;
      if (criteria.name && criteria.name !== service.name)
        match = false;
      if (criteria.version && criteria.version !== service.version)
        match = false;
      if (match) {
        results.push(service);
      }
    }
    return results;
  }
}

// src/modules/Network.ts
import dgram from "dgram";
import os from "os";
import { EventEmitter as EventEmitter2 } from "events";

// src/modules/debug.ts
class Logger {
  enabled = false;
  enable() {
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
  }
  log(...args) {
    if (this.enabled)
      console.log(...args);
  }
  warn(...args) {
    if (this.enabled)
      console.warn(...args);
  }
  error(...args) {
    if (this.enabled)
      console.error(...args);
  }
}
var logger = new Logger;

// src/modules/Network.ts
class Network extends EventEmitter2 {
  socket = null;
  senderSocket = null;
  options;
  serviceInfo;
  port;
  constructor(serviceInfo, port, options) {
    super();
    this.serviceInfo = serviceInfo;
    this.port = port;
    this.options = options;
  }
  getLocalInterfaces() {
    const interfaces = os.networkInterfaces();
    const internalAddresses = [];
    const externalAddresses = [];
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface)
        continue;
      for (const config of iface) {
        if (config.family === "IPv4") {
          if (config.internal) {
            internalAddresses.push(config.address);
          } else {
            externalAddresses.push(config.address);
          }
        }
      }
    }
    const allAddresses = [...externalAddresses, ...internalAddresses];
    return allAddresses.length > 0 ? allAddresses : ["127.0.0.1"];
  }
  async start() {
    if (this.options.multicastInterface) {
      return this.startWithInterface(this.options.multicastInterface);
    }
    return this.startWithInterface("0.0.0.0");
  }
  startWithInterface(iface) {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        try {
          this.socket.close();
        } catch (e) {}
      }
      if (this.senderSocket) {
        try {
          this.senderSocket.close();
        } catch (e) {}
      }
      this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
      this.senderSocket = dgram.createSocket({ type: "udp4" });
      let pendingBinds = 2;
      const checkDone = () => {
        pendingBinds--;
        if (pendingBinds === 0) {
          logger.log(`[Discovery] Multicast bound to ${iface}:${this.options.multicastPort}`);
          resolve();
        }
      };
      this.senderSocket.bind(0, () => {
        try {
          this.senderSocket.setMulticastTTL(64);
          this.senderSocket.setMulticastLoopback(true);
        } catch (e) {}
        checkDone();
      });
      this.socket.on("error", (err) => {
        this.emit("error", err);
        reject(err);
      });
      this.socket.on("message", (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          this.emit("message", data, rinfo.address);
        } catch (e) {}
      });
      this.socket.bind(this.options.multicastPort, undefined, () => {
        if (!this.socket)
          return;
        try {
          this.socket.setBroadcast(true);
          this.socket.setMulticastTTL(64);
          this.socket.setMulticastLoopback(true);
          if (iface === "0.0.0.0") {
            const addresses = this.getLocalInterfaces();
            for (const addr of addresses) {
              try {
                this.socket.addMembership(this.options.multicastAddress, addr);
              } catch (e) {}
            }
          } else {
            try {
              this.socket.addMembership(this.options.multicastAddress, iface);
            } catch (e) {}
          }
          checkDone();
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  broadcastPresence(type) {
    if (!this.senderSocket)
      return;
    const message = {
      type,
      service: {
        ...this.serviceInfo,
        id: this.serviceInfo.id,
        port: this.port
      }
    };
    const buffer = Buffer.from(JSON.stringify(message));
    if (this.options.multicastInterface) {
      try {
        this.senderSocket.setMulticastInterface(this.options.multicastInterface);
        this.senderSocket.send(buffer, 0, buffer.length, this.options.multicastPort, this.options.multicastAddress);
      } catch (e) {
        logger.log(`[Discovery] Failed to broadcast on specific interface ${this.options.multicastInterface}:`, e);
      }
      return;
    }
    const addresses = this.getLocalInterfaces();
    const sendSequentially = (index) => {
      if (index >= addresses.length)
        return;
      const addr = addresses[index];
      try {
        this.senderSocket.setMulticastInterface(addr);
        this.senderSocket.send(buffer, 0, buffer.length, this.options.multicastPort, this.options.multicastAddress, (err) => {
          if (err)
            logger.log(`[Discovery] Broadcast error on ${addr}:`, err);
          sendSequentially(index + 1);
        });
      } catch (e) {
        logger.log(`[Discovery] Failed to broadcast on ${addr}:`, e);
        sendSequentially(index + 1);
      }
    };
    sendSequentially(0);
  }
  stop() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }
    if (this.senderSocket) {
      try {
        this.senderSocket.close();
      } catch (e) {}
      this.senderSocket = null;
    }
  }
}

// src/modules/ClientFactory.ts
class ClientFactory {
  filterServices;
  constructor(filterServices) {
    this.filterServices = filterServices;
  }
  createClient(nameOrId) {
    return {
      get: async (path, options) => this.fetchInternal(nameOrId, path, { ...options, method: "GET" }),
      post: async (path, options) => this.fetchInternal(nameOrId, path, { ...options, method: "POST" }),
      put: async (path, options) => this.fetchInternal(nameOrId, path, { ...options, method: "PUT" }),
      delete: async (path, options) => this.fetchInternal(nameOrId, path, { ...options, method: "DELETE" })
    };
  }
  async fetchInternal(nameOrId, path, options) {
    let services = this.filterServices({ name: nameOrId });
    if (services.length === 0) {
      services = this.filterServices({ id: nameOrId });
    }
    if (services.length === 0) {
      throw new Error(`Service ${nameOrId} not found`);
    }
    const target = services[0];
    if (!target) {
      throw new Error(`Service ${nameOrId} not found`);
    }
    const url = `${target.schema}://${target.ip}:${target.port}${path}`;
    return fetch(url, options);
  }
}

// src/Discovery.ts
function generateServiceId(name) {
  const random = crypto.randomBytes(4).toString("hex");
  const hostname = os2.hostname().replace(/[^a-zA-Z0-9]/g, "-").substring(0, 8);
  const prefix = name ? `${name}-` : "service";
  return `${prefix}-${hostname}-${random}`;
}

class Discovery extends EventEmitter3 {
  serviceInfo;
  port;
  options;
  registry;
  network;
  clientFactory;
  heartbeatTimer = null;
  checkOfflineTimer = null;
  processHooksSet = false;
  onProcessExit;
  constructor(serviceInfo, port, options = {}) {
    super();
    const serviceId = serviceInfo.id || generateServiceId(serviceInfo.name);
    this.serviceInfo = {
      id: serviceId,
      name: serviceInfo.name,
      version: serviceInfo.version,
      schema: serviceInfo.schema || "http"
    };
    this.port = port;
    this.options = {
      multicastAddress: options.multicastAddress || "239.255.255.250",
      multicastInterface: options.multicastInterface || "",
      multicastPort: options.multicastPort || 54321,
      heartbeatInterval: options.heartbeatInterval || 5000,
      offlineTimeout: options.offlineTimeout || 15000,
      setupHooks: options.setupHooks !== undefined ? options.setupHooks : true
    };
    this.registry = new Registry;
    this.network = new Network(this.serviceInfo, this.port, this.options);
    this.clientFactory = new ClientFactory(this.filter.bind(this));
    this.onProcessExit = () => {
      this.stop();
      process.exit();
    };
    this.setupEvents();
  }
  setupEvents() {
    this.registry.on("online", (service) => this.emit("online", service));
    this.registry.on("offline", (service) => this.emit("offline", service));
    this.network.on("error", (err) => this.emit("error", err));
    this.network.on("message", (msg, senderIp) => this.handleMessage(msg, senderIp));
  }
  async start() {
    await this.network.start();
    this.network.broadcastPresence("hello");
    this.startTimers();
    if (this.options.setupHooks && !this.processHooksSet) {
      this.setupProcessHooks();
    }
  }
  handleMessage(msg, senderIp) {
    if (!msg || !msg.service)
      return;
    if (msg.service.id === this.serviceInfo.id)
      return;
    if (msg.type === "goodbye") {
      this.registry.remove(msg.service.id);
      return;
    }
    const discoveredService = {
      ...msg.service,
      ip: senderIp,
      lastSeen: Date.now()
    };
    this.registry.update(msg.service.id, discoveredService);
    if (msg.type === "hello") {
      this.network.broadcastPresence("heartbeat");
    }
  }
  startTimers() {
    this.heartbeatTimer = setInterval(() => {
      this.network.broadcastPresence("heartbeat");
    }, this.options.heartbeatInterval);
    this.checkOfflineTimer = setInterval(() => {
      this.registry.checkOffline(this.options.offlineTimeout);
    }, 1000);
  }
  filter(criteria) {
    return this.registry.filter(criteria);
  }
  setupProcessHooks() {
    process.on("SIGINT", this.onProcessExit);
    process.on("SIGTERM", this.onProcessExit);
    this.processHooksSet = true;
  }
  removeProcessHooks() {
    if (this.processHooksSet) {
      process.removeListener("SIGINT", this.onProcessExit);
      process.removeListener("SIGTERM", this.onProcessExit);
      this.processHooksSet = false;
    }
  }
  stop() {
    this.network.broadcastPresence("goodbye");
    if (this.heartbeatTimer)
      clearInterval(this.heartbeatTimer);
    if (this.checkOfflineTimer)
      clearInterval(this.checkOfflineTimer);
    if (this.options.setupHooks) {
      this.removeProcessHooks();
    }
    this.network.stop();
  }
  createClient(nameOrId) {
    return this.clientFactory.createClient(nameOrId);
  }
  getInternalRegistry() {
    return this.registry;
  }
  getServiceId() {
    return this.serviceInfo.id;
  }
}
export {
  Discovery
};
