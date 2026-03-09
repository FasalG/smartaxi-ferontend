const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(__dirname, 'src', 'app', 'components');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const allFiles = walk(srcAppDir);

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Dashboard specific fixes (has icon + flex)
  if (file.includes('dashboard.component.ts')) {
    // reduce card padding
    content = content.replace(/class="card shadow-sm border-0 p-4 h-100"/g, 'class="card shadow-sm border-0 p-3 p-xl-4 h-100"');
    
    // adjust flex alignment and gap
    content = content.replace(/<div class="d-flex align-items-center gap-3">/g, '<div class="d-flex flex-column flex-xxl-row align-items-start align-items-xxl-center gap-2 gap-xxl-3 overflow-hidden">');
    
    // icon wrapper padding
    content = content.replace(/<div class="p-3 bg-(.*?)-subtle rounded-3 text-(.*?) shadow-sm">/g, '<div class="p-2 p-md-3 bg-$1-subtle rounded-3 text-$2 shadow-sm flex-shrink-0">');
    
    // add truncate to labels
    content = content.replace(/<p class="text-secondary small mb-1">/g, '<p class="text-secondary small mb-1 text-truncate w-100">');
    
    // adjust h3 size and truncation
    content = content.replace(/<h3 class="fw-bold mb-0">/g, '<h3 class="fw-bold mb-0 fs-5 fs-md-4 fs-xl-3 text-truncate w-100">');
    
    // wrap text div for overflow hidden
    content = content.replace(/<div>\s*<p class="text-secondary small mb-1 text-truncate/g, '<div class="w-100 overflow-hidden">\n              <p class="text-secondary small mb-1 text-truncate');
    
    // SVG sizing
    content = content.replace(/<svg width="24" height="24"/g, '<svg width="20" height="20" class="d-xxl-none">\n                <svg width="24" height="24" class="d-none d-xxl-block"');
  }

  // 2. Generic cards across other components
  content = content.replace(/<p class="text-secondary small mb-1">/g, '<p class="text-secondary small mb-1 text-truncate" title="Metric">');
  // if it's already got it, don't duplicate (but we did generic first, so dashboard wouldn't match. Wait, dashboard matches first, and we changed it to have w-100).
  
  // h4 truncations
  content = content.replace(/<p class="h4 fw-bold text-(.*?) mb-0">/g, '<p class="h4 fw-bold fs-5 fs-md-4 text-$1 mb-0 text-truncate">');
  
  // 3. Analytics specific (similar to dashboard)
  if (file.includes('analytics.component.ts')) {
    content = content.replace(/class="card shadow-sm border-0 p-4 h-100"/g, 'class="card shadow-sm border-0 p-3 h-100"');
    content = content.replace(/class="p-3 rounded-3/g, 'class="p-2 p-md-3 rounded-3');
    content = content.replace(/<h3 class="fw-bold mb-0 mt-2">/g, '<h3 class="fw-bold mb-0 mt-2 fs-5 fs-md-3 text-truncate">');
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated cards in ${path.relative(__dirname, file)}`);
  }
});
