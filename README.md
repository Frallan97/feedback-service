# Feedback Service

A centralized microservice for collecting, managing, and analyzing user feedback from multiple applications.

## Features

- **Multi-Tenant Architecture**: Support multiple applications with isolated feedback data
- **Dual Authentication**: API key auth for public submissions, JWT auth for admin dashboard
- **Admin Dashboard**: React-based interface for managing feedback across all applications
- **RESTful API**: Complete CRUD operations with filtering and pagination
- **Comments & Discussions**: Internal and public comments on feedback items
- **Role-Based Access Control**: Casbin integration for fine-grained permissions
- **Status Management**: Track feedback lifecycle (new, in progress, resolved, closed)
- **Categories**: Organize feedback with customizable categories per application

## Architecture

### Components

1. **Backend API** (Go)
   - REST API with public and admin endpoints
   - PostgreSQL database
   - API key authentication for client applications
   - JWT authentication from auth-service for admins

2. **Admin Dashboard** (React + TypeScript)
   - Feedback management interface
   - Application and API key management
   - Comment threads
   - Status and priority updates

3. **Database** (PostgreSQL)
   - Applications, categories, feedback, comments, attachments
   - Full referential integrity
   - Indexed for performance

### API Endpoints

#### Public API (API Key Authentication)

```
POST   /api/v1/public/feedback              - Submit feedback
GET    /api/v1/public/feedback/:id          - Get feedback status
GET    /api/v1/public/categories            - List categories
```

#### Admin API (JWT Authentication)

```
GET    /api/v1/feedback                     - List feedback (with filters)
GET    /api/v1/feedback/:id                 - Get feedback details
PATCH  /api/v1/feedback/:id                 - Update feedback
DELETE /api/v1/feedback/:id                 - Delete feedback

GET    /api/v1/feedback/:id/comments        - List comments
POST   /api/v1/feedback/:id/comments        - Add comment

GET    /api/v1/applications                 - List applications
POST   /api/v1/applications                 - Create application
GET    /api/v1/applications/:id             - Get application (with API key)
PATCH  /api/v1/applications/:id             - Update application
DELETE /api/v1/applications/:id             - Delete application
POST   /api/v1/applications/:id/regenerate-key - Regenerate API key

GET    /api/v1/applications/:id/categories  - List categories
POST   /api/v1/applications/:id/categories  - Create category
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Go 1.24+ (for local development)
- Bun (for frontend development)
- Access to auth-service (for authentication)

### Local Development

1. **Clone and setup**

```bash
cd /home/frans-sjostrom/Documents/hezner-hosted-projects/feedback-service
```

2. **Configure environment**

The `.env` file is already configured for local development. Key settings:

```env
# Backend
DATABASE_URL=postgresql://feedbackuser:feedbackpass@feedback-db:5432/feedbackdb?sslmode=disable
PORT=8082

# Frontend
VITE_API_URL=http://localhost:8082/api/v1
VITE_AUTH_SERVICE_URL=http://localhost:8081
```

3. **Start services**

```bash
docker compose up -d
```

This will start:
- `auth-db` (PostgreSQL) on port 5433
- `auth-service` (backend) on port 8081
- `feedback-db` (PostgreSQL) on port 5434
- `feedback-backend` (backend) on port 8082
- `feedback-frontend` (React) on http://localhost:5174

4. **Access the admin dashboard**

- Navigate to http://localhost:5174
- Login with Google OAuth (configured in auth-service)
- Create your first application to get an API key

5. **Submit test feedback**

```bash
curl -X POST http://localhost:8082/api/v1/public/feedback \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is test feedback",
    "title": "Test Submission",
    "rating": 5,
    "contact_email": "user@example.com"
  }'
```

## Usage Guide

### 1. Register an Application

1. Login to admin dashboard at http://localhost:5174
2. Navigate to "Applications"
3. Click "Create Application"
4. Fill in:
   - Name: Your application name
   - Slug: URL-friendly identifier
   - Description: Brief description
5. Copy the generated API key (keep it secret!)

### 2. Submit Feedback (API)

Use the API key to submit feedback from your application:

```typescript
const response = await fetch('http://localhost:8082/api/v1/public/feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY',
  },
  body: JSON.stringify({
    content: 'User feedback content',
    title: 'Optional title',
    rating: 4,
    contact_email: 'user@example.com',
    page_url: window.location.href,
    browser_info: {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight }
    }
  })
});
```

### 3. Manage Feedback (Dashboard)

- View all feedback in the "Feedback" section
- Click on feedback to see details
- Update status (new → in progress → resolved → closed)
- Add internal notes or public comments
- Filter by status, priority, application

### 4. Categories

Create categories to organize feedback:

1. Go to Applications page
2. Select an application
3. Add categories (e.g., "Bug", "Feature Request", "Question")
4. Assign colors and icons for visual organization

## Database Schema

### Applications

- Stores registered applications
- Each has a unique API key
- Can define allowed origins for CORS

### Feedback

- Main feedback data
- Links to application and optional user
- Status, priority, ratings
- Metadata (page URL, browser info, version)

### Categories

- Per-application categorization
- Customizable colors and icons

### Comments

- Discussion threads on feedback
- Internal (admin-only) and public comments

### Attachments

- Screenshots and file attachments
- Stored as URLs (file storage not included)

## Development

### Backend

```bash
cd backend

# Install dependencies
go mod download

# Run with hot reload (Air)
go install github.com/air-verse/air@latest
DEBUG=true ENVIRONMENT=development air

# Run tests
go test ./...

# Build
go build -o feedback-service main.go
```

### Frontend

```bash
cd frontend

# Install dependencies
bun install

# Start dev server
bun dev

# Build for production
bun run build

# Type check
bun run type-check
```

## API Client Library

Create a reusable client for your applications:

```typescript
// feedback-client.ts
export class FeedbackClient {
  constructor(private apiKey: string, private apiUrl: string) {}

  async submitFeedback(data: {
    content: string;
    title?: string;
    rating?: number;
    contact_email?: string;
  }) {
    const response = await fetch(`${this.apiUrl}/public/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        ...data,
        page_url: window.location.href,
        browser_info: {
          userAgent: navigator.userAgent,
        },
      }),
    });

    if (!response.ok) throw new Error('Failed to submit feedback');
    return response.json();
  }
}

// Usage
const feedbackClient = new FeedbackClient(
  process.env.FEEDBACK_API_KEY!,
  'http://localhost:8082/api/v1'
);

await feedbackClient.submitFeedback({
  content: 'Great feature!',
  rating: 5,
});
```

## Implementation Status

### ✅ Completed (MVP)

- Backend API with all CRUD endpoints
- Database schema and migrations
- API key and JWT authentication
- Admin dashboard (Dashboard, Feedback List, Feedback Detail, Applications pages)
- Docker Compose local development environment
- Comprehensive API client library

### 🚧 Future Enhancements

#### Phase 2: Embeddable Widget

Drop-in widget that applications can add with a single script tag:

```html
<script src="https://feedback-widget.vibeoholic.com/widget.js"></script>
<script>
  FeedbackWidget.init({
    apiKey: 'YOUR_API_KEY',
    position: 'bottom-right',
    theme: 'auto'
  });
</script>
```

#### Phase 3: LLM Integration

- Automatic sentiment analysis
- Category suggestions
- Similarity detection to group related feedback
- Automated responses for common issues

#### Phase 4: PR Automation

- Generate code changes based on feedback
- Create GitHub PRs automatically
- Link feedback to code changes

## Security

- API keys are stored hashed in production
- All admin endpoints require JWT authentication
- Role-based access control via Casbin
- CORS configured per application
- Rate limiting on public endpoints (recommended)

## Troubleshooting

### Database Connection Issues

```bash
# Check if database is healthy
docker compose ps feedback-db

# View logs
docker compose logs feedback-db

# Reset database
docker compose down -v
docker compose up -d
```

### Backend Not Starting

```bash
# Check logs
docker compose logs feedback-backend

# Common issues:
# - Auth service not running
# - Database migrations failed
# - Invalid JWT public key
```

### Frontend Build Errors

```bash
# Clear node_modules and rebuild
cd frontend
rm -rf node_modules
bun install
bun dev
```

## License

MIT

## Support

For issues or questions:
- GitHub Issues: https://github.com/Frallan97/feedback-service/issues
- Email: franssjos@gmail.com
