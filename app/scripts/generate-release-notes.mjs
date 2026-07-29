import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  // Get all tags sorted by creation/version
  let currentTag = 'v0.8.0'; // Default fallback
  let previousTag = '';
  let logRange = 'HEAD';

  try {
    const tagsOutput = execSync('git tag -l --sort=-v:refname').toString().trim();
    const tags = tagsOutput ? tagsOutput.split('\n') : [];
    
    if (tags.length > 0) {
      currentTag = tags[0];
      if (tags.length > 1) {
        previousTag = tags[1];
        logRange = `${previousTag}..${currentTag}`;
      } else {
        logRange = `${currentTag}`;
      }
    }
  } catch (gitErr) {
    console.warn('Git tags not found or failed to fetch:', gitErr.message);
  }

  console.log(`Log range: ${logRange}`);
  
  // Get commit messages in this range
  let commitMessages = [];
  try {
    commitMessages = execSync(`git log ${logRange} --pretty=format:"%s"`)
      .toString()
      .trim()
      .split('\n');
  } catch (logErr) {
    console.warn('Failed to fetch git log, falling back to recent 10 commits:', logErr.message);
    try {
      commitMessages = execSync('git log -n 10 --pretty=format:"%s"')
        .toString()
        .trim()
        .split('\n');
    } catch (fallbackErr) {
      console.warn('Git log completely unavailable.');
    }
  }

  const releaseNotes = {
    version: currentTag,
    features: [],
    fixes: []
  };

  commitMessages.forEach(msg => {
    // Clean and match feat / fix
    if (msg.startsWith('feat:') || msg.startsWith('feat(app):')) {
      const cleanMsg = msg.replace(/^feat(?:\(app\))?:\s*/, '').trim();
      if (cleanMsg) releaseNotes.features.push(cleanMsg);
    } else if (msg.startsWith('fix:') || msg.startsWith('fix(app):')) {
      const cleanMsg = msg.replace(/^fix(?:\(app\))?:\s*/, '').trim();
      if (cleanMsg) releaseNotes.fixes.push(cleanMsg);
    }
    // internal: is strictly ignored
  });

  const outputDir = path.resolve('src/assets');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.resolve(outputDir, 'release-notes.json');
  fs.writeFileSync(outputPath, JSON.stringify(releaseNotes, null, 2));

  console.log(`Successfully generated release notes for ${currentTag}`);
  console.log(JSON.stringify(releaseNotes, null, 2));
} catch (error) {
  console.error('Failed to generate release notes script:', error.message);
  // Fail silently or write empty JSON to not block build
  const outputDir = path.resolve('src/assets');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    path.resolve(outputDir, 'release-notes.json'),
    JSON.stringify({ version: 'v0.8.0', features: [], fixes: [] }, null, 2)
  );
}
