# Shohoz Skill

Build a clean, production-ready LMS + Digital Product + Physical Book selling website.

This is NOT a complex marketplace. 
It should feel simple, fast, business-focused and easy to manage.

Tech stack: Modern React / NextJS style structure.

----------------------------------------
CORE GOAL:
----------------------------------------
The website must be:
- Clean UI
- Minimal clicks
- Business-owner friendly
- Fully functional (no broken logic)

----------------------------------------
PUBLIC WEBSITE STRUCTURE:
----------------------------------------

1) HOMEPAGE
- Clean hero section with CTA
- Featured Courses
- Featured Books
- Customer Reviews section
- Track Order input field (Order ID + Phone)
- Footer with About, Contact

2) ABOUT PAGE
Simple content page.

3) CONTACT PAGE
Contact form (Name, Phone, Email, Message)

4) PRODUCT PAGE (BOOK)
- Clean product image gallery
- Proper formatted description (rich text support: heading, bullet, spacing)
- Price in BDT (৳)
- DIRECT ORDER FORM (NO ADD TO CART)
Fields:
    - Full Name
    - Phone Number
    - Email (optional)
    - Full Address
Payment Method:
    - Cash on Delivery (for physical books only)

5) COURSE PAGE (DIGITAL)
- Course thumbnail
- Course overview
- Structured lesson list
- Clean description formatting
- Price in BDT
- Direct Purchase section
Payment:
    - bKash
    - Nagad

----------------------------------------
USER AUTHENTICATION:
----------------------------------------

Registration fields:
- Full Name
- Mobile Number
- Email
- Address
- Password

Login:
- Phone OR Email + Password

Secure authentication required.

----------------------------------------
QUIZ SYSTEM:
----------------------------------------

Admin can:
- Create quiz
- Add questions
- Add 4 options
- Select correct answer
- Add explanation for correct answer
- Enable negative marking

Frontend:
- Clean quiz interface
- Show explanation after submission

----------------------------------------
ADMIN PANEL:
----------------------------------------

Admin must be able to:

- Add / Edit / Delete Books
- Add / Edit / Delete Courses
- Add / Edit / Delete Users
- Manage Orders
- Update order status
- Export all users & orders (CSV)
- Upload book demo PDF or images
    -> Frontend should allow scroll preview

----------------------------------------
ORDER SYSTEM:
----------------------------------------

- No add to cart system
- Direct order per product
- Each order generates unique Order ID
- Track Order system on homepage
- Admin can update status:
    - Pending
    - Confirmed
    - Shipped
    - Delivered
    - Cancelled

----------------------------------------
INTEGRATIONS:
----------------------------------------

- SMTP setup for order notification email (admin receives email)
- Pixel integration section (admin can paste Pixel ID)
- Courier integration placeholder structure
- Fraud check flag system (admin mark suspicious orders)

----------------------------------------
UX REQUIREMENTS:
----------------------------------------

- Logo click redirects to homepage
- Fully responsive
- Clean typography
- Professional spacing
- Minimal but premium feel
- No broken buttons
- No dead pages

----------------------------------------
IMPORTANT:
----------------------------------------

This system must feel:
- Organized
- Stable
- Business-ready
- Simple but complete

Focus on flow over complexity.
Everything must work properly.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://shohozskill.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f46ee91-13f1-4edd-8f58-f291c8cfc1cf).

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
