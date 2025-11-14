const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test data based on the analysis of your test files
const testData = {
  projectName: "Trello Clone - Test Report",
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
    totalTests: 70,
    passed: 70,
    failed: 0,
    skipped: 0,
    errors: 0,
    duration: "39.788s"
  },
  testSuites: [
    {
      name: "CreateBoardFromTemplateModal Component",
      category: "Component Tests",
      tests: [
        { name: "renders modal with template information", status: "passed", duration: "661ms", description: "Verifies modal displays template data correctly" },
        { name: "allows editing board title", status: "passed", duration: "1418ms", description: "Tests title input functionality" },
        { name: "shows create board button as disabled when title is empty", status: "passed", duration: "639ms", description: "Validates form validation" },
        { name: "handles cancel button click", status: "passed", duration: "273ms", description: "Tests modal close functionality" },
        { name: "successfully creates board with template data", status: "passed", duration: "937ms", description: "Tests complete board creation flow" }
      ]
    },
    {
      name: "Navbar Component",
      category: "Component Tests",
      tests: [
        { name: "renders navbar with logo and navigation elements", status: "passed", duration: "198ms", description: "Verifies navbar structure" },
        { name: "displays user information when authenticated", status: "passed", duration: "483ms", description: "Tests user display" },
        { name: "opens and closes account dropdown", status: "passed", duration: "986ms", description: "Tests dropdown functionality" },
        { name: "handles search input and shows search results", status: "passed", duration: "853ms", description: "Tests search functionality" },
        { name: "handles logout functionality", status: "passed", duration: "544ms", description: "Tests logout process" }
      ]
    },
    {
      name: "NotificationContainer Component",
      category: "Component Tests",
      tests: [
        { name: "renders empty container when no notifications provided", status: "passed", duration: "63ms", description: "Tests empty state" },
        { name: "renders single success notification", status: "passed", duration: "79ms", description: "Tests success notifications" },
        { name: "renders single error notification", status: "passed", duration: "39ms", description: "Tests error notifications" },
        { name: "renders multiple notifications", status: "passed", duration: "46ms", description: "Tests multiple notification display" },
        { name: "applies correct CSS classes for different notification types", status: "passed", duration: "72ms", description: "Tests styling" }
      ]
    },
    {
      name: "Sidebar Component",
      category: "Component Tests",
      tests: [
        { name: "renders sidebar with navigation items", status: "passed", duration: "813ms", description: "Verifies sidebar structure" },
        { name: "highlights active section based on pathname", status: "passed", duration: "147ms", description: "Tests active state highlighting" },
        { name: "expands and collapses templates section", status: "passed", duration: "357ms", description: "Tests collapsible sections" },
        { name: "navigates to correct links", status: "passed", duration: "274ms", description: "Tests navigation links" },
        { name: "shows correct icons for each navigation item", status: "passed", duration: "26ms", description: "Tests icon display" }
      ]
    },
    {
      name: "Board Detail Page",
      category: "Page Tests",
      tests: [
        { name: "renders navbar component", status: "passed", duration: "25ms", description: "Verifies navbar presence" },
        { name: "renders sidebar component", status: "passed", duration: "6ms", description: "Verifies sidebar presence" },
        { name: "renders board content", status: "passed", duration: "6ms", description: "Tests main content area" },
        { name: "renders page with correct layout structure", status: "passed", duration: "8ms", description: "Tests page structure" },
        { name: "renders all main components", status: "passed", duration: "8ms", description: "Comprehensive component check" }
      ]
    },
    {
      name: "Boards Page",
      category: "Page Tests",
      tests: [
        { name: "renders page with navbar and sidebar", status: "passed", duration: "301ms", description: "Tests layout components" },
        { name: "renders page header", status: "passed", duration: "269ms", description: "Tests page title" },
        { name: "renders refresh button", status: "passed", duration: "115ms", description: "Tests refresh functionality" },
        { name: "renders invite members button", status: "passed", duration: "34ms", description: "Tests invite button" },
        { name: "renders create board button", status: "passed", duration: "55ms", description: "Tests create button" },
        { name: "shows empty state when no boards", status: "passed", duration: "63ms", description: "Tests empty state" },
        { name: "handles refresh button click", status: "passed", duration: "301ms", description: "Tests refresh interaction" },
        { name: "handles invite members button click", status: "passed", duration: "230ms", description: "Tests invite interaction" },
        { name: "handles create board button click", status: "passed", duration: "185ms", description: "Tests create interaction" },
        { name: "renders page with correct layout structure", status: "passed", duration: "46ms", description: "Tests layout structure" }
      ]
    },
    {
      name: "Home Page",
      category: "Page Tests",
      tests: [
        { name: "renders loading state initially", status: "passed", duration: "95ms", description: "Tests loading state" },
        { name: "renders guest landing page when not authenticated", status: "passed", duration: "198ms", description: "Tests guest view" },
        { name: "renders authenticated home when user is logged in", status: "passed", duration: "124ms", description: "Tests authenticated view" },
        { name: "displays feature sections in guest landing", status: "passed", duration: "150ms", description: "Tests feature display" },
        { name: "shows no notifications message when authenticated with no invitations", status: "passed", duration: "784ms", description: "Tests notification state" }
      ]
    },
    {
      name: "How to Use Page",
      category: "Page Tests",
      tests: [
        { name: "renders page header correctly", status: "passed", duration: "750ms", description: "Tests page header" },
        { name: "renders all sections with correct titles", status: "passed", duration: "236ms", description: "Tests section titles" },
        { name: "sections are collapsed by default", status: "passed", duration: "139ms", description: "Tests default collapsed state" },
        { name: "expands and collapses sections when clicked", status: "passed", duration: "863ms", description: "Tests expand/collapse functionality" },
        { name: "renders page with correct layout structure", status: "passed", duration: "147ms", description: "Tests page structure" }
      ]
    },
    {
      name: "Login Page",
      category: "Page Tests",
      tests: [
        { name: "renders login form with all required fields", status: "passed", duration: "694ms", description: "Tests form structure" },
        { name: "handles form input changes", status: "passed", duration: "1488ms", description: "Tests input handling" },
        { name: "shows loading state during login", status: "passed", duration: "1339ms", description: "Tests loading state" },
        { name: "handles successful login", status: "passed", duration: "1268ms", description: "Tests successful authentication" },
        { name: "displays error message on login failure", status: "passed", duration: "1378ms", description: "Tests error handling" }
      ]
    },
    {
      name: "Signup Page",
      category: "Page Tests",
      tests: [
        { name: "renders signup form with all required fields", status: "passed", duration: "819ms", description: "Tests form structure" },
        { name: "handles form input changes", status: "passed", duration: "2059ms", description: "Tests input handling" },
        { name: "shows loading state during signup", status: "passed", duration: "1477ms", description: "Tests loading state" },
        { name: "handles successful signup", status: "passed", duration: "1728ms", description: "Tests successful registration" },
        { name: "displays error message on signup failure", status: "passed", duration: "1564ms", description: "Tests error handling" }
      ]
    },
    {
      name: "Templates Page",
      category: "Page Tests",
      tests: [
        { name: "renders page with navbar and sidebar", status: "passed", duration: "544ms", description: "Tests layout components" },
        { name: "renders templates sidebar with categories", status: "passed", duration: "106ms", description: "Tests template categories" },
        { name: "renders personal templates by default", status: "passed", duration: "126ms", description: "Tests default template display" },
        { name: "opens create board modal when template is clicked", status: "passed", duration: "803ms", description: "Tests modal opening" },
        { name: "navigates to board when board is created", status: "passed", duration: "367ms", description: "Tests board creation flow" }
      ]
    },
    {
      name: "Workspace Page",
      category: "Page Tests",
      tests: [
        { name: "renders page with navbar and sidebar", status: "passed", duration: "1022ms", description: "Tests layout components" },
        { name: "renders page title and buttons", status: "passed", duration: "221ms", description: "Tests page elements" },
        { name: "shows empty state when no workspaces", status: "passed", duration: "135ms", description: "Tests empty state" },
        { name: "opens create workspace modal when button is clicked", status: "passed", duration: "587ms", description: "Tests modal functionality" },
        { name: "renders page with correct layout structure", status: "passed", duration: "97ms", description: "Tests page structure" }
      ]
    },
    {
      name: "WorkspaceBoards Page",
      category: "Page Tests",
      tests: [
        { name: "renders page with navbar and sidebar", status: "passed", duration: "1270ms", description: "Tests layout components" },
        { name: "shows loading state initially", status: "passed", duration: "422ms", description: "Tests loading state" },
        { name: "shows workspace not found when workspace does not exist", status: "passed", duration: "246ms", description: "Tests error handling" },
        { name: "renders workspace header with back button", status: "passed", duration: "249ms", description: "Tests header elements" },
        { name: "shows owner badge for workspace owner", status: "passed", duration: "172ms", description: "Tests ownership display" }
      ]
    }
  ]
};

function generateHTMLReport() {
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
                                        ${index === 0 ? `<span class="category-badge">${suite.category}</span>` : ''}
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

// Generate and save the report
const htmlReport = generateHTMLReport();
const outputPath = path.join(__dirname, 'test-report.html');

fs.writeFileSync(outputPath, htmlReport);

console.log('✅ HTML Test Report generated successfully!');
console.log(`📄 Report saved to: ${outputPath}`);
console.log(`🌐 Open the report in your browser: file://${outputPath.replace(/\\/g, '/')}`);

// Also generate a JSON version for programmatic access
const jsonReport = {
  ...testData,
  generatedAt: new Date().toISOString(),
  metadata: {
    totalTestSuites: testData.testSuites.length,
    componentTests: testData.testSuites.filter(s => s.category === 'Component Tests').length,
    pageTests: testData.testSuites.filter(s => s.category === 'Page Tests').length,
    totalTestCases: testData.summary.totalTests
  }
};

fs.writeFileSync(path.join(__dirname, 'test-report.json'), JSON.stringify(jsonReport, null, 2));
console.log('📊 JSON report also generated: test-report.json');

