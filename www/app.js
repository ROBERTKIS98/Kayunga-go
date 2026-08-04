/*
  Kayunga Go — app logic
  ----------------------
  This demo runs fully offline using localStorage as a mock "backend",
  so the APK works out of the box with no server setup, and you can
  test the whole passenger + rider flow on a single phone.

  TO GO LIVE (real two-way, multi-phone matching):
  Replace the DB.* functions at the bottom of this file with calls to
  Firebase Firestore (or any REST backend). Everywhere else in the app
  only ever talks to DB.*, so that's the only place you need to change.
*/

// ---- Kayunga-area locations & rough distances (km) from Kayunga Town centre ----
const LOCATIONS = {
  "Kayunga Town":      0,
  "Kayunga Hospital":  1.5,
  "Ntenjeru":          9,
  "Bbaale":            22,
  "Galiraaya":          14,
  "Wabwoko":           6,
  "Nazigo":            17,
  "Kangulumira":       12,
  "Busaana":           27,
  "Kayonza":           8,
  "Baale Market":      4,
  "Kayunga Bus Park":  0.8
};

const FARE = {
  boda:    { base: 1500, perKm: 700 },
  special: { base: 5000, perKm: 1600 }
};

const DRIVER_NAMES = [
  ["Ssebbaale Moses", "Boda #KLA 224U"],
  ["Nakato Sarah", "Boda #KLA 559U"],
  ["Okello Ivan", "Special Hire - Toyota Wish"],
  ["Byaruhanga Peter", "Boda #KLA 831U"],
  ["Namuli Grace", "Boda #KLA 102U"]
];

let state = {
  role: null,
  pickup: null,
  dropoff: null,
  rideType: "boda",
  fare: 0,
  currentRideId: null,
  online: false,
  searchTimer: null
};

// ---------------- Navigation ----------------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

const app = {
  goTo(id) { showScreen(id); if (id === "history") renderHistory(); },

  chooseRole(role) {
    state.role = role;
    if (role === "passenger") {
      populateSelects();
      showScreen("passengerHome");
    } else {
      showScreen("driverHome");
      renderDriverRequests();
    }
  },

  selectRideType(btn, type) {
    document.querySelectorAll(".ride-type").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.rideType = type;
    updateFare();
  },

  requestRide() {
    const pickup = document.getElementById("pickup").value;
    const dropoff = document.getElementById("dropoff").value;
    if (pickup === dropoff) {
      toast("Pickup and drop-off can't be the same place");
      return;
    }
    const fare = calcFare(pickup, dropoff, state.rideType);
    const ride = {
      id: "R" + Date.now(),
      passenger: "You",
      pickup, dropoff,
      type: state.rideType,
      fare,
      status: "pending", // pending -> matched -> completed / cancelled
      driver: null,
      createdAt: Date.now()
    };
    DB.saveRide(ride);
    state.currentRideId = ride.id;
    document.getElementById("searchRouteText").textContent = `${pickup} → ${dropoff}`;
    showScreen("searching");

    // Simulate a nearby rider accepting within a few seconds (demo mode).
    // In production this resolves the moment a real driver taps "Accept".
    state.searchTimer = setTimeout(() => {
      const current = DB.getRide(ride.id);
      if (current && current.status === "pending") {
        const [name, moto] = DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)];
        current.status = "matched";
        current.driver = { name, moto };
        current.eta = Math.floor(3 + Math.random() * 7);
        DB.saveRide(current);
        showMatched(current);
      }
    }, 4000);
  },

  cancelSearch() {
    clearTimeout(state.searchTimer);
    if (state.currentRideId) {
      const ride = DB.getRide(state.currentRideId);
      if (ride) { ride.status = "cancelled"; DB.saveRide(ride); }
    }
    state.currentRideId = null;
    showScreen("passengerHome");
  },

  callDriver() {
    toast("Calling rider... (demo mode, no real call placed)");
  },

  completeRide() {
    const ride = DB.getRide(state.currentRideId);
    if (ride) { ride.status = "completed"; DB.saveRide(ride); }
    state.currentRideId = null;
    toast("Trip completed. Thanks for riding with Kayunga Go!");
    showScreen("passengerHome");
  },

  toggleOnline() {
    state.online = document.getElementById("onlineToggle").checked;
    const banner = document.getElementById("onlineStatus");
    banner.textContent = state.online ? "You are ONLINE" : "You are OFFLINE";
    banner.className = "status-banner " + (state.online ? "online" : "offline");
    renderDriverRequests();
  },

  acceptRequest(rideId) {
    const ride = DB.getRide(rideId);
    if (!ride || ride.status !== "pending") return;
    ride.status = "matched";
    ride.driver = { name: "You", moto: "This device" };
    DB.saveRide(ride);
    document.getElementById("dTripPassenger").textContent = ride.passenger;
    document.getElementById("dTripFrom").textContent = ride.pickup;
    document.getElementById("dTripTo").textContent = ride.dropoff;
    document.getElementById("dTripFare").textContent = ride.fare.toLocaleString();
    state.currentRideId = ride.id;
    showScreen("driverTrip");
  },

  driverCompleteRide() {
    const ride = DB.getRide(state.currentRideId);
    if (ride) { ride.status = "completed"; DB.saveRide(ride); }
    toast("Trip marked complete");
    showScreen("driverHome");
    renderDriverRequests();
  }
};

// ---------------- Helpers ----------------
function populateSelects() {
  const names = Object.keys(LOCATIONS);
  ["pickup", "dropoff"].forEach((id, idx) => {
    const sel = document.getElementById(id);
    sel.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join("");
    sel.selectedIndex = idx === 0 ? 0 : 1;
    sel.onchange = updateFare;
  });
  updateFare();
}

function calcFare(pickup, dropoff, type) {
  const dist = Math.max(1, Math.abs(LOCATIONS[pickup] - LOCATIONS[dropoff]));
  const rate = FARE[type];
  const raw = rate.base + dist * rate.perKm;
  return Math.round(raw / 500) * 500; // round to nearest 500 UGX
}

function updateFare() {
  const pickup = document.getElementById("pickup")?.value;
  const dropoff = document.getElementById("dropoff")?.value;
  if (!pickup || !dropoff) return;
  const box = document.getElementById("fareBox");
  if (pickup === dropoff) {
    box.textContent = "Choose two different points";
    return;
  }
  const fare = calcFare(pickup, dropoff, state.rideType);
  state.fare = fare;
  box.innerHTML = `Estimated fare: <strong>UGX ${fare.toLocaleString()}</strong>`;
}

function showMatched(ride) {
  document.getElementById("matchedDriverName").textContent = ride.driver.name;
  document.getElementById("matchedDriverMoto").textContent = ride.driver.moto;
  document.getElementById("tripFrom").textContent = ride.pickup;
  document.getElementById("tripTo").textContent = ride.dropoff;
  document.getElementById("tripFare").textContent = ride.fare.toLocaleString();
  document.getElementById("tripEta").textContent = ride.eta;
  showScreen("matched");
}

function renderDriverRequests() {
  const list = document.getElementById("requestsList");
  if (!state.online) {
    list.innerHTML = `<div class="empty-state">Go online to see nearby ride requests</div>`;
    return;
  }
  const pending = DB.allRides().filter(r => r.status === "pending");
  if (!pending.length) {
    list.innerHTML = `<div class="empty-state">No requests right now. Hang tight!</div>`;
    return;
  }
  list.innerHTML = pending.map(r => `
    <div class="request-card">
      <p><strong>${r.pickup}</strong> → <strong>${r.dropoff}</strong></p>
      <p>Type: ${r.type === "boda" ? "Boda" : "Special Hire"} · Fare: UGX ${r.fare.toLocaleString()}</p>
      <button onclick="app.acceptRequest('${r.id}')">Accept</button>
    </div>
  `).join("");
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const rides = DB.allRides().reverse();
  if (!rides.length) {
    list.innerHTML = `<div class="empty-state">No trips yet</div>`;
    return;
  }
  list.innerHTML = rides.map(r => `
    <div class="history-card">
      <strong>${r.pickup} → ${r.dropoff}</strong><br>
      UGX ${r.fare.toLocaleString()} · ${r.status}<br>
      <span class="muted">${new Date(r.createdAt).toLocaleString()}</span>
    </div>
  `).join("");
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// Poll so a "driver" and "passenger" tab open on the same device stay in sync,
// and so the driver list refreshes as new requests come in.
setInterval(() => {
  if (document.getElementById("driverHome").classList.contains("active")) {
    renderDriverRequests();
  }
}, 2000);

// ---------------- Mock backend (swap this for Firebase later) ----------------
const DB = {
  allRides() {
    return JSON.parse(localStorage.getItem("kg_rides") || "[]");
  },
  saveRide(ride) {
    const rides = DB.allRides();
    const idx = rides.findIndex(r => r.id === ride.id);
    if (idx >= 0) rides[idx] = ride; else rides.push(ride);
    localStorage.setItem("kg_rides", JSON.stringify(rides));
  },
  getRide(id) {
    return DB.allRides().find(r => r.id === id) || null;
  }
};

// ---------------- Boot ----------------
setTimeout(() => showScreen("roleSelect"), 1400);
