/**
 * Dynamic Service Discovery Proxy Example (Simplified)
 * 
 * This example demonstrates how to use the Discovery module with the trigger system
 * to create a dynamic proxy that routes requests to discovered services.
 * 
 * In this simplified version, services are registered manually to demonstrate
 * the proxy functionality without requiring UDP multicast network.
 */

import { Discovery } from './discover/index.js';
import { RuleEngine } from '../src/core/rule-engine';
import { ActionRegistry } from '../src/core/action-registry';
import type { TriggerRule, TriggerContext } from '../src/types';

// ============================================================================
// STEP 1: Create HTTP Services (Microservices Simulators)
// ============================================================================

/**
 * Creates a simple HTTP service
 */
function createService(name: string, port: number, routes: Record<string, any>) {
    const server = Bun.serve({
        port,
        fetch(req) {
            const url = new URL(req.url);
            const routeKey = url.pathname;
            
            if (routes[routeKey]) {
                return new Response(JSON.stringify(routes[routeKey]), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(`${name} is running`);
        }
    });
    
    return server;
}

// ============================================================================
// STEP 2: Setup Discovery and Proxy
// ============================================================================

interface DiscoveredServiceInfo {
    ip: string;
    port: number;
    lastSeen: number;
    name?: string;
    version?: string;
    id?: string;
    schema?: string;
}

/**
 * DynamicProxyHandler - Handles routing to discovered services
 */
class DynamicProxyHandler {
    private discoveredServices: Map<string, DiscoveredServiceInfo> = new Map();
    private discovery: Discovery;
    
    constructor(discovery: Discovery) {
        this.discovery = discovery;
        
        // Listen for service discoveries
        this.discovery.on('online', (service: DiscoveredServiceInfo) => {
            console.log(`[Proxy] Discovered ${service.name} at ${service.ip}:${service.port}`);
            this.discoveredServices.set(service.name!, service);
        });
        
        this.discovery.on('offline', (service: DiscoveredServiceInfo) => {
            console.log(`[Proxy] Service ${service.name} went offline`);
            this.discoveredServices.delete(service.name!);
        });
    }
    
    /**
     * Manually register a service (for demo purposes)
     * In production, this would be done via UDP discovery
     */
    registerService(name: string, ip: string, port: number) {
        const service: DiscoveredServiceInfo = {
            name,
            ip,
            port,
            lastSeen: Date.now(),
            version: '1.0.0'
        };
        this.discoveredServices.set(name, service);
        console.log(`[Proxy] Manually registered ${name} at ${ip}:${port}`);
    }
    
    /**
     * Forward request to a discovered service
     */
    async forwardToService(serviceName: string, path: string, method: string, body?: any) {
        const service = this.discoveredServices.get(serviceName);
        
        if (!service) {
            throw new Error(`Service ${serviceName} not discovered yet`);
        }
        
        const url = `http://${service.ip}:${service.port}${path}`;
        
        console.log(`[Proxy] Forwarding ${method} ${path} -> ${url}`);
        
        // Only send body for methods that support it
        const methodsWithBody = ['POST', 'PUT', 'PATCH'];
        const hasBody = methodsWithBody.includes(method.toUpperCase()) && body;
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Proxy-Service': serviceName
            },
            ...(hasBody ? { body: JSON.stringify(body) } : {})
        });
        
        return {
            status: response.status,
            body: await response.text()
        };
    }
    
    /**
     * Get list of currently discovered services
     */
    getDiscoveredServices(): string[] {
        return Array.from(this.discoveredServices.keys());
    }
}

// ============================================================================
// STEP 3: Setup Trigger Rules with Dynamic Proxy
// ============================================================================

function setupProxyRules(proxyHandler: DynamicProxyHandler) {
    const registry = ActionRegistry.getInstance();
    
    // Register dynamic proxy action
    registry.register('PROXY_FORWARD', async (action, context) => {
        const serviceName = String(action.params?.service || '');
        const path = String(action.params?.path || '/');
        const method = String(action.params?.method || 'GET');
        
        try {
            const result = await proxyHandler.forwardToService(
                serviceName,
                path,
                method,
                context.data
            );
            return result;
        } catch (error) {
            return { error: String(error) };
        }
    });
    
    // Register discovery status action
    registry.register('DISCOVERY_STATUS', async (_action, _context) => {
        const services = proxyHandler.getDiscoveredServices();
        return { discoveredServices: services };
    });
    
    // Register service registration action
    registry.register('REGISTER_SERVICE', async (action, _context) => {
        const serviceName = String(action.params?.name || '');
        const ip = String(action.params?.ip || '127.0.0.1');
        const port = Number(action.params?.port || 3000);
        
        proxyHandler.registerService(serviceName, ip, port);
        return { registered: serviceName, ip, port };
    });
}

// ============================================================================
// STEP 4: Run the Example
// ============================================================================

async function main() {
    console.log('=== Dynamic Service Discovery Proxy Example ===\n');
    
    // Start microservices
    const usersServer = createService('Users', 3001, {
        '/api/users': [
            { id: 1, name: 'Alice', email: 'alice@example.com' },
            { id: 2, name: 'Bob', email: 'bob@example.com' }
        ],
        '/api/users/1': { id: 1, name: 'Alice', email: 'alice@example.com' },
        '/api/users/2': { id: 2, name: 'Bob', email: 'bob@example.com' }
    });
    
    const productsServer = createService('Products', 3002, {
        '/api/products': [
            { id: 1, name: 'Laptop', price: 999 },
            { id: 2, name: 'Phone', price: 599 }
        ],
        '/api/categories': [
            { id: 1, name: 'Electronics' },
            { id: 2, name: 'Accessories' }
        ]
    });
    
    const ordersServer = createService('Orders', 3003, {
        '/api/orders': [
            { id: 1, userId: 1, total: 999, status: 'shipped' },
            { id: 2, userId: 2, total: 599, status: 'pending' }
        ]
    });
    
    console.log(`[Services] Users: ${usersServer.port}, Products: ${productsServer.port}, Orders: ${ordersServer.port}`);
    
    // Create the API Gateway / Discovery
    const gatewayDiscovery = new Discovery({
        id: 'api-gateway',
        name: 'gateway',
        version: '1.0.0'
    }, 8080);
    
    await gatewayDiscovery.start();
    console.log('[Gateway] Discovery started on port 8080\n');
    
    // Create proxy handler
    const proxyHandler = new DynamicProxyHandler(gatewayDiscovery);
    
    // Setup trigger rules
    setupProxyRules(proxyHandler);
    
    // Create rule engine
    const engine = new RuleEngine({
        rules: [
            // Register services (simulating discovery)
            {
                id: 'register-users',
                on: 'INIT',
                do: {
                    type: 'REGISTER_SERVICE',
                    params: {
                        name: 'users',
                        ip: '127.0.0.1',
                        port: usersServer.port!
                    }
                }
            },
            {
                id: 'register-products',
                on: 'INIT',
                do: {
                    type: 'REGISTER_SERVICE',
                    params: {
                        name: 'products',
                        ip: '127.0.0.1',
                        port: productsServer.port!
                    }
                }
            },
            {
                id: 'register-orders',
                on: 'INIT',
                do: {
                    type: 'REGISTER_SERVICE',
                    params: {
                        name: 'orders',
                        ip: '127.0.0.1',
                        port: ordersServer.port!
                    }
                }
            },
            
            // Route to users service
            {
                id: 'route-users',
                on: 'GET_USERS',
                do: {
                    type: 'PROXY_FORWARD',
                    params: {
                        service: 'users',
                        path: '/api/users',
                        method: 'GET'
                    }
                }
            },
            
            // Route to products service
            {
                id: 'route-products',
                on: 'GET_PRODUCTS',
                do: {
                    type: 'PROXY_FORWARD',
                    params: {
                        service: 'products',
                        path: '/api/products',
                        method: 'GET'
                    }
                }
            },
            
            // Route to orders service
            {
                id: 'route-orders',
                on: 'GET_ORDERS',
                do: {
                    type: 'PROXY_FORWARD',
                    params: {
                        service: 'orders',
                        path: '/api/orders',
                        method: 'GET'
                    }
                }
            },
            
            // Get discovery status
            {
                id: 'check-status',
                on: 'STATUS_CHECK',
                do: {
                    type: 'DISCOVERY_STATUS'
                }
            }
        ],
        globalSettings: { evaluateAll: true }
    });
    
    // Initialize: register all services
    console.log('--- Initializing Service Discovery ---\n');
    await engine.evaluateContext({
        event: 'INIT',
        id: 'init',
        timestamp: Date.now(),
        data: {}
    });
    
    // Test the proxy
    console.log('\n--- Testing Proxy Routes ---\n');
    
    // Test 1: Check discovered services
    console.log('1. Checking discovered services...');
    const statusResult = await engine.evaluateContext({
        event: 'STATUS_CHECK',
        id: 'test-1',
        timestamp: Date.now(),
        data: {}
    });
    console.log('   Services:', JSON.stringify(statusResult[0]?.executedActions[0]?.result, null, 2));
    
    // Test 2: Route to users
    console.log('\n2. Routing to users service...');
    const usersResult = await engine.evaluateContext({
        event: 'GET_USERS',
        id: 'test-2',
        timestamp: Date.now(),
        data: {}
    });
    const usersAction = usersResult[0]?.executedActions[0];
    const usersRes = usersAction?.result as { body?: string; error?: string } | undefined;
    if (usersRes?.body) {
        console.log('   Users:', JSON.stringify(JSON.parse(usersRes.body), null, 2));
    } else if (usersRes?.error) {
        console.log('   Error:', usersRes.error);
    }
    
    // Test 3: Route to products
    console.log('\n3. Routing to products service...');
    const productsResult = await engine.evaluateContext({
        event: 'GET_PRODUCTS',
        id: 'test-3',
        timestamp: Date.now(),
        data: {}
    });
    const productsAction = productsResult[0]?.executedActions[0];
    const productsRes = productsAction?.result as { body?: string; error?: string } | undefined;
    if (productsRes?.body) {
        console.log('   Products:', JSON.stringify(JSON.parse(productsRes.body), null, 2));
    } else if (productsRes?.error) {
        console.log('   Error:', productsRes.error);
    }
    
    // Test 4: Route to orders
    console.log('\n4. Routing to orders service...');
    const ordersResult = await engine.evaluateContext({
        event: 'GET_ORDERS',
        id: 'test-4',
        timestamp: Date.now(),
        data: {}
    });
    const ordersAction = ordersResult[0]?.executedActions[0];
    const ordersRes = ordersAction?.result as { body?: string; error?: string } | undefined;
    if (ordersRes?.body) {
        console.log('   Orders:', JSON.stringify(JSON.parse(ordersRes.body), null, 2));
    } else if (ordersRes?.error) {
        console.log('   Error:', ordersRes.error);
    }
    
    // Cleanup
    console.log('\n--- Cleaning up ---\n');
    usersServer.stop();
    productsServer.stop();
    ordersServer.stop();
    gatewayDiscovery.stop();
    
    console.log('Example completed successfully!');
}

main().catch(console.error);
