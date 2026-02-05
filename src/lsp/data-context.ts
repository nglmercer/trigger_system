import { readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { parseDocument } from 'yaml';

// Cache for loaded files: path -> { mtime, data }
const fileCache = new Map<string, { mtime: number, data: any }>();

/**
 * DataContext manages test data loaded from JSON/YAML files
 * for autocompletion and hover hints
 */
export class DataContext {
    private data: Record<string, any> = {};
    private schema: Record<string, string> = {}; // field -> type mapping

    /**
     * Load data from a JSON or YAML file
     */
    loadFromFile(filePath: string): void {
        try {
            // Check cache first
            const stats = statSync(filePath);
            const mtime = stats.mtimeMs;
            const cached = fileCache.get(filePath);

            if (cached && cached.mtime === mtime) {
               // console.log(`[LSP] Cache hit for ${filePath}`);
                this.data = cached.data;
            } else {
                console.log(`[LSP] Loading file ${filePath}`);
                const content = readFileSync(filePath, 'utf-8');
                let parsedData: any = {};
                
                if (filePath.endsWith('.json')) {
                    parsedData = JSON.parse(content);
                } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                    const doc = parseDocument(content);
                    parsedData = doc.toJS() || {};
                }
                
                // Update cache
                fileCache.set(filePath, { mtime, data: parsedData });
                this.data = parsedData;
            }
            
            // Build schema
            this.buildSchema(this.data);
        } catch (error) {
            console.error(`Failed to load data context from ${filePath}:`, error);
        }
    }

    /**
     * Load data from object
     */
    loadFromObject(data: Record<string, any>): void {
        this.data = data;
        this.buildSchema(this.data);
    }

    /**
     * Get value at a path (e.g., "data.username")
     */
    getValue(path: string) {
        if (!path) {
            return this.data; // Return all data if path is empty
        }
        
        const parts = path.split('.');
        let current = this.data;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        
        return current;
    }

    /**
     * Get all fields at a given path prefix
     */
    getFields(prefix: string = '') {
        // If no prefix or empty, return all top-level keys (aliases)
        if (!prefix || prefix === '') {
            return Object.keys(this.data).map(key => ({
                name: key,
                type: this.getTypeOf(this.data[key]),
                value: this.data[key]
            }));
        }

        // Navigate to the prefix path
        const value = this.getValue(prefix);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value).map(key => ({
                name: key,
                type: this.getTypeOf(value[key]),
                value: value[key]
            }));
        }

        return [];
    }

    /**
     * Check if a path exists in the data
     */
    hasPath(path: string): boolean {
        return this.getValue(path) !== undefined;
    }

    /**
     * Get type of a value
     */
    private getTypeOf(value: any) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    /**
     * Build schema from data
     */
    private buildSchema(obj: any, prefix: string = ''): void {
        if (!obj || typeof obj !== 'object') return;

        for (const key in obj) {
            const path = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            
            this.schema[path] = this.getTypeOf(value);
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.buildSchema(value, path);
            }
        }
    }

    /**
     * Get formatted value for display
     */
    getFormattedValue(value: any) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        return String(value);
    }

    /**
     * Clear all loaded data
     */
    clear(): void {
        this.data = {};
        this.schema = {};
    }
}

/**
 * Global data context instance
 */
export const globalDataContext = new DataContext();

/**
 * Load data from specific import directives
 */
export function loadDataFromImports(imports: Array<{ alias: string; path: string }>): void {
    // Clear existing data first
    globalDataContext.clear();
    
    // Create a new data object to hold all imports
    const allImports: Record<string, any> = {};
    
    for (const import_ of imports) {
        try {
            const dataContext = new DataContext();
            dataContext.loadFromFile(import_.path);
            
            // Get the data using the public getValue method
            const importedData = dataContext.getValue('');
            if (importedData && typeof importedData === 'object') {
                // Store under the alias name
                allImports[import_.alias] = importedData;
            }
            
            console.log(`Loaded data from import: ${import_.alias} -> ${import_.path}`);
        } catch (error) {
            console.error(`Failed to load import ${import_.alias} from ${import_.path}:`, error);
        }
    }
    
    // Load all imports into the global context
    if (Object.keys(allImports).length > 0) {
        globalDataContext.loadFromObject(allImports);
    }
}
