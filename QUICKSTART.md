# Quick Start Guide

## Welcome to Text Analyzer UI!

A modern Angular application for sentiment analysis.

### Step 1: Install Dependencies

```bash
cd DeepSentimentAnalysis
npm install
```

**Note**: The first installation may take a few minutes.

### Step 2: Start Development Server

```bash
npm start
```

The application will open automatically at `http://localhost:4200/`

### Step 3: Analyze Sentiment

1. Navigate to the Analysis page (loads by default)
2. Enter text (minimum 10 characters)
3. Click "Analyze Sentiment"
4. View the sentiment classification and confidence score

### Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm run build:prod` | Production build with optimizations |
| `npm run watch` | Watch mode for continuous development |
| `npm test` | Run unit tests |
| `npm run lint` | Lint TypeScript code |

### Project Structure

- **src/app/pages/analysis** - Sentiment analysis feature module
- **src/app/components** - Reusable components
- **src/app/services** - Application services
- **src/index.html** - Main HTML entry point
- **src/main.ts** - Angular bootstrap
- **src/styles.css** - Global styles

### Key Features

✨ **Sentiment Analysis** - Classify text as Positive, Negative, or Neutral  
🎯 **Confidence Scoring** - Get analysis confidence levels  
🎨 **Modern UI** - Clean, responsive design  
⚡ **Reactive Forms** - Robust form handling  
🛣️ **Lazy Loading** - Feature modules loaded on-demand  

### Technologies

- Angular 17
- TypeScript 5.2
- RxJS 7.8
- Reactive Forms
- Angular Router

### Next Steps

1. **Explore the Code**: Check `src/app/pages/analysis/` for the main analysis logic
2. **Add Services**: Create sentiment analysis services in `src/app/services/`
3. **Integrate API**: Connect to a real NLP API
4. **Customize UI**: Modify styles in component CSS files
5. **Add Tests**: Create test files with `.spec.ts` extension

### Troubleshooting

**Port 4200 already in use?**
```bash
ng serve --port 4201
```

**Dependencies not installing?**
```bash
npm cache clean --force
npm install
```

**TypeScript errors?**
```bash
npm run lint
```

### Documentation

- [Angular Documentation](https://angular.io/docs)
- [Angular CLI Guide](https://angular.io/cli)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [RxJS Documentation](https://rxjs.dev/)

### Support

For more information, see the [README.md](./README.md) file in the project root.

---

**Happy coding! 🚀**
