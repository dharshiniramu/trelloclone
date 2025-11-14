# Test Report Generator

This project includes two HTML test report generators that create beautiful, comprehensive test reports similar to the one shown in your reference image.

## 📊 Available Reports

### 1. Static Test Report (`test-report.html`)
- **Command**: `npm run test:report`
- **Description**: Generates a static HTML report based on the analyzed test cases
- **Features**:
  - All 70 test cases from 13 test suites
  - Component tests (20 tests) and Page tests (50 tests)
  - Detailed test descriptions and categories
  - Beautiful responsive design
  - Interactive table rows

### 2. Live Test Report (`live-test-report.html`)
- **Command**: `npm run test:live-report`
- **Description**: Runs the actual Jest tests and generates a live report
- **Features**:
  - Real-time test execution
  - Actual test durations and results
  - Automatic parsing of Jest output
  - Fallback to static report if tests fail

## 🚀 Quick Start

```bash
# Generate static report (fastest)
npm run test:report

# Generate live report (runs actual tests)
npm run test:live-report

# Run tests normally
npm test

# Run tests with coverage
npm run test:coverage
```

## 📁 Generated Files

After running either command, you'll get:

- `test-report.html` - Static HTML report
- `test-report.json` - JSON data for programmatic access
- `live-test-report.html` - Live HTML report (if using live command)
- `live-test-report.json` - Live JSON data (if using live command)

## 🎨 Report Features

### Visual Design
- **Modern UI**: Clean, professional design with gradient headers
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Interactive**: Clickable table rows for better UX
- **Color-coded**: Status badges and category indicators

### Test Information
- **Environment Details**: Node.js version, platform, testing frameworks
- **Test Summary**: Total tests, passed/failed/skipped counts
- **Detailed Results**: Individual test cases with descriptions
- **Categories**: Component Tests vs Page Tests
- **Durations**: Actual test execution times

### Test Categories

#### Component Tests (20 tests)
- CreateBoardFromTemplateModal Component (5 tests)
- Navbar Component (5 tests)
- NotificationContainer Component (5 tests)
- Sidebar Component (5 tests)

#### Page Tests (50 tests)
- Board Detail Page (5 tests)
- Boards Page (10 tests)
- Home Page (5 tests)
- How to Use Page (5 tests)
- Login Page (5 tests)
- Signup Page (5 tests)
- Templates Page (5 tests)
- Workspace Page (5 tests)
- WorkspaceBoards Page (5 tests)

## 🔧 Customization

### Modifying Test Descriptions
Edit the `getTestDescription()` function in `generate-test-report.js` to customize test descriptions.

### Adding New Test Categories
Modify the `categorizeTestSuite()` function in `generate-live-test-report.js` to add new test categories.

### Styling Changes
The CSS is embedded in the HTML files. You can modify the `<style>` section to change colors, fonts, or layout.

## 📈 Test Coverage

The reports show comprehensive coverage of:
- ✅ Authentication flows (login/signup)
- ✅ Navigation components
- ✅ Page layouts and routing
- ✅ User interactions and form handling
- ✅ State management (loading, empty, error states)
- ✅ Template system functionality
- ✅ Workspace management
- ✅ Notification system

## 🌐 Viewing Reports

1. **Local File**: Open the HTML file directly in your browser
2. **File Path**: The console will show the exact file path
3. **Browser**: Copy the file:// URL from the console output

## 🛠️ Troubleshooting

### If tests fail to run:
- Ensure all dependencies are installed: `npm install`
- Check Jest configuration in `jest.config.js`
- Verify test files are in the correct location

### If report generation fails:
- Check Node.js version compatibility
- Ensure write permissions in the project directory
- Verify file paths are correct

## 📝 Notes

- The static report is based on the analysis of existing test files
- The live report runs actual Jest tests and may take longer
- Both reports generate identical HTML structure and styling
- JSON reports are included for programmatic access to test data

## 🎯 Future Enhancements

Potential improvements for the report generator:
- Add test coverage visualization
- Include performance metrics
- Add test history tracking
- Generate PDF reports
- Add filtering and search functionality
- Include test failure screenshots

