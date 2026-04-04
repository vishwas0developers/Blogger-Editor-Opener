chrome.action.onClicked.addListener(async (tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        function: getBloggerPostInfo
    });
});

function getBloggerPostInfo() {
    let url = window.location.href;
    let postId = null;
    let pageId = null;
    let blogId = null;
    let pageType = null;
    let locale = 'en-GB';

    console.log("🔍 Blogger Post Editor: Extracting Context-Aware IDs...");

    // ──────────────────────────────────────────────────────────
    // PRE-STEP: Early Detection of Page Type (Important for prioritization)
    // ──────────────────────────────────────────────────────────
    if (url.includes('/p/')) {
        pageType = 'static_page';
    } else if (url.includes('.html')) {
        const postPattern = /\/\d{4}\/\d{2}\//;
        if (postPattern.test(url)) {
            pageType = 'item';
        }
    }

    // ──────────────────────────────────────────────────────────
    // 1️⃣  _WidgetManager (Primary source via world: 'MAIN')
    // ──────────────────────────────────────────────────────────
    if (window._WidgetManager && window._WidgetManager._GetAllDataContexts) {
        try {
            let dataContexts = window._WidgetManager._GetAllDataContexts();
            let blogData = dataContexts.find(data => data.name === 'blog');
            let viewData = dataContexts.find(data => data.name === 'view');

            if (blogData && blogData.data) {
                blogId = blogId || blogData.data.blogId;
                locale = blogData.data.localeUnderscoreDelimited || blogData.data.locale || locale;
                
                if (!pageType && blogData.data.pageType) {
                    pageType = blogData.data.pageType;
                }
                if (pageType === 'static_page') {
                    pageId = pageId || blogData.data.pageId;
                }
            }
            if (viewData && viewData.data) {
                pageType = pageType || viewData.data.pageType;
                if (pageType === 'static_page') {
                    pageId = pageId || viewData.data.pageId;
                } else if (pageType === 'item') {
                    postId = postId || viewData.data.postId;
                    // Fallback to searching inside a post list if postId is not set but pageType is item
                    if (!postId && viewData.data.posts && viewData.data.posts.length > 0) {
                        postId = viewData.data.posts[0].id;
                    }
                }
            }
        } catch (error) {
            console.error("❌ [WidgetManager] Error:", error);
        }
    }

    // ──────────────────────────────────────────────────────────
    // 2️⃣  DOM-Based ID Extraction (Fallback)
    // ──────────────────────────────────────────────────────────
    const getMetaContent = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute("content") : null;
    };

    if (!blogId) {
        blogId = getMetaContent("meta[itemprop='blogId']") || getMetaContent("meta[name='blogger_blog_id']");
    }

    // New DOM pattern: searching for postID- in IDs
    if (!postId && !pageId) {
        const idElements = document.querySelectorAll("[id^='postID-'], [id^='postid-']");
        idElements.forEach(el => {
            const idMatch = el.id.match(/postID-(\d+)/i);
            if (idMatch) {
                if (pageType === 'static_page') pageId = idMatch[1];
                else postId = idMatch[1];
            }
        });
    }

    if (pageType === 'static_page') {
        if (!pageId) {
            pageId = getMetaContent("meta[itemprop='pageId']") || getMetaContent("meta[name='blogger_page_id']");
        }
    } else if (pageType === 'item') {
        if (!postId) {
            postId = getMetaContent("meta[itemprop='postId']") || getMetaContent("meta[name='blogger_post_id']");
        }
    }

    // ──────────────────────────────────────────────────────────
    // 3️⃣  Feed / Service Links  (blogId fallback)
    // ──────────────────────────────────────────────────────────
    if (!blogId) {
        const serviceLink = document.querySelector("link[rel='service.post'][type='application/atom+xml']");
        const alternateLink = document.querySelector("link[rel='alternate'][type='application/atom+xml']");
        const feedLink = serviceLink || alternateLink;
        if (feedLink && feedLink.href) {
            const match = feedLink.href.match(/feeds\/(\d+)\//);
            if (match) blogId = match[1];
        }
    }

    // ──────────────────────────────────────────────────────────
    // 4️⃣  Enhanced Regex Falling back to specific ID search
    // ──────────────────────────────────────────────────────────
    if (!blogId || (pageType === 'static_page' && !pageId) || (pageType === 'item' && !postId)) {
        document.querySelectorAll("script").forEach(script => {
            const content = script.textContent;
            if (!content) return;

            if (!blogId) {
                const m = content.match(/['"]blogId['"]\s*:\s*['"]?(\d+)['"]?/);
                if (m) blogId = m[1];
            }

            if (pageType === 'static_page') {
                if (!pageId) {
                    const m = content.match(/['"]pageId['"]\s*:\s*['"]?(\d+)['"]?/);
                    if (m) pageId = m[1];
                }
            } else if (pageType === 'item') {
                if (!postId) {
                    const m = content.match(/['"]postId['"]\s*:\s*['"]?(\d+)['"]?/);
                    if (m) postId = m[1];
                    // Also search for 'id': '...' within posts list
                    if (!postId) {
                        const postMatch = content.match(/['"]id['"]\s*:\s*['"]?(\d+)['"]?/);
                        if (postMatch) postId = postMatch[1];
                    }
                }
            }

            if (!pageType) {
                const m = content.match(/['"]pageType['"]\s*:\s*['"]([^'"]+)['"]/);
                if (m) pageType = m[1];
            }
        });
    }

    // Final Validation
    console.log(`📊 Mode: ${pageType || 'Detecting...'}`);
    console.log(`📊 Detected: blogId=${blogId || 'NOT_FOUND'}, postId=${postId || 'N/A'}, pageId=${pageId || 'N/A'}`);

    let editURL = null;
    if (blogId) {
        if (pageType === 'static_page' && (pageId || postId)) {
            const targetId = pageId || postId;
            editURL = `https://www.blogger.com/blog/page/edit/${blogId}/${targetId}?hl=${locale}`;
        } else if ((pageType === 'item' || !pageType) && (postId || pageId)) {
            const targetId = postId || pageId;
            editURL = `https://www.blogger.com/blog/post/edit/${blogId}/${targetId}?hl=${locale}`;
        }
    }

    if (editURL) {
        window.open(editURL, "_blank");
    } else {
        const missing = [];
        if (!blogId) missing.push("blogId");
        if (pageType === 'static_page' && !pageId && !postId) missing.push("pageId");
        if ((pageType === 'item' || !pageType) && !postId && !pageId) missing.push("postId");
        if (!pageType) missing.push("pageType (unable to determine if this is a post or page)");

        alert(
            `Identification Failed.\n\n` +
            `Page Type: ${pageType || 'Unknown'}\n` +
            `Blog ID: ${blogId || 'Not Found'}\n` +
            `${(pageType === 'static_page') ? 'Page ID' : 'Post ID'}: ${(postId || pageId || 'Not Found')}\n\n` +
            `Missing Values: ${missing.join(", ")}`
        );
    }
}
