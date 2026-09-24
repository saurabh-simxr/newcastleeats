# Final Round - Project Plan

This document explains, in simple words, what work is left to do on the app, why it matters, and how long it will take.

---

## 1. WhatsApp Message Templates (with On/Off control)

**What it means:** Right now, the app already sends WhatsApp messages to restaurant owners when an order comes in. But there is no proper screen for the admin to turn these messages on or off, or manage them easily.

**What we will build:** A screen in the Admin panel where the admin can see all WhatsApp message templates, turn each one on or off, and add new ones in the future. We will also add "Accept" and "Reject" buttons inside these WhatsApp messages so restaurant owners and drivers can respond directly from WhatsApp.

**Time needed:** 1-2 days

---

## 2. WhatsApp Alerts for Drivers and Restaurant Owners

**What it means:** When something important happens with an order (new order, order accepted, order picked up, etc.), both the driver and the restaurant owner should get a WhatsApp message with Accept/Reject buttons, so they can respond immediately.

**What we will build:** Right now only the restaurant owner gets these WhatsApp alerts. We will add the same for drivers, so they also get notified on WhatsApp with action buttons whenever a new delivery is ready for them.

**Time needed:** 2-3 days of our work. On top of this, WhatsApp's parent company (Meta/Twilio) needs to approve new message formats, which usually takes 1-2 extra days and is outside our control.

---

## 3. One Restaurant at a Time (Order Rule)

**What it means:** If a customer orders from two different restaurants at the same time, it becomes confusing for restaurants, because each restaurant accepts and prepares its own order separately.

**What we will build:** A rule that if a customer already has an order in progress at one restaurant, they must wait for that order to finish before placing a new order at a different restaurant. This keeps things simple and avoids confusion for restaurants and drivers.

**Time needed:** 1-2 days

---

## 4. Real Payment Setup (Going Live)

**What it means:** Right now the payment system is in "test mode," meaning no real money is actually processed - it's just for checking that everything works.

**What we will build:** We will switch the payment system to "live mode" so real customer payments go through properly, land with the admin account, and the admin can then pay restaurant owners internally as usual. The technical payment system (Stripe) is already built - this step is mainly about verification and switching it on safely.

**Time needed:** 1-2 days of our work. The payment company also needs to verify business documents and bank details, which can take a few extra days on their side and is outside our control.

---

## 5. Maintenance Mode

**What it means:** Sometimes we need to update the app, and during that time it's better to pause new orders instead of customers running into errors.

**What we will build:** A simple switch in the Admin Settings that turns "Maintenance Mode" on or off. When it's on, customers will see a friendly message saying the app is temporarily under maintenance, and no new orders can be placed until it's turned back on.

**Time needed:** 1  days

---

## 6. App Speed and Website Domain Setup

**What it means:** The app should load fast for customers, and the website address (domain) should be properly and reliably connected, both for testing and for the real live version.

**What we will build:** We will properly connect the domain to our hosting service (Vercel) for both the test and live versions, and make some backend improvements so pages load faster.

**Time needed:** 2-3 days

---

## 7. Security Improvements

**What it means:** We want to make sure no one can steal customer or business data from the app.

**What we will build:** We found a few gaps in how the app checks who is logged in, and how it limits repeated suspicious attempts (like fake logins). We will close these gaps and add extra protection layers so the app and its data stay safe.

**Time needed:** 2-3 days

---

## 8. Automatic Data Backup

**What it means:** If something ever goes wrong (a technical issue, accidental deletion, etc.), we should have a safety copy of all the data so nothing is permanently lost.

**What we will build:** An automatic daily backup system that saves a safe copy of all app data, and a tested process to restore that data quickly if it's ever needed.

**Time needed:** 1-2 days

---

## Overall Timeline

| # | Task | Time |
|---|------|------|
| 1 | WhatsApp Templates On/Off Control | 1-2 days |
| 2 | WhatsApp Alerts for Drivers & Owners | 2-3 days (+ approval wait) |
| 3 | One Restaurant at a Time Rule | 1-2 days |
| 4 | Real Payment Setup | 1-2 days (+ verification wait) |
| 5 | Maintenance Mode | 1 day |
| 6 | App Speed + Domain Setup | 2-3 days |
| 7 | Security Improvements | 2-3 days |
| 8 | Automatic Data Backup | 1-2 days |

**Total time: about 11-18 working days (roughly 2-3 weeks)**

Some parts of this (like WhatsApp approval and payment company verification) depend on outside companies and are not fully in our control - we will start those early so they don't delay the rest of the work.
