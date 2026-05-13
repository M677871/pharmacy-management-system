# Key Flows

This document summarizes the major product flows at a high level.

## Authentication and Security

Users can register, sign in, refresh sessions, sign out, reset passwords, and optionally enable authenticator-based two-factor authentication. Authenticated users receive role-specific navigation and protected access to the platform.

## Staff Inventory Flow

Staff manage products, categories, sale prices, active status, expiry behavior, and batches. Inventory changes feed reporting, catalog availability, stock alerts, and realtime refresh events.

## Purchasing Flow

Staff receive purchases into inventory. Purchase receiving creates purchase records, batch updates, stock-in movements, and live inventory updates.

## POS and Returns Flow

Staff complete checkout through the point-of-sale workspace. The system allocates stock from eligible batches, records sale items, updates stock, and supports return processing that restores inventory where appropriate.

## Customer Catalog and Order Flow

Customers browse available catalog items, add products to a cart, submit delivery orders, and track status. Orders move through assignment, review, approval or rejection, delivery coordination, location sharing, and payment completion.

## Staff Order Management

Online staff can receive assigned customer orders, review line items, assign delivery drivers, approve or reject requests, and mark cash payment complete after delivery.

## Notifications

Notifications are persisted and delivered live. The workspace shows unread badges, a topbar notification drawer, and a full notification center. Notifications link users back into the relevant workflow when a target page exists.

## Messaging

Customers and staff can communicate through direct messaging. Staff also have broadcast tools, conversation details, unread counters, live presence, and realtime message delivery.

## Video Calls

Direct voice and video calls are implemented as a communication workflow connected to messaging. The backend manages call records, participants, lifecycle events, captions, recordings, and protected recording downloads. The realtime layer supports call signaling between authenticated participants.

## Meetings

Meetings support staff collaboration beyond one-to-one chat. Admins and employees can create meetings, invite participants, join and leave sessions, end or cancel meetings, record notes, manage captions, and work with meeting recordings.

## Analytics

Dashboards and reports aggregate pharmacy performance across revenue, profit, refunds, products, stock, orders, categories, and employee performance. Realtime refresh events keep analytics aligned with operational changes.
