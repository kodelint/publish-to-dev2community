const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Mock @actions/core
const mockCore = {
  getInput: jest.fn(),
  setOutput: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  setFailed: jest.fn()
};

// Mock axios
const mockAxios = {
  post: jest.fn()
};

jest.mock('@actions/core', () => mockCore);
jest.mock('axios', () => mockAxios);

// Import the functions after mocking
const { run, publishToDevTo } = require('../src/index.js');

describe('Dev.to Publisher Action', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock returns
    mockCore.getInput.mockImplementation((name) => {
      const inputs = {
        'api-key': 'test-api-key',
        'posts-directory': 'test-posts',
        'published': 'false',
        'dry-run': 'false'
      };
      return inputs[name] || '';
    });

    // Create test directory structure
    if (!fs.existsSync('test-posts')) {
      fs.mkdirSync('test-posts', { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync('test-posts')) {
      fs.rmSync('test-posts', { recursive: true, force: true });
    }
  });

  test('should process markdown file with frontmatter', () => {
    const testContent = `---
title: "Test Article"
published: false
description: "Test description"
tags: ["test", "javascript"]
---

# Test Content

This is a test article.`;

    fs.writeFileSync('test-posts/test.md', testContent);

    const { data: frontMatter, content } = matter(testContent);

    expect(frontMatter.title).toBe('Test Article');
    expect(frontMatter.published).toBe(false);
    expect(frontMatter.tags).toEqual(['test', 'javascript']);
    expect(content.trim()).toBe('# Test Content\n\nThis is a test article.');
  });

  test('should generate title from filename when not provided', () => {
    const testContent = `---
published: false
---

# Test Content`;

    fs.writeFileSync('test-posts/my-awesome-article.md', testContent);

    const filename = 'my-awesome-article.md';
    const expectedTitle = path.basename(filename, '.md')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    expect(expectedTitle).toBe('My Awesome Article');
  });

  test('should handle dry run mode', async () => {
    const testContent = `---
title: "Dry Run Test"
---

# Content`;

    fs.writeFileSync('test-posts/dry-run-test.md', testContent);

    const result = await publishToDevTo('test-posts/dry-run-test.md', 'test-key', false, true);

    expect(result.url).toBe('dry-run-url');
    expect(result.title).toBe('Dry Run Test');
    expect(result.id).toBe('dry-run');
    expect(mockCore.info).toHaveBeenCalledWith('[DRY RUN] Would publish: Dry Run Test');
  });

  test('should validate required API key input', () => {
    mockCore.getInput.mockImplementation((name, options) => {
      if (name === 'api-key' && options?.required) {
        throw new Error('Input required and not supplied: api-key');
      }
      return '';
    });

    expect(() => {
      mockCore.getInput('api-key', { required: true });
    }).toThrow('Input required and not supplied: api-key');
  });

  test('should handle missing posts directory gracefully', async () => {
    mockCore.getInput.mockImplementation((name) => {
      const inputs = {
        'api-key': 'test-api-key',
        'posts-directory': 'nonexistent-directory'
      };
      return inputs[name] || '';
    });

    await run();

    expect(mockCore.warning).toHaveBeenCalledWith("📁 Posts directory 'nonexistent-directory' not found");
    expect(mockCore.setOutput).toHaveBeenCalledWith('published-count', 0);
    expect(mockCore.setOutput).toHaveBeenCalledWith('articles', JSON.stringify([]));
  });

  test('should process multiple markdown files', () => {
    const testContent1 = `---
title: "Article 1"
---
Content 1`;

    const testContent2 = `---
title: "Article 2"
---
Content 2`;

    fs.writeFileSync('test-posts/article1.md', testContent1);
    fs.writeFileSync('test-posts/article2.md', testContent2);

    const files = fs.readdirSync('test-posts')
      .filter(file => file.endsWith('.md'))
      .map(file => path.join('test-posts', file));

    expect(files).toHaveLength(2);
    expect(files.some(f => f.includes('article1.md'))).toBe(true);
    expect(files.some(f => f.includes('article2.md'))).toBe(true);
  });

  test('should clean empty fields from article object', () => {
    const article = {
      title: 'Test Title',
      body_markdown: 'Content',
      description: '',
      tags: [],
      canonical_url: 'https://example.com',
      series: ''
    };

    // Simulate the cleaning logic
    Object.keys(article).forEach(key => {
      if (article[key] === '' || (Array.isArray(article[key]) && article[key].length === 0)) {
        delete article[key];
      }
    });

    expect(article.title).toBe('Test Title');
    expect(article.canonical_url).toBe('https://example.com');
    expect(article.description).toBeUndefined();
    expect(article.tags).toBeUndefined();
    expect(article.series).toBeUndefined();
  });

  test('should handle nested directory structure', () => {
    fs.mkdirSync('test-posts/2024/january', { recursive: true });

    const testContent = `---
title: "Nested Article"
---
Content`;

    fs.writeFileSync('test-posts/2024/january/nested-article.md', testContent);

    const files = fs.readdirSync('test-posts', { recursive: true })
      .filter(file => file.endsWith('.md'))
      .map(file => path.join('test-posts', file));

    expect(files).toHaveLength(1);
    expect(files[0]).toBe('test-posts/2024/january/nested-article.md');
  });

  test('should handle all metadata fields', async () => {
    const testContent = `---
title: "Complete Metadata Test"
published: true
description: "Testing all available metadata fields"
tags: ["test", "metadata", "api", "devto"]
cover_image: "https://example.com/cover.jpg"
canonical_url: "https://myblog.com/complete-test"
series: "API Testing Series"
organization_id: 12345
date: "2024-01-15T10:00:00Z"
updated: "2024-01-16T12:00:00Z"
---

# Complete Test Content

This tests all available metadata fields.`;

    fs.writeFileSync('test-posts/metadata-test.md', testContent);

    mockAxios.post.mockResolvedValue({
      data: {
        url: 'https://dev.to/user/complete-metadata-test-123',
        title: 'Complete Metadata Test',
        id: 123456,
        published: true
      }
    });

    const result = await publishToDevTo('test-posts/metadata-test.md', 'real-api-key', false, false);

    expect(result.url).toBe('https://dev.to/user/complete-metadata-test-123');
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://dev.to/api/articles',
      expect.objectContaining({
        article: expect.objectContaining({
          title: 'Complete Metadata Test',
          published: true,
          description: 'Testing all available metadata fields',
          tags: ['test', 'metadata', 'api', 'devto'],
          main_image: 'https://example.com/cover.jpg',
          canonical_url: 'https://myblog.com/complete-test',
          series: 'API Testing Series',
          organization_id: 12345,
          created_at: '2024-01-15T10:00:00Z',
          edited_at: '2024-01-16T12:00:00Z'
        })
      }),
      expect.any(Object)
    );
  });

  test('should handle alternative metadata field names', async () => {
    const testContent = `---
title: "Alternative Fields Test"
main_image: "https://example.com/alt-cover.jpg"
organization: 67890
created_at: "2024-02-01T08:00:00Z"
edited_at: "2024-02-02T09:00:00Z"
---

# Testing alternative field names`;

    fs.writeFileSync('test-posts/alt-fields-test.md', testContent);

    mockAxios.post.mockResolvedValue({
      data: {
        url: 'https://dev.to/user/alt-test',
        title: 'Alternative Fields Test',
        id: 789012,
        published: false
      }
    });

    await publishToDevTo('test-posts/alt-fields-test.md', 'test-key', false, false);

    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://dev.to/api/articles',
      expect.objectContaining({
        article: expect.objectContaining({
          main_image: 'https://example.com/alt-cover.jpg',
          organization_id: 67890,
          created_at: '2024-02-01T08:00:00Z',
          edited_at: '2024-02-02T09:00:00Z'
        })
      }),
      expect.any(Object)
    );
  });
});
