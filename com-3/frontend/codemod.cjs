const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      if (!content.startsWith('\'use client\'') && !content.startsWith('\"use client\"')) {
        content = '\"use client\";\n' + content;
        changed = true;
      }
      
      if (content.includes('react-router-dom')) {
        content = content.replace(/import\s+\{\s*useLocation\s*,\s*useNavigate\s*\}\s+from\s+['"]react-router-dom['"];?/, 'import { usePathname, useRouter } from "next/navigation";');
        content = content.replace(/import\s+\{\s*useNavigate\s*\}\s+from\s+['"]react-router-dom['"];?/, 'import { useRouter } from "next/navigation";');
        content = content.replace(/import\s+\{\s*useLocation\s*\}\s+from\s+['"]react-router-dom['"];?/, 'import { usePathname } from "next/navigation";');
        
        content = content.replace(/useNavigate\(\)/g, 'useRouter()');
        content = content.replace(/useLocation\(\)/g, 'usePathname()');
        content = content.replace(/\bnavigate\(/g, 'router.push('); // navigate('/foo') -> router.push('/foo')
        
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src', 'components'));
processDir(path.join(__dirname, 'src', 'pages'));
processDir(path.join(__dirname, 'src', 'context'));
