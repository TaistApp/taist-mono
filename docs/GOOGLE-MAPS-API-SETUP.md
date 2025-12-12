# Google Maps API Key Setup Guide

## What You Need
- A Google account (Gmail works)
- A credit card (Google requires this but offers $200/month free credit - more than enough for Taist)

---

## Step-by-Step Instructions

### Step 1: Go to Google Cloud Console
1. Open your web browser
2. Go to: **https://console.cloud.google.com/**
3. Sign in with your Google account (or create one if needed)

---

### Step 2: Create a New Project
1. Click the project dropdown at the top of the page (it might say "Select a project")
2. Click **"NEW PROJECT"** in the popup
3. Enter a name: **Taist** (or whatever you prefer)
4. Click **"CREATE"**
5. Wait about 30 seconds for it to create
6. Make sure your new project is selected in the dropdown

---

### Step 3: Enable Billing
**Google requires a credit card but gives you $200/month FREE. You won't be charged unless you exceed that (which Taist won't).**

1. Click the hamburger menu (☰) in the top-left corner
2. Click **"Billing"**
3. Click **"LINK A BILLING ACCOUNT"** or **"CREATE ACCOUNT"**
4. Follow the steps to add your credit card
5. Link the billing account to your Taist project

---

### Step 4: Enable the Geocoding API
1. Click the hamburger menu (☰) in the top-left corner
2. Click **"APIs & Services"** → **"Library"**
3. In the search box, type: **Geocoding API**
4. Click on **"Geocoding API"** in the results
5. Click the blue **"ENABLE"** button

---

### Step 5: Create Your API Key
1. Click the hamburger menu (☰) in the top-left corner
2. Click **"APIs & Services"** → **"Credentials"**
3. Click **"+ CREATE CREDENTIALS"** at the top
4. Select **"API key"**
5. A popup will show your new API key - **COPY THIS KEY!**
6. Click **"CLOSE"**

---

### Step 6: (Recommended) Restrict Your API Key
This prevents others from using your key if it gets leaked:

1. Find your API key in the list and click on it
2. Under **"API restrictions"**, select **"Restrict key"**
3. Check the box for **"Geocoding API"**
4. Click **"SAVE"**

---

## Your API Key
Your key will look something like this:
```
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Keep this key private! Don't share it publicly.**

---

## Give the Key to Your Developer
Send your API key to your developer so they can add it to the app configuration.

They will add it to a setting called `GOOGLE_MAPS_API_KEY`.

---

## Questions?
- **Will I be charged?** Not unless you exceed $200/month in usage (Taist uses far less)
- **What does this do?** Converts addresses and zip codes into map coordinates so the app can find nearby chefs
- **Is it safe?** Yes, Google Cloud is used by millions of businesses worldwide
