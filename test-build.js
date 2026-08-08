
const { getContent, runBuild } = require('./lib/db');

async function test() {
  try {
    console.log('Fetching content...');
    const data = await getContent();
    console.log('Content fetched, running build...');
    const msg = await runBuild(data);
    console.log('Build result:', msg);
  } catch (err) {
    console.error('Build error:', err);
  }
}

test();
