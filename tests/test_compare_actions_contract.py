from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COMPARE = ROOT / "frontend/src/pages/buyer/Compare.jsx"
DIALOG = ROOT / "frontend/src/components/marketplace/BriefSendDialog.jsx"


def test_compare_save_download_actions_are_wired():
    source = COMPARE.read_text()

    assert "handleSaveComparison" in source
    assert "handleDownloadPdf" in source
    assert "localStorage.setItem(\"bizmarket_compare_snapshots\"" in source
    assert "downloadComparePdf" in source


def test_compare_bulk_brief_send_uses_all_selected_companies():
    compare_source = COMPARE.read_text()
    dialog_source = DIALOG.read_text()

    assert "mode: \"multi\"" in compare_source
    assert "companies={briefTarget.companies}" in compare_source
    assert "targetCompanies" in dialog_source
    assert "Promise.allSettled" in dialog_source
    assert "Bu şirkətlərə briefiniz" in dialog_source
