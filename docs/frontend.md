# Frontend

The frontend is a React + Vite single-page application that presents PharmaFlow as a polished, role-aware pharmacy workspace.

## Responsibilities

- Authenticate users and hydrate profile state.
- Protect routes by role.
- Render staff, admin, and customer navigation.
- Provide responsive dashboards, tables, forms, cards, empty states, loading states, and error states.
- Connect to GraphQL, REST APIs, and Socket.IO realtime events.
- Surface notifications, unread counts, presence, messaging, calls, meetings, and operational updates.

## User Experiences

Staff and admins use:

- Dashboard
- Messages
- Notifications
- Meetings
- Inventory
- Point of Sale
- Purchases
- Reports
- Orders
- Settings

Customers use:

- Catalog
- Cart
- Orders
- Messages
- Account settings

## Communication UI

The frontend includes direct messaging, live presence, broadcast management, unread indicators, conversation details, and call controls. Voice/video calls and staff meetings are integrated into the main workspace rather than treated as isolated pages.

## Realtime UX

The realtime context keeps the UI updated for:

- Notifications
- Message unread counts
- Presence
- Inventory and order changes
- Analytics refresh hints
- Active calls
- Meeting and call events

## Responsive Design

The interface is designed for desktop, tablet, and mobile:

- Desktop uses persistent sidebar navigation and dense operational layouts.
- Tablet collapses complex grids into manageable columns.
- Mobile uses bottom navigation, single-column content, full-width controls, and protected spacing for small screens.

## Styling

The visual system is centralized in `frontend/src/App.css`. It defines the product shell, cards, forms, buttons, tables, messaging surfaces, notification drawer, auth screens, responsive behavior, focus states, and motion preferences.
