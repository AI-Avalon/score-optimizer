const fs = require('fs');

function replaceAll(str, map) {
  let s = str;
  for (const [k, v] of Object.entries(map)) {
    s = s.split(k).join(v);
  }
  return s;
}

const lp = fs.readFileSync('src/components/pc/LeftPanel.tsx', 'utf8');
fs.writeFileSync('src/components/pc/LeftPanel.tsx', replaceAll(lp, {
  'globalConfig.bodyStartPage': 'globalConfig.processSettings.bodyStartPage',
  'globalConfig.frontMatterMode': 'globalConfig.processSettings.frontMatterMode',
  'globalConfig.pageOrder': 'globalConfig.processSettings.pageOrder',
  'setGlobalConfig({ bodyStartPage:': 'setGlobalConfig({ processSettings: { ...globalConfig.processSettings, bodyStartPage:',
  'setGlobalConfig({ frontMatterMode:': 'setGlobalConfig({ processSettings: { ...globalConfig.processSettings, frontMatterMode:',
  'setGlobalConfig({ pageOrder:': 'setGlobalConfig({ processSettings: { ...globalConfig.processSettings, pageOrder:',
  '})': '} })', // naive replace, wait let's use regex instead
}));

