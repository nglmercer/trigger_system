import { dirname, join, isAbsolute, normalize, resolve } from 'path';
import { existsSync, realpathSync } from 'fs';

/**
 * Robustly converts a URI string to a filesystem path.
 * Uses a more reliable regex for Windows drive letters and handles UNC paths.
 */
export function uriToPath(uri: string): string {
    let decoded = decodeURIComponent(uri);
    
    // Handle Windows UNC paths (e.g., file://server/share)
    if (decoded.startsWith('file://') && !decoded.startsWith('file:///')) {
        return normalize(decoded.replace('file://', '\\\\'));
    }

    // Standard file URI conversion
    if (decoded.startsWith('file:///')) {
        let path = decoded.substring(8);
        // On Windows, file:///C:/path -> C:/path
        if (path.match(/^[A-Za-z]:/)) {
            return normalize(path);
        }
        // On Unix, file:///etc/passwd -> /etc/passwd
        return normalize('/' + path);
    }

    // Handle malformed URI like "file://test" (missing third slash)
    if (decoded.startsWith('file://')) {
        const path = decoded.substring(7);
        // If it looks like a path without drive letter, treat as relative path
        if (!path.match(/^[A-Za-z]:/)) {
            return normalize('./' + path);
        }
        return normalize(path);
    }

    return normalize(decoded);
}

/**
 * Converts a filesystem path to a URI string.
 */
export function pathToUri(path: string): string {
    let uriPath = path.replace(/\\/g, '/');
    if (!uriPath.startsWith('/')) {
        uriPath = '/' + uriPath;
    }
    // Handle Windows drive letters
    if (uriPath.match(/^\/[A-Za-z]:/)) {
        // file:///C:/path
        return `file://${uriPath}`;
    }
    // Unix
    return `file://${uriPath}`;
}

/**
 * Resolves an import path with support for:
 * 1. Relative paths
 * 2. Workspace root resolution
 * 3. node_modules fallback (optional)
 * 4. Symlink resolution
 */
export function resolveImportPath(
    documentUri: string,
    importPath: string,
    workspaceFolders: string[] = []
): string {
    console.log(`[LSP] resolveImportPath called:`);
    console.log(`[LSP]   Document URI: ${documentUri}`);
    console.log(`[LSP]   Import path: ${importPath}`);
    
    const documentDir = dirname(uriToPath(documentUri));
    console.log(`[LSP]   Document dir: ${documentDir}`);

    // 1. Absolute Path: Clean it and return
    if (isAbsolute(importPath)) {
        console.log(`[LSP]   Resolving as absolute path`);
        const resolved = safeRealPath(normalize(importPath));
        console.log(`[LSP]   Resolved path: ${resolved}`);
        return resolved;
    }

    // 2. Relative Path (starts with ./ or ../)
    if (importPath.startsWith('.')) {
        const fullPath = join(documentDir, importPath);
        console.log(`[LSP]   Trying relative path: ${fullPath}`);
        if (existsSync(fullPath)) {
            const resolved = safeRealPath(fullPath);
            console.log(`[LSP]   Resolved path (exists): ${resolved}`);
            return resolved;
        }
        console.log(`[LSP]   Relative path does not exist`);
    }

    // 3. Workspace-relative resolution
    // Helpful for linter configs that assume the project root
    console.log(`[LSP]   Checking workspace folders: ${JSON.stringify(workspaceFolders)}`);
    for (const folder of workspaceFolders) {
        const wsBase = uriToPath(folder);
        const candidate = join(wsBase, importPath);
        console.log(`[LSP]   Trying workspace-relative: ${candidate}`);
        if (existsSync(candidate)) {
            const resolved = safeRealPath(candidate);
            console.log(`[LSP]   Resolved path (workspace): ${resolved}`);
            return resolved;
        }
    }

    // 4. Node Modules Fallback (Optional)
    // If your linter needs to find plugins/configs in node_modules
    const nodeModulesPath = findInNodeModules(documentDir, importPath);
    if (nodeModulesPath) {
        console.log(`[LSP]   Resolved path (node_modules): ${nodeModulesPath}`);
        return nodeModulesPath;
    }

    // Fallback to the most likely candidate
    const fallback = join(documentDir, importPath);
    console.log(`[LSP]   Using fallback path: ${fallback}`);
    return fallback;
}

/**
 * Resolves symlinks safely. If the path doesn't exist, returns original.
 */
function safeRealPath(path: string): string {
    try {
        return existsSync(path) ? realpathSync(path) : path;
    } catch {
        return path;
    }
}

/**
 * Recursively looks for an import in node_modules up the directory tree.
 */
function findInNodeModules(startDir: string, importPath: string): string | null {
    let current = startDir;
    while (current !== dirname(current)) { // Stop at root
        const candidate = join(current, 'node_modules', importPath);
        if (existsSync(candidate)) return safeRealPath(candidate);
        current = dirname(current);
    }
    return null;
}