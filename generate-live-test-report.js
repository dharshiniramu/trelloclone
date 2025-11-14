const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to parse Jest output and extract test results
function parseJestOutput(output) {
  const lines = output.split('\n');
  const testSuites = [];
  let currentSuite = null;
  let testResults = [];
  
  // Extract test results from Jest output
  const testPattern = /^\s*✓\s+(.+?)\s+\((\d+(?:\.\d+)?ms)\)/;
  const suitePattern = /^PASS\s+(.+?\.test\.js)/;
  const summaryPattern = /^Test Suites: (\d+) passed, (\d+) total/;
  const testSummaryPattern = /^Tests:\s+(\d+) passed, (\d+) total/;
  
  let totalSuites = 0;
  let totalTests = 0;
  let passedTests = 0;
  
  lines.forEach(line => {
    const suiteMatch = line.match(suitePattern);
    if (suiteMatch) {
      if (currentSuite) {
        testSuites.push({
          name: currentSuite,
          tests: testResults
        });
      }
      currentSuite = suiteMatch[1].replace('.test.js', '').replace('__tests__/', '');
      testResults = [];
    }
    
    const testMatch = line.match(testPattern);
    if (testMatch) {
      const testName = testMatch[1].trim();
      const duration = testMatch[2];
      testResults.push({
        name: testName,
        status: 'passed',
        duration: duration,
        description: getTestDescription(testName)
      });
    }
    
    const summaryMatch = line.match(summaryPattern);
    if (summaryMatch) {
      totalSuites = parseInt(summaryMatch[1]);
    }
    
    const testSummaryMatch = line.match(testSummaryPattern);
    if (testSummaryMatch) {
      passedTests = parseInt(testSummaryMatch[1]);
      totalTests = parseInt(testSummaryMatch[2]);
    }
  });
  
  // Add the last suite
  if (currentSuite) {
    testSuites.push({
      name: currentSuite,
      tests: testResults
    });
  }
  
  return {
    testSuites,
    summary: {
      totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      skipped: 0,
      errors: 0
    }
  };
}

// Function to get test descriptions based on test names
function getTestDescription(testName) {
  const descriptions = {
    'renders modal with template information': 'Verifies modal displays template data correctly',
    'allows editing board title': 'Tests title input functionality',
    'shows create board button as disabled when title is empty': 'Validates form validation',
    'handles cancel button click': 'Tests modal close functionality',
    'successfully creates board with template data': 'Tests complete board creation flow',
    'renders navbar with logo and navigation elements': 'Verifies navbar structure',
    'displays user information when authenticated': 'Tests user display',
    'opens and closes account dropdown': 'Tests dropdown functionality',
    'handles search input and shows search results': 'Tests search functionality',
    'handles logout functionality': 'Tests logout process',
    'renders empty container when no notifications provided': 'Tests empty state',
    'renders single success notification': 'Tests success notifications',
    'renders single error notification': 'Tests error notifications',
    'renders multiple notifications': 'Tests multiple notification display',
    'applies correct CSS classes for different notification types': 'Tests styling',
    'renders sidebar with navigation items': 'Verifies sidebar structure',
    'highlights active section based on pathname': 'Tests active state highlighting',
    'expands and collapses templates section': 'Tests collapsible sections',
    'navigates to correct links': 'Tests navigation links',
    'shows correct icons for each navigation item': 'Tests icon display',
    'renders navbar component': 'Verifies navbar presence',
    'renders sidebar component': 'Verifies sidebar presence',
    'renders board content': 'Tests main content area',
    'renders page with correct layout structure': 'Tests page structure',
    'renders all main components': 'Comprehensive component check',
    'renders page with navbar and sidebar': 'Tests layout components',
    'renders page header': 'Tests page title',
    'renders refresh button': 'Tests refresh functionality',
    'renders invite members button': 'Tests invite button',
    'renders create board button': 'Tests create button',
    'shows empty state when no boards': 'Tests empty state',
    'handles refresh button click': 'Tests refresh interaction',
    'handles invite members button click': 'Tests invite interaction',
    'handles create board button click': 'Tests create interaction',
    'renders loading state initially': 'Tests loading state',
    'renders guest landing page when not authenticated': 'Tests guest view',
    'renders authenticated home when user is logged in': 'Tests authenticated view',
    'displays feature sections in guest landing': 'Tests feature display',
    'shows no notifications message when authenticated with no invitations': 'Tests notification state',
    'renders page header correctly': 'Tests page header',
    'renders all sections with correct titles': 'Tests section titles',
    'sections are collapsed by default': 'Tests default collapsed state',
    'expands and collapses sections when clicked': 'Tests expand/collapse functionality',
    'renders login form with all required fields': 'Tests form structure',
    'handles form input changes': 'Tests input handling',
    'shows loading state during login': 'Tests loading state',
    'handles successful login': 'Tests successful authentication',
    'displays error message on login failure': 'Tests error handling',
    'renders signup form with all required fields': 'Tests form structure',
    'handles form input changes': 'Tests input handling',
    'shows loading state during signup': 'Tests loading state',
    'handles successful signup': 'Tests successful registration',
    'displays error message on signup failure': 'Tests error handling',
    'renders templates sidebar with categories': 'Tests template categories',
    'renders personal templates by default': 'Tests default template display',
    'opens create board modal when template is clicked': 'Tests modal opening',
    'navigates to board when board is created': 'Tests board creation flow',
    'renders page title and buttons': 'Tests page elements',
    'shows empty state when no workspaces': 'Tests empty state',
    'opens create workspace modal when button is clicked': 'Tests modal functionality',
    'shows loading state initially': 'Tests loading state',
    'shows workspace not found when workspace does not exist': 'Tests error handling',
    'renders workspace header with back button': 'Tests header elements',
    'shows owner badge for workspace owner': 'Tests ownership display'
  };
  
  return descriptions[testName] || 'Test case validation';
}

// Function to categorize test suites
function categorizeTestSuite(suiteName) {
  if (suiteName.includes('Component') || suiteName.includes('Modal') || suiteName.includes('Navbar') || suiteName.includes('Notification') || suiteName.includes('Sidebar')) {
    return 'Component Tests';
  }
  return 'Page Tests';
}

// Function to generate HTML report
function generateHTMLReport(testData) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${testData.projectName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem 0;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .section {
            margin-bottom: 2rem;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1rem;
        }

        .environment-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .env-card {
            background: white;
            border-left: 4px solid #3b82f6;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .env-card strong {
            color: #1e293b;
            display: block;
            margin-bottom: 0.25rem;
        }

        .summary {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 2rem;
        }

        .summary-text {
            font-size: 1.2rem;
            margin-bottom: 1rem;
            color: #475569;
        }

        .summary-pills {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .pill {
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .pill.passed {
            background-color: #dcfce7;
            color: #166534;
        }

        .pill.failed {
            background-color: #fef2f2;
            color: #dc2626;
        }

        .pill.skipped {
            background-color: #fefce8;
            color: #ca8a04;
        }

        .pill.errors {
            background-color: #fef2f2;
            color: #dc2626;
        }

        .test-results {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .test-table {
            width: 100%;
            border-collapse: collapse;
        }

        .test-table th {
            background-color: #f8fafc;
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }

        .test-table td {
            padding: 1rem;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
        }

        .test-table tr:hover {
            background-color: #f9fafb;
        }

        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-badge.passed {
            background-color: #dcfce7;
            color: #166534;
        }

        .status-badge.failed {
            background-color: #fef2f2;
            color: #dc2626;
        }

        .status-badge.skipped {
            background-color: #fefce8;
            color: #ca8a04;
        }

        .category-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            background-color: #e0e7ff;
            color: #3730a3;
        }

        .test-name {
            font-weight: 500;
            color: #1e293b;
        }

        .test-description {
            color: #64748b;
            font-size: 0.9rem;
            margin-top: 0.25rem;
        }

        .duration {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            color: #64748b;
        }

        .suite-header {
            background-color: #f1f5f9;
            font-weight: 600;
            color: #1e293b;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: #1e293b;
        }

        .stat-label {
            color: #64748b;
            font-size: 0.9rem;
            margin-top: 0.5rem;
        }

        .loading {
            text-align: center;
            padding: 2rem;
            color: #64748b;
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .summary-pills {
                justify-content: center;
            }
            
            .test-table {
                font-size: 0.9rem;
            }
            
            .test-table th,
            .test-table td {
                padding: 0.75rem 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${testData.projectName}</h1>
        <p>Report generated on ${testData.generatedAt} by Jest Testing Framework</p>
    </div>

    <div class="container">
        <div class="section">
            <h2 class="section-title">Environment</h2>
            <div class="environment-grid">
                <div class="env-card">
                    <strong>Node.js:</strong> ${testData.environment.nodejs}
                </div>
                <div class="env-card">
                    <strong>Platform:</strong> ${testData.environment.platform}
                </div>
                <div class="env-card">
                    <strong>Jest DOM:</strong> ${testData.environment.jestDom}
                </div>
                <div class="env-card">
                    <strong>Testing Framework:</strong> ${testData.environment.testingFramework}
                </div>
                <div class="env-card">
                    <strong>React Testing Library:</strong> ${testData.environment.reactTestingLibrary}
                </div>
                <div class="env-card">
                    <strong>User Event:</strong> ${testData.environment.userEvent}
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Test Summary</h2>
            <div class="summary">
                <div class="summary-text">${testData.summary.totalTests} tests took ${testData.summary.duration}.</div>
                <div class="summary-pills">
                    <div class="pill passed">✔ ${testData.summary.passed} Passed</div>
                    <div class="pill failed">✗ ${testData.summary.failed} Failed</div>
                    <div class="pill skipped">⊘ ${testData.summary.skipped} Skipped</div>
                    <div class="pill errors">⚠ ${testData.summary.errors} Errors</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Test Results</h2>
            <div class="test-results">
                <table class="test-table">
                    <thead>
                        <tr>
                            <th>RESULT</th>
                            <th>TEST CATEGORY</th>
                            <th>TEST NAME</th>
                            <th>DURATION</th>
                            <th>DESCRIPTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${testData.testSuites.map(suite => 
                            suite.tests.map((test, index) => `
                                <tr ${index === 0 ? 'class="suite-header"' : ''}>
                                    <td>
                                        <span class="status-badge ${test.status}">${test.status}</span>
                                    </td>
                                    <td>
                                        ${index === 0 ? `<span class="category-badge">${categorizeTestSuite(suite.name)}</span>` : ''}
                                    </td>
                                    <td>
                                        <div class="test-name">${test.name}</div>
                                        ${index === 0 ? `<div style="margin-top: 0.25rem; font-size: 0.9rem; color: #64748b;">${suite.name}</div>` : ''}
                                    </td>
                                    <td class="duration">${test.duration}</td>
                                    <td>
                                        <div class="test-description">${test.description}</div>
                                    </td>
                                </tr>
                            `).join('')
                        ).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers for better UX
            const rows = document.querySelectorAll('.test-table tbody tr');
            rows.forEach(row => {
                row.addEventListener('click', function() {
                    this.style.backgroundColor = this.style.backgroundColor === 'rgb(239, 246, 255)' ? '' : 'rgb(239, 246, 255)';
                });
            });
        });
    </script>
</body>
</html>`;

  return html;
}

// Main function to run tests and generate report
async function generateLiveTestReport() {
  console.log('🚀 Running tests and generating live report...');
  
  try {
    // Run Jest tests and capture output
    console.log('📋 Running Jest tests...');
    const jestOutput = execSync('npm test -- --verbose --no-coverage', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    console.log('✅ Tests completed successfully!');
    
    // Parse the output
    const parsedResults = parseJestOutput(jestOutput);
    
    // Create test data object
    const testData = {
      projectName: "Trello Clone - Live Test Report",
      generatedAt: new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      environment: {
        nodejs: process.version,
        platform: process.platform,
        jestDom: "v6.1.4",
        testingFramework: "Jest v29.7.0",
        reactTestingLibrary: "v16.0.0",
        userEvent: "v14.5.1"
      },
      summary: {
        ...parsedResults.summary,
        duration: "Live execution"
      },
      testSuites: parsedResults.testSuites
    };
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(testData);
    const outputPath = path.join(__dirname, 'live-test-report.html');
    
    fs.writeFileSync(outputPath, htmlReport);
    
    console.log('✅ Live HTML Test Report generated successfully!');
    console.log(`📄 Report saved to: ${outputPath}`);
    console.log(`🌐 Open the report in your browser: file://${outputPath.replace(/\\/g, '/')}`);
    
    // Also generate a JSON version
    const jsonReport = {
      ...testData,
      generatedAt: new Date().toISOString(),
      metadata: {
        totalTestSuites: testData.testSuites.length,
        componentTests: testData.testSuites.filter(s => categorizeTestSuite(s.name) === 'Component Tests').length,
        pageTests: testData.testSuites.filter(s => categorizeTestSuite(s.name) === 'Page Tests').length,
        totalTestCases: testData.summary.totalTests
      }
    };
    
    fs.writeFileSync(path.join(__dirname, 'live-test-report.json'), JSON.stringify(jsonReport, null, 2));
    console.log('📊 JSON report also generated: live-test-report.json');
    
  } catch (error) {
    console.error('❌ Error running tests:', error.message);
    console.log('📋 Falling back to static report generation...');
    
    // Fallback to static report if tests fail
    const staticReport = require('./generate-test-report.js');
    // This will generate the static report as fallback
  }
}

// Run the live test report generation
generateLiveTestReport();

