# Deploy GlowFit AI (free) and publish the repo safely

The hackathon requires a working test link until judging ends (Nov 20, 2026) and a code repository. Follow these steps in this order.

## 1. Secure the API key (before anything goes public)

The old key was stored in `.env.example`, which is a tracked file. Treat that key as exposed.

1. In the YouCam API console, **create a new API key** and **delete the old one**.
2. Put the new key only in `.env.local`, which git ignores:
   ```
   YOUCAM_API_KEY=your_new_key
   ```
3. Make `.env.example` hold no key. The line must read `YOUCAM_API_KEY=` with nothing after it.
4. Check that git never committed the old key (run in the project folder):
   ```powershell
   git log -p --all -- .env.example | findstr /i "YOUCAM_API_KEY="
   git ls-files | findstr /i ".env"
   ```
   - The second command should list only `.env.example`.
   - If the first command shows the old key in any commit, deleting the old key in step 1 already makes it useless. For a clean history, start a fresh repo: delete the `.git` folder, run `git init`, and make one new first commit.

## 2. Push to GitHub

```powershell
git init
git add .
git commit -m "GlowFit AI: YouCam Skin AI + VTO beauty decision engine"
git branch -M main
git remote add origin https://github.com/<you>/glowfit-ai.git
git push -u origin main
```

- Make the repo **public**. It already has an MIT `LICENSE`, which the rules require for a public repo.
- Before pushing, run `git status` and confirm that `.env.local` is **not** listed.

## 3. Deploy on Vercel (free Hobby plan)

1. Go to vercel.com, sign in with GitHub, choose **Add New > Project**, and import the repo. Vercel detects Next.js automatically, so keep the defaults.
2. Under **Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `YOUCAM_API_KEY` | your new key |
   | `GLOWFIT_PUBLIC_DEMO` | `1` |
   | `GLOWFIT_MAX_SCANS` | `2` |
   | `GLOWFIT_MAX_UNITS` | `12` |
   | `GLOWFIT_MIN_CREDITS` | `100` |
   | `GLOWFIT_QUOTA_SECRET` | any long random string |

   Optional, for nicer assistant wording: `ASSISTANT_LLM_URL`, `ASSISTANT_LLM_KEY`, `ASSISTANT_LLM_MODEL`.
3. Click **Deploy**. Copy the `https://<name>.vercel.app` link into the README and into the Devpost form.

## 4. Check the live link

| Check | Expected |
|---|---|
| Open `/scan` | Badge says "Live YouCam Skin AI · 2 free scans left" |
| Click **Try with a sample face**, then **Analyze** | Results in about 5 seconds; the badge says "Sample face (no units used)" |
| Scan your own selfie | Real YouCam result with GlowMap masks |
| Decision Lab: Generate looks | 3 real renders (3 units) |
| After the visitor limit | A small notice appears and sample results continue; nothing breaks |
| Open `/api/youcam/credits` | Shows the visitor's remaining quota, not your account balance |

## 5. Unit budget

- You start with 1,000 free units. Sharing the project on social media earns **500 more per platform** (up to 2), using the form on the hackathon page.
- With the defaults, one visitor uses at most 2 scans plus 12 render units. When the account balance gets close to `GLOWFIT_MIN_CREDITS`, every visitor gets sample results, so the link never shows an error.
- To stop all real calls at once, set `GLOWFIT_DEMO_MODE=1` in Vercel and redeploy.

## Notes

- Vercel Hobby runs each API route for up to 60 seconds. YouCam tasks are polled from the browser, so this is enough.
- Nothing is stored on the server: selfies, scans and looks stay in the visitor's browser.
