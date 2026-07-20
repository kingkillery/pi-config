# Salesforce Dataset Manifest

This is the contract for the recurring Salesforce report refresh used by the Field Work Report.

## Required Exports

| Output filename | Report label | Salesforce report URL | Report id |
| --- | --- | --- | --- |
| `all-ix-open-hold-honlyp2.csv` | `IX Holds Only - Part 2` | `https://ambia.lightning.force.com/lightning/r/Report/00OUS000005a5W92AI/view?queryScope=userFolders` | `00OUS000005a5W92AI` |
| `All-Field-Open-Hold.csv` | `All IX Open Hold P1 + P2` | `https://ambia.lightning.force.com/lightning/r/Report/00OUS000003rCm52AE/view?queryScope=userFolders` | `00OUS000003rCm52AE` |
| `IX-Placards-Photos.csv` | `IX Placards & Photos (Field Tasks)` | `https://ambia.lightning.force.com/lightning/r/Report/00OUS000007Ippd2AC/view?queryScope=userFolders` | `00OUS000007Ippd2AC` |
| `All-Task-Logs.csv` | `All Task Logs (IX)` | `https://ambia.lightning.force.com/lightning/r/Report/00OUS000003rDtR2AU/view?queryScope=userFolders` | `00OUS000003rDtR2AU` |
| `All-Projects-All-Time.csv` | `All-Projects-All-Time` | `https://ambia.lightning.force.com/lightning/r/Report/00ODn000008hmb3MAA/view?queryScope=userFolders` | `00ODn000008hmb3MAA` |

## Optional / Planned Exports

| Output filename | Report label | Salesforce report URL | Report id | Status |
| --- | --- | --- | --- | --- |
| `part1-all-open-hold.csv` | `All Open / Hold report for Part 1` | `https://ambia.lightning.force.com/lightning/r/Report/00OUS00000AcJwk2AF/view?queryScope=userFolders` | `00OUS00000AcJwk2AF` | Optional for P2-only daily refresh; required for strict Part 1 workbook signoff |
| `design-queue.csv` | `As Built and preinstall design corrections` | `https://ambia.lightning.force.com/lightning/r/Report/00OUS00000AcRpR2AV/view?queryScope=userFolders` | `00OUS00000AcRpR2AV` | Optional for P2-only daily refresh; required for strict Part 1 design follow-up |

## Destination Folder

`C:\Users\prest\Desktop\SPWR-Daily\Interconnection-Dash-2026\General Salesforce Reports`

## Notes

- These filenames are part of the workbook refresh contract.
- Do not rename files to include dates unless the user explicitly wants an extra copy.
- If a report id changes, update this file and the nearest test in the same change.
- `All-Field-Open-Hold.csv` may include `Rec and Pro IXP2 Reason Unable to Submit`; preserve it when present.
- `part1-all-open-hold.csv` validates against the 2026-05-13 live 29-column header, including duplicate `IXP1 Application REF#` fields at positions 25-26.
- The Part 1 workbook selects one hold reason in priority order: `IXP1 Rejection Reason`, then `Request IXP1 Reason unable to submit`, then receive/process unable-to-submit fields, then `Prepare IXP1 Reason unable to Submit`.
- The design queue export (`00OUS00000AcRpR2AV`) is the As Built and preinstall design corrections report. The 2026-05-13 live export has seven columns: `Project Name`, `Task Name`, `List`, `Actual Completion Date`, `Description of Design Correction`, `Reason for Correction`, and `Electrical FIN Received`; the workbook treats `List` as status and `Actual Completion Date` as completion date.
