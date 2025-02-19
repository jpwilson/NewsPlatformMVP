# NewsPlatform

A dynamic news platform enabling creators to publish, manage, and share content through personalized channels.

## Current Features

### User Authentication
- User registration and login
- Protected routes requiring authentication
- Session-based authentication
- User-specific content access

### Channel Management
- Create personal channels with name and description
- View channels in the main feed
- Channel-specific article management
- Automatic redirect to article creation after channel setup

### Article Management
- Create articles with rich content
- Associate articles with specific channels
- Categorize articles by topic
- Add optional location information
- View articles in the main feed

### User Interface
- Clean, responsive design
- Navigation bar with user controls
- Toast notifications for user feedback
- Loading states and error handling
- Form validation with immediate feedback

## Technical Implementation
- React + TypeScript frontend
- Express.js backend
- Session-based authentication
- In-memory data storage
- Form validation using react-hook-form and zod
- UI components from shadcn/ui
- Responsive design with Tailwind CSS

## Current Workflow
1. Users register/login
2. Create a channel (required for publishing)
3. Create articles within their channel
4. View all articles in the main feed
