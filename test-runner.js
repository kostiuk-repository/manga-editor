const fs = require('fs');
const { JSDOM } = require('jsdom');

// Read the test file
const html = fs.readFileSync('test-modules.html', 'utf-8');

// Create DOM
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'file:///test/'
});

// Wait for scripts to execute
setTimeout(() => {
  const output = dom.window.document.getElementById('output');
  if (output) {
    console.log(output.textContent);
  }
  
  const failCount = dom.window.document.querySelectorAll('.fail').length;
  const passCount = dom.window.document.querySelectorAll('.pass').length;
  console.log('\n=== Test Summary ===');
  console.log('Passed:', passCount);
  console.log('Failed:', failCount);
  process.exit(failCount > 0 ? 1 : 0);
}, 2000);
