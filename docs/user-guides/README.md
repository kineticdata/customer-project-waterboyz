# Waterboyz User Guides

Branded user-facing documentation for SWAT Leadership and Team Captains.

## Outputs

- **Standalone HTML:** `dist/swat-leaders.html`, `dist/team-captains.html` (shareable, printable)
- **In-portal React pages:** generated into `portal/src/pages/help/generated/` and rendered at `/help/swat-leaders` and `/help/team-captains` inside the authenticated portal

## Usage

```bash
cd docs/user-guides
yarn install                 # one time
cp .env.example .env          # then fill in credentials + sample IDs
yarn capture                  # run Playwright against production
yarn build                    # regenerate both outputs
yarn preview:leaders          # open standalone HTML in browser
```

## Content

Edit sections under `content/<role>/*.js`. Filename prefixes (`00-`, `01-`, ...) control section order. After editing content or capturing new screenshots, run `yarn build` and commit both the source and the generated output under `portal/src/pages/help/generated/`.
