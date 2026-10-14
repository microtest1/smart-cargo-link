# Remix of Amoliga Elight Flight and Logistics

uild a production-grade, ultra-modern, multi-company logistics and cargo tracking mobile-first web application called “Smart Cargo Connect”. The platform must support Ghana–China shipping, customer package tracking, payments, notifications, and company management. It must be optimized for Android WebView and Google Play Store deployment.

🔐 1. User Accounts & Security

Create:

Customer sign-up

Customer login

Company manager login

Super admin login

Each account must include:

Full name

Phone number

Email

Password (securely hashed)

Role-based access

🆔 2. Permanent Unique User Code

When a customer signs up:

Automatically generate a permanent unique code

Format: GHA-XXXXXX

Example: GHA-582941

This code:

Never changes

Appears on dashboard

Is used for package claiming, shipment tracking, and warehouse labeling

🔔 3. Notifications

Users must receive:

In-app notifications

Push notifications

Triggered when:

A package is added

Status changes

Shipment arrives

Payment is needed

Company posts updates

Support replies

Admins & managers can broadcast announcements.

🏢 4. Multi-Company System

Admin can:

Add companies

Upload logos

Add warehouse addresses

Add manager contacts

Each company includes:

Name

Logo

China warehouse address

Ghana warehouse address

Manager name

Phone

Email

WhatsApp

Customer service email

🧠 5. AI Smart Search

Users can search by:

Tracking number

Unique user code

Company name

Product description

AI returns:

Shipment status

Location

Company contact

Estimated delivery

🏭 6. Warehouse System

Each company must have:

China warehouse

Ghana warehouse

Pickup & delivery instructions

📦 7. Shipment Management

Admins & managers can:

Create shipments

Assign to user codes

Enter:

Tracking number

Product

Weight

Status

Company

China & Ghana locations

Customers see real-time tracking.

💳 8. Payment System

Integrate:

MTN MoMo

Vodafone Cash

AirtelTigo

Debit / Credit Cards

Users can pay per shipment and view payment history.

🧑‍💻 9. Customer Support

Inside app:

Live chat

Ticket system

WhatsApp button

Email support

📊 10. Admin Dashboard

Admin can:

Manage companies

Upload logos

Add warehouses

Add shipments

Assign packages

Send notifications

View users

View payments

Manage support tickets

📱 11. Customer Dashboard

Each user sees:

Their unique code

All shipments

Status updates

Notifications

Payments

Company contacts

Warehouse addresses

Support

🎨 12. UI & Design

Ultra-modern

Mobile-first

Clean logistics style

Dark & light mode

Very easy to use

🔐 13. Security

Encrypted passwords

Secure login

Role-based access

Protected admin routes

🚀 14. Deployment

Deploy live

Enable PWA

Make Android-wrapper ready

Optimized for Google Play Store

🏢 PRE-LOADED COMPANY (AUTOMATICALLY INSERT INTO SYSTEM)

Create a logistics company with:

Company Name: Amoliga Elite Freight & Logistics
Manager: Elizabeth Amoliga
Services: Business and Personal Shipping from China to Ghana & West Africa (45 days delivery)
Phones: +233 30 700 1743, +233 20 887 8817
Email: aeflogistics@gmail.com

WhatsApp: +233 20 887 8817
Use the uploaded logo as the official company logo
Enable shipment tracking, WhatsApp chat, email, and customer support for this company

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://smart-cargo-link.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/71f84c8e-53a5-4b69-866e-9f0f97495b24).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
