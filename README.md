🚭 Smoke-Free Savings

A simple Progressive Web App (PWA) to track money saved and milestones after quitting smoking.

Built as a personal motivation tool — now open for anyone who wants to quit and visualize their progress.

🔗 Live demo:
https://yannsmith13.github.io/smokefree/

✨ Features

📅 Clean day counter (quit date included)

💰 Automatic savings calculation (customizable daily amount)

🏆 Motivational badge system

🎯 Milestone tracking (weeks, months, years)

📊 Monthly calendar with projected savings

🌙 Dark / ☀️ Light mode

📱 Installable as a PWA

🔌 Works offline

🔒 100% local storage (no backend, no tracking)

📱 Install as an App
Android (Chrome)

Open the live demo

Tap the ⋮ menu

Select Install app or Add to Home Screen

iPhone (Safari)

Open the app

Tap the Share button

Choose Add to Home Screen

🧠 How It Works

The quit date is inclusive (Day 1 starts on the quit date).

Savings are calculated as:

days_without_smoking × daily_amount

Badges unlock based on meaningful milestones (7 days, 21 days, €50, €100, €1000, etc.).

All data is stored locally using localStorage.

🛠 Tech Stack

HTML5

CSS3 (responsive + light/dark theme)

Vanilla JavaScript

Service Worker (offline support)

Web App Manifest

GitHub Pages deployment

No frameworks. No build tools. No dependencies.

📦 PWA Details

manifest.webmanifest

sw.js (cache-first strategy)

Offline support enabled

Installable on supported browsers

To update the cached version, increment:

const CACHE_NAME = "smokefree-vX";
🚀 Deployment

Hosted via GitHub Pages.

To deploy:

git add .
git commit -m "update"
git push origin main

GitHub Pages auto-deploys from the main branch.

🎯 Why This Project?

Quitting smoking is difficult.

Seeing progress — in days and money saved — makes it real, tangible, and motivating.

This app was built as a personal project and shared in case it helps someone else.

📜 License

MIT License — free to use, modify, and share.

❤️ Final Note

If this small app helps you quit smoking or support someone who is trying,
then it has done its job.