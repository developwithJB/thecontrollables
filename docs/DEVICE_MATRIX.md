# Device Testing Matrix

**Purpose:** Ensure mobile-first quality across target devices  
**Priority:** iPhone Safari > Android Chrome > Desktop

---

## Primary Devices (Must Test)

| Device | OS | Browser | Viewport | Priority |
|--------|-----|---------|----------|----------|
| iPhone 14/15 | iOS 17+ | Safari | 390x844 | 🔴 Critical |
| iPhone 14/15 | iOS 17+ | Chrome | 390x844 | 🟠 High |
| Pixel 5/6 | Android 13+ | Chrome | 393x851 | 🟠 High |
| Desktop | macOS/Win | Chrome | 1280x800 | 🟡 Medium |

## Secondary Devices (Should Test)

| Device | OS | Browser | Viewport | Priority |
|--------|-----|---------|----------|----------|
| iPhone SE | iOS 17+ | Safari | 375x667 | 🟡 Medium |
| iPhone 15 Pro Max | iOS 17+ | Safari | 430x932 | 🟡 Medium |
| iPad | iPadOS 17+ | Safari | 820x1180 | 🟢 Low |
| Desktop | macOS | Safari | 1280x800 | 🟢 Low |
| Galaxy S23 | Android 14 | Chrome | 360x780 | 🟢 Low |

---

## Playwright Viewport Presets

```typescript
// Already configured in playwright.config.ts

// iPhone 14
{ width: 390, height: 844, deviceScaleFactor: 3 }

// iPhone 14 Pro Max
{ width: 430, height: 932, deviceScaleFactor: 3 }

// Pixel 5
{ width: 393, height: 851, deviceScaleFactor: 2.75 }

// Desktop Chrome
{ width: 1280, height: 720 }
```

---

## Mobile-Specific Test Focus

### iOS Safari
| Test | Expected Result |
|------|-----------------|
| Page load | No white screen, content visible in <3s |
| Scroll on locked overlays | Scroll not trapped, can escape |
| Modal back navigation | Back button closes modal, not page |
| Keyboard on text inputs | Keyboard shows, "Done" dismisses |
| Input focus | Page scrolls to show input above keyboard |
| Tap targets | All buttons ≥44pt touch target |
| Hover states | No hover-only UI (all tap accessible) |
| Safe area | Content not behind notch/home indicator |

### iOS Chrome
| Test | Expected Result |
|------|-----------------|
| All Safari tests | Same behavior expected |
| Pull to refresh | Works or gracefully ignored |

### Android Chrome
| Test | Expected Result |
|------|-----------------|
| Page load | No white screen, content visible |
| Keyboard | Doesn't cover submit buttons |
| Back button | Expected navigation behavior |
| Scroll | Smooth, no jank |

---

## Common Mobile Issues to Watch

### Critical
- [ ] White screen on load
- [ ] Scroll trapped in modal/overlay
- [ ] Keyboard covers input being typed in
- [ ] Touch target too small (<44pt)

### Major
- [ ] Text cut off by notch/safe area
- [ ] Horizontal scroll appears
- [ ] Modal doesn't close on back
- [ ] Loading spinner never resolves

### Minor
- [ ] Slight layout shift on load
- [ ] Font size too small (<16px body)
- [ ] Color contrast insufficient

---

## Network Conditions

Test under these conditions:

| Condition | Throttle | Expected |
|-----------|----------|----------|
| Fast 3G | 1.5Mbps / 750Kbps | Loads in <5s, skeletons visible |
| Slow 3G | 750Kbps / 250Kbps | Loads in <10s, graceful degradation |
| Offline | No connection | Offline indicator, no white screen |
| Online→Offline | Drop mid-session | Error toast, recoverable |

---

## How to Test on Real Devices

### Local Development
```bash
# Get your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Run dev server accessible to network
npm run dev -- --host

# Access on mobile: http://YOUR_IP:5173
```

### Preview URL
- Use Lovable preview URL directly on mobile devices
- No special setup needed

### BrowserStack/Sauce Labs (Optional)
- For comprehensive device coverage
- Useful for devices you don't own

---

## Device Testing Log Template

| Date | Device | OS Version | Browser | Tester | Pass/Fail | Notes |
|------|--------|------------|---------|--------|-----------|-------|
| | | | | | | |
| | | | | | | |
| | | | | | | |
