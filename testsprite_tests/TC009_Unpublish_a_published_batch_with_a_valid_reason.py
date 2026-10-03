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
        
        # -> Click the 'Riwayat Batch' navigation button to open the Batch History page and locate published batches.
        # Riwayat Batch button
        elem = page.get_by_role("button", name="Riwayat Batch")
        await elem.click(timeout=10000)
        
        # -> Click the 'Kembali ke Dashboard' button to return to the dashboard and locate the 'Muat Data Demo' button.
        # ← Kembali ke Dashboard button
        elem = page.get_by_role("button", name="← Kembali ke Dashboard")
        await elem.click(timeout=10000)
        
        # -> Click the 'Muat Data Demo' button on the dashboard to load demo batches.
        # Muat Data Demo button
        elem = page.get_by_role("button", name="Muat Data Demo")
        await elem.click(timeout=10000)
        
        # -> Open the 'Riwayat Batch' page by clicking the 'Riwayat Batch' navigation button to locate the published batch.
        # Riwayat Batch button
        elem = page.get_by_role("button", name="Riwayat Batch")
        await elem.click(timeout=10000)
        
        # -> Click the 'Detail' button for the published batch row (the row with status 'TERDISTRIBUSI KE PENCIPTA') to open the batch details and reveal the rollback/unpublish controls.
        # Detail button
        elem = page.get_by_role("button", name="Detail").first
        await elem.click(timeout=10000)
        
        # -> Click the 'Tarik Kembali (Unpublish)' button to open the unpublish/rollback flow.
        # ↩ Tarik Kembali (Unpublish) button
        elem = page.get_by_role("button", name="↩ Tarik Kembali (Unpublish)")
        await elem.click(timeout=10000)
        
        # -> Fill the 'Alasan Penarikan Kembali' textarea with a 15+ character reason and click the 'Tarik Kembali dari Pencipta' button to confirm the rollback.
        # Contoh: Ditemukan revisi data klaim dari YouTube... text area
        elem = page.get_by_role("textbox", name="Contoh: Ditemukan revisi data")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Ditemukan klaim terduplikasi pada CMS.")
        
        # -> Fill the 'Alasan Penarikan Kembali' textarea with a 15+ character reason and click the 'Tarik Kembali dari Pencipta' button to confirm the rollback.
        # Tarik Kembali dari Pencipta button
        elem = page.get_by_role("button", name="Tarik Kembali dari Pencipta")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Batch detail displays the ready-to-publish banner 'Batch Siap Didistribusikan ke Akun Pencipta!' indicating it returned to ready-to-publish state.
        # Assert-outcome: passed
        # Assert: The page contains the 'Batch Siap Didistribusikan ke Akun Pencipta!' banner.
        await expect(page.locator("#root").nth(0)).to_contain_text("Batch Siap Didistribusikan ke Akun Pencipta!", timeout=15000), "The page contains the 'Batch Siap Didistribusikan ke Akun Pencipta!' banner."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    