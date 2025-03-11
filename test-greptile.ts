// test-greptile.ts
const popularRepos = [
    // 'apache/spark',
    'marimo-team/marimo'
  ];
  
  async function testGreptileIndexing() {
    // Replace these with your actual tokens
    const greptileApiKey = process.env.GREPTILE_API_KEY;
    const githubToken = process.env.GITHUB_PAT;
    // Ensure tokens are set
    if (!greptileApiKey || !githubToken) {
      throw new Error('API keys not set');
    }
  
    for (const repo of popularRepos) {
      console.log(`\nTesting repository: ${repo}`);
      
      try {
        // 1. Submit repository for indexing
        // console.log('Submitting for indexing...');
        // const submitResponse = await fetch('https://api.greptile.com/v2/repositories', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${greptileApiKey}`,
        //     'X-Github-Token': githubToken,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({
        //     remote: 'github',
        //     repository: repo,
        //     branch: "main"
        //   })
        // });
  
        // console.log('Submit response status:', submitResponse.status);
        // const submitData = await submitResponse.json();
        // console.log('Submit response:', submitData);
  
        // 2. Check indexing status
        const repositoryId = encodeURIComponent(`github:main:${repo}`);
        console.log('Checking initial status...');
        
        const statusResponse = await fetch(
          `https://api.greptile.com/v2/repositories/${repositoryId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${greptileApiKey}`,
              'X-Github-Token': githubToken
            }
          }
        );
  
        console.log('Status response status:', statusResponse.status);
        const statusData = await statusResponse.json();
        console.log('Status response:', statusData);
  
      } catch (error) {
        console.error('Error processing repository:', repo);
        console.error('Error details:', error);
      }
    }
  }
  
  // test-greptile-query.ts

async function testGreptileChangelog() {
    const greptileApiKey = process.env.GREPTILE_API_KEY;
    const githubToken = process.env.GITHUB_PAT;
    
    // Ensure tokens are set
    if (!greptileApiKey || !githubToken) {
      throw new Error('API keys not set');
    }
    
    // Test with one of our indexed repos
    const repoUrl = 'facebook/react';
    
    // Sample diff text - consider loading from actual Git diffs
    const diffText = `
    Commit: b4cbdc5 - 2024-10-22 23:49:10
    Message: remove terser from react-compiler-runtime build (#31326)
    Summary
    This fixes a minor nit I have about the react-compiler-runtime package
    in that the published code is minified. I assume most consumers will
    minify their own bundles so there's no rea
    ... (truncated)
    Commit: 9daabc0 - 2024-10-22 20:07:10
    Message: react-hooks/rules-of-hooks: Add support for do/while loops (#28714)
    `;

    try {
      console.log('Testing Greptile changelog generation...');
      console.log('Repository:', repoUrl);
      console.log('Sample diff length:', diffText.length);

      const response = await fetch("https://api.greptile.com/v2/query", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${greptileApiKey}`,
          "X-Github-Token": githubToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{
            content: `You are a changelog generator. Analyze these Git diffs and generate a clear, concise changelog entry. Focus on the impact and meaning of changes:

Diffs to analyze:
${diffText}

Format the changelog with appropriate sections (Features, Improvements, Bug Fixes) and use bullet points.`,
            role: "user"
          }],
          repositories: [{
            remote: "github",
            repository: repoUrl,
            branch: "main"
          }],
          genius: true
        })
      });
  
      console.log('\nResponse status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }
  
      const data = await response.json();
      console.log('\nGreptile Response:', JSON.stringify(data, null, 2));
  
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
    }
  }
  
  // Run the test
  console.log('Starting Greptile changelog test...');
  testGreptileChangelog()
    .then(() => console.log('\nTest completed'))
    .catch(error => console.error('Test failed:', error));

//   // Run the test
//   console.log('Starting Greptile API test...');
//   testGreptileIndexing()
//     .then(() => console.log('Test completed'))
//     .catch(error => console.error('Test failed:', error));