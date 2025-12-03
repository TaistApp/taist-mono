# Quick Start Guide

## Run Emulator/Simulator

### Local Backend (localhost)
```bash
cd frontend
npm run ios:local
```

### Staging Backend (Railway)
```bash
cd frontend
npm run ios:staging
```

### Production Backend
```bash
cd frontend
npm run ios:prod
```

---

## What's happening?

- **ios:local** → connects to `http://localhost:8000/mapi/`
- **ios:staging** → connects to `https://taist-mono-staging.up.railway.app/mapi/`
- **ios:prod** → connects to `https://taist.codeupscale.com/mapi/`

When the app starts, you'll see in the console:
```
🌍 Environment: staging
🔗 API URL: https://taist-mono-staging.up.railway.app/mapi/
```

This confirms which backend you're connected to.

---

## Testing Railway without waiting for TestFlight

Instead of waiting for TestFlight processing, just run:
```bash
cd frontend
npm run ios:staging
```

Your simulator will connect directly to Railway!
