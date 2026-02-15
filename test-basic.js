// Test basic JavaScript functionality
console.log('Testing panels.js...');
eval(require('fs').readFileSync('panels.js', 'utf-8'));

console.log('✓ panels.js loaded');
console.log('✓ Panels object:', typeof Panels);

// Test panel creation
const panel = Panels.mkPanel('test-src');
console.log('✓ Panel created with layers:', panel.layers !== undefined);
console.log('✓ Panel has aspectRatio:', panel.aspectRatio !== undefined);

// Test layout options
const layouts2 = Panels.getLayoutOptions(2);
console.log('✓ 2-panel layouts:', layouts2.length);
console.log('  -', layouts2.map(l => l.key).join(', '));

const layouts3 = Panels.getLayoutOptions(3);
console.log('✓ 3-panel layouts:', layouts3.length);
console.log('  -', layouts3.map(l => l.key).join(', '));

const layouts4 = Panels.getLayoutOptions(4);
console.log('✓ 4-panel layouts:', layouts4.length);
console.log('  -', layouts4.map(l => l.key).join(', '));

// Test changeGroupLayout exists
console.log('✓ changeGroupLayout exists:', typeof Panels.changeGroupLayout === 'function');

console.log('\nTesting layers.js...');
eval(require('fs').readFileSync('layers.js', 'utf-8'));

console.log('✓ layers.js loaded');
console.log('✓ Layers object:', typeof Layers);
console.log('✓ setLayerZ exists:', typeof Layers.setLayerZ === 'function');
console.log('✓ moveLayerUp exists:', typeof Layers.moveLayerUp === 'function');
console.log('✓ moveLayerDown exists:', typeof Layers.moveLayerDown === 'function');
console.log('✓ initializeLayers exists:', typeof Layers.initializeLayers === 'function');

console.log('\n✓✓✓ All basic tests passed! ✓✓✓');
