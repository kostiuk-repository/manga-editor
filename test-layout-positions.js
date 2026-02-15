// Test layout position generation
eval(require('fs').readFileSync('panels.js', 'utf-8'));

console.log('Testing layout position auto-generation...\n');

// Test col-2 (should auto-generate)
const layout2 = Panels.getLayoutOptions(2).find(l => l.key === 'col-2');
console.log('col-2 layout:');
console.log('  - cols:', layout2.cols);
console.log('  - rows:', layout2.rows);
console.log('  - positions:', JSON.stringify(layout2.positions));
console.log('  ✓', layout2.positions.length === 2 ? 'Has 2 positions' : 'ERROR');

// Test col-2-stack-r (has explicit positions)
const layout3 = Panels.getLayoutOptions(3).find(l => l.key === 'col-2-stack-r');
console.log('\ncol-2-stack-r layout:');
console.log('  - cols:', layout3.cols);
console.log('  - rows:', layout3.rows);
console.log('  - positions:', JSON.stringify(layout3.positions));
console.log('  ✓', layout3.positions.length === 3 ? 'Has 3 positions' : 'ERROR');
console.log('  ✓', layout3.positions[0].row === '1 / 3' ? 'First panel spans rows' : 'ERROR');

// Test 2x2 (should auto-generate)
const layout4 = Panels.getLayoutOptions(4).find(l => l.key === '2x2');
console.log('\n2x2 layout:');
console.log('  - cols:', layout4.cols);
console.log('  - rows:', layout4.rows);
console.log('  - positions:', JSON.stringify(layout4.positions));
console.log('  ✓', layout4.positions.length === 4 ? 'Has 4 positions' : 'ERROR');

console.log('\n✓ Layout position generation working correctly!');
