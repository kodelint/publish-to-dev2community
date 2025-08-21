# Dev.to Publisher Action

A GitHub Action that automatically publishes your markdown articles to Dev.to with full frontmatter support.

## Features

- 📝 Publish markdown files with frontmatter to Dev.to
- 🎯 Support for all Dev.to article properties (tags, cover image, series, etc.)
- 📁 Flexible directory structure support
- 🚀 Batch publishing with API rate limiting
- 🔍 Dry run mode for testing
- ✅ Comprehensive error handling and logging

## Usage

### Basic Usage

```yaml
name: Publish to Dev.to
on:
  push:
    branches: [main]
    paths: ["posts/**"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publish to Dev.to
        uses: kodelint/devto-publisher-action@v1
        with:
          api-key: ${{ secrets.DEVTO_API_KEY }}
          posts-directory: "posts"
```

### Advanced Usage

```yaml
- name: Publish to Dev.to
  uses: kodelint/devto-publisher-action@v1
  with:
    api-key: ${{ secrets.DEVTO_API_KEY }}
    posts-directory: "articles"
    published: "true" # Publish immediately instead of drafts
    dry-run: "false" # Set to 'true' for testing
  id: publish-step

- name: Show results
  run: |
    echo "Published ${{ steps.publish-step.outputs.published-count }} articles"
    echo "Articles: ${{ steps.publish-step.outputs.articles }}"
```

## Inputs

| Input             | Description                               | Required | Default |
| ----------------- | ----------------------------------------- | -------- | ------- |
| `api-key`         | Your Dev.to API key                       | Yes      | -       |
| `posts-directory` | Directory containing markdown files       | No       | `posts` |
| `published`       | Publish articles immediately (true/false) | No       | `false` |
| `dry-run`         | Test mode without actual publishing       | No       | `false` |

## Outputs

| Output            | Description                               |
| ----------------- | ----------------------------------------- |
| `published-count` | Number of articles successfully processed |
| `articles`        | JSON array of published article details   |

## Article Format

Your markdown files should include frontmatter with Dev.to properties:

```markdown
---
title: "Your Amazing Article Title"
published: false
description: "A brief description of your article"
tags: ["javascript", "tutorial", "webdev"]
cover_image: "https://example.com/image.jpg"
canonical_url: "https://yourblog.com/article"
series: "Your Series Name"
---

# Your Article Content

Write your article content here using standard markdown...
```

## Setup

1. **Get your Dev.to API key**:
   - Go to [Dev.to Settings → Extensions](https://dev.to/settings/extensions)
   - Generate a new API key

2. **Add API key to GitHub**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Add a new secret named `DEVTO_API_KEY`

3. **Organize your content**:
   ```
   your-repo/
   ├── .github/workflows/publish.yml
   └── posts/
       ├── my-first-article.md
       └── another-article.md
   ```

## Supported Frontmatter Properties

- `title` - Article title (or derived from filename)
- `published` - Publish immediately (true/false)
- `description` - Article description
- `tags` - Array of tags
- `cover_image` or `main_image` - Cover image URL
- `canonical_url` - Canonical URL if republishing
- `series` - Series name

## Contributing

1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Build: `npm run build`
6. Submit a pull request
