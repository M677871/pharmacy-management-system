# CSIS-279 Management System

A modern React frontend application for managing clients and departments with full CRUD operations.

## 🚀 Features

- **Client Management**: Complete CRUD operations for clients
- **Department Management**: Full department lifecycle management
- **Modern UI**: Responsive design with clean interface
- **Error Handling**: Comprehensive error states and loading indicators
- **Type Safety**: Well-structured service layer
- **Best Practices**: Following React best practices and clean architecture

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (NavBar, Layout)
│   └── ui/             # Generic UI components (LoadingSpinner, ErrorMessage)
├── hooks/              # Custom React hooks
│   └── useApi.js       # API state management hook
├── pages/              # Page components
│   ├── clients/        # Client management pages
│   ├── departments/    # Department management pages
│   ├── Home.jsx        # Home page
│   └── About.jsx       # About page
├── services/           # API service layer
│   ├── api.js          # Base API service
│   ├── client.service.js    # Client API operations
│   └── department.service.js # Department API operations
├── routes/             # Route definitions
└── styles/             # Global styles and CSS files
```

## 🔧 Prerequisites

Before running this application, ensure you have:

1. **Node.js** (v18 or higher)
2. **Backend API** running on `http://localhost:3001`

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 3. Backend API

Make sure your backend API is running on port 3001 with the following endpoints:

#### Client Endpoints
- `GET /clients` - Get all clients with department info
- `POST /clients` - Create new client
- `GET /clients/:id` - Get client by ID
- `PUT /clients/:id` - Update client
- `DELETE /clients/:id` - Delete client

#### Department Endpoints
- `GET /department` - Get all departments
- `POST /department` - Create new department
- `PUT /department/:id` - Update department
- `DELETE /department/:id` - Delete department

## 🏗️ Architecture Overview

### Service Layer
The application uses a clean service layer architecture:
- **api.js**: Base API configuration and error handling
- **client.service.js**: Client-specific operations
- **department.service.js**: Department-specific operations

### State Management
- **useApi** hook: Manages loading states, errors, and API calls
- Local component state for form data and UI state

### Component Architecture
- **Layout Components**: Provide consistent structure
- **Page Components**: Handle specific routes and business logic
- **UI Components**: Reusable interface elements
- **Custom Hooks**: Shared logic and state management

## 🎨 UI Components

### Navigation
- Responsive navigation bar with active state indicators
- Mobile-friendly design

### Forms
- Validation and error handling
- Loading states during submission
- Proper navigation flow

### Tables
- Sortable and responsive data tables
- Action buttons (Edit, Delete)
- Empty states

### Feedback
- Loading spinners
- Error messages with retry options
- Success confirmations

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏆 Best Practices Implemented

1. **Component Separation**: Clear separation of concerns
2. **Service Layer**: Centralized API logic
3. **Error Handling**: Comprehensive error boundaries
4. **Loading States**: User feedback during operations
5. **Responsive Design**: Mobile-first approach
6. **Type Safety**: Proper prop handling
7. **Code Organization**: Logical folder structure
8. **Performance**: Optimized re-renders
9. **Accessibility**: Semantic HTML and proper labels
10. **Modern React**: Hooks-based architecture

## 🔗 API Integration

The frontend communicates with the backend through a clean service layer that:
- Handles HTTP requests and responses
- Manages error states
- Provides consistent data formatting
- Implements proper error boundaries

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Different screen orientations

## 🛠️ Development Guidelines

### Adding New Features
1. Create service functions in appropriate service files
2. Add UI components in the `components/` directory
3. Create page components in the `pages/` directory
4. Update routes in `routes.js`
5. Add navigation links if needed

### Code Style
- Use functional components with hooks
- Follow consistent naming conventions
- Add proper error handling
- Include loading states
- Write descriptive component names

### File Organization
- Group related components together
- Use clear folder structure
- Separate concerns (UI, logic, data)
- Keep components focused and single-purpose