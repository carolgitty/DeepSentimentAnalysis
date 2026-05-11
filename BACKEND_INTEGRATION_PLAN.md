# Backend Integration Plan - Text Analyzer UI

## Overview
This document outlines a comprehensive plan to integrate the Angular frontend with a backend service to perform real sentiment analysis using NLP APIs or custom ML models.

---

## Phase 1: Architecture Design

### 1.1 System Architecture

```
┌─────────────────────────────────────────────┐
│        Angular Frontend (Port 4600)         │
│  - Sentiment Analysis Component             │
│  - Form handling & validation               │
│  - Results display                          │
└────────────────────┬────────────────────────┘
                     │
                     │ HTTP/REST API
                     │ (JSON payloads)
                     │
┌────────────────────▼────────────────────────┐
│     Backend API Server (Node.js/Python)    │
│  - Express/Flask server                     │
│  - API endpoints                            │
│  - Request validation                       │
│  - Response formatting                      │
└────────────────────┬────────────────────────┘
                     │
                     │ Integration
                     │
┌────────────────────▼──────────────────────────────┐
│    Sentiment Analysis Services                    │
│  ┌────────────────────────────────────────────┐   │
│  │ Option 1: NLP APIs                         │   │
│  │ - Google Cloud Natural Language API        │   │
│  │ - AWS Comprehend                           │   │
│  │ - Azure Text Analytics                     │   │
│  │ - IBM Watson NLU                           │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │ Option 2: Open-Source NLP Libraries        │   │
│  │ - TextBlob / VADER (Python)                │   │
│  │ - spaCy                                    │   │
│  │ - NLTK                                     │   │
│  │ - Hugging Face Transformers                │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │ Option 3: Custom ML Model                  │   │
│  │ - TensorFlow/PyTorch model                 │   │
│  │ - Custom trained model                     │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 1.2 API Contract

#### Request Format
```json
POST /api/sentiment/analyze
{
  "text": "string",
  "language": "en" (optional),
  "model": "standard" (optional)
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "text": "string",
    "sentiment": "POSITIVE|NEGATIVE|NEUTRAL",
    "scores": {
      "positive": 0.85,
      "negative": 0.05,
      "neutral": 0.10
    },
    "confidence": 0.85,
    "language": "en",
    "keywords": ["great", "amazing"],
    "summary": "The text expresses a strongly positive sentiment",
    "timestamp": "2026-04-16T10:30:00Z"
  },
  "message": "Analysis successful"
}
```

---

## Phase 2: Frontend Service Layer

### 2.1 Create Sentiment API Service

Create `src/app/services/sentiment-api.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SentimentRequest {
  text: string;
  language?: string;
  model?: string;
}

export interface SentimentResponse {
  success: boolean;
  data: {
    text: string;
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    scores: {
      positive: number;
      negative: number;
      neutral: number;
    };
    confidence: number;
    language: string;
    keywords: string[];
    summary: string;
    timestamp: string;
  };
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SentimentApiService {
  private apiUrl = 'http://localhost:3000/api'; // Update based on backend

  constructor(private http: HttpClient) {}

  analyzeSentiment(request: SentimentRequest): Observable<SentimentResponse> {
    return this.http.post<SentimentResponse>(
      `${this.apiUrl}/sentiment/analyze`,
      request
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
```

### 2.2 Update Analysis Component

Modify `src/app/pages/analysis/analysis.component.ts`:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SentimentApiService, SentimentResponse } from '../../services/sentiment-api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit, OnDestroy {
  analysisForm!: FormGroup;
  result: SentimentResponse['data'] | null = null;
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private sentimentApi: SentimentApiService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.analysisForm = this.fb.group({
      textInput: ['', [Validators.required, Validators.minLength(10)]],
      language: ['en']
    });
  }

  onAnalyze(): void {
    if (this.analysisForm.valid) {
      this.loading = true;
      this.error = null;
      
      const request = {
        text: this.analysisForm.get('textInput')?.value,
        language: this.analysisForm.get('language')?.value
      };

      this.sentimentApi.analyzeSentiment(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.result = response.data;
            this.loading = false;
          },
          error: (err) => {
            this.error = err.message;
            this.loading = false;
            console.error('Analysis error:', err);
          }
        });
    }
  }

  onClear(): void {
    this.analysisForm.reset();
    this.result = null;
    this.error = null;
  }

  get textInput() {
    return this.analysisForm.get('textInput');
  }
}
```

### 2.3 Update HTML Template

Modify `src/app/pages/analysis/analysis.component.html`:

```html
<div class="analysis-container">
  <div class="analysis-card">
    <h2>Sentiment Analysis</h2>
    <p class="description">Enter text to analyze its sentiment</p>

    <!-- Error Message -->
    <div class="alert alert-error" *ngIf="error">
      <strong>Error:</strong> {{ error }}
    </div>

    <form [formGroup]="analysisForm" (ngSubmit)="onAnalyze()">
      <div class="form-group">
        <label for="textInput">Text Input:</label>
        <textarea
          id="textInput"
          formControlName="textInput"
          class="text-input"
          placeholder="Enter text to analyze..."
          rows="6"
          [disabled]="loading">
        </textarea>
        <small class="error-message" *ngIf="textInput?.invalid && textInput?.touched">
          Please enter at least 10 characters
        </small>
      </div>

      <div class="form-group">
        <label for="language">Language:</label>
        <select id="language" formControlName="language" class="select-input" [disabled]="loading">
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>

      <div class="button-group">
        <button
          type="submit"
          class="btn btn-primary"
          [disabled]="analysisForm.invalid || loading">
          {{ loading ? 'Analyzing...' : 'Analyze Sentiment' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          (click)="onClear()"
          [disabled]="loading">
          Clear
        </button>
      </div>
    </form>

    <!-- Results Section -->
    <div class="result-container" *ngIf="result">
      <h3>Analysis Result</h3>
      
      <div class="result-item">
        <span class="label">Sentiment:</span>
        <span class="value" [ngClass]="'sentiment-' + result.sentiment.toLowerCase()">
          {{ result.sentiment }}
        </span>
      </div>

      <div class="result-item">
        <span class="label">Confidence:</span>
        <div class="progress-bar">
          <div class="progress" [style.width.%]="result.confidence * 100"></div>
        </div>
        <span class="value">{{ (result.confidence * 100).toFixed(2) }}%</span>
      </div>

      <div class="result-item">
        <span class="label">Sentiment Scores:</span>
        <div class="scores">
          <div class="score-item">
            <span>Positive:</span>
            <span>{{ (result.scores.positive * 100).toFixed(2) }}%</span>
          </div>
          <div class="score-item">
            <span>Negative:</span>
            <span>{{ (result.scores.negative * 100).toFixed(2) }}%</span>
          </div>
          <div class="score-item">
            <span>Neutral:</span>
            <span>{{ (result.scores.neutral * 100).toFixed(2) }}%</span>
          </div>
        </div>
      </div>

      <div class="result-item">
        <span class="label">Keywords:</span>
        <div class="keywords">
          <span class="keyword" *ngFor="let keyword of result.keywords">{{ keyword }}</span>
        </div>
      </div>

      <div class="result-item">
        <span class="label">Summary:</span>
        <p class="text-value">{{ result.summary }}</p>
      </div>

      <div class="result-item">
        <span class="label">Analyzed Text:</span>
        <p class="text-value">{{ result.text }}</p>
      </div>

      <div class="result-item">
        <span class="label">Timestamp:</span>
        <span class="value">{{ result.timestamp }}</span>
      </div>
    </div>
  </div>
</div>
```

### 2.4 Update Styles

Add to `src/app/pages/analysis/analysis.component.css`:

```css
.alert {
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.alert-error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.select-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.select-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.score-item {
  background-color: #f5f5f5;
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.keyword {
  background-color: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}
```

---

## Phase 3: Backend Implementation

### 3.1 Node.js + Express Backend

Create `backend/package.json`:

```json
{
  "name": "sentiment-analysis-api",
  "version": "1.0.0",
  "description": "Backend API for sentiment analysis",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "axios": "^1.4.0",
    "natural": "^6.7.0",
    "sentiment": "^5.0.2"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0"
  }
}
```

Create `backend/src/index.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
const sentimentRouter = require('./routes/Sentiment');
app.use('/api/Sentiment', sentimentRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sentiment Analysis API running on port ${PORT}`);
});
```

Create `backend/src/routes/sentiment.js`:

```javascript
const express = require('express');
const router = express.Router();
const sentimentController = require('../controllers/sentimentController');
const { validateRequest } = require('../middleware/validation');

router.post('/analyze', validateRequest, sentimentController.analyze);
router.get('/health', (req, res) => res.json({ status: 'OK' }));

module.exports = router;
```

Create `backend/src/controllers/sentimentController.js`:

```javascript
const sentimentService = require('../services/sentimentService');

exports.analyze = async (req, res) => {
  try {
    const { text, language = 'en', model = 'standard' } = req.body;

    const result = await sentimentService.analyzeSentiment(text, language, model);

    res.json({
      success: true,
      data: result,
      message: 'Analysis successful'
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
```

Create `backend/src/services/sentimentService.js`:

```javascript
const Sentiment = require('sentiment');
const natural = require('natural');

const sentiment = new Sentiment();

exports.analyzeSentiment = async (text, language = 'en', model = 'standard') => {
  // Validate input
  if (!text || text.trim().length < 10) {
    throw new Error('Text must be at least 10 characters long');
  }

  let result;

  if (model === 'standard') {
    result = analyzeWithSentiment(text);
  } else if (model === 'nlp') {
    result = analyzeWithNLP(text);
  } else {
    throw new Error('Unknown model');
  }

  return {
    text,
    sentiment: result.sentiment,
    scores: result.scores,
    confidence: result.confidence,
    language,
    keywords: result.keywords,
    summary: result.summary,
    timestamp: new Date().toISOString()
  };
};

function analyzeWithSentiment(text) {
  const sentimentResult = sentiment.analyze(text);

  const score = sentimentResult.score;
  const comparative = sentimentResult.comparative;

  let sentiment_label;
  let confidence;

  if (score > 0) {
    sentiment_label = 'POSITIVE';
    confidence = Math.min(Math.abs(comparative) / 5, 1);
  } else if (score < 0) {
    sentiment_label = 'NEGATIVE';
    confidence = Math.min(Math.abs(comparative) / 5, 1);
  } else {
    sentiment_label = 'NEUTRAL';
    confidence = 0.5;
  }

  const keywords = extractKeywords(text);

  return {
    sentiment: sentiment_label,
    scores: {
      positive: score > 0 ? confidence : 0.1,
      negative: score < 0 ? confidence : 0.1,
      neutral: score === 0 ? 0.8 : 0.2
    },
    confidence: confidence,
    keywords: keywords,
    summary: generateSummary(sentiment_label, confidence),
    score: score
  };
}

function analyzeWithNLP(text) {
  // Placeholder for more advanced NLP analysis
  // Can integrate Google Cloud, AWS, or other services here
  return analyzeWithSentiment(text);
}

function extractKeywords(text) {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  
  return tokens
    .filter(token => !stopWords.has(token) && token.length > 3)
    .slice(0, 5);
}

function generateSummary(sentiment, confidence) {
  const confidenceLevel = confidence > 0.7 ? 'strongly' : confidence > 0.4 ? 'moderately' : 'weakly';
  return `The text expresses a ${confidenceLevel} ${sentiment.toLowerCase()} sentiment.`;
}
```

Create `backend/src/middleware/validation.js`:

```javascript
exports.validateRequest = (req, res, next) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'Text field is required'
    });
  }

  if (typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Text must be a string with at least 10 characters'
    });
  }

  next();
};
```

### 3.2 Backend Environment Setup

Create `backend/.env`:

```
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Optional: If using external NLP services
GOOGLE_CLOUD_API_KEY=your_key
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_key
AZURE_API_KEY=your_key
```

---

## Phase 4: CORS & Proxy Configuration

### 4.1 Frontend CORS Setup

Update `src/app/app.module.ts`:

```typescript
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ApiInterceptor } from './interceptors/api.interceptor';

@NgModule({
  imports: [
    HttpClientModule,
    // ... other imports
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true
    }
  ]
})
export class AppModule { }
```

Create `src/app/interceptors/api.interceptor.ts`:

```typescript
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Add headers if needed
    request = request.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      }
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);
        return throwError(() => error);
      })
    );
  }
}
```

### 4.2 Angular Proxy Configuration

Create `proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": {
      "^/api": "/api"
    }
  }
}
```

Update `package.json` start script:

```json
"start": "ng serve --port 4600 --proxy-config proxy.conf.json"
```

---

## Phase 5: Implementation Steps

### Step 1: Set Up Backend
```bash
mkdir backend
cd backend
npm init -y
npm install express cors dotenv axios natural sentiment nodemon

# Create dirs
mkdir src src/routes src/controllers src/services src/middleware

# Implement files from Phase 3
```

### Step 2: Update Frontend Service
```bash
# Create sentiment-api.service.ts
# Update analysis.component.ts
# Update analysis.component.html
```

### Step 3: Configure Environment
```bash
# Create environment files
ng generate environments

# Set API URLs in environment files
```

### Step 4: Test Integration
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm start
```

### Step 5: Handle Errors & Logging
- Implement error boundaries
- Add logging service
- Create interceptors for error handling
- Add loading states

---

## Phase 6: Advanced Features

### 6.1 Caching Service

```typescript
@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, any>();
  
  get(key: string): any {
    return this.cache.get(key);
  }
  
  set(key: string, value: any): void {
    this.cache.set(key, value);
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

### 6.2 History/Analytics

```typescript
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private analyses: Analysis[] = [];
  
  addAnalysis(analysis: Analysis): void {
    this.analyses.push(analysis);
    // Save to localStorage or backend
  }
  
  getHistory(): Analysis[] {
    return this.analyses;
  }
}
```

### 6.3 Rate Limiting

```typescript
export class RateLimitInterceptor implements HttpInterceptor {
  private requestCount = 0;
  private resetTime = Date.now() + 60000; // 1 minute
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (Date.now() > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }
    
    if (this.requestCount > 100) {
      return throwError(() => new Error('Rate limit exceeded'));
    }
    
    this.requestCount++;
    return next.handle(req);
  }
}
```

---

## Phase 7: Deployment

### 7.1 Docker Setup

`backend/Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
```

`Dockerfile` (Frontend):
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:prod

FROM nginx:alpine
COPY --from=build /app/dist/text-analyzer-ui /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 7.2 Environment-Specific Configs

`src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

`src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.sentiment-analysis.com'
};
```

---

## Summary of Changes

| Phase | Component | Changes |
|-------|-----------|---------|
| 1 | Architecture | Design system architecture and API contract |
| 2 | Frontend | Create sentiment service, interceptors, update components |
| 3 | Backend | Set up Express server with sentiment analysis |
| 4 | Configuration | CORS, proxy, environment setup |
| 5 | Integration | Connect frontend to backend |
| 6 | Features | Add caching, history, rate limiting |
| 7 | Deployment | Docker, CI/CD setup |

---

## Technology Stack Recommendations

### Backend Options
- **Node.js + Express** (Recommended for quick setup)
- **Python + Flask/FastAPI** (Better for ML/NLP)
- **Java + Spring Boot** (Enterprise)

### NLP Services
- **Google Cloud Natural Language API** (Most mature)
- **AWS Comprehend** (AWS ecosystem)
- **Azure Text Analytics** (Microsoft ecosystem)
- **Open-source** (TextBlob, spaCy, NLTK)

### Database (Optional)
- **MongoDB** (NoSQL, flexible)
- **PostgreSQL** (Relational, reliable)
- **Firebase** (Serverless)

---

## Security Considerations

- ✅ Validate all inputs on backend
- ✅ Use HTTPS in production
- ✅ Implement authentication if needed
- ✅ Add rate limiting
- ✅ Sanitize outputs
- ✅ Use environment variables for sensitive data
- ✅ Implement CORS properly
- ✅ Add request validation middleware

---

## Performance Optimization

- 🚀 Cache results for repeated analyses
- 🚀 Implement pagination for history
- 🚀 Use lazy loading for modules
- 🚀 Compress API responses
- 🚀 Implement request debouncing
- 🚀 Use async/await properly
- 🚀 Monitor backend performance

---

## Next Steps

1. Choose backend technology (Node.js, Python, etc.)
2. Choose NLP service or library
3. Implement sentiment API service
4. Set up backend server
5. Configure CORS and proxy
6. Test integration
7. Add advanced features
8. Prepare for deployment
