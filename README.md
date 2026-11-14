# 💰 RupeeTrack - Modern Expense & Savings Tracker

RupeeTrack is a sleek, modern, and privacy-first personal finance tracker tailored for Indian Rupees (₹). Built entirely with pure **HTML5, CSS3, and Vanilla JavaScript**—zero frameworks, zero build steps, and zero dependencies besides Chart.js.

Designed for seamless deployment on **GitHub Pages**, all financial records and configurations are saved locally in your browser's `localStorage` so your data never leaves your device.

---

## 🌟 Live Demo & Preview

- **Live Demo Link:** https://akshithgowda25.github.io/Money-Tracker/
- **Preview / Screenshot:**
<img width="780" height="912" alt="image" src="https://github.com/user-attachments/assets/d023c35e-dee2-4dae-ac2b-e1499470522e" />


## ✨ Features

- **Multi-Account & Payment Method Management:**
  - Add unlimited bank accounts and payment modes (e.g., *SBI UPI*, *HDFC Net Banking*, *ICICI Credit Card*, *Cash In Hand*).
  - Only stores account title and payment mode for zero privacy risk (no account numbers or sensitive credentials).
- **Comprehensive Transaction Tracking:**
  - Record amount in Indian Rupees (₹), transaction type (Income or Expense), date, payment account, and optional note.
  - Standard categories: **Food (🍔), Travel (✈️), Gym (💪), Shopping (🛍️), Education (📚), Bills (🧾), Other (✨)**.
  - **Custom Category Titles & Emojis:** Selecting "Other" unlocks custom title input with single-click emoji pickers (🍿, 🎮, 🏥, 🐾, ☕, 🎁) or custom emoji entry.
- **Dynamic Transaction History:**
  - Chronologically sorted (newest first).
  - Instant search filtering by keyword/note/account and type filtering (All / Expenses / Income).
  - One-click deletion with undo/alert feedback.
  - Informative empty states when no records exist.
- **Monthly Summary Cards:**
  - Instant calculations for **Total Income**, **Total Expenses**, **Net Balance** (surplus/deficit indication), and **Savings Rate %**.
  - Month navigation bar (`◀ Previous`, `▶ Next`, and calendar month picker).
- **Interactive Visual Analytics (Chart.js via cdnjs):**
  - **Category Doughnut Chart:** Breakdown of monthly expenses with custom color palette and currency tooltips.
  - **6-Month Trend Bar Chart:** Grouped bar chart comparing income versus expenses across the last 6 months.
- **Savings Goals Tracker:**
  - Set target goals with title, target amount in ₹, and optional deadline.
  - Deposit funds directly into goals at any time with animated progress bars and percentage completion badges.
- **CSV Data Export:**
  - One-click export of all transactions into a structured CSV file (`rupeetrack_transactions_YYYY-MM.csv`).
- **Data Persistence:**
  - Automatically synchronizes all accounts, goals, transactions, and selected month to browser `localStorage`.
- **Preloaded Demo Data:**
  - Click the **Demo Data** button to preview realistic transactions, multiple bank accounts, and goals immediately.

---

## 🛠️ Tech Stack

- **HTML5:** Semantic markup, accessible labels, ARIA landmarks, dialog modal.
- **CSS3:** Custom CSS variables, modern dark glassmorphism, responsive grid & flexbox, accessible focus indicators (`:focus-visible`).
- **JavaScript (ES6+):** Pure vanilla JavaScript with separated storage, calculation, rendering, and validation functions.
- **Chart.js (v4.4.1):** Loaded via cdnjs for lightweight, responsive canvas charts.
- **Typography:** *Plus Jakarta Sans* via Google Fonts.

---

## 🚀 How to Run Locally

Because RupeeTrack is built entirely without build steps or frameworks, running it is as simple as opening a file:

1. **Clone or Download the repository:**
   ```bash
   git clone https://github.com/<your-username>/expense-savings-tracker.git
   cd expense-savings-tracker
   ```

2. **Open in any modern browser:**
   - Double-click `index.html`, OR
   - Right-click `index.html` > *Open with* > *Google Chrome / Firefox / Safari / Edge*.

3. **Or run with a lightweight local server (Optional):**
   ```bash
   # Using Python 3:
   python -m http.server 8000
   # Then visit: http://localhost:8000
   ```

---

## 🌐 Deploying to GitHub Pages

1. Push the files (`index.html`, `style.css`, `script.js`, `README.md`) to a GitHub repository.
2. Go to your repository on GitHub.
3. Click on **Settings** > **Pages** (in the left sidebar).
4. Under **Build and deployment** > **Branch**, select `main` (or `master`) and folder `/ (root)`.
5. Click **Save**.
6. Within a minute, GitHub Pages will provide your live URL (e.g. `https://<username>.github.io/<repo>/`).

---

## 📂 Project Structure

```
expense-savings-tracker/
├── index.html       # Application markup and semantic layout
├── style.css        # Modern responsive dark glassmorphic styling
├── script.js        # Modular storage, calculations, charts, and UI interactions
└── README.md        # Documentation, features, and setup instructions
```

---

## 🛡️ Input Validation & Privacy

- **No Negative or Empty Values:** Amount inputs strictly require positive non-zero numbers.
- **Zero Data Tracking:** 100% client-side. No cookies, no third-party trackers, no backend server needed.
