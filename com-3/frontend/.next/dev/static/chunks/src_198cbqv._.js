(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/app/editor/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EditorPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$react$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/react/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$starter$2d$kit$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/starter-kit/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$underline$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-underline/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$text$2d$align$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-text-align/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$link$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-link/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$image$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-image/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$table$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-table/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$table$2d$row$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-table-row/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$table$2d$cell$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-table-cell/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$table$2d$header$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-table-header/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$font$2d$family$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-font-family/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$text$2d$style$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-text-style/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$color$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-color/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tiptap/extension-highlight/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/socket.io-client/build/esm/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ShareModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ShareModal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ReportsManagerModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ReportsManagerModal.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const SOCKET_URL = 'http://localhost:8001';
// IndexedDB Helper Functions
const openDB = ()=>{
    return new Promise((resolve, reject)=>{
        const request = indexedDB.open("DocumentOfflineDB", 1);
        request.onupgradeneeded = (e)=>{
            const db = e.target.result;
            if (!db.objectStoreNames.contains("pending_edits")) {
                db.createObjectStore("pending_edits", {
                    keyPath: "id"
                });
            }
        };
        request.onsuccess = (e)=>resolve(e.target.result);
        request.onerror = (e)=>reject(e.target.error);
    });
};
const savePendingEdit = async (docId, content, author, revisions)=>{
    try {
        const db = await openDB();
        const tx = db.transaction("pending_edits", "readwrite");
        const store = tx.objectStore("pending_edits");
        await new Promise((resolve, reject)=>{
            const request = store.put({
                id: docId,
                content,
                author,
                revisions,
                timestamp: Date.now()
            });
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    } catch (err) {
        console.error("Failed to write to IndexedDB", err);
    }
};
const getPendingEdit = async (docId)=>{
    try {
        const db = await openDB();
        const tx = db.transaction("pending_edits", "readonly");
        const store = tx.objectStore("pending_edits");
        return await new Promise((resolve, reject)=>{
            const request = store.get(docId);
            request.onsuccess = ()=>resolve(request.result);
            request.onerror = ()=>reject(request.error);
        });
    } catch (err) {
        console.error("Failed to read from IndexedDB", err);
        return null;
    }
};
const clearPendingEdit = async (docId)=>{
    try {
        const db = await openDB();
        const tx = db.transaction("pending_edits", "readwrite");
        const store = tx.objectStore("pending_edits");
        await new Promise((resolve, reject)=>{
            const request = store.delete(docId);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    } catch (err) {
        console.error("Failed to clear IndexedDB", err);
    }
};
const MenuBar = ({ editor, isOffline, syncStatus, toggleOffline, onSaveAndRename })=>{
    if (!editor) return null;
    const addImage = ()=>{
        const url = window.prompt('URL of the image:');
        if (url) editor.chain().focus().setImage({
            src: url
        }).run();
    };
    const setLink = ()=>{
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL of the link:', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({
            href: url
        }).run();
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "editor-toolbar",
        style: {
            flexWrap: 'wrap',
            justifyContent: 'space-between'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleBold().run(),
                        className: `toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`,
                        children: "Bold"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 108,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleItalic().run(),
                        className: `toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`,
                        children: "Italic"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 109,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleUnderline().run(),
                        className: `toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`,
                        children: "Underline"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '1px',
                            height: '24px',
                            background: 'var(--border-color)',
                            margin: '0 8px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 112,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleHeading({
                                level: 1
                            }).run(),
                        className: `toolbar-btn ${editor.isActive('heading', {
                            level: 1
                        }) ? 'active' : ''}`,
                        children: "H1"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 114,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleHeading({
                                level: 2
                            }).run(),
                        className: `toolbar-btn ${editor.isActive('heading', {
                            level: 2
                        }) ? 'active' : ''}`,
                        children: "H2"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 115,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleHeading({
                                level: 3
                            }).run(),
                        className: `toolbar-btn ${editor.isActive('heading', {
                            level: 3
                        }) ? 'active' : ''}`,
                        children: "H3"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 116,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '1px',
                            height: '24px',
                            background: 'var(--border-color)',
                            margin: '0 8px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 118,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        onChange: (e)=>editor.chain().focus().setFontFamily(e.target.value).run(),
                        className: "toolbar-btn",
                        style: {
                            border: '1px solid #d1d5db',
                            padding: '0.2rem'
                        },
                        value: editor.getAttributes('textStyle').fontFamily || '',
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "",
                                children: "Font"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 126,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "Arial",
                                children: "Arial"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 127,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "Times New Roman",
                                children: "Times New Roman"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 128,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "Courier New",
                                children: "Courier New"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 129,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "Georgia",
                                children: "Georgia"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 130,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 120,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "color",
                        onInput: (e)=>editor.chain().focus().setColor(e.target.value).run(),
                        value: editor.getAttributes('textStyle').color || '#000000',
                        title: "Text Color",
                        style: {
                            width: '30px',
                            height: '30px',
                            padding: '0',
                            border: 'none',
                            cursor: 'pointer',
                            background: 'transparent'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 133,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleHighlight().run(),
                        className: `toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`,
                        children: "Highlight"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 141,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleBlockquote().run(),
                        className: `toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`,
                        children: "Quote Border"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 142,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '1px',
                            height: '24px',
                            background: 'var(--border-color)',
                            margin: '0 8px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 144,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>document.querySelector('.ProseMirror')?.classList.toggle('page-border'),
                        className: "toolbar-btn",
                        children: "Page Border"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 146,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '1px',
                            height: '24px',
                            background: 'var(--border-color)',
                            margin: '0 8px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleBulletList().run(),
                        className: `toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`,
                        children: "Bullets"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 150,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().toggleOrderedList().run(),
                        className: `toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`,
                        children: "Numbered"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 151,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '1px',
                            height: '24px',
                            background: 'var(--border-color)',
                            margin: '0 8px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 153,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().setTextAlign('left').run(),
                        className: `toolbar-btn ${editor.isActive({
                            textAlign: 'left'
                        }) ? 'active' : ''}`,
                        children: "Align Left"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 155,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().setTextAlign('center').run(),
                        className: `toolbar-btn ${editor.isActive({
                            textAlign: 'center'
                        }) ? 'active' : ''}`,
                        children: "Align Center"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 156,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '1px',
                            height: '24px',
                            background: 'var(--border-color)',
                            margin: '0 8px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 158,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: setLink,
                        className: `toolbar-btn ${editor.isActive('link') ? 'active' : ''}`,
                        children: "Link"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 160,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: addImage,
                        className: "toolbar-btn",
                        children: "Image"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 161,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '1px',
                            height: '24px',
                            background: 'var(--border-color)',
                            margin: '0 8px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 163,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>editor.chain().focus().insertTable({
                                rows: 3,
                                cols: 3,
                                withHeaderRow: true
                            }).run(),
                        className: "toolbar-btn",
                        children: "Insert Table"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 165,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    editor.isActive('table') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>editor.chain().focus().addColumnAfter().run(),
                                className: "toolbar-btn",
                                children: "+ Col"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 168,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>editor.chain().focus().addRowAfter().run(),
                                className: "toolbar-btn",
                                children: "+ Row"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 169,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>editor.chain().focus().deleteTable().run(),
                                className: "toolbar-btn",
                                style: {
                                    color: 'var(--accent-rose)'
                                },
                                children: "Del Table"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 170,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 167,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'var(--bg-secondary)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444',
                                    display: 'inline-block'
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 176,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 'bold'
                                },
                                children: syncStatus === 'synced' ? 'Online' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline (Cached)'
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 183,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 175,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: toggleOffline,
                        className: "toolbar-btn",
                        style: {
                            background: isOffline ? '#10b981' : '#f59e0b',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                        },
                        children: isOffline ? 'Go Online & Sync' : 'Go Offline'
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 188,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onSaveAndRename,
                        className: "toolbar-btn",
                        style: {
                            background: '#10b981',
                            color: 'white',
                            fontWeight: 'bold'
                        },
                        children: "💾 Save & Rename"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 201,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 174,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/editor/page.tsx",
        lineNumber: 106,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = MenuBar;
function EditorPage() {
    _s();
    const location = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const navigate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const queryParams = new URLSearchParams(location.search);
    const docIdParam = queryParams.get('docId');
    const { user, isAuthenticated, openAuthModal } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [socket, setSocket] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [availableDocs, setAvailableDocs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedDocId, setSelectedDocId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(docIdParam || 'doc_collaborative_1');
    const [docDetails, setDocDetails] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Security & Modals State
    const [accessDenied, setAccessDenied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [accessDeniedInfo, setAccessDeniedInfo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [shareModalOpen, setShareModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [createModalOpen, setCreateModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [reportsModalOpen, setReportsModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [newDocTitle, setNewDocTitle] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [registeredUsersForCreate, setRegisteredUsersForCreate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedMembersForCreate, setSelectedMembersForCreate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Fetch users when create modal opens
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditorPage.useEffect": ()=>{
            if (createModalOpen) {
                fetch('http://localhost:8001/api/auth/users').then({
                    "EditorPage.useEffect": (res)=>res.json()
                }["EditorPage.useEffect"]).then({
                    "EditorPage.useEffect": (data)=>{
                        // Filter out current logged in user
                        const others = (data || []).filter({
                            "EditorPage.useEffect.others": (u)=>{
                                const cleanCur = (user?.username || user?.studentId || '').toLowerCase();
                                return (u.username || u.studentId || '').toLowerCase() !== cleanCur;
                            }
                        }["EditorPage.useEffect.others"]);
                        setRegisteredUsersForCreate(others);
                    }
                }["EditorPage.useEffect"]).catch({
                    "EditorPage.useEffect": (err)=>console.error("Failed to fetch users for creation modal", err)
                }["EditorPage.useEffect"]);
            }
        }
    }["EditorPage.useEffect"], [
        createModalOpen,
        user
    ]);
    // Offline Sync State
    const [isOffline, setIsOffline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [syncStatus, setSyncStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('synced');
    const [offlineRevisions, setOfflineRevisions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [lastText, setLastText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // Author Highlighting & Word-like layout state
    const [markupData, setMarkupData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedAuthorFilter, setSelectedAuthorFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('ALL');
    const [isHighlightMode, setIsHighlightMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [hoveredSegment, setHoveredSegment] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchMarkupData = ()=>{
        if (!selectedDocId) return;
        fetch(`http://localhost:8001/api/documents/${selectedDocId}/author-markup`).then((res)=>res.json()).then((data)=>setMarkupData(data)).catch((err)=>console.error("Failed to fetch markup data", err));
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditorPage.useEffect": ()=>{
            fetchMarkupData();
        }
    }["EditorPage.useEffect"], [
        selectedDocId
    ]);
    const effectiveAuthor = user ? `${user.name} (${user.studentId})` : 'Anonymous Student';
    // Handle URL param docId change
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditorPage.useEffect": ()=>{
            if (docIdParam) {
                setSelectedDocId(docIdParam);
            }
        }
    }["EditorPage.useEffect"], [
        docIdParam
    ]);
    const fetchDocs = ()=>{
        if (!user) return;
        const query = `username=${encodeURIComponent(user.username)}&studentId=${encodeURIComponent(user.studentId)}&role=${encodeURIComponent(user.role)}`;
        fetch(`http://localhost:8001/api/documents?${query}`).then((res)=>res.json()).then((data)=>setAvailableDocs(data || [])).catch((err)=>console.error("Failed to fetch documents", err));
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditorPage.useEffect": ()=>{
            if (user) {
                fetchDocs();
            }
        }
    }["EditorPage.useEffect"], [
        user
    ]);
    const fetchDocDetails = ()=>{
        if (!selectedDocId || !user) return;
        setAccessDenied(false);
        const query = `username=${encodeURIComponent(user.username)}&studentId=${encodeURIComponent(user.studentId)}&role=${encodeURIComponent(user.role)}`;
        fetch(`http://localhost:8001/api/documents/${selectedDocId}?${query}`).then(async (res)=>{
            const data = await res.json();
            if (res.status === 403 || data.isAccessDenied) {
                setAccessDenied(true);
                setAccessDeniedInfo(data);
            } else {
                setAccessDenied(false);
                setDocDetails(data);
            }
        }).catch((err)=>console.error("Failed to fetch doc details", err));
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditorPage.useEffect": ()=>{
            fetchDocDetails();
        }
    }["EditorPage.useEffect"], [
        selectedDocId,
        user
    ]);
    const isGoogleDoc = selectedDocId.startsWith('google_docs_') || docDetails?.source === 'google_docs';
    const isMSWord = selectedDocId.startsWith('microsoft_365_') || docDetails?.source === 'microsoft_365';
    const isExternalDoc = isGoogleDoc || isMSWord;
    const editor = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$react$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useEditor"])({
        extensions: [
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$starter$2d$kit$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$underline$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Underline"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$text$2d$align$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TextAlign"].configure({
                types: [
                    'heading',
                    'paragraph'
                ]
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$link$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Link"].configure({
                openOnClick: false
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$image$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Image"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$table$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Table"].configure({
                resizable: true
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$table$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableRow"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$table$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHeader"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$table$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$text$2d$style$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TextStyle"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$text$2d$style$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FontFamily"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$text$2d$style$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Color"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$extension$2d$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Highlight"]
        ],
        content: '<p>Loading document...</p>',
        onUpdate: {
            "EditorPage.useEditor[editor]": ({ editor })=>{
                if (!isAuthenticated || accessDenied) return;
                const html = editor.getHTML();
                const plainText = editor.getText();
                if (isOffline) {
                    const oldWords = lastText.split(/\s+/).filter(Boolean).length;
                    const newWords = plainText.split(/\s+/).filter(Boolean).length;
                    let added = 0;
                    let deleted = 0;
                    if (newWords > oldWords) {
                        added = newWords - oldWords;
                    } else if (newWords < oldWords) {
                        deleted = oldWords - newWords;
                    }
                    if (added > 0 || deleted > 0) {
                        const newRev = {
                            author: effectiveAuthor,
                            timestamp: new Date(),
                            addedText: added > 0 ? `Offline typing: +${added} words` : "",
                            deletedText: deleted > 0 ? `Offline deletion: -${deleted} words` : "",
                            wordCountAdded: added,
                            wordCountDeleted: deleted,
                            section: "Offline Session"
                        };
                        setOfflineRevisions({
                            "EditorPage.useEditor[editor]": (prev)=>{
                                const updated = [
                                    ...prev,
                                    newRev
                                ];
                                savePendingEdit(selectedDocId, html, effectiveAuthor, updated);
                                return updated;
                            }
                        }["EditorPage.useEditor[editor]"]);
                    } else {
                        savePendingEdit(selectedDocId, html, effectiveAuthor, offlineRevisions);
                    }
                    setSyncStatus('offline');
                } else {
                    if (socket) {
                        socket.emit('send-changes', {
                            documentId: selectedDocId,
                            content: html,
                            author: effectiveAuthor
                        });
                    }
                }
                setLastText(plainText);
            }
        }["EditorPage.useEditor[editor]"]
    });
    // Setup Socket Connection with Security Guard
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditorPage.useEffect": ()=>{
            if (!isAuthenticated || !user || isOffline || accessDenied) return;
            const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])(SOCKET_URL);
            setSocket(s);
            s.on('connect', {
                "EditorPage.useEffect": ()=>{
                    s.emit('join-document', {
                        documentId: selectedDocId,
                        username: user.username,
                        studentId: user.studentId,
                        role: user.role
                    });
                }
            }["EditorPage.useEffect"]);
            s.on('access-denied', {
                "EditorPage.useEffect": (info)=>{
                    setAccessDenied(true);
                    setAccessDeniedInfo(info);
                }
            }["EditorPage.useEffect"]);
            s.on('load-document', {
                "EditorPage.useEffect": (content)=>{
                    if (editor && !editor.isDestroyed) {
                        editor.commands.setContent(content);
                        setLastText(editor.getText());
                    }
                }
            }["EditorPage.useEffect"]);
            s.on('receive-changes', {
                "EditorPage.useEffect": (content)=>{
                    if (editor && !editor.isDestroyed) {
                        const currentSelection = editor.state.selection;
                        editor.commands.setContent(content, false);
                        editor.commands.setTextSelection(currentSelection);
                        setLastText(editor.getText());
                    }
                }
            }["EditorPage.useEffect"]);
            return ({
                "EditorPage.useEffect": ()=>{
                    s.disconnect();
                }
            })["EditorPage.useEffect"];
        }
    }["EditorPage.useEffect"], [
        isAuthenticated,
        user,
        editor,
        isOffline,
        selectedDocId,
        accessDenied
    ]);
    // Auto-Detect Network Connection Loss (Wi-Fi off / Internet Disconnect)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditorPage.useEffect": ()=>{
            const handleOnline = {
                "EditorPage.useEffect.handleOnline": async ()=>{
                    console.log("Network restored. Syncing IndexedDB offline cache...");
                    setSyncStatus('syncing');
                    try {
                        const pending = await getPendingEdit(selectedDocId);
                        if (pending && pending.revisions && pending.revisions.length > 0) {
                            const response = await fetch(`http://localhost:8001/api/documents/${selectedDocId}/sync-offline`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    content: pending.content,
                                    offlineRevisions: pending.revisions
                                })
                            });
                            if (response.ok) {
                                await clearPendingEdit(selectedDocId);
                                setOfflineRevisions([]);
                            }
                        }
                    } catch (err) {
                        console.error("Auto sync error:", err);
                    } finally{
                        setIsOffline(false);
                        setSyncStatus('synced');
                    }
                }
            }["EditorPage.useEffect.handleOnline"];
            const handleOffline = {
                "EditorPage.useEffect.handleOffline": ()=>{
                    console.log("Network connection lost. Automatically switching to IndexedDB Offline Mode...");
                    setIsOffline(true);
                    setSyncStatus('offline');
                    if (socket) {
                        socket.disconnect();
                        setSocket(null);
                    }
                }
            }["EditorPage.useEffect.handleOffline"];
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            return ({
                "EditorPage.useEffect": ()=>{
                    window.removeEventListener('online', handleOnline);
                    window.removeEventListener('offline', handleOffline);
                }
            })["EditorPage.useEffect"];
        }
    }["EditorPage.useEffect"], [
        selectedDocId,
        socket
    ]);
    // Handle Manual Offline Toggle
    const toggleOffline = async ()=>{
        if (!isOffline) {
            setIsOffline(true);
            setSyncStatus('offline');
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        } else {
            setSyncStatus('syncing');
            try {
                const pending = await getPendingEdit(selectedDocId);
                if (pending && pending.revisions && pending.revisions.length > 0) {
                    const response = await fetch(`http://localhost:8001/api/documents/${selectedDocId}/sync-offline`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            content: pending.content,
                            offlineRevisions: pending.revisions
                        })
                    });
                    if (response.ok) {
                        await clearPendingEdit(selectedDocId);
                        setOfflineRevisions([]);
                        alert("Offline changes synced to server successfully!");
                    } else {
                        alert("Warning: Failed to sync offline edits with server.");
                    }
                }
            } catch (err) {
                console.error("Synchronization error", err);
            } finally{
                setIsOffline(false);
                setSyncStatus('synced');
            }
        }
    };
    const handleCreateDocument = async (e)=>{
        e.preventDefault();
        if (!newDocTitle.trim()) return;
        try {
            const res = await fetch('http://localhost:8001/api/documents/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newDocTitle.trim(),
                    owner: user.username,
                    ownerName: user.name,
                    studentId: user.studentId,
                    members: selectedMembersForCreate
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create document');
            setCreateModalOpen(false);
            setNewDocTitle('');
            setSelectedMembersForCreate([]);
            fetchDocs();
            setSelectedDocId(data.document._id);
        } catch (err) {
            alert(`Error creating document: ${err.message}`);
        }
    };
    const handleRenameDocument = async (customTitle = null)=>{
        if (!selectedDocId || !user) return;
        const currentTitle = docDetails?.title || selectedDocId;
        const newTitle = customTitle !== null ? customTitle : window.prompt("Rename Document Title:", currentTitle);
        if (newTitle === null || !newTitle.trim()) return;
        if (newTitle.trim() === currentTitle && customTitle === null) return;
        try {
            const res = await fetch(`http://localhost:8001/api/documents/${selectedDocId}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    username: user.username,
                    studentId: user.studentId,
                    role: user.role
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to rename document');
            setDocDetails((prev)=>prev ? {
                    ...prev,
                    title: data.title
                } : null);
            fetchDocs();
            alert(`Document renamed successfully to "${data.title}"!`);
        } catch (err) {
            alert(`Error renaming document: ${err.message}`);
        }
    };
    const handleSaveAndRename = ()=>{
        const currentTitle = docDetails?.title || selectedDocId;
        const promptTitle = window.prompt("Save Document - Enter or update document title:", currentTitle);
        if (promptTitle === null) return;
        if (promptTitle.trim() && promptTitle.trim() !== currentTitle) {
            handleRenameDocument(promptTitle.trim());
        } else {
            alert(`Document "${currentTitle}" saved successfully!`);
        }
    };
    const handleDeleteActiveDocument = async ()=>{
        if (!selectedDocId || !user) return;
        const title = docDetails?.title || selectedDocId;
        const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${title}"?\n\nThis will purge all content and revision history. This action cannot be undone.`);
        if (!confirmDelete) return;
        try {
            const query = `username=${encodeURIComponent(user.username)}&studentId=${encodeURIComponent(user.studentId)}&role=${encodeURIComponent(user.role)}`;
            const res = await fetch(`http://localhost:8001/api/documents/${selectedDocId}?${query}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete document');
            alert("Document deleted successfully!");
            const updated = availableDocs.filter((d)=>d._id !== selectedDocId);
            setAvailableDocs(updated);
            if (updated.length > 0) {
                setSelectedDocId(updated[0]._id);
            } else {
                setSelectedDocId('doc_collaborative_1');
            }
        } catch (err) {
            alert(`Error deleting document: ${err.message}`);
        }
    };
    // Require Authentication Screen
    if (!isAuthenticated) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "login-overlay",
            style: {
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "login-box",
                style: {
                    maxWidth: '520px',
                    width: '100%',
                    padding: '2.5rem',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary, #1e293b)',
                    border: '1px solid var(--border-color, #334155)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                    textAlign: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: '3rem',
                            marginBottom: '0.75rem'
                        },
                        children: "🔐"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 647,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        style: {
                            color: 'var(--text-primary, #f8fafc)',
                            marginBottom: '0.5rem',
                            fontSize: '1.5rem',
                            fontWeight: 600
                        },
                        children: "Student Authentication Required"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 648,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: 'var(--text-secondary, #94a3b8)',
                            fontSize: '0.9rem',
                            marginBottom: '1.5rem',
                            lineHeight: '1.5'
                        },
                        children: "To accurately recognize who is working on the document and enforce group security permissions, please log in or create a student account."
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 651,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: openAuthModal,
                        style: {
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            color: 'white',
                            width: '100%',
                            padding: '0.9rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                        },
                        children: "Sign In / Register Account"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 655,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 637,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/editor/page.tsx",
            lineNumber: 630,
            columnNumber: 7
        }, this);
    }
    // Access Denied Security Screen
    if (accessDenied) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "access-denied-screen",
            style: {
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    maxWidth: '540px',
                    width: '100%',
                    padding: '2.5rem',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary, #1e293b)',
                    border: '1px solid #ef4444',
                    boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2)',
                    textAlign: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: '3.5rem',
                            marginBottom: '0.5rem'
                        },
                        children: "🚫"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 697,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        style: {
                            color: '#fca5a5',
                            margin: '0 0 0.5rem 0',
                            fontSize: '1.6rem',
                            fontWeight: 600
                        },
                        children: "Access Denied — Restricted Document"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 698,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: '#94a3b8',
                            fontSize: '0.92rem',
                            marginBottom: '1.5rem',
                            lineHeight: '1.5'
                        },
                        children: [
                            "You do not have permission to view or edit this document. Only members explicitly granted permission by the group leader (",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                children: accessDeniedInfo?.ownerName || 'Group Leader'
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 702,
                                columnNumber: 135
                            }, this),
                            ") can access it."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 701,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: '#0f172a',
                            padding: '1.25rem',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            textAlign: 'left',
                            marginBottom: '1.5rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                style: {
                                    display: 'block',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#cbd5e1',
                                    marginBottom: '0.5rem'
                                },
                                children: "Switch to an Authorized Document:"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 706,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: selectedDocId,
                                onChange: (e)=>{
                                    setSelectedDocId(e.target.value);
                                    setAccessDenied(false);
                                },
                                style: {
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid #475569',
                                    background: '#1e293b',
                                    color: '#fff',
                                    outline: 'none'
                                },
                                children: availableDocs.map((doc)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: doc._id,
                                        children: doc.title || doc._id
                                    }, doc._id, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 723,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 709,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 705,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '0.75rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setReportsModalOpen(true),
                                style: {
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #38bdf8',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    color: '#38bdf8',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                },
                                children: "📁 View All My Reports"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 731,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCreateModalOpen(true),
                                style: {
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                },
                                children: "+ Create My Own Group Document"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 747,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 730,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 687,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/editor/page.tsx",
            lineNumber: 680,
            columnNumber: 7
        }, this);
    }
    const wordCount = editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `editor-container ${isGoogleDoc ? 'google-docs-mode' : isMSWord ? 'ms-word-mode' : ''}`,
        style: {
            display: 'flex',
            flexDirection: 'column'
        },
        children: [
            isGoogleDoc && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "google-docs-header",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#4285F4',
                                            color: 'white',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '1.2rem'
                                        },
                                        children: "≡"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 778,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        onClick: ()=>handleRenameDocument(),
                                                        title: "Click to rename document",
                                                        style: {
                                                            margin: 0,
                                                            fontSize: '1rem',
                                                            color: '#202124',
                                                            fontWeight: '500',
                                                            cursor: 'pointer'
                                                        },
                                                        children: [
                                                            docDetails?.title || selectedDocId,
                                                            " ✏️"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 783,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            cursor: 'pointer',
                                                            color: '#5f6368',
                                                            fontSize: '1.1rem'
                                                        },
                                                        children: "☆"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 790,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '0.75rem',
                                                            color: '#70757a',
                                                            background: '#e8f0fe',
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: '12px'
                                                        },
                                                        children: "☁️ Saved to Drive & DocAnalytics"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 791,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 782,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "google-docs-menubar",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "File"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 796,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Edit"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 797,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "View"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 798,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Insert"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 799,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Format"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 800,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Tools"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 801,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Extensions"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 802,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "Help"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 803,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 795,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 781,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 777,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleRenameDocument(),
                                        style: {
                                            background: '#e8f0fe',
                                            color: '#1a73e8',
                                            border: '1px solid #c2e7ff',
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '16px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        },
                                        children: "✏️ Rename"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 809,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setReportsModalOpen(true),
                                        style: {
                                            background: '#e8f0fe',
                                            color: '#1a73e8',
                                            border: '1px solid #c2e7ff',
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '16px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        },
                                        children: "📁 All Reports"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 825,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setCreateModalOpen(true),
                                        style: {
                                            background: '#e8f0fe',
                                            color: '#1a73e8',
                                            border: '1px solid #c2e7ff',
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '16px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        },
                                        children: "+ New Doc"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 841,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setShareModalOpen(true),
                                        style: {
                                            background: '#1a73e8',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.45rem 1rem',
                                            borderRadius: '24px',
                                            fontWeight: '600',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        },
                                        children: "🔒 Share"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 857,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleDeleteActiveDocument,
                                        style: {
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            color: '#ef4444',
                                            border: '1px solid #ef4444',
                                            padding: '0.35rem 0.65rem',
                                            borderRadius: '16px',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        },
                                        children: "🗑️ Delete"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 876,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 808,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 776,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "google-docs-ruler",
                        children: "1 · · · 2 · · · 3 · · · 4 · · · 5 · · · 6 · · · 7 · · · 8"
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 893,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 775,
                columnNumber: 9
            }, this),
            isMSWord && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "word-top-bar",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            background: '#005a9e',
                                            color: 'white',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '3px',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem'
                                        },
                                        children: "W"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 904,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            background: 'rgba(255,255,255,0.2)',
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "AutoSave"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 908,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                style: {
                                                    background: '#10b981',
                                                    padding: '0.05rem 0.3rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.7rem'
                                                },
                                                children: "ON"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 909,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 907,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        onClick: ()=>handleRenameDocument(),
                                        title: "Click to rename document",
                                        style: {
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        },
                                        children: [
                                            docDetails?.title || selectedDocId,
                                            " ✏️ — Word 365"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 911,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 903,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleRenameDocument(),
                                        style: {
                                            background: 'rgba(255,255,255,0.2)',
                                            color: '#fff',
                                            border: '1px solid rgba(255,255,255,0.4)',
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        },
                                        children: "✏️ Rename"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 921,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setReportsModalOpen(true),
                                        style: {
                                            background: 'rgba(255,255,255,0.2)',
                                            color: '#fff',
                                            border: '1px solid rgba(255,255,255,0.4)',
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        },
                                        children: "📁 All Reports"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 937,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setCreateModalOpen(true),
                                        style: {
                                            background: 'rgba(255,255,255,0.2)',
                                            color: '#fff',
                                            border: '1px solid rgba(255,255,255,0.4)',
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        },
                                        children: "+ New Doc"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 953,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setShareModalOpen(true),
                                        style: {
                                            background: 'white',
                                            color: '#0078d4',
                                            border: 'none',
                                            padding: '0.35rem 0.8rem',
                                            borderRadius: '4px',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        },
                                        children: "🔒 Share"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 969,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleDeleteActiveDocument,
                                        style: {
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.35rem 0.65rem',
                                            borderRadius: '4px',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        },
                                        children: "🗑️ Delete"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 985,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 920,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 902,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "word-ribbon-tabs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "word-ribbon-tab active",
                                children: "Home"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1004,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "word-ribbon-tab",
                                children: "Insert"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1005,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "word-ribbon-tab",
                                children: "Layout"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1006,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "word-ribbon-tab",
                                children: "References"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1007,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "word-ribbon-tab",
                                children: "Review"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1008,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "word-ribbon-tab",
                                children: "View"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1009,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 1003,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 901,
                columnNumber: 9
            }, this),
            !isExternalDoc && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'var(--bg-secondary)',
                    padding: '0.75rem 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        onClick: ()=>handleRenameDocument(),
                                        title: "Click to rename document",
                                        style: {
                                            margin: 0,
                                            fontSize: '1rem',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer'
                                        },
                                        children: docDetails?.title || selectedDocId
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 1026,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleRenameDocument(),
                                        style: {
                                            background: 'transparent',
                                            border: '1px solid var(--border-color)',
                                            color: '#38bdf8',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer'
                                        },
                                        children: "✏️ Rename"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 1033,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1025,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)'
                                },
                                children: [
                                    "Owner: ",
                                    docDetails?.ownerName || docDetails?.owner || 'Group Leader',
                                    " • In-Built Collaborative Workspace"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1048,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 1024,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setReportsModalOpen(true),
                                style: {
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                },
                                children: "📁 All Reports"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1054,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCreateModalOpen(true),
                                style: {
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                },
                                children: "+ Create Group Doc"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1070,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShareModalOpen(true),
                                style: {
                                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                },
                                children: "🔒 Share"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1086,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleDeleteActiveDocument,
                                style: {
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#fca5a5',
                                    border: '1px solid #ef4444',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                },
                                children: "🗑️ Delete"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1102,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 1053,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 1016,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MenuBar, {
                editor: editor,
                isOffline: isOffline,
                syncStatus: syncStatus,
                toggleOffline: toggleOffline,
                onSaveAndRename: handleSaveAndRename
            }, void 0, false, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 1122,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    flex: 1,
                    overflow: 'hidden'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            flex: 3,
                            padding: '1.5rem',
                            overflowY: 'auto',
                            background: '#f1f5f9',
                            display: 'flex',
                            justifyContent: 'center'
                        },
                        children: isHighlightMode ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: '#fff',
                                border: '1px solid #cbd5e1',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                padding: '4rem',
                                width: '100%',
                                maxWidth: '850px',
                                minHeight: '1056px',
                                fontFamily: 'Arial, sans-serif'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '2rem',
                                        borderBottom: '2px solid #e2e8f0',
                                        paddingBottom: '1rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            style: {
                                                margin: 0,
                                                color: '#334155'
                                            },
                                            children: docDetails?.title || 'Document'
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1146,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>{
                                                setIsHighlightMode(false);
                                                setSelectedAuthorFilter('ALL');
                                            },
                                            style: {
                                                background: '#ef4444',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            },
                                            children: "✖ Close Highlight Mode"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1147,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/editor/page.tsx",
                                    lineNumber: 1145,
                                    columnNumber: 15
                                }, this),
                                markupData?.segments?.map((seg)=>{
                                    const isMatched = selectedAuthorFilter === 'ALL' || seg.author === selectedAuthorFilter;
                                    const authorColor = seg.color || '#4285f4';
                                    const authorBg = seg.bgColor || 'rgba(66, 133, 244, 0.2)';
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        onMouseEnter: ()=>setHoveredSegment(seg.id),
                                        onMouseLeave: ()=>setHoveredSegment(null),
                                        style: {
                                            background: isMatched ? authorBg : 'transparent',
                                            opacity: isMatched ? 1 : 0.4,
                                            filter: isMatched ? 'none' : 'grayscale(100%)',
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            marginBottom: '0.5rem',
                                            borderLeft: isMatched ? `4px solid ${authorColor}` : '4px solid transparent',
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        },
                                        children: [
                                            hoveredSegment === seg.id && isMatched && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    position: 'absolute',
                                                    top: '-20px',
                                                    left: '0',
                                                    background: '#1e293b',
                                                    color: '#fff',
                                                    fontSize: '0.7rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 'bold'
                                                },
                                                children: [
                                                    seg.author,
                                                    " • ",
                                                    seg.words,
                                                    " words"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 1178,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                dangerouslySetInnerHTML: {
                                                    __html: seg.html
                                                },
                                                style: {
                                                    color: '#0f172a'
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 1182,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, seg.id, true, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 1161,
                                        columnNumber: 19
                                    }, this);
                                })
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/editor/page.tsx",
                            lineNumber: 1135,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "editor-content-wrapper",
                            style: {
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$react$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["EditorContent"], {
                                editor: editor
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1193,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/editor/page.tsx",
                            lineNumber: 1188,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 1133,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            flex: 1,
                            maxWidth: '350px',
                            background: 'var(--bg-secondary)',
                            borderLeft: '1px solid var(--border-color)',
                            padding: '1.5rem',
                            overflowY: 'auto'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                style: {
                                    margin: '0 0 1rem 0',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                },
                                children: "👥 Collaborators"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1207,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '1.5rem',
                                    lineHeight: 1.5
                                },
                                children: "Click a contributor's name to isolate and highlight their specific contributions to the document."
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1210,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem'
                                },
                                children: markupData?.authors?.length > 0 ? markupData.authors.map((a)=>{
                                    const isActive = selectedAuthorFilter === a.author;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        onClick: ()=>{
                                            if (isActive) {
                                                setSelectedAuthorFilter('ALL');
                                                setIsHighlightMode(false);
                                            } else {
                                                setSelectedAuthorFilter(a.author);
                                                setIsHighlightMode(true);
                                            }
                                        },
                                        style: {
                                            background: isActive ? a.bgColor : 'rgba(255, 255, 255, 0.05)',
                                            border: `1px solid ${isActive ? a.borderColor || a.color : 'var(--border-color)'}`,
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: isActive ? `0 4px 12px ${a.borderColor || a.color}33` : 'none'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginBottom: '0.5rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            width: '14px',
                                                            height: '14px',
                                                            borderRadius: '50%',
                                                            background: a.color || '#3b82f6',
                                                            boxShadow: `0 0 8px ${a.color || '#3b82f6'}`
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 1241,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        style: {
                                                            color: 'var(--text-primary)',
                                                            fontSize: '0.95rem'
                                                        },
                                                        children: a.author
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 1242,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 1240,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-secondary)'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            a.totalWordsAdded,
                                                            " words"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 1245,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        style: {
                                                            color: a.color || '#3b82f6'
                                                        },
                                                        children: [
                                                            a.percentage,
                                                            "%"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/editor/page.tsx",
                                                        lineNumber: 1246,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 1244,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    width: '100%',
                                                    height: '5px',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '3px',
                                                    marginTop: '0.5rem'
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        width: `${a.percentage}%`,
                                                        height: '100%',
                                                        background: a.color || '#3b82f6',
                                                        borderRadius: '3px'
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/editor/page.tsx",
                                                    lineNumber: 1250,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 1249,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, a.author, true, {
                                        fileName: "[project]/src/app/editor/page.tsx",
                                        lineNumber: 1219,
                                        columnNumber: 19
                                    }, this);
                                }) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.85rem',
                                        textAlign: 'center',
                                        padding: '2rem 0',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '8px',
                                        border: '1px dashed var(--border-color)'
                                    },
                                    children: [
                                        "No contribution data found yet.",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1257,
                                            columnNumber: 48
                                        }, this),
                                        "Wait for ML analysis to run."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/editor/page.tsx",
                                    lineNumber: 1256,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1214,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 1199,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 1131,
                columnNumber: 7
            }, this),
            isMSWord && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "word-status-bar",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '1.5rem',
                            alignItems: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Page 1 of 1"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1268,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    wordCount,
                                    " words"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1269,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "English (United States)"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1270,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                style: {
                                    background: '#10b981',
                                    color: 'white',
                                    padding: '0.05rem 0.4rem',
                                    borderRadius: '10px',
                                    fontSize: '0.7rem'
                                },
                                children: "🟢 Live Sync Active"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1271,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 1267,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '1rem',
                            alignItems: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Focus Mode"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1276,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "100% ──────◯──────"
                            }, void 0, false, {
                                fileName: "[project]/src/app/editor/page.tsx",
                                lineNumber: 1277,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/editor/page.tsx",
                        lineNumber: 1275,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 1266,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ReportsManagerModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                isOpen: reportsModalOpen,
                onClose: ()=>setReportsModalOpen(false),
                onSelectDocument: (id)=>setSelectedDocId(id),
                onShareDocument: (doc)=>{
                    setSelectedDocId(doc._id);
                    setShareModalOpen(true);
                },
                onDocumentDeleted: (deletedId)=>{
                    setAvailableDocs((prev)=>prev.filter((d)=>d._id !== deletedId));
                    if (selectedDocId === deletedId) {
                        fetchDocs();
                    }
                }
            }, void 0, false, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 1283,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ShareModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                isOpen: shareModalOpen,
                onClose: ()=>setShareModalOpen(false),
                documentId: selectedDocId,
                docDetails: docDetails,
                onShareUpdated: (updatedDoc)=>{
                    setDocDetails(updatedDoc);
                    fetchDocs();
                }
            }, void 0, false, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 1300,
                columnNumber: 7
            }, this),
            createModalOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                    backdropFilter: 'blur(4px)'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: 'var(--bg-secondary, #1e293b)',
                        border: '1px solid var(--border-color, #334155)',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '440px',
                        width: '90%',
                        color: '#f8fafc'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                margin: '0 0 0.5rem 0',
                                color: '#38bdf8'
                            },
                            children: "📄 Create New Group Document"
                        }, void 0, false, {
                            fileName: "[project]/src/app/editor/page.tsx",
                            lineNumber: 1329,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                color: '#94a3b8',
                                fontSize: '0.85rem',
                                marginBottom: '1.25rem'
                            },
                            children: "You will be set as the Document Owner. You can then grant sharing permission to your group members."
                        }, void 0, false, {
                            fileName: "[project]/src/app/editor/page.tsx",
                            lineNumber: 1330,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: handleCreateDocument,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1.25rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                display: 'block',
                                                fontSize: '0.85rem',
                                                color: '#cbd5e1',
                                                marginBottom: '0.35rem'
                                            },
                                            children: "Document Title:"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1336,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            required: true,
                                            placeholder: "e.g. Group 4 - System Architecture Report",
                                            value: newDocTitle,
                                            onChange: (e)=>setNewDocTitle(e.target.value),
                                            style: {
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '6px',
                                                border: '1px solid #475569',
                                                background: '#0f172a',
                                                color: '#fff',
                                                outline: 'none'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1339,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/editor/page.tsx",
                                    lineNumber: 1335,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: '1.25rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '0.85rem',
                                                color: '#cbd5e1',
                                                marginBottom: '0.5rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "👥 Select Initial Group Members (Optional):"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/editor/page.tsx",
                                                    lineNumber: 1360,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontSize: '0.75rem',
                                                        color: '#38bdf8'
                                                    },
                                                    children: [
                                                        selectedMembersForCreate.length,
                                                        " Selected"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/editor/page.tsx",
                                                    lineNumber: 1361,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1359,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                maxHeight: '150px',
                                                overflowY: 'auto',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                background: '#0f172a',
                                                padding: '0.5rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.35rem'
                                            },
                                            children: registeredUsersForCreate.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    color: '#64748b',
                                                    fontSize: '0.8rem',
                                                    padding: '0.5rem',
                                                    textAlign: 'center'
                                                },
                                                children: "No other registered members found. You can also share later using the Share button."
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/editor/page.tsx",
                                                lineNumber: 1376,
                                                columnNumber: 21
                                            }, this) : registeredUsersForCreate.map((u)=>{
                                                const userIdentifier = u.username || u.studentId || u.email;
                                                const displayName = u.name ? `${u.name} (${userIdentifier})` : userIdentifier;
                                                const isSelected = selectedMembersForCreate.includes(userIdentifier);
                                                const toggleMember = ()=>{
                                                    if (isSelected) {
                                                        setSelectedMembersForCreate((prev)=>prev.filter((id)=>id !== userIdentifier));
                                                    } else {
                                                        setSelectedMembersForCreate((prev)=>[
                                                                ...prev,
                                                                userIdentifier
                                                            ]);
                                                    }
                                                };
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    onClick: toggleMember,
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.6rem',
                                                        padding: '0.4rem 0.6rem',
                                                        borderRadius: '6px',
                                                        background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                                        border: `1px solid ${isSelected ? '#38bdf8' : 'transparent'}`,
                                                        cursor: 'pointer',
                                                        fontSize: '0.82rem',
                                                        transition: 'all 0.15s ease'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: isSelected,
                                                            onChange: ()=>{},
                                                            style: {
                                                                cursor: 'pointer',
                                                                accentColor: '#38bdf8'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/editor/page.tsx",
                                                            lineNumber: 1410,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                flex: 1,
                                                                color: isSelected ? '#f8fafc' : '#cbd5e1'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: displayName
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/editor/page.tsx",
                                                                    lineNumber: 1417,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        fontSize: '0.72rem',
                                                                        color: '#94a3b8',
                                                                        marginLeft: '0.4rem'
                                                                    },
                                                                    children: [
                                                                        "(",
                                                                        u.role || 'student',
                                                                        ")"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/editor/page.tsx",
                                                                    lineNumber: 1418,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/editor/page.tsx",
                                                            lineNumber: 1416,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, u._id || userIdentifier, true, {
                                                    fileName: "[project]/src/app/editor/page.tsx",
                                                    lineNumber: 1394,
                                                    columnNumber: 25
                                                }, this);
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1364,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/editor/page.tsx",
                                    lineNumber: 1358,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        gap: '0.5rem',
                                        justifyContent: 'flex-end'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>{
                                                setCreateModalOpen(false);
                                                setSelectedMembersForCreate([]);
                                            },
                                            style: {
                                                background: '#334155',
                                                border: 'none',
                                                color: '#cbd5e1',
                                                padding: '0.6rem 1rem',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            },
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1430,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            style: {
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                border: 'none',
                                                color: '#fff',
                                                fontWeight: 'bold',
                                                padding: '0.6rem 1.25rem',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            },
                                            children: "Create Document"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/editor/page.tsx",
                                            lineNumber: 1440,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/editor/page.tsx",
                                    lineNumber: 1429,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/editor/page.tsx",
                            lineNumber: 1334,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/editor/page.tsx",
                    lineNumber: 1320,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/editor/page.tsx",
                lineNumber: 1313,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/editor/page.tsx",
        lineNumber: 771,
        columnNumber: 5
    }, this);
}
_s(EditorPage, "GisVL29TqzYrFoGFc3DU6TLkptw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tiptap$2f$react$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useEditor"]
    ];
});
_c1 = EditorPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "MenuBar");
__turbopack_context__.k.register(_c1, "EditorPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ReportsManagerModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ReportsManagerModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AuthContext.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function ReportsManagerModal({ isOpen, onClose, onSelectDocument, onShareDocument, onDocumentDeleted }) {
    _s();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [documents, setDocuments] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [deletingId, setDeletingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchAllReports = async ()=>{
        if (!isOpen || !user) return;
        setLoading(true);
        setError('');
        try {
            const query = `username=${encodeURIComponent(user.username)}&studentId=${encodeURIComponent(user.studentId)}&role=${encodeURIComponent(user.role)}`;
            const res = await fetch(`http://localhost:8001/api/documents?${query}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load documents');
            setDocuments(data || []);
        } catch (err) {
            setError(err.message);
        } finally{
            setLoading(false);
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ReportsManagerModal.useEffect": ()=>{
            fetchAllReports();
        }
    }["ReportsManagerModal.useEffect"], [
        isOpen,
        user
    ]);
    if (!isOpen) return null;
    const handleRename = async (docId, currentTitle, e)=>{
        e.stopPropagation();
        const newTitle = window.prompt("Rename Document Title:", currentTitle);
        if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) return;
        try {
            const res = await fetch(`http://localhost:8001/api/documents/${docId}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    username: user?.username,
                    studentId: user?.studentId,
                    role: user?.role
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to rename document');
            setDocuments((prev)=>prev.map((d)=>d._id === docId ? {
                        ...d,
                        title: data.title
                    } : d));
        } catch (err) {
            alert(`Error renaming document: ${err.message}`);
        }
    };
    const handleDelete = async (docId, docTitle, e)=>{
        e.stopPropagation();
        const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${docTitle || docId}"?\n\nThis will remove the document and all associated revision history. This action cannot be undone.`);
        if (!confirmDelete) return;
        setDeletingId(docId);
        setError('');
        try {
            const query = `username=${encodeURIComponent(user.username)}&studentId=${encodeURIComponent(user.studentId)}&role=${encodeURIComponent(user.role)}`;
            const res = await fetch(`http://localhost:8001/api/documents/${docId}?${query}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete document');
            setDocuments((prev)=>prev.filter((d)=>d._id !== docId));
            if (onDocumentDeleted) onDocumentDeleted(docId);
        } catch (err) {
            alert(`Error deleting document: ${err.message}`);
        } finally{
            setDeletingId(null);
        }
    };
    const filteredDocs = documents.filter((doc)=>{
        const term = searchTerm.toLowerCase();
        const titleMatch = (doc.title || doc._id).toLowerCase().includes(term);
        const ownerMatch = (doc.ownerName || doc.owner || '').toLowerCase().includes(term);
        const sourceMatch = (doc.source || '').toLowerCase().includes(term);
        return titleMatch || ownerMatch || sourceMatch;
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "reports-modal-overlay",
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(6px)'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "reports-modal-box",
            style: {
                background: 'var(--bg-secondary, #1e293b)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: '14px',
                padding: '2rem',
                maxWidth: '850px',
                width: '92%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.5)',
                color: '#f8fafc'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.25rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    style: {
                                        margin: 0,
                                        fontSize: '1.4rem',
                                        fontWeight: 600,
                                        color: '#38bdf8'
                                    },
                                    children: "📁 All Created Reports & Documents"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                    lineNumber: 129,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontSize: '0.85rem',
                                        color: '#94a3b8'
                                    },
                                    children: "View all project documents, rename titles, manage permissions, or delete unwanted reports."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                    lineNumber: 132,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ReportsManagerModal.tsx",
                            lineNumber: 128,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            style: {
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '1.75rem',
                                cursor: 'pointer',
                                padding: '0 0.5rem'
                            },
                            children: "×"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ReportsManagerModal.tsx",
                            lineNumber: 136,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ReportsManagerModal.tsx",
                    lineNumber: 127,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        marginBottom: '1.25rem'
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        placeholder: "🔍 Search reports by title, owner name, or source...",
                        value: searchTerm,
                        onChange: (e)=>setSearchTerm(e.target.value),
                        style: {
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #475569',
                            background: '#0f172a',
                            color: '#fff',
                            outline: 'none',
                            fontSize: '0.95rem'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                        lineNumber: 153,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/ReportsManagerModal.tsx",
                    lineNumber: 152,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                    },
                    children: [
                        "⚠️ ",
                        error
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ReportsManagerModal.tsx",
                    lineNumber: 172,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '0.25rem'
                    },
                    children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#94a3b8'
                        },
                        children: "⏳ Loading created reports..."
                    }, void 0, false, {
                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                        lineNumber: 180,
                        columnNumber: 13
                    }, this) : filteredDocs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            padding: '3rem',
                            background: '#0f172a',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            color: '#94a3b8'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '2.5rem',
                                    marginBottom: '0.5rem'
                                },
                                children: "📄"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                lineNumber: 185,
                                columnNumber: 15
                            }, this),
                            "No reports found matching your criteria."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                        lineNumber: 184,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.85rem'
                        },
                        children: filteredDocs.map((doc)=>{
                            const isG = doc._id.startsWith('google_docs_') || doc.source === 'google_docs';
                            const isM = doc._id.startsWith('microsoft_365_') || doc.source === 'microsoft_365';
                            const sourceBadge = isG ? 'Google Docs' : isM ? 'MS Word' : 'In-Built';
                            const badgeBg = isG ? '#4285F4' : isM ? '#0078d4' : '#10b981';
                            const ownerText = doc.ownerName || doc.owner || 'Group Leader';
                            const collabsCount = doc.collaborators ? doc.collaborators.length : 1;
                            const formattedDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A';
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '10px',
                                    padding: '1rem 1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem',
                                    transition: 'border-color 0.2s ease'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            flex: 1,
                                            minWidth: '220px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.6rem',
                                                    marginBottom: '0.25rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '0.7rem',
                                                            background: badgeBg,
                                                            color: '#fff',
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '10px',
                                                            fontWeight: 'bold'
                                                        },
                                                        children: sourceBadge
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                        lineNumber: 218,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                        style: {
                                                            margin: 0,
                                                            fontSize: '1.05rem',
                                                            color: '#f8fafc',
                                                            fontWeight: 600
                                                        },
                                                        children: doc.title || doc._id
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                        lineNumber: 221,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                lineNumber: 217,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: '0.8rem',
                                                    color: '#94a3b8',
                                                    display: 'flex',
                                                    gap: '1rem',
                                                    flexWrap: 'wrap',
                                                    marginTop: '0.35rem'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "👑 Owner: ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                style: {
                                                                    color: '#e2e8f0'
                                                                },
                                                                children: ownerText
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                                lineNumber: 226,
                                                                columnNumber: 41
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                        lineNumber: 226,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "👥 Collaborators: ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                style: {
                                                                    color: '#e2e8f0'
                                                                },
                                                                children: collabsCount
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                                lineNumber: 227,
                                                                columnNumber: 49
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                        lineNumber: 227,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "📅 Created: ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                style: {
                                                                    color: '#e2e8f0'
                                                                },
                                                                children: formattedDate
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                                lineNumber: 228,
                                                                columnNumber: 43
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                        lineNumber: 228,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                lineNumber: 225,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                        lineNumber: 216,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>{
                                                    onSelectDocument(doc._id);
                                                    onClose();
                                                },
                                                style: {
                                                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '0.45rem 0.85rem',
                                                    borderRadius: '6px',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer'
                                                },
                                                children: "👁️ Open"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                lineNumber: 233,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: (e)=>handleRename(doc._id, doc.title || doc._id, e),
                                                style: {
                                                    background: '#334155',
                                                    color: '#e2e8f0',
                                                    border: '1px solid #475569',
                                                    padding: '0.45rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer'
                                                },
                                                children: "✏️ Rename"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                lineNumber: 249,
                                                columnNumber: 23
                                            }, this),
                                            onShareDocument && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>{
                                                    onShareDocument(doc);
                                                },
                                                style: {
                                                    background: '#334155',
                                                    color: '#38bdf8',
                                                    border: '1px solid #475569',
                                                    padding: '0.45rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer'
                                                },
                                                children: "🔒 Share"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                lineNumber: 266,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                disabled: deletingId === doc._id,
                                                onClick: (e)=>handleDelete(doc._id, doc.title, e),
                                                style: {
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#fca5a5',
                                                    border: '1px solid #ef4444',
                                                    padding: '0.45rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.85rem',
                                                    cursor: deletingId === doc._id ? 'not-allowed' : 'pointer',
                                                    opacity: deletingId === doc._id ? 0.6 : 1
                                                },
                                                children: deletingId === doc._id ? 'Deleting...' : '🗑️ Delete'
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                                lineNumber: 283,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                        lineNumber: 232,
                                        columnNumber: 21
                                    }, this)
                                ]
                            }, doc._id, true, {
                                fileName: "[project]/src/components/ReportsManagerModal.tsx",
                                lineNumber: 201,
                                columnNumber: 19
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/ReportsManagerModal.tsx",
                        lineNumber: 189,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/ReportsManagerModal.tsx",
                    lineNumber: 178,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        marginTop: '1.25rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #334155',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            style: {
                                fontSize: '0.8rem',
                                color: '#94a3b8'
                            },
                            children: [
                                "Total Reports: ",
                                filteredDocs.length
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ReportsManagerModal.tsx",
                            lineNumber: 310,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            style: {
                                background: '#334155',
                                color: '#fff',
                                border: 'none',
                                padding: '0.5rem 1.25rem',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            },
                            children: "Close"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ReportsManagerModal.tsx",
                            lineNumber: 313,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ReportsManagerModal.tsx",
                    lineNumber: 309,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ReportsManagerModal.tsx",
            lineNumber: 113,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ReportsManagerModal.tsx",
        lineNumber: 100,
        columnNumber: 5
    }, this);
}
_s(ReportsManagerModal, "jHevh+fVAXim5rJX2dMgJEH5c3U=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = ReportsManagerModal;
var _c;
__turbopack_context__.k.register(_c, "ReportsManagerModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ShareModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ShareModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AuthContext.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function ShareModal({ isOpen, onClose, documentId, docDetails, onShareUpdated }) {
    _s();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [targetIdentifier, setTargetIdentifier] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [registeredUsers, setRegisteredUsers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [successMsg, setSuccessMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const ownerName = docDetails?.ownerName || docDetails?.owner || 'Group Leader';
    const allowedUsers = docDetails?.allowedUsers || [];
    const collaborators = docDetails?.collaborators || [];
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ShareModal.useEffect": ()=>{
            if (isOpen) {
                setError('');
                setSuccessMsg('');
                fetch('http://localhost:8001/api/auth/users').then({
                    "ShareModal.useEffect": (res)=>res.json()
                }["ShareModal.useEffect"]).then({
                    "ShareModal.useEffect": (data)=>setRegisteredUsers(data || [])
                }["ShareModal.useEffect"]).catch({
                    "ShareModal.useEffect": (err)=>console.error("Failed to load registered users", err)
                }["ShareModal.useEffect"]);
            }
        }
    }["ShareModal.useEffect"], [
        isOpen
    ]);
    if (!isOpen || !documentId) return null;
    const handleShare = async (e, identifierToShare = null, action = 'add')=>{
        if (e) e.preventDefault();
        const identifier = identifierToShare || targetIdentifier;
        if (!identifier || !identifier.trim()) {
            setError('Please enter or select a Student ID, Username, or Email.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            const res = await fetch(`http://localhost:8001/api/documents/${documentId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentUsername: user?.username || user?.studentId || '',
                    targetUserIdentifier: identifier.trim(),
                    action
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update document access permissions');
            }
            setSuccessMsg(action === 'remove' ? `Access revoked for ${identifier}` : `Access granted successfully to ${identifier}`);
            setTargetIdentifier('');
            if (onShareUpdated) onShareUpdated(data.document);
        } catch (err) {
            setError(err.message);
        } finally{
            setLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "share-modal-overlay",
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(5px)'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "share-modal-box",
            style: {
                background: 'var(--bg-secondary, #1e293b)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '520px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
                color: '#f8fafc'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.25rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    style: {
                                        margin: 0,
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        color: '#38bdf8'
                                    },
                                    children: "🔒 Document Access & Group Security"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ShareModal.tsx",
                                    lineNumber: 96,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontSize: '0.8rem',
                                        color: '#94a3b8'
                                    },
                                    children: docDetails?.title || documentId
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ShareModal.tsx",
                                    lineNumber: 99,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 95,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            style: {
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                padding: '0 0.5rem'
                            },
                            children: "×"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 103,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ShareModal.tsx",
                    lineNumber: 94,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        color: '#38bdf8',
                                        fontWeight: 'bold'
                                    },
                                    children: "Group Leader / Document Owner"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ShareModal.tsx",
                                    lineNumber: 130,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.95rem',
                                        fontWeight: 'bold',
                                        color: '#fff',
                                        marginTop: '0.1rem'
                                    },
                                    children: [
                                        "👑 ",
                                        ownerName
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ShareModal.tsx",
                                    lineNumber: 133,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 129,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            style: {
                                fontSize: '0.75rem',
                                background: '#0284c7',
                                color: '#fff',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '12px',
                                fontWeight: 'bold'
                            },
                            children: "Private Group"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 137,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ShareModal.tsx",
                    lineNumber: 119,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        padding: '0.65rem 0.9rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        marginBottom: '1rem'
                    },
                    children: [
                        "⚠️ ",
                        error
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ShareModal.tsx",
                    lineNumber: 144,
                    columnNumber: 11
                }, this),
                successMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid #10b981',
                        color: '#6ee7b7',
                        padding: '0.65rem 0.9rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        marginBottom: '1rem'
                    },
                    children: [
                        "✅ ",
                        successMsg
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ShareModal.tsx",
                    lineNumber: 149,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: (e)=>handleShare(e, null, 'add'),
                    style: {
                        marginBottom: '1.5rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            style: {
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#cbd5e1',
                                marginBottom: '0.4rem'
                            },
                            children: "Grant Access to Student:"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 156,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                gap: '0.5rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    placeholder: "Enter Student ID, Username, or Email",
                                    value: targetIdentifier,
                                    onChange: (e)=>setTargetIdentifier(e.target.value),
                                    style: {
                                        flex: 1,
                                        padding: '0.7rem',
                                        borderRadius: '8px',
                                        border: '1px solid #475569',
                                        background: '#0f172a',
                                        color: '#fff',
                                        outline: 'none',
                                        fontSize: '0.9rem'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ShareModal.tsx",
                                    lineNumber: 160,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    disabled: loading,
                                    style: {
                                        padding: '0.7rem 1.25rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        cursor: loading ? 'not-allowed' : 'pointer'
                                    },
                                    children: loading ? 'Adding...' : 'Grant Access'
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ShareModal.tsx",
                                    lineNumber: 176,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 159,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ShareModal.tsx",
                    lineNumber: 155,
                    columnNumber: 9
                }, this),
                registeredUsers.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        marginBottom: '1.5rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: '0.8rem',
                                color: '#94a3b8',
                                marginBottom: '0.5rem'
                            },
                            children: "Quick Select Registered Students:"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 197,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.4rem',
                                maxHeight: '100px',
                                overflowY: 'auto'
                            },
                            children: registeredUsers.filter((u)=>u.username !== user?.username && !allowedUsers.includes(u.username) && !allowedUsers.includes(u.studentId)).map((u)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>handleShare(null, u.username, 'add'),
                                    style: {
                                        background: '#334155',
                                        border: '1px solid #475569',
                                        color: '#e2e8f0',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '16px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    },
                                    children: [
                                        "+ ",
                                        u.name,
                                        " (",
                                        u.studentId,
                                        ")"
                                    ]
                                }, u._id, true, {
                                    fileName: "[project]/src/components/ShareModal.tsx",
                                    lineNumber: 204,
                                    columnNumber: 19
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 200,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ShareModal.tsx",
                    lineNumber: 196,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#cbd5e1',
                                marginBottom: '0.6rem'
                            },
                            children: [
                                "Members With Permission (",
                                collaborators.length || allowedUsers.length,
                                "):"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 227,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: '#0f172a',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                padding: '0.5rem',
                                maxHeight: '160px',
                                overflowY: 'auto'
                            },
                            children: (collaborators.length > 0 ? collaborators : allowedUsers).map((collab)=>{
                                const isOwner = collab.includes(ownerName) || collab === ownerName;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.5rem 0.75rem',
                                        borderBottom: '1px solid #1e293b'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontSize: '1rem'
                                                    },
                                                    children: "👤"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ShareModal.tsx",
                                                    lineNumber: 252,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontSize: '0.85rem',
                                                        color: '#f1f5f9',
                                                        fontWeight: 500
                                                    },
                                                    children: collab
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ShareModal.tsx",
                                                    lineNumber: 253,
                                                    columnNumber: 21
                                                }, this),
                                                isOwner && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        fontSize: '0.7rem',
                                                        background: '#f59e0b',
                                                        color: '#000',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '10px',
                                                        fontWeight: 'bold'
                                                    },
                                                    children: "Owner"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ShareModal.tsx",
                                                    lineNumber: 257,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ShareModal.tsx",
                                            lineNumber: 251,
                                            columnNumber: 19
                                        }, this),
                                        !isOwner && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>handleShare(null, collab, 'remove'),
                                            style: {
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                border: '1px solid #ef4444',
                                                color: '#fca5a5',
                                                fontSize: '0.75rem',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            },
                                            children: "Revoke"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ShareModal.tsx",
                                            lineNumber: 263,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, collab, true, {
                                    fileName: "[project]/src/components/ShareModal.tsx",
                                    lineNumber: 241,
                                    columnNumber: 17
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/src/components/ShareModal.tsx",
                            lineNumber: 230,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ShareModal.tsx",
                    lineNumber: 226,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ShareModal.tsx",
            lineNumber: 83,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ShareModal.tsx",
        lineNumber: 70,
        columnNumber: 5
    }, this);
}
_s(ShareModal, "m3aqdwRL03AfO86zFkhCmMZnixs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = ShareModal;
var _c;
__turbopack_context__.k.register(_c, "ShareModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_198cbqv._.js.map