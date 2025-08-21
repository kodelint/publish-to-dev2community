const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const matter = require('gray-matter');

async function publishToDevTo(filePath, apiKey, forcePublished = false, dryRun = false) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data: frontMatter, content } = matter(fileContent);

    // Extract title from frontmatter or filename
    const title = frontMatter.title ||
      path.basename(filePath, '.md')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

    const article = {
      title: title,
      body_markdown: content,
      published: forcePublished || frontMatter.published || false,
      tags: frontMatter.tags || [],
      description: frontMatter.description || '',
      canonical_url: frontMatter.canonical_url || '',
      main_image: frontMatter.cover_image || frontMatter.main_image || '',
      series: frontMatter.series || '',
      organization_id: frontMatter.organization_id || frontMatter.organization || '',
      created_at: frontMatter.created_at || frontMatter.date || '',
      edited_at: frontMatter.edited_at || frontMatter.updated || ''
    };

    // Remove empty fields to keep the request clean
    Object.keys(article).forEach(key => {
      if (article[key] === '' || (Array.isArray(article[key]) && article[key].length === 0)) {
        delete article[key];
      }
    });

    if (dryRun) {
      core.info(`[DRY RUN] Would publish: ${title}`);
      core.info(`[DRY RUN] Article data: ${JSON.stringify(article, null, 2)}`);
      return { url: 'dry-run-url', title, id: 'dry-run' };
    }

    const response = await axios.post('https://dev.to/api/articles', {
      article: article
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    core.info(`✅ Successfully published: ${title}`);
    core.info(`📝 Article URL: ${response.data.url}`);

    return {
      url: response.data.url,
      title: response.data.title,
      id: response.data.id,
      published: response.data.published
    };

  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    core.error(`❌ Failed to publish ${path.basename(filePath)}: ${errorMsg}`);
    throw new Error(`Failed to publish ${path.basename(filePath)}: ${errorMsg}`);
  }
}

async function run() {
  try {
    const apiKey = core.getInput('api-key', { required: true });
    const postsDirectory = core.getInput('posts-directory') || 'posts';
    const forcePublished = core.getInput('published') === 'true';
    const dryRun = core.getInput('dry-run') === 'true';

    core.info(`🔍 Looking for markdown files in: ${postsDirectory}`);

    if (!fs.existsSync(postsDirectory)) {
      core.warning(`📁 Posts directory '${postsDirectory}' not found`);
      core.setOutput('published-count', 0);
      core.setOutput('articles', JSON.stringify([]));
      return;
    }

    const files = fs.readdirSync(postsDirectory, { recursive: true })
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(postsDirectory, file));

    if (files.length === 0) {
      core.info('📝 No markdown files found');
      core.setOutput('published-count', 0);
      core.setOutput('articles', JSON.stringify([]));
      return;
    }

    core.info(`📚 Found ${files.length} markdown file(s)`);

    const publishedArticles = [];

    for (const file of files) {
      try {
        const result = await publishToDevTo(file, apiKey, forcePublished, dryRun);
        publishedArticles.push(result);

        // Be respectful to the API - add delay between requests
        if (!dryRun && files.indexOf(file) < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        // Log error but continue with other files
        core.error(`Skipping ${file} due to error: ${error.message}`);
      }
    }

    core.info(`🎉 Successfully processed ${publishedArticles.length} articles`);
    core.setOutput('published-count', publishedArticles.length);
    core.setOutput('articles', JSON.stringify(publishedArticles));

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

// Export functions for testing
module.exports = { run, publishToDevTo };

// Run if called directly (not during testing)
if (require.main === module) {
  run();
}
