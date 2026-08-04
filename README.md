# Kayunga Go 🏍️

A ride-hailing app built for **Kayunga, Uganda** — request a boda-boda or special hire between real Kayunga-area locations (Kayunga Town, Ntenjeru, Bbaale, Kangulumira, Busaana, Nazigo, and more), see a fare estimate, get matched with a rider, and track the trip. There's also a "Rider" (driver) mode where a rider goes online and accepts nearby requests.

It's built with plain HTML/CSS/JS wrapped by **Capacitor**, so the exact same code runs as:
- a normal website, and
- a real installable **Android APK**.

This demo runs in **offline/local mode** (using the phone's own storage) so it works immediately with zero setup. Instructions to connect a real live backend (Firebase) so two different phones can match with each other are at the bottom.

## 📦 What's in this repo

```
kayunga-go/
├── www/                   ← the actual app (HTML/CSS/JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── capacitor.config.json  ← tells Capacitor this is "Kayunga Go"
├── package.json
└── .github/workflows/build-apk.yml   ← builds the APK automatically
```

## 🚀 How to get your APK (no computer setup needed)

1. Create a new, empty repository on GitHub.
2. Upload **all these files**, keeping the folder structure exactly as-is (including the hidden `.github` folder — on github.com's upload page it will show up automatically once you drag the whole folder in, or use git as below).
3. Go to the **Actions** tab of your repo. You'll see a workflow called **"Build Kayunga Go APK"** running automatically (it triggers on every push to `main`).
4. Wait 3–5 minutes for it to finish (green check ✅).
5. Click on the finished run → scroll to **Artifacts** → download **kayunga-go-debug-apk**. Unzip it — that's your `app-debug.apk`.
6. Transfer that `.apk` to an Android phone (WhatsApp, Google Drive, USB, etc.) and tap it to install. You may need to allow "Install unknown apps" for whatever app you used to open it.

### If you have git installed instead
```bash
git init
git add .
git commit -m "Kayunga Go initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
Then just watch the **Actions** tab as above.

## 🧪 Try it in a browser first (optional)

Open `www/index.html` directly in a browser to try the whole flow before building the APK. Pick "I need a ride" in one browser tab and "I'm a rider" in another — they share the same local demo data, so you can watch a request appear on the rider side and get matched.

## 🌍 Making it a REAL multi-phone app (Firebase)

Right now, ride requests are stored on the phone itself (`localStorage`), so two different phones can't yet see each other's requests. To make Kayunga Go work for real between a passenger's phone and a rider's phone:

1. Create a free project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Firestore Database** (in test mode to start).
3. Add a Web App in Firebase project settings, and copy the config object it gives you.
4. In `www/index.html`, add the Firebase SDK before `app.js`:
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
   ```
5. In `www/app.js`, replace the `DB` object at the bottom with Firestore calls, e.g.:
   ```js
   firebase.initializeApp({ /* your config here */ });
   const firestoreDb = firebase.firestore();

   const DB = {
     async allRides() {
       const snap = await firestoreDb.collection("rides").get();
       return snap.docs.map(d => d.data());
     },
     async saveRide(ride) {
       await firestoreDb.collection("rides").doc(ride.id).set(ride);
     },
     async getRide(id) {
       const doc = await firestoreDb.collection("rides").doc(id).get();
       return doc.exists ? doc.data() : null;
     }
   };
   ```
   (You'll need to add `await` wherever these are called elsewhere in `app.js`.)
6. Push the changes — GitHub Actions rebuilds your APK automatically.

## 🎨 Customizing

- **Locations & pricing:** edit the `LOCATIONS` and `FARE` objects at the top of `www/app.js`.
- **Branding/colors:** edit the CSS variables at the top of `www/style.css` (`--green`, `--yellow`, etc.)
- **App name/icon:** change `appName` in `capacitor.config.json`. For a custom icon and splash screen, add `@capacitor/assets` and drop a 1024x1024 PNG in `resources/icon.png` — ask if you'd like this wired up.

## ⚠️ Notes

- The generated APK is a **debug build**, fine for personal installs and testing. To publish on the Play Store you'd need a signed **release** build and a Play Console developer account — happy to help set that up when you're ready.
- This is a starting point, not a production payments/safety system — before real-world use with real money and real riders, you'd want driver verification, live GPS tracking, and secure payments integrated.
