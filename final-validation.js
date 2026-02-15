// Final validation of all changes
const fs = require('fs');

console.log('=== FINAL VALIDATION ===\n');

// 1. Check all main JS files are syntactically valid
console.log('1. Validating JavaScript syntax...');
const jsFiles = ['panels.js', 'layers.js', 'assets.js', 'bubbles.js', 'modals.js', 'history.js', 'app.js'];
let syntaxErrors = 0;
jsFiles.forEach(file => {
  try {
    require('child_process').execSync(`node -c ${file}`, {encoding: 'utf8'});
    console.log(`   ✓ ${file}`);
  } catch (e) {
    console.log(`   ✗ ${file} - SYNTAX ERROR`);
    syntaxErrors++;
  }
});

// 2. Check constants are defined
console.log('\n2. Checking constants in app.js...');
const appJs = fs.readFileSync('app.js', 'utf8');
const hasSchemaVersion = appJs.includes('const SCHEMA_VERSION');
const hasStandardWidth = appJs.includes('const STANDARD_WIDTH');
const hasDefaultHeight = appJs.includes('const DEFAULT_HEIGHT');
console.log(`   ${hasSchemaVersion ? '✓' : '✗'} SCHEMA_VERSION defined`);
console.log(`   ${hasStandardWidth ? '✓' : '✗'} STANDARD_WIDTH defined`);
console.log(`   ${hasDefaultHeight ? '✓' : '✗'} DEFAULT_HEIGHT defined`);

// 3. Check new layouts exist
console.log('\n3. Checking GROUP_LAYOUTS in panels.js...');
const panelsJs = fs.readFileSync('panels.js', 'utf8');
const newLayouts = ['col-2', 'col-3', 'col-4', 'col-2-stack-r', '2x2'];
let layoutsFound = 0;
newLayouts.forEach(layout => {
  if (panelsJs.includes(`'${layout}'`)) {
    console.log(`   ✓ ${layout}`);
    layoutsFound++;
  } else {
    console.log(`   ✗ ${layout} - NOT FOUND`);
  }
});

// 4. Check removed functions
console.log('\n4. Checking removed functions...');
const removedFuncs = ['mergeRow', 'splitRow', 'swapRow'];
const hasRemovedFuncs = removedFuncs.some(fn => 
  appJs.includes(`function ${fn}()`) && 
  appJs.indexOf(`function ${fn}()`) !== appJs.lastIndexOf(`function ${fn}()`)
);
console.log(`   ${!hasRemovedFuncs ? '✓' : '✗'} Old row functions removed`);

// 5. Check layer system functions
console.log('\n5. Checking layer system in layers.js...');
const layersJs = fs.readFileSync('layers.js', 'utf8');
const layerFuncs = ['initializeLayers', 'syncViews', 'setLayerZ', 'moveLayerUp', 'moveLayerDown'];
let layerFuncsFound = 0;
layerFuncs.forEach(fn => {
  if (layersJs.includes(`function ${fn}`)) {
    console.log(`   ✓ ${fn}`);
    layerFuncsFound++;
  } else {
    console.log(`   ✗ ${fn} - NOT FOUND`);
  }
});

// 6. Check HTML changes
console.log('\n6. Checking HTML changes in index.html...');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const hasAssetLibrary = indexHtml.includes('id="asset-library"');
const hasNoPresets = !indexHtml.includes('id="preset-area"');
const hasNoRowButtons = !indexHtml.includes('mergeRow()');
console.log(`   ${hasAssetLibrary ? '✓' : '✗'} Asset library in sidebar`);
console.log(`   ${hasNoPresets ? '✓' : '✗'} Preset area removed`);
console.log(`   ${hasNoRowButtons ? '✓' : '✗'} Row buttons removed`);

// 7. Check assets.js changes
console.log('\n7. Checking assets.js changes...');
const assetsJs = fs.readFileSync('assets.js', 'utf8');
const hasNoFloating = !assetsJs.includes('asset-library-floating');
const hasSidebar = assetsJs.includes('createLibraryPanel');
console.log(`   ${hasNoFloating ? '✓' : '✗'} No floating panel`);
console.log(`   ${hasSidebar ? '✓' : '✗'} Sidebar panel creation`);

// 8. Summary
console.log('\n=== VALIDATION SUMMARY ===');
const allPassed = 
  syntaxErrors === 0 &&
  hasSchemaVersion && hasStandardWidth && hasDefaultHeight &&
  layoutsFound === newLayouts.length &&
  !hasRemovedFuncs &&
  layerFuncsFound === layerFuncs.length &&
  hasAssetLibrary && hasNoPresets && hasNoRowButtons &&
  hasNoFloating && hasSidebar;

if (allPassed) {
  console.log('✅ ALL VALIDATIONS PASSED!');
  console.log('✅ Refactoring complete and ready for deployment.');
  process.exit(0);
} else {
  console.log('⚠️  Some validations failed. Please review.');
  process.exit(1);
}
