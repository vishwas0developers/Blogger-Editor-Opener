# Blogger Editor Opener

A Chrome extension that opens Blogger posts and pages directly in the Blogger Console editor. Skip the dashboard navigation and jump straight to editing from any live Blogger site – including custom domains.

## Features

- **One-Click Access**: Instantly open any Blogger post or page directly in the Blogger Console editor
- **Custom Domain Support**: Works seamlessly with both `blogspot.com` and custom domains
- **Smart Detection**: Automatically identifies whether you're viewing a post or a static page
- **Multi-Layer ID Extraction**: Uses multiple fallback methods to reliably find blog, post, and page IDs:
  - `_WidgetManager` data contexts (primary source)
  - Meta tags (DOM-based fallback)
  - Atom feed/service links
  - Regex pattern matching in scripts
- **Locale Aware**: Preserves your Blogger language preferences when opening the editor

## Installation

### From Source (Developer Mode)

1. **Download or Clone** this repository to your local machine
2. Open Google Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the extension folder (`Blogger-Editor-Opener`)
6. The extension icon should now appear in your Chrome toolbar

## Usage

1. Navigate to any Blogger post or page (on `blogspot.com` or a custom domain)
2. Click the **Blogger Editor Opener** extension icon in your toolbar
3. A new tab will open directly in the Blogger Console editor for that specific post or page

### Supported Page Types

| Page Type | URL Pattern | Editor Opens To |
|-----------|-------------|-----------------|
| Blog Post | `/YYYY/MM/post-slug.html` | Post Editor |
| Static Page | `/p/page-slug.html` | Page Editor |

## How It Works

The extension extracts the necessary IDs from the current page using multiple detection methods:

1. **WidgetManager API**: Accesses Blogger's internal `_WidgetManager._GetAllDataContexts()` to retrieve `blogId`, `postId`, `pageId`, and `pageType`
2. **Meta Tags**: Looks for `<meta>` tags with `itemprop` or `name` attributes containing blog/post/page IDs
3. **DOM Elements**: Searches for elements with IDs starting with `postID-`
4. **Feed Links**: Parses Atom feed URLs to extract the blog ID
5. **Script Content**: Uses regex patterns to find IDs in inline JavaScript

Once the IDs are found, the extension constructs the appropriate Blogger editor URL:
- Posts: `https://www.blogger.com/blog/post/edit/{blogId}/{postId}`
- Pages: `https://www.blogger.com/blog/page/edit/{blogId}/{pageId}`

## Permissions

This extension requires the following permissions:

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access the current tab's URL and content when the extension is clicked |
| `scripting` | Inject scripts to extract Blogger IDs from the page |
| `notifications` | Display error messages if ID extraction fails |
| `<all_urls>` | Support Blogger sites on custom domains (not just `blogspot.com`) |

## Troubleshooting

If the extension fails to open the editor:

1. **Ensure you're on a Blogger site**: The extension only works on sites powered by Blogger
2. **Check the console**: Open Developer Tools (F12) and check the console for detection logs
3. **Custom templates**: Some heavily modified templates may not include standard Blogger metadata

### Error Messages

- **"Identification Failed"**: The extension couldn't find the required IDs. This typically happens on non-Blogger pages or pages that don't contain post/page information (e.g., homepage, archive pages).

## Version History

### v1.3 (Current)
- Initial public release
- Manifest V3 compliance
- Support for posts and static pages
- Custom domain compatibility
- Multi-layer ID detection system

## Technical Details

- **Manifest Version**: 3 (latest Chrome Extension standard)
- **Background Service Worker**: Uses `background.js` for extension icon click handling
- **Script Injection**: Executes in the `MAIN` world to access Blogger's internal APIs

## Development

### Project Structure

```
Blogger-Editor-Opener/
├── manifest.json     # Extension configuration
├── background.js     # Main extension logic
├── icon-16.png       # Toolbar icon (16x16)
├── icon-48.png       # Extension management icon (48x48)
├── icon-128.png      # Chrome Web Store icon (128x128)
└── README.md         # This file
```

### Contributing

Feel free to submit issues or pull requests if you have suggestions for improvements or bug fixes.

## License

This project is provided as-is for personal use. Feel to modify and distribute as needed.

---

**Note**: This extension is not affiliated with or endorsed by Google or Blogger. It is an independent tool designed to improve the Blogger editing workflow.