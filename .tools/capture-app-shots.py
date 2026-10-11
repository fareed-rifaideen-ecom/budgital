"""Capture real Budgital app screenshots for the landing page.

Runs against the local dev server, accepts the terms gate via localStorage,
and writes PNGs into public/screenshots/.
"""

from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
OUT = Path(__file__).resolve().parent.parent / "public" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

SETUP = """
localStorage.setItem('budgital-terms-v1', 'accepted');
localStorage.setItem('budgetly-settings-v1', JSON.stringify({ theme: 'light' }));
"""

SHOTS = [
    ("app-overview-desktop", 1440, 900, "/app#overview"),
    ("app-transactions-desktop", 1440, 900, "/app#transactions"),
    ("app-budgets-desktop", 1440, 900, "/app#budgets"),
    ("app-overview-mobile", 390, 844, "/app#overview"),
    ("app-budgets-mobile", 390, 844, "/app#budgets"),
    ("app-data-mobile", 390, 844, "/app#data"),
]


def launch(playwright):
    for options in ({"executable_path": "/usr/bin/chromium"}, {}, {"channel": "chrome"}):
        try:
            return playwright.chromium.launch(**options)
        except Exception:
            continue
    raise RuntimeError("No headless Chromium available")


with sync_playwright() as p:
    browser = launch(p)
    for name, width, height, path in SHOTS:
        context = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=2,
            reduced_motion="reduce",
        )
        context.add_init_script(SETUP)
        page = context.new_page()
        page.goto(f"{BASE}{path}", wait_until="networkidle")
        page.wait_for_timeout(1600)
        page.evaluate("document.querySelectorAll('.splash-screen').forEach((n) => n.remove())")
        page.wait_for_timeout(300)
        target = OUT / f"{name}.png"
        page.screenshot(path=str(target))
        print("saved", target, target.stat().st_size)
        context.close()
    browser.close()