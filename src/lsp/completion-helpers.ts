// src/lsp/completion-helpers.ts
/**
 * Helper functions for LSP completions
 * Contains utility functions for path finding, context detection, etc.
 */

import { parseDocument, isMap, isSeq, isPair, isScalar, type Node, Scalar, YAMLMap, Pair, YAMLSeq } from 'yaml';
import type { TextDocument, Position } from 'vscode-languageserver/node';

/**
 * Find the path of nodes at a given offset in the YAML document
 */
export function findPathAtOffset(node: Node | Pair | null, offset: number, currentPath: (Node | Pair)[] = []): (Node | Pair)[] | null {
    if (!node) return null;

    // Check range
    const range = (node as Node).range;
    if (range) {
        // [start, end, optional_something]
        // Parser range is [start, end].
        // We want to be inclusive and a bit more for completions at the end of a line.
    }

    const newPath = [...currentPath, node];

    if (isMap(node)) {
        for (const item of node.items) {
            if (isPair(item)) {
                const pair = item as Pair;
                if (pair.key && typeof pair.key === 'object' && 'range' in pair.key) {
                    const keyNode = pair.key as Node;
                    if (keyNode.range && offset >= keyNode.range[0] && offset <= keyNode.range[1] + 1) {
                        return findPathAtOffset(item, offset, newPath);
                    }
                }
                if (pair.value && typeof pair.value === 'object' && 'range' in pair.value) {
                    const valueNode = pair.value as Node;
                    if (valueNode.range && offset >= valueNode.range[0] && offset <= valueNode.range[1] + 1) {
                        return findPathAtOffset(item, offset, newPath);
                    }
                }
            }
        }
        return newPath;
    }

    if (isSeq(node)) {
        for (const item of node.items) {
            const itemRange = (item as Node).range;
            if (itemRange && offset >= itemRange[0] && offset <= itemRange[1] + 1) {
                return findPathAtOffset(item as Node, offset, newPath);
            }
        }
        return newPath;
    }

    if (isPair(node)) {
        const keyRange = (node.key as Node)?.range;
        if (keyRange && offset >= keyRange[0] && offset <= keyRange[1] + 1) {
            return findPathAtOffset(node.key as Node, offset, newPath);
        }

        if (node.value) {
            const valRange = (node.value as Node)?.range;
            if (valRange && offset >= valRange[0] && offset <= valRange[1] + 1) {
                return findPathAtOffset(node.value as Node, offset, newPath);
            }
        }

        return newPath;
    }
    return newPath;
}

/**
 * Check if a node is a key of its parent pair
 */
export function isKeyOfParent(node: Scalar, path: (Node | Pair)[]): boolean {
    const parent = path[path.length - 2];
    if (isPair(parent)) return parent.key === node;
    return false;
}

/**
 * Find the effective parent pair in the path
 */
export function findEffectiveParentPair(path: (Node | Pair)[]): Pair | null {
    for (let i = path.length - 1; i >= 0; i--) {
        const item = path[i];
        if (isPair(item)) return item;
    }
    return null;
}

/**
 * Find the nearest action map in the path
 */
export function findNearestActionMap(path: (Node | Pair)[]): YAMLMap | null {
    for (let i = path.length - 1; i >= 0; i--) {
        const item = path[i];
        if (isMap(item)) {
            const hasType = item.items.some(p => isPair(p) && String((p.key as Scalar).value) === 'type');
            if (hasType) return item;
        }
    }
    return null;
}

/**
 * Find the path at a given position in a text document
 */
export function getPathAtPosition(document: TextDocument, position: Position): (Node | Pair)[] | null {
    const text = document.getText();
    const doc = parseDocument(text);
    const offset = document.offsetAt(position);
    return findPathAtOffset(doc.contents, offset);
}
