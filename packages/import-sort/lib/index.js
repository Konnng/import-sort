"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyChanges = exports.sortImports = void 0;
const detectNewline = require("detect-newline");
const StyleAPI_1 = require("./style/StyleAPI");
function importSort(code, rawParser, rawStyle, file, options) {
    let style;
    const parser = typeof rawParser === "string" ? require(rawParser) : rawParser;
    if (typeof rawStyle === "string") {
        style = require(rawStyle);
        // eslint-disable-next-line
        if (style.default) {
            // eslint-disable-next-line
            style = style.default;
        }
    }
    else {
        style = rawStyle;
    }
    return sortImports(code, parser, style, file, options);
}
exports.default = importSort;
function sortImports(code, parser, style, file, options) {
    // eslint-disable-next-line
    const items = addFallback(style, file, options || {})(StyleAPI_1.default);
    const buckets = items.map(() => []);
    const imports = parser.parseImports(code, {
        file,
    });
    if (imports.length === 0) {
        return { code, changes: [] };
    }
    const eol = detectNewline.graceful(code);
    const changes = [];
    // Fill buckets
    for (const imported of imports) {
        let sortedImport = imported;
        const index = items.findIndex(item => {
            // eslint-disable-next-line
            sortedImport = sortNamedMembers(imported, item.sortNamedMembers);
            return !!item.match && item.match(sortedImport);
        });
        if (index !== -1) {
            buckets[index].push(sortedImport);
        }
    }
    // Sort buckets
    buckets.forEach((bucket, index) => {
        const { sort } = items[index];
        if (!sort) {
            return;
        }
        if (!Array.isArray(sort)) {
            bucket.sort(sort);
            return;
        }
        const sorters = sort;
        if (sorters.length === 0) {
            return;
        }
        const multiSort = (first, second) => {
            let sorterIndex = 0;
            let comparison = 0;
            while (comparison === 0 && sorters[sorterIndex]) {
                comparison = sorters[sorterIndex](first, second);
                sorterIndex += 1;
            }
            return comparison;
        };
        bucket.sort(multiSort);
    });
    let importsCode = "";
    // Track if we need to insert a separator
    let separator = false;
    buckets.forEach((bucket, index) => {
        if (bucket.length > 0 && separator) {
            importsCode += eol;
            separator = false;
        }
        bucket.forEach(imported => {
            // const sortedImport = sortNamedMembers(imported, items[index].sortNamedMembers);
            const importString = parser.formatImport(code, imported, eol);
            importsCode += importString + eol;
        });
        // Add separator but only when at least one import was already added
        if (items[index].separator && importsCode !== "") {
            separator = true;
        }
    });
    let sortedCode = code;
    // Remove imports
    imports
        .slice()
        .reverse()
        .forEach(imported => {
        let importEnd = imported.end;
        if (sortedCode.charAt(imported.end).match(/\s/)) {
            importEnd += 1;
        }
        changes.push({
            start: imported.start,
            end: importEnd,
            code: "",
            note: "import-remove",
        });
        sortedCode =
            sortedCode.slice(0, imported.start) +
                sortedCode.slice(importEnd, code.length);
    });
    const { start } = imports[0];
    // Split code at first original import
    let before = code.substring(0, start);
    let after = sortedCode.substring(start, sortedCode.length);
    const oldBeforeLength = before.length;
    const oldAfterLength = after.length;
    let beforeChange;
    let afterChange;
    // Collapse all whitespace into a single blank line
    before = before.replace(/[\t\v\f\r \u00a0\u2000-\u200b\u2028-\u2029\u3000]+$/, match => {
        beforeChange = {
            start: start - match.length,
            end: start,
            code: eol + eol,
            note: "before-collapse",
        };
        return eol + eol;
    });
    // Collapse all whitespace into a single new line
    after = after.replace(/^\s+/, match => {
        afterChange = {
            start,
            end: start + match.length,
            code: eol,
            note: "after-collapse",
        };
        return eol;
    });
    // Remove all whitespace at the beginning of the code
    if (before.match(/^\s+$/)) {
        beforeChange = {
            start: start - oldBeforeLength,
            end: start,
            code: "",
            note: "before-trim",
        };
        before = "";
    }
    // Remove all whitespace at the end of the code
    if (after.match(/^\s+$/)) {
        afterChange = {
            start,
            end: start + oldAfterLength,
            code: "",
            note: "after-trim",
        };
        after = "";
    }
    if (afterChange) {
        changes.push(afterChange);
    }
    if (beforeChange) {
        changes.push(beforeChange);
    }
    const change = {
        start: before.length,
        end: before.length,
        code: importsCode,
        note: "imports",
    };
    changes.push(change);
    if (code === before + importsCode + after) {
        return { code, changes: [] };
    }
    return {
        code: before + importsCode + after,
        changes,
    };
}
exports.sortImports = sortImports;
function sortNamedMembers(imported, rawSort) {
    const sort = rawSort;
    if (!sort) {
        return imported;
    }
    if (!Array.isArray(sort)) {
        const singleSortedImport = Object.assign({}, imported);
        singleSortedImport.namedMembers = [...imported.namedMembers].sort(sort);
        return singleSortedImport;
    }
    const sorters = sort;
    if (sorters.length === 0) {
        return imported;
    }
    const multiSort = (first, second) => {
        let sorterIndex = 0;
        let comparison = 0;
        while (comparison === 0 && sorters[sorterIndex]) {
            comparison = sorters[sorterIndex](first, second);
            sorterIndex += 1;
        }
        return comparison;
    };
    const sortedImport = Object.assign({}, imported);
    sortedImport.namedMembers = [...imported.namedMembers].sort(multiSort);
    return sortedImport;
}
function applyChanges(code, changes) {
    let changedCode = code;
    for (const change of changes) {
        changedCode =
            changedCode.slice(0, change.start) +
                change.code +
                changedCode.slice(change.end, changedCode.length);
    }
    return changedCode;
}
exports.applyChanges = applyChanges;
function addFallback(style, file, options) {
    return styleApi => {
        const items = [{ separator: true }, { match: styleApi.always }];
        return style(styleApi, file, options).concat(items);
    };
}
