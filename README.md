# Text Analyzer UI - Angular Application

A modern Angular application for sentiment analysis built with TypeScript, Angular routing, and reactive forms.

## Project Overview

**Text Analyzer UI** is an Angular-based web application designed to analyze and understand text. The application provides a user-friendly interface for text analysis workflows.

## Features

- 📝 **Text Input Analysis**: Submit text for real-time sentiment analysis
- 🎯 **Sentiment Classification**: Categorize text as Positive, Negative, or Neutral
- 📊 **Confidence Scoring**: Get confidence levels for each analysis
- 🎨 **Modern UI**: Clean and responsive design with gradient background
- ⚡ **Reactive Forms**: Built with Angular Reactive Forms for robust form handling
- 🛣️ **Routing**: Feature-based module routing with lazy loading

## Project Structure

```
DeepSentimentAnalysis/
├── src/
│   ├── app/
│   │   ├── components/          # Reusable components
│   │   ├── pages/
│   │   │   ├── analysis/        # Analysis feature module
│   │   │   │   ├── analysis.component.ts
│   │   │   │   ├── analysis.component.html
│   │   │   │   ├── analysis.component.css
│   │   │   │   ├── analysis.module.ts
│   │   │   │   └── analysis-routing.module.ts
│   │   ├── services/            # Application services
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.css
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   ├── main.ts
│   ├── index.html
│   └── styles.css
├── angular.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── package.json
└── .editorconfig
```

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Angular CLI**: v17.0.0 or higher

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Verify installation**:
   ```bash
   ng version
   ```

## Development

### Start Development Server

```bash
npm start
```

The application will be available at `http://localhost:4200/`

### Build for Production

```bash
npm run build:prod
```

Output will be in the `dist/` directory.

### Watch Mode

For continuous build during development:

```bash
npm run watch
```

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
```

## Usage

1. **Navigate to the Analysis Page**: The application opens to the sentiment analysis page.
2. **Enter Text**: Type or paste text in the text input area (minimum 10 characters).
3. **Analyze**: Click the "Analyze Sentiment" button to process the text.
4. **View Results**: The analysis results display the sentiment classification and confidence score.
5. **Clear**: Use the "Clear" button to reset the form and results.

## Sentiment Analysis Logic

The sentiment analyzer evaluates text by detecting:
- **Positive keywords**: good, great, excellent, amazing, love, happy, wonderful, fantastic, best, perfect
- **Negative keywords**: bad, terrible, awful, hate, sad, worst, horrible, disappointing, poor

Classification is based on keyword frequency in the submitted text.

## Technologies Used

- **Angular 17**: Modern web framework
- **TypeScript 5.2**: Type-safe JavaScript
- **RxJS 7.8**: Reactive programming
- **Angular Forms**: Form handling and validation
- **Angular Router**: Application routing
- **CSS3**: Styling and animations

## Architecture

- **Modular Design**: Feature modules (Analysis module) for scalability
- **Lazy Loading**: Modules loaded on-demand for better performance
- **Reactive Forms**: Strong typing and reactive patterns
- **Service-Oriented**: Ready for API integration via services

## Configuration Files

- **angular.json**: Angular CLI configuration
- **tsconfig.json**: TypeScript compiler configuration
- **package.json**: npm dependencies and scripts
- **tsconfig.app.json**: Application-specific TypeScript settings
- **tsconfig.spec.json**: Test-specific TypeScript settings

## Styling

- **Global Styles**: `src/styles.css`
- **Component Styles**: Scoped CSS in component files
- **Responsive Design**: Mobile-first approach with media queries
- **Color Scheme**: Gradient background (purple to blue) with sentiment-specific highlights

## Future Enhancements

- Integration with NLP APIs (Google Cloud, AWS Comprehend, Azure Text Analytics)
- History and analytics dashboard
- Multi-language support
- Advanced sentiment metrics
- User authentication
- Real-time API integration
- Export analysis results

## File Configuration

### Development Environment

- **Node Version**: v18.20.3+
- **npm Version**: 10.7.0+
- **Package Manager**: npm

## Troubleshooting

### Dependencies Not Installing
If you encounter Node version compatibility issues:
```bash
# Update npm
npm install -g npm@latest

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
If port 4200 is already in use:
```bash
ng serve --port 4201
```

## License

This project is part of the SentimentAnalysis workspace.

## Support

For issues or questions, please refer to the Angular documentation:
- [Angular Official Docs](https://angular.io/docs)
- [Angular CLI Docs](https://angular.io/cli)

---

**Created**: April 16, 2026  
**Application Name**: Text Analyzer UI  
**Version**: 1.0.0
