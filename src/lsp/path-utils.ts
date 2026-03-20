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
        return normalize(decoded.replace('file://', '//')).replace(/\\/g, '/');
    }

    // Standard file URI conversion
    if (decoded.startsWith('file:///')) {
        let path = decoded.substring(8);
        // On Windows, file:///C:/path -> C:/path
        if (path.match(/^[A-Za-z]:/)) {
            return normalize(path).replace(/\\/g, '/');
        }
        // On Unix, file:///etc/passwd -> /etc/passwd
        return normalize('/' + path).replace(/\\/g, '/');
    }

    // Handle malformed URI like "file://test" (missing third slash)
    if (decoded.startsWith('file://')) {
        const path = decoded.substring(7);
        // If it looks like a path without drive letter, treat as relative path
        if (!path.match(/^[A-Za-z]:/)) {
            return normalize('./' + path).replace(/\\/g, '/');
        }
        return normalize(path).replace(/\\/g, '/');
    }

    return normalize(decoded).replace(/\\/g, '/');
}

/**
 * Converts a filesystem path to a URI string.
 */
export function pathToUri(path: string): string {
    let uriPath = path.replace(/\\/g, '/');
    
    // Ensure absolute paths start with / for URI
    // But keep drive letters as /C:/...
    if (uriPath.match(/^[A-Za-z]:/)) {
        return `file:///${uriPath}`;
    }
    
    if (!uriPath.startsWith('/')) {
        uriPath = '/' + uriPath;
    }
    
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
    const documentDir = dirname(uriToPath(documentUri));

    // 1. Absolute Path: Clean it and return
    if (isAbsolute(importPath)) {
        return safeRealPath(normalize(importPath).replace(/\\/g, '/'));
    }

    // 2. Relative Path (starts with ./ or ../)
    if (importPath.startsWith('.')) {
        const fullPath = join(documentDir, importPath);
        if (existsSync(fullPath)) {
            return safeRealPath(fullPath.replace(/\\/g, '/'));
        }
    }

    // 3. Workspace-relative resolution
    // Helpful for linter configs that assume the project root
    for (const folder of workspaceFolders) {
        const wsBase = uriToPath(folder);
        const candidate = join(wsBase, importPath);
        if (existsSync(candidate)) {
            return safeRealPath(candidate.replace(/\\/g, '/'));
        }
    }

    // 4. Node Modules Fallback (Optional)
    // If your linter needs to find plugins/configs in node_modules
    const nodeModulesPath = findInNodeModules(documentDir, importPath);
    if (nodeModulesPath) {
        return nodeModulesPath;
    }

    // Fallback to the most likely candidate
    return join(documentDir, importPath).replace(/\\/g, '/');
}

/**
 * Resolves symlinks safely. If the path doesn't exist, returns original.
 */
function safeRealPath(path: string): string {
    try {
        return existsSync(path) ? realpathSync(path).replace(/\\/g, '/') : path.replace(/\\/g, '/');
    } catch {
        return path.replace(/\\/g, '/');
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