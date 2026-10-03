import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:3000/")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Scroll down to reveal the reporting period selector and the creators list on the Admin Royalti page.
        await page.mouse.wheel(0, 300)
        
        # -> Reveal the reporting period selector and the creators list by scrolling down the page.
        await page.mouse.wheel(0, 300)
        
        # -> Find the reporting period selector by searching for the word 'Periode' (or similar) on the Admin Royalti page, and if not found, scroll to the bottom to reveal additional controls.
        await page.mouse.wheel(0, 300)
        
        # -> Click the 'Muat Data Demo' button to load sample/demo data into the Admin Royalti dashboard.
        # Muat Data Demo button
        elem = page.get_by_role("button", name="Muat Data Demo")
        await elem.click(timeout=10000)
        
        # -> Select a reporting period by opening the 'Periode' dropdown and choosing 'Semua Periode (Akumulasi)'.
        # Mei 2026 (YouTube Mechanical) 1Q26 (Jan - Mar... dropdown
        elem = page.locator("xpath=/html/body/div/div/main/div/div/div[2]/div/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.select_option("")
        
        # -> Click the 'Royalti Gross' column header to sort the creator list.
        # Royalti Gross ↓ button
        elem = page.get_by_role("button", name="Royalti Gross ↓")
        await elem.click(timeout=10000)
        
        # -> Click the 'Royalti Gross' column header to sort the creator list.
        # IA Immanuel Andriano Kure ID 1 144 Rp 22.839.826... button
        elem = page.get_by_role("button", name="VN Victor Nifati Zebua ID 16")
        await elem.click(timeout=10000)
        
        # -> Open the composer row 'Sampai Akhir Usia' to view its details and verify composer-level details and the reporting period remain applied.
        # 144 Sampai Akhir Usia SW-1Q26-144 0 Rp 1 0.00 % ▼ button
        elem = page.get_by_role("button", name="144 Sampai Akhir Usia SW-1Q26")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Composer details for 'Sampai Akhir Usia' are visible on the page.
        await page.get_by_role("row", name="Rincian Monetisasi YouTube").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: failed
        # Assert: Expected creator-level monetization details to be visible.
        await expect(page.get_by_role("row", name="Rincian Monetisasi YouTube").nth(0)).to_be_visible(timeout=15000), "Expected creator-level monetization details to be visible."
        
        # --> The selected reporting period 'Semua Periode (Akumulasi)' remains applied and visible.
        # Assert-outcome: failed
        # Assert: Expected the selected reporting period 'Semua Periode (Akumulasi)' to remain applied and visible.
        await expect(page.locator("#root").nth(0)).to_contain_text("Semua Periode (Akumulasi)", timeout=15000), "Expected the selected reporting period 'Semua Periode (Akumulasi)' to remain applied and visible."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    