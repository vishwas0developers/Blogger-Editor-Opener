chrome.action.onClicked.addListener(async (tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getBloggerPostInfo
    });
});

function getBloggerPostInfo() {
    let url = window.location.href;
    let postId = null;
    let pageId = null;
    let blogId = null;
    let pageType = null;
    let locale = null;

    console.log("🔍 Debug: Extracting Blogger post and blog ID with waterfall...");

    // 1️⃣ Extract from DOM Metadata (Standard and common patterns)
    const metaTags = {
        blogId: [
            "meta[itemprop='blogId']",
            "meta[name='blogger_blog_id']"
        ],
        postId: [
            "meta[itemprop='postId']",
            "meta[name='blogger_post_id']"
        ]
    };

    const getMetaContent = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute("content") : null;
    };

    blogId = getMetaContent("meta[itemprop='blogId']") || getMetaContent("meta[name='blogger_blog_id']");
    postId = getMetaContent("meta[itemprop='postId']") || getMetaContent("meta[name='blogger_post_id']");

    // 2️⃣ Extract from Feeds and Service Links (Highly reliable)
    if (!blogId) {
        const serviceLink = document.querySelector("link[rel='service.post'][type='application/atom+xml']");
        const alternateLink = document.querySelector("link[rel='alternate'][type='application/atom+xml']");
        const feedLink = (serviceLink || alternateLink);
        if (feedLink && feedLink.href) {
            const match = feedLink.href.match(/feeds\/(\d+)\//);
            if (match) {
                blogId = match[1];
                console.log("✅ Extracted blogId from feed link:", blogId);
            }
        }
    }

    // 3️⃣ Extract from Body Classes (Standard Blogger behavior)
    if (!blogId || !postId) {
        const bodyClass = document.body.className;
        const blogMatch = bodyClass.match(/blog-id-(\d+)/);
        const postMatch = bodyClass.match(/item-id-(\d+)/) || bodyClass.match(/post-id-(\d+)/);
        if (blogMatch && !blogId) blogId = blogMatch[1];
        if (postMatch && !postId) postId = postMatch[1];
    }

    // 4️⃣ Extract from Blogger inline script Context (Legacy/Standard)
    if (window._WidgetManager && window._WidgetManager._GetAllDataContexts) {
        try {
            let dataContexts = window._WidgetManager._GetAllDataContexts();
            let blogData = dataContexts.find(data => data.name === 'blog');
            let viewData = dataContexts.find(data => data.name === 'view');
            
            if (blogData && blogData.data) {
                if (!blogId) blogId = blogData.data.blogId;
                locale = blogData.data.localeUnderscoreDelimited || blogData.data.locale;
            }
            if (viewData && viewData.data) {
                if (!pageType) pageType = viewData.data.pageType;
                if (!postId && viewData.data.postId) postId = viewData.data.postId;
                if (!pageId && viewData.data.pageId) pageId = viewData.data.pageId;
            }
        } catch (error) {
            console.error("❌ Error extracting from _WidgetManager:", error);
        }
    }

    // 5️⃣ Extraction from script tags (Enhanced Regex fallback)
    if (!blogId || !postId || !pageId) {
        document.querySelectorAll("script").forEach(script => {
            const content = script.textContent;
            const blogMatch = content.match(/['"]blogId['"]\s*:\s*['"]?(\d+)['"]?/);
            const postMatch = content.match(/['"]postId['"]\s*:\s*['"]?(\d+)['"]?/);
            const pageMatch = content.match(/['"]pageId['"]\s*:\s*['"]?(\d+)['"]?/);
            const typeMatch = content.match(/['"]pageType['"]\s*:\s*['"]([^'"]+)['"]?/);
            const locMatch = content.match(/['"]localeUnderscoreDelimited['"]\s*:\s*['"]([^'"]+)['"]?/);

            if (blogMatch && !blogId) blogId = blogMatch[1];
            if (postMatch && !postId) postId = postMatch[1];
            if (pageMatch && !pageId) pageId = pageMatch[1];
            if (typeMatch && !pageType) pageType = typeMatch[1];
            if (locMatch && !locale) locale = locMatch[1];
        });
    }

    // Final mapping and validation
    locale = locale || 'en-GB';
    if (!pageType) {
        if (url.includes('/p/')) pageType = 'static_page';
        else if (postId) pageType = 'item';
    }

    console.log(`📊 Detection Result: blogId=${blogId}, postId=${postId}, pageId=${pageId}, pageType=${pageType}`);

    let editURL = null;
    if (blogId) {
        if ((pageType === 'static_page' || url.includes('/p/')) && pageId) {
            editURL = `https://www.blogger.com/blog/page/edit/${blogId}/${pageId}?hl=${locale}`;
        } else if (postId) {
            editURL = `https://www.blogger.com/blog/post/edit/${blogId}/${postId}`;
        }
    }

    if (editURL) {
        window.open(editURL, "_blank");
    } else {
        console.error("❌ Identification failed.");
        alert(`Blogger ID detection failed.\n\nValues found:\nblogId: ${blogId || 'NotFound'}\npostId: ${postId || 'NotFound'}\npageId: ${pageId || 'NotFound'}\npageType: ${pageType || 'Unknown'}\n\nPlease try this on a standard post or page.`);
    }
}
