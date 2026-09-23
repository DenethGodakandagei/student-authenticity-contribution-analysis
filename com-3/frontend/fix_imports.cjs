const fs = require('fs');
const files = [
  'src/app/dashboard/page.jsx',
  'src/app/editor/page.jsx',
  'src/app/integrations/page.jsx'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/from '\.\.\/components\//g, "from '../../components/");
  content = content.replace(/from \"\.\.\/components\//g, 'from "../../components/');
  content = content.replace(/import '\.\.\/index\.css';\n?/g, '');
  content = content.replace(/import \"\.\.\/index\.css\";\n?/g, '');
  fs.writeFileSync(f, content);
  console.log('Fixed imports in', f);
});
